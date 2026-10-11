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

      