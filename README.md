# Interactive artwork map

A small HTML/CSS/JavaScript website using Leaflet with a custom illustrated map, an SVG path overlay, clustered markers loaded from CSV, and smooth incremental zooming.

## Run locally

The browser cannot load the CSV when `index.html` is opened directly from Finder. Start a small local server in this folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Edit the map

- Replace files in `assets/` while keeping their names, or update the paths near the top of `app.js`.
- Edit `CONFIG.topLeft` and `CONFIG.bottomRight` when the geographic bounds change.
- Fine-tune marker alignment with `CONFIG.markerRotationCCW` and `CONFIG.markerOffset` in `app.js`. Offset values are proportions of the map; for example, `y: -0.10` moves markers upward by 10%.
- Add columns to the CSV and map them in the `item` object in `app.js`.
- The SVG overlay is already aligned to the JPG because both have the same aspect ratio.

For production, upload the complete folder to a web server. The current version loads Leaflet and Leaflet.markercluster from unpkg.com, so it requires an internet connection.
