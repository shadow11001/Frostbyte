// Global state management
      const AppState = {
        autoSaveTimer: null,
        currentNoteId: null, // Track the current note being edited
        lastSavedData: null,
        deadAirTimer: null,
        deadAirSeconds: 0,
        timerRunning: false,
        micStream: null,
        speakerStream: null,
        micAudioContext: null,
        speakerAudioContext: null,
        micAnalyser: null,
        speakerAnalyser: null,
        micActive: false,
        callDetected: false,
        loudSoundThreshold: 80, // Higher threshold for call detection (speakers)
        speechThreshold: 25, // Lower threshold for voice detection (microphone)
        selectedTags: new Set(),
        sessionInfractions: 0, // Resets each call
        totalInfractions: 0, // Persists across calls
        deadAirThreshold: 30, // Seconds before infraction
        currentVersion: "2.0.0", // Update this when you make changes

        // Minimal usage tracking for timer functionality only (analytics removed)
        usageTracking: {
          onCall: false,
          focusStart: null,
          windowFocused: true,
          totalFocusTime: 0,
        },

        // Branch management
        currentBranch: "main",
        branchPasswords: {
          beta: "NOLONGERNEEDED",
          dev: "NOLONGERNEEDED",
        },

        // War Room Schedule
        warRoomSchedule: {
          enabled: false,
          shift: null, // '7am-1pm', '3pm-9pm', '7am-5pm'
          role: "primary", // 'primary' or 'backup'
          days: [], // ['Monday', 'Tuesday', etc.]
          nextCheck: null,
          checkInterval: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
          reminderTimeouts: [],
          notificationShown: false,
          currentCheckDue: null,
          displayUpdateInterval: null,
        },

        // Current Rack Tracking
        currentRack: null, // Stores the current rack name (e.g., 'LTA', 'MTB', etc.)

        // Persistent Work Orders for War Room
        persistentWorkOrders: [],

        // Selected system for button group visibility
        selectedSystem: null,
        connectedSystems: new Set(),

        // Visual dead air warnings
        visualDeadAirWarnings: true,
        youSpokeNotifications: true,

        // Microphone sensitivity and level tracking
        micSensitivity: 25, // Default speech threshold
        currentMicLevel: 0,
        micLevelHistory: [],

        // Tab flashing for dead air warnings
        originalTitle: document.title,
        tabFlashInterval: null,
        isTabFlashing: false,
      };

      let frostbyteEmsMapping =
        JSON.parse(localStorage.getItem("frostbyteEmsMapping")) || {};

      // ============= Configuration =============
      const APP_CONFIG = {
        TAG_KEYWORDS: {
          "Call Dropped Mid Call": [
            "call dropped",
            "dropped",
            "disconnected",
            "lost connection",
          ],
          "Caller Couldn't Hear Me": [
            "couldn't hear me",
            "can't hear me",
            "audio issues",
            "mic problems",
          ],
          Carel: ["carel", "boss"],
          "Couldn't Hear Caller": [
            "couldn't hear",
            "can't hear caller",
            "audio problems",
            "static",
          ],
          Comms: [
            "comm loss",
            "communication loss",
            "network",
            "ethernet",
            "comms",
            "communication",
          ],
          CPC: ["cpc"],
          DAE: ["dae", "escalat", "work order", "wo"],
          "Danfoss AKA65": ["aka65", "aka"],
          "Danfoss SVD": ["svd", "storeview"],
          Defrost: ["defrost", "forced defrost", "terminated defrost"],
          Download: [
            "download",
            "version download",
            "load change download",
            "main download",
            "comms download",
            "full dl",
            "performed download",
          ],
          HVAC: ["hvac", "air conditioning", "heating", "rtu"],
          Lighting: ["lights", "lighting", "forced on lights"],
          "Manager Escalation": ["manager", "escalation", "supervisor"],
          "New Module": ["new module", "module"],
          "No Reply Needed": ["no reply", "information only"],
          "Novar ESS": ["novar", "ess"],
          "Opus Architect": ["opus arch", "architect"],
          "Opus Magnum": ["opus mag", "magnum"],
          Other: ["other", "misc", "various"],
          "Point Change": ["point change", "board point", "changing board"],
          "Power Cycle": ["power cycle", "restart", "reboot"],
          Project: ["project"],
          Refrigeration: [
            "refrigeration",
            "rack",
            "cooling",
            "temps",
            "temperature",
            "defrost",
            "forced defrost",
            "terminated defrost",
          ],
          Remodel: ["remodel", "renovation"],
          Sams: ["sams", "sam's club"],
          Sporlan: ["sporlan"],
          Static: ["static", "noise", "interference"],
          Suppression: ["suppression", "nsrm"],
        },
        DAE_TEMPLATES: {
          "Help Desk Post": `Store # 
EMS - 
WO# - 
Issue - 
What have you done? 
Wiki Link Used - 
Any screenshots of issue.:`,

          "Condenser and Compressor Staging Changes": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What the technician has requested and the reason for the request:
Additional notes:`,

          "Changes to Rack Suction Settings": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What the technician has requested and the reason for the request:
Additional notes:`,

          "Changes to Chiller Settings": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What the technician has requested and the reason for the request:
Additional notes:`,

          "Changes to Sub cooler Settings": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What the technician has requested and the reason for the request:
Additional notes:`,

          "Heat Checks": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Detailed description of heat check request:
Additional notes:`,

          "Reporting Issues with IoT": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Reason for escalation:
Detailed error description:
Screenshots of the error in IoT as well as any supporting screenshots from the EMS system. Paste them into a Word doc and attach it to the work order when you create it.:
Additional notes:`,

          "Setting MAC Addresses": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
New device type and position (For example, Novar ES1 on rack LTB or Emerson E2E on HVAC):
MAC address of the new device (must be 12 characters):
Old MAC address:
Additional notes:`,

          "Controller COMM Loss": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Is the ethernet cable plugged into the device, yes or no?:
Controller type (Novar EP2, Emerson E2E, Danfoss AK255 etc.):
What system it controls (HVAC, Rack A, Rack B…etc.):
Has the controller been power cycled, yes or no?:
Is the controller functioning normally per the technician? If not, please provide details.: 
MAC address (must be 12 characters):
The switch and Port controller goes to (if tech can provide):
Additional notes:`,

          "Changing Board Points": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Current module address and point number:
New module address and point number:
Additional notes:`,

          "Carel BOSS Support": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Detailed description of technician request OR
If an alarm, include a screenshot of the alarm in IoT.:
Additional notes:`,

          "Novar Download Failures": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Type of download needed (version, main, comm, etc.):
What system it controls (HVAC, Rack A, Rack B…etc.):
Description of controller behavior or error messages received. Paste screenshots of error messages into a Word document and attach it to the work order as you create it.:
Additional notes:`,

          "Danfoss Downloads": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What system it controls (HVAC, Rack A, Rack B…etc.):
Description of what prompted the download request (Controller change out, controller software failure, etc.):
MAC address (must be 12 characters):
Additional notes:`,

          "Manager Escalations": `Name of the manager or team lead authorizing the escalation:
Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Reason for escalation:
Detailed description of the issue:
What actions Contact Center agents have taken so far:
Any supporting screenshots of EMS systems or other documentation. Paste screenshots of error messages into a Word document and attach it to the work order as you create it.:
Additional notes:`,

          "Program Change Request": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What the technician has requested and the reason for the request:
A screenshot of the module in the EMS system.:
Additional notes:`,

          "Taking RTU Fans Out of Continuous Mode": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What RTU fan(s) the technician has requested to turn off and the reason for the request.:
Additional notes:`,

          "Parameter Deviation": `Name of the manager or team lead authorizing the escalation:
Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Detailed description of request:
Current setpoint and requested setpoint:
Screenshots of setpoint in EMS system and of the Parameter Cutsheet.:
Additional notes:`,

          "Swap Work Order": `Swap Workorder Notes Show: (Enter the notes from the email).
Please email acserv@wal-mart.com when service is complete. Please provide notes regarding work done along with on/off site dates and times. You may also contact Alarm Central at 479-273-4600, options 1 and 4 between the hours of 7AM-7PM CST Mon-Fri:`,

          "Mastermind Work Order": `Mastermind Report Notes Show: (Enter the notes from the work order attachment that is in all caps).
Please email acserv@wal-mart.com when service is complete. Please provide notes regarding work done along with on/off site dates and times. You may also contact Alarm Central at 479-273-4600, options 1 and 4 between the hours of 7AM-7PM CST Mon-Fri:`,
        },
      };

      const MODAL_REGISTRY = {
        FORCE_PARAM: {
          title: "Force Parameter",
          message: "What parameter are you forcing?",
          defaultValue: "",
        },
        FORCE_OFF_ITEM: {
          title: "Force Off",
          message: "What are you forcing off?",
          defaultValue: "",
        },
        SHUTDOWN_CIRCUIT: {
          title: "Shutdown Circuit",
          message: "What circuit are you shutting down?",
          defaultValue: "",
        },
        BREAKER_PANEL: {
          title: "Breaker Panel",
          message: "What panel are the breakers in? {breakerDetails}",
          defaultValue: "",
        },
        BREAKER_NUMBERS: {
          title: "Breaker Numbers",
          message: "What are the breaker numbers in panel {panel}?",
          defaultValue: "",
        },
        BREAKER_STATUS: {
          title: "Breaker Status",
          message: "Are the breakers tripped or off?",
          defaultValue: "",
        },
        ADVISORY_ISSUE: {
          title: "Advisory Note",
          message: "What is the issue you are advising on?",
          defaultValue: "",
        },
        TECH_QUESTION: {
          title: "Tech Question",
          message: "What is the technician's question?",
          defaultValue: "",
        },
        STATUS_UPDATE: {
          title: "Status Update",
          message: "What item are you providing a status update for?",
          defaultValue: "",
        },
        TECH_REFUSED: {
          title: "Tech Refused",
          message: "What action did the technician refuse?",
          defaultValue: "",
        },
        CIRCUIT_DEFROSTING: {
          title: "Defrost",
          message: "What circuit is defrosting?",
          defaultValue: "",
        },
        OLD_COOLING_SETPOINT: {
          title: "Old Cooling Setpoint",
          message: "What was the old cooling setpoint?",
          defaultValue: "",
        },
        OLD_HEATING_SETPOINT: {
          title: "Old Heating Setpoint",
          message: "What was the old heating setpoint?",
          defaultValue: "",
        },
        NEW_COOLING_SETPOINT: {
          title: "New Cooling Setpoint",
          message: "What is the new cooling setpoint?",
          defaultValue: "",
        },
        NEW_HEATING_SETPOINT: {
          title: "New Heating Setpoint",
          message: "What is the new heating setpoint?",
          defaultValue: "",
        },
        RTU_NUMBER: {
          title: "RTU Number",
          message: "What is the RTU number?",
          defaultValue: "",
        },
        TEST_COMPONENT: {
          title: "Test Component",
          message: "What component are you testing?",
          defaultValue: "",
        },
        MONITOR_INSTRUCTION: {
          title: "Monitor Instruction",
          message: "What should be monitored?",
          defaultValue: "",
        },
        CONTACT_SELECTION: {
          title: "Contact Selection",
          message: "{message}",
          defaultValue: "",
        },
        CUSTOM_CONTACT: {
          title: "Custom Contact",
          message: "Enter the name and number of the person you spoke with:",
          defaultValue: "",
        },
        CONTACT_DETAILS: {
          title: "Contact Details",
          message: "Who did you speak with?",
          defaultValue: "",
        },
        RACK_NAME: {
          title: "Rack Name",
          message: "Enter the rack name for {action}:",
          defaultValue: "",
        },
        ENTER_EQUIPMENT: {
          title: "Enter Details",
          message: "Enter equipment name:",
          defaultValue: "",
        },
        ENTER_CIRCUIT: {
          title: "Enter Details",
          message: "Enter circuit name:",
          defaultValue: "",
        },
      };

      // ============= IndexedDB Storage System =============

      const SQLITE_STORAGE = {
        dbName: "FrostbyteNotesDB",
        version: 1,
        db: null,
        isEnabled: false,
        isSupported: true,
        fileHandle: null, // Keep for backward compatibility

        // Check IndexedDB support
        checkSupport() {
          this.isSupported = !!(
            window.indexedDB &&
            window.IDBTransaction &&
            window.IDBKeyRange
          );
          return this.isSupported;
        },

        // Initialize IndexedDB
        async init() {
          try {
            if (!this.checkSupport()) {
              console.warn("Database storage not supported in this browser");
              return false;
            }

            // Check if database is enabled in settings
            const enabled = localStorage.getItem("databaseEnabled") === "true";
            if (!enabled) {
              console.log("Database storage disabled in settings");
              return false;
            }

            // Open IndexedDB
            const db = await this.openDatabase();
            if (!db) {
              return false;
            }

            this.db = db;
            this.isEnabled = true;

            console.log("Database storage initialized successfully");
            return true;
          } catch (error) {
            console.error("Failed to initialize database storage:", error);
            this.isEnabled = false;
            return false;
          }
        },

        // Open IndexedDB database
        async openDatabase() {
          return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
              console.error("Failed to open IndexedDB:", request.error);
              resolve(null);
            };

            request.onsuccess = () => {
              console.log("IndexedDB opened successfully");
              resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
              const db = event.target.result;

              // Create object stores if they don't exist
              if (!db.objectStoreNames.contains("notes")) {
                const notesStore = db.createObjectStore("notes", {
                  keyPath: "id",
                });
                notesStore.createIndex("timestamp", "timestamp", {
                  unique: false,
                });
              }

              if (!db.objectStoreNames.contains("settings")) {
                db.createObjectStore("settings", { keyPath: "key" });
              }

              console.log("IndexedDB schema created/upgraded");
            };
          });
        },
        // Save note to IndexedDB
        async saveNote(noteData) {
          if (!this.isEnabled || !this.db) return false;

          try {
            return new Promise((resolve, reject) => {
              const transaction = this.db.transaction(["notes"], "readwrite");
              const store = transaction.objectStore("notes");

              const request = store.put({
                id: noteData.id,
                techName: noteData.techName || "",
                storeNumber: noteData.storeNumber || "",
                workOrder: noteData.workOrder || "",
                notes: noteData.notes || "",
                dae: noteData.dae || "",
                date: noteData.date || new Date().toLocaleDateString(),
                timestamp: noteData.timestamp || Date.now(),
                sessionInfractions: noteData.sessionInfractions || 0,
                totalInfractions: noteData.totalInfractions || 0,
                infractionLog: noteData.infractionLog || [],
              });

              request.onsuccess = () => {
                console.log("Note saved to IndexedDB:", noteData.id);
                resolve(true);
              };

              request.onerror = () => {
                console.error(
                  "Failed to save note to IndexedDB:",
                  request.error,
                );
                reject(request.error);
              };
            });
          } catch (error) {
            console.error("Failed to save note to IndexedDB:", error);
            return false;
          }
        },

        // Load all notes from IndexedDB
        async loadNotes() {
          if (!this.isEnabled || !this.db) return [];

          try {
            return new Promise((resolve, reject) => {
              const transaction = this.db.transaction(["notes"], "readonly");
              const store = transaction.objectStore("notes");
              const request = store.getAll();

              request.onsuccess = () => {
                const notes = request.result || [];
                console.log(`Loaded ${notes.length} notes from IndexedDB`);
                resolve(notes);
              };

              request.onerror = () => {
                console.error(
                  "Failed to load notes from IndexedDB:",
                  request.error,
                );
                resolve([]);
              };
            });
          } catch (error) {
            console.error("Failed to load notes from IndexedDB:", error);
            return [];
          }
        },

        // Save setting to IndexedDB
        async saveSetting(key, value) {
          if (!this.isEnabled || !this.db) return false;

          try {
            return new Promise((resolve, reject) => {
              const transaction = this.db.transaction(
                ["settings"],
                "readwrite",
              );
              const store = transaction.objectStore("settings");

              const request = store.put({
                key: key,
                value: value,
                updated_at: new Date().toISOString(),
              });

              request.onsuccess = () => {
                console.log(`Setting saved to IndexedDB: ${key} = ${value}`);
                resolve(true);
              };

              request.onerror = () => {
                console.error(
                  "Failed to save setting to IndexedDB:",
                  request.error,
                );
                reject(request.error);
              };
            });
          } catch (error) {
            console.error("Failed to save setting to IndexedDB:", error);
            return false;
          }
        },

        // Load setting from IndexedDB
        async loadSetting(key) {
          if (!this.isEnabled || !this.db) return null;

          try {
            return new Promise((resolve, reject) => {
              const transaction = this.db.transaction(["settings"], "readonly");
              const store = transaction.objectStore("settings");
              const request = store.get(key);

              request.onsuccess = () => {
                const result = request.result;
                const value = result ? result.value : null;
                resolve(value);
              };

              request.onerror = () => {
                console.error(
                  "Failed to load setting from IndexedDB:",
                  request.error,
                );
                resolve(null);
              };
            });
          } catch (error) {
            console.error("Failed to load setting from IndexedDB:", error);
            return null;
          }
        },

        // Sync data from localStorage to IndexedDB
        async syncFromLocalStorage() {
          if (!this.isEnabled || !this.db) return false;

          try {
            // Get notes from localStorage
            const notesJson = localStorage.getItem("Frostbyte_Notes");
            if (notesJson) {
              const notes = JSON.parse(notesJson);
              for (const note of notes) {
                await this.saveNote(note);
              }
              console.log(
                `Synced ${notes.length} notes from localStorage to IndexedDB`,
              );
            }

            // Get settings from localStorage
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith("Frostbyte_Setting_")) {
                const settingKey = key.replace("Frostbyte_Setting_", "");
                const value = localStorage.getItem(key);
                await this.saveSetting(settingKey, value);
              }
            }

            return true;
          } catch (error) {
            console.error("Failed to sync from localStorage:", error);
            return false;
          }
        },

        // Sync data from IndexedDB to localStorage
        async syncToLocalStorage() {
          if (!this.isEnabled || !this.db) return false;

          try {
            // Sync notes
            const notes = await this.loadNotes();
            localStorage.setItem("Frostbyte_Notes", JSON.stringify(notes));

            // Sync settings
            const transaction = this.db.transaction(["settings"], "readonly");
            const store = transaction.objectStore("settings");
            const request = store.getAll();

            return new Promise((resolve) => {
              request.onsuccess = () => {
                const settings = request.result || [];
                settings.forEach((setting) => {
                  localStorage.setItem(
                    `Frostbyte_Setting_${setting.key}`,
                    setting.value,
                  );
                });
                console.log("Synced data from IndexedDB to localStorage");
                resolve(true);
              };

              request.onerror = () => {
                console.error("Failed to sync settings to localStorage");
                resolve(false);
              };
            });
          } catch (error) {
            console.error("Failed to sync to localStorage:", error);
            return false;
          }
        },

        // Search notes in IndexedDB
        async searchNotes(searchTerm) {
          if (!this.isEnabled || !this.db) return [];

          try {
            const notes = await this.loadNotes();
            const searchLower = searchTerm.toLowerCase();

            return notes.filter(
              (note) =>
                (note.techName &&
                  note.techName.toLowerCase().includes(searchLower)) ||
                (note.storeNumber &&
                  note.storeNumber.toLowerCase().includes(searchLower)) ||
                (note.workOrder &&
                  note.workOrder.toLowerCase().includes(searchLower)) ||
                (note.notes &&
                  note.notes.toLowerCase().includes(searchLower)) ||
                (note.dae && note.dae.toLowerCase().includes(searchLower)),
            );
          } catch (error) {
            console.error("Failed to search notes:", error);
            return [];
          }
        },

        // Get database statistics
        async getStatistics() {
          if (!this.isEnabled || !this.db) return null;

          try {
            const notes = await this.loadNotes();

            return new Promise((resolve) => {
              const transaction = this.db.transaction(["settings"], "readonly");

              const settingsStore = transaction.objectStore("settings");
              const settingsRequest = settingsStore.count();

              settingsRequest.onsuccess = () => {
                resolve({
                  totalNotes: notes.length,
                  totalSettings: settingsRequest.result,
                  lastUpdated: new Date().toISOString(),
                });
              };

              settingsRequest.onerror = () => {
                resolve({
                  totalNotes: notes.length,
                  totalSettings: 0,
                  lastUpdated: new Date().toISOString(),
                });
              };
            });
          } catch (error) {
            console.error("Failed to get database statistics:", error);
            return null;
          }
        },
      };

      // Enhanced Storage Wrapper (uses both localStorage and IndexedDB)
      const ENHANCED_STORAGE = {
        // Save to both localStorage and IndexedDB
        async setItem(key, value) {
          try {
            // Always save to localStorage first (fast, synchronous)
            localStorage.setItem(key, value);

            // Save to IndexedDB if enabled (async, reliable)
            if (SQLITE_STORAGE.isEnabled) {
              if (key === "notesHistory") {
                const notes = JSON.parse(value);
                for (const note of notes) {
                  await SQLITE_STORAGE.saveNote(note);
                }
              } else {
                await SQLITE_STORAGE.saveSetting(key, value);
              }
            }

            return true;
          } catch (error) {
            console.error("Enhanced storage setItem failed:", error);
            return false;
          }
        },

        // Get from localStorage (with IndexedDB fallback)
        async getItem(key) {
          try {
            // Try localStorage first
            let value = localStorage.getItem(key);

            // If not found and IndexedDB is available, try IndexedDB
            if (value === null && SQLITE_STORAGE.isEnabled) {
              if (key === "notesHistory") {
                const notes = await SQLITE_STORAGE.loadNotes();
                if (notes.length > 0) {
                  value = JSON.stringify(notes);
                  localStorage.setItem(key, value); // Cache in localStorage
                }
              } else {
                value = await SQLITE_STORAGE.loadSetting(key);
                if (value !== null) {
                  localStorage.setItem(key, value); // Cache in localStorage
                }
              }
            }

            return value;
          } catch (error) {
            console.error("Enhanced storage getItem failed:", error);
            return localStorage.getItem(key); // Fallback to localStorage only
          }
        },

        // Remove from both localStorage and IndexedDB
        async removeItem(key) {
          try {
            localStorage.removeItem(key);

            if (SQLITE_STORAGE.isEnabled) {
              // For IndexedDB, we would need to implement specific removal logic
              // For now, settings can be removed by setting them to null
              if (key !== "notesHistory") {
                await SQLITE_STORAGE.saveSetting(key, null);
              }
            }

            return true;
          } catch (error) {
            console.error("Enhanced storage removeItem failed:", error);
            return false;
          }
        },
      };

      // Tag analysis system
      const TAG_KEYWORDS = APP_CONFIG.TAG_KEYWORDS;

      function analyzeNotesForTags() {
        const notesContent = document
          .getElementById("notes")
          .value.toLowerCase();
        const daeContent = document
          .getElementById("dropdown-notes")
          .value.toLowerCase();
        const combinedContent = (notesContent + " " + daeContent).trim();

        if (!combinedContent) {
          displayRecommendedTags([]);
          return;
        }

        const tagScores = {};

        // Analyze content for tag keywords
        for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
          let score = 0;
          let matchCount = 0;

          keywords.forEach((keyword) => {
            const regex = new RegExp(
              "\\b" + keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
              "gi",
            );
            const matches = combinedContent.match(regex);
            if (matches) {
              matchCount += matches.length;
              score += matches.length * (keyword.length > 3 ? 2 : 1); // Longer keywords get more weight
            }
          });

          if (score > 0) {
            tagScores[tag] = { score, matchCount };
          }
        }

        // Sort tags by score and determine confidence levels
        const sortedTags = Object.entries(tagScores)
          .sort(([, a], [, b]) => b.score - a.score)
          .slice(0, 8) // Show top 8 recommendations
          .map(([tag, data]) => {
            let confidence = "low";
            if (data.score >= 4 || data.matchCount >= 3) confidence = "high";
            else if (data.score >= 2 || data.matchCount >= 2)
              confidence = "medium";

            return { tag, confidence, score: data.score };
          });

        displayRecommendedTags(sortedTags);
      }

      function displayRecommendedTags(tags) {
        const tagContainer = document.getElementById("recommended-tags");

        if (tags.length === 0) {
          tagContainer.innerHTML =
            "<small>Tags will appear here based on your notes content...</small>";
          return;
        }

        const tagElements = tags
          .map(({ tag, confidence }) => {
            const isSelected = AppState.selectedTags.has(tag);
            return `<span class="tag-item ${confidence}-confidence ${isSelected ? "selected" : ""}" 
                              onclick="toggleTag('${tag.replace(/'/g, "\\'")}')" 
                              title="Click to select/deselect this tag">
                            ${tag}
                        </span>`;
          })
          .join("");

        const legend = `
                <div class="tag-confidence-legend">
                    <span><div class="legend-color legend-high"></div>High confidence</span>
                    <span><div class="legend-color legend-medium"></div>Medium confidence</span>
                    <span><div class="legend-color legend-low"></div>Low confidence</span>
                </div>
            `;

        tagContainer.innerHTML = tagElements + legend;
      }

      function toggleTag(tagName) {
        if (AppState.selectedTags.has(tagName)) {
          AppState.selectedTags.delete(tagName);
        } else {
          AppState.selectedTags.add(tagName);
        }

        // Update visual state
        const tagElements = document.querySelectorAll(".tag-item");
        tagElements.forEach((element) => {
          if (element.textContent.trim() === tagName) {
            element.classList.toggle("selected");
          }
        });

        // Show notification
        const action = AppState.selectedTags.has(tagName)
          ? "Selected"
          : "Deselected";
        showNotification(`${action} tag: ${tagName}`, "success", 1500);
      }

      function getSelectedTags() {
        return Array.from(AppState.selectedTags);
      }

      // Dead Air Timer Functions
      function startTimer() {
        if (!AppState.timerRunning) {
          // Clear any existing timer first
          if (AppState.deadAirTimer) {
            clearInterval(AppState.deadAirTimer);
            AppState.deadAirTimer = null;
          }

          AppState.timerRunning = true;
          AppState.deadAirTimer = setInterval(updateTimer, 1000);

          // Mark that we're on a call - this keeps focus tracking active even if window loses focus
          AppState.usageTracking.onCall = true;

          // If not already tracking time, start now
          if (!AppState.usageTracking.focusStart) {
            AppState.usageTracking.focusStart = Date.now();
            console.log(
              "📊 Call started - beginning time tracking (acts as window focus)",
            );
          } else {
            console.log("📊 Call started - continuing existing time tracking");
          }

          showNotification("Dead air timer started", "success", 1500);
        }
      }

      function pauseTimer() {
        AppState.timerRunning = false;
        if (AppState.deadAirTimer) {
          clearInterval(AppState.deadAirTimer);
          AppState.deadAirTimer = null;
        }

        // Mark call as ended
        AppState.usageTracking.onCall = false;

        // Save accumulated time if tracking and window is not focused
        if (
          AppState.usageTracking.focusStart &&
          !AppState.usageTracking.windowFocused
        ) {
          const focusedDuration =
            Date.now() - AppState.usageTracking.focusStart;
          AppState.usageTracking.totalFocusTime += focusedDuration;
          localStorage.setItem(
            "totalFocusTime",
            AppState.usageTracking.totalFocusTime.toString(),
          );
          console.log(
            `📊 Call ended (window not focused) - added ${Math.round(focusedDuration / 1000)}s to focus time`,
          );
          AppState.usageTracking.focusStart = null;
        } else if (
          AppState.usageTracking.focusStart &&
          AppState.usageTracking.windowFocused
        ) {
          console.log(
            "📊 Call ended (window still focused) - continuing time tracking",
          );
        }

        stopTabFlash(); // Stop flashing when paused
        showNotification("Timer paused", "success", 1500);
      }

      function resetTimer() {
        AppState.deadAirSeconds = 0;
        updateTimerDisplay();
        updateTimerVisuals();
        stopTabFlash(); // Stop flashing when reset
        if (AppState.youSpokeNotifications) {
          showNotification("Timer reset - You spoke!", "success", 1000);
        }
      }

      function updateTimer() {
        if (AppState.timerRunning) {
          AppState.deadAirSeconds++;
          updateTimerDisplay();
          updateTimerVisuals();

          // Check for infraction at 30 seconds
          if (AppState.deadAirSeconds === AppState.deadAirThreshold) {
            recordInfraction();
          }
        }
      }

      function updateTimerDisplay() {
        const minutes = Math.floor(AppState.deadAirSeconds / 60);
        const seconds = AppState.deadAirSeconds % 60;
        const display = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        document.getElementById("timer-display").textContent = display;
      }

      function updateTimerVisuals() {
        const timer = document.getElementById("dead-air-timer");
        const warningOverlay = document.getElementById(
          "dead-air-warning-overlay",
        );

        // Update timer colors
        timer.classList.remove("warning", "critical");

        // Update visual overlay warnings if enabled
        if (AppState.visualDeadAirWarnings && warningOverlay) {
          warningOverlay.classList.remove("warning", "critical");

          if (AppState.deadAirSeconds >= 30) {
            timer.classList.add("critical");
            warningOverlay.classList.add("critical");
            startTabFlash("🔴 DEAD AIR!");
          } else if (AppState.deadAirSeconds >= 25) {
            timer.classList.add("warning");
            warningOverlay.classList.add("warning");
            startTabFlash("⚠️ Dead Air Warning");
          } else {
            stopTabFlash();
          }
        } else if (warningOverlay) {
          // Remove all visual warnings if disabled
          warningOverlay.classList.remove("warning", "critical");

          // Still update timer colors and tab flash
          if (AppState.deadAirSeconds >= 30) {
            timer.classList.add("critical");
            startTabFlash("🔴 DEAD AIR!");
          } else if (AppState.deadAirSeconds >= 25) {
            timer.classList.add("warning");
            startTabFlash("⚠️ Dead Air Warning");
          } else {
            stopTabFlash();
          }
        }
      }

      // Tab flashing functions with color
      function startTabFlash(alertMessage) {
        if (AppState.isTabFlashing) return; // Already flashing

        AppState.isTabFlashing = true;
        let showAlert = true;

        // Determine color based on alert type
        const isWarning = alertMessage.includes("⚠️");
        const warningColor = isWarning ? "#ffc107" : "#dc3545"; // Yellow for warning, red for critical

        AppState.tabFlashInterval = setInterval(() => {
          if (showAlert) {
            document.title = alertMessage;
            setFaviconColor(warningColor);
          } else {
            document.title = AppState.originalTitle;
            setFaviconColor("#0078d4"); // Default blue
          }
          showAlert = !showAlert;
        }, 1000); // Flash every second
      }

      function stopTabFlash() {
        if (AppState.tabFlashInterval) {
          clearInterval(AppState.tabFlashInterval);
          AppState.tabFlashInterval = null;
        }
        AppState.isTabFlashing = false;
        document.title = AppState.originalTitle; // Restore original title
        setFaviconColor("#0078d4"); // Restore default blue favicon
      }

      // Helper function to dynamically set favicon color
      function setFaviconColor(color) {
        // Remove existing favicon
        let link = document.querySelector("link[rel*='icon']");
        if (link) {
          document.head.removeChild(link);
        }

        // Create new favicon with the specified color
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");

        // Draw colored circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, Math.PI * 2);
        ctx.fill();

        // Add white border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Set as favicon
        link = document.createElement("link");
        link.type = "image/x-icon";
        link.rel = "icon";
        link.href = canvas.toDataURL();
        document.head.appendChild(link);
      }

      // Microphone Detection (for voice detection only)
      async function initializeMicrophone() {
        try {
          console.log("Attempting to initialize microphone...");

          // Get microphone for voice detection
          AppState.micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          console.log("Microphone access granted");

          AppState.micAudioContext = new (
            window.AudioContext || window.webkitAudioContext
          )();
          AppState.micAnalyser = AppState.micAudioContext.createAnalyser();
          const micSource = AppState.micAudioContext.createMediaStreamSource(
            AppState.micStream,
          );
          micSource.connect(AppState.micAnalyser);

          AppState.micAnalyser.fftSize = 256;
          AppState.micAnalyser.smoothingTimeConstant = 0.8;

          console.log("Audio context created, starting voice detection...");
          startVoiceDetection();
        } catch (error) {
          console.error("Microphone initialization failed:", error);
          showNotification(
            "Microphone access denied - Using manual controls only",
            "error",
            3000,
          );
        }
      }

      function startVoiceDetection() {
        const bufferLength = AppState.micAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function detectVoice() {
          if (!AppState.micAnalyser) return;

          AppState.micAnalyser.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

          // Update microphone level
          AppState.currentMicLevel = Math.round((average / 255) * 100);
          updateMicLevelDisplay();

          const wasSpeaking = AppState.micActive;
          AppState.micActive = average > AppState.micSensitivity;

          // Update mic status indicator
          const micStatus = document.getElementById("mic-status");
          if (AppState.micActive) {
            micStatus.classList.add("active");
            // Auto-reset timer when your voice is detected
            if (!wasSpeaking && AppState.timerRunning) {
              resetTimer();
            }
          } else {
            micStatus.classList.remove("active");
          }

          requestAnimationFrame(detectVoice);
        }

        detectVoice();
        showNotification("🎤 Voice detection active", "success", 2000);
      }

      function resetCallDetection() {
        AppState.callDetected = false;
        AppState.timerRunning = false;
        AppState.deadAirSeconds = 0;

        // Clear the timer interval
        if (AppState.deadAirTimer) {
          clearInterval(AppState.deadAirTimer);
          AppState.deadAirTimer = null;
        }

        // Clear session infractions at end of call
        AppState.sessionInfractions = 0;

        // Reset current note infraction tracking for new calls
        AppState.currentNoteInfractions = [];

        updateInfractionDisplay();

        updateTimerDisplay();
        updateTimerVisuals();
        showNotification(
          "Call ended - Timer stopped and reset",
          "success",
          2000,
        );
      }

      // Infraction tracking functions
      function recordInfraction() {
        AppState.sessionInfractions++;
        AppState.totalInfractions++;

        // Create infraction log entry
        const infractionEntry = {
          timestamp: Date.now(),
          sessionNumber: AppState.sessionInfractions,
          totalNumber: AppState.totalInfractions,
          timeOfDay: new Date().toLocaleTimeString(),
          date: new Date().toLocaleDateString(),
        };

        // Add to current note's infraction log
        if (!AppState.currentNoteInfractions) {
          AppState.currentNoteInfractions = [];
        }
        AppState.currentNoteInfractions.push(infractionEntry);

        // If we have a current note, update it with the infraction
        if (AppState.currentNoteId) {
          updateCurrentNoteWithInfraction(infractionEntry);
        }

        // Update current note display
        displayInfractionInfo({
          infractionLog: AppState.currentNoteInfractions,
        });

        // Save total to localStorage
        localStorage.setItem(
          "totalInfractions",
          AppState.totalInfractions.toString(),
        );

        updateInfractionDisplay();
        showNotification(
          `⚠️ Dead air infraction #${AppState.sessionInfractions} recorded (30+ seconds)`,
          "error",
          3000,
        );
      }

      function clearLastInfraction() {
        if (AppState.sessionInfractions > 0) {
          AppState.sessionInfractions--;
          AppState.totalInfractions--;

          // Remove the last infraction from current note log
          if (
            AppState.currentNoteInfractions &&
            AppState.currentNoteInfractions.length > 0
          ) {
            AppState.currentNoteInfractions.pop();

            // Update the note in localStorage if it exists
            if (AppState.currentNoteId) {
              updateCurrentNoteWithInfraction(null, true); // true = remove last
            }
          }

          // Update localStorage
          localStorage.setItem(
            "totalInfractions",
            AppState.totalInfractions.toString(),
          );

          updateInfractionDisplay();
          showNotification("✅ Last infraction cleared", "success", 2000);
        } else {
          showNotification("❌ No infractions to clear", "error", 2000);
        }
      }

      // Helper function to update current note with infraction data
      function updateCurrentNoteWithInfraction(
        infractionEntry,
        removeLast = false,
      ) {
        try {
          const history = getNotesHistory();
          const existingIndex = history.findIndex(
            (entry) => entry.id === AppState.currentNoteId,
          );

          if (existingIndex !== -1) {
            if (!history[existingIndex].infractionLog) {
              history[existingIndex].infractionLog = [];
            }

            if (removeLast) {
              history[existingIndex].infractionLog.pop();
            } else if (infractionEntry) {
              history[existingIndex].infractionLog.push(infractionEntry);
            }

            // Update session infractions count
            history[existingIndex].sessionInfractions =
              AppState.sessionInfractions;
            history[existingIndex].totalInfractionsAtTime =
              AppState.totalInfractions;

            localStorage.setItem("notesHistory", JSON.stringify(history));
            updateHistoryDropdown();
          }
        } catch (error) {
          console.error("Failed to update note with infraction:", error);
        }
      }

      function clearTotalInfractions() {
        if (confirm("Clear all total infractions? This cannot be undone.")) {
          AppState.totalInfractions = 0;
          localStorage.setItem("totalInfractions", "0");
          updateInfractionDisplay();
          showNotification("🗑️ Total infractions cleared", "success", 2000);
        }
      }

      function updateInfractionDisplay() {
        const sessionCount = document.getElementById("session-count");
        const totalCount = document.getElementById("total-count");
        const tracker = document.getElementById("infraction-tracker");

        if (sessionCount)
          sessionCount.textContent = AppState.sessionInfractions;
        if (totalCount) totalCount.textContent = AppState.totalInfractions;

        // Add visual emphasis when there are infractions
        if (tracker) {
          if (AppState.sessionInfractions > 0) {
            tracker.classList.add("has-infractions");
          } else {
            tracker.classList.remove("has-infractions");
          }
        }
      }

      function loadTotalInfractions() {
        const saved = localStorage.getItem("totalInfractions");
        if (saved) {
          AppState.totalInfractions = parseInt(saved) || 0;
        }
      }

      // Token obfuscation utilities
      function encodeToken(token) {
        // Simple XOR + Base64 encoding (not cryptographically secure, just obfuscation)
        const key = 42; // Simple XOR key
        const xored = token
          .split("")
          .map((char) => String.fromCharCode(char.charCodeAt(0) ^ key))
          .join("");
        return btoa(xored);
      }

      // Settings Menu Functions
      function toggleSettingsMenu() {
        const dropdown = document.getElementById("settings-dropdown");
        const isVisible = dropdown.classList.contains("show");

        if (isVisible) {
          dropdown.classList.remove("show");
        } else {
          dropdown.classList.add("show");
          updateSettingsToggles(); // Update toggle states when opening
        }

        // Close on outside click
        if (!isVisible) {
          setTimeout(() => {
            document.addEventListener("click", closeSettingsOnOutsideClick, {
              once: true,
            });
          }, 100);
        }
      }

      function closeSettingsOnOutsideClick(event) {
        const dropdown = document.getElementById("settings-dropdown");
        const settingsBtn = document.getElementById("settings-btn");

        if (
          !dropdown.contains(event.target) &&
          !settingsBtn.contains(event.target)
        ) {
          dropdown.classList.remove("show");
        }
      }

      // Keyboard Shortcuts Help Functions
      function toggleKeyboardHelp() {
        const modal = document.getElementById("keyboard-help-modal");
        const isVisible = modal.classList.contains("show");

        if (isVisible) {
          modal.classList.remove("show");
        } else {
          modal.classList.add("show");
        }
      }

      function closeKeyboardHelpOnOutside(event) {
        if (event.target.id === "keyboard-help-modal") {
          toggleKeyboardHelp();
        }
      }

      function updateSettingsToggles() {
        // Update visual warnings toggle
        const visualWarningsToggle = document.getElementById(
          "visual-warnings-toggle",
        );
        if (visualWarningsToggle) {
          if (AppState.visualDeadAirWarnings) {
            visualWarningsToggle.classList.add("active");
          } else {
            visualWarningsToggle.classList.remove("active");
          }
        }

        // Update you spoke notifications toggle
        const youSpokeToggle = document.getElementById("you-spoke-toggle");
        if (youSpokeToggle) {
          if (AppState.youSpokeNotifications) {
            youSpokeToggle.classList.add("active");
          } else {
            youSpokeToggle.classList.remove("active");
          }
        }

        // Update microphone level toggle
        const micLevelToggle = document.getElementById("mic-level-toggle");
        if (micLevelToggle) {
          const micLevelContainer = document.getElementById(
            "mic-level-container",
          );
          const isVisible =
            micLevelContainer && micLevelContainer.style.display !== "none";
          if (isVisible) {
            micLevelToggle.classList.add("active");
          } else {
            micLevelToggle.classList.remove("active");
          }
        }

        // Update War Room toggle
        const warRoomToggle = document.getElementById("war-room-toggle");
        if (warRoomToggle) {
          try {
            if (
              typeof WAR_ROOM_SYSTEM !== "undefined" &&
              WAR_ROOM_SYSTEM.state.isEnabled
            ) {
              warRoomToggle.classList.add("active");
            } else {
              warRoomToggle.classList.remove("active");
            }
          } catch (e) {
            // WAR_ROOM_SYSTEM not yet initialized
            warRoomToggle.classList.remove("active");
          }
        }

        // Update War Room Schedule toggle
        const warRoomScheduleToggle = document.getElementById(
          "war-room-schedule-toggle",
        );
        if (warRoomScheduleToggle) {
          if (AppState.warRoomSchedule.enabled) {
            warRoomScheduleToggle.classList.add("active");
          } else {
            warRoomScheduleToggle.classList.remove("active");
          }
        }

        // Update Database toggle
        const databaseToggle = document.getElementById("database-toggle");
        if (databaseToggle) {
          try {
            if (typeof SQLITE_STORAGE !== "undefined") {
              const isEnabled =
                localStorage.getItem("databaseEnabled") === "true";
              const isSupported = SQLITE_STORAGE.checkSupport();
              if (isEnabled && isSupported) {
                databaseToggle.classList.add("active");
              } else {
                databaseToggle.classList.remove("active");
              }
            } else {
              databaseToggle.classList.remove("active");
            }
          } catch (e) {
            // SQLITE_STORAGE not yet initialized
            databaseToggle.classList.remove("active");
          }
        }

        // Update Database UI
        updateDatabaseUI();
      }

      function initializeVisualWarnings() {
        // Load saved visual warnings preference
        const savedVisualWarnings = localStorage.getItem(
          "visualDeadAirWarnings",
        );
        if (savedVisualWarnings !== null) {
          AppState.visualDeadAirWarnings = savedVisualWarnings === "true";
        }

        // Load saved you spoke notifications preference
        const savedYouSpoke = localStorage.getItem("youSpokeNotifications");
        if (savedYouSpoke !== null) {
          AppState.youSpokeNotifications = savedYouSpoke === "true";
        }

        console.log(
          `⚠️ Visual dead air warnings: ${AppState.visualDeadAirWarnings ? "enabled" : "disabled"}`,
        );
        console.log(
          `🗣️ "You Spoke" notifications: ${AppState.youSpokeNotifications ? "enabled" : "disabled"}`,
        );
      }

      function initializeMicrophoneSettings() {
        // Load saved microphone sensitivity
        const savedSensitivity = localStorage.getItem("micSensitivity");
        if (savedSensitivity !== null) {
          AppState.micSensitivity = parseInt(savedSensitivity);
        }

        // Load microphone level display preference
        const savedMicLevel = localStorage.getItem("micLevelDisplay");
        if (savedMicLevel !== null) {
          const showMicLevel = savedMicLevel === "true";
          toggleMicLevelDisplayState(showMicLevel);
        }

        // Update UI
        const sensitivitySlider = document.getElementById("sensitivity-slider");
        const sensitivityValue = document.getElementById("sensitivity-value");
        if (sensitivitySlider && sensitivityValue) {
          sensitivitySlider.value = AppState.micSensitivity;
          sensitivityValue.textContent = AppState.micSensitivity;
        }

        console.log(`🎤 Microphone sensitivity: ${AppState.micSensitivity}`);
      }

      function updateMicLevelDisplay() {
        const micLevelFill = document.getElementById("mic-level-fill");
        const micLevelText = document.getElementById("mic-level-text");

        if (micLevelFill && micLevelText) {
          const level = AppState.currentMicLevel;
          micLevelFill.style.width = `${level}%`;
          micLevelText.textContent = `${level}%`;

          // Add visual feedback when above sensitivity threshold
          if (level > (AppState.micSensitivity / 255) * 100) {
            micLevelFill.style.boxShadow = "0 0 8px rgba(40, 167, 69, 0.6)";
          } else {
            micLevelFill.style.boxShadow = "none";
          }
        }
      }

      function updateMicSensitivity(value) {
        AppState.micSensitivity = parseInt(value);
        localStorage.setItem(
          "micSensitivity",
          AppState.micSensitivity.toString(),
        );

        const sensitivityValue = document.getElementById("sensitivity-value");
        if (sensitivityValue) {
          sensitivityValue.textContent = value;
        }

        console.log(`🎤 Microphone sensitivity updated: ${value}`);
      }

      function toggleMicLevelDisplay() {
        const micLevelContainer = document.getElementById(
          "mic-level-container",
        );
        const sensitivityContainer = document.getElementById(
          "sensitivity-container",
        );

        const isVisible = micLevelContainer.style.display !== "none";
        const newState = !isVisible;

        toggleMicLevelDisplayState(newState);
        localStorage.setItem("micLevelDisplay", newState.toString());

        const status = newState ? "enabled" : "disabled";
        showNotification(
          `🎤 Microphone level display ${status}`,
          "success",
          2000,
        );

        updateSettingsToggles();
      }

      function toggleMicLevelDisplayState(show) {
        const micLevelContainer = document.getElementById(
          "mic-level-container",
        );
        const sensitivityContainer = document.getElementById(
          "sensitivity-container",
        );

        if (micLevelContainer && sensitivityContainer) {
          micLevelContainer.style.display = show ? "flex" : "none";
          sensitivityContainer.style.display = show ? "flex" : "none";
        }
      }

      // Visual Dead Air Warnings Toggle
      function toggleVisualDeadAirWarnings() {
        AppState.visualDeadAirWarnings = !AppState.visualDeadAirWarnings;
        localStorage.setItem(
          "visualDeadAirWarnings",
          AppState.visualDeadAirWarnings.toString(),
        );

        const status = AppState.visualDeadAirWarnings ? "enabled" : "disabled";
        showNotification(
          `⚠️ Visual dead air warnings ${status}`,
          "success",
          3000,
        );

        // Update toggle visual state
        updateSettingsToggles();

        // Clear any existing warnings if disabled
        if (!AppState.visualDeadAirWarnings) {
          const warningOverlay = document.getElementById(
            "dead-air-warning-overlay",
          );
          if (warningOverlay) {
            warningOverlay.classList.remove("warning", "critical");
          }
        } else {
          // Reapply current warning state if enabled
          updateTimerVisuals();
        }

        console.log(`⚠️ Visual dead air warnings ${status}`);
      }

      // You Spoke Notifications Toggle
      function toggleYouSpokeNotifications() {
        AppState.youSpokeNotifications = !AppState.youSpokeNotifications;
        localStorage.setItem(
          "youSpokeNotifications",
          AppState.youSpokeNotifications.toString(),
        );

        const status = AppState.youSpokeNotifications ? "enabled" : "disabled";
        showNotification(
          `🗣️ "You Spoke" notifications ${status}`,
          "success",
          3000,
        );

        // Update toggle visual state
        updateSettingsToggles();

        console.log(`🗣️ "You Spoke" notifications ${status}`);
      }

      // ============= War Room Schedule Functions =============

      function toggleWarRoomSchedule() {
        AppState.warRoomSchedule.enabled = !AppState.warRoomSchedule.enabled;
        const config = document.getElementById("war-room-schedule-config");
        if (config) {
          config.style.display = AppState.warRoomSchedule.enabled
            ? "block"
            : "none";
        }
        updateSettingsToggles();
        saveWarRoomSchedule();
      }

      function getShiftTimesInUserTimezone(shift) {
        // CST shift times
        const shiftTimes = {
          "7am-1pm": { start: 7, end: 13 },
          "3pm-9pm": { start: 15, end: 21 },
          "7am-5pm": { start: 7, end: 17 },
          "11pm-5am": { start: 23, end: 5, overnight: true },
        };

        if (!shiftTimes[shift]) return null;

        // Create Date objects for today at the shift times in CST
        // We'll create them as CST times and let JavaScript handle the conversion
        const now = new Date();

        // Get today's date in CST
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Chicago",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const parts = formatter.formatToParts(now);
        const cstYear = parts.find((p) => p.type === "year").value;
        const cstMonth = parts.find((p) => p.type === "month").value;
        const cstDay = parts.find((p) => p.type === "day").value;

        // Create ISO string for CST date at shift start/end times
        // Format: YYYY-MM-DDTHH:MM:SS-06:00 (CST is UTC-6, or -05:00 during CDT)
        const isDST =
          new Date(now.getFullYear(), 0, 1).getTimezoneOffset() !==
          now.getTimezoneOffset();
        const cstOffset = isDST ? "-05:00" : "-06:00";

        const startISO = `${cstYear}-${cstMonth}-${cstDay}T${shiftTimes[shift].start.toString().padStart(2, "0")}:00:00${cstOffset}`;
        const endISO = `${cstYear}-${cstMonth}-${cstDay}T${shiftTimes[shift].end.toString().padStart(2, "0")}:00:00${cstOffset}`;

        const startTime = new Date(startISO);
        const endTime = new Date(endISO);

        return {
          start: startTime.getHours(),
          end: endTime.getHours(),
          startMinutes: startTime.getHours() * 60 + startTime.getMinutes(),
          endMinutes: endTime.getHours() * 60 + endTime.getMinutes(),
          displayStart: startTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          displayEnd: endTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
        };
      }

      function saveWarRoomSchedule() {
        const enabled = AppState.warRoomSchedule.enabled;
        const shift = document.getElementById("warRoomShift")?.value;
        const role = document.getElementById("warRoomRole")?.value;
        const days = Array.from(
          document.querySelectorAll(".warRoomDay:checked"),
        ).map((cb) => cb.value);

        AppState.warRoomSchedule = {
          ...AppState.warRoomSchedule,
          enabled,
          shift,
          role,
          days,
        };

        // Save to localStorage
        localStorage.setItem(
          "warRoomSchedule",
          JSON.stringify(AppState.warRoomSchedule),
        );

        // Update preview
        const preview = document.getElementById("war-room-schedule-preview");
        const previewText = document.getElementById("war-room-schedule-text");

        if (enabled && shift && days.length > 0) {
          const shiftDisplay = getShiftTimesInUserTimezone(shift);
          preview.style.display = "block";
          previewText.innerHTML = `
                    <em>${days.join(", ")}</em><br>
                    <em>${shiftDisplay.displayStart} - ${shiftDisplay.displayEnd} (your timezone)</em><br>
                    <em>Role: ${role.charAt(0).toUpperCase() + role.slice(1)}</em>
                `;
          initializeWarRoomSchedule();
          showNotification("✅ War Room schedule saved!", "success", 2000);
        } else {
          preview.style.display = "none";
          stopWarRoomSchedule();
          if (enabled) {
            showNotification(
              "⚠️ Please select shift time and days",
              "warning",
              2000,
            );
          }
        }

        console.log("War Room schedule saved:", AppState.warRoomSchedule);
      }

      function initializeWarRoomSchedule(skipTimerClear = false) {
        // Clear any existing timers (unless we're reinitializing after a check completion)
        if (!skipTimerClear) {
          stopWarRoomSchedule();
        }

        if (
          !AppState.warRoomSchedule.enabled ||
          !AppState.warRoomSchedule.shift ||
          AppState.warRoomSchedule.days.length === 0
        ) {
          return;
        }

        // Check if today is a War Room day
        const now = new Date();
        const dayName = now.toLocaleDateString("en-US", { weekday: "long" });

        if (!AppState.warRoomSchedule.days.includes(dayName)) {
          console.log(`📅 Today (${dayName}) is not a War Room day`);
          scheduleNextWarRoomDay();
          return;
        }

        console.log("📋 War Room schedule active - calculating check times");
        scheduleAllWarRoomChecks();
      }

      function scheduleAllWarRoomChecks() {
        const now = new Date();
        const shiftTimes = getShiftTimesInUserTimezone(
          AppState.warRoomSchedule.shift,
        );
        if (!shiftTimes) return;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Calculate all check times (every 2 hours starting from shift start)
        const checkTimes = [];
        for (
          let checkMinutes = shiftTimes.startMinutes;
          checkMinutes <= shiftTimes.endMinutes;
          checkMinutes += 120
        ) {
          checkTimes.push(checkMinutes);
        }

        console.log(
          "📋 War Room check times today:",
          checkTimes.map((m) => {
            const h = Math.floor(m / 60);
            const min = m % 60;
            return `${h}:${min.toString().padStart(2, "0")}`;
          }),
        );

        // Get the last completed check time (if any)
        const lastCompletedCheck =
          AppState.warRoomSchedule.lastCompletedCheck || 0;
        console.log(
          `📋 Current time: ${Math.floor(currentMinutes / 60)}:${(currentMinutes % 60).toString().padStart(2, "0")} (${currentMinutes} minutes)`,
        );
        console.log(`📋 Last completed check: ${lastCompletedCheck} minutes`);

        // Schedule each upcoming check
        let nextCheckScheduled = false;
        for (const checkMinutes of checkTimes) {
          const latestStartTime = checkMinutes + 20; // Can start up to 20 min after due time

          // Skip checks that:
          // 1. Have been completed already (lastCompletedCheck tracks this)
          // 2. Are in the past beyond the latest start time
          const isAlreadyCompleted = lastCompletedCheck === checkMinutes;
          const isPastDue = currentMinutes >= latestStartTime;

          console.log(
            `📋 Evaluating check at ${Math.floor(checkMinutes / 60)}:${(checkMinutes % 60).toString().padStart(2, "0")} - completed: ${isAlreadyCompleted}, pastDue: ${isPastDue}`,
          );

          if (!isAlreadyCompleted && !isPastDue) {
            scheduleWarRoomCheck(checkMinutes);
            if (!nextCheckScheduled) {
              // This is the next check
              const checkTime = new Date(now);
              checkTime.setHours(
                Math.floor(checkMinutes / 60),
                checkMinutes % 60,
                0,
                0,
              );
              AppState.warRoomSchedule.nextCheck = checkTime;
              AppState.warRoomSchedule.currentCheckDue = checkTime;
              AppState.warRoomSchedule.notificationShown = false; // Reset for new check
              nextCheckScheduled = true;
              console.log(
                "✅ Next War Room check scheduled for:",
                checkTime.toLocaleTimeString(),
              );
            }
          } else if (isAlreadyCompleted) {
            console.log(
              `⏭️ Skipping check at ${Math.floor(checkMinutes / 60)}:${(checkMinutes % 60).toString().padStart(2, "0")} - already completed`,
            );
          } else if (isPastDue) {
            console.log(
              `⏭️ Skipping check at ${Math.floor(checkMinutes / 60)}:${(checkMinutes % 60).toString().padStart(2, "0")} - past due`,
            );
          }
        }

        if (!nextCheckScheduled) {
          console.log("📋 No more War Room checks today");
          scheduleNextWarRoomDay();
        } else {
          // Update display and save state
          updateWarRoomStatusDisplay();
          localStorage.setItem(
            "warRoomScheduleState",
            JSON.stringify(AppState.warRoomSchedule),
          );
        }
      }

      function scheduleWarRoomCheck(checkMinutes) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Check if this is for today or a future day
        const nextCheck = AppState.warRoomSchedule.nextCheck;
        if (!nextCheck) return;

        const nextCheckDate = new Date(nextCheck);
        const isToday = nextCheckDate.toDateString() === now.toDateString();

        // If the check is not today, don't trigger immediate notifications
        if (!isToday) {
          console.log(
            `📋 Check at ${Math.floor(checkMinutes / 60)}:${(checkMinutes % 60).toString().padStart(2, "0")} is not today - skipping immediate notifications`,
          );
          return;
        }

        const earliestStartTime = checkMinutes - 20; // Can start 20 min early
        const dueTime = checkMinutes;
        const backupNotifyTime = checkMinutes + 15; // Backup notified 15 min after
        const latestStartTime = checkMinutes + 20; // Must start by this time

        const isBackup = AppState.warRoomSchedule.role === "backup";

        // Reset notification shown state for this new check period
        if (AppState.warRoomSchedule.currentCheckDue !== checkMinutes) {
          AppState.warRoomSchedule.currentCheckDue = checkMinutes;
          AppState.warRoomSchedule.notificationShown = false;
        }

        // Schedule primary notification (due time or 20 min before if we're ahead)
        if (!isBackup) {
          if (currentMinutes < earliestStartTime) {
            // Schedule notification for 20 min before
            const msUntil = (earliestStartTime - currentMinutes) * 60 * 1000;
            const timeout = setTimeout(() => {
              showWarRoomNotification("can-start", checkMinutes);
            }, msUntil);
            AppState.warRoomSchedule.reminderTimeouts.push(timeout);
            console.log(
              `📋 Primary can-start notification in ${Math.round(msUntil / 60000)} minutes`,
            );
          } else if (
            currentMinutes < dueTime &&
            !AppState.warRoomSchedule.notificationShown
          ) {
            // We're in the "can start early" window
            showWarRoomNotification("can-start", checkMinutes);
          }

          // Schedule due time notification
          if (currentMinutes < dueTime) {
            const msUntilDue = (dueTime - currentMinutes) * 60 * 1000;
            const timeout = setTimeout(() => {
              if (!AppState.warRoomSchedule.notificationShown) {
                showWarRoomNotification("due-now", checkMinutes);
              }
            }, msUntilDue);
            AppState.warRoomSchedule.reminderTimeouts.push(timeout);
            console.log(
              `📋 Primary due notification in ${Math.round(msUntilDue / 60000)} minutes`,
            );
          } else if (
            currentMinutes >= dueTime &&
            currentMinutes < latestStartTime &&
            !AppState.warRoomSchedule.notificationShown
          ) {
            // We're past due time but within deadline window
            showWarRoomNotification("due-now", checkMinutes);
          }
        }

        // Schedule backup notification (15 min after due time)
        if (isBackup && currentMinutes < backupNotifyTime) {
          const msUntilBackup = (backupNotifyTime - currentMinutes) * 60 * 1000;
          const timeout = setTimeout(() => {
            if (!AppState.warRoomSchedule.notificationShown) {
              showWarRoomNotification("backup-check", checkMinutes);
            }
          }, msUntilBackup);
          AppState.warRoomSchedule.reminderTimeouts.push(timeout);
          console.log(
            `📋 Backup notification in ${Math.round(msUntilBackup / 60000)} minutes`,
          );
        } else if (
          isBackup &&
          currentMinutes >= backupNotifyTime &&
          currentMinutes < latestStartTime &&
          !AppState.warRoomSchedule.notificationShown
        ) {
          // Backup notification time has arrived
          showWarRoomNotification("backup-check", checkMinutes);
        }
      }

      function showWarRoomNotification(type, checkMinutes) {
        // Don't show if already dismissed for this check period
        if (AppState.warRoomSchedule.notificationShown) return;

        const statusDiv = document.getElementById("warRoomStatus");
        if (!statusDiv) return;

        // Remove any existing flash classes
        statusDiv.classList.remove("flash-yellow", "flash-red");

        // Apply appropriate flash based on notification type
        if (type === "can-start") {
          // Flash yellow - check can start early
          statusDiv.classList.add("flash-yellow");
        } else if (type === "due-now") {
          // Flash red - check is due now (urgent)
          statusDiv.classList.add("flash-red");
        } else if (type === "backup-check") {
          // Flash yellow for backup notification
          statusDiv.classList.add("flash-yellow");
        }
      }

      function calculateLatestStart(checkMinutes) {
        const latestTime = new Date();
        const latestMinutes = checkMinutes + 20;
        latestTime.setHours(
          Math.floor(latestMinutes / 60),
          latestMinutes % 60,
          0,
          0,
        );
        return latestTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }

      function dismissWarRoomNotification() {
        // Stop any flashing on the War Room status display
        const statusDiv = document.getElementById("warRoomStatus");
        if (statusDiv) {
          statusDiv.classList.remove("flash-yellow", "flash-red");
        }

        // Mark notification as shown to prevent re-appearing
        AppState.warRoomSchedule.notificationShown = true;

        // Track the current check as completed so we don't reschedule it
        if (AppState.warRoomSchedule.currentCheckDue) {
          const checkTime = new Date(AppState.warRoomSchedule.currentCheckDue);
          const checkMinutes =
            checkTime.getHours() * 60 + checkTime.getMinutes();
          AppState.warRoomSchedule.lastCompletedCheck = checkMinutes;
          console.log(
            `📋 Marking check at ${checkTime.toLocaleTimeString()} (${checkMinutes} minutes) as completed`,
          );
          console.log(`📋 lastCompletedCheck set to: ${checkMinutes}`);
        } else {
          console.log(
            "⚠️ No currentCheckDue found - cannot track completed check",
          );
        }

        // Save state to localStorage
        localStorage.setItem(
          "warRoomScheduleState",
          JSON.stringify(AppState.warRoomSchedule),
        );

        // Clear existing timers and reschedule next check
        console.log("📋 War Room check completed - scheduling next check");
        if (AppState.warRoomSchedule.timers) {
          AppState.warRoomSchedule.timers.forEach((timer) =>
            clearTimeout(timer),
          );
          AppState.warRoomSchedule.timers = [];
        }

        // Reschedule all remaining checks for today
        scheduleAllWarRoomChecks();
      }

      function scheduleNextWarRoomDay() {
        const now = new Date();
        const currentDay = now.getDay();

        const dayMap = {
          Sunday: 0,
          Monday: 1,
          Tuesday: 2,
          Wednesday: 3,
          Thursday: 4,
          Friday: 5,
          Saturday: 6,
        };

        const warRoomDays = AppState.warRoomSchedule.days
          .map((day) => dayMap[day])
          .sort((a, b) => a - b);

        let nextDay = null;
        for (const day of warRoomDays) {
          if (day > currentDay) {
            nextDay = day;
            break;
          }
        }

        if (!nextDay && warRoomDays.length > 0) {
          nextDay = warRoomDays[0];
        }

        if (!nextDay) {
          // No War Room days configured - clear display
          AppState.warRoomSchedule.nextCheck = null;
          updateWarRoomStatusDisplay();
          return;
        }

        let daysUntilNext = nextDay - currentDay;
        if (daysUntilNext <= 0) daysUntilNext += 7;

        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + daysUntilNext);

        // Get the shift start time for that next day
        const shiftTimes = getShiftTimesInUserTimezone(
          AppState.warRoomSchedule.shift,
        );
        if (shiftTimes) {
          nextDate.setHours(
            Math.floor(shiftTimes.startMinutes / 60),
            shiftTimes.startMinutes % 60,
            0,
            0,
          );
        } else {
          nextDate.setHours(0, 0, 0, 0);
        }

        // Set the nextCheck to the first check of the next War Room day
        AppState.warRoomSchedule.nextCheck = nextDate;
        AppState.warRoomSchedule.currentCheckDue = nextDate;

        // Clear completed check tracking for new day
        AppState.warRoomSchedule.lastCompletedCheck = null;

        const msUntilNext = nextDate.getTime() - now.getTime();

        const timeout = setTimeout(() => {
          initializeWarRoomSchedule();
        }, msUntilNext);
        AppState.warRoomSchedule.reminderTimeouts.push(timeout);

        const dayName = Object.keys(dayMap).find(
          (key) => dayMap[key] === nextDay,
        );
        console.log(
          `📋 Next War Room day: ${dayName} (${daysUntilNext} days from now)`,
        );

        // Update display to show next check date
        updateWarRoomStatusDisplay();
      }

      function stopWarRoomSchedule() {
        // Clear all reminder timeouts
        AppState.warRoomSchedule.reminderTimeouts.forEach((timeout) =>
          clearTimeout(timeout),
        );
        AppState.warRoomSchedule.reminderTimeouts = [];

        // Clear display update interval
        if (AppState.warRoomSchedule.displayUpdateInterval) {
          clearInterval(AppState.warRoomSchedule.displayUpdateInterval);
          AppState.warRoomSchedule.displayUpdateInterval = null;
        }

        // Clear next check
        AppState.warRoomSchedule.nextCheck = null;

        // Dismiss any notifications
        dismissWarRoomNotification();

        const statusDiv = document.getElementById("warRoomStatus");
        if (statusDiv) statusDiv.style.display = "none";
      }

      function updateWarRoomStatusDisplay() {
        const statusDiv = document.getElementById("warRoomStatus");
        const nextCheckSpan = document.getElementById("warRoomNextCheck");

        // Clear any existing display update interval
        if (AppState.warRoomSchedule.displayUpdateInterval) {
          clearInterval(AppState.warRoomSchedule.displayUpdateInterval);
          AppState.warRoomSchedule.displayUpdateInterval = null;
        }

        if (
          !AppState.warRoomSchedule.enabled ||
          !AppState.warRoomSchedule.nextCheck
        ) {
          if (statusDiv) statusDiv.style.display = "none";
          return;
        }

        if (statusDiv) statusDiv.style.display = "inline-flex";

        const updateDisplay = () => {
          const now = new Date();
          const next = AppState.warRoomSchedule.nextCheck;

          if (!next) {
            nextCheckSpan.textContent = "No check scheduled";
            return;
          }

          const diff = next - now;

          if (diff <= 0) {
            nextCheckSpan.textContent = "Check due now!";
            return;
          }

          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

          // If next check is more than 12 hours away, it's likely tomorrow or another day
          if (hours >= 12) {
            const nextDate = new Date(next);
            const today = new Date(now);
            const isToday = nextDate.toDateString() === today.toDateString();
            const isTomorrow =
              nextDate.toDateString() ===
              new Date(today.getTime() + 86400000).toDateString();

            const timeStr = nextDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            if (isToday) {
              nextCheckSpan.textContent = `Next: Today ${timeStr}`;
            } else if (isTomorrow) {
              nextCheckSpan.textContent = `Next: Tomorrow ${timeStr}`;
            } else {
              const dayStr = nextDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              nextCheckSpan.textContent = `Next: ${dayStr} ${timeStr}`;
            }
          } else if (hours > 0) {
            nextCheckSpan.textContent = `Next: ${hours}h ${minutes}m`;
          } else if (minutes > 20) {
            nextCheckSpan.textContent = `Next: ${minutes}m`;
          } else {
            nextCheckSpan.textContent = `Due in ${minutes}m`;
          }
        };

        updateDisplay();
        AppState.warRoomSchedule.displayUpdateInterval = setInterval(
          updateDisplay,
          60000,
        );
      }

      function loadWarRoomSchedule() {
        const saved = localStorage.getItem("warRoomSchedule");
        if (saved) {
          try {
            const schedule = JSON.parse(saved);
            AppState.warRoomSchedule = {
              ...AppState.warRoomSchedule,
              ...schedule,
            };

            // Update UI
            const shiftSelect = document.getElementById("warRoomShift");
            const roleSelect = document.getElementById("warRoomRole");
            if (shiftSelect) shiftSelect.value = schedule.shift || "";
            if (roleSelect) roleSelect.value = schedule.role || "primary";

            // Update day checkboxes
            document.querySelectorAll(".warRoomDay").forEach((cb) => {
              cb.checked = schedule.days?.includes(cb.value);
            });

            // Show/hide config
            const config = document.getElementById("war-room-schedule-config");
            if (config && schedule.enabled) {
              config.style.display = "block";
            }

            // Initialize if enabled and configured
            if (
              schedule.enabled &&
              schedule.shift &&
              schedule.days?.length > 0
            ) {
              initializeWarRoomSchedule();
              console.log("📋 War Room schedule loaded and initialized");

              // Update preview
              saveWarRoomSchedule();
            }
          } catch (e) {
            console.error("Failed to load War Room schedule:", e);
          }
        }

        // Load persistent work orders
        const savedWorkOrders = localStorage.getItem("persistentWorkOrders");
        if (savedWorkOrders) {
          try {
            AppState.persistentWorkOrders = JSON.parse(savedWorkOrders);
            console.log(
              `📝 Loaded ${AppState.persistentWorkOrders.length} persistent work orders`,
            );
          } catch (e) {
            console.error("Failed to load persistent work orders:", e);
            AppState.persistentWorkOrders = [];
          }
        }
      }

      // ============= Database Management Functions =============

      // Toggle Database storage on/off
      async function toggleDatabaseStorage() {
        try {
          // Validate that Database objects are properly defined
          if (typeof SQLITE_STORAGE === "undefined") {
            showNotification(
              "❌ Database storage system not properly loaded",
              "error",
              5000,
            );
            return;
          }

          const currentlyEnabled =
            localStorage.getItem("databaseEnabled") === "true";
          const newState = !currentlyEnabled;

          console.log(
            "Toggling Database storage from",
            currentlyEnabled,
            "to",
            newState,
          );

          if (newState) {
            // Enabling Database
            if (!SQLITE_STORAGE.checkSupport()) {
              showNotification(
                "❌ Database storage not supported in this browser",
                "error",
                5000,
              );
              return;
            }

            console.log("Enabling Database storage...");
            localStorage.setItem("databaseEnabled", "true");

            const success = await SQLITE_STORAGE.init();
            if (!success) {
              localStorage.setItem("databaseEnabled", "false");
              showNotification(
                "❌ Failed to initialize database storage",
                "error",
                5000,
              );
              return;
            }

            // Sync existing localStorage data to IndexedDB
            await SQLITE_STORAGE.syncFromLocalStorage();

            showNotification(
              "💾 Database storage enabled successfully",
              "success",
              3000,
            );
          } else {
            // Disabling Database
            console.log("Disabling Database storage...");
            SQLITE_STORAGE.isEnabled = false;
            localStorage.setItem("databaseEnabled", "false");
            showNotification("💾 Database storage disabled", "success", 3000);
          }

          updateDatabaseUI();
          updateSettingsToggles();
        } catch (error) {
          console.error("Failed to toggle Database storage:", error);
          showNotification(
            "❌ Error toggling Database storage: " + error.message,
            "error",
            5000,
          );
          // Reset to disabled state on error
          localStorage.setItem("databaseEnabled", "false");
          if (typeof SQLITE_STORAGE !== "undefined") {
            SQLITE_STORAGE.isEnabled = false;
          }
          updateDatabaseUI();
        }
      }

      // Create new Database
      // Export Database to JSON
      async function exportDatabaseToJSON() {
        try {
          if (!SQLITE_STORAGE.isEnabled) {
            showNotification("❌ Database storage not enabled", "error", 3000);
            return;
          }

          showNotification("📤 Exporting data...", "info", 2000);

          // Get all data from IndexedDB
          const notes = await SQLITE_STORAGE.loadNotes();
          const stats = await SQLITE_STORAGE.getStatistics();

          // Get settings from IndexedDB
          let settings = {};
          try {
            if (SQLITE_STORAGE.db) {
              const settingsData = await new Promise((resolve) => {
                const transaction = SQLITE_STORAGE.db.transaction(
                  ["settings"],
                  "readonly",
                );
                const store = transaction.objectStore("settings");
                const request = store.getAll();

                request.onsuccess = () => {
                  const settingsArray = request.result || [];
                  const settingsObj = {};
                  settingsArray.forEach((setting) => {
                    settingsObj[setting.key] = setting.value;
                  });
                  resolve(settingsObj);
                };

                request.onerror = () => resolve({});
              });
              settings = settingsData;
            }
          } catch (error) {
            console.warn("Could not export settings:", error);
          }

          // Create export object
          const exportData = {
            exportDate: new Date().toISOString(),
            appVersion: "1.0.0",
            dataType: "IndexedDB Export",
            statistics: stats,
            notes: notes,
            settings: settings,
            totalNotes: notes.length,
            totalSettings: Object.keys(settings).length,
          };

          // Create and download JSON file
          const dataStr = JSON.stringify(exportData, null, 2);
          const dataBlob = new Blob([dataStr], { type: "application/json" });

          const link = document.createElement("a");
          link.href = URL.createObjectURL(dataBlob);
          link.download = `frostbyte-data-export-${new Date().toISOString().slice(0, 10)}.json`;
          link.click();

          showNotification("✅ Data exported successfully", "success", 3000);
        } catch (error) {
          console.error("Failed to export data:", error);
          showNotification("❌ Error exporting data", "error", 5000);
        }
      }

      // Import Database from JSON
      async function importDatabaseFromJSON() {
        try {
          if (!SQLITE_STORAGE.isEnabled) {
            showNotification("❌ Database storage not enabled", "error", 3000);
            return;
          }

          // Create file input element
          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = ".json,application/json";
          fileInput.style.display = "none";

          fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
              showNotification("📥 Importing data...", "info", 2000);

              // Read file content
              const fileContent = await file.text();
              const importData = JSON.parse(fileContent);

              // Validate JSON structure
              if (!validateImportData(importData)) {
                showNotification("❌ Invalid JSON file format", "error", 5000);
                return;
              }

              // Confirm import action
              const confirmImport = confirm(
                `Import ${importData.totalNotes || 0} notes and ${importData.totalSettings || 0} settings from ${importData.exportDate ? new Date(importData.exportDate).toLocaleDateString() : "Unknown Date"}?\n\n` +
                  "This will merge with existing data. Existing notes with the same ID will be overwritten.\n\n" +
                  "Continue with import?",
              );

              if (!confirmImport) {
                showNotification("❌ Import cancelled", "info", 3000);
                return;
              }

              // Import notes to IndexedDB
              let importedNotes = 0;
              if (importData.notes && Array.isArray(importData.notes)) {
                for (const note of importData.notes) {
                  const success = await SQLITE_STORAGE.saveNote(note);
                  if (success) importedNotes++;
                }
              }

              // Import settings to IndexedDB
              let importedSettings = 0;
              if (
                importData.settings &&
                typeof importData.settings === "object"
              ) {
                for (const [key, value] of Object.entries(
                  importData.settings,
                )) {
                  const success = await SQLITE_STORAGE.saveSetting(key, value);
                  if (success) importedSettings++;
                }
              }

              showNotification(
                `✅ Successfully imported ${importedNotes} notes and ${importedSettings} settings`,
                "success",
                5000,
              );

              // Log import event
              await SQLITE_STORAGE.logAnalytics("data_import", {
                importDate: new Date().toISOString(),
                notesImported: importedNotes,
                settingsImported: importedSettings,
                sourceFile: file.name,
                sourceExportDate: importData.exportDate,
              });
            } catch (error) {
              console.error("Failed to import data:", error);
              showNotification(
                "❌ Error importing data: " + error.message,
                "error",
                5000,
              );
            }
          };

          // Trigger file picker
          document.body.appendChild(fileInput);
          fileInput.click();
          document.body.removeChild(fileInput);
        } catch (error) {
          console.error("Failed to start import:", error);
          showNotification("❌ Error starting import", "error", 5000);
        }
      }

      // Validate import data structure
      function validateImportData(data) {
        try {
          // Check if it's an object
          if (!data || typeof data !== "object") return false;

          // Check for required fields
          if (!data.dataType || !data.exportDate) return false;

          // Check if it's from our app
          if (data.dataType !== "IndexedDB Export") return false;

          // Check notes array
          if (data.notes && !Array.isArray(data.notes)) return false;

          // Check settings object
          if (data.settings && typeof data.settings !== "object") return false;

          // Validate note structure if notes exist
          if (data.notes && data.notes.length > 0) {
            for (const note of data.notes) {
              if (!note.id || typeof note.id !== "string") return false;
              // Other basic validation can be added here
            }
          }

          return true;
        } catch (error) {
          console.error("Error validating import data:", error);
          return false;
        }
      }

      // Show Database statistics
      async function showDatabaseStats() {
        try {
          if (!SQLITE_STORAGE.isEnabled) {
            showNotification("❌ Database storage not enabled", "error", 3000);
            return;
          }

          const stats = await SQLITE_STORAGE.getStatistics();
          if (stats) {
            const statsMessage = `📈 Database Statistics:
                    
Notes: ${stats.totalNotes}
Settings: ${stats.totalSettings}
Last Updated: ${new Date(stats.lastUpdated).toLocaleString()}`;

            alert(statsMessage);
          } else {
            showNotification("❌ Failed to get database stats", "error", 5000);
          }
        } catch (error) {
          console.error("Failed to get Database stats:", error);
          showNotification("❌ Error getting database stats", "error", 5000);
        }
      }

      // Update Database UI elements
      function updateDatabaseUI() {
        const databaseToggle = document.getElementById("database-toggle");
        const databaseControls = document.getElementById("database-controls");
        const databaseStatusDot = document.getElementById(
          "database-status-dot",
        );
        const databaseStatusText = document.getElementById(
          "database-status-text",
        );

        const isEnabled = localStorage.getItem("databaseEnabled") === "true";
        const isSupported = SQLITE_STORAGE.checkSupport();

        // Update toggle state
        if (databaseToggle) {
          if (isEnabled && isSupported) {
            databaseToggle.classList.add("active");
          } else {
            databaseToggle.classList.remove("active");
          }
        }

        // Show/hide controls
        if (databaseControls) {
          databaseControls.style.display = isEnabled ? "block" : "none";
        }

        // Update status indicator
        if (databaseStatusDot && databaseStatusText) {
          if (!isSupported) {
            databaseStatusDot.style.backgroundColor = "#ff6b6b";
            databaseStatusText.textContent = "Database: Not Supported";
          } else if (isEnabled && SQLITE_STORAGE.isEnabled) {
            databaseStatusDot.style.backgroundColor = "#51cf66";
            databaseStatusText.textContent = "Database: Active";
          } else if (isEnabled) {
            databaseStatusDot.style.backgroundColor = "#ffd43b";
            databaseStatusText.textContent = "Database: Initializing...";
          } else {
            databaseStatusDot.style.backgroundColor = "#868e96";
            databaseStatusText.textContent = "Database: Disabled";
          }
        }
      }

      // Initialize IndexedDB on app startup
      async function initializeDatabaseOnStartup() {
        try {
          // Check if SQLite objects are properly defined
          if (typeof SQLITE_STORAGE === "undefined") {
            console.warn(
              "Database storage not defined, skipping initialization",
            );
            return;
          }

          const enabled = localStorage.getItem("databaseEnabled") === "true";
          console.log(
            "Database startup check - enabled:",
            enabled,
            "supported:",
            SQLITE_STORAGE.checkSupport(),
          );

          if (enabled && SQLITE_STORAGE.checkSupport()) {
            console.log("Initializing database storage...");
            const success = await SQLITE_STORAGE.init();
            if (success) {
              console.log("Database initialized successfully on startup");

              // Check if we need to perform initial sync
              const hasBackupData = localStorage.getItem("databaseBackupData");
              const hasNotesHistory = localStorage.getItem("notesHistory");

              if (!hasBackupData && hasNotesHistory) {
                console.log(
                  "No database backup data found but localStorage has notes - performing initial sync...",
                );
                const syncSuccess = await SQLITE_STORAGE.syncFromLocalStorage();
                if (syncSuccess) {
                  console.log(
                    "Initial sync to Database completed successfully",
                  );
                } else {
                  console.log("Initial sync to Database failed");
                }
              }
            } else {
              console.log(
                "Database initialization returned false (likely disabled in settings)",
              );
            }
          } else {
            console.log(
              "Database not enabled or not supported, skipping initialization",
            );
          }

          // Always update UI regardless of initialization result
          if (typeof updateDatabaseUI === "function") {
            updateDatabaseUI();
          }
        } catch (error) {
          console.error("Failed to initialize Database on startup:", error);
          // Ensure UI is updated even on error
          if (typeof updateDatabaseUI === "function") {
            updateDatabaseUI();
          }
        }
      }

      // VCC Integration Methods
      function initializeVCCIntegration() {
        console.log(
          "VCC Integration: Browser audio capture requires Google sign-in",
        );
        console.log("Using manual VCC controls only");

        // Add VCC call control button
        addVCCManualButton();

        // Add helpful keyboard shortcuts reminder
        setTimeout(() => {
          showNotification(
            "💡 VCC Tips: Use VCC button or Spacebar for manual control",
            "success",
            4000,
          );
        }, 2000);

        console.log("VCC manual integration ready");
      }

      function initializeVCCWindowDetection() {
        let windowFocusLost = null;
        let windowBlurCount = 0;

        // Monitor rapid window focus changes (VCC often steals focus)
        window.addEventListener("blur", function () {
          windowFocusLost = Date.now();
          windowBlurCount++;
          console.log("Window blur detected, count:", windowBlurCount);

          // If multiple rapid blurs, might be VCC activity
          setTimeout(() => {
            if (windowBlurCount >= 2) {
              showNotification(
                "🔄 Multiple window changes - VCC activity detected?",
                "success",
                3000,
              );
              windowBlurCount = 0;
            }
          }, 3000);
        });

        window.addEventListener("focus", function () {
          if (windowFocusLost) {
            const focusTime = Date.now() - windowFocusLost;
            console.log("Window focus returned after:", focusTime, "ms");

            // If focus was lost for a typical call duration (5+ seconds)
            if (focusTime > 5000 && focusTime < 30000) {
              showNotification(
                "� Focus returned - Was that a VCC call?",
                "success",
                3000,
              );
            }
            windowFocusLost = null;
          }
        });

        // Monitor for page visibility changes (VCC switching tabs)
        document.addEventListener("visibilitychange", function () {
          if (document.hidden) {
            console.log("Page hidden - VCC might be active");
          } else {
            console.log("Page visible - Back from VCC?");
            showNotification(
              "👀 Page visible - Back from VCC call?",
              "success",
              2000,
            );
          }
        });
      }

      function addVCCManualButton() {
        // Add VCC call control button to timer controls
        const timerControls = document.querySelector(".timer-controls");
        if (timerControls && !document.getElementById("vcc-manual-btn")) {
          const vccButton = document.createElement("button");
          vccButton.id = "vcc-manual-btn";
          vccButton.className = "timer-btn bg-[#666] text-white mx-1 py-[4px] px-[8px] rounded-[4px] text-[12px]";
          vccButton.onclick = toggleVCCMode;
          vccButton.title = "Start VCC Call";
          vccButton.textContent = "VCC";
          timerControls.appendChild(vccButton);
        }
      }

      function toggleVCCMode() {
        if (!AppState.timerRunning) {
          // Start VCC call mode
          startTimer();
          AppState.callDetected = true;
          const btn = document.getElementById("vcc-manual-btn");
          if (btn) {
            btn.textContent = "END";
            btn.style.background = "rgba(220, 53, 69, 0.3)";
            btn.title = "End VCC Call";
          }
          showNotification("📞 VCC Call Started", "success", 2000);
        } else {
          // End VCC call mode
          resetCallDetection();
          const btn = document.getElementById("vcc-manual-btn");
          if (btn) {
            btn.textContent = "VCC";
            btn.style.background = "";
            btn.title = "Start VCC Call";
          }
          showNotification("📞 VCC Call Ended", "success", 2000);
        }
      }

      function monitorVCCAudio() {
        console.log("Starting VCC audio monitoring...");

        const bufferLength = AppState.micAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let callBeepDetected = false;
        let consecutiveHighAudio = 0;
        let lastAudioLevel = 0;
        let logCount = 0;

        function detectVCCCall() {
          if (!AppState.micAnalyser) {
            console.log("No mic analyser available");
            return;
          }

          AppState.micAnalyser.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

          // Debug: Log audio levels more frequently initially, then every 5 seconds
          logCount++;
          if (logCount <= 20 || logCount % 50 === 0) {
            console.log(
              `Audio level: ${Math.round(average)}, Threshold: 60, High threshold: 30, Buffer length: ${bufferLength}`,
            );
          }

          // Also log when there are significant changes
          if (Math.abs(average - lastAudioLevel) > 10) {
            console.log(
              `Audio level changed: ${Math.round(lastAudioLevel)} → ${Math.round(average)}`,
            );
            lastAudioLevel = average;
          }

          // VCC high audio detection (original threshold)
          if (average > 60) {
            consecutiveHighAudio++;
            console.log(
              `HIGH audio detected: ${Math.round(average)}, consecutive: ${consecutiveHighAudio}`,
            );

            if (consecutiveHighAudio >= 3 && !AppState.timerRunning) {
              console.log("🎯 VCC CALL DETECTED - Starting timer!");
              showNotification(
                "📞 VCC audio spike detected - Starting timer!",
                "success",
                3000,
              );
              startTimer();
              callBeepDetected = true;
            }
          } else if (average > 30) {
            // Medium audio detection (lower threshold)
            if (consecutiveHighAudio > 0 || average > 40) {
              console.log(`MEDIUM audio detected: ${Math.round(average)}`);
              showNotification(
                "🎵 Audio activity - Possible VCC call",
                "success",
                2000,
              );
            }
            consecutiveHighAudio = Math.max(0, consecutiveHighAudio - 1);
          } else if (average > 15) {
            // Low audio detection (any activity)
            if (logCount <= 20 || logCount % 100 === 0) {
              console.log(`Low audio activity: ${Math.round(average)}`);
            }
            consecutiveHighAudio = 0;
          } else {
            consecutiveHighAudio = 0;
          }

          requestAnimationFrame(detectVCCCall);
        }

        detectVCCCall();
        console.log("VCC audio monitoring started successfully");
      }

      // Tab System Functions
      function switchTab(tabName) {
        // Hide all tab contents
        const tabContents = document.querySelectorAll(".tab-content");
        tabContents.forEach((content) => {
          content.classList.remove("active");
        });

        // Remove active class from all tab buttons
        const tabButtons = document.querySelectorAll(".tab-btn");
        tabButtons.forEach((button) => {
          button.classList.remove("active");
        });

        // Show selected tab content
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
          selectedTab.classList.add("active");
        }

        // Add active class to clicked button
        if (event && event.target) {
          event.target.classList.add("active");
        } else {
          // Fallback: find button by tab name
          const targetButton = document.querySelector(
            `button[onclick="switchTab('${tabName}')"]`,
          );
          if (targetButton) {
            targetButton.classList.add("active");
          }
        }

        // Special handling for war room tab
        if (
          tabName === "war-room" &&
          typeof WAR_ROOM_SYSTEM !== "undefined" &&
          !WAR_ROOM_SYSTEM.state.isEnabled
        ) {
          showNotification(
            "🎯 War Room is disabled. Enable it in settings first.",
            "info",
            3000,
          );
          setTimeout(() => switchTab("quick-notes"), 100);
          return;
        }
      }

      // QA Checklist Functions
      function toggleChecklistItem(item) {
        const checkbox = item.querySelector(".checklist-checkbox");

        // Toggle checkbox state
        checkbox.checked = !checkbox.checked;

        // Toggle visual state
        if (checkbox.checked) {
          item.classList.add("completed");
        } else {
          item.classList.remove("completed");
        }

        // Save checklist state to localStorage
        saveChecklistState();
      }

      function saveChecklistState() {
        const checklistItems = document.querySelectorAll(".checklist-item");
        const states = [];

        checklistItems.forEach((item, index) => {
          const checkbox = item.querySelector(".checklist-checkbox");
          states.push(checkbox.checked);
        });

        localStorage.setItem("qaChecklistState", JSON.stringify(states));
      }

      function loadChecklistState() {
        const savedStates = localStorage.getItem("qaChecklistState");
        if (savedStates) {
          const states = JSON.parse(savedStates);
          const checklistItems = document.querySelectorAll(".checklist-item");

          checklistItems.forEach((item, index) => {
            if (index < states.length) {
              const checkbox = item.querySelector(".checklist-checkbox");
              checkbox.checked = states[index];

              if (states[index]) {
                item.classList.add("completed");
              } else {
                item.classList.remove("completed");
              }
            }
          });
        }
      }

      function resetChecklist() {
        const checklistItems = document.querySelectorAll(".checklist-item");
        checklistItems.forEach((item) => {
          const checkbox = item.querySelector(".checklist-checkbox");
          checkbox.checked = false;
          item.classList.remove("completed");
        });

        localStorage.removeItem("qaChecklistState");
      }

      // Agent name customization functions
      function toggleNameSetting() {
        const nameSetting = document.getElementById("name-setting");
        if (nameSetting) {
          nameSetting.classList.toggle("expanded");

          // Focus the input when expanding
          if (nameSetting.classList.contains("expanded")) {
            setTimeout(() => {
              const nameInput = document.getElementById("agent-name");
              if (nameInput) {
                nameInput.focus();
              }
            }, 300);
          }
        }
      }

      function autoCollapseNameSetting() {
        // Auto-collapse after a short delay when focus is lost
        setTimeout(() => {
          const nameSetting = document.getElementById("name-setting");
          if (nameSetting && nameSetting.classList.contains("expanded")) {
            nameSetting.classList.remove("expanded");
          }
        }, 200);
      }

      function updateAgentName() {
        const nameInput = document.getElementById("agent-name");
        const nameDisplay = document.getElementById("agent-name-display");

        if (nameInput && nameDisplay) {
          const name = nameInput.value.trim();
          if (name) {
            nameDisplay.textContent = name;
            localStorage.setItem("agentName", name);
          } else {
            nameDisplay.textContent = "[NAME]";
            localStorage.removeItem("agentName");
          }
        }
      }

      function loadAgentName() {
        const savedName = localStorage.getItem("agentName");
        const nameInput = document.getElementById("agent-name");
        const nameDisplay = document.getElementById("agent-name-display");

        if (savedName && nameInput && nameDisplay) {
          nameInput.value = savedName;
          nameDisplay.textContent = savedName;
        }
      }

      // War Room System
      const WAR_ROOM_SYSTEM = {
        state: {
          isEnabled: false,
          assignedStores: [],
          currentStoreIndex: 0,
          storeResults: [],
          currentTemplate: null,
          sessionStartTime: null,
          sessionId: null,
          currentStoreWorkOrders: [], // Store-specific work orders for current store
        },

        templates: {
          presets: {
            detailed_format: {
              name: "Detailed Format",
              siteHeader: "*Site {STORE}",
              systemFormat: "Verified in {SYSTEM}:",
              rackFormat: "detailed",
              includeWorkOrders: true,
              includeSummary: true,
              customTemplate: `*Site {STORE}
Verified in {SYSTEM}:
{RACKS}

Open WorkOrders:

Site {STORE}:
{WORK_ORDERS}`,
            },

            condensed_format: {
              name: "Condensed Format",
              siteHeader: "Site {STORE}",
              systemFormat: "Verified in {SYSTEM}:",
              rackFormat: "condensed",
              includeWorkOrders: false,
              includeSummary: true,
              customTemplate: `Site {STORE}
Verified in {SYSTEM}:
{RACKS}`,
            },

            simple_format: {
              name: "Simple Format",
              siteHeader: "Site {STORE}",
              systemFormat: "verified in {SYSTEM}",
              rackFormat: "simple",
              includeWorkOrders: false,
              includeSummary: true,
              customTemplate: `Site {STORE}
verified in {SYSTEM}
{RACKS}`,
            },
          },
        },

        systemRacks: {
          Novar: [],
          "Opus Arch": [],
          "Opus Mag": [],
          CPC: ["CKTS"],
          AKA65: ["HVAC"],
          Danfoss: ["LTA", "LTB", "MTC", "MTD"],
          "Carel Boss": ["LTA", "LTB", "MTC", "MTD", "RCU"],
          Other: [],
        },

        // Predefined War Room sites with their systems
        warRoomSites: {
          4: "Carel Boss",
          1407: "Danfoss",
          5152: "CPC",
        },

        getSystemForSite(site) {
          return this.warRoomSites[site] || null;
        },

        generateSessionId() {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2);
          const userHash = localStorage.getItem("agentName") || "user";
          return `WR_${userHash.substring(0, 3)}_${timestamp}_${random}`;
        },

        generateVerificationCode() {
          const factors = [
            localStorage.getItem("agentName") || "unknown",
            this.state.sessionStartTime || Date.now(),
            this.state.sessionId || "no-session",
            this.state.storeResults.length.toString(),
            navigator.userAgent.slice(-10),
          ];
          return btoa(factors.join("")).slice(0, 12);
        },

        generateRackStatus(racks, format) {
          switch (format) {
            case "detailed":
              return racks
                .map((rack) => {
                  let line = `  ${rack.name}: ${rack.status}`;
                  if (rack.details && rack.details.trim()) {
                    line += ` - ${rack.details}`;
                  }
                  return line;
                })
                .join("\\n");

            case "condensed":
              const noAlarmRacks = racks.filter(
                (r) => r.status === "No Alarms",
              );
              const alarmRacks = racks.filter((r) => r.status !== "No Alarms");

              let result = "";
              if (noAlarmRacks.length > 0) {
                result += `${noAlarmRacks.map((r) => r.name).join("/")}-No Alarms on monitored assets\\n`;
              }
              if (alarmRacks.length > 0) {
                result += alarmRacks
                  .map((r) => {
                    let line = `${r.name} in alarm (${r.status})`;
                    if (r.details && r.details.trim()) {
                      line += ` - ${r.details}`;
                    }
                    return line;
                  })
                  .join("\\n");
              }
              return result;

            case "simple":
              const hasAlarms = racks.some((r) => r.status !== "No Alarms");
              if (hasAlarms) {
                const alarmDetails = racks
                  .filter((r) => r.status !== "No Alarms")
                  .map((r) => {
                    let line = `${r.name}: ${r.status}`;
                    if (r.details && r.details.trim()) {
                      line += ` - ${r.details}`;
                    }
                    return line;
                  })
                  .join(", ");
                return alarmDetails;
              }
              return "No Alarms Found";

            default:
              return racks
                .map((rack) => {
                  let line = `${rack.name}: ${rack.status}`;
                  if (rack.details && rack.details.trim()) {
                    line += ` - ${rack.details}`;
                  }
                  return line;
                })
                .join("\\n");
          }
        },

        applyTemplate(storeData, template) {
          let result = template.customTemplate;

          result = result.replace(/{STORE}/g, storeData.store);
          result = result.replace(/{SYSTEM}/g, storeData.system);
          result = result.replace(
            /{RACKS}/g,
            this.generateRackStatus(storeData.racks, template.rackFormat),
          );
          result = result.replace(
            /{WORK_ORDERS}/g,
            storeData.workOrders.length > 0
              ? storeData.workOrders.map((wo) => `  - ${wo}`).join("\\n")
              : "  - None",
          );

          return result;
        },
      };

      // War Room Functions
      function toggleWarRoom() {
        if (typeof WAR_ROOM_SYSTEM === "undefined") {
          console.error("WAR_ROOM_SYSTEM not yet initialized");
          return;
        }

        WAR_ROOM_SYSTEM.state.isEnabled = !WAR_ROOM_SYSTEM.state.isEnabled;
        localStorage.setItem(
          "warRoomEnabled",
          WAR_ROOM_SYSTEM.state.isEnabled.toString(),
        );

        const warRoomTab = document.getElementById("war-room-tab");
        if (WAR_ROOM_SYSTEM.state.isEnabled) {
          warRoomTab.style.display = "block";
          showNotification("🎯 War Room check enabled", "success", 3000);
        } else {
          warRoomTab.style.display = "none";
          showNotification("🎯 War Room check disabled", "info", 3000);
        }

        updateSettingsToggles();
      }

      function initializeWarRoom() {
        const savedState = localStorage.getItem("warRoomEnabled");
        if (savedState === "true") {
          WAR_ROOM_SYSTEM.state.isEnabled = true;
          document.getElementById("war-room-tab").style.display = "block";
        }

        // Pre-populate assigned stores with standard War Room sites or saved data
        const assignedStoresField = document.getElementById("assigned-stores");
        if (assignedStoresField) {
          const savedAssignedStores = localStorage.getItem(
            "warRoomAssignedStores",
          );
          if (savedAssignedStores) {
            assignedStoresField.value = savedAssignedStores;
          } else if (!assignedStoresField.value.trim()) {
            assignedStoresField.placeholder =
              "Standard War Room Sites:\n4\n1407\n5152\n\n(Edit as needed for your assignment)";
            assignedStoresField.value = "4\n1407\n5152";
          }

          // Add event listener to save assigned stores on change
          assignedStoresField.addEventListener("input", function () {
            localStorage.setItem("warRoomAssignedStores", this.value);
          });
        }

        // Load saved template
        const savedTemplate = localStorage.getItem("warRoomTemplate");
        if (savedTemplate) {
          try {
            WAR_ROOM_SYSTEM.state.currentTemplate = JSON.parse(savedTemplate);
          } catch (e) {
            WAR_ROOM_SYSTEM.state.currentTemplate =
              WAR_ROOM_SYSTEM.templates.presets.detailed_format;
          }
        } else {
          WAR_ROOM_SYSTEM.state.currentTemplate =
            WAR_ROOM_SYSTEM.templates.presets.detailed_format;
        }
      }

      function showTemplateConfig() {
        document.getElementById("template-config").style.display = "block";
        document.getElementById("war-room-main").style.display = "none";

        // Load current template into form
        const template =
          WAR_ROOM_SYSTEM.state.currentTemplate ||
          WAR_ROOM_SYSTEM.templates.presets.detailed_format;
        document.getElementById("template-name").value = template.name || "";
        document.getElementById("site-header").value =
          template.siteHeader || "*Site {STORE}";
        document.getElementById("system-format").value =
          template.systemFormat || "Verified in {SYSTEM}:";
        document.getElementById("rack-format").value =
          template.rackFormat || "detailed";
        document.getElementById("include-wo-section").checked =
          template.includeWorkOrders !== false;
        document.getElementById("custom-template").value =
          template.customTemplate || "";

        updateTemplatePreview();
      }

      function hideTemplateConfig() {
        document.getElementById("template-config").style.display = "none";
        document.getElementById("war-room-main").style.display = "block";
      }

      function updateTemplatePreview() {
        const template = {
          siteHeader: document.getElementById("site-header").value,
          systemFormat: document.getElementById("system-format").value,
          rackFormat: document.getElementById("rack-format").value,
          includeWorkOrders:
            document.getElementById("include-wo-section").checked,
          includeSummary: document.getElementById("include-summary-section")
            .checked,
          customTemplate: document.getElementById("custom-template").value,
        };

        // Use actual War Room sites for preview
        const sampleData = {
          store: "4",
          system: "Carel Boss",
          racks: [
            { name: "LTA", status: "No Alarms" },
            { name: "LTB", status: "No Alarms" },
            { name: "MTC", status: "No Alarms" },
            { name: "MTD", status: "No Alarms" },
            { name: "RCU", status: "No Alarms" },
          ],
          workOrders: [],
        };

        const preview = WAR_ROOM_SYSTEM.applyTemplate(sampleData, template);
        document.getElementById("template-preview-text").textContent = preview;
      }

      function saveWarRoomTemplate() {
        const template = {
          name:
            document.getElementById("template-name").value || "Custom Template",
          siteHeader: document.getElementById("site-header").value,
          systemFormat: document.getElementById("system-format").value,
          rackFormat: document.getElementById("rack-format").value,
          includeWorkOrders:
            document.getElementById("include-wo-section").checked,
          includeSummary: document.getElementById("include-summary-section")
            .checked,
          customTemplate: document.getElementById("custom-template").value,
        };

        WAR_ROOM_SYSTEM.state.currentTemplate = template;
        localStorage.setItem("warRoomTemplate", JSON.stringify(template));

        showNotification("💾 War Room template saved", "success", 3000);
        hideTemplateConfig();
      }

      function loadPresetTemplate() {
        const presets = Object.keys(WAR_ROOM_SYSTEM.templates.presets);
        const selected = prompt(
          `Choose a preset template:\\n${presets.map((p, i) => `${i + 1}. ${WAR_ROOM_SYSTEM.templates.presets[p].name}`).join("\\n")}\\n\\nEnter number (1-${presets.length}):`,
        );

        if (selected && selected >= 1 && selected <= presets.length) {
          const presetKey = presets[selected - 1];
          const preset = WAR_ROOM_SYSTEM.templates.presets[presetKey];

          document.getElementById("template-name").value = preset.name;
          document.getElementById("site-header").value = preset.siteHeader;
          document.getElementById("system-format").value = preset.systemFormat;
          document.getElementById("rack-format").value = preset.rackFormat;
          document.getElementById("include-wo-section").checked =
            preset.includeWorkOrders;
          document.getElementById("include-summary-section").checked =
            preset.includeSummary !== false;
          document.getElementById("custom-template").value =
            preset.customTemplate;

          updateTemplatePreview();
          showNotification(`📋 Loaded preset: ${preset.name}`, "success", 3000);
        }
      }

      function resetWarRoomTemplate() {
        if (
          confirm(
            "Reset template to default? This will lose any custom changes.",
          )
        ) {
          const defaultTemplate =
            WAR_ROOM_SYSTEM.templates.presets.detailed_format;

          document.getElementById("template-name").value = defaultTemplate.name;
          document.getElementById("site-header").value =
            defaultTemplate.siteHeader;
          document.getElementById("system-format").value =
            defaultTemplate.systemFormat;
          document.getElementById("rack-format").value =
            defaultTemplate.rackFormat;
          document.getElementById("include-wo-section").checked =
            defaultTemplate.includeWorkOrders;
          document.getElementById("include-summary-section").checked =
            defaultTemplate.includeSummary !== false;
          document.getElementById("custom-template").value =
            defaultTemplate.customTemplate;

          updateTemplatePreview();
          showNotification("🔄 Template reset to default", "info", 3000);
        }
      }

      function startWarRoomCheck() {
        // Track war room check start
        const storesText = document
          .getElementById("assigned-stores")
          .value.trim();
        if (!storesText) {
          showNotification(
            "❌ Please enter store numbers first",
            "error",
            3000,
          );
          return;
        }

        // Parse store numbers
        WAR_ROOM_SYSTEM.state.assignedStores = storesText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && /^\d+$/.test(line));

        if (WAR_ROOM_SYSTEM.state.assignedStores.length === 0) {
          showNotification("❌ No valid store numbers found", "error", 3000);
          return;
        }

        // Determine which scheduled check this is for
        // Find the nearest upcoming check (including those that can be started early)
        if (
          AppState.warRoomSchedule.enabled &&
          AppState.warRoomSchedule.shift
        ) {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const shiftTimes = getShiftTimesInUserTimezone(
            AppState.warRoomSchedule.shift,
          );

          if (shiftTimes) {
            // Calculate all check times for today
            const checkTimes = [];
            for (
              let checkMinutes = shiftTimes.startMinutes;
              checkMinutes <= shiftTimes.endMinutes;
              checkMinutes += 120
            ) {
              checkTimes.push(checkMinutes);
            }

            // Find the check we're doing (the earliest one that hasn't passed its latest start time)
            for (const checkMinutes of checkTimes) {
              const earliestStartTime = checkMinutes - 20;
              const latestStartTime = checkMinutes + 20;

              // If we're within the window for this check (20 min early to 20 min late)
              if (
                currentMinutes >= earliestStartTime &&
                currentMinutes <= latestStartTime
              ) {
                const checkTime = new Date(now);
                checkTime.setHours(
                  Math.floor(checkMinutes / 60),
                  checkMinutes % 60,
                  0,
                  0,
                );
                AppState.warRoomSchedule.currentCheckDue = checkTime;
                console.log(
                  `📋 Starting War Room check for scheduled time: ${checkTime.toLocaleTimeString()}`,
                );
                break;
              }
            }
          }
        }

        // Initialize session
        WAR_ROOM_SYSTEM.state.currentStoreIndex = 0;
        WAR_ROOM_SYSTEM.state.storeResults = [];
        // Work orders are now persistent and store-specific - don't clear
        WAR_ROOM_SYSTEM.state.sessionStartTime = new Date();
        WAR_ROOM_SYSTEM.state.sessionId = WAR_ROOM_SYSTEM.generateSessionId();

        // Set 20-minute countdown timer for this check completion
        // Store completion deadline separately - don't overwrite the actual nextCheck time
        const completionDeadline = new Date();
        completionDeadline.setMinutes(completionDeadline.getMinutes() + 20);
        AppState.warRoomSchedule.completionDeadline = completionDeadline;

        // Dismiss any active War Room notification and stop flashing (after setting currentCheckDue)
        // Note: We don't call updateWarRoomStatusDisplay() here because we want to keep
        // showing the actual scheduled check time, not the completion deadline
        const statusDiv = document.getElementById("warRoomStatus");
        if (statusDiv) {
          statusDiv.classList.remove("flash-yellow", "flash-red");
        }

        // Show progress tracker and store checker
        document.getElementById("war-room-progress").style.display = "block";
        document.getElementById("store-checker").style.display = "block";
        document.getElementById("war-room-results").style.display = "none";

        updateProgress();
        loadCurrentStore();
        updateNavigationButtons();

        showNotification(
          `🚀 War Room check started: ${WAR_ROOM_SYSTEM.state.assignedStores.length} stores`,
          "success",
          3000,
        );
      }

      function updateProgress() {
        const current = WAR_ROOM_SYSTEM.state.currentStoreIndex;
        const total = WAR_ROOM_SYSTEM.state.assignedStores.length;
        const percentage = total > 0 ? (current / total) * 100 : 0;

        document.getElementById("progress-current").textContent = current;
        document.getElementById("progress-total").textContent = total;
        document.getElementById("progress-fill").style.width = percentage + "%";
      }

      function loadCurrentStore() {
        const currentStore =
          WAR_ROOM_SYSTEM.state.assignedStores[
            WAR_ROOM_SYSTEM.state.currentStoreIndex
          ];
        document.getElementById("current-store").textContent =
          currentStore || "----";

        // Check if we have previously saved data for this store (current session first, then localStorage)
        let savedStoreData = WAR_ROOM_SYSTEM.state.storeResults.find(
          (s) => s.store === currentStore,
        );
        let dataSource = "session";

        if (!savedStoreData) {
          // No data in current session, check localStorage
          const persistentData = loadRackDataFromLocalStorage(currentStore);
          if (persistentData) {
            savedStoreData = persistentData;
            dataSource = "localStorage";
          }
        }

        const systemSelect = document.getElementById("control-system");

        if (savedStoreData) {
          // Restore previously saved data
          systemSelect.value = savedStoreData.system;
          generateRackInterface(savedStoreData.system);

          const source =
            dataSource === "localStorage" ? " (from previous check)" : "";
          showNotification(
            `📋 Loaded saved data for Store ${currentStore}${source}`,
            "info",
            3000,
          );
        } else {
          // Auto-detect control system for known sites (first visit)
          const knownSystem = WAR_ROOM_SYSTEM.getSystemForSite(currentStore);

          if (knownSystem) {
            systemSelect.value = knownSystem;
            generateRackInterface(knownSystem);
            showNotification(
              `🎯 Auto-detected: ${currentStore} uses ${knownSystem}`,
              "info",
              3000,
            );
          } else {
            // Reset form for unknown sites
            systemSelect.value = "";
            document.getElementById("rack-list").innerHTML =
              "<p>Select a control system to see available racks/components</p>";
          }
        }

        // Render work orders for this store
        renderWorkOrders();
      }

      function generateRackInterface(system) {
        const racks = WAR_ROOM_SYSTEM.systemRacks[system] || [];
        const rackListElement = document.getElementById("rack-list");
        const currentStore =
          WAR_ROOM_SYSTEM.state.assignedStores[
            WAR_ROOM_SYSTEM.state.currentStoreIndex
          ];

        // Check for saved data: First check current session, then localStorage
        let savedStoreData = WAR_ROOM_SYSTEM.state.storeResults.find(
          (s) => s.store === currentStore,
        );

        if (!savedStoreData) {
          // No data in current session, check localStorage
          const persistentData = loadRackDataFromLocalStorage(currentStore);
          if (persistentData && persistentData.system === system) {
            savedStoreData = persistentData;
            console.log(
              "📂 Loaded data from localStorage for store:",
              currentStore,
            );
          }
        }

        // Determine which custom racks to use: saved data takes precedence over DOM
        let customRacksToUse = [];

        if (savedStoreData?.racks) {
          // Use custom racks from saved data
          customRacksToUse = savedStoreData.racks.filter(
            (r) => !racks.includes(r.name),
          );
          console.log(
            "🔧 Using saved custom racks:",
            customRacksToUse.map((r) => r.name),
          );
        } else {
          // No saved data, preserve what's currently in the DOM
          const existingRackItems =
            rackListElement.querySelectorAll(".rack-item");
          existingRackItems.forEach((item) => {
            const select = item.querySelector('select[name^="rack-"]');
            if (select) {
              const rackName = select.name.replace("rack-", "");
              // Check if this is a custom rack (not in predefined list)
              if (!racks.includes(rackName)) {
                const textarea = item.querySelector("textarea");
                customRacksToUse.push({
                  name: rackName,
                  status: select.value,
                  details: textarea ? textarea.value : "",
                });
              }
            }
          });
          console.log(
            "🔧 Preserving DOM custom racks:",
            customRacksToUse.map((r) => r.name),
          );
        }

        if (racks.length === 0 && customRacksToUse.length === 0) {
          rackListElement.innerHTML =
            '<p>No predefined racks for this system. Use "Add Custom Rack" button.</p>';
          return;
        }

        console.log("🔍 Generating rack interface for store:", currentStore);
        console.log("📦 Saved store data:", savedStoreData);

        // Generate predefined racks
        let rackHTML = racks
          .map((rack) => {
            // Find saved rack data if it exists
            const savedRack = savedStoreData?.racks?.find(
              (r) => r.name === rack,
            );
            const savedStatus = savedRack?.status || "No Alarms";
            const savedDetails = savedRack?.details || "";

            console.log(
              `  📍 Rack ${rack}: status="${savedStatus}", details="${savedDetails}"`,
            );

            return `
                <div class="rack-item">
                    <label>${rack}:</label>
                    <select name="rack-${rack}" onchange="toggleRackDetails('${rack}', this.value)">
                        <option value="No Alarms" ${savedStatus === "No Alarms" ? "selected" : ""}>No Alarms</option>
                        <option value="Alarm Found" ${savedStatus === "Alarm Found" ? "selected" : ""}>Alarm Found</option>
                        <option value="Not Monitored" ${savedStatus === "Not Monitored" ? "selected" : ""}>Not Monitored</option>
                        <option value="System Down" ${savedStatus === "System Down" ? "selected" : ""}>System Down</option>
                    </select>
                    <textarea placeholder="Describe alarm details here..." 
                              name="rack-${rack}-details" 
                              style="display: ${savedStatus === "Alarm Found" ? "block" : "none"};"
                              rows="5">${savedDetails}</textarea>
                </div>
            `;
          })
          .join("");

        // Add custom racks back
        customRacksToUse.forEach((customRack) => {
          rackHTML += `
                <div class="rack-item">
                    <label>${customRack.name}:</label>
                    <select name="rack-${customRack.name}" onchange="toggleRackDetails('${customRack.name}', this.value)">
                        <option value="No Alarms" ${customRack.status === "No Alarms" ? "selected" : ""}>No Alarms</option>
                        <option value="Alarm Found" ${customRack.status === "Alarm Found" ? "selected" : ""}>Alarm Found</option>
                        <option value="Not Monitored" ${customRack.status === "Not Monitored" ? "selected" : ""}>Not Monitored</option>
                        <option value="System Down" ${customRack.status === "System Down" ? "selected" : ""}>System Down</option>
                    </select>
                    <textarea placeholder="Describe alarm details here..." 
                              name="rack-${customRack.name}-details" 
                              style="display: ${customRack.status === "Alarm Found" ? "block" : "none"};"
                              rows="5">${customRack.details || ""}</textarea>
                    <button onclick="this.parentElement.remove()" class="danger-button" style="padding: 2px 6px; font-size: 12px;">✕</button>
                </div>
            `;
        });

        rackListElement.innerHTML =
          rackHTML || '<p>No racks defined. Use "Add Custom Rack" button.</p>';
      }

      function toggleRackDetails(rackName, status) {
        const detailsTextarea = document.querySelector(
          `textarea[name="rack-${rackName}-details"]`,
        );
        if (detailsTextarea) {
          detailsTextarea.style.display =
            status === "Alarm Found" ? "block" : "none";
          if (status !== "Alarm Found") {
            detailsTextarea.value = "";
          }
        }
      }

      function addCustomRack() {
        const rackName = prompt("Enter custom rack/component name:");
        if (!rackName) return;

        const rackList = document.getElementById("rack-list");
        const customRackHTML = `
                <div class="rack-item">
                    <label>${rackName}:</label>
                    <select name="rack-${rackName}" onchange="toggleRackDetails('${rackName}', this.value)">
                        <option value="No Alarms">No Alarms</option>
                        <option value="Alarm Found">Alarm Found</option>
                        <option value="Not Monitored">Not Monitored</option>
                        <option value="System Down">System Down</option>
                    </select>
                    <textarea placeholder="Describe alarm details here..." 
                              name="rack-${rackName}-details" 
                              style="display: none;"
                              rows="5"></textarea>
                    <button onclick="this.parentElement.remove()" class="danger-button" style="padding: 2px 6px; font-size: 12px;">✕</button>
                </div>
            `;

        if (
          rackList.innerHTML.includes("No predefined racks") ||
          rackList.innerHTML.includes("Select a control system")
        ) {
          rackList.innerHTML = customRackHTML;
        } else {
          rackList.innerHTML += customRackHTML;
        }
      }

      function addWorkOrder() {
        const workOrderNumber = prompt("Enter work order number:");
        if (!workOrderNumber) return;

        const description =
          prompt("Enter work order description (optional):") ||
          "Standard work order";

        const currentStore =
          WAR_ROOM_SYSTEM.state.assignedStores[
            WAR_ROOM_SYSTEM.state.currentStoreIndex
          ];

        // Add to both persistent storage and current store
        const workOrder = {
          number: workOrderNumber,
          description: description,
          addedDate: new Date().toISOString(),
          store: currentStore, // Track which store this work order belongs to
        };

        // Add to persistent storage
        AppState.persistentWorkOrders.push(workOrder);
        localStorage.setItem(
          "persistentWorkOrders",
          JSON.stringify(AppState.persistentWorkOrders),
        );

        // Also add to current store's temporary array for this check
        WAR_ROOM_SYSTEM.state.currentStoreWorkOrders.push(workOrder);

        // Update UI
        renderWorkOrders();
      }

      function renderWorkOrders() {
        const workOrderList = document.getElementById("work-order-list");
        const currentStore =
          WAR_ROOM_SYSTEM.state.assignedStores[
            WAR_ROOM_SYSTEM.state.currentStoreIndex
          ];

        // Filter persistent work orders for current store
        const storeWorkOrders = AppState.persistentWorkOrders.filter(
          (wo) => wo.store === currentStore,
        );

        if (storeWorkOrders.length === 0) {
          workOrderList.innerHTML =
            "<p>No work orders monitored for this store</p>";
          return;
        }

        workOrderList.innerHTML = storeWorkOrders
          .map(
            (wo, index) => `
                <div class="work-order-item" data-wo-number="${wo.number}">
                    <strong>${wo.number}</strong> - ${wo.description}
                    <button onclick="removeWorkOrder('${wo.number}', '${currentStore}')" class="danger-button" style="float: right; padding: 2px 6px; font-size: 12px;">✕</button>
                </div>
            `,
          )
          .join("");
      }

      function removeWorkOrder(woNumber, store) {
        // Remove from persistent storage
        const index = AppState.persistentWorkOrders.findIndex(
          (wo) => wo.number === woNumber && wo.store === store,
        );
        if (index !== -1) {
          AppState.persistentWorkOrders.splice(index, 1);
          localStorage.setItem(
            "persistentWorkOrders",
            JSON.stringify(AppState.persistentWorkOrders),
          );
        }

        // Remove from current store's temporary array
        const tempIndex =
          WAR_ROOM_SYSTEM.state.currentStoreWorkOrders.findIndex(
            (wo) => wo.number === woNumber,
          );
        if (tempIndex !== -1) {
          WAR_ROOM_SYSTEM.state.currentStoreWorkOrders.splice(tempIndex, 1);
        }

        renderWorkOrders();
      }

      function saveStoreData(autoSave = false) {
        const currentStore =
          WAR_ROOM_SYSTEM.state.assignedStores[
            WAR_ROOM_SYSTEM.state.currentStoreIndex
          ];
        const system = document.getElementById("control-system").value;

        if (!system) {
          if (!autoSave) {
            showNotification(
              "❌ Please select a control system",
              "error",
              3000,
            );
          }
          return;
        }

        // Collect rack data
        const racks = [];
        const rackSelects = document.querySelectorAll('select[name^="rack-"]');

        console.log("💾 Saving data for store:", currentStore);
        console.log("📊 Found rack selects:", rackSelects.length);

        rackSelects.forEach((select) => {
          const rackName = select.name.replace("rack-", "");
          const status = select.value;
          const detailsTextarea = document.querySelector(
            `textarea[name="rack-${rackName}-details"]`,
          );
          const details = detailsTextarea ? detailsTextarea.value.trim() : "";

          console.log(
            `  💾 Saving ${rackName}: status="${status}", details="${details}"`,
          );

          racks.push({
            name: rackName,
            status: status,
            details: details,
          });
        });

        // Get work orders for this store from persistent storage
        const storeWorkOrders = AppState.persistentWorkOrders.filter(
          (wo) => wo.store === currentStore,
        );
        const workOrders = storeWorkOrders.map(
          (wo) => `${wo.number} - ${wo.description}`,
        );

        // Store the data
        const storeData = {
          store: currentStore,
          system: system,
          racks: racks,
          workOrders: workOrders,
          timestamp: new Date().toISOString(),
          hasAlarms: racks.some((r) => r.status === "Alarm Found"),
        };

        console.log("📦 Complete store data:", storeData);

        // Remove old data for this store if it exists (allows editing)
        WAR_ROOM_SYSTEM.state.storeResults =
          WAR_ROOM_SYSTEM.state.storeResults.filter(
            (s) => s.store !== currentStore,
          );

        // Add the new/updated data
        WAR_ROOM_SYSTEM.state.storeResults.push(storeData);

        // PERSIST: Save rack data to localStorage for future War Room checks
        saveRackDataToLocalStorage(currentStore, system, racks);

        console.log(
          "✅ Updated storeResults:",
          WAR_ROOM_SYSTEM.state.storeResults,
        );

        if (!autoSave) {
          showNotification(
            `✅ Store ${currentStore} data saved`,
            "success",
            2000,
          );
        }
      }

      // Save rack data to localStorage for persistence across War Room sessions
      function saveRackDataToLocalStorage(store, system, racks) {
        try {
          // Get existing persistent rack data
          let persistentRackData = JSON.parse(
            localStorage.getItem("persistentRackData") || "{}",
          );

          // Update data for this store
          persistentRackData[store] = {
            system: system,
            racks: racks,
            lastUpdated: new Date().toISOString(),
          };

          // Save back to localStorage
          localStorage.setItem(
            "persistentRackData",
            JSON.stringify(persistentRackData),
          );
          console.log(
            `💾 Persisted rack data for store ${store} to localStorage`,
          );
        } catch (error) {
          console.error("❌ Failed to save rack data to localStorage:", error);
        }
      }

      // Load rack data from localStorage
      function loadRackDataFromLocalStorage(store) {
        try {
          const persistentRackData = JSON.parse(
            localStorage.getItem("persistentRackData") || "{}",
          );
          const storeData = persistentRackData[store];

          if (storeData) {
            console.log(
              `📂 Loaded persistent rack data for store ${store}:`,
              storeData,
            );
            return storeData;
          }

          return null;
        } catch (error) {
          console.error(
            "❌ Failed to load rack data from localStorage:",
            error,
          );
          return null;
        }
      }

      function saveAndContinue() {
        const currentStore =
          WAR_ROOM_SYSTEM.state.assignedStores[
            WAR_ROOM_SYSTEM.state.currentStoreIndex
          ];
        saveStoreData();
        showNotification(
          `✅ Store ${currentStore} data saved`,
          "success",
          2000,
        );
        nextStore();
      }

      function previousStore() {
        if (WAR_ROOM_SYSTEM.state.currentStoreIndex > 0) {
          // Auto-save current store data before navigating
          saveStoreData(true);

          WAR_ROOM_SYSTEM.state.currentStoreIndex--;
          updateProgress();
          loadCurrentStore();
          updateNavigationButtons();
        }
      }

      function nextStore() {
        // Auto-save current store data before navigating
        saveStoreData(true);

        WAR_ROOM_SYSTEM.state.currentStoreIndex++;

        if (
          WAR_ROOM_SYSTEM.state.currentStoreIndex >=
          WAR_ROOM_SYSTEM.state.assignedStores.length
        ) {
          // All stores completed
          completeWarRoomCheck();
        } else {
          // Work orders are now store-specific and loaded from persistent storage
          // No need to clear currentStoreWorkOrders

          updateProgress();
          loadCurrentStore();
          updateNavigationButtons();
        }
      }

      function updateNavigationButtons() {
        const prevBtn = document.getElementById("prev-store-btn");
        if (prevBtn) {
          // Show previous button if not on first store
          prevBtn.style.display =
            WAR_ROOM_SYSTEM.state.currentStoreIndex > 0
              ? "inline-block"
              : "none";
        }
      }

      function skipStore() {
        if (confirm("Skip this store? No data will be recorded.")) {
          nextStore();
        }
      }

      // Manage War Room persistent data
      function manageWarRoomData() {
        try {
          const persistentRackData = JSON.parse(
            localStorage.getItem("persistentRackData") || "{}",
          );
          const storeCount = Object.keys(persistentRackData).length;

          if (storeCount === 0) {
            alert(
              "📋 No saved rack data found.\n\nRack statuses and alarm details will be saved automatically when you complete War Room checks.",
            );
            return;
          }

          // Build summary message
          let message = `🗄️ War Room Saved Data\n\n`;
          message += `You have saved rack data for ${storeCount} store(s):\n\n`;

          Object.keys(persistentRackData)
            .sort((a, b) => a - b)
            .forEach((store) => {
              const data = persistentRackData[store];
              const alarmsFound = data.racks.filter(
                (r) => r.status === "Alarm Found",
              ).length;
              const lastUpdated = new Date(
                data.lastUpdated,
              ).toLocaleDateString();

              message += `Store ${store} (${data.system}):\n`;
              message += `  • Last updated: ${lastUpdated}\n`;
              message += `  • ${data.racks.length} racks tracked\n`;
              if (alarmsFound > 0) {
                message += `  • ⚠️ ${alarmsFound} alarm(s) saved\n`;
              }
              message += `\n`;
            });

          message += `\nWould you like to:\n`;
          message += `• OK - Keep this data\n`;
          message += `• Cancel - Clear all saved data`;

          if (confirm(message)) {
            showNotification("✅ Keeping saved War Room data", "success", 2000);
          } else {
            if (
              confirm(
                "⚠️ Are you sure you want to clear all saved rack data?\n\nThis cannot be undone!",
              )
            ) {
              localStorage.removeItem("persistentRackData");
              showNotification(
                "🗑️ All War Room rack data cleared",
                "info",
                3000,
              );
            }
          }
        } catch (error) {
          console.error("Error managing War Room data:", error);
          showNotification("❌ Error loading War Room data", "error", 3000);
        }
      }

      function completeWarRoomCheck() {
        // Track war room completion
        // Clear the completion deadline
        AppState.warRoomSchedule.completionDeadline = null;

        // Dismiss any active War Room notification and mark as completed
        dismissWarRoomNotification();

        // Hide progress and checker
        document.getElementById("war-room-progress").style.display = "none";
        document.getElementById("store-checker").style.display = "none";

        // Generate final report
        generateWarRoomTemplate();

        // Show results
        document.getElementById("war-room-results").style.display = "block";

        showNotification("🎉 War Room check completed!", "success", 5000);

        // Reschedule next War Room check
        if (AppState.warRoomSchedule.enabled) {
          // Clear all reminder timeouts (notifications)
          AppState.warRoomSchedule.reminderTimeouts.forEach((timeout) =>
            clearTimeout(timeout),
          );
          AppState.warRoomSchedule.reminderTimeouts = [];

          // Re-initialize the schedule to calculate and set next check
          // This will recalculate nextCheck and update the display properly
          // Pass true to skip stopWarRoomSchedule() which would hide the display
          initializeWarRoomSchedule(true);
        }
      }

      function generateWarRoomTemplate() {
        const template =
          WAR_ROOM_SYSTEM.state.currentTemplate ||
          WAR_ROOM_SYSTEM.templates.presets.detailed_format;
        let finalReport = "";

        // Generate report for each store
        WAR_ROOM_SYSTEM.state.storeResults.forEach((storeData) => {
          finalReport +=
            WAR_ROOM_SYSTEM.applyTemplate(storeData, template) + "\\n\\n";
        });

        // Add summary if enabled in template
        const includeSummary = template.includeSummary !== false;
        if (includeSummary) {
          finalReport += `\\n--- WAR ROOM SUMMARY ---\\n`;
          finalReport += `Session ID: ${WAR_ROOM_SYSTEM.state.sessionId}\\n`;
          finalReport += `Agent: ${localStorage.getItem("agentName") || "Unknown"}\\n`;
          finalReport += `Total Stores Checked: ${WAR_ROOM_SYSTEM.state.storeResults.length}\\n`;
          finalReport += `Stores with Alarms: ${WAR_ROOM_SYSTEM.state.storeResults.filter((s) => s.hasAlarms).length}\\n`;
          finalReport += `Work Orders Monitored: ${WAR_ROOM_SYSTEM.state.storeResults.reduce((total, s) => total + s.workOrders.length, 0)}\\n`;
          finalReport += `Check Started: ${WAR_ROOM_SYSTEM.state.sessionStartTime.toLocaleString()}\\n`;
          finalReport += `Check Completed: ${new Date().toLocaleString()}\\n`;
          finalReport += `Verification Code: ${WAR_ROOM_SYSTEM.generateVerificationCode()}\\n`;
        }

        // Convert newlines to <br> tags for HTML display
        const displayReport = finalReport.replace(/\\n/g, "<br>");
        document.getElementById("results-content").innerHTML = displayReport;
      }

      function copyWarRoomResults() {
        // Get the HTML content and convert <br> tags back to newlines
        let resultsText = document.getElementById("results-content").innerHTML;
        resultsText = resultsText.replace(/<br>/g, "\n");

        // Also handle any remaining literal \n characters
        resultsText = resultsText.replace(/\\n/g, "\n");

        navigator.clipboard
          .writeText(resultsText)
          .then(() => {
            showNotification(
              "📋 War Room report copied to clipboard",
              "success",
              3000,
            );
          })
          .catch(() => {
            showNotification("❌ Failed to copy report", "error", 3000);
          });
      }

      function editWarRoomResults() {
        const resultsContent = document.getElementById("results-content");
        const currentText = resultsContent.textContent;

        // Make the content editable
        resultsContent.contentEditable = true;
        resultsContent.style.border = "2px solid #007bff";
        resultsContent.style.outline = "none";
        resultsContent.focus();

        // Change button text
        const editBtn = event.target;
        editBtn.textContent = "💾 Save Changes";
        editBtn.onclick = function () {
          resultsContent.contentEditable = false;
          resultsContent.style.border = "1px solid #c8e6c9";
          editBtn.textContent = "✏️ Edit Report";
          editBtn.onclick = editWarRoomResults;
          showNotification("💾 Report changes saved", "success", 2000);
        };
      }

      function startNewWarRoom() {
        if (
          confirm(
            "Start a new War Room check? Current results will be cleared.",
          )
        ) {
          // Reset state
          WAR_ROOM_SYSTEM.state.currentStoreIndex = 0;
          WAR_ROOM_SYSTEM.state.storeResults = [];
          WAR_ROOM_SYSTEM.state.sessionStartTime = null;
          WAR_ROOM_SYSTEM.state.sessionId = null;

          // Hide all sections
          document.getElementById("war-room-progress").style.display = "none";
          document.getElementById("store-checker").style.display = "none";
          document.getElementById("war-room-results").style.display = "none";

          // Clear form
          document.getElementById("assigned-stores").value = "";
          localStorage.removeItem("warRoomAssignedStores");

          showNotification("🔄 Ready for new War Room check", "info", 3000);
        }
      }

      // War Room Verification System (Level 1 - Basic Validation)
      function verifyWarRoomReport() {
        const sessionId = prompt("Enter Session ID to verify:");
        if (!sessionId) return;

        const verificationCode = prompt("Enter Verification Code:");
        if (!verificationCode) return;

        const result = validateWarRoomReport(sessionId, verificationCode);

        if (result.valid) {
          let message = `✅ Valid War Room Report\n\n`;
          message += `📊 Session Details:\n`;
          message += `Session Date: ${result.sessionDate}\n`;
          message += `Agent Prefix: ${result.agentPrefix}\n`;
          message += `Session Age: ${result.sessionAge}\n`;
          message += `Random ID: ${result.randomId}\n\n`;
          message += `🔍 Verification Level: Basic Format Validation\n`;
          message += `Status: Session ID format and timing verified\n`;
          message += `Verification Code: Structure validated`;

          alert(message);
          showNotification(
            "✅ War Room report verified successfully",
            "success",
            5000,
          );
        } else {
          alert(
            `❌ Verification Failed\n\nReason: ${result.reason}\n\nPlease check the Session ID and Verification Code and try again.`,
          );
          showNotification(
            "❌ War Room report verification failed",
            "error",
            5000,
          );
        }
      }

      function validateWarRoomReport(sessionId, verificationCode) {
        // Validate Session ID format: WR_AgentPrefix_Timestamp_RandomString
        const sessionPattern = /^WR_([^_]+)_(\d+)_([a-z0-9]+)$/;
        const sessionMatch = sessionId.match(sessionPattern);

        if (!sessionMatch) {
          return {
            valid: false,
            reason:
              "Invalid session ID format. Expected format: WR_AgentPrefix_Timestamp_RandomString",
          };
        }

        const [, agentPrefix, timestamp, randomString] = sessionMatch;

        // Validate timestamp is reasonable (not from future, not too old)
        const sessionTime = parseInt(timestamp);
        const now = Date.now();
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000; // 30 days

        if (isNaN(sessionTime)) {
          return {
            valid: false,
            reason: "Invalid timestamp in session ID",
          };
        }

        if (sessionTime > now) {
          return {
            valid: false,
            reason: "Session timestamp is from the future",
          };
        }

        if (sessionTime < oneMonthAgo) {
          return {
            valid: false,
            reason: "Session is older than 30 days and may no longer be valid",
          };
        }

        // Validate agent prefix
        if (agentPrefix.length < 2 || agentPrefix.length > 20) {
          return {
            valid: false,
            reason: "Invalid agent prefix length in session ID",
          };
        }

        // Validate random string
        if (randomString.length < 10 || !/^[a-z0-9]+$/.test(randomString)) {
          return {
            valid: false,
            reason: "Invalid random identifier in session ID",
          };
        }

        // Validate verification code format
        try {
          const decoded = atob(verificationCode);

          // Basic validation - should contain reasonable data
          if (decoded.length < 8) {
            return {
              valid: false,
              reason: "Verification code appears to be too short",
            };
          }

          // Check if it contains printable characters (basic sanity check)
          if (!/^[\x20-\x7E]*$/.test(decoded)) {
            return {
              valid: false,
              reason: "Verification code contains invalid characters",
            };
          }
        } catch (e) {
          return {
            valid: false,
            reason: "Verification code is not valid Base64 encoding",
          };
        }

        // Calculate session age
        const ageHours = Math.round((now - sessionTime) / (1000 * 60 * 60));
        const ageDays = Math.floor(ageHours / 24);
        const ageString =
          ageDays > 0
            ? `${ageDays} day${ageDays > 1 ? "s" : ""} ago`
            : `${ageHours} hour${ageHours > 1 ? "s" : ""} ago`;

        return {
          valid: true,
          sessionDate: new Date(sessionTime).toLocaleString(),
          agentPrefix: agentPrefix,
          randomId: randomString,
          sessionAge: ageString,
          timestamp: sessionTime,
        };
      }

      // Enhanced Quick Notes
      function addQuickNote(noteText) {
        const notesTextarea = document.getElementById("notes");
        const currentNotes = notesTextarea.value.trim();

        if (currentNotes) {
          notesTextarea.value = currentNotes + " " + noteText;
        } else {
          notesTextarea.value = noteText;
        }

        // Trigger auto-save
        scheduleAutoSave();

        // Update tag recommendations after adding note
        analyzeNotesForTags();

        // Visual feedback
        showNotification(`Added: ${noteText}`, "success", 2000);

        // Scroll to end of textarea
        notesTextarea.scrollTop = notesTextarea.scrollHeight;
        notesTextarea.setSelectionRange(
          notesTextarea.value.length,
          notesTextarea.value.length,
        );
      }

      // Utility functions
      function showNotification(message, type = "success", duration = 3000) {
        // Create notification container if it doesn't exist
        let notificationContainer = document.querySelector(
          ".notification-container",
        );
        if (!notificationContainer) {
          notificationContainer = document.createElement("div");
          notificationContainer.className = "notification-container";
          document.body.appendChild(notificationContainer);
        }

        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.setAttribute("role", "alert");
        notification.setAttribute("aria-live", "polite");

        // Insert at the beginning (top) to push others down
        notificationContainer.insertBefore(
          notification,
          notificationContainer.firstChild,
        );

        // Trigger animation
        setTimeout(() => notification.classList.add("show"), 100);

        // Auto remove
        setTimeout(() => {
          if (notification.parentNode) {
            notification.classList.remove("show");
            setTimeout(() => {
              notification.remove();
              // Remove container if empty
              if (notificationContainer.children.length === 0) {
                notificationContainer.remove();
              }
            }, 300);
          }
        }, duration);
      }

      function addButtonFeedback(button, type = "success") {
        const originalClass = button.className;
        button.classList.add(`${type}-feedback`);
        setTimeout(() => {
          button.className = originalClass;
        }, 200);
      }

      function validateInput(value, type = "text") {
        if (type === "storeNumber") {
          return /^\d+$/.test(value) || value === "";
        }
        return true;
      }

      // Enhanced theme management
      function toggleTheme() {
        try {
          const body = document.body;
          const button = document.getElementById("theme-toggle-btn");

          body.classList.toggle("light-mode");
          body.classList.toggle("dark-mode");
          const isDark = body.classList.contains("dark-mode");

          localStorage.setItem("theme", isDark ? "dark" : "light");
          updateThemeIcon(isDark);

          // Update button aria-label
          button.setAttribute(
            "aria-label",
            isDark ? "Switch to light mode" : "Switch to dark mode",
          );

          showNotification(
            `Switched to ${isDark ? "dark" : "light"} mode`,
            "success",
            1500,
          );
        } catch (error) {
          console.error("Theme toggle failed:", error);
          showNotification("Failed to toggle theme", "error");
        }
      }

      function updateThemeIcon(isDark) {
        const icon = document.getElementById("theme-toggle-icon");
        if (icon) {
          if (isDark) {
            icon.classList.remove("fa-sun");
            icon.classList.add("fa-moon");
          } else {
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
          }
        }
      }

      // Enhanced history management with better error handling
      function saveNotesHistory(forceNew = false) {
        try {
          const formData = getFormData();

          if (!hasValidData(formData)) {
            return false;
          }

          let history = getNotesHistory();
          history = cleanOldEntries(history);

          // If we have a current note ID and not forcing new, update existing note
          if (AppState.currentNoteId && !forceNew) {
            const existingIndex = history.findIndex(
              (entry) => entry.id === AppState.currentNoteId,
            );
            if (existingIndex !== -1) {
              // Update existing note
              history[existingIndex] = {
                ...history[existingIndex],
                ...formData,
                timestamp: Date.now(), // Update timestamp to show latest edit
              };
              localStorage.setItem("notesHistory", JSON.stringify(history));
              ENHANCED_STORAGE.setItem("notesHistory", JSON.stringify(history)); // Enhanced storage
              updateHistoryDropdown();
              return true;
            }
          }

          // Create new note (either because we don't have currentNoteId or forcing new)
          const noteEntry = {
            ...formData,
            timestamp: Date.now(),
            id: generateId(),
          };

          // Prevent duplicate entries only when forcing new
          if (forceNew) {
            const isDuplicate = history.some(
              (entry) =>
                entry.techName === formData.techName &&
                entry.storeNumber === formData.storeNumber &&
                entry.workOrder === formData.workOrder &&
                entry.notes === formData.notes &&
                Math.abs(entry.timestamp - noteEntry.timestamp) < 10000, // Within 10 seconds
            );

            if (isDuplicate) {
              return false;
            }
          }

          // Set this as the current note being edited
          AppState.currentNoteId = noteEntry.id;

          history.push(noteEntry);
          localStorage.setItem("notesHistory", JSON.stringify(history));
          ENHANCED_STORAGE.setItem("notesHistory", JSON.stringify(history)); // Enhanced storage
          updateHistoryDropdown();
          updateNoteStatus();

          return true;
        } catch (error) {
          console.error("Failed to save notes history:", error);
          showNotification("Failed to save to history", "error");
          return false;
        }
      }

      function getFormData() {
        return {
          techName: document.getElementById("tech-name").value.trim(),
          storeNumber: document.getElementById("store-number").value.trim(),
          workOrder: document.getElementById("work-order").value.trim(),
          notes: document.getElementById("notes").value.trim(),

          // Infraction tracking
          sessionInfractions: AppState.sessionInfractions || 0,
          totalInfractionsAtTime: AppState.totalInfractions || 0,
          infractionLog: AppState.currentNoteInfractions || [],
        };
      }

      function hasValidData(data) {
        return Object.values(data).some((value) => value.length > 0);
      }

      function getNotesHistory() {
        try {
          return JSON.parse(localStorage.getItem("notesHistory") || "[]");
        } catch (error) {
          console.error("Failed to parse notes history:", error);
          return [];
        }
      }

      function cleanOldEntries(history) {
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        return history.filter(
          (entry) => Date.now() - entry.timestamp <= sevenDaysInMs,
        );
      }

      function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
      }

      function updateHistoryDropdown() {
        try {
          const history = getNotesHistory();
          const historySelect = document.getElementById("history");

          if (!historySelect) return;

          historySelect.innerHTML =
            '<option value="">-- Select Previous Notes --</option>';

          // Sort by timestamp (newest first)
          const sortedHistory = history.sort(
            (a, b) => b.timestamp - a.timestamp,
          );

          sortedHistory.forEach((entry) => {
            const date = new Date(entry.timestamp).toLocaleString();
            // Truncate techName and storeNumber for better readability
            let techName = entry.techName || "No Name";
            let storeNumber = entry.storeNumber || "N/A";
            if (techName.length > 18)
              techName = techName.substring(0, 15) + "...";
            if (storeNumber.length > 10)
              storeNumber = storeNumber.substring(0, 10) + "...";

            // Add infraction indicator
            const infractionCount =
              (entry.infractionLog && entry.infractionLog.length) || 0;
            const infractionIndicator =
              infractionCount > 0 ? ` ⚠️${infractionCount}` : "";

            const label = `${date} - ${techName} (Store: ${storeNumber})${infractionIndicator}`;
            const option = document.createElement("option");
            option.value = entry.id;
            option.textContent = label;

            // Add visual styling for notes with infractions
            if (infractionCount > 0) {
              option.style.color = "#dc3545";
              option.style.fontWeight = "bold";
            }

            historySelect.appendChild(option);
          });
        } catch (error) {
          console.error("Failed to update history dropdown:", error);
        }
      }

      function restoreNotes() {
        try {
          const historySelect = document.getElementById("history");
          const selectedId = historySelect.value;
          if (!selectedId) return;

          const history = getNotesHistory();
          const entry = history.find((e) => e.id === selectedId);

          if (entry) {
            document.getElementById("tech-name").value = entry.techName || "";
            document.getElementById("store-number").value =
              entry.storeNumber || "";
            document.getElementById("work-order").value = entry.workOrder || "";
            document.getElementById("notes").value = entry.notes || "";

            // Restore infraction data
            AppState.currentNoteInfractions = entry.infractionLog || [];

            // Set this as the current note being edited
            AppState.currentNoteId = selectedId;
            AppState.lastSavedData = JSON.stringify(getFormData());
            updateNoteStatus();

            // Show infraction info if present
            displayInfractionInfo(entry);

            showNotification("Notes restored successfully", "success", 2000);

            // Auto-save after restore (this will now update the existing note)
            scheduleAutoSave();
          } else {
            showNotification("Failed to find selected notes", "error", 2000);
          }
        } catch (error) {
          console.error("Failed to restore notes:", error);
          showNotification("Failed to restore notes", "error");
        }
      }

      // Helper for DAE notes overwrite confirmation
      function shouldOverwriteDAENotes(notesBox) {
        // Returns true if it's safe to overwrite, or user confirms overwrite
        if (
          !notesBox.dataset.userEdited ||
          notesBox.dataset.userEdited === "false" ||
          !notesBox.value.trim()
        ) {
          return true;
        }
        return confirm("This will overwrite your current DAE notes. Continue?");
      }

      // DAE Templates managed in JavaScript for maintainability
      const DAE_TEMPLATES = APP_CONFIG.DAE_TEMPLATES;

      async function handleDefrostBtn() {
        const circuitInput = document
          .getElementById("quick-notes-circuit")
          ?.value.trim();
        if (circuitInput) {
          addQuickNote("Forced defrost on " + circuitInput + ".");
        } else {
          addQuickNoteWithInput("Forced defrost on ", "ENTER_CIRCUIT");
        }
      }

      function handleStopDefrostBtn() {
        const circuitInput = document
          .getElementById("quick-notes-circuit")
          ?.value.trim();
        if (circuitInput) {
          addQuickNote("Terminated Defrost on " + circuitInput + ".");
        } else {
          addQuickNote("Terminated Defrost.");
        }
      }

      async function addQuickNoteWithInput(prefix, promptText) {
        const userInput = await customPrompt(promptText);
        if (userInput && userInput.trim() !== "") {
          addQuickNote(prefix + userInput.trim() + ".");
          // Tag analysis is handled by addQuickNote
        }
      }

      // ============= Rack Management Functions =============

      // Helper function to get current rack context
      function getCurrentRackContext() {
        // If we have a manually set rack (Refrigeration), use it
        if (AppState.currentRack) {
          return AppState.currentRack;
        }

        // Otherwise, check which sub-category is active
        // Check Diagnostics tabs
        const diagnosticsHvac = document.querySelector(
          '.sub-category-btn[onclick*="diagnostics"][onclick*="hvac"]',
        );
        const diagnosticsLighting = document.querySelector(
          '.sub-category-btn[onclick*="diagnostics"][onclick*="lighting"]',
        );

        if (diagnosticsHvac && diagnosticsHvac.classList.contains("active")) {
          return "HVACL";
        }
        if (
          diagnosticsLighting &&
          diagnosticsLighting.classList.contains("active")
        ) {
          return "HVACL"; // Lighting uses same controller as HVAC
        }

        // Check Actions tabs
        const actionsHvac = document.querySelector(
          '.sub-category-btn[onclick*="actions"][onclick*="hvac"]',
        );
        const actionsLighting = document.querySelector(
          '.sub-category-btn[onclick*="actions"][onclick*="lighting"]',
        );

        if (actionsHvac && actionsHvac.classList.contains("active")) {
          return "HVACL";
        }
        if (actionsLighting && actionsLighting.classList.contains("active")) {
          return "HVACL"; // Lighting uses same controller as HVAC
        }

        // No context found
        return null;
      }

      // Specialized modal for rack selection
      function showRackSelectionModal() {
        return new Promise((resolve) => {
          // Create modal overlay
          const modalOverlay = document.createElement("div");
          modalOverlay.className = "modal-overlay";

          // Create modal content
          const modalContent = document.createElement("div");
          modalContent.className = "modal-content";
          modalContent.style.maxWidth = "600px";

          // Header
          const modalHeader = document.createElement("div");
          modalHeader.className = "modal-header";
          modalHeader.innerHTML = "<h3>Set Current Rack</h3>";

          // Body
          const modalBody = document.createElement("div");
          modalBody.className = "modal-body";

          // Rack Builder Section
          const builderSection = document.createElement("div");
          builderSection.style.marginBottom = "20px";
          builderSection.style.padding = "15px";
          builderSection.style.backgroundColor = "var(--bg-secondary)";
          builderSection.style.borderRadius = "8px";
          builderSection.innerHTML =
            '<h4 style="margin-top:0">Quick Builder</h4>';

          // Builder State
          let builderState = {
            systems: "",
            prefix: "",
            type: "",
            letters: [],
          };

          // Helper to create button groups
          const createButtonGroup = (label, items, key, multi = false) => {
            const container = document.createElement("div");
            container.style.marginBottom = "10px";

            const labelEl = document.createElement("div");
            labelEl.textContent = label;
            labelEl.style.fontSize = "0.9em";
            labelEl.style.marginBottom = "5px";
            labelEl.style.color = "var(--text-secondary)";
            container.appendChild(labelEl);

            const btnContainer = document.createElement("div");
            btnContainer.style.display = "flex";
            btnContainer.style.gap = "5px";
            btnContainer.style.flexWrap = "wrap";

            items.forEach((item) => {
              const btn = document.createElement("button");
              btn.className = "secondary-button";
              btn.style.padding = "5px 10px";
              btn.style.minWidth = "40px";
              btn.textContent = item;
              btn.dataset.value = item;

              btn.onclick = () => {
                if (multi) {
                  // Toggle letter
                  const idx = builderState[key].indexOf(item);
                  if (idx > -1) {
                    builderState[key].splice(idx, 1);
                    btn.classList.remove("active-rack-btn");
                    btn.style.backgroundColor = "";
                    btn.style.color = "";
                  } else {
                    builderState[key].push(item);
                    // Sort letters alphabetically
                    builderState[key].sort();
                    btn.classList.add("active-rack-btn");
                    btn.style.backgroundColor = "var(--primary-color)";
                    btn.style.color = "white";
                  }
                } else {
                  // Single select (toggle off if same clicked)
                  if (builderState[key] === item) {
                    builderState[key] = "";
                    btn.classList.remove("active-rack-btn");
                    btn.style.backgroundColor = "";
                    btn.style.color = "";
                  } else {
                    builderState[key] = item;
                    // Reset other buttons in group
                    Array.from(btnContainer.children).forEach((b) => {
                      b.classList.remove("active-rack-btn");
                      b.style.backgroundColor = "";
                      b.style.color = "";
                    });
                    btn.classList.add("active-rack-btn");
                    btn.style.backgroundColor = "var(--primary-color)";
                    btn.style.color = "white";
                  }
                }
                updateManualInputFromBuilder();
              };

              btnContainer.appendChild(btn);
            });

            container.appendChild(btnContainer);
            return container;
          };

          // Create Groups
          builderSection.appendChild(
            createButtonGroup("Systems", ["HVAC", "HVACL", "AHM"], "systems")
          );
          builderSection.appendChild(
            createButtonGroup("Prefix", ["C", "R", "CKT", "CKTS"], "prefix")
          );
          builderSection.appendChild(
            createButtonGroup("Type", ["LT", "MT", "DT"], "type"),
          );
          const alphabet = Array.from({ length: 26 }, (_, i) =>
            String.fromCharCode(65 + i),
          );
          builderSection.appendChild(
            createButtonGroup("Letters", alphabet, "letters", true),
          );

          // Manual Entry Section (Result)
          const manualSection = document.createElement("div");
          manualSection.innerHTML = "<h4>Result / Manual Entry</h4>";

          const manualInput = document.createElement("input");
          manualInput.type = "text";
          manualInput.className = "form-control";
          manualInput.placeholder = "e.g. Rack 1, HVACL, LTA...";
          manualInput.value = AppState.currentRack || "";
          manualInput.style.fontSize = "1.2em";
          manualInput.style.fontWeight = "bold";
          manualSection.appendChild(manualInput);

          modalBody.appendChild(builderSection);
          modalBody.appendChild(manualSection);

          // Logic to update manual input
          const updateManualInputFromBuilder = () => {
            let builtName = "";
            let code = `${builderState.prefix}${builderState.type}${builderState.letters.join("")}`;
            
            // If only letters are selected (no prefix, no type, no systems), default to "Rack X"
            if (
              !builderState.systems &&
              !builderState.prefix &&
              !builderState.type &&
              builderState.letters.length > 0
            ) {
              builtName = `Rack ${builderState.letters.join("")}`;
            } else if (builderState.systems) {
              builtName = code ? `${builderState.systems} ${code}` : builderState.systems;
            } else {
              builtName = code;
            }

            if (builtName) {
              manualInput.value = builtName;
            }
          };

          // Buttons
          const modalButtons = document.createElement("div");
          modalButtons.className = "modal-buttons";

          const cancelBtn = document.createElement("button");
          cancelBtn.className = "modal-btn modal-btn-secondary";
          cancelBtn.textContent = "Cancel";
          cancelBtn.onclick = () => {
            modalOverlay.classList.remove("show");
            setTimeout(() => modalOverlay.remove(), 200);
            resolve(null);
          };

          const confirmBtn = document.createElement("button");
          confirmBtn.className = "modal-btn modal-btn-primary";
          confirmBtn.textContent = "Set Rack";
          confirmBtn.onclick = () => {
            const result = manualInput.value.trim();
            modalOverlay.classList.remove("show");
            setTimeout(() => modalOverlay.remove(), 200);
            resolve(result);
          };

          modalButtons.appendChild(cancelBtn);
          modalButtons.appendChild(confirmBtn);

          modalContent.appendChild(modalHeader);
          modalContent.appendChild(modalBody);
          modalContent.appendChild(modalButtons);

          modalOverlay.appendChild(modalContent);
          document.body.appendChild(modalOverlay);

          // Show
          setTimeout(() => modalOverlay.classList.add("show"), 10);

          // Focus
          manualInput.focus();

          // Close on overlay click
          modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
              modalOverlay.classList.remove("show");
              setTimeout(() => modalOverlay.remove(), 200);
              resolve(null);
            }
          };
        });
      }

      // Set current rack for multiple operations
      async function setCurrentRack() {
        const rackName = await showRackSelectionModal();

        if (rackName && rackName.trim() !== "") {
          AppState.currentRack = rackName.trim();
          updateRackDisplay();
          showNotification(
            `✓ Rack set to: ${AppState.currentRack}`,
            "success",
            2000,
          );

          // Also add a "Logged into" note
          addQuickNote(`Logged into ${AppState.currentRack}.`);
        }
      }

      // Clear current rack
      function clearCurrentRack() {
        if (AppState.currentRack) {
          const previousRack = AppState.currentRack;
          AppState.currentRack = null;
          updateRackDisplay();
          showNotification(`✓ Cleared rack: ${previousRack}`, "info", 2000);
        }
      }

      // Update UI to show current rack
      function updateRackDisplay() {
        const rackDisplayElements = document.querySelectorAll(
          ".current-rack-display",
        );
        rackDisplayElements.forEach((element) => {
          if (AppState.currentRack) {
            element.textContent = AppState.currentRack;
            element.style.display = "inline";
            element.parentElement.style.display = "block";
          } else {
            element.style.display = "none";
            element.parentElement.style.display = "none";
          }
        });

        // Update button state for rack-specific operations
        const rackButtons = document.querySelectorAll(".rack-required-btn");
        rackButtons.forEach((button) => {
          if (AppState.currentRack) {
            button.classList.remove("btn-disabled");
            button.disabled = false;
            button.style.opacity = "1";
          } else {
            button.classList.add("btn-disabled");
            button.disabled = true;
            button.style.opacity = "0.5";
          }
        });

        if (typeof updateEmsInsightsPanel === "function") {
          const rackField = document.getElementById("quick-notes-rack");
          if (rackField) rackField.value = AppState.currentRack || "";
          updateEmsInsightsPanel();
        }
      }

      async function addRackNote(action, requiresRack = true) {
        let rackName = AppState.currentRack;

        if (!rackName && requiresRack) {
          rackName = await customPrompt("RACK_NAME", { action: action });
          if (!rackName || rackName.trim() === "") {
            showNotification("❌ Rack name required", "error", 2000);
            return;
          }
          rackName = rackName.trim().toUpperCase();
        }

        if (rackName) {
          addQuickNote(`${action} on ${rackName}.`);
        } else {
          addQuickNote(`${action}.`);
        }
      }

      // Specific rack-related operations
      async function addSuctionPSINote() {
        await addRackNote("Checked Suct PSI");
      }

      async function addDischargePSINote() {
        await addRackNote("Checked Disc PSI");
      }

      async function addReceiverLevelNote() {
        await addRackNote("Checked RECV LVL");
      }

      // ============= End Rack Management Functions =============

      async function addForcedNote() {
        const rackContext = getCurrentRackContext();
        const rackPrefix = rackContext ? ` on ${rackContext}` : "";

        const parameter = await customPrompt("FORCE_PARAM");
        if (parameter && parameter.trim() !== "") {
          addQuickNote(`Forced ${parameter.trim()}${rackPrefix}.`);
          // Tag analysis is handled by addQuickNote
        }
      }

      async function addForcedOffNote() {
        const rackContext = getCurrentRackContext();
        const rackPrefix = rackContext ? ` on ${rackContext}` : "";

        const notesContent = document.getElementById("notes").value;
        const daeContent = document.getElementById("dropdown-notes").value;
        const combinedContent = notesContent + " " + daeContent;

        // Look for previously forced items in the notes
        const forcedOnRegex = /Forced (?:on )?([^.]+)\./gi;
        const matches = [];
        let match;

        while ((match = forcedOnRegex.exec(combinedContent)) !== null) {
          const item = match[1].trim();
          // Skip if it's already been forced off
          if (
            !combinedContent
              .toLowerCase()
              .includes("forced off " + item.toLowerCase())
          ) {
            matches.push(item);
          }
        }

        if (matches.length > 0) {
          // Use the most recent forced item
          const lastForcedItem = matches[matches.length - 1];
          addQuickNote(`Forced off ${lastForcedItem}${rackPrefix}.`);
          showNotification(`Auto-detected: ${lastForcedItem}`, "success", 2000);
        } else {
          // No forced items found, prompt for input
          const item = await customPrompt("FORCE_OFF_ITEM");
          if (item && item.trim() !== "") {
            addQuickNote(`Forced off ${item.trim()}${rackPrefix}.`);
          }
        }
      }

      async function addShutdownCircuitNote() {
        const rackContext = getCurrentRackContext();
        const rackPrefix = rackContext ? ` on ${rackContext}` : "";

        const circuit = await customPrompt("SHUTDOWN_CIRCUIT");
        if (!circuit || circuit.trim() === "") return;

        const note = `Shutdown circuit ${circuit.trim()}${rackPrefix}.`;
        addQuickNote(note);
      }

      // Specialized modal for breaker selection
      function showBreakerSelectionModal() {
        return new Promise((resolve) => {
          const modalOverlay = document.createElement("div");
          modalOverlay.className = "modal-overlay";

          const modalContent = document.createElement("div");
          modalContent.className = "modal-content";
          modalContent.style.maxWidth = "700px";
          modalContent.style.maxHeight = "90vh";
          modalContent.style.overflowY = "auto";

          const modalHeader = document.createElement("div");
          modalHeader.className = "modal-header";
          modalHeader.innerHTML = "<h3>Breaker Details</h3>";

          const modalBody = document.createElement("div");
          modalBody.className = "modal-body";

          let builderState = {
            panelPrefix: "",
            panelNum: "",
            panelSuffix: "",
            breakers: [],
            status: "",
            entries: [],
          };

          // Helper to update panel preview
          const getPanelName = (customVal) => {
            if (customVal) return customVal;
            if (builderState.panelPrefix === "IOM") return "IOM";
            const prefix = builderState.panelPrefix || "";
            const num = builderState.panelNum || "";
            const suffix = builderState.panelSuffix || "";
            return prefix + num + suffix;
          };

          const createButtonGroup = (
            label,
            items,
            key,
            multi = false,
            onChange = null,
          ) => {
            const container = document.createElement("div");
            container.style.marginBottom = "15px";

            const labelEl = document.createElement("div");
            labelEl.textContent = label;
            labelEl.style.fontSize = "0.9em";
            labelEl.style.marginBottom = "5px";
            labelEl.style.color = "var(--text-secondary)";
            labelEl.style.fontWeight = "bold";
            container.appendChild(labelEl);

            const btnContainer = document.createElement("div");
            btnContainer.style.display = "flex";
            btnContainer.style.gap = "5px";
            btnContainer.style.flexWrap = "wrap";

            items.forEach((item) => {
              const btn = document.createElement("button");
              btn.className = "secondary-button";
              btn.style.padding = "6px 12px";
              btn.textContent = item;

              btn.onclick = () => {
                if (multi) {
                  const idx = builderState[key].indexOf(item);
                  if (idx > -1) {
                    builderState[key].splice(idx, 1);
                    btn.style.backgroundColor = "";
                    btn.style.color = "";
                  } else {
                    builderState[key].push(item);
                    builderState[key].sort((a, b) => a - b);
                    btn.style.backgroundColor = "var(--primary-color)";
                    btn.style.color = "white";
                  }
                } else {
                  if (builderState[key] === item) {
                    builderState[key] = "";
                    btn.style.backgroundColor = "";
                    btn.style.color = "";
                  } else {
                    builderState[key] = item;
                    Array.from(btnContainer.children).forEach((b) => {
                      b.style.backgroundColor = "";
                      b.style.color = "";
                    });
                    btn.style.backgroundColor = "var(--primary-color)";
                    btn.style.color = "white";
                  }
                }
                if (onChange) onChange();
              };

              btnContainer.appendChild(btn);
            });

            container.appendChild(btnContainer);
            return container;
          };

          // Panel Builder Section
          const panelBuilderSection = document.createElement("div");
          panelBuilderSection.style.padding = "10px";
          panelBuilderSection.style.backgroundColor = "var(--bg-secondary)";
          panelBuilderSection.style.borderRadius = "8px";
          panelBuilderSection.style.marginBottom = "20px";

          const panelTitle = document.createElement("h4");
          panelTitle.textContent = "1. Build Panel Name";
          panelTitle.style.marginTop = "0";
          panelBuilderSection.appendChild(panelTitle);

          const panelPreview = document.createElement("div");
          panelPreview.style.fontSize = "1.2em";
          panelPreview.style.fontWeight = "bold";
          panelPreview.style.marginBottom = "10px";
          panelPreview.style.color = "var(--primary-color)";
          panelPreview.textContent = "Panel: ";

          const updatePanelPreview = () => {
            const name = getPanelName(panelInput.value.trim());
            panelPreview.textContent = "Panel: " + (name || "(Select below)");
          };

          panelBuilderSection.appendChild(panelPreview);

          panelBuilderSection.appendChild(
            createButtonGroup(
              "Prefix",
              ["H", "L", "IOM"],
              "panelPrefix",
              false,
              updatePanelPreview,
            ),
          );
          panelBuilderSection.appendChild(
            createButtonGroup(
              "Number",
              ["1", "2", "3", "4", "5"],
              "panelNum",
              false,
              updatePanelPreview,
            ),
          );
          panelBuilderSection.appendChild(
            createButtonGroup(
              "Suffix",
              ["P", "P1", "P2", "P3", "P4", "P5"],
              "panelSuffix",
              false,
              updatePanelPreview,
            ),
          );

          const customPanelContainer = document.createElement("div");
          customPanelContainer.style.marginTop = "10px";
          const panelInput = document.createElement("input");
          panelInput.type = "text";
          panelInput.placeholder = "Or enter Custom Panel Name...";
          panelInput.className = "form-control";
          panelInput.style.width = "100%";
          panelInput.oninput = updatePanelPreview;
          customPanelContainer.appendChild(panelInput);
          panelBuilderSection.appendChild(customPanelContainer);

          modalBody.appendChild(panelBuilderSection);

          // Breakers & Status Section
          const statusesSection = document.createElement("div");
          statusesSection.style.padding = "10px";
          statusesSection.style.border = "1px solid var(--border-color)";
          statusesSection.style.borderRadius = "8px";
          statusesSection.style.marginBottom = "20px";

          const step2Title = document.createElement("h4");
          step2Title.textContent = "2. Add Breakers & Statuses";
          step2Title.style.marginTop = "0";
          statusesSection.appendChild(step2Title);

          const breakerNumbers = Array.from({ length: 42 }, (_, i) => i + 1);

          // Keep references to redraw buttons when resetting selection
          let breakersContainer;
          let statusContainer;

          const renderBreakerStatusControls = () => {
            if (breakersContainer)
              statusesSection.removeChild(breakersContainer);
            if (statusContainer) statusesSection.removeChild(statusContainer);

            breakersContainer = createButtonGroup(
              "Select Breakers",
              breakerNumbers,
              "breakers",
              true,
            );
            statusContainer = createButtonGroup(
              "Select Status",
              ["Not Present", "Faulted On", "Faulted Off"],
              "status",
              false,
            );

            statusesSection.insertBefore(
              breakersContainer,
              addStatusBtnContainer,
            );
            statusesSection.insertBefore(
              statusContainer,
              addStatusBtnContainer,
            );
          };

          const addStatusBtnContainer = document.createElement("div");
          addStatusBtnContainer.style.marginTop = "15px";
          addStatusBtnContainer.style.display = "flex";
          addStatusBtnContainer.style.gap = "10px";

          const addCustomBreakerInput = document.createElement("input");
          addCustomBreakerInput.type = "text";
          addCustomBreakerInput.placeholder = "Custom Breaker(s) (Optional)";
          addCustomBreakerInput.className = "form-control";
          addCustomBreakerInput.style.flex = "1";

          const addStatusBtn = document.createElement("button");
          addStatusBtn.className = "primary-button";
          addStatusBtn.textContent = "Add to Panel";
          addStatusBtn.onclick = () => {
            const finalBreakers =
              addCustomBreakerInput.value.trim() ||
              builderState.breakers.join(", ");
            const finalStatus = builderState.status;

            if (!finalBreakers || !finalStatus) {
              showNotification(
                "Please select breakers and a status.",
                "warning",
                2000,
              );
              return;
            }

            builderState.entries.push({
              breakers: finalBreakers,
              status: finalStatus,
            });

            // Reset selection for next entry
            builderState.breakers = [];
            builderState.status = "";
            addCustomBreakerInput.value = "";
            renderBreakerStatusControls(); // Re-render to clear visual state
            updateEntriesList();
            showNotification("Added to panel list", "success", 1500);
          };

          addStatusBtnContainer.appendChild(addCustomBreakerInput);
          addStatusBtnContainer.appendChild(addStatusBtn);

          statusesSection.appendChild(addStatusBtnContainer);

          renderBreakerStatusControls();

          modalBody.appendChild(statusesSection);

          // Entries list preview
          const entriesPreview = document.createElement("div");
          entriesPreview.style.marginBottom = "20px";

          const entriesList = document.createElement("ul");
          entriesList.style.paddingLeft = "20px";

          const updateEntriesList = () => {
            entriesList.innerHTML = "";
            if (builderState.entries.length === 0) {
              entriesList.innerHTML =
                '<li style="color:var(--text-secondary); font-style:italic;">No breakers added to this panel yet.</li>';
            } else {
              builderState.entries.forEach((entry, idx) => {
                const li = document.createElement("li");
                li.style.marginBottom = "8px";
                li.innerHTML = `<strong>Breakers:</strong> ${entry.breakers} ➡️ <strong>Status:</strong> ${entry.status} `;

                const removeBtn = document.createElement("button");
                removeBtn.textContent = "✖";
                removeBtn.style.background = "none";
                removeBtn.style.border = "none";
                removeBtn.style.color = "#ff4444";
                removeBtn.style.cursor = "pointer";
                removeBtn.onclick = () => {
                  builderState.entries.splice(idx, 1);
                  updateEntriesList();
                };
                li.appendChild(removeBtn);
                entriesList.appendChild(li);
              });
            }
          };
          updateEntriesList(); // initial render
          entriesPreview.appendChild(entriesList);
          modalBody.appendChild(entriesPreview);

          // Buttons
          const modalButtons = document.createElement("div");
          modalButtons.className = "modal-buttons";

          const cancelBtn = document.createElement("button");
          cancelBtn.className = "modal-btn modal-btn-secondary";
          cancelBtn.textContent = "Cancel";
          cancelBtn.onclick = () => {
            modalOverlay.classList.remove("show");
            setTimeout(() => modalOverlay.remove(), 200);
            resolve(null);
          };

          const confirmBtn = document.createElement("button");
          confirmBtn.className = "modal-btn modal-btn-primary";
          confirmBtn.textContent = "Save Panel Detailed Info";
          confirmBtn.onclick = () => {
            const panelName = getPanelName(panelInput.value.trim());

            if (!panelName) {
              showNotification(
                "Please build or enter a Panel Name.",
                "warning",
                3000,
              );
              return;
            }
            if (builderState.entries.length === 0) {
              showNotification(
                "Please add at least one breaker status entry.",
                "warning",
                3000,
              );
              return;
            }

            modalOverlay.classList.remove("show");
            setTimeout(() => modalOverlay.remove(), 200);
            resolve({
              panel: panelName,
              entries: builderState.entries,
            });
          };

          modalButtons.appendChild(cancelBtn);
          modalButtons.appendChild(confirmBtn);

          modalContent.appendChild(modalHeader);
          modalContent.appendChild(modalBody);
          modalContent.appendChild(modalButtons);

          modalOverlay.appendChild(modalContent);
          document.body.appendChild(modalOverlay);

          setTimeout(() => modalOverlay.classList.add("show"), 10);

          modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
              modalOverlay.classList.remove("show");
              setTimeout(() => modalOverlay.remove(), 200);
              resolve(null);
            }
          };
        });
      }

      async function addCheckBreakersNote() {
        // First add the initial check breakers note
        addQuickNote("Checked breakers.");

        // Ask if they want to add detailed breaker information
        const addDetails = await customConfirm(
          "Add detailed breaker panel information?",
          "Breaker Details",
        );
        if (!addDetails) return;

        let breakerPanels = [];
        let addMore = true;

        while (addMore && breakerPanels.length < 5) {
          // Limit to 5 panels max
          const panelDetail = await showBreakerSelectionModal();
          if (!panelDetail) break;

          breakerPanels.push(panelDetail);

          // Ask if they want to add another panel
          if (breakerPanels.length < 5) {
            addMore = await customConfirm(
              "Add another breaker panel?",
              "Add Another Panel",
            );
          } else {
            addMore = false;
            showNotification("Maximum of 5 panels reached.", "info", 2000);
          }
        }

        // Add the detailed breaker information
        breakerPanels.forEach((panelObj) => {
          panelObj.entries.forEach((entry) => {
            const note = `For breaker panel ${panelObj.panel}, breakers ${entry.breakers}, are showing as ${entry.status}.`;
            addQuickNote(note);
          });
        });
      }

      async function addAdvisoryNote() {
        const issue = await customPrompt("ADVISORY_ISSUE");
        if (!issue || issue.trim() === "") return;

        const note = `Adv tech of ${issue.trim()}.`;
        addQuickNote(note);
      }

      async function addTechQuestionNote() {
        const question = await customPrompt("TECH_QUESTION");
        if (!question || question.trim() === "") return;

        const note = `Tech wanted to know ${question.trim()}.`;
        addQuickNote(note);
      }

      async function addStatusUpdateNote() {
        const item = await customPrompt("STATUS_UPDATE");
        if (!item || item.trim() === "") return;

        const note = `Tech wanted a status update on ${item.trim()}.`;
        addQuickNote(note);
      }

      async function addTechRefusedNote() {
        const action = await customPrompt("TECH_REFUSED");
        if (!action || action.trim() === "") return;

        const note = `Tech refused ${action.trim()}.`;
        addQuickNote(note);
      }

      async function addDefrostAlreadyRunningNote() {
        const circuit = await customPrompt("CIRCUIT_DEFROSTING");
        if (!circuit || circuit.trim() === "") return;

        const note = `${circuit.trim()} is already defrosting.`;
        addQuickNote(note);
      }

      async function addSetpointNote() {
        const oldCool = await customPrompt("OLD_COOLING_SETPOINT");
        if (!oldCool || oldCool.trim() === "") return;

        const oldHeat = await customPrompt("OLD_HEATING_SETPOINT");
        if (!oldHeat || oldHeat.trim() === "") return;

        const newCool = await customPrompt("NEW_COOLING_SETPOINT");
        if (!newCool || newCool.trim() === "") return;

        const newHeat = await customPrompt("NEW_HEATING_SETPOINT");
        if (!newHeat || newHeat.trim() === "") return;

        const unit = await customPrompt("RTU_NUMBER");
        if (!unit || unit.trim() === "") return;

        const note = `Changed setpoint to ${newCool.trim()}°/${newHeat.trim()}° for RTU ${unit.trim()} from ${oldCool.trim()}°/${oldHeat.trim()}°.`;
        addQuickNote(note);
      }

      async function addTestNote() {
        const component = await customPrompt("TEST_COMPONENT");
        if (component && component.trim() !== "") {
          addQuickNote("Tested " + component.trim() + ".");
          // Tag analysis is handled by addQuickNote
        }
      }

      async function addMonitorNote() {
        const instruction = await customPrompt("MONITOR_INSTRUCTION");
        if (instruction && instruction.trim() !== "") {
          addQuickNote("Advised to monitor " + instruction.trim() + ".");
        }
      }

      async function showContactOptions() {
        const contacts = [
          "Docfit",
          "Service Channel",
          "Copeland",
          "Sporlan",
          "FS Manager",
          "InSource",
          "Remodel Support",
          "Other",
        ];

        let message = "Select who to contact:\n\n";
        contacts.forEach((contact, index) => {
          message += `${index + 1}. ${contact}\n`;
        });

        const choice = await customPrompt("CONTACT_SELECTION", {
          message: message,
        });

        if (choice && choice.trim() !== "") {
          const choiceNum = parseInt(choice.trim());
          if (choiceNum >= 1 && choiceNum <= 7) {
            addQuickNote(
              "Advised tech to contact " + contacts[choiceNum - 1] + ".",
            );
            // Tag analysis is handled by addQuickNote
          } else if (choiceNum === 8) {
            const customContact = await customPrompt("CUSTOM_CONTACT");
            if (customContact && customContact.trim() !== "") {
              addQuickNote(
                "Advised tech to contact " + customContact.trim() + ".",
              );
              // Tag analysis is handled by addQuickNote
            }
          }
        }
      }

      async function addContactNote() {
        const contact = await customPrompt("CONTACT_DETAILS");
        if (contact && contact.trim() !== "") {
          addQuickNote("Advised tech to contact " + contact.trim() + ".");
        }
      }

      async function addReplaceNote() {
        const rackContext = getCurrentRackContext();
        const rackPrefix = rackContext ? ` on ${rackContext}` : "";

        const component = await customPrompt("REPLACE_COMPONENT");
        if (component && component.trim() !== "") {
          addQuickNote(`Advised to replace ${component.trim()}${rackPrefix}.`);
          // Tag analysis is handled by addQuickNote
        }
      }

      async function addEscalateNote() {
        // Get the selected DAE option
        const daeSelect = document.getElementById("autofill");
        const selectedDAE = daeSelect.value;

        let daeText = "Created DAE";
        if (selectedDAE && selectedDAE.trim() !== "") {
          // Extract short name from dropdown text
          // For example, "Help Desk Post (For Emergencies or Urgent Issues)" -> "Help Desk Post"
          let shortName = selectedDAE;
          if (selectedDAE.includes("(")) {
            shortName = selectedDAE
              .substring(0, selectedDAE.indexOf("("))
              .trim();
          }

          // Check if we have a staging type stored
          if (window.AppState && window.AppState.stagingType) {
            if (shortName.includes("Staging Changes")) {
              shortName = window.AppState.stagingType + " Staging Changes";
            }
          }

          daeText = "Created " + shortName + " DAE";
        }

        // Prompt for work order number
        const workOrder = await customPrompt(
          "Enter Work Order number:",
          "",
          "Work Order",
        );

        if (workOrder && workOrder.trim() !== "") {
          addQuickNote(daeText + ". Created WO: " + workOrder.trim() + ".");
          // Tag analysis is handled by addQuickNote
        } else if (workOrder === "") {
          // If WO is empty string (user clicked OK with empty field), just add the DAE part
          addQuickNote(daeText + ".");
          // Tag analysis is handled by addQuickNote
        }
        // If workOrder is null (user clicked Cancel), do nothing
      }

      async function addModCommLossNote() {
        const modules = await customPrompt(
          "Enter modules in Comm Loss:\n\n(Separate multiple modules with commas)",
          "",
          "Modules in Comm Loss",
        );
        if (modules && modules.trim() !== "") {
          addQuickNote(
            "Checked Module Comms. Still in mod comm loss. Modules in Comm Loss: " +
              modules.trim() +
              ".",
          );
        }
      }

      async function addForcedFanNote() {
        const rackContext = getCurrentRackContext();
        const rackSuffix = rackContext ? ` on ${rackContext}` : "";

        const choice = await customConfirm(
          'Click OK to specify RTU(s), or Cancel for "all RTUs"',
          "Forced Fan",
        );
        if (choice) {
          const rtu = await customPrompt(
            "Enter RTU number(s):",
            "",
            "RTU Number(s)",
          );
          if (rtu && rtu.trim() !== "") {
            addQuickNote(
              `Set Fan to Continuous for RTU ${rtu.trim()}${rackSuffix}.`,
            );
          }
        } else {
          addQuickNote(`Set Fan to Continuous for all RTUs${rackSuffix}.`);
        }
      }

      async function addSetbackNote() {
        const rackContext = getCurrentRackContext();
        const rackSuffix = rackContext ? ` on ${rackContext}` : "";

        const action = await customPrompt(
          "Enter action:\n\n1 - Set Setback\n2 - Disable Setback\n\nEnter 1 or 2:",
          "",
          "Setback Action",
        );

        if (action === "1") {
          const coolTemp = await customPrompt(
            "Enter cooling setback:\n\nExample: 72 (degree symbol added automatically)",
            "",
            "Cooling Setback",
          );
          if (!coolTemp || coolTemp.trim() === "") return;

          const heatTemp = await customPrompt(
            "Enter heating setback:\n\nExample: 68 (degree symbol added automatically)",
            "",
            "Heating Setback",
          );
          if (!heatTemp || heatTemp.trim() === "") return;

          const rtu = await customPrompt(
            "Enter RTU number(s) (or leave blank for all):",
            "",
            "RTU Number(s)",
          );
          if (rtu !== null && rtu.trim() !== "") {
            addQuickNote(
              `Set Setback to ${coolTemp.trim()}°/${heatTemp.trim()}° for RTU ${rtu.trim()}${rackSuffix}.`,
            );
          } else if (rtu === "") {
            addQuickNote(
              `Set Setback to ${coolTemp.trim()}°/${heatTemp.trim()}° for all RTUs${rackSuffix}.`,
            );
          }
        } else if (action === "2") {
          const rtu = await customPrompt(
            "Enter RTU number(s) (or leave blank for all):",
            "",
            "RTU Number(s)",
          );
          if (rtu !== null && rtu.trim() !== "") {
            addQuickNote(
              `Disabled Setback for RTU ${rtu.trim()}${rackSuffix}.`,
            );
          } else if (rtu === "") {
            addQuickNote(`Disabled Setback for all RTUs${rackSuffix}.`);
          }
        }
      }

      async function addRackSettingsNote() {
        const rackContext = getCurrentRackContext();
        const rackSuffix = rackContext ? ` on ${rackContext}` : "";

        const setting = await customPrompt(
          "What did you change?\n\nExamples:\n• Suction PSI\n• Discharge PSI\n• Differential settings\n• Temperature setpoints",
          "",
          "Rack Settings Changed",
        );
        if (setting && setting.trim() !== "") {
          addQuickNote(
            `Changed Rack Settings per Parameter Guide. Changed: ${setting.trim()}${rackSuffix}.`,
          );
        }
      }

      async function addCaseSettingsNote() {
        const rackContext = getCurrentRackContext();
        const rackSuffix = rackContext ? ` on ${rackContext}` : "";

        const setting = await customPrompt(
          "What did you change?\n\nExamples:\n• Defrosts per day\n• Termination Setpoint\n• Termination Temperature\n• Defrost duration",
          "",
          "Case Settings Changed",
        );
        if (setting && setting.trim() !== "") {
          addQuickNote(
            `Changed Case Settings per Crystal. Changed: ${setting.trim()}${rackSuffix}.`,
          );
        }
      }

      function addPowerCycleNote() {
        const rackContext = getCurrentRackContext();
        const rackSuffix = rackContext ? ` on ${rackContext}` : "";

        const selectedSystem = AppState.selectedSystem;

        // Check if Opus system
        if (selectedSystem === "Opus Arch" || selectedSystem === "Opus Mag") {
          addQuickNote(
            `Adv tech to power cycle controller, 15 min down, 15 min up${rackSuffix}.`,
          );
        } else {
          addQuickNote(`Adv tech to power cycle controller${rackSuffix}.`);
        }
      }

      function addDownloadNote(noteText) {
        const rackContext = getCurrentRackContext();

        // If we have rack context, append it to the note
        if (rackContext) {
          // Remove trailing period if present, add rack context, then add period
          const cleanedNote = noteText.trim().replace(/\.$/, "");
          addQuickNote(`${cleanedNote} on ${rackContext}.`);
        } else {
          addQuickNote(noteText);
        }

        // Auto-select HVAC tag for all Downloads
        selectTagByName("HVAC");
      }

      // ============= Quick Notes Accordion System =============

      // Toggle accordion group collapse/expand
      function toggleAccordion(headerElement) {
        const accordionGroup = headerElement.parentElement;
        const isCollapsed = accordionGroup.classList.toggle("collapsed");

        // Save state to localStorage
        const groupName = accordionGroup.getAttribute("data-group");
        if (groupName) {
          const collapsedGroups = JSON.parse(
            localStorage.getItem("collapsedAccordionGroups") || "[]",
          );

          if (isCollapsed) {
            if (!collapsedGroups.includes(groupName)) {
              collapsedGroups.push(groupName);
            }
          } else {
            const index = collapsedGroups.indexOf(groupName);
            if (index > -1) {
              collapsedGroups.splice(index, 1);
            }
          }

          localStorage.setItem(
            "collapsedAccordionGroups",
            JSON.stringify(collapsedGroups),
          );
        }
      }

      // Restore accordion collapse state from localStorage
      function restoreAccordionState() {
        try {
          const collapsedGroups = JSON.parse(
            localStorage.getItem("collapsedAccordionGroups") || "[]",
          );

          collapsedGroups.forEach((groupName) => {
            const group = document.querySelector(
              `.accordion-group[data-group="${groupName}"]`,
            );
            if (group) {
              group.classList.add("collapsed");
            }
          });
        } catch (error) {
          console.error("Error restoring accordion state:", error);
        }
      }

      // ============= Sub-Category System =============

      // Track current sub-categories for synchronization
      const SubCategoryState = {
        diagnostics: "hvac",
        actions: "hvac",
      };

      // Switch sub-category within a group
      function switchSubCategory(group, category) {
        // Update state
        SubCategoryState[group] = category;

        // Hide ping buttons when switching sub-categories
        hidePingButtons();

        // Get the accordion group
        const accordionGroup = document.querySelector(
          `.accordion-group[data-group="${group}"]`,
        );
        if (!accordionGroup) return;

        // Update tab buttons
        const tabs = accordionGroup.querySelectorAll(".sub-category-btn");
        tabs.forEach((tab) => {
          if (tab.textContent.toLowerCase() === category) {
            tab.classList.add("active");
          } else {
            tab.classList.remove("active");
          }
        });

        // Update content visibility
        const contents = accordionGroup.querySelectorAll(
          ".sub-category-content",
        );
        contents.forEach((content) => {
          if (content.getAttribute("data-subcategory") === category) {
            content.classList.add("active");
          } else {
            content.classList.remove("active");
          }
        });

        // Auto-set tag based on category
        const tagMap = {
          hvac: "HVAC",
          lighting: "Lighting",
          refrigeration: "Refrigeration",
        };

        const tagToSelect = tagMap[category];
        if (tagToSelect) {
          selectTagByName(tagToSelect);
        }

        // If switching diagnostics, auto-sync actions (smart automation)
        if (group === "diagnostics") {
          switchSubCategory("actions", category);
        }

        // Update conditional buttons visibility based on selected system
        updateConditionalButtons();
      }

      // Select a tag programmatically
      function selectTagByName(tagName) {
        // Directly add to AppState without requiring DOM element
        if (!AppState.selectedTags.has(tagName)) {
          AppState.selectedTags.add(tagName);

          // Update visual state if tag exists in DOM
          const tagElements = document.querySelectorAll(".tag-item");
          tagElements.forEach((element) => {
            if (element.textContent.trim() === tagName) {
              element.classList.add("selected");
            }
          });

          // Show notification
          showNotification(`Selected tag: ${tagName}`, "success", 1500);
        }
      }

      // ============= Display Rules System =============

      // Configuration for conditional display logic
      // This is parsed by the Generator to populate the Display Rules tab
      const DISPLAY_RULES = [
        {
          condition: "AppState.selectedSystem === 'Novar'",
          action: "show",
          target: ".system-novar",
        },
        {
          condition:
            "AppState.selectedSystem === 'Opus Arch' || AppState.selectedSystem === 'Opus Mag' || AppState.selectedSystem === 'CPC'",
          action: "show",
          target: ".system-opus-cpc",
        },
      ];

      // Update conditional button visibility based on system selection
      function updateConditionalButtons() {
        const selectedSystem = AppState.selectedSystem;

        // Apply configured rules
        if (typeof DISPLAY_RULES !== "undefined") {
          DISPLAY_RULES.forEach((rule) => {
            try {
              // Evaluate condition
              // We use a safe evaluation wrapper
              const checkCondition = new Function(
                "AppState",
                "selectedSystem",
                `return ${rule.condition}`,
              );
              const isMatch = checkCondition(AppState, selectedSystem);

              const elements = document.querySelectorAll(rule.target);
              elements.forEach((el) => {
                if (rule.action === "show") {
                  el.style.display = isMatch ? "" : "none";
                } else if (rule.action === "hide") {
                  el.style.display = isMatch ? "none" : "";
                } else if (rule.action === "enable") {
                  el.disabled = !isMatch;
                } else if (rule.action === "disable") {
                  el.disabled = isMatch;
                }
              });
            } catch (e) {
              console.warn("Error applying display rule:", rule, e);
            }
          });
        }

        // Legacy/Hardcoded logic (preserved for safety, though rules above cover it)
        // Show/hide Clocks buttons (Novar only)
        /* 
            const clockButtons = document.querySelectorAll('.system-novar');
            clockButtons.forEach(btn => {
                btn.style.display = selectedSystem === 'Novar' ? '' : 'none';
            });
            */
      }

      // Show ping buttons when Comms button is clicked
      function showPingButtons() {
        const pingButtons = document.querySelectorAll(".ping-button");
        pingButtons.forEach((btn) => {
          btn.style.display = "";
        });
      }

      // Hide ping buttons
      function hidePingButtons() {
        const pingButtons = document.querySelectorAll(".ping-button");
        pingButtons.forEach((btn) => {
          btn.style.display = "none";
        });
      }

      // Helper function for Staging note (determines DAE based on user selection)
      async function addStagingNote() {
        const choice = await customPrompt(
          "Staging for:\n1. Compressor\n2. Condenser\n\nEnter 1 or 2:",
          "",
          "Staging Type",
        );

        if (choice === "1") {
          addQuickNote("Checked compressor staging.");
          // Store staging type in AppState for use in Escalate button
          if (!window.AppState) window.AppState = {};
          window.AppState.stagingType = "Compressor";
          // Auto-select "Condenser and Compressor Staging Changes" DAE
          selectDAEByName("Condenser and Compressor Staging Changes");
        } else if (choice === "2") {
          addQuickNote("Checked condenser staging.");
          // Store staging type in AppState for use in Escalate button
          if (!window.AppState) window.AppState = {};
          window.AppState.stagingType = "Condenser";
          // Auto-select "Condenser and Compressor Staging Changes" DAE
          selectDAEByName("Condenser and Compressor Staging Changes");
        }
      }

      // Select DAE dropdown option by name
      function selectDAEByName(daeName) {
        const daeSelect = document.getElementById("autofill");
        if (!daeSelect) return;

        for (let i = 0; i < daeSelect.options.length; i++) {
          if (daeSelect.options[i].text === daeName) {
            daeSelect.selectedIndex = i;
            daeSelect.value = daeName;
            break;
          }
        }
      }

      // ============= Custom Modal System =============

      let currentModal = null;
      let modalResolve = null;

      // Show custom modal (replaces window.prompt and window.confirm)
      function showModal(options) {
        return new Promise((resolve) => {
          modalResolve = resolve;

          // Create modal if it doesn't exist
          let modalOverlay = document.getElementById("custom-modal-overlay");
          if (!modalOverlay) {
            modalOverlay = document.createElement("div");
            modalOverlay.id = "custom-modal-overlay";
            modalOverlay.className = "modal-overlay";
            document.body.appendChild(modalOverlay);
          }

          // Build modal content
          const modalContent = document.createElement("div");
          modalContent.className = "modal-content";

          const modalHeader = document.createElement("div");
          modalHeader.className = "modal-header";
          modalHeader.textContent = options.title || "Input Required";

          const modalBody = document.createElement("div");
          modalBody.className = "modal-body";

          // Format message with proper list formatting
          const message = options.message || "";

          // Always process messages that contain line breaks
          const parts = message.split("\n\n");
          parts.forEach((part, index) => {
            const lines = part.split("\n");
            let listContainer = null;
            let isNumberedList = false;

            lines.forEach((line) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return; // Skip empty lines

              // Detect if this is a numbered list item (1. or 1 - or 1) formats)
              const isNumbered = /^\d+[\.\-\)]\s/.test(trimmedLine);
              const isBulleted =
                trimmedLine.startsWith("• ") ||
                (trimmedLine.startsWith("- ") && !/^\d+\s*-/.test(trimmedLine));

              if (isNumbered || isBulleted) {
                // This is a list item
                if (!listContainer || isNumbered !== isNumberedList) {
                  // Create new list container (ol for numbered, ul for bullets)
                  listContainer = document.createElement(
                    isNumbered ? "ol" : "ul",
                  );
                  listContainer.style.marginLeft = "20px";
                  listContainer.style.marginTop = "8px";
                  listContainer.style.marginBottom = "8px";
                  modalBody.appendChild(listContainer);
                  isNumberedList = isNumbered;
                }
                const listItem = document.createElement("li");
                // Remove number/bullet prefix (handles 1. or 1 - or 1) or • or - formats)
                listItem.textContent = trimmedLine
                  .replace(/^[•\-]\s+/, "")
                  .replace(/^\d+[\.\-\)]\s+/, "");
                listItem.style.marginBottom = "4px";
                listContainer.appendChild(listItem);
              } else {
                // Regular text line
                listContainer = null; // Reset list container
                const textNode = document.createElement("p");
                textNode.textContent = trimmedLine;
                textNode.style.margin = "0 0 8px 0";
                modalBody.appendChild(textNode);
              }
            });

            // Add spacing between sections
            if (index < parts.length - 1 && part.trim()) {
              const spacer = document.createElement("div");
              spacer.style.height = "8px";
              modalBody.appendChild(spacer);
            }
          });

          const modalButtons = document.createElement("div");
          modalButtons.className = "modal-buttons";

          let inputElement = null;

          // Add input field if needed (for prompt-style modals)
          if (options.input) {
            inputElement = document.createElement("input");
            inputElement.type = "text";
            inputElement.className = "modal-input";
            inputElement.placeholder = options.placeholder || "";
            inputElement.value = options.defaultValue || "";
            modalBody.appendChild(inputElement);

            // Focus input after modal shows
            setTimeout(() => inputElement.focus(), 100);

            // Allow Enter key to submit
            inputElement.addEventListener("keydown", (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmBtn.click();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelBtn.click();
              }
            });
          }

          // Create buttons
          const confirmBtn = document.createElement("button");
          confirmBtn.className = "modal-btn modal-btn-primary";
          confirmBtn.textContent = options.confirmText || "OK";
          confirmBtn.onclick = () => {
            const result = inputElement ? inputElement.value : true;
            hideModal(result);
          };

          const cancelBtn = document.createElement("button");
          cancelBtn.className = "modal-btn modal-btn-secondary";
          cancelBtn.textContent = options.cancelText || "Cancel";
          cancelBtn.onclick = () => {
            hideModal(options.input ? null : false);
          };

          modalButtons.appendChild(cancelBtn);
          modalButtons.appendChild(confirmBtn);

          // Assemble modal
          modalContent.appendChild(modalHeader);
          modalContent.appendChild(modalBody);
          modalContent.appendChild(modalButtons);

          modalOverlay.innerHTML = "";
          modalOverlay.appendChild(modalContent);

          // Show modal
          setTimeout(() => modalOverlay.classList.add("show"), 10);

          // Close on overlay click
          modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
              hideModal(options.input ? null : false);
            }
          };

          currentModal = modalOverlay;
        });
      }

      // Hide modal and return result
      function hideModal(result) {
        if (currentModal) {
          currentModal.classList.remove("show");
          setTimeout(() => {
            if (currentModal) {
              currentModal.remove();
              currentModal = null;
            }
            // Resolve AFTER modal is completely removed
            if (modalResolve) {
              modalResolve(result);
              modalResolve = null;
            }
          }, 200); // Match the CSS transition duration
        } else {
          // No modal to hide, resolve immediately
          if (modalResolve) {
            modalResolve(result);
            modalResolve = null;
          }
        }
      }

      // Helper functions to replace window.prompt and window.confirm
      async function customPrompt(
        messageOrKey,
        defaultValueOrReplacements = "",
        title = "Input Required",
      ) {
        let message = messageOrKey;
        let finalDefaultValue = defaultValueOrReplacements;
        let finalTitle = title;

        // Check registry
        if (
          typeof MODAL_REGISTRY !== "undefined" &&
          MODAL_REGISTRY[messageOrKey]
        ) {
          const config = MODAL_REGISTRY[messageOrKey];
          message = config.message;
          finalTitle = config.title;
          finalDefaultValue = config.defaultValue;

          if (
            typeof defaultValueOrReplacements === "object" &&
            defaultValueOrReplacements !== null
          ) {
            const replacements = defaultValueOrReplacements;
            Object.entries(replacements).forEach(([key, value]) => {
              message = message.replace(new RegExp(`{${key}}`, "g"), value);
            });
          } else if (
            typeof defaultValueOrReplacements === "string" &&
            defaultValueOrReplacements !== ""
          ) {
            finalDefaultValue = defaultValueOrReplacements;
          }
        }

        return await showModal({
          title: finalTitle,
          message: message,
          input: true,
          defaultValue: finalDefaultValue,
          placeholder: "Enter value...",
          confirmText: "OK",
          cancelText: "Cancel",
        });
      }

      async function customConfirm(message, title = "Confirm") {
        return await showModal({
          title: title,
          message: message,
          input: false,
          confirmText: "Yes",
          cancelText: "No",
        });
      }

      // Enhanced notes updating with validation
      function updateNotes() {
        try {
          const selectedOption = document.getElementById("autofill").value;
          if (!selectedOption) return;

          const notesBox = document.getElementById("dropdown-notes");
          const selectedText = DAE_TEMPLATES[selectedOption] || "";

          if (!selectedText) {
            showNotification("Template not found", "error");
            return;
          }

          // Use helper for overwrite confirmation
          if (shouldOverwriteDAENotes(notesBox)) {
            // Get store number and work order for DAE inclusion
            const storeNumber =
              document.getElementById("store-number").value.trim() || "N/A";
            const workOrder =
              document.getElementById("work-order").value.trim() || "N/A";

            // Insert template with store/work order info
            let templateContent = selectedText;

            // Replace placeholders in template if they exist
            templateContent = templateContent.replace(
              /Store #[\s]*/,
              `Store # ${storeNumber}\n`,
            );
            templateContent = templateContent.replace(
              /WO#[\s]*-[\s]*/,
              `WO# - ${workOrder}\n`,
            );
            templateContent = templateContent.replace(
              /WO:[\s]*/,
              `WO: ${workOrder}\n`,
            );
            templateContent = templateContent.replace(
              /Store number:[\s]*/,
              `Store number: ${storeNumber}\n`,
            );

            // If template doesn't have store/WO placeholders, add them at the beginning for specific templates
            if (
              !templateContent.includes("Store #") &&
              !templateContent.includes("Store number:")
            ) {
              if (selectedOption.includes("Help Desk Post")) {
                templateContent = templateContent.replace(
                  /Store #[\s]*/,
                  `Store # ${storeNumber}\n`,
                );
                templateContent = templateContent.replace(
                  /WO#[\s]*-[\s]*/,
                  `WO# - ${workOrder}\n`,
                );
              } else {
                templateContent =
                  `Store number: ${storeNumber}\nWO: ${workOrder}\n\n` +
                  templateContent;
              }
            }

            notesBox.value = templateContent;
            notesBox.dataset.userEdited = "false";

            showNotification(
              "Template loaded with store/WO info",
              "success",
              1500,
            );

            // Update tag recommendations after loading template
            analyzeNotesForTags();
          }
        } catch (error) {
          console.error("Failed to update notes:", error);
          showNotification("Failed to load template", "error");
        }
      }

      // Enhanced clipboard functionality
      async function copyToClipboard(event, elementId) {
        const button = event.target;
        try {
          const element = document.getElementById(elementId);

          if (!element) {
            throw new Error("Element not found");
          }

          const textToCopy = element.value.trim();

          if (!textToCopy) {
            showNotification("Nothing to copy", "error");
            return;
          }

          button.disabled = true;
          button.classList.add("loading");

          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textToCopy);
          } else {
            // Fallback for older browsers
            element.select();
            document.execCommand("copy");
          }

          addButtonFeedback(button, "success");
          showNotification("Copied to clipboard!", "success");
        } catch (error) {
          console.error("Copy failed:", error);
          addButtonFeedback(button, "error");
          showNotification("Failed to copy to clipboard", "error");
        } finally {
          button.disabled = false;
          button.classList.remove("loading");
        }
      }

      async function copyAdditionalNotes(event) {
        try {
          const button = event.target;
          const formData = getFormData();

          // Build the new format: "Tech_name | EMS | Store_Number | WO: Work_Order_Number - Rest of notes"
          const randomTechNames = [
            // Anglo/European
            "John",
            "Michael",
            "William",
            "James",
            "Robert",
            "David",
            "Richard",
            "Joseph",
            "Charles",
            "Thomas",
            // Hispanic/Latino
            "Mateo",
            "Santiago",
            "Diego",
            "Alejandro",
            "Miguel",
            "Javier",
            "Carlos",
            "Jose",
            "Luis",
            "Juan",
            // African/African-American
            "Jamal",
            "Malik",
            "Andre",
            "DeAndre",
            "Tyrone",
            "Tariq",
            "Desmond",
            "Marquis",
            "Jerome",
            "Tremaine",
            // East Asian
            "Wei",
            "Jian",
            "Hiroshi",
            "Kenji",
            "Takashi",
            "Chen",
            "Jin",
            "Akira",
            "Daiki",
            "Taro",
            // Middle Eastern / South Asian
            "Muhammad",
            "Ali",
            "Ahmed",
            "Omar",
            "Yusuf",
            "Hassan",
            "Ibrahim",
            "Mustafa",
            "Amir",
            "Hamza",
          ];
          const defaultTechName =
            randomTechNames[Math.floor(Math.random() * randomTechNames.length)];
          const techName = formData.techName || defaultTechName;

          // Track all systems connected during the call
          let systemsArray = AppState.connectedSystems
            ? Array.from(AppState.connectedSystems)
            : [];
          if (
            systemsArray.length === 0 &&
            AppState.selectedSystem &&
            AppState.selectedSystem !== "None"
          ) {
            systemsArray.push(AppState.selectedSystem);
          }
          const systemsStr =
            systemsArray.length > 0 ? systemsArray.join(", ") : "N/A";

          const storeNumber = formData.storeNumber || "N/A";
          const workOrder = formData.workOrder || "N/A";
          const notes = formData.notes || "";

          // Parse notes to auto-learn circuits assigned to racks
          if (storeNumber !== "N/A" && notes) {
            parseNotesForEmsMapping(notes, storeNumber);
          }

          // Format: Tech | EMS | Store | WO: Number - Notes
          const formattedNote = `${techName} | ${systemsStr} | ${storeNumber} | WO: ${workOrder}${notes ? " - " + notes : ""}`;

          if (
            !techName &&
            storeNumber === "N/A" &&
            workOrder === "N/A" &&
            !notes
          ) {
            showNotification("No data to copy", "error");
            button.disabled = false;
            button.classList.remove("loading");
            return;
          }

          button.disabled = true;
          button.classList.add("loading");

          // Always save current state first
          const saveResult = saveNotesHistory(false); // This will update existing note or create new one

          // Clear current note ID so next typing session creates a new note
          AppState.currentNoteId = null;
          AppState.lastSavedData = null;
          updateNoteStatus();

          const success = true; // saveNotesHistory already called above

          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(formattedNote);
          } else {
            // Fallback
            const tempTextarea = document.createElement("textarea");
            tempTextarea.value = formattedNote;
            document.body.appendChild(tempTextarea);
            tempTextarea.select();
            document.execCommand("copy");
            document.body.removeChild(tempTextarea);
          }

          addButtonFeedback(button, "success");
          showNotification(
            success ? "Copied and saved to history!" : "Copied successfully!",
            "success",
          );
        } catch (error) {
          console.error("Copy failed:", error);
          addButtonFeedback(event.target, "error");
          showNotification("Failed to copy", "error");
        } finally {
          const button = event.target;
          button.disabled = false;
          button.classList.remove("loading");
        }
      }

      // Show/hide button groups based on system selection
      
      function selectSystem(system) {
        /* [INJECTED OPUS EVENT] */
        console.log("selectSystem called with", system);
        if (system === 'Opus Arch' || system === 'Opus Architect' || system === 'Opus Mag' || system === 'Opus Magnum') {
            const storeNum = document.getElementById("store-number").value.trim();
            const rackName = AppState.currentRack ? (typeof AppState.currentRack === "object" ? AppState.currentRack.name : AppState.currentRack) : "Unknown";
            console.log("Opus detected! storeNum:", storeNum, "rackName:", rackName);
            if (storeNum) {
                console.log("Dispatching opusClassified event");
                window.dispatchEvent(new CustomEvent('opusClassified', { 
                    detail: { storeId: parseInt(storeNum), rackName: rackName, emsType: system } 
                }));
            }
        }
    
        AppState.selectedSystem = system;
        if (system && system !== "None") {
          if (!AppState.connectedSystems) AppState.connectedSystems = new Set();
          AppState.connectedSystems.add(system);
        }

        // Show Downloads only for Novar
        const downloadsSection = document.getElementById("downloads-section");
        if (downloadsSection) {
          downloadsSection.style.display =
            system === "Novar" ? "block" : "none";
        }

        // Show all system-dependent accordion groups when any system is selected
        const hiddenGroups = document.querySelectorAll(
          ".accordion-group.hidden-until-system",
        );
        hiddenGroups.forEach((group) => {
          group.style.display = "block";
        });

        // Special handling for AKA65: Only show HVAC and Lighting sub-categories
        if (system === "AKA65") {
          // Hide Refrigeration tab in Actions
          const refrigerationTab = document.querySelector(
            '.sub-category-tabs button[data-tag="Refrigeration"]',
          );
          const refrigerationContent = document.querySelector(
            '.sub-category-content[data-subcategory="refrigeration"]',
          );

          if (refrigerationTab) {
            refrigerationTab.style.display = "none";
          }
          if (refrigerationContent) {
            refrigerationContent.style.display = "none";
          }

          // Ensure HVAC tab is active for AKA65
          switchSubCategory("actions", "hvac");
        } else {
          // Show all tabs for other systems
          const refrigerationTab = document.querySelector(
            '.sub-category-tabs button[data-tag="Refrigeration"]',
          );
          if (refrigerationTab) {
            refrigerationTab.style.display = "inline-block";
          }
        }

        // Hide ping buttons when switching systems
        hidePingButtons();

        // Update conditional button visibility
        updateConditionalButtons();

        console.log("Selected system:", system);

        // Auto-map if possible
        if (typeof updateEmsInsightsPanel === "function") {
          updateEmsInsightsPanel();
        }
      }

      // Show Downloads section (triggered by Novar button)
      function showDownloadsSection() {
        selectSystem("Novar");
      }

      // Hide Downloads section (triggered by clearing form)
      function hideDownloadsSection() {
        const downloadsSection = document.getElementById("downloads-section");
        if (downloadsSection) {
          downloadsSection.style.display = "none";
        }
        AppState.selectedSystem = null;

        // Hide all system-dependent accordion groups
        const hiddenGroups = document.querySelectorAll(
          ".accordion-group.hidden-until-system",
        );
        hiddenGroups.forEach((group) => {
          group.style.display = "none";
        });
      }

      // Enhanced form management
      function clearFormFields() {
        try {
          const fields = [
            "tech-name",
            "store-number",
            "work-order",
            "notes",
            "dropdown-notes",
            "quick-notes-rack",
            "quick-notes-circuit",
          ];
          fields.forEach((id) => {
            const element = document.getElementById(id);
            if (element) element.value = "";
          });

          const dropdownNotes = document.getElementById("dropdown-notes");
          if (dropdownNotes) dropdownNotes.dataset.userEdited = "false";

          const selects = ["autofill", "history"];
          selects.forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
              element.selectedIndex = 0;
              element.value = "";
            }
          });

          // Clear selected tags
          AppState.selectedTags.clear();
          displayRecommendedTags([]);

          // Clear connected systems
          if (AppState.connectedSystems) AppState.connectedSystems.clear();

          // Reset note tracking for new call
          AppState.currentNoteId = null;
          AppState.lastSavedData = null;
          updateNoteStatus();

          // Clear infraction display
          clearInfractionDisplay();
          
          // Clear service channel overlay logic
          clearServiceChannelDetails();

          // Clear current rack
          AppState.currentRack = null;
          updateRackDisplay();

          // Hide Downloads section
          hideDownloadsSection();

          // Hide ping buttons
          hidePingButtons();

          showNotification("Form cleared", "success", 1500);
          clearAutoSave();
        } catch (error) {
          console.error("Failed to clear form:", error);
          showNotification("Failed to clear form", "error");
        }
      }

      function clearForm() {
        if (
          !confirm(
            "This will clear all form data AND delete all saved history. Are you sure?",
          )
        ) {
          return;
        }

        try {
          clearFormFields();
          localStorage.removeItem("notesHistory");
          updateHistoryDropdown();
          // Reset note tracking completely
          AppState.currentNoteId = null;
          AppState.lastSavedData = null;
          updateNoteStatus();

          // Clear infraction display
          clearInfractionDisplay();
          
          // Clear service channel overlay logic
          clearServiceChannelDetails();

          // Clear current rack
          AppState.currentRack = null;
          updateRackDisplay();

          // Hide button groups
          hideDownloadsSection();

          showNotification("Everything cleared", "success");
        } catch (error) {
          console.error("Failed to clear everything:", error);
          showNotification("Failed to clear everything", "error");
        }
      }

      // Auto-save functionality
      function scheduleAutoSave() {
        clearTimeout(AppState.autoSaveTimer);
        AppState.autoSaveTimer = setTimeout(() => {
          const currentData = JSON.stringify(getFormData());
          if (
            currentData !== AppState.lastSavedData &&
            hasValidData(getFormData())
          ) {
            // Auto-save should update current note, not create new ones
            const success = saveNotesHistory(false); // false = update existing note if available
            if (success) {
              AppState.lastSavedData = currentData;
            }
          }
        }, 5000); // Auto-save after 5 seconds of inactivity
      }

      function clearAutoSave() {
        clearTimeout(AppState.autoSaveTimer);
        AppState.lastSavedData = null;
        // Don't clear currentNoteId here - let Copy Notes handle note finalization
      }

      // Function to start a new note (useful for new calls)
      function startNewNote() {
        AppState.currentNoteId = null;
        AppState.lastSavedData = null;
        AppState.currentNoteInfractions = []; // Clear infraction tracking for new note
        clearForm();
        updateNoteStatus();
        clearInfractionDisplay();
        showNotification(
          "Started new note - changes will auto-save to this note",
          "info",
          3000,
        );
      }

      // Function to display infraction information for a note
      function displayInfractionInfo(entry) {
        const infractionContainer = document.getElementById(
          "current-note-infractions",
        );
        if (!infractionContainer) return;

        const infractionCount =
          (entry.infractionLog && entry.infractionLog.length) || 0;

        if (infractionCount > 0) {
          let infractionHTML = `
                    <div class="infraction-info">
                        <h4>⚠️ Note Infractions (${infractionCount})</h4>
                        <div class="infraction-list">
                `;

          entry.infractionLog.forEach((infraction, index) => {
            infractionHTML += `
                        <div class="infraction-item">
                            <span class="infraction-number">#${infraction.sessionNumber}</span>
                            <span class="infraction-time">${infraction.timeOfDay} on ${infraction.date}</span>
                        </div>
                    `;
          });

          infractionHTML += `
                        </div>
                    </div>
                `;

          infractionContainer.innerHTML = infractionHTML;
          infractionContainer.style.display = "block";
        } else {
          clearInfractionDisplay();
        }
      }

      // Function to clear infraction display
      function clearServiceChannelDetails() {
          const scPanel = document.getElementById("servicechannel-details");
          if (scPanel) scPanel.style.display = "none";
          
          const scHostContainer = document.getElementById("sc-host-container");
          if (scHostContainer) scHostContainer.style.display = "none";
          
          const scModulesContainer = document.getElementById("sc-modules-container");
          if (scModulesContainer) scModulesContainer.style.display = "none";
      }

      function clearInfractionDisplay() {
        const infractionContainer = document.getElementById(
          "current-note-infractions",
        );
        if (infractionContainer) {
          infractionContainer.innerHTML = "";
          infractionContainer.style.display = "none";
        }
      }

      // Update UI to show current note status
      function updateNoteStatus() {
        const statusElement = document.querySelector(".note-status");
        if (statusElement) {
          if (AppState.currentNoteId) {
            statusElement.textContent = "✏️ Editing note (auto-saving)";
            statusElement.className = "note-status editing";
          } else {
            statusElement.textContent = "📝 New note ready";
            statusElement.className = "note-status new";
          }
        }
      }

      // Enhanced input validation
      function setupInputValidation() {
        const storeNumberInput = document.getElementById("store-number");
        if (storeNumberInput) {
          storeNumberInput.addEventListener("input", function (e) {
            const value = e.target.value;
            if (value && !/^\d+$/.test(value)) {
              // Optionally, you can set a custom validity message here
              // e.target.setCustomValidity('Please enter only numbers.');
            } else {
              e.target.setCustomValidity("");
            }
          });
        }
        // Add auto-save only to specific text inputs and textareas (not selects)
        const formInputs = [
          document.getElementById("tech-name"),
          document.getElementById("store-number"),
          document.getElementById("work-order"),
          document.getElementById("notes"),
          document.getElementById("dropdown-notes"),
        ].filter(Boolean);
        formInputs.forEach((input) => {
          input.addEventListener("input", function () {
            scheduleAutoSave();
            // Analyze notes for tag recommendations
            if (this.id === "notes" || this.id === "dropdown-notes") {
              analyzeNotesForTags();
            }
          });
        });
      }

      // Keyboard navigation enhancements
      function setupKeyboardNavigation() {
        // Theme toggle with keyboard
        document.addEventListener("keydown", function (e) {
          // Only trigger if not typing in an input field
          const isTyping =
            e.target.tagName === "INPUT" ||
            e.target.tagName === "TEXTAREA" ||
            e.target.tagName === "SELECT";

          if (!isTyping) {
            if (e.key === " " || e.key === "Spacebar") {
              e.preventDefault();
              if (!AppState.timerRunning) {
                startTimer();
              }
            }

            if (e.key === "r" || e.key === "R") {
              e.preventDefault();
              resetTimer();
            }

            if (e.key === "p" || e.key === "P") {
              e.preventDefault();
              pauseTimer();
            }

            if (e.key === "c" || e.key === "C") {
              e.preventDefault();
              resetCallDetection();
            }

            if (e.key === "u" || e.key === "U") {
              e.preventDefault();
              checkForUpdates();
            }
          }

          if (e.key === "F2") {
            e.preventDefault();
            toggleTheme();
          }

          // Quick copy with Ctrl+Shift+C
          if (e.ctrlKey && e.shiftKey && e.key === "C") {
            e.preventDefault();
            copyAdditionalNotes();
          }

          // GitHub token setup with Ctrl+Shift+G
          if (e.ctrlKey && e.shiftKey && e.key === "G") {
            e.preventDefault();
            setGitHubToken();
          }

          // Toggle keyboard shortcuts help with Ctrl+K
          if (e.ctrlKey && e.key === "k") {
            e.preventDefault();
            toggleKeyboardHelp();
          }
        });
      }

      
      // ====== ServiceChannel & IoT Proxy Integrations ======
      document.addEventListener("DOMContentLoaded", () => {
        const woInput = document.getElementById("work-order");
        const storeInput = document.getElementById("store-number");
        const techNameInput = document.getElementById("tech-name");

        if(woInput) {
          woInput.addEventListener("blur", () => {
            const woVal = woInput.value.trim();
            if(woVal) {
              window.dispatchEvent(new CustomEvent('fetchFromServiceChannel', { detail: { woId: woVal } }));
            }
          });
        }
        
        if(storeInput) {
          storeInput.addEventListener("blur", () => {
            const storeVal = storeInput.value.trim();
            if(storeVal) {
              window.dispatchEvent(new CustomEvent('fetchFromSAOne', { detail: { storeNumber: storeVal } }));
              window.dispatchEvent(new CustomEvent('fetchFromIOT', { detail: { storeNumber: storeVal } }));
            }
          });
        }

        window.addEventListener('serviceChannelDataReady', (e) => {
          if (e.detail && e.detail.error) {
              console.error("ServiceChannel Proxy Error:", e.detail.error);
              showNotification(`ServiceChannel Error: ${e.detail.error}`, 'error');
              return;
          }
          if (e.detail && e.detail.woData) {
            const woData = e.detail.woData;
            const data = e.detail.data;
            if(woData.store && storeInput && !storeInput.value) {
                  storeInput.value = woData.store;
                  // Trigger store events to fetch IoT/SAOne AND populate the EMS array natively
                  storeInput.dispatchEvent(new Event('blur'));
                  storeInput.dispatchEvent(new Event('input')); // This triggers updateEmsInsightsPanel natively
                  if (typeof updateEmsInsightsPanel === 'function') {
                      updateEmsInsightsPanel(); // Double guarantee for layout consistency
                  }
              }
            if(woData.trade) {
              // Setup Tech Name 
                const techInput = document.getElementById("tech-name");
                if (techInput && woData.techName && !techInput.value) {
                    techInput.value = woData.techName;
                }

                  // Setup Rack and Circuit with Database Verification
                  const rackInput = document.getElementById("quick-notes-rack");
                  const circuitInput = document.getElementById("quick-notes-circuit");
                  
                  let verifiedRackName = "";
                  let verifiedEmsType = "";
                  let verifiedHostAddr = "";
                  let verifiedCircuits = [];
                  
                  const uiStoreNum = document.getElementById("store-number") ? document.getElementById("store-number").value.trim() : "";
                  const storeToUse = uiStoreNum || woData.store;
                  if (window.mainDB && storeToUse) {
                      try {
                          // Search for the Rack based on partial MTF match
                          if (woData.rack) {
                              // We use the JSON extraction MTF, and search SQL for "Rack MTF" or just "%MTF%"
                              const cleanRackSearch = woData.rack.replace(/RACK\s+/g, "").trim(); 
                              const activeStoreNum = document.getElementById("store-number") ? (document.getElementById("store-number").value.trim() || woData.store) : woData.store;
                                  // Look for an exact match first, or a word match, so 'LTA' doesn't match 'CLTA'
                                  const rQuery = `SELECT rack_id, rack_name, ems_type, host_address FROM racks WHERE store_id=${parseInt(activeStoreNum)} AND (rack_name = '${cleanRackSearch}' OR rack_name LIKE '${cleanRackSearch} %' OR rack_name LIKE '% ${cleanRackSearch}' OR rack_name LIKE '% ${cleanRackSearch} %' OR rack_name = '${woData.rack}') LIMIT 1`;
                              const rRes = window.mainDB.exec(rQuery);
                              
                              if (rRes && rRes.length > 0 && rRes[0].values.length > 0) {
                                  const row = rRes[0].values[0];
                                  const rackId = row[0];
                                  verifiedRackName = row[1];
                                  verifiedEmsType = row[2];
                                  verifiedHostAddr = row[3];
                                  
                                  // Verify Circuits precisely against this specific rack ID
                                  if (woData.circuits) {
                                      const splits = woData.circuits.split(",").map(s => s.trim());
                                      for (let crc of splits) {
                                          // ServiceChannel might have "F2 IC DRS", but DB shows "F2"
                                          // Or ServiceChannel has "F02", DB has "F2" or "F02"
                                          // Let's do a LIKE query against circuit_name for this rack_id
                                          const cQuery = `SELECT circuit_name FROM circuits WHERE rack_id=${rackId} AND (circuit_name LIKE '%${crc}%' OR '${crc}' LIKE '%' || circuit_name || '%') LIMIT 1`;
                                          const cRes = window.mainDB.exec(cQuery);
                                          if (cRes && cRes.length > 0 && cRes[0].values.length > 0) {
                                              verifiedCircuits.push(cRes[0].values[0][0]);
                                          }
                                      }
                                  }
                              }
                          }
                      } catch(e) {
                          console.error("SQLite Verification Failed", e);
                      }
                  } else {
                      // Fallback if DB is not loaded natively
                      verifiedRackName = woData.rack;
                      verifiedCircuits = woData.circuits ? woData.circuits.split(',').map(s=>s.trim()) : [];
                  }
                  
                  if (rackInput && verifiedRackName && !rackInput.value) {
                      rackInput.value = verifiedRackName;
                      
                      // Trigger AppState change natively for EMS table and tag highlighting
                      if (typeof selectRackAndEms === "function") {
                          selectRackAndEms(verifiedRackName, verifiedEmsType || "");
                      } else {
                          AppState.currentRack = verifiedRackName;
                      }
                  }
                  
                  if (circuitInput && verifiedCircuits.length > 0 && !circuitInput.value) {
                      circuitInput.value = verifiedCircuits.join(", ");
                  }

                  showNotification(`ServiceChannel Data Pulled successfully for ${e.detail.woId}`);
                  
                  // Setup Status and Description
                  if (woData.status || woData.description) {
                      const scPanel = document.getElementById("servicechannel-details");
                      const scStatus = document.getElementById("sc-status");
                      const scPriority = document.getElementById("sc-priority");
                      const scDesc = document.getElementById("sc-description");
                      
                      if (scPanel) scPanel.style.display = "block";
                      
                      if (scStatus) {
                          if (woData.status && typeof woData.status === "object") {
                              scStatus.textContent = woData.status.Status || woData.status.StatusName || JSON.stringify(woData.status);
                          } else {
                              scStatus.textContent = woData.status || "Unknown";
                          }
                      }
                      
                      if (scPriority && woData.priority) {
                          scPriority.textContent = woData.priority;
                      } else if (scPriority) {
                          scPriority.textContent = "N/A";
                      }
                      
                      const scHostContainer = document.getElementById("sc-host-container");
                      const scHost = document.getElementById("sc-host");
                      if (scHostContainer && scHost) {
                          if (verifiedHostAddr) {
                              scHostContainer.style.display = "block";
                              scHost.textContent = verifiedHostAddr;
                          } else {
                              scHostContainer.style.display = "none";
                          }
                      }
                      
                      if (scDesc) {
                          scDesc.textContent = woData.description || "No description provided";
                      }
                      
                      if (woData.modulesWithSensors && woData.modulesWithSensors.length > 0) {
                          const scModulesContainer = document.getElementById("sc-modules-container");
                          if (scModulesContainer) {
                              scModulesContainer.style.display = "block";
                              scModulesContainer.innerHTML = '<strong>Associated Modules:</strong><br>';
                              woData.modulesWithSensors.forEach(modData => {
                                  // Append placeholders that iotDataReady can populate later if matched
                                  const safeMod = modData.module.replace(/\s+/g, '-');
                                  let htmlBlock = `<div id="sc-mod-${safeMod}" style="margin-top: 5px;">- ${modData.module}: <span class="mod-status" style="color:#aaa;">Pending IoT sync...</span></div>`;
                                  
                                  if (modData.sensors && modData.sensors.length > 0) {
                                      modData.sensors.forEach(sen => {
                                          const safeSen = sen.replace(/[^a-zA-Z0-9_-]/g, '-');
                                          htmlBlock += `<div id="sc-sen-${safeSen}" style="margin-left: 15px; margin-top: 2px;">- ${sen}: <span class="sen-status" style="color:#aaa;">Pending IoT sync...</span></div>`;
                                      });
                                  }
                                  
                                  scModulesContainer.innerHTML += htmlBlock;
                              });
                          }
                          // Manually kick off an IoT string check just in case we already have IoT payload cached
                          window.dispatchEvent(new CustomEvent('syncModulesWithIoT', { detail: { modules: woData.modules, sensors: woData.sensors, store: woData.store } }));

                      } else if (woData.modules && woData.modules.length > 0) {
                          const scModulesContainer = document.getElementById("sc-modules-container");
                          if (scModulesContainer) {
                              scModulesContainer.style.display = "block";
                              scModulesContainer.innerHTML = '<strong>Associated Points of Interest:</strong><br>';
                              woData.modules.forEach(mod => {
                                  // Append placeholders that iotDataReady can populate later if matched
                                  scModulesContainer.innerHTML += `<div id="sc-mod-${mod.replace(/\s+/g, '-')}">- ${mod}: <span class="mod-status" style="color:#aaa;">Pending IoT sync...</span></div>`;
                              });
                              if (woData.sensors && woData.sensors.length > 0) {
                                  woData.sensors.forEach(sen => {
                                      scModulesContainer.innerHTML += `<div id="sc-sen-${sen.replace(/[^a-zA-Z0-9_-]/g, '-')}">- Sensor [${sen}]: <span class="sen-status" style="color:#aaa;">Pending IoT sync...</span></div>`;
                                  });
                              }
                          }
                          // Manually kick off an IoT string check just in case we already have IoT payload cached
                          window.dispatchEvent(new CustomEvent('syncModulesWithIoT', { detail: { modules: woData.modules, sensors: woData.sensors, store: woData.store } }));
                      }
                  }
              }
            }
          });
        
        window.addEventListener('iotDataReady', (e) => {
           if(e.detail.data) {
                const storeId = e.detail.storeNumber;
                console.log("IoT Data received for", storeId);
                
                // Keep the global payload accessible for the module sync
                window._lastIotPayload = e.detail.data;
                
                // Immediately check if we have any pending UI placeholders waiting for sync
                const modContainer = document.getElementById("sc-modules-container");
                if (modContainer && modContainer.style.display !== "none") {
                    const pendingMods = Array.from(modContainer.querySelectorAll("div[id^='sc-mod-']"));
                    const pendingSensors = Array.from(modContainer.querySelectorAll("div[id^='sc-sen-']"));
                    let extractedMods = [];
                    let extractedSens = [];
                    if (pendingMods.length > 0) {
                        extractedMods = pendingMods.map(p => p.id.replace('sc-mod-', '').replace(/-/g, ' '));
                    }
                    if (pendingSensors.length > 0) {
                        extractedSens = pendingSensors.map(p => {
                            // Recover sensor name loosely from id, or better yet re-pull it from the text since IDs strip spaces
                            const textCont = p.textContent || p.innerText;
                            const match = textCont.match(/\[(.*?)\]/);
                            return match ? match[1] : p.id.replace('sc-sen-', '').replace(/-/g, ' ');
                        });
                    }
                    
                    if (extractedMods.length > 0 || extractedSens.length > 0) {
                        window.dispatchEvent(new CustomEvent('syncModulesWithIoT', { detail: { modules: extractedMods, sensors: extractedSens, store: storeId } }));
                    }
                }
           } 
        });

        // Dedicated listener to recursively traverse IoT JSON arrays natively and mutate the DOM directly!
        window.addEventListener('syncModulesWithIoT', (e) => {
             const mods = e.detail.modules || [];
             const sens = e.detail.sensors || [];
             const iotData = window._lastIotPayload;
             if ((mods.length === 0 && sens.length === 0) || !iotData) return;

             // Recursive tree walk to locate the exact label and read its variables
             const traverseIotTree = (node, searchStr) => {
                 if (node.label && node.label.toUpperCase().includes(searchStr.toUpperCase())) {
                     return node;
                 }
                 if (node.children && node.children.length > 0) {
                     for (let child of node.children) {
                         const found = traverseIotTree(child, searchStr);
                         if (found) return found;
                     }
                 }
                 return null;
             };
             
             const traverseIotTreeForSensor = (node, searchStr) => {
                 // The payload may have the sensor loosely floating as a full child node rather than an array of `variables` appended to a module
                 // E.g. { "label": "COMP 5 OIL L/O(RIM24)" }
                 if (node.label && node.label.toUpperCase().includes(searchStr.toUpperCase())) {
                     return { node: node, variable: { value: node.value, units: node.unit || '' } };
                 }
                 
                 // Check node variables array if nested cleanly
                 if (node.variables && node.variables.length > 0) {
                     for (let v of node.variables) {
                         if (v.name && v.name.toUpperCase().includes(searchStr.toUpperCase())) {
                             return { node: node, variable: v };
                         }
                     }
                 }
                 if (node.children && node.children.length > 0) {
                     for (let child of node.children) {
                         const found = traverseIotTreeForSensor(child, searchStr);
                         if (found) return found;
                     }
                 }
                 return null;
             };

             mods.forEach(mod => {
                 const iotMatch = traverseIotTree(iotData, mod);
                 const uiEl = document.getElementById(`sc-mod-${mod.replace(/\s+/g, '-')}`);
                 
                 if (uiEl) {
                     const statusSpan = uiEl.querySelector('.mod-status');
                     if (iotMatch && statusSpan) {
                         if (iotMatch.rackCommLoss) {
                             statusSpan.textContent = `Offline (Comm Loss)`;
                             statusSpan.style.color = '#ef4444';
                         } else {
                             statusSpan.textContent = `Online (Tracked)`;
                             statusSpan.style.color = '#10b981';
                         }
                     } else if (statusSpan) {
                         statusSpan.textContent = `Not found in IoT telemetry`;
                         statusSpan.style.color = '#f59e0b';
                     }
                 }
             });
             
             sens.forEach(sen => {
                 const sensorSafeId = sen.replace(/[^a-zA-Z0-9_-]/g, '-');
                 const iotMatch = traverseIotTreeForSensor(iotData, sen);
                 const uiEl = document.getElementById(`sc-sen-${sensorSafeId}`);
                 
                 if (uiEl) {
                     const statusSpan = uiEl.querySelector('.sen-status');
                     if (iotMatch && statusSpan) {
                         // Initiate fetch from sensor history
                         const uniqueId = iotMatch.node.id || iotMatch.node.key;
                         statusSpan.innerHTML = `Fetching history...`;
                         statusSpan.style.color = '#f59e0b';
                         
                         // Create unique event listener for response
                         const handler = (ev) => {
                             if (ev.detail.uniqueId === uniqueId) {
                                 window.removeEventListener('iotSensorReadingReady', handler);
                                 if (ev.detail.error) {
                                     statusSpan.textContent = `Error: ${ev.detail.error}`;
                                     statusSpan.style.color = '#ef4444';
                                 } else {
                                     let latestReading = null;
                                     if (ev.detail.data.results && ev.detail.data.results.length > 0) {
                                         // Make sure to find the reading with the latest resTS by sorting if needed. Or just check end of arr.
                                         // Given API often returns array in ascending time, last is generally newest.
                                         // Let's sort array descending by date just to guarantee
                                         const sortedResults = ev.detail.data.results.sort((a,b) => {
                                             if (a.sensorDetails && b.sensorDetails && a.sensorDetails.resTS && b.sensorDetails.resTS) {
                                                 return new Date(b.sensorDetails.resTS) - new Date(a.sensorDetails.resTS);
                                             }
                                             return 0;
                                         });
                                         latestReading = sortedResults[0];
                                     }
                                     if (latestReading && latestReading.sensorDetails && latestReading.sensorDetails.sensorStatus) {
                                         // Provide the actual string "OPEN" or "CLOSED" instead of numeric mapping if we want
                                         let val = latestReading.sensorDetails.sensorStatus.reading;
                                         if (val === undefined || val === null || val === "" || String(val) === String(latestReading.sensorDetails.sensorIndex) || String(val) === String(latestReading.sensorDetails.modIndex)) {
                                             val = latestReading.sensorDetails.sensorStatus.mappedReading;
                                         }
                                         if (val === undefined || val === null || val === "") {
                                             // Make sure to bypass index fallbacks
                                             let fb = iotMatch.variable ? iotMatch.variable.value : null;
                                             if (fb !== undefined && fb !== null && (String(fb) === String(latestReading.sensorDetails.sensorIndex) || String(fb) === String(latestReading.sensorDetails.modIndex))) {
                                                 fb = 'Unknown';
                                             }
                                             val = (fb !== undefined && fb !== null) ? fb : 'Unknown';
                                         }
                                         
                                         let unit = latestReading.sensorDetails.sensorStatus.units || (iotMatch.variable && iotMatch.variable.units ? iotMatch.variable.units : '');
                                         
                                         // Make units prettier
                                         if (unit.toUpperCase() === "PSI") unit = "PSI";
                                         else if (unit.toUpperCase() === "DEG F" || unit.toUpperCase() === "DEGF" || unit.includes("F")) unit = "°F";
                                         else if (unit.toUpperCase() === "DEG C" || unit.toUpperCase() === "DEGC" || unit.includes("C")) unit = "°C";

                                         statusSpan.textContent = val + (unit ? ` ${unit}` : '');
                                         statusSpan.style.color = '#10b981';
                                         statusSpan.style.fontWeight = 'bold';
                                         statusSpan.title = `Last Updated: ${new Date(latestReading.sensorDetails.resTS).toLocaleString()}`;
                                     } else {
                                         // Fall back to original sync data
                                         const val = iotMatch.variable ? (iotMatch.variable.value !== undefined && iotMatch.variable.value !== null ? iotMatch.variable.value : 'Unknown') : 'Unknown';
                                         const unit = iotMatch.variable && iotMatch.variable.units ? iotMatch.variable.units : '';
                                         statusSpan.textContent = val + (unit ? ` ${unit}` : '');
                                         statusSpan.style.color = '#10b981';
                                         statusSpan.style.fontWeight = 'bold';
                                     }
                                 }
                             }
                         };
                         window.addEventListener('iotSensorReadingReady', handler);
                         
                         window.dispatchEvent(new CustomEvent('fetchSensorReadingIOT', { 
                             detail: { 
                                 storeNumber: e.detail.store, 
                                 uniqueId: uniqueId 
                             } 
                         }));
                     } else if (statusSpan) {
                         statusSpan.textContent = `No reading found`;
                         statusSpan.style.color = '#f59e0b';
                     }
                 }
             });
        });
      });
      
      // Inject links next to inputs
      document.addEventListener("DOMContentLoaded", () => {
         const storeInput = document.getElementById("store-number");
         if (storeInput) {
             const label = document.querySelector('label[for="store-number"]');
             const link = document.createElement("a");
             link.id = "iot-link";
             link.text = "🌍 Open in IoT";
             // Align it on the same line as the label, pushed right
             link.style = "font-size:12px; float:right; display:none;";
             link.target = "_blank";
             link.href = "#";
             
             if (label) {
                 label.appendChild(link);
             } else {
                 storeInput.parentNode.insertBefore(link, storeInput);
             }
             
             storeInput.addEventListener("input", (e) => {
                const val = e.target.value.trim();
                if (val) {
                    link.style.display = "inline-block";
                    link.href = `https://em.walmart.com/us/sensors?query=US%7C${val}#`;
                } else {
                    link.style.display = "none";
                }
             });
             
             // Fire event manually on load if there's already a value
             if (storeInput.value.trim()) {
                 link.style.display = "inline-block";
                 link.href = `https://em.walmart.com/us/sensors?query=US%7C${storeInput.value.trim()}#`;
             }
         }
         
         const woInput = document.getElementById("work-order");
         if (woInput) {
             const label = document.querySelector('label[for="work-order"]');
             const link = document.createElement("a");
             link.id = "sc-link";
             link.text = "🎫 Open in ServiceChannel";
             link.style = "font-size:12px; float:right; display:none;";
             link.target = "_blank";
             link.href = "#";
             
             if (label) {
                 label.appendChild(link);
             } else {
                 woInput.parentNode.insertBefore(link, woInput);
             }
             
             woInput.addEventListener("input", (e) => {
                const val = e.target.value.trim();
                if (val) {
                    link.style.display = "inline-block";
                    link.href = `https://www.servicechannel.com/sc/wo/workorders/list?id=${val}`;
                } else {
                    link.style.display = "none";
                }
             });
             
             if (woInput.value.trim()) {
                 link.style.display = "inline-block";
                 link.href = `https://www.servicechannel.com/sc/wo/workorders/list?id=${woInput.value.trim()}`;
             }
         }
      });
      
      // Initialize application
      document.addEventListener("DOMContentLoaded", async function () {
        try {
          // Set theme from localStorage
          const savedTheme = localStorage.getItem("theme");
          const isDark = savedTheme === "dark";

          document.body.classList.remove("light-mode", "dark-mode");
          document.body.classList.add(isDark ? "dark-mode" : "light-mode");
          updateThemeIcon(isDark);

          // Update theme button aria-label
          const themeButton = document.getElementById("theme-toggle-btn");
          if (themeButton) {
            themeButton.setAttribute(
              "aria-label",
              isDark ? "Switch to light mode" : "Switch to dark mode",
            );
          }

          // Restore accordion collapse state from localStorage
          restoreAccordionState();

          // Initialize button group visibility - hide all system-dependent groups on load
          AppState.selectedSystem = null;
          const hiddenGroups = document.querySelectorAll(
            ".accordion-group.hidden-until-system",
          );
          hiddenGroups.forEach((group) => {
            group.style.display = "none";
          });

          // Ensure Downloads section is hidden initially
          hideDownloadsSection();

          // Update history dropdown
          updateHistoryDropdown();

          // Setup enhanced functionality
          setupInputValidation();
          setupKeyboardNavigation();

          // Track user edits on dropdown-notes
          const dropdownNotes = document.getElementById("dropdown-notes");
          if (dropdownNotes) {
            dropdownNotes.addEventListener("input", function () {
              this.dataset.userEdited = "true";
            });
          }

          // Initialize auto-save state
          AppState.lastSavedData = JSON.stringify(getFormData());

          // Initialize microphone for dead air detection
          initializeMicrophone();

          // Initialize VCC integration
          initializeVCCIntegration();

          // Load saved infractions and update display
          loadTotalInfractions();
          updateInfractionDisplay();

          // Initialize visual warnings
          initializeVisualWarnings();

          // Initialize microphone settings
          initializeMicrophoneSettings();

          // Initialize War Room system
          initializeWarRoom();

          // Initialize War Room Schedule
          loadWarRoomSchedule();

          // Initialize SQLite storage system
          initializeDatabaseOnStartup();

          // Add War Room template preview event listeners
          setTimeout(() => {
            const templateFields = [
              "site-header",
              "system-format",
              "rack-format",
              "include-wo-section",
              "custom-template",
            ];
            templateFields.forEach((fieldId) => {
              const field = document.getElementById(fieldId);
              if (field) {
                field.addEventListener("input", updateTemplatePreview);
                field.addEventListener("change", updateTemplatePreview);
              }
            });
          }, 100);

          // Load QA checklist state
          loadChecklistState();
          loadAgentName();

          console.log("Frostbyte(Digital Assets) App initialized successfully");
        } catch (error) {
          console.error("Initialization failed:", error);
          showNotification("App initialization failed", "error");
        }
      });

      // Add notification container for accessibility
      
      // ====== EMS Mapper SQLite Loader ======
      // ====== EMS Mapper SQLite Loader ======
      function setupEmsSqliteLoader() {
         const emsSection = document.getElementById("ems-mapper");
         if(!emsSection) return;

         const loaderHtml = `
            <div style="margin-top:20px; background:#2d2d2d; padding:15px; border-radius:8px;">
               <h4>Import EMS Mapper Database</h4>
               <p style="font-size:12px; color:#aaa;" id="sqlite-status-text">Select the EMS_Scanner_DB.sqlite file exported from the Scanner Tool to overwrite cache.</p>
               <input type="file" id="sqlite-upload" accept=".sqlite,.db" style="display:block; margin: 10px 0;">
               <button class="primary-button" id="download-updated-db" style="display:none; margin-top:10px;">💾 Download Updated Database</button>
            </div>
         `;
         emsSection.insertAdjacentHTML('afterbegin', loaderHtml);

         if(!document.getElementById("sql-js-script")) {
            const script = document.createElement("script");
            script.id = "sql-js-script";
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js";
            document.head.appendChild(script);
         }

         window.mainDB = null;
         
         const IDB_NAME = 'FrostbyteSqliteCache';
         const STORE_NAME = 'sqliteBackup';
         const DB_KEY = 'mainDB';

         function openIndexedDB() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(IDB_NAME, 1);
                req.onupgradeneeded = (e) => { e.target.result.createObjectStore(STORE_NAME); };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
         }

         async function loadFromIndexedDB() {
            try {
                const idb = await openIndexedDB();
                return new Promise((resolve, reject) => {
                    const tx = idb.transaction(STORE_NAME, 'readonly');
                    const store = tx.objectStore(STORE_NAME);
                    const req = store.get(DB_KEY);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });
            } catch(e) { return null; }
         }

         async function saveToIndexedDB(uint8Data) {
            try {
                const idb = await openIndexedDB();
                return new Promise((resolve, reject) => {
                    const tx = idb.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    const req = store.put(uint8Data, DB_KEY);
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error);
                });
            } catch(e) {}
         }

         // Attempt auto-load on start
         setTimeout(async () => {
             if(typeof initSqlJs !== 'undefined') {
                 try {
                     const savedData = await loadFromIndexedDB();
                     if (savedData) {
                         const SQL = await initSqlJs({ locateFile: () => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm" });
                         window.mainDB = new SQL.Database(savedData);
                         document.getElementById("download-updated-db").style.display = "inline-block";
                         document.getElementById("sqlite-status-text").innerText = "Database loaded from local cache.";
                         window.dispatchEvent(new CustomEvent('emsDbLoaded', { detail: { db: window.mainDB } }));
                         
                         if (typeof renderEmsTable === 'function') renderEmsTable();
                         if (typeof updateEmsInsightsPanel === 'function') updateEmsInsightsPanel();
                     }
                 } catch(e) {}
             }
         }, 1000);

         document.getElementById('sqlite-upload').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if(!file) return;

            const arrayBuffer = await file.arrayBuffer();
            const Uint8ArrayData = new Uint8Array(arrayBuffer);
            
            if(typeof initSqlJs !== 'undefined') {
                 const SQL = await initSqlJs({ locateFile: () => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm" });
                 window.mainDB = new SQL.Database(Uint8ArrayData);
                 
                 // Save to indexedDB for next reload
                 await saveToIndexedDB(Uint8ArrayData);
                 
                 showNotification("SQLite Database Loaded and Cached Successfully!");
                 document.getElementById("download-updated-db").style.display = "inline-block";
                 document.getElementById("sqlite-status-text").innerText = "Database updated and cached locally.";
                 
                 window.dispatchEvent(new CustomEvent('emsDbLoaded', { detail: { db: window.mainDB } }));
                 
                 if (typeof renderEmsTable === 'function') renderEmsTable();
                 if (typeof updateEmsInsightsPanel === 'function') updateEmsInsightsPanel();
            }
         });

         document.getElementById("download-updated-db").addEventListener('click', () => {
             if(!window.mainDB) return;
             const data = window.mainDB.export();
             const blob = new Blob([data], { type: "application/x-sqlite3" });
             const url = URL.createObjectURL(blob);
             const a = document.createElement("a");
             a.href = url;
             a.download = `EMS_Scanner_DB_Updated.sqlite`;
             document.body.appendChild(a);
             a.click();
             setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
         });

         window.addEventListener('opusClassified', async (e) => {
             console.log('opusClassified event received', e.detail);
             if(!window.mainDB) {
                 console.log('mainDB is null, aborting');
                 return;
             }
             const { storeId, rackName, emsType } = e.detail;
             try {
                 window.mainDB.run("UPDATE Racks SET ems_type = ?, needs_review = 0 WHERE store_id = ? AND UPPER(rack_name) = UPPER(?)", [emsType, storeId, rackName]);
                   console.log("Executed SQL update for", rackName);
                 showNotification(`Updated ${rackName} to ${emsType} in Database!`, "success");
                 // Re-cache mutated DB
                 const exported = window.mainDB.export();
                 await saveToIndexedDB(exported);

                   if (window.frostbyteEmsMapping && frostbyteEmsMapping[storeId] && frostbyteEmsMapping[storeId].racks && frostbyteEmsMapping[storeId].racks[rackName]) {
                       frostbyteEmsMapping[storeId].racks[rackName].system = emsType;
                       saveEmsData();
                   }
                   console.log("Cached successfully");

                 
                 // Explicitly set the DOM label so the UI looks active
                 const labelBox = document.getElementById("selected-system-label");
                 if(labelBox) labelBox.innerText = emsType;
                 
                 // Immediately re-render panels to reflect the new system type
                 if (typeof renderEmsTable === 'function') renderEmsTable();
                 if (typeof updateEmsInsightsPanel === 'function') updateEmsInsightsPanel();
             } catch(err) {
                 console.error("SQL Error", err);
             }
         });
      }

      document.addEventListener("DOMContentLoaded", setupEmsSqliteLoader);
      
      // EMS Mapping System Logic
      function saveEmsData() {
        localStorage.setItem(
          "frostbyteEmsMapping",
          JSON.stringify(frostbyteEmsMapping),
        );
      }

      function checkAndAutoMapEms() {
        const storeInput = document
          .getElementById("store-number")
          ?.value.trim();
        // Use user-typed rack or the one from the "Set Rack" button
        const rackInput =
          document.getElementById("quick-notes-rack")?.value.trim() ||
          AppState.currentRack;
        const system = AppState.selectedSystem; // Set by System Login buttons

        if (!storeInput || !rackInput || !system || system === "None") return;

        if (!frostbyteEmsMapping[storeInput]) {
          frostbyteEmsMapping[storeInput] = { racks: {} };
        }
        if (!frostbyteEmsMapping[storeInput].racks[rackInput]) {
          frostbyteEmsMapping[storeInput].racks[rackInput] = {
            system: system,
            circuits: {},
          };
          // If it's a new learning, save and maybe show notification
          saveEmsData();
          renderEmsTable();
        } else if (
          frostbyteEmsMapping[storeInput].racks[rackInput].system !== system
        ) {
          // Update system if changed
          frostbyteEmsMapping[storeInput].racks[rackInput].system = system;
          saveEmsData();
          renderEmsTable();
        }
        // Circuit mapping is handled during Copy Notes deliberately.
      }

      function parseNotesForEmsMapping(notes, storeNumber) {
        if (!storeNumber) return;

        let madeChanges = false;

        // 1. Auto-map HVAC and Lighting controllers directly as Racks
        const hvacRegex = /\b(HVAC|HVACL|HVAC\/L|HVAC\/Lights|AHM)\b/gi;
        let hvacMatch;
        while ((hvacMatch = hvacRegex.exec(notes)) !== null) {
          let hvacTerm = hvacMatch[1].toUpperCase();
          
          if (!frostbyteEmsMapping[storeNumber]) {
            frostbyteEmsMapping[storeNumber] = { racks: {} };
          }
          if (!frostbyteEmsMapping[storeNumber].racks) {
            frostbyteEmsMapping[storeNumber].racks = {};
          }
          
          if (!frostbyteEmsMapping[storeNumber].racks[hvacTerm]) {
            frostbyteEmsMapping[storeNumber].racks[hvacTerm] = {
              system: AppState.selectedSystem || "None",
              circuits: {}
            };
            madeChanges = true;
          } else if (AppState.selectedSystem && AppState.selectedSystem !== "None" && frostbyteEmsMapping[storeNumber].racks[hvacTerm].system !== AppState.selectedSystem) {
            frostbyteEmsMapping[storeNumber].racks[hvacTerm].system = AppState.selectedSystem;
            madeChanges = true;
          }
        }

        // 2. Sequentially process notes to find which circuits are attached to the current rack
        let currentRack = null;
        // Match phrases like "Logged into [RACK]", "Set rack to [RACK]", "Forced defrost on [CIRCUIT]", "Terminated Defrost on [CIRCUIT]"
        const regex =
          /(?:Logged into|Rack set to)\s+([A-Za-z0-9_-]+)|(?:Forced defrost on|Terminated Defrost on)\s+([A-Za-z0-9_, \-]+)/gi;
        let match;

        while ((match = regex.exec(notes)) !== null) {
          if (match[1]) {
            // Match 1 is the rack
            let rackName = match[1];
            // Keep the case as it is in the mapping if it exists case-insensitively, or just use what was typed
            let matchedExistingRack = undefined;
            if (frostbyteEmsMapping[storeNumber] && frostbyteEmsMapping[storeNumber].racks) {
              matchedExistingRack = Object.keys(
                frostbyteEmsMapping[storeNumber].racks,
              ).find((r) => r.toUpperCase() === rackName.toUpperCase());
            }
            currentRack = matchedExistingRack || rackName;
          } else if (match[2]) {
            // Match 2 is the circuit(s)
            let circuitsStr = match[2];
            let circuitsArr = circuitsStr.split(",").map(c => c.trim()).filter(c => c);
            
            if (
              currentRack &&
              frostbyteEmsMapping[storeNumber] &&
              frostbyteEmsMapping[storeNumber].racks &&
              frostbyteEmsMapping[storeNumber].racks[currentRack]
            ) {
              const rData = frostbyteEmsMapping[storeNumber].racks[currentRack];
              if (!rData.circuits) rData.circuits = {};

              circuitsArr.forEach((circuit) => {
                // Let's standardise the circuit key (original case maintained)
                let matchedExistingCircuit = Object.keys(rData.circuits).find(
                  (c) => c.toUpperCase() === circuit.toUpperCase(),
                );
                if (!matchedExistingCircuit) {
                  rData.circuits[circuit] = "Regular";
                  madeChanges = true;
                }
              });
            }
          }
        }

        // 3. Fallback: Also map what is directly in the quick-notes-circuit input if there's a rack
        const explicitRack = document.getElementById("quick-notes-rack")?.value.trim() || AppState.currentRack;
        const explicitCircuitsStr = document.getElementById("quick-notes-circuit")?.value.trim();
        
        if (explicitRack && explicitCircuitsStr && 
            frostbyteEmsMapping[storeNumber] && 
            frostbyteEmsMapping[storeNumber].racks && 
            frostbyteEmsMapping[storeNumber].racks[explicitRack]) {
          
          const expCircuitsArr = explicitCircuitsStr.split(",").map(c => c.trim()).filter(c => c);
          const rData = frostbyteEmsMapping[storeNumber].racks[explicitRack];
          if (!rData.circuits) rData.circuits = {};

          expCircuitsArr.forEach((circuit) => {
            let matchedExistingCircuit = Object.keys(rData.circuits).find(
              (c) => c.toUpperCase() === circuit.toUpperCase()
            );
            if (!matchedExistingCircuit) {
              rData.circuits[circuit] = "Regular";
              madeChanges = true;
            }
          });
        }

        if (madeChanges) {
          saveEmsData();
          renderEmsTable();
          updateEmsInsightsPanel();
        }
      }

      function getEmsInsightForStore(storeNumber, rackFilter = "", circuitFilter = "") {
        let html = "";
        storeNumber = storeNumber.trim();
        if(!storeNumber) return html;

        if (window.mainDB) {
            let query = `SELECT r.rack_name, r.ems_type, GROUP_CONCAT(c.circuit_name) FROM Racks r LEFT JOIN Circuits c ON r.rack_id = c.rack_id WHERE r.store_id = ? GROUP BY r.rack_id`;
            let params = [parseInt(storeNumber)];
            
            try {
               const res = window.mainDB.exec(query, params);
               if (res.length > 0) {
                   html += `<div style="display:flex; flex-wrap:wrap; gap:8px;">`;
                   res[0].values.forEach(row => {
                       const rackName = row[0] ? row[0].toString().trim() : '';
                       const system = row[1];
                       const circuitsStr = row[2] || "";
                       const circuits = circuitsStr ? circuitsStr.split(',') : [];
                       
                       
                       
                       let circuitMatch = false;
                       if (circuitFilter && circuits.length > 0) {
                           if (circuits.find(c => c.toUpperCase().includes(circuitFilter.toUpperCase()))) {
                               circuitMatch = true;
                           }
                       }
                       
                       const isSelected = AppState.currentRack && ((typeof AppState.currentRack === 'object' ? AppState.currentRack.name : AppState.currentRack.toString()).trim() === rackName);
                       let highlightStyle = "";
                       if (isSelected || circuitMatch) {
                           highlightStyle = "background-color: #007acc; color: white;";
                       }
                       
                       // For selection, if system is OPUS, we might have special behavior,
                       // but selectRackAndEms will handle the UI part.
                       html += `<div style="padding: 5px 10px; border-radius: 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); font-size: 11px; cursor: pointer; ${highlightStyle}" onclick="selectRackAndEms('${rackName}', '${system}')">`;
                       html += `<strong>${rackName}</strong>: ${system}`;
                         if (circuits.length > 0) {
                              html += ` <span style="display:inline-block; background:rgba(255,255,255,0.2); color:inherit; padding:2px 6px; border-radius:10px; font-size:9px; margin-left:4px;">${circuits.length}</span>`;
                         }
                       if (circuitMatch) {
                         html += ` <span style="color: #4caf50; margin-left: 5px;"><i class="fas fa-check-circle"></i></span>`;
                       }
                       html += `</div>`;
                   });
                   html += `</div>`;
               }
            } catch(e) {}
        } else {
            // Legacy logic
            const storeData = frostbyteEmsMapping[storeNumber];
            if (storeData && storeData.racks) {
              html += `<div style="display:flex; flex-wrap:wrap; gap:8px;">`;
              for (const rackName in storeData.racks) {
                const info = storeData.racks[rackName];
                
                
                const isSelected = AppState.currentRack && ((typeof AppState.currentRack === 'object' ? AppState.currentRack.name : AppState.currentRack.toString()).trim() === rackName);
                let circuitMatch = false;
                if (circuitFilter && info.circuits) {
                  circuitMatch = Object.keys(info.circuits).some((c) =>
                    c.toUpperCase().includes(circuitFilter.toUpperCase())
                  );
                }
                let highlightStyle = "";
                if (isSelected || circuitMatch) {
                  highlightStyle = "background-color: #007acc; color: white;";
                }
                html += `<div style="padding: 5px 10px; border-radius: 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); font-size: 11px; cursor: pointer; ${highlightStyle}" onclick="selectRackAndEms('${rackName}', '${info.system}')">`;
                html += `<strong>${rackName}</strong>: ${info.system}`;
                  const cCount = info.circuits ? Object.keys(info.circuits).length : 0;
                  if (cCount > 0) {
                       html += ` <span style="display:inline-block; background:rgba(255,255,255,0.2); color:inherit; padding:2px 6px; border-radius:10px; font-size:9px; margin-left:4px;">${cCount}</span>`;
                  }
                if (circuitMatch) {
                  html += ` <span style="color: #4caf50; margin-left: 5px;"><i class="fas fa-check-circle"></i></span>`;
                }
                html += `</div>`;
              }
              html += `</div>`;
            }
        }
        return html;
      }

      function selectRackAndEms(rackName, system) {
          // Explicitly set AppState.currentRack to just a STRING natively
          AppState.currentRack = rackName;

          const rackField = document.getElementById("quick-notes-rack");
          if (rackField) {
            rackField.value = rackName;
          }

          if (typeof updateEmsInsightsPanel === 'function') {
              updateEmsInsightsPanel();
            }
            
            console.log("Checking addQuickNote typeof:", typeof addQuickNote);
            
            // Add a "Logged into" note dynamically
            try {
                if (typeof addQuickNote === 'function') {
                    addQuickNote(`Logged into ${rackName}.`);
                } else if (window.addQuickNote) {
                    window.addQuickNote(`Logged into ${rackName}.`);
                } else {
                    // Fallback to inserting manually if scoping is broken
                    const notesTextarea = document.getElementById("notes");
                    if (notesTextarea) {
                        const currentNotes = notesTextarea.value.trim();
                        if (currentNotes) {
                           notesTextarea.value = currentNotes + " Logged into " + rackName + ".";
                        } else {
                           notesTextarea.value = "Logged into " + rackName + ".";
                        }
                        if (typeof scheduleAutoSave === 'function') scheduleAutoSave();
                        if (typeof analyzeNotesForTags === 'function') analyzeNotesForTags();
                    }
                }
            } catch(e) {
                console.error("Failed to add note", e);
            }

          setTimeout(async () => {
               const sysUpper = system ? system.toUpperCase() : "";
               if (sysUpper && sysUpper !== "UNKNOWN" && sysUpper !== "OPUS") {
                    selectSystem(system);
                    showNotification(`Selected ${rackName} and set system to ${system}`, "success");
               } else {
                    showNotification(`Selected ${rackName}. Please select specific EMS type.`, "info");
               }
           }, 100);
        }

      function updateEmsInsightsPanel() {
        // Re-sync if AppState.currentRack exists but quick-notes-rack is empty
        const rackField = document.getElementById("quick-notes-rack");
        if (AppState.currentRack && rackField && rackField.value === "") {
          rackField.value = typeof AppState.currentRack === "object" ? AppState.currentRack.name : AppState.currentRack;
        }

        checkAndAutoMapEms(); // Try to auto-learn from current selections

        const storeInput = document.getElementById("store-number").value.trim();
        const rackInput =
          document.getElementById("quick-notes-rack").value.trim() ||
          AppState.currentRack ||
          "";
        const circuitInput = document.getElementById("quick-notes-circuit")
          ? document.getElementById("quick-notes-circuit").value.trim()
          : "";

        const insightPanel = document.getElementById("ems-insights-panel");
        const insightContent = document.getElementById("ems-insights-content");

        if (storeInput) {
            insightPanel.style.display = "block";
            insightContent.innerHTML = getEmsInsightForStore(storeInput, rackInput, circuitInput);
          } else {
            insightPanel.style.display = "none";
          }
      }

      function openEmsMappingBuilder() {
        const storeInput = document.getElementById("store-number").value.trim();
        if (!storeInput) {
          showNotification("Please enter a store number first.", "error");
          return;
        }

        const modalOverlay = document.createElement("div");
        modalOverlay.className = "modal-overlay";
        
        const modalContent = document.createElement("div");
        modalContent.className = "modal-content";
        modalContent.style.maxWidth = "600px";

        // Header
        const modalHeader = document.createElement("div");
        modalHeader.className = "modal-header";
        modalHeader.innerHTML = `<h3><i class="fas fa-network-wired"></i> EMS Mapping Builder - Store ${storeInput}</h3>`;

        // Body
        const modalBody = document.createElement("div");
        modalBody.className = "modal-body";

        // Builder Area
        const builderArea = document.createElement("div");
        builderArea.style.marginBottom = "20px";
        builderArea.style.padding = "15px";
        builderArea.style.backgroundColor = "var(--bg-secondary)";
        builderArea.style.borderRadius = "8px";

        // System Selection
        const systemGroup = document.createElement("div");
        systemGroup.style.marginBottom = "15px";
        systemGroup.innerHTML = `<label style="display:block;margin-bottom:5px;color:var(--text-secondary);font-size:0.9em;">EMS System</label>`;
        const emsSelect = document.createElement("select");
        emsSelect.className = "form-control";
        emsSelect.style.width = "100%";
        emsSelect.style.marginBottom = "15px";
        const emsOptions = ["Select EMS...", "Novar", "Opus Arch", "Opus Mag", "CPC", "AKA65", "Danfoss", "Carel Boss", "Connect+", "Ultrasite", "Emerson", "E2", "E3"];
        emsOptions.forEach(opt => {
          const option = document.createElement("option");
          option.value = opt === "Select EMS..." ? "" : opt;
          option.textContent = opt;
          emsSelect.appendChild(option);
        });
        systemGroup.appendChild(emsSelect);

        // Rack Quick Builder
        const rackGroup = document.createElement("div");
        rackGroup.innerHTML = `<label style="display:block;margin-bottom:5px;color:var(--text-secondary);font-size:0.9em;">Add Rack (Use buttons or type)</label>`;
        
        let builderState = { prefix: "", type: "", letters: [] };
        
        const createMultiGroup = (items, key, multi = false) => {
           const btnContainer = document.createElement("div");
           btnContainer.style.display = "flex";
           btnContainer.style.gap = "5px";
           btnContainer.style.flexWrap = "wrap";
           btnContainer.style.marginBottom = "10px";

           items.forEach((item) => {
             const btn = document.createElement("button");
             btn.className = "secondary-button";
             btn.style.padding = "5px 10px";
             btn.style.minWidth = "40px";
             btn.textContent = item;
             
             btn.onclick = () => {
               if (multi) {
                 const idx = builderState[key].indexOf(item);
                 if (idx > -1) {
                   builderState[key].splice(idx, 1);
                   btn.classList.remove("active-rack-btn");
                   btn.style.backgroundColor = "";
                   btn.style.color = "";
                 } else {
                   builderState[key].push(item);
                   builderState[key].sort();
                   btn.classList.add("active-rack-btn");
                   btn.style.backgroundColor = "var(--primary-color)";
                   btn.style.color = "white";
                 }
               } else {
                 if (builderState[key] === item) {
                   builderState[key] = "";
                   btn.classList.remove("active-rack-btn");
                   btn.style.backgroundColor = "";
                   btn.style.color = "";
                 } else {
                   builderState[key] = item;
                   Array.from(btnContainer.children).forEach((b) => {
                     b.classList.remove("active-rack-btn");
                     b.style.backgroundColor = "";
                     b.style.color = "";
                   });
                   btn.classList.add("active-rack-btn");
                   btn.style.backgroundColor = "var(--primary-color)";
                   btn.style.color = "white";
                 }
               }
               updateManualInput();
             };
             btnContainer.appendChild(btn);
           });
           return btnContainer;
        };

        const updateManualInput = () => {
          let code = `${builderState.prefix}${builderState.type}${builderState.letters.join("")}`;
          if (!builderState.prefix && !builderState.type && builderState.letters.length > 0) {
            code = `Rack ${builderState.letters.join("")}`;
          }
          if (code) {
             rackInput.value = code;
          }
        };

        rackGroup.appendChild(createMultiGroup(["HVAC", "HVACL", "AHM"], "prefix"));
        rackGroup.appendChild(createMultiGroup(["C", "R", "CKT", "CKTS"], "prefix"));
        rackGroup.appendChild(createMultiGroup(["LT", "MT", "DT"], "type"));
        
        const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
        rackGroup.appendChild(createMultiGroup(alphabet, "letters", true));

        const rackInputContainer = document.createElement("div");
        rackInputContainer.style.display = "flex";
        rackInputContainer.style.gap = "10px";
        rackInputContainer.style.marginTop = "15px";

        const rackInput = document.createElement("input");
        rackInput.type = "text";
        rackInput.className = "form-control";
        rackInput.placeholder = "Rack Name (e.g. LTA)";
        rackInput.style.flex = "1";

        const addBtn = document.createElement("button");
        addBtn.className = "primary-button";
        addBtn.innerHTML = "<i class='fas fa-plus'></i> Add";
        
        rackInputContainer.appendChild(rackInput);
        rackInputContainer.appendChild(addBtn);

        rackGroup.appendChild(rackInputContainer);

        // Circuit Quick Builder
        const circuitGroup = document.createElement("div");
        circuitGroup.style.marginTop = "15px";
        circuitGroup.innerHTML = `<label style="display:block;margin-bottom:5px;color:var(--text-secondary);font-size:0.9em;">Add Circuit (Optional)</label>`;

        const circuitInputContainer = document.createElement("div");
        circuitInputContainer.style.display = "flex";
        circuitInputContainer.style.gap = "10px";

        const circuitInput = document.createElement("input");
        circuitInput.type = "text";
        circuitInput.className = "form-control";
        circuitInput.placeholder = "Circuit Name (e.g. A01)";
        circuitInput.style.flex = "1";

        const circuitTypeSelect = document.createElement("select");
        circuitTypeSelect.className = "form-control";
        circuitTypeSelect.style.flex = "1";
        const cOptions = ["Regular", "Sporlan", "KE2"];
        cOptions.forEach(opt => {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = opt;
          circuitTypeSelect.appendChild(option);
        });

        circuitInputContainer.appendChild(circuitInput);
        circuitInputContainer.appendChild(circuitTypeSelect);
        circuitGroup.appendChild(circuitInputContainer);

        builderArea.appendChild(systemGroup);
        builderArea.appendChild(rackGroup);
        builderArea.appendChild(circuitGroup);

        // Results Area
        const resultsArea = document.createElement("div");
        resultsArea.innerHTML = `<label style="display:block;margin-bottom:5px;color:var(--text-secondary);font-size:0.9em;">Added Mappings (Store ${storeInput})</label>`;
        const resultsList = document.createElement("div");
        resultsList.style.maxHeight = "150px";
        resultsList.style.overflowY = "auto";
        resultsList.style.backgroundColor = "var(--bg-tertiary)";
        resultsList.style.padding = "10px";
        resultsList.style.borderRadius = "5px";
        resultsList.style.border = "1px solid var(--border-color)";
        
        const refreshResults = () => {
           resultsList.innerHTML = "";
           if (frostbyteEmsMapping[storeInput] && frostbyteEmsMapping[storeInput].racks) {
             const racks = frostbyteEmsMapping[storeInput].racks;
             Object.keys(racks).forEach(r => {
               const div = document.createElement("div");
               div.style.padding = "5px";
               div.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
               div.innerHTML = `<strong>${r}</strong> <span style="color:var(--text-muted)">→</span> ${racks[r].system}`;
               
               if (racks[r].circuits && Object.keys(racks[r].circuits).length > 0) {
                 const circs = Object.keys(racks[r].circuits).map(c => `${c} (${racks[r].circuits[c]})`).join(", ");
                 const cDiv = document.createElement("div");
                 cDiv.style.fontSize = "0.85em";
                 cDiv.style.color = "var(--text-secondary)";
                 cDiv.style.paddingLeft = "10px";
                 cDiv.innerHTML = `↳ Circuits: ${circs}`;
                 div.appendChild(cDiv);
               }

               resultsList.appendChild(div);
             });
           }
           if (resultsList.innerHTML === "") {
             resultsList.innerHTML = "<span style='color:var(--text-muted)'>No mappings added yet.</span>";
           }
        };
        refreshResults();
        resultsArea.appendChild(resultsList);

        modalBody.appendChild(builderArea);
        modalBody.appendChild(resultsArea);

        addBtn.onclick = () => {
           const rackName = rackInput.value.trim();
           const ems = emsSelect.value;
           const circuitName = circuitInput.value.trim();
           const circuitType = circuitTypeSelect.value;
           
           if (!rackName || !ems) {
             showNotification("Please specify both EMS System and Rack Name.", "error");
             return;
           }

           // Save to mapping
           if (!frostbyteEmsMapping[storeInput]) {
             frostbyteEmsMapping[storeInput] = { racks: {} };
           }
           if (!frostbyteEmsMapping[storeInput].racks[rackName]) {
             frostbyteEmsMapping[storeInput].racks[rackName] = {
               system: ems,
               circuits: {},
             };
           } else {
             frostbyteEmsMapping[storeInput].racks[rackName].system = ems;
             if (!frostbyteEmsMapping[storeInput].racks[rackName].circuits) {
               frostbyteEmsMapping[storeInput].racks[rackName].circuits = {};
             }
           }

           if (circuitName) {
             const circuits = circuitName.split(",").map(c => c.trim()).filter(c => c);
             circuits.forEach(c => {
               frostbyteEmsMapping[storeInput].racks[rackName].circuits[c] = circuitType;
             });
           }

           saveEmsData();
           updateEmsInsightsPanel();
           renderEmsTable();

           showNotification(`Mapped ${rackName} ${circuitName ? `with circuit ${circuitName} ` : ''}to ${ems}`, "success");
           
           // Clear ONLY the rack input and builder state
           rackInput.value = "";
           circuitInput.value = "";
           circuitTypeSelect.value = "Regular";
           builderState = { prefix: "", type: "", letters: [] };
           Array.from(rackGroup.querySelectorAll("button.secondary-button")).forEach(b => {
             b.classList.remove("active-rack-btn");
             b.style.backgroundColor = "";
             b.style.color = "";
           });

           refreshResults();
           rackInput.focus();
        };

        // Buttons
        const modalButtons = document.createElement("div");
        modalButtons.className = "modal-buttons";

        const closeBtn = document.createElement("button");
        closeBtn.className = "modal-btn modal-btn-primary";
        closeBtn.textContent = "Done";
        closeBtn.onclick = () => {
          modalOverlay.classList.remove("show");
          setTimeout(() => modalOverlay.remove(), 200);
        };

        modalButtons.appendChild(closeBtn);

        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalButtons);
        modalOverlay.appendChild(modalContent);

        document.body.appendChild(modalOverlay);
        
        const qRack = document.getElementById("quick-notes-rack")?.value.trim();
        if (qRack) {
          rackInput.value = qRack;
        }

        setTimeout(() => modalOverlay.classList.add("show"), 10);
      }

      // EMS Mapper Dedicated Tab Functions
      function renderEmsTable() {
        const tbody = document.querySelector("#ems-table tbody");
        if (!tbody) return;

        const searchTerm = document.getElementById("ems-search").value.trim().toLowerCase();
        let html = "";

        if (window.mainDB) {
            // New SQLite Logic
            let query = `
                SELECT s.store_id, r.rack_name, r.ems_type, r.needs_review, GROUP_CONCAT(c.circuit_name)
                FROM Racks r
                JOIN Stores s ON r.store_id = s.store_id
                LEFT JOIN Circuits c ON r.rack_id = c.rack_id
            `;
            if (searchTerm) {
                query += ` WHERE s.store_id LIKE '%${searchTerm}%'`;
            }
            query += " GROUP BY r.rack_id LIMIT 250";

            try {
                const results = window.mainDB.exec(query);
                if (results.length > 0) {
                    results[0].values.forEach(row => {
                        const storeId = row[0];
                        const rackName = row[1];
                        const system = row[2];
                        const needsReview = row[3];
                        const circuits = row[4] ? row[4].split(',').slice(0, 5).join(', ') + '...' : '-';
                        
                        html += `
                            <tr ${needsReview ? 'style="background-color: rgba(255, 152, 0, 0.1);" title="Needs review"' : ''}>
                                <td>${storeId}</td>
                                <td>${rackName}</td>
                                <td>${system}</td>
                                <td>${circuits}</td>
                                <td>
                                    <!-- actions omitted for db view -->
                                </td>
                            </tr>
                        `;
                    });
                } else {
                     html = "<tr><td colspan='5' style='text-align:center;'>No matching racks found in database.</td></tr>";
                }
            } catch(e) {
                console.error("Failed to query DB for table render", e);
            }
        } else {
            // Legacy JSON Logic for when DB is not loaded
            for (const storeId in frostbyteEmsMapping) {
              if (searchTerm && !storeId.includes(searchTerm)) continue;

              const storeData = frostbyteEmsMapping[storeId];
              if (!storeData.racks) continue;

              for (const rackName in storeData.racks) {
                const rackInfo = storeData.racks[rackName];
                let cHtml = "-";
                if (rackInfo.circuits && Object.keys(rackInfo.circuits).length > 0) {
                    cHtml = Object.keys(rackInfo.circuits).join(", ");
                }
                html += `
                  <tr>
                    <td>${storeId}</td>
                    <td>${rackName}</td>
                    <td>${rackInfo.system}</td>
                    <td>${cHtml}</td>
                    <td>
                      <!-- Legacy actions omitted -->
                    </td>
                  </tr>
                `;
              }
            }
        }
        
        tbody.innerHTML = html;
      }

      function editMapping(storeId, rackName) {
        if (!frostbyteEmsMapping[storeId] || !frostbyteEmsMapping[storeId].racks[rackName]) return;
        
        const rackInfo = frostbyteEmsMapping[storeId].racks[rackName];
        
        switchTab('quick-notes');
        
        // Populate inputs to effectively "edit" it via the native Quick Notes inline mapping
        document.getElementById('store-number').value = storeId;
        document.getElementById('quick-notes-rack').value = rackName;
        
        updateEmsInsightsPanel();
        
        // Open the mapping modal with prefilled data
        openInlineMapper();
        document.getElementById('inline-ems-system').value = rackInfo.system || '';
        
        showNotification('Update the details below and click Save.', 'info');
      }

      function deleteMapping(storeId, rackName) {
        if (
          confirm(`Delete mapping for Store ${storeId} - Rack ${rackName}?`)
        ) {
          if (
            frostbyteEmsMapping[storeId] &&
            frostbyteEmsMapping[storeId].racks[rackName]
          ) {
            delete frostbyteEmsMapping[storeId].racks[rackName];
            if (Object.keys(frostbyteEmsMapping[storeId].racks).length === 0) {
              delete frostbyteEmsMapping[storeId];
            }
            saveEmsData();
            renderEmsTable();
            updateEmsInsightsPanel();
          }
        }
      }

      function clearEmsData() {
        if (
          confirm(
            "Are you sure you want to clear ALL mapped EMS data? This cannot be undone.",
          )
        ) {
          frostbyteEmsMapping = {};
          saveEmsData();
          renderEmsTable();
          updateEmsInsightsPanel();
          showNotification("All mapping data cleared.", "success");
        }
      }

      function exportEmsData() {
        const dataStr =
          "data:text/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(frostbyteEmsMapping, null, 2));
        const downloadAnchorNode = document.createElement("a");
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute(
          "download",
          "frostbyte_ems_mapping.json",
        );
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      }

      function openEmsModal() {
        // Re-use inline mapper or switch to Quick Notes for simple creation
        switchTab("quick-notes");
        document.getElementById("store-number").focus();
        showNotification(
          'To add a new store, enter it here and click "+ Add Mapping".',
          "info",
        );
      }

      document.addEventListener("DOMContentLoaded", function () {
        const notificationContainer = document.createElement("div");
        notificationContainer.setAttribute("aria-live", "polite");
        notificationContainer.setAttribute("aria-atomic", "true");
        notificationContainer.className = "sr-only";
        notificationContainer.id = "notification-announcer";
        document.body.appendChild(notificationContainer);

        // Hook up listeners for EMS Insights
        const snInput = document.getElementById("store-number");
        if (snInput) snInput.addEventListener("input", updateEmsInsightsPanel);

        const qrInput = document.getElementById("quick-notes-rack");
        if (qrInput) qrInput.addEventListener("input", updateEmsInsightsPanel);

        const qcInput = document.getElementById("quick-notes-circuit");
        if (qcInput) qcInput.addEventListener("input", updateEmsInsightsPanel);

        // Initial render
        renderEmsTable();
      });

      // Stop tab flashing when user returns to the tab
      window.addEventListener("focus", function () {
        if (AppState.isTabFlashing && AppState.deadAirSeconds < 25) {
          // Only stop flashing if we're no longer in warning state
          stopTabFlash();
        }
      });