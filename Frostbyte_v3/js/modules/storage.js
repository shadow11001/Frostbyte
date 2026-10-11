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

      