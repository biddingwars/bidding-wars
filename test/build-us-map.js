/* Builds the US results map from open data. DEV-ONLY: needs `us-atlas`, `topojson-client`, `d3-geo` and `sharp`
   (npm) plus a world raster in plain lat/long (the repo uses NASA Blue Marble Next Generation, July, 21600x10800: see NOTICE.md).
   It writes four files at the repo root (the game itself needs none of these packages):
     us-map.js      projected state outlines, label points, nation outline (loaded lazily on the results screen)
     us-map.webp    the contiguous US, satellite-style, registered to the outlines (Albers equal-area conic)
     us-ak.webp     Alaska inset (same idea, its own conic)
     us-hi.webp     Hawaii inset
   Usage:  NODE_PATH=<dir with node_modules> node test/build-us-map.js <world.tif> [out-dir]
   To change the imagery hand this script another equirectangular file — nothing else changes: the warp samples by longitude/latitude.
   Borders: US Census Bureau cartographic boundary files via us-atlas (public domain). */
const fs = require('fs'), path = require('path');
const SRC = process.argv[2], OUT = process.argv[3] || path.join(__dirname, '..');
if (!SRC) {                                                          // `node --test` also picks this file up: do nothing there
  if (!process.env.NODE_TEST_CONTEXT) { console.error('usage: node build-us-map.js <equirectangular world image> [out-dir]'); process.exit(1); }
  return;
}
const sharp = require('sharp');
const topo = require('topojson-client');
const { geoAlbers, geoConicEqualArea, geoPath } = require('d3-geo');
const atlas = require('us-atlas/states-10m.json');
const content = JSON.parse(fs.readFileSync(path.join(__dirname, 'states-content.json'), 'utf8'));
const ABBR = content.abbr;                                          // "California" → "CA"

const all = topo.feature(atlas, atlas.objects.states).features;
const states = all.filter(f => ABBR[f.properties.name]);           // the 50 states: no DC, no territories
if (states.length !== 50) throw new Error('expected 50 states, got ' + states.length);
const byAbbr = {}; states.forEach(f => { byAbbr[ABBR[f.properties.name]] = f; });
const lower48 = states.filter(f => !['AK', 'HI'].includes(ABBR[f.properties.name]));

const MAIN = { w: 1200, h: 740 };
const BOXES = { AK: { w: 250, h: 190 }, HI: { w: 200, h: 130 } };
const IMG_SCALE = { main: 1, AK: 2, HI: 3 };                        // image pixels per viewBox unit

/* ---------- projections, each fitted to its own box ---------- */
const pMain = geoAlbers().fitExtent([[12, 12], [MAIN.w - 12, MAIN.h - 12]], { type: 'FeatureCollection', features: lower48 });
const pAK = geoConicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]).fitExtent([[8, 8], [BOXES.AK.w - 8, BOXES.AK.h - 8]], byAbbr.AK);
const pHI = geoConicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]).fitExtent([[8, 8], [BOXES.HI.w - 8, BOXES.HI.h - 8]], byAbbr.HI);

const pathFor = (proj, dg = 0) => { const g = geoPath(proj).digits(dg); return f => g(f) || ''; };   // whole viewBox units are plenty: the map is shown at about a third of its size

function layer(proj, feats, dg) {
  const pf = pathFor(proj, dg), g = geoPath(proj), out = {};
  feats.forEach(f => {
    const a = ABBR[f.properties.name];
    // label point: centroid of the biggest piece (so Michigan/Hawaii/Alaska don't land in the water)
    let best = null, area = -1;
    const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map(c => ({ type: 'Polygon', coordinates: c })) : [f.geometry];
    polys.forEach(pg => { const ar = g.area(pg); if (ar > area) { area = ar; best = pg; } });
    const c = g.centroid(best);
    out[a] = { d: pf(f), c: [Math.round(c[0] * 10) / 10, Math.round(c[1] * 10) / 10] };
  });
  return out;
}

const mainStates = layer(pMain, lower48, 0), akStates = layer(pAK, [byAbbr.AK], 1), hiStates = layer(pHI, [byAbbr.HI], 1);
const merged = topo.merge(atlas, atlas.objects.states.geometries.filter(g => ABBR[g.properties.name] && !['AK', 'HI'].includes(ABBR[g.properties.name])));
const outline = pathFor(pMain)({ type: 'Feature', geometry: merged });

let _src; const source = () => (_src = _src || sharp(SRC, { limitInputPixels: false }).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
/* ---------- warp: for each output pixel, invert the projection and sample the equirectangular source ---------- */
async function warp(proj, box, scale, file, q) {
  const { data, info } = await source();
  const SW = info.width, SH = info.height, ch = info.channels;
  const W = Math.round(box.w * scale), H = Math.round(box.h * scale), out = Buffer.alloc(W * H * 3);
  const px = (ix, iy, k) => data[((Math.min(SH - 1, Math.max(0, iy))) * SW + ((ix % SW) + SW) % SW) * ch + k];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ll = proj.invert([(x + 0.5) / scale, (y + 0.5) / scale]);
    const o = (y * W + x) * 3;
    if (!ll || !isFinite(ll[0]) || !isFinite(ll[1])) continue;
    const fx = (ll[0] + 180) / 360 * SW - 0.5, fy = (90 - ll[1]) / 180 * SH - 0.5;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    for (let k = 0; k < 3; k++) {
      const a = px(x0, y0, k) * (1 - tx) + px(x0 + 1, y0, k) * tx, b = px(x0, y0 + 1, k) * (1 - tx) + px(x0 + 1, y0 + 1, k) * tx;
      out[o + k] = Math.round(a * (1 - ty) + b * ty);
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: q, effort: 6 }).toFile(path.join(OUT, file));
  return { file, w: W, h: H, bytes: fs.statSync(path.join(OUT, file)).size };
}

(async () => {
  const report = [];
  report.push(await warp(pMain, MAIN, IMG_SCALE.main, 'us-map.webp', 74));
  report.push(await warp(pAK, BOXES.AK, IMG_SCALE.AK, 'us-ak.webp', 72));
  report.push(await warp(pHI, BOXES.HI, IMG_SCALE.HI, 'us-hi.webp', 72));
  const data = {
    main: { w: MAIN.w, h: MAIN.h, image: 'us-map.webp', outline, states: mainStates },
    AK: { w: BOXES.AK.w, h: BOXES.AK.h, image: 'us-ak.webp', states: akStates },
    HI: { w: BOXES.HI.w, h: BOXES.HI.h, image: 'us-hi.webp', states: hiStates }
  };
  const js = `/* us-map.js — projected state outlines for the US results map. GENERATED by test/build-us-map.js; do not edit.
   Borders: U.S. Census Bureau cartographic boundary files (public domain), via us-atlas. Projection: Albers equal-area
   conic (contiguous US), conic equal-area insets for Alaska and Hawaii. Imagery files are registered to these outlines. */
(function (root) {
  const map = ${JSON.stringify(data)};
  if (typeof module === 'object' && module.exports) module.exports = map; else root.USMAP = map;
})(typeof self !== 'undefined' ? self : this);
`;
  fs.writeFileSync(path.join(OUT, 'us-map.js'), js);
  report.forEach(r => console.log(r.file, r.w + 'x' + r.h, Math.round(r.bytes / 1024) + ' KB'));
  console.log('us-map.js', Math.round(js.length / 1024) + ' KB');
})();
