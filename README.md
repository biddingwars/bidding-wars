# three.min.js

Bundled, never fetched from a CDN. Apple tests apps in airplane mode.

    npm install three@0.128.0
    cp node_modules/three/build/three.min.js .

Version 0.128 is what the globe was written against. Newer majors moved the
renderer API and will need `globe.js` updated.

If this file is missing the app still runs — `globe()` falls back to the flat
canvas map automatically.

three.js is MIT licensed. Keep the licence text in your About/legal screen.
