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


// Modules have been extracted to individual files.
// Ensure they are loaded in index.html in the correct order:
// 1. app.js (state)
// 2. config.js
// 3. storage.js
// 4. warRoom.js
// 5. db.js
// 6. rack.js
// 7. accordion.js
// 8. subCategory.js
// 9. displayRules.js
// 10. modal.js
