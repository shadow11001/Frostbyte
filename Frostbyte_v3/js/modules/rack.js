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

      