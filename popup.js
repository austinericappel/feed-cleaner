document.addEventListener("DOMContentLoaded", () => {
    // Load enabled state
    chrome.storage.sync.get(["enabled", "filters"], (result) => {
      const enabled = result.enabled ?? true; // Default to enabled
      const filters = result.filters || { elon: true, trump: true, slammed: true };
      
      // Set switch state
      document.getElementById("enableFilter").checked = enabled;
      renderFilters(filters);
    });
  
    // Handle enable/disable toggle
    document.getElementById("enableFilter").addEventListener("change", (e) => {
      const enabled = e.target.checked;
      chrome.storage.sync.set({ enabled }, () => {
        notifyContentScript();
      });
    });
  
    // Add new filter button
    document.getElementById("addFilterButton").addEventListener("click", () => {
      const newFilterInput = document.getElementById("newFilter");
      const newFilter = newFilterInput.value.trim().toLowerCase();
      if (newFilter) {
        chrome.storage.sync.get("filters", (result) => {
          const filters = result.filters || { elon: true, trump: true, slammed: true };
          // Add new filter (enabled by default)
          filters[newFilter] = true;
          chrome.storage.sync.set({ filters }, () => {
            renderFilters(filters);
            newFilterInput.value = "";
            notifyContentScript();
          });
        });
      }
    });
  });
  
  // Renders filter toggles and remove buttons
  function renderFilters(filters) {
    const container = document.getElementById("filtersContainer");
    container.innerHTML = ""; // Clear current filters
    for (const keyword in filters) {
      const div = document.createElement("div");
  
      // Checkbox to enable/disable filter
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = filters[keyword];
      checkbox.addEventListener("change", () => {
        filters[keyword] = checkbox.checked;
        chrome.storage.sync.set({ filters }, () => {
          notifyContentScript();
        });
      });
      div.appendChild(checkbox);
  
      // Label for the filter keyword
      const label = document.createElement("span");
      label.textContent = keyword;
      div.appendChild(label);
  
      // Remove button
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.className = "remove-btn";
      removeButton.addEventListener("click", () => {
        delete filters[keyword];
        chrome.storage.sync.set({ filters }, () => {
          renderFilters(filters);
          notifyContentScript();
        });
      });
      div.appendChild(removeButton);
  
      container.appendChild(div);
    }
  }
  
  // Notify content script to update the filtering (here, we simply reload the page)
  function notifyContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "updateFilters" });
      }
    });
  }