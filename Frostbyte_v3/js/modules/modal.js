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