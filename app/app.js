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

const twoGis = L.tileLayer("https://tile2.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1", {
  maxZoom: Math.min(config.maxZoom, 18),
  attribution: "&copy; 2GIS"
});

L.control.layers(
  {
    OpenStreetMap: osm,
    "2GIS": twoGis
  },
  {},
  { position: "topright" }
).addTo(map);

const pointManager = window.createPointManager({
  map,
  pointCountEl: document.getElementById("pointCount")
});

const saveManager = window.createSaveManager({
  getFeatures: () => pointManager.getFeatures(),
  saveStatusEl: document.getElementById("saveStatus"),
  saveButtonEl: document.getElementById("saveBtn")
});

map.on("click", (e) => {
  pointManager.addPoint(e.latlng);
});

saveManager.initialize();
