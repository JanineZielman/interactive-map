const CONFIG = {
  image: { width: 1448, height: 2048 },
  // Coordinates supplied for the artwork's top-left and bottom-right corners.
  topLeft: { lon: 5.826866, lat: 52.098975 },
  bottomRight: { lon: 5.815397, lat: 52.092296 },
  markerRotationCCW: 90,
  markerOffset: { x: -0.02, y: 0 },
  minZoom: -1,
  maxZoom: 4
};

const imageBounds = [[0, 0], [CONFIG.image.height, CONFIG.image.width]];
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: CONFIG.minZoom,
  maxZoom: CONFIG.maxZoom,
  // MarkerCluster builds one spatial grid per integer zoom level.
  // Leaflet still animates fluidly between these cluster-safe levels.
  zoomSnap: 1,
  zoomDelta: 1,
  wheelDebounceTime: 35,
  wheelPxPerZoomLevel: 140,
  zoomAnimation: true,
  fadeAnimation: true,
  markerZoomAnimation: true,
  zoomControl: false,
  attributionControl: false,
  maxBounds: [[-350, -350], [CONFIG.image.height + 350, CONFIG.image.width + 350]],
  maxBoundsViscosity: 0.75
});

L.imageOverlay('assets/KM-V09.jpg', imageBounds, { className: 'map-art', zIndex: 1 }).addTo(map);
L.imageOverlay('assets/paden.svg', imageBounds, { className: 'path-layer', opacity: .78, zIndex: 2 }).addTo(map);

function resetView(animated = false) {
  map.fitBounds(imageBounds, { padding: [35, 35], animate: animated });
}
resetView();

// Maps geographic coordinates linearly onto the supplied, rotated artwork.
function geoToArtwork(lon, lat) {
  const west = Math.min(CONFIG.topLeft.lon, CONFIG.bottomRight.lon);
  const east = Math.max(CONFIG.topLeft.lon, CONFIG.bottomRight.lon);
  const u = (lon - west) / (east - west);
  const v = (CONFIG.topLeft.lat - lat) / (CONFIG.topLeft.lat - CONFIG.bottomRight.lat);

  // Transform normalized marker coordinates independently of the artwork.
  // Positive angles rotate counter-clockwise as seen on screen.
  const angle = CONFIG.markerRotationCCW * Math.PI / 180;
  const dx = u - 0.5;
  const dy = v - 0.5;
  const transformedU = 0.5 + Math.cos(angle) * dx + Math.sin(angle) * dy + CONFIG.markerOffset.x;
  const transformedV = 0.5 - Math.sin(angle) * dx + Math.cos(angle) * dy + CONFIG.markerOffset.y;
  const x = transformedU * CONFIG.image.width;
  const yFromTop = transformedV * CONFIG.image.height;
  return L.latLng(CONFIG.image.height - yFromTop, x);
}

function parseCSV(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

let activeMarker = null;
const panel = document.querySelector('#info-panel');
const scrim = document.querySelector('#close-panel');
const markerLayer = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  animate: true,
  animateAddingMarkers: true,
  disableClusteringAtZoom: 2,
  maxClusterRadius(zoom) {
    return Math.max(28, 85 - ((zoom - CONFIG.minZoom) * 18));
  },
  iconCreateFunction(cluster) {
    return L.divIcon({
      className: 'art-cluster',
      html: `<span class="art-cluster__dot">${cluster.getChildCount()}</span>`,
      iconSize: [42, 42], iconAnchor: [21, 21]
    });
  }
});
map.addLayer(markerLayer);

function showArtwork(item, marker) {
  activeMarker?.getElement()?.classList.remove('is-active');
  activeMarker = marker;
  marker.getElement()?.classList.add('is-active');
  document.querySelector('#panel-number').textContent = `Collection no. ${item.id}`;
  document.querySelector('#panel-title').textContent = item.title || 'Untitled';
  document.querySelector('#panel-artist').textContent = item.artist || 'Artist unknown';
  const details = [
    ['Material', item.material],
    ['Date', item.date],
    ['Coordinates', `${item.lat.toFixed(6)}, ${item.lon.toFixed(6)}`]
  ].filter(([, value]) => value);
  document.querySelector('#panel-details').innerHTML = details.map(([label, value]) =>
    `<div class="detail-row"><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(String(value))}</dd></div>`
  ).join('');
  panel.classList.add('is-open');
  scrim.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
}

function closePanel() {
  panel.classList.remove('is-open'); scrim.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  activeMarker?.getElement()?.classList.remove('is-active'); activeMarker = null;
}

function escapeHTML(value) {
  const el = document.createElement('div'); el.textContent = value; return el.innerHTML;
}

fetch('assets/coordinates.csv')
  .then(response => { if (!response.ok) throw new Error('Could not load coordinates.csv'); return response.text(); })
  .then(text => {
    const rows = parseCSV(text); const data = rows.slice(1);
    let count = 0;
    data.forEach(columns => {
      const item = {
        id: columns[0], artist: columns[1], title: columns[2],
        material: columns[5], date: columns[7], lon: Number(columns[8]), lat: Number(columns[9])
      };
      if (!Number.isFinite(item.lon) || !Number.isFinite(item.lat)) return;
      const icon = L.divIcon({ className: 'art-marker', html: `<span class="art-marker__dot">${escapeHTML(item.id)}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] });
      const marker = L.marker(geoToArtwork(item.lon, item.lat), { icon, title: `${item.artist}: ${item.title}`, riseOnHover: true });
      marker.on('click', () => showArtwork(item, marker)); count++;
      markerLayer.addLayer(marker);
    });
    const status = document.querySelector('#status'); status.textContent = `${count} works loaded`;
    setTimeout(() => status.classList.add('is-hidden'), 1600);
  })
  .catch(error => { document.querySelector('#status').textContent = `${error.message}. Open this folder through a local web server.`; });

document.querySelector('#zoom-in').addEventListener('click', () => map.zoomIn(1));
document.querySelector('#zoom-out').addEventListener('click', () => map.zoomOut(1));
document.querySelector('#reset-map').addEventListener('click', () => resetView(true));
document.querySelector('#panel-close').addEventListener('click', closePanel);
scrim.addEventListener('click', closePanel);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });
