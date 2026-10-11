// ==UserScript==
// @name         Frostbyte CORS Proxy
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Bypasses CORS for Frostbyte standalone file to pull ServiceChannel, SAOne and Crystal data
// @author       You
// @match        file:///*
// @match        https://em.walmart.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      crystal.walmart.com
// ==/UserScript==

(function() {
    'use strict';

    // ---- LEGACY IOT TOKEN SNIFFER (runs on em.walmart.com) ----
    // Frostbyte now uses Crystal (below); the IOT handlers are kept only until IOT is retired.
    if (window.location.hostname === 'em.walmart.com') {
        const origOpen = XMLHttpRequest.prototype.open;
        const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            origOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
            if (header.toLowerCase() === 'authorization' && this._url && this._url.includes('weiot-em-telemetryapi.prod.walmart.com')) {
                // Intercept and store the JWT
                console.log("[Frostbyte] Sniffed IoT Telemetry API Token!");
                GM_setValue('iot_jwt_token', value);
            }
            origSetRequestHeader.apply(this, arguments);
        };
        // We do not execute the rest of the proxy script on the walmart domain
        return;
    }

    // ---- CORS PROXY (runs on file:///*) ----

    window.addEventListener('fetchFromServiceChannel', function(e) {
        if (!e.detail || !e.detail.woId) return;
        
        const woId = e.detail.woId;
        const createWoUrl = `https://www.servicechannel.com/sc/wo/WorkOrders/CreateWorkorderDetailsModel?id=${woId}`;
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: createWoUrl,
            headers: {
                "Accept": "application/json"
            },
            onload: function(createWoRes) {
                try {
                    if (createWoRes.status !== 200) {
                        return window.dispatchEvent(new CustomEvent('serviceChannelDataReady', { detail: { woId: woId, error: `Invalid status ${createWoRes.status}` } }));
                    }
                    const createWoData = JSON.parse(createWoRes.responseText);

                    // Helper to recursively find a key
                    const findKey = (obj, targetKey) => {
                        if (!obj || typeof obj !== 'object') return null;
                        if (obj[targetKey]) return obj[targetKey];
                        for (const key of Object.keys(obj)) {
                            const result = findKey(obj[key], targetKey);
                            if (result) return result;
                        }
                        return null;
                    };

                    const locationId = findKey(createWoData, 'LocationId');
                    
                    if (!locationId) {
                        window.dispatchEvent(new CustomEvent('serviceChannelDataReady', { detail: { woId: woId, error: 'No LocationId found' } }));
                        return;
                    }

                    // Extract StoreId, Priority, and Trade
                    const matchedLocation = findKey(createWoData, 'Location');
                    const storeId = matchedLocation && matchedLocation['StoreId'] ? matchedLocation['StoreId'] : findKey(createWoData, 'StoreId');
                    const priority = findKey(createWoData, 'Priority');
                    let trade = findKey(createWoData, 'Trade');
                    
                    // Handle "FM - " prefix for Trade if it exists
                    if (trade && trade.startsWith("FM - ")) {
                        trade = trade.substring(5).toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                    } else if (trade) {
                        trade = trade.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                    }

                                        let rack = '';
                    let systems = '';
                    // Chain ApplyFilters POST to get the new accurate data
                    const applyFiltersUrl = "https://www.servicechannel.com/sc/wo/WorkOrders/ApplyFilters";
                    const applyFiltersBody = JSON.stringify({
                        "filterModel": {
                            "Ids": [parseInt(woId)],
                            "Page": 1,
                            "PageSize": 50,
                            "TimeZoneOffset": -300
                        },
                        "source": "lvm.load.filterOff-> lvm.applyFilter -> applyFilters"
                    });
                    
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: applyFiltersUrl,
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json; charset=UTF-8"
                        },
                        data: applyFiltersBody,
                        onload: function(filtersRes) {
                            try {
                                let applyData = null;
                                if (filtersRes.status === 200) {
                                    const filtersData = JSON.parse(filtersRes.responseText);
                                    if (filtersData && filtersData.response && filtersData.response.Result && filtersData.response.Result.list && filtersData.response.Result.list.length > 0) {
                                        applyData = filtersData.response.Result.list[0];
                                    }
                                }
                                
                                // Merge data objects for fallback searching
                                const mergedWoData = applyData ? Object.assign({}, createWoData, applyData) : createWoData;
            
                                // Check for ProblemDescription first per API request
                                const desc = findKey(mergedWoData, 'ProblemDescription') || findKey(mergedWoData, 'Description');
                                let rack = ''; let systems = ''; let circuitsList = [];
                                if (desc && typeof desc === 'string') {
                                    const parts = desc.split('|');
                                    for (let p of parts) {
                                        if (p.includes('Rack Associated:')) {
                                            rack = p.split('Rack Associated:')[1].trim();
                                        } else if (p.includes('Systems Affected:')) {
                                            const dirtySystems = p.split('Systems Affected:')[1].trim();
                                            // Handle "RACK MTF (+16)" cleanly
                                            const rackMatch = dirtySystems.match(/RACK\s+([A-Z0-9]+)/i);
                                            if (rackMatch && rackMatch[1]) {
                                                rack = rackMatch[1];
                                            } else {
                                                // Some desc bodies include extraneous data appended after space "LTA | RIM24[...]"
                                                const partsNested = dirtySystems.split(' ');
                                                if (partsNested.length > 0 && partsNested[0].length <= 4 && partsNested[0].match(/^[A-Z0-9]+$/i)) {
                                                    rack = partsNested[0];
                                                } else {
                                                    systems = dirtySystems;
                                                }
                                            }
                                        }
                                        
                                        // Attempt to globally search for common circuit signatures like "F02", "D1", "A13" in this block
                                        // Or parse trailing strings in systems like "F02 FF DRS"
                                        // The pattern (?:[A-Z]\d{1,2}(?:\.\d)?) gets basic circuits like A1, F02, D10.1
                                        if (p.includes('Systems Affected:') || !p.includes(':')) {
                                            const circMatches = p.match(/\b([A-Z]\d{1,2}(?:\.\d)?)\b/gi);
                                            if (circMatches) {
                                                for (const match of circMatches) {
                                                    // Add if it's not a generic word and not already captured
                                                    if (!circuitsList.includes(match.toUpperCase()) && !match.match(/^(VFD)$/i)) {
                                                        circuitsList.push(match.toUpperCase());
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                // Extract module associations and sensors from systems parsing (e.g. VFD[...], or VFD-SPEED)
                                let modulesExtracted = [];
                                let sensorsExtracted = [];
                                let modulesWithSensors = []; // Array of objects { module: "RIM24", sensors: ["COMP 5 OIL L/O", "COMP 2 OIL L/O"] }
                                
                                if (desc && typeof desc === 'string') {
                                    // Locate text that resembles MODULE[PARAMS], e.g. VFD[VFD ( Reading: )] or VFD- SPEED[COND SPLIT MODE...]
                                    
                                    // Split description by pipe to analyze each section independently
                                    const pipedSections = desc.split('|');
                                    
                                    pipedSections.forEach(sec => {
                                        const sectionTrim = sec.trim();
                                        const bracketIndexStart = sectionTrim.indexOf('[');
                                        const bracketIndexEnd = sectionTrim.lastIndexOf(']');
                                        
                                        if (bracketIndexStart !== -1 && bracketIndexEnd !== -1 && bracketIndexEnd > bracketIndexStart) {
                                            // Extract the module name (the part before the bracket)
                                            let cleanMod = sectionTrim.substring(0, bracketIndexStart).trim();
                                            
                                            // Clean 'Systems Affected:' if present before the module name
                                            if (cleanMod.includes('Systems Affected:')) {
                                                cleanMod = cleanMod.split('Systems Affected:')[1].trim();
                                            }
                                            
                                            let isFallbackRack = false;
                                            if (cleanMod.match(/^[A-Z0-9]+$/i) && cleanMod.length <= 4) {
                                                // It's likely LTA / MTC etc and not a module, handle edge case if needed, but for now just trim
                                                isFallbackRack = true;
                                                if (rack === '') rack = cleanMod;
                                            }

                                            // Extract the inner sensor name and split by comma
                                            let innerText = sectionTrim.substring(bracketIndexStart + 1, bracketIndexEnd).trim();
                                            let currentSensors = [];
                                            
                                            const sensorSplits = innerText.split(',');
                                            sensorSplits.forEach(sen => {
                                                let sName = sen.trim();
                                                // Drop the " ( Reading: )" if present
                                                const readingIndex = sName.indexOf(' (');
                                                if (readingIndex !== -1) {
                                                    sName = sName.substring(0, readingIndex).trim();
                                                }
                                                if (sName) {
                                                    currentSensors.push(sName);
                                                    if (!sensorsExtracted.includes(sName)) {
                                                        sensorsExtracted.push(sName);
                                                    }
                                                }
                                            });
                                            
                                            if (!isFallbackRack && cleanMod && !modulesExtracted.includes(cleanMod) && cleanMod !== "Systems" && cleanMod !== "Units Affected" && cleanMod.toUpperCase() !== "UNDEFINED" && cleanMod.length > 2) {
                                                modulesExtracted.push(cleanMod);
                                                modulesWithSensors.push({
                                                    module: cleanMod,
                                                    sensors: currentSensors
                                                });
                                            }
                                        } else if (bracketIndexStart !== -1) {
                                            // Fallback for just modules mapping if brackets are malformed
                                            let cleanMod = sectionTrim.substring(0, bracketIndexStart).trim();
                                            if (cleanMod.includes('Systems Affected:')) {
                                                cleanMod = cleanMod.split('Systems Affected:')[1].trim();
                                            }
                                            
                                            let isFallbackRack = false;
                                            if (cleanMod.match(/^[A-Z0-9]+$/i) && cleanMod.length <= 4) {
                                                isFallbackRack = true;
                                                if (rack === '') rack = cleanMod;
                                            }
                                            
                                            if (!isFallbackRack && cleanMod && !modulesExtracted.includes(cleanMod) && cleanMod !== "Systems" && cleanMod !== "Units Affected" && cleanMod.toUpperCase() !== "UNDEFINED" && cleanMod.length > 2) {
                                                modulesExtracted.push(cleanMod);
                                                modulesWithSensors.push({
                                                    module: cleanMod,
                                                    sensors: []
                                                });
                                            }
                                        }
                                    });
                                }
                                
                                const detectedCircuits = circuitsList.join(", ");

                                // Strict matching for Tech Name from ApplyFilters schema
                                let techName = findKey(mergedWoData, 'AcceptedTechInfo') || findKey(mergedWoData, 'AssignedTechInfo') || "";

                                // Construct granular Status
                                let primaryStatus = findKey(mergedWoData, 'Status') || findKey(mergedWoData, 'StatusName') || "";
                                let extendedStatus = findKey(mergedWoData, 'ExtendedStatus') || "";
                                let finalStatus = primaryStatus;
                                
                                if (primaryStatus && extendedStatus) {
                                    finalStatus = `${primaryStatus}/${extendedStatus}`;
                                } else if (extendedStatus) {
                                    finalStatus = extendedStatus;
                                }

                                const woData = {
                                      store: storeId || "",
                                      trade: trade || "",
                                      priority: priority || "",
                                      rack: rack,
                                      systems: systems,
                                      circuits: detectedCircuits,
                                      techName: techName,
                                      status: finalStatus,
                                      description: desc || "",
                                      modules: modulesExtracted.length > 0 ? modulesExtracted : [],
                                      sensors: sensorsExtracted.length > 0 ? sensorsExtracted : [],
                                      modulesWithSensors: modulesWithSensors.length > 0 ? modulesWithSensors : [],
                                      rawWoData: mergedWoData
                                };
                                
                                // Fetch Work Order Notes as an additional payload
                                const notesUrl = `https://www.servicechannel.com/sc/Location/GetLocationNotes?locationId=${locationId}&includeEmptyValue=false`;
                                
                                GM_xmlhttpRequest({
                                      method: 'GET',
                                      url: notesUrl,
                                      headers: {
                                          "Accept": "application/json"
                                      },
                                      onload: function(notesRes) {
                                          try {
                                              let notesData = null;
                                              // Handle if the notes endpoint redirects unexpectedly or throws HTML error instead of JSON gracefully
                                              if (notesRes.status === 200 && notesRes.responseText.startsWith('{')) {
                                                  notesData = JSON.parse(notesRes.responseText);
                                              }
                                              window.dispatchEvent(new CustomEvent('serviceChannelDataReady', { detail: { woId: woId, data: notesData, woData: woData } }));
                                          } catch (err) {
                                              window.dispatchEvent(new CustomEvent('serviceChannelDataReady', { detail: { woId: woId, error: 'Failed to parse notesData: ' + err.message } }));
                                          }
                                      },
                                      onerror: function(err) {
                                          window.dispatchEvent(new CustomEvent('serviceChannelDataReady', { detail: { woId: woId, error: err } }));
                                      }
                                  });
                            } catch (e) {
                                window.dispatchEvent(new CustomEvent('serviceChannelDataReady', { detail: { woId: woId, error: e.message } }));
                            }
                        },
                        onerror: function(err) {
                                window.dispatchEvent(new CustomEvent('serviceChannelDataReady', { detail: { woId: woId, error: 'Network error fetching ApplyFilters' } }));
                        }
                    });
                    
                } catch (err) {
                    window.dispatchEvent(new CustomEvent('serviceChannelDataReady', { detail: { woId: woId, error: 'Failed to parse createWoData: ' + err.message } }));
                }
            },
            onerror: function(err) {
                window.dispatchEvent(new CustomEvent('serviceChannelDataReady', { detail: { woId: woId, error: err } }));
            }
        });
    });

    window.addEventListener('fetchFromSAOne', function(e) {
        if (!e.detail || !e.detail.storeNumber) return;
        
        const storeNum = e.detail.storeNumber;
        const saOneUrl = `https://saone.walmart.com/api/commonService?apiUrl=%2Fsiteinfo%2FsiteCurrentState&site=${storeNum}&countryCode=US`;
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: saOneUrl,
            headers: {
                "Accept": "application/json"
            },
            onload: function(res) {
                try {
                    if (res.status !== 200) {
                        return window.dispatchEvent(new CustomEvent('saOneDataReady', { detail: { storeNumber: storeNum, error: `Invalid status ${res.status}` } }));
                    }
                    const data = JSON.parse(res.responseText);
                    window.dispatchEvent(new CustomEvent('saOneDataReady', { detail: { storeNumber: storeNum, data: data } }));
                } catch (err) {
                    window.dispatchEvent(new CustomEvent('saOneDataReady', { detail: { storeNumber: storeNum, error: 'Failed to parse SAOne response: ' + err.message } }));
                }
            },
            onerror: function(err) {
                window.dispatchEvent(new CustomEvent('saOneDataReady', { detail: { storeNumber: storeNum, error: err } }));
            }
        });
    });
    // ---- CRYSTAL (replaces IOT) ----
    // Crystal authenticates with the browser's crystal.walmart.com session cookie, so no token is needed.
    // Sign in at https://crystal.walmart.com/ once and keep that session alive.
    const CRYSTAL_API = 'https://crystal.walmart.com/api/asset-browser/v1';
    const CRYSTAL_LOGIN_MSG = 'Not signed in to Crystal. Open https://crystal.walmart.com/ in this browser, sign in, then try again.';
    const CRYSTAL_READINGS_TTL_MS = 30000;
    const crystalReadingsCache = {};

    function crystalGet(path) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: CRYSTAL_API + path,
                headers: {
                    "Accept": "application/json, text/plain, */*",
                    "x-tenant": "us"
                },
                onload: function(res) {
                    if (res.status === 401 || res.status === 403) return reject(new Error(CRYSTAL_LOGIN_MSG));
                    if (res.status < 200 || res.status >= 300) return reject(new Error(`Invalid status ${res.status}`));
                    const text = (res.responseText || '').trim();
                    // An expired session redirects to an HTML login page with a 200.
                    if (text.startsWith('<')) return reject(new Error(CRYSTAL_LOGIN_MSG));
                    try {
                        resolve(JSON.parse(text));
                    } catch (err) {
                        reject(new Error('Failed to parse Crystal response: ' + err.message));
                    }
                },
                onerror: function() { reject(new Error('Network error contacting Crystal')); },
                ontimeout: function() { reject(new Error('Crystal request timed out')); }
            });
        });
    }

    // kind is 'refrigeration' or 'hvac'. Readings are cached briefly so many sensor lookups share one request.
    function crystalLatestReadings(storeNum, kind, force) {
        const cacheKey = `${storeNum}|${kind}`;
        const cached = crystalReadingsCache[cacheKey];
        if (cached && !force && Date.now() - cached.ts < CRYSTAL_READINGS_TTL_MS) return cached.promise;
        const promise = crystalGet(`/asset-hierarchy/${encodeURIComponent(storeNum)}/${kind}/latest-readings`);
        crystalReadingsCache[cacheKey] = { ts: Date.now(), promise: promise };
        promise.catch(() => { delete crystalReadingsCache[cacheKey]; });
        return promise;
    }

    // Payload: { refrigeration, hvac, readings } where readings maps uniqueId -> latest reading.
    window.addEventListener('fetchFromCrystal', function(e) {
        if (!e.detail || !e.detail.storeNumber) return;
        const storeNum = e.detail.storeNumber;
        const enc = encodeURIComponent(storeNum);

        Promise.allSettled([
            crystalGet(`/asset-hierarchy/${enc}/refrigeration`),
            crystalGet(`/asset-hierarchy/${enc}/hvac`),
            crystalLatestReadings(storeNum, 'refrigeration', true),
            crystalLatestReadings(storeNum, 'hvac', true)
        ]).then(([refrigeration, hvac, refReadings, hvacReadings]) => {
            if (refrigeration.status === 'rejected' && hvac.status === 'rejected') {
                return window.dispatchEvent(new CustomEvent('crystalDataReady', { detail: { storeNumber: storeNum, error: refrigeration.reason.message } }));
            }
            const readings = {};
            [refReadings, hvacReadings].forEach(r => {
                if (r.status !== 'fulfilled') return;
                // Module-level entries (e.g. comm loss) have no uniqueId, so they stay keyed by their asset id.
                Object.entries(r.value || {}).forEach(([key, v]) => { if (v) readings[v.uniqueId || key] = v; });
            });
            window.dispatchEvent(new CustomEvent('crystalDataReady', { detail: {
                storeNumber: storeNum,
                data: {
                    refrigeration: refrigeration.status === 'fulfilled' ? refrigeration.value : null,
                    hvac: hvac.status === 'fulfilled' ? hvac.value : null,
                    readings: readings
                }
            } }));
        });
    });

    window.addEventListener('fetchSensorReadingCrystal', function(e) {
        if (!e.detail || !e.detail.storeNumber || !e.detail.uniqueId) return;
        const storeNum = e.detail.storeNumber;
        const uniqueId = e.detail.uniqueId;
        const kind = e.detail.kind === 'hvac' ? 'hvac' : 'refrigeration';

        crystalLatestReadings(storeNum, kind, false).then(all => {
            const reading = Object.values(all || {}).find(v => v && v.uniqueId === uniqueId) || null;
            window.dispatchEvent(new CustomEvent('crystalSensorReadingReady', { detail: { storeNumber: storeNum, uniqueId: uniqueId, data: reading } }));
        }).catch(err => {
            window.dispatchEvent(new CustomEvent('crystalSensorReadingReady', { detail: { storeNumber: storeNum, uniqueId: uniqueId, error: err.message } }));
        });
    });

    // ---- LEGACY IOT HANDLERS ----
    window.addEventListener('fetchFromIOT', function(e) {
        if (!e.detail || !e.detail.storeNumber) return;
        
        const storeNum = e.detail.storeNumber;
        const iotUrl = `https://weiot-em-telemetryapi.prod.walmart.com/api/sensors/getsensorhierarchy`;
        const payload = JSON.stringify({
             "cc": "US",
             "storeNo": storeNum,
             "rackIndex": null,
             "sensorIOType": null
        });

        // Retrieve the sniffed token from GM storage
        const currentToken = GM_getValue('iot_jwt_token');

        if (!currentToken) {
             window.dispatchEvent(new CustomEvent('iotDataReady', { detail: { storeNumber: storeNum, error: 'No IoT Auth Token sniffed yet. Please open a tab to https://em.walmart.com/ and let it load.' } }));
             return;
        }
        
        GM_xmlhttpRequest({
            method: 'POST',
            url: iotUrl,
            headers: {
                "Accept": "application/json, text/plain, */*",
                "Content-Type": "application/json",
                "x-tenant": "US",
                "lang": "en",
                "authorization": currentToken
            },
            data: payload,
            onload: function(res) {
                try {
                    if (res.status !== 200 && res.status !== 201) {
                        return window.dispatchEvent(new CustomEvent('iotDataReady', { detail: { storeNumber: storeNum, error: `Invalid status ${res.status}` } }));
                    }
                    const data = JSON.parse(res.responseText);
                    window.dispatchEvent(new CustomEvent('iotDataReady', { detail: { storeNumber: storeNum, data: data, assetString: e.detail.assetString } }));
                } catch (err) {
                    window.dispatchEvent(new CustomEvent('iotDataReady', { detail: { storeNumber: storeNum, error: 'Failed to parse IOT response: ' + err.message } }));
                }
            },
            onerror: function(err) {
                window.dispatchEvent(new CustomEvent('iotDataReady', { detail: { storeNumber: storeNum, error: err } }));
            }
        });
    });
    window.addEventListener('fetchSensorReadingIOT', function(e) {
        if (!e.detail || !e.detail.storeNumber || !e.detail.uniqueId) return;
        
        const storeNum = e.detail.storeNumber;
        const uniqueId = e.detail.uniqueId;
        const fromDate = e.detail.fromDate || -1440;
        const toDate = e.detail.toDate || 0;
        
        const iotUrl = `https://weiot-em-telemetryapi.prod.walmart.com/api/sensors/getsensorreading`;
        const payload = JSON.stringify({
             "uniqueId": uniqueId,
             "fromDate": fromDate,
             "toDate": toDate,
             "timeZone": "UTC"
        });

        // Retrieve the sniffed token from GM storage
        const currentToken = GM_getValue('iot_jwt_token');

        if (!currentToken) {
             window.dispatchEvent(new CustomEvent('iotSensorReadingReady', { detail: { storeNumber: storeNum, uniqueId: uniqueId, error: 'No IoT Auth Token sniffed yet. Please open a tab to https://em.walmart.com/ and let it load.' } }));
             return;
        }
        
        GM_xmlhttpRequest({
            method: 'POST',
            url: iotUrl,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json; charset=utf-8",
                "authorization": currentToken,
                "x-tenant": "US"
            },
            data: payload,
            onload: function(res) {
                try {
                    if (res.status !== 200 && res.status !== 201) {
                        return window.dispatchEvent(new CustomEvent('iotSensorReadingReady', { detail: { storeNumber: storeNum, uniqueId: uniqueId, error: `Invalid status ${res.status}` } }));
                    }
                    const data = JSON.parse(res.responseText);
                    window.dispatchEvent(new CustomEvent('iotSensorReadingReady', { detail: { storeNumber: storeNum, uniqueId: uniqueId, data: data } }));
                } catch (err) {
                    window.dispatchEvent(new CustomEvent('iotSensorReadingReady', { detail: { storeNumber: storeNum, uniqueId: uniqueId, error: 'Failed to parse IOT response: ' + err.message } }));
                }
            },
            onerror: function(err) {
                window.dispatchEvent(new CustomEvent('iotSensorReadingReady', { detail: { storeNumber: storeNum, uniqueId: uniqueId, error: err } }));
            }
        });
    });
})();
