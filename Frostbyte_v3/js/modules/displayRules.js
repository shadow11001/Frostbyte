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

      