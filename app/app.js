const defaultConfig = {
  mapCenter: [40.7128, -74.0060],
  defaultZoom: 12,
  maxZoom: 19
};

const config = {
  ...defaultConfig,
  ...(window.APP_CONFIG || {})
};

const map = L.map("map", { maxZoom: config.maxZoom }).setView(config.mapCenter, config.defaultZoom);

const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: config.maxZoom,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const dark = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  maxZoom: config.maxZoom,
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
});

const twoGis = L.tileLayer("https://tile2.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1", {
  maxZoom: Math.min(config.maxZoom, 18),
  attribution: "&copy; 2GIS"
});

L.control.layers(
  {
    "OpenStreetMap (Default)": osm,
    "Dark": dark,
    "2GIS": twoGis
  },
  {},
  { position: "topright" }
).addTo(map);

const removePointButton = document.getElementById("removePointBtn");
const latLonInput = document.getElementById("latLonInput");
const addCoordButton = document.getElementById("addCoordBtn");

const pointManager = window.createPointManager({
  map,
  pointCountEl: document.getElementById("pointCount"),
  onPointsChanged: (count) => {
    if (removePointButton) {
      removePointButton.disabled = count === 0;
    }
  }
});

const saveManager = window.createSaveManager({
  getFeatures: () => pointManager.getFeatures(),
  saveStatusEl: document.getElementById("saveStatus"),
  saveButtonEl: document.getElementById("saveBtn")
});

map.on("click", (e) => {
  pointManager.addPoint(e.latlng);
});

function parseLatLon(value) {
  const parts = String(value).split(",").map((part) => part.trim());
  if (parts.length !== 2) {
    return null;
  }

  const lat = Number(parts[0]);
  const lng = Number(parts[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

function addPointFromInput() {
  if (!latLonInput) {
    return;
  }

  const parsed = parseLatLon(latLonInput.value);
  if (!parsed) {
    latLonInput.setCustomValidity("Use format: lat, lon (example: 40.7128, -74.0060)");
    latLonInput.reportValidity();
    return;
  }

  latLonInput.setCustomValidity("");
  pointManager.addPoint(parsed);
  map.panTo([parsed.lat, parsed.lng]);
  latLonInput.value = "";
}

if (removePointButton) {
  removePointButton.disabled = !pointManager.hasPoints();
  removePointButton.addEventListener("click", () => {
    pointManager.removeLastPoint();
  });
}

if (addCoordButton) {
  addCoordButton.addEventListener("click", addPointFromInput);
}

if (latLonInput) {
  latLonInput.addEventListener("input", () => {
    latLonInput.setCustomValidity("");
  });

  latLonInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addPointFromInput();
    }
  });
}

saveManager.initialize();
