# ANTELEO · Guided Café Gameplay & City Preview

[Western river-city expansion, chunk streaming and measured limitations](docs/CITY-EXPANSION.md). The existing café and coast are retained; 45 buildings, four traversable bridges and eight additional views extend the city. Shift runs in POV. High is the default graphics preset; `?perf=1` opens diagnostics.

A playable café in the existing Vite + Three.js city: at most three customers stay inside with two outdoor waits, customers arrive every 20–35 seconds, orders queue FIFO, the player selects one order, follows 3–5 highlighted brewing steps, gives change in VND and serves customers who then sit or take away. The fixed barista is removed and the staff counter is cleared and reoriented.

Click **Chơi quán**, use **E** at the door, **O** to admit customers, then walk around the right end of the counter to the staff POS. Start the first order and follow the golden markers. Payment happens before seating. **J** opens quests; settings provide static highlights and easier change. [Play guide, save migration and tested scope](docs/GAMEPLAY.md).

[Orders](docs/guided-orders.png) · [Brewing guide](docs/guided-brewing.png) · [Cash drawer](docs/guided-cash.png)

The city now has a saved **day/night clock**: 1 real second = 1 game minute,
starting at day 1, 07:00. Morning is gentle, noon has strong overhead sun,
afternoon warms into a soft sunset, and night has moon/stars and automatic
street/shop lights. The sea follows the light. [Clock controls and implementation](docs/DAY-NIGHT.md).
[Morning](docs/time-morning.png) · [Noon](docs/time-noon.png) · [Sunset](docs/time-sunset.png) · [Night](docs/time-night.png)

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
- **View selector:** 13 options including the new city, residential and fish
  views; all nine previous presets remain available.
- **Tạm dừng / Tiếp tục:** pause or resume the moving scene for inspection.
- **Chụp ảnh:** downloads a PNG of the viewport without interface overlays.

The van and walking routes start automatically. The browser reduced-motion
preference reduces character gestures, while the explicit pause button stops
the street environment for inspection. The active café shift and world clock pause with the scene. Camera controls work in either state.

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
populate the shopfronts, and the café counter is operated by the player. Walking
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
- `src/game/`: customer FSM, FIFO orders, guided preparation, cash register, payments,
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

`npm test`: **88 passed** (including expanded map, streaming codec and closing checks). `npm run build`: successful, with a nonfatal bundle-size advisory. The preceding café UI milestone completed a three-customer queue, guided espresso, exact change, seating, sidewalk exit and save. Accounting: 20.000đ sales, 3.000đ ingredients, 117.000đ balance. [Validation details and limitations](docs/GAMEPLAY.md).

No Vercel deployment, environment publication or merge to main was performed.
