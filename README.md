# Cozy City Café · 3D Street Preview

An explorable Three.js exterior study of the supplied street reference. The
scene opens immediately with a fitted reference camera: cream arched café,
rooftop green watering can, flower emblem, purple vending machine, barber pole,
foreground benches and bin, street lamps, hydrant, hanging signs, tiled pavement,
and a layered pastel skyline with planted balconies.

[Desktop render](docs/preview-desktop.png) · [Portrait render](docs/preview-mobile.png)

## Run

Use Node.js 22.12+ or 24 (Node.js 24 verified).

```sh
npm ci
npm run dev
```

- **Free Camera:** drag to orbit, scroll to zoom, right-drag to pan.
- **POV WASD:** click the walking button, then use WASD and the mouse. Escape
  releases the pointer and returns to orbit mode. Movement is at eye level;
  diagonal movement is normalized.
- **Reset to Reference View:** restores the opening position, look target and
  field of view, including after walking or dragging.
- **Chụp ảnh:** downloads a PNG of the 3D viewport without the interface.

This is an exterior preview, with no gameplay or collision system. Interior
objects are limited to details visible through the storefront windows.

## Production / Vercel

```sh
npm run build
npm run preview
```

Vercel framework: **Vite**, build command: **npm run build**, output: **dist**.
`vercel.json` provides these settings. No database, environment variables or
remote asset requests are needed at runtime.

## Scene implementation

`src/street.js` builds rounded and extruded architecture, curved roofs, arched
window frames, sculpted rooftop objects, 3D lettering, tiled roofs, and street
furniture. Surface artwork is generated locally with Canvas. Glass is separate
from opaque frames. Foliage uses colored instances; static geometry is batched
by material in `src/batch-static.js` to reduce draw calls. Layout and movement
are deterministic, with no animated gameplay state.

`src/main.js` owns the renderer, lighting, saved reference camera, controls,
resize handling and screenshot export. The reference camera is fitted for a
landscape viewport; portrait mode uses a wider field of view.

## Reference fidelity

The composition and identifying objects were refined against the attached
reference across multiple render passes. This is a procedural reconstruction,
not an extraction of the original game's models. The following still differ:

- The exact original lettering and billboard illustrations are approximated.
- Window contents, foliage silhouettes, distant rooftop sculptures and detailed
  surface textures do not reproduce every element of the source image.
- Building spacing, lens calibration and some skyline proportions were fitted
  visually, and are not an exact photographic match.

The preserved visual priorities are the left café, curved cream parapet, large
rooftop watering can, street depth to the right, near-right awning, pastel
buildings and daytime palette.

## Validation

- `npm run build` completes and produces the Vercel `dist` output.
- Chromium production checks pass for orbit, pointer lock, WASD, Escape,
  viewport PNG download, and a 390 × 844 portrait viewport without overflow.
- Reference reset after both orbit and walking restores an identical viewport
  image in the browser comparison (zero changed pixels after removing hover).
- No JavaScript page errors were recorded.

Vite reports a bundle-size advisory for the bundled Three.js scene (about
650 kB minified / 180 kB gzip). This does not fail the build. No deployment to
Vercel has been performed.
