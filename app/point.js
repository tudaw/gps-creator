(function () {
  function createPointManager(options) {
    const map = options.map;
    const pointCountEl = options.pointCountEl;
    const onPointsChanged = typeof options.onPointsChanged === "function" ? options.onPointsChanged : null;
    const pointsLayer = L.layerGroup().addTo(map);
    const pathLine = L.polyline([], {
      color: "darkgreen",
      weight: 1.5,
      opacity: 1
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

    function getPopupContent(pointId, lat, lng) {
      return (
        '<div class="point-popup">' +
          "<div><strong>Latitude:</strong> " + lat + "</div>" +
          "<div><strong>Longitude:</strong> " + lng + "</div>" +
          '<button class="point-delete-btn" type="button" data-delete-point-id="' + pointId + '">Delete point</button>' +
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

    function addPoint(latlng) {
      const roundedLat = roundCoordinate(latlng.lat);
      const roundedLng = roundCoordinate(latlng.lng);
      const feature = buildFeature(roundedLat, roundedLng);

      const pointId = nextPointId;
      nextPointId += 1;
      feature.properties.popupHtml = getPopupContent(pointId, roundedLat, roundedLng);

      const marker = L.marker([roundedLat, roundedLng], { draggable: true, icon: addedPointIcon })
        .bindPopup(feature.properties.popupHtml)
        .addTo(pointsLayer)
        .openPopup();

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

        const deleteButton = popupEl.querySelector('[data-delete-point-id="' + pointId + '"]');
        if (!deleteButton) {
          return;
        }

        deleteButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          removePoint(pointId);
        }, { once: true });
      });

      updateCount();
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
      getFeatures,
      hasPoints
    };
  }

  window.createPointManager = createPointManager;
})();
