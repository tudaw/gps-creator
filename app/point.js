(function () {
  function createPointManager(options) {
    const map = options.map;
    const pointCountEl = options.pointCountEl;
    const pointsLayer = L.layerGroup().addTo(map);
    const points = new Map();
    let nextPointId = 1;

    function updateCount() {
      if (pointCountEl) {
        pointCountEl.textContent = "Points: " + points.size;
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

    function getPopupContent(lat, lng) {
      return (
        '<div class="point-popup">' +
          "<div><strong>Latitude:</strong> " + lat + "</div>" +
          "<div><strong>Longitude:</strong> " + lng + "</div>" +
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
      const popupHtml = getPopupContent(roundedLat, roundedLng);

      point.feature.geometry.coordinates = [roundedLng, roundedLat];
      point.feature.properties.popupHtml = popupHtml;
      point.marker.setPopupContent(popupHtml);

      if (point.marker.isPopupOpen()) {
        point.marker.openPopup();
      }
    }

    function addPoint(latlng) {
      const roundedLat = roundCoordinate(latlng.lat);
      const roundedLng = roundCoordinate(latlng.lng);
      const feature = buildFeature(roundedLat, roundedLng);

      feature.properties.popupHtml = getPopupContent(roundedLat, roundedLng);

      const marker = L.marker([roundedLat, roundedLng], { draggable: true })
        .bindPopup(feature.properties.popupHtml)
        .addTo(pointsLayer)
        .openPopup();

      const pointId = nextPointId;
      nextPointId += 1;

      points.set(pointId, {
        feature,
        marker
      });

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

      updateCount();
    }

    function getFeatures() {
      return Array.from(points.values(), (point) => point.feature);
    }

    updateCount();

    return {
      addPoint,
      getFeatures
    };
  }

  window.createPointManager = createPointManager;
})();
