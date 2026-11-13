# ANTELEO · Café Gameplay & City Preview

A playable single-player café prototype built directly into the existing
Vite + Three.js city. **Milestones 1–2** provide a physical door, capsule
collision, modeled customers, four recipes, station interactions, POS, money,
EXP, quests and versioned local saves. **Milestone 3** (purchased furniture,
Edit Mode and upgrade-based expansion) is not implemented.

Click **Chơi quán**, use **E** at the door/stations, **O** to toggle admission,
**H** for recipes and **J** for quests. WASD/mouse move and look; Escape frees
the cursor. [Play guide and scope](docs/GAMEPLAY.md).

[Recipes](docs/gameplay-recipes.png) · [Customer at a table](docs/gameplay-customer.png) ·
[Working POS](docs/gameplay-pos.png) · [New milk-tea mascot](docs/gameplay-mascot.png)

The cream café, flower emblem, purple vending machine, barber pole, city, coast
and all 12 camera presets are retained. The rooftop watering can is replaced
by the requested milk-tea mascot; the entrance aisle and counter are cleared.

Earlier visual studies (before gameplay):

The approved core is retained and extended by a connected commercial district,
seaside promenade, fishing pier and a rear café room with a modeled POS station.
See [the expansion guide](docs/EXPANSION.md) for layout and inspection cameras.

The preceding [reference refinement](docs/REFERENCE-REFINEMENT.md) replaces repeated
expansion houses with varied blocks, adds connected streets and a fountain
plaza, and brings the sea to life with swimming and occasionally jumping fish.
[City study](docs/reference-city.png) · [Residential view](docs/reference-residential.png) ·
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
  Escape releases pointer lock. POV now uses capsule collision; Free Camera
  remains available for unrestricted visual inspection.
- **Reset to Reference View:** returns to the expanded reference view.
- **View selector:** 12 options including the new city, residential and fish
  views; all nine previous presets remain available.
- **Tạm dừng / Tiếp tục:** pause or resume the moving scene for inspection.
- **Chụp ảnh:** downloads a PNG of the viewport without interface overlays.

The van and walking routes start automatically. The browser reduced-motion
preference reduces character gestures, while the explicit pause button stops
the street environment for inspection. The active café shift continues
independently. Camera controls work in either state.

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
tables and curved-back chairs. The raised roof supports the milk-tea
mascot; the air-conditioning unit is attached to a building wall.

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
- `src/game/`: customer FSM, orders, recipe validator, preparation, payments,
  economy, quests, collision/navigation, saves, UI and scene bindings.
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

`npm test` passes **33 checks** covering café lifecycle rules, all four recipes,
wrong drinks/costs, payment/reward deduplication, save/load, capsule contacts and
A* paths, plus the existing city/traffic/foliage checks. `npm run build` succeeds
with a non-failing bundle advisory (approximately 753 kB / 222 kB gzip).

The real-geometry browser test operates the door, receives an order, crafts at
the actual stations, serves a modeled customer, waits for drinking, pays once,
walks the customer outside, cleans the seat and writes the save. Its accounting
result is 25 xu revenue, 3 xu ingredient cost and a 122 xu balance. Detailed
validation and remaining work are recorded in the play guide.

No Vercel deployment, environment publication or merge to main was performed.
