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

      