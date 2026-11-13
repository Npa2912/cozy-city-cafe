# ANTELEO · City & Coast Preview

A real, explorable Vite + Three.js café and flower-shop street, refined from the
three supplied reference views. The existing project and reference landmarks
are retained: curved cream café, green watering-can roof sculpture, flower
emblem, purple vending machine, barber pole and pastel skyline.

The approved core is retained and extended by a connected commercial district,
seaside promenade, fishing pier and a rear café room with a modeled POS station.
See [the expansion guide](docs/EXPANSION.md) for layout and inspection cameras.

The latest [reference refinement](docs/REFERENCE-REFINEMENT.md) replaces repeated
expansion houses with varied blocks, adds connected streets and a fountain
plaza, and brings the sea to life with swimming and occasionally jumping fish.
[Latest city render](docs/reference-city.png) · [Residential view](docs/reference-residential.png) ·
[Fish near the pier](docs/reference-fish.png)

[Expanded city](docs/expanded-city.png) · [Retained core](docs/core-retained.png) · [Seaside](docs/seaside.png) ·
[Fishing pier](docs/fishing-pier.png) · [Rear room](docs/cafe-annex.png) ·
[POS](docs/pos-terminal.png)

[Overview](docs/preview-desktop.png) · [Flower-shop view](docs/preview-flowers.png) ·
[Street view](docs/preview-street.png) · [Café counter](docs/preview-counter.png) ·
[Portrait](docs/preview-mobile.png)

## Run and deploy

Use Node.js 22.12+ or Node.js 24.

```sh
npm ci
npm run dev
npm run build
npm run preview
npm test
```

Vercel framework: **Vite**. Build command: **npm run build**. Output: **dist**.
`vercel.json` contains these settings. No application secrets, database, remote
model downloads or external asset requests are required at runtime.

## Preview controls

- **Free Camera:** drag to orbit, wheel to zoom, right-drag to pan.
- **POV WASD:** click the walking button, move with WASD and look with the mouse.
  Escape releases pointer lock. This is a viewing camera, not a collision-based
  player or gameplay system.
- **Reset to Reference View:** returns to the expanded reference view.
- **View selector:** 12 options including the new city, residential and fish
  views; all nine previous presets remain available.
- **Tạm dừng / Tiếp tục:** pause or resume the moving scene for inspection.
- **Chụp ảnh:** downloads a PNG of the viewport without interface overlays.

The van and walking routes start automatically. The browser reduced-motion
preference reduces character gestures, while the explicit pause button stops
the scene for inspection. Camera controls work in either state.

## Exterior and expanded map

The street extends along both sides into a deeper block, with a left alley,
steps and terrace, additional bakery/café fronts, rear skyline layers and an
arched pedestrian bridge. The street has two van lanes, a zebra crossing,
kerbstones and drain grilles. Furnishings occupy a curb strip; pedestrians use
separate pavement lanes.

The florist has a wooden hanging sign, striped awning, tiered crates, modeled
metal buckets, sunflowers, pink blossoms, hydrangea clusters, lanterns and café
seating. Additional planting includes branched shade trees, flower boxes,
rooftop gardens, cascades, scattered petals and climbing foliage. Towers have
side and rear window bays as well as their front façades.

The café includes an espresso machine with gauges and steam wands, grinder,
bubble-tea sealer, blender, ingredient jars, cups with straws and pearls, a
pastry case, menu prices, shelving, framed wall decorations, pendant lights,
tables and curved-back chairs. The raised roof supports its watering-can
sculpture; the air-conditioning unit is attached to a building wall.

## Moving van and pedestrians

The cream/turquoise van uses two connected lanes and continuous turning arcs
at the ends of the block. It slows before the crossing, waits **1.6 seconds**,
then accelerates. Wheel rotation follows travel; short simulation substeps
preserve acceleration and braking when a frame is slow. This is a scheduled
preview animation, not a traffic AI or gameplay system.

Four walking characters use reserved pavement routes, two standing characters
populate the shopfronts, and a barista works behind the café counter. Walking
positions ease into turns, with a brief turn pause and articulated arm/leg
swings. Passing routes are separated; none of the walkers enters the road.

## Rendering and source layout

- `src/street.js`: original architecture and surface artwork, with refined
  windows, roof support, façades and street furniture.
- `src/refinement.js`: expanded block, florist, café interior, flowers, trees,
  bridge, seating and decorative detail.
- `src/life.js`: modeled van and characters, articulated animation and local
  batching that preserves moving joints.
- `src/traffic.js`, `src/pedestrians.js`: deterministic movement schedules.
- `src/batch-static.js`: static geometry/material batching in spatial cells; explicitly excludes
  moving hierarchies. Flowers and foliage use instancing.
- `src/main.js`: camera presets, controls, sun and warm interior lights,
  dynamic shadow refresh, pause and PNG export.

The sun lights the café front and produces canopy shadows on the pavement;
interior point lights and emissive lanterns add warm highlights. Screenshots
are captured with motion paused so that each view can be inspected clearly.

## Fidelity limits

This is a procedural reconstruction, not the original reference's production
assets. Exact illustration/lettering, fine fabric and hair detail, cloud shapes,
some skyline proportions and individual flower arrangements still differ.
The supplied images also have different lens and elevation choices; the presets
are fitted visually rather than photographically calibrated. No measured
"95% similarity" score is claimed. Neighboring stores use illustrated window
contents; the main café has actual interior geometry.

## Validation

`npm test` passes 17 checks covering full van circuits, bounded stops and speed, route continuity,
pedestrian lane separation and turn easing, and preservation of moving objects
by static batching. Expansion checks cover rear-room clearance, POS placement,
shore connectivity, safe POV starts, retained camera presets and foliage LOD.
`npm run build` produces the Vercel output. Vite emits a
non-failing bundle-size advisory (approximately 717 kB minified / 206 kB gzip).
The latest production browser checks passed for 12 view options, reset,
POV/WASD/Escape, PNG export, fish animation and portrait layout, with no
JavaScript or shader errors. The preceding stage also verified orbit/reset.
Latest screenshots and detailed evidence are in the reference refinement guide.
No Vercel deployment or environment publication was performed.
