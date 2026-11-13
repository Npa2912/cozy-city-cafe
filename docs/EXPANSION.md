# Connected city and coastal expansion

The original street is still the core of the same scene. `buildStreet`,
`refineStreet` and the original animated street life still run; the additive
`extendCity` stage runs afterwards. No original building front or core camera
position is replaced.

## Inspect the preview

1. **Thành phố & biển** — the wider reference view, including the old café,
   commercial connection and waterfront.
2. **Trung tâm ANTELEO** — the original approved overview.
3. **Từ cửa hàng hoa**, **Đi bộ ngoài phố**, **Quầy pha chế** — the original
   close inspection views.
4. **Phòng sau & prep** — new rear café room, working counters and seating.
5. **Quầy POS** — touch displays, card reader, receipt printer and cash drawer.
6. **Phố ven biển** — promenade, palms, railings, shops and moored boat.
7. **Khu câu cá** — signed timber pier and fishing equipment.

Reset now returns to the expanded reference view. The original four views
remain available in the selector with their original positions and targets.
Free Camera, POV/WASD, Escape, pause/resume and viewport PNG export are retained.

## Planning

`src/urban-plan.js` records the layout in world coordinates.

- The new branch leaves the main road at z=31, beyond the existing core. Only
  that end section of curb/paving is opened. The remaining core paving retains
  its world-projected texture coordinates.
- Three commercial fronts face the connecting road. Eleven two-storey houses
  form eastern residential courts and a western garden lane; a separate corner kiosk has a
  roof terrace and external stair.
- The promenade occupies x=54..66 and z=-68..40. Furniture occupies its edges,
  leaving a separate walking strip. The ocean starts at x=66, at the map edge.
- The timber pier joins land at x=65 and extends over water to x=88. Its deck,
  braces and piles are supported down to the seabed. Rail openings align with
  the entrance; benches, fishing crates, cooler, net and safety ring sit away
  from the central route.
- The newly revealed western edge is finished as a planted garden with a
  walking loop, shelter and three residences, rather than exposed base terrain.
- The rear café addition fits between the existing tower, alley stairs and
  alley shop. Its floor connects through an opening in the two existing rear
  wall layers. It has a separate patio door, and the prep counter is split so
  that this door is not blocked.

## Café and POS

The front façade, roof sculpture, main preparation equipment and old seating
are retained. The rear room adds a sink and tap, shaker/jar station, refrigerator,
dry stock, guest seating, warm pendants, windows and a small garden patio.

The POS is a **3D preview prop**, not a real payment integration. Its operator
screen shows an order, the customer screen shows the total, and a separate
card terminal, printer/receipt and drawer establish a logical checkout station.
No card data, payment network or backend is used.

## Coast and fishing

The ocean uses displaced 3D geometry with animated waves, foam and highlights.
Rocks, a small sand cove, palms, a moored cabin boat, a sailboat and a distant
lighthouse complete the shoreline. The pier is a designed future gameplay
location; fishing rods, line, float and an angler are decorative at this stage.
No fishing minigame is introduced.

Existing traffic and seven core characters remain. A seated café guest, a
promenade walker and an angler populate the new areas. The van's short-stop
schedule is unchanged.

## Rendering

Static geometry remains spatially batched. The new buildings use the same
rounded/extruded architecture, curved roofing, window treatment and planting
helpers as the core. Instanced leaf/petal batches use distance LOD: all instance
positions/colors remain unchanged, and the original geometry is restored when
the camera approaches. This does not simplify buildings or furnishings.

The sun direction is preserved; its shadow coverage is widened for the new
shore. Warm interior light is added in the rear room. Shader preparation remains
asynchronous so the controls can respond during a cold start.

## Scope limits

This is an inspectable city preview, not a completed roleplay game. POS/payment,
free-roaming collision AI, fishing interactions, boats as vehicles, inventory
and persistent shop operations are not implemented. The reference is a visual
layout guide rather than the source of production models or textures.

## Validation evidence

- `npm test`: 12 passed, 0 failed.
- `npm run build`: successful Vite production output.
- Production Chromium: nine camera options, orbit/reset, POV/WASD, Escape,
  PNG download, animated scene and portrait layout passed; no page errors.
- Rendered review images: [city](expanded-city.png), [retained core](core-retained.png),
  [coast](seaside.png), [pier](fishing-pier.png), [rear room](cafe-annex.png),
  [POS](pos-terminal.png). No JavaScript or shader errors during these captures.
- Browser uses software WebGL in this environment; no hardware FPS claim is made.
