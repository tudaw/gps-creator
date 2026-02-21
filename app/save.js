(function () {
  function createSaveManager(options) {
    const getFeatures = options.getFeatures;
    const saveStatusEl = options.saveStatusEl;
    const saveButtonEl = options.saveButtonEl;

    function getGeoJSONContent() {
      return JSON.stringify({
        type: "FeatureCollection",
        features: getFeatures()
      }, null, 2);
    }

    function setSaveStatus(message) {
      if (!saveStatusEl) {
        return;
      }

      if (!message) {
        saveStatusEl.textContent = "";
        saveStatusEl.classList.remove("is-visible");
        return;
      }

      saveStatusEl.textContent = message;
      saveStatusEl.classList.add("is-visible");
    }

    function fallbackDownload(content) {
      const blob = new Blob([content], {
        type: "application/geo+json"
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "clicked-points.geojson";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    }

    async function saveGeoJSON() {
      const content = getGeoJSONContent();
      const fileName = "clicked-points.geojson";
      const supportsSavePicker = typeof window.showSaveFilePicker === "function";
      const canUseSavePicker = window.isSecureContext && supportsSavePicker;

      if (!canUseSavePicker) {
        fallbackDownload(content);
        setSaveStatus(
          "Save location picker is unavailable here. Open this app via https or http://localhost to choose a folder. Fallback download was used."
        );
        return;
      }

      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: fileName,
          startIn: "documents",
          types: [
            {
              description: "GeoJSON file",
              accept: { "application/geo+json": [".geojson"] }
            }
          ]
        });

        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        setSaveStatus("Saved using native Save As dialog.");
      } catch (error) {
        if (error && error.name === "AbortError") {
          setSaveStatus("Save canceled.");
          return;
        }

        fallbackDownload(content);
        setSaveStatus("Could not open Save As dialog, fallback download was used.");
      }
    }

    async function onSaveClick() {
      await saveGeoJSON();
    }

    function initialize() {
      if (saveButtonEl) {
        saveButtonEl.addEventListener("click", onSaveClick);
      }

      if (!window.isSecureContext || typeof window.showSaveFilePicker !== "function") {
        setSaveStatus("Tip: run from http://localhost or https to enable folder selection on save.");
      }
    }

    return {
      initialize
    };
  }

  window.createSaveManager = createSaveManager;
})();
