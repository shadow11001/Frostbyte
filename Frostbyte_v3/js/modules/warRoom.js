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

      