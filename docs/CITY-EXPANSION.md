# City expansion and practical rendering improvements

The existing café, original thirteen views, coastal district, pier, lighthouse,
fish, traffic, day/night clock, recipes, POS, quests and saves remain in this
Vite/Three.js project. High remains the default. The current scope favors modest
useful improvements while preserving appearance and gameplay.

## Map and circulation

The western hill is replaced by a planned district: **35 low/mid-rise buildings,
eight shop-base towers, a clock hall and a conservatory — 45 added buildings**.
Gables, corner fronts, terraces, duplex roofs, shops, balconies and roof gardens
mix across five frontage bands. Three fountain pockets, river-facing cafés,
trees, flower boxes, lamps and benches complete the public areas.

The extension reaches X −145, Z −108…52 in project coordinates. These are world
units, not surveyed real-world area. See the [coordinate plan](EXPANSION-PLAN.md).
Streets at X −124, −101 and −47 cross at Z −100, 22 and 42. Northern and southern
links meet the original central road at X 4. The middle link stops before the
retained cottages, rather than cutting through them.

A curved canal widens into the connected sea. Its shader shares the sea's time,
lighting and day/night uniforms. **Three road bridges and one pedestrian bridge**
have continuous ramps, floor queries, railing collision and water exclusion.
Bank paths meet the decks without spilling paving into traffic lanes. The
pedestrian bridge also has two walking characters. Eight additional views are
available; Free Camera, POV, Shift to run and Reference View remain available.

## Customers and closing

`src/game/traffic-config.js` retains **three customers inside, two outside and
random arrivals every 20–35 seconds**. One doorway lease serializes passage and
prioritizes exits. A closing request immediately stops admissions and sends
outside guests whose entry has not begun away along their normal paths. Inside
orders continue. The door waits for a clear swing, opens automatically for an
inside guest's departure, and closes safely again. No routine NPC teleport was
introduced. See the [game guide](GAMEPLAY.md).

## Rendering and resources

- **Frustum culling:** spatial batches keep accurate bounds; the city remains
  culled normally. A small upload-warming page temporarily bypasses rejection
  to prepare buffers behind the camera, then restores normal culling.
- **163 chunks:** every cell retains a landscape representation. High detail is
  restored from lossless compressed manifests and released outside the buffer.
  The café's four cells stay resident. Gameplay actors, doors, vehicles, water,
  fish, colliders and save state remain owned by their existing systems.
- **Preserved nearby detail:** original near vertices, instance populations,
  colors, textures and materials are retained. Distant curved meshes use lower
  tessellation; houses are not replaced by plain boxes. Custom pavement UVs are
  preserved. Indexing reuses duplicate vertices without removing faces.
- **Batching:** compatible paints use vertex colors; instances retain their
  transforms and colors. Shared geometry identity survives eviction and reload,
  so instancing also works on restored chunks.
- **Loading policy:** 16-unit cells, a mandatory 32-unit near zone, and soft
  decoded-detail budgets of 64/112/192 MiB for Low/Medium/High. Radius follows
  actual buffer byte counts, with a 112-unit upper bound. Near detail takes
  priority over the soft budget; buffered selection may exceed it by 35%.
- **Prefetch and transitions:** measured load latency and smoothed velocity drive
  `speed × (latency + 0.8 s) + 32 units`, capped at 96 units. Heading adds a
  16-unit lead; eviction has a 32-unit buffer. Complementary dither crossfades
  over 0.45 s while the landscape remains visible. Obsolete warm/compile waits
  are cancelled when the region is no longer needed.
- **Work scheduling:** encoding/decoding yield every 32 objects, assembly yields
  between pages after a 4 ms target, and warming groups small uploads up to
  1.5 MiB or 64 objects. A single large mesh can exceed the page target.
- **Shadows:** High retains 2048² maps and the original 64-unit near footprint.
  Nearby color geometry is unchanged. Small opaque plant depth proxies are
  permitted only within half a shadow texel, accounting for affine scale/shear;
  full geometry is restored before color rendering. Zero-intensity light passes
  are skipped because they cannot affect the image. Casters are not removed.
- **Memory:** packed source staging arrays are cleared; discarded source meshes
  can be collected. Far high-detail buffers are disposed, and material caches
  stay bounded across revisits.

This is in-memory resource streaming. Initial procedural construction still
visits the whole map before compression; it is not network asset streaming.
No automatic reduction to Low is made. `?perf=1` shows frame intervals, renderer
counters, update CPU and available JS heap.

## Recorded measurements

Chromium used ANGLE/SwiftShader, a **software GPU**, at 800×500. Baseline commit:
`a2f6184`. The expanded scene is larger. The baseline's manual view changes also
bypassed its old foliage-LOD updater. These are diagnostic checkpoints, not an
identical-scene hardware benchmark.

| Original view | Color draw calls before → after | Uploaded geometries before → after | Color triangles before → after |
|---|---:|---:|---:|
| Street | 1,516 → **1,120** | 3,202 → **1,050** | 16,632,172 → 28,336,146 |
| City | 3,949 → **1,837** | 3,208 → **1,497** | 38,861,338 → 47,780,009 |
| Coast | 1,860 → **616** | 3,209 → **1,515** | 8,940,071 → 21,021,437 |

Color draw calls decreased approximately **26%, 53% and 67%**. Three r181 resets
`renderer.info` after its shadow pass, so these counters exclude depth work;
timed frames include requested shadows. The final view log includes separately
instrumented depth counts where available. No GPU VRAM API was available.

| View | Baseline sampled mean / worst FPS | Refined sampled mean / worst FPS |
|---|---:|---:|
| Street | 0.223 / 0.045 | 2.573 / 0.906 |
| City | 0.0446 / 0.0090 | 0.0273 / 0.0091 |
| Coast | 0.0127 / 0.0025 | 0.0176 / 0.0059 |

These are short `render()` + `gl.finish()` samples (five baseline frames, three
refined frames), including very long cold shadow/driver stalls. The final
browser reused a warmed driver. They are **not interactive gameplay FPS** and
must not be used to claim a sustained FPS gain or a 45–60 FPS PC result.
Readiness at the expanded checkpoint was 48.915 s versus 40.263 s baseline;
startup remains an optimization opportunity.

After three actual region-visit cycles and forced GC, JS heap was **905.343,
905.290 and 905.354 MB**. Material count stayed **2,361**, uploaded geometry count
**1,436**, and four café chunks remained resident. This full sweep preceded the
last index-only refinement. Baseline heap was measured without forced GC, so
these values do not establish a comparable before/after RAM reduction. A final
single snapshot after the indexing refinement, service replay and return to the
overview measured **631.201 MB** JS heap with four detailed café chunks.

Raw results: [baseline](expansion/profile-before.json),
[21-view/chunk/collision/memory sweep](expansion/profile-camera-chunk-qa.json),
[refined render/color/shadow checks](expansion/profile-final-views.json),
[doorway run](expansion/doorway-run.txt).

## Validation and images

- **88 unit tests pass**; `npm run build` passes. Vite reports its normal
  nonfatal bundle-size advisory. Existing Vercel settings still build `dist`.
- All **21 views** rendered in Chromium. Two bridge views were repositioned
  above the canal after rooftop occlusion was found, then checked again.
- All **four bridges** were crossed using actual scene collision at 5, 9 and
  25 world units/s. Peak movement/planning CPU samples were 13.3/12.8/12.2 ms.
  These accelerated routes are not an interactive vehicle FPS test.
- The doorway run completed 900 simulated seconds and 16 customers including
  controlled capacity/closing cases. It exercised two outdoor waiters,
  simultaneous exits, preserved inside orders and automatic safe closing.
  Minimum sampled NPC separation was about 0.78 world units.
- Production smoke check passed: 21 views, High selected, saved 22:00 clock,
  no development bridge/debug panel and no JavaScript errors.
  [Result](expansion/production-check.json) · [Screenshot](expansion/production.png).
- Final render hooks checked that color drawing receives original geometry
  after shadow proxy rendering. Night checks verified skipped zero-light work.
  Low/Medium/High, day/night water and the existing clock remain available.
- A final model-driven service replay used actual scene navigation: entry,
  brewing, exact change, departure and automatic closing passed again
  (20,000đ revenue; 117,000đ cash). [Result](expansion/npc-flow.json).

[Overview](expansion/overview.png) · [Canal](expansion/river.png) ·
[Road bridge](expansion/road-bridge.png) ·
[Pedestrian bridge](expansion/garden-bridge.png) · [Night](expansion/night.png) ·
[NPC entering](expansion/npc-entry.png) · [NPC leaving](expansion/npc-exit.png)

## Run locally

```sh
npm ci
npm run dev
npm test
npm run build
```

Optional scripted checks use an external Playwright installation:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_EXECUTABLE=/usr/bin/chromium node scripts/check-doorway.cjs
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_EXECUTABLE=/usr/bin/chromium node scripts/check-city-streaming.cjs
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_EXECUTABLE=/usr/bin/chromium node scripts/check-city-final-views.cjs
```

The city drivers stop the main loop and use timer-delivered warming frames and
hidden-canvas GL captures to avoid software-compositor backpressure. They verify
resources, geometry, cameras and collision, not hitch-free native RAF behavior.
