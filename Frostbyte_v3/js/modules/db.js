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

      