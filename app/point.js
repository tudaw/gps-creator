(function () {
  function createPointManager(options) {
    const map = options.map;
    const pointCountEl = options.pointCountEl;
    const statusEl = options.statusEl;
    const onPointsChanged = typeof options.onPointsChanged === "function" ? options.onPointsChanged : null;
    const pointsLayer = L.layerGroup().addTo(map);
    const pathLine = L.polyline([], {
      color: "darkgreen",
      weight: 1.5,
      opacity: 1,
      className: "gps-path-line"
    }).addTo(map);
    const points = new Map();
    const pointOrder = [];
    let nextPointId = 1;

    function updateCount() {
      if (pointCountEl) {
        pointCountEl.textContent = "Points: " + points.size;
      }

      if (onPointsChanged) {
        onPointsChanged(points.size);
      }
    }

    function setStatus(message) {
      if (!statusEl) {
        return;
      }

      if (!message) {
        statusEl.textContent = "";
        statusEl.classList.remove("is-visible");
        return;
      }

      statusEl.textContent = message;
      statusEl.classList.add("is-visible");
    }

    function buildFeature(lat, lng) {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        properties: {
          popupHtml: ""
        }
      };
    }

    function roundCoordinate(value) {
      return Number(value.toFixed(10));
    }

    const addedPointIcon = L.divIcon({
      className: "added-point-marker",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -8]
    });

    function getPopupField(label, value) {
      return (
        '<div class="point-popup-field">' +
          '<strong class="point-popup-field-label">' + label + ":</strong> " +
          '<span class="point-popup-field-value">' + value + "</span>" +
        "</div>"
      );
    }

    function getPopupContent(pointId, lat, lng) {
      return (
        '<div class="point-popup">' +
          getPopupField("Latitude", lat) +
          getPopupField("Longitude", lng) +
          '<div class="point-popup-actions">' +
            '<button class="point-copy-btn" type="button" data-copy-point-id="' + pointId + '" title="Copy coordinates" aria-label="Copy coordinates">' +
              '<i class="fa fa-copy" aria-hidden="true"></i>' +
            "</button>" +
            '<button class="point-delete-btn" type="button" data-delete-point-id="' + pointId + '" title="Delete point" aria-label="Delete point">' +
              '<i class="fa fa-trash" aria-hidden="true"></i>' +
            "</button>" +
          "</div>" +
        "</div>"
      );
    }

    function updatePoint(pointId, lat, lng) {
      const point = points.get(pointId);

      if (!point) {
        return;
      }

      const roundedLat = roundCoordinate(lat);
      const roundedLng = roundCoordinate(lng);
      const popupHtml = getPopupContent(pointId, roundedLat, roundedLng);

      point.feature.geometry.coordinates = [roundedLng, roundedLat];
      point.feature.properties.popupHtml = popupHtml;
      point.marker.setPopupContent(popupHtml);

      if (point.marker.isPopupOpen()) {
        point.marker.openPopup();
      }

      updatePathLine();
    }

    function updatePathLine() {
      const latLngs = [];

      for (let index = 0; index < pointOrder.length; index += 1) {
        const pointId = pointOrder[index];
        const point = points.get(pointId);
        if (!point) {
          continue;
        }

        const coordinates = point.feature.geometry.coordinates;
        latLngs.push([coordinates[1], coordinates[0]]);
      }

      pathLine.setLatLngs(latLngs);
    }

    function copyTextFallback(text) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();

      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }

      textarea.remove();
      return copied;
    }

    async function copyPointCoordinates(pointId) {
      const point = points.get(pointId);
      if (!point) {
        setStatus("Could not copy point coordinates.");
        return;
      }

      const coordinates = point.feature.geometry.coordinates;
      const text = coordinates[1] + ", " + coordinates[0];

      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          await navigator.clipboard.writeText(text);
          setStatus("Coordinates copied to clipboard.");
          return;
        }

        const fallbackCopied = copyTextFallback(text);
        if (!fallbackCopied) {
          setStatus("Copy failed. Clipboard access is unavailable.");
          return;
        }

        setStatus("Coordinates copied to clipboard.");
      } catch (error) {
        const fallbackCopied = copyTextFallback(text);
        if (fallbackCopied) {
          setStatus("Coordinates copied to clipboard.");
          return;
        }

        setStatus("Copy failed. Browser denied clipboard access.");
      }
    }

    function addPoint(latlng) {
      const roundedLat = roundCoordinate(latlng.lat);
      const roundedLng = roundCoordinate(latlng.lng);
      const feature = buildFeature(roundedLat, roundedLng);

      const pointId = nextPointId;
      nextPointId += 1;
      feature.properties.popupHtml = getPopupContent(pointId, roundedLat, roundedLng);

      const marker = L.marker([roundedLat, roundedLng], { draggable: true, icon: addedPointIcon })
        .bindPopup(feature.properties.popupHtml)
        .addTo(pointsLayer);

      points.set(pointId, {
        feature,
        marker
      });
      pointOrder.push(pointId);
      updatePathLine();

      marker.on("dragstart", () => {
        marker.openPopup();
      });

      marker.on("drag", (dragEvent) => {
        const position = dragEvent.target.getLatLng();
        updatePoint(pointId, position.lat, position.lng);
      });

      marker.on("dragend", (dragEvent) => {
        const position = dragEvent.target.getLatLng();
        updatePoint(pointId, position.lat, position.lng);
      });

      marker.on("popupopen", () => {
        const popupEl = marker.getPopup() && marker.getPopup().getElement();
        if (!popupEl) {
          return;
        }

        const copyButton = popupEl.querySelector('[data-copy-point-id="' + pointId + '"]');
        const deleteButton = popupEl.querySelector('[data-delete-point-id="' + pointId + '"]');
        if (copyButton) {
          copyButton.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await copyPointCoordinates(pointId);
          };
        }

        if (deleteButton) {
          deleteButton.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            removePoint(pointId);
          };
        }
      });

      updateCount();
      marker.openPopup();
    }

    function removePoint(pointId) {
      const point = points.get(pointId);
      if (!point) {
        return false;
      }

      pointsLayer.removeLayer(point.marker);
      points.delete(pointId);
      const pointOrderIndex = pointOrder.lastIndexOf(pointId);
      if (pointOrderIndex !== -1) {
        pointOrder.splice(pointOrderIndex, 1);
      }
      updatePathLine();
      updateCount();
      return true;
    }

    function removeLastPoint() {
      const pointId = pointOrder[pointOrder.length - 1];
      if (typeof pointId === "undefined") {
        return false;
      }

      return removePoint(pointId);
    }

    function clearAllPoints() {
      if (points.size === 0) {
        return false;
      }

      pointsLayer.clearLayers();
      points.clear();
      pointOrder.length = 0;
      updatePathLine();
      updateCount();
      return true;
    }

    function getFeatures() {
      return Array.from(points.values(), (point) => point.feature);
    }

    function hasPoints() {
      return points.size > 0;
    }

    updateCount();

    return {
      addPoint,
      removeLastPoint,
      clearAllPoints,
      getFeatures,
      hasPoints
    };
  }

  window.createPointManager = createPointManager;
})();
