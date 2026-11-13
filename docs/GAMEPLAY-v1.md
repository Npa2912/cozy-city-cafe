# ANTELEO · playable café prototype (Milestones 1–2)

This extends the existing city on `feat/3d-street-preview`. It does not replace
or reset the map. The original 12 camera presets, free orbit, city traffic,
coast and fish remain available. The rooftop watering can is replaced by a
supported, rounded milk-tea mascot with a lid, straw, pearls and a face.

## Run locally

```sh
npm ci
npm run dev
# http://localhost:5173
npm test
npm run build
npm run preview
```

`?view=counter` opens directly at the café inspection camera. Vercel still uses
`npm run build` and `dist`; no backend or paid services are required.

## Play the first shift

1. Click **Chơi quán**. WASD moves and the mouse looks. Escape releases the
   cursor; clicking the scene captures it again. Free Camera leaves gameplay
   control and returns to the existing city preview.
2. Aim at the glass door and press **E**. It swings inward. If the portal is
   occupied, step back; opening/closing is blocked in the swept safety area.
3. Press **O** to switch to **Đang mở bán**. Alternatively release the cursor
   with Escape and use the HUD button. Business and the physical door are separate.
4. Move aside so a customer can pass. Follow the customer to the order counter,
   aim at **Nhận đơn / POS**, press E and click **Nhận đơn**.
5. **H** opens the recipe notebook. The first order is black coffee: take a
   cup at **Nguyên liệu**, operate **Máy cà phê**, wait for the 3-second
   extraction, return to ingredients and finish/lid the drink.
6. Aim at **Giao đồ uống** and press E. The cup appears on the handoff tray;
   the customer walks over, picks it up and goes to a reserved chair.
7. The customer sits and drinks for 18 seconds, stands, returns to the cashier
   and waits. Aim at the POS, press E and confirm payment. Revenue and money
   are credited only here, once.
8. The customer walks out. Aim at the dirty table and press E to clean for
   2.5 seconds. Remain nearby; walking away cancels cleaning. The chair can
   be reserved again afterwards.
9. **J** opens quests. Claim completed rewards explicitly. The ledger shows
   income and ingredient costs. Settings offers a manual save as well as the
   periodic automatic save.

The tea recipes dispense measured portions: 150 ml tea, 20 ml milk, 15 g sugar,
then the shaker; pearl tea adds a 30 g pearl portion after shaking. Coffee
extracts a 30 ml portion; milk coffee adds 20 ml milk after extraction.
Repeated, missing or out-of-order additions are rejected when handed over.
Ingredients are charged when consumed and are not refunded for rejected cups.

## Actual gameplay systems

- Operable hinged glass door and independent admission toggle.
- Vertical capsule movement with short travel substeps, collision projection
  and sliding. Semantic boxes/cylinders are collected from the existing world;
  tables/chairs and the animated door have explicit colliders. NPC navigation
  uses an A* grid over the same café obstacles, with dynamic spacing.
- Two reservable seats, a single ordering queue, real modeled customer actors,
  continuous walking, sitting/rising poses, held cups and drinking animation.
- Data-driven four-recipe validation, separate espresso/shaker stations,
  working-cup placement, coffee stream/steam, shaker motion, sound and progress.
- Wrong-drink refusal, retry, ingredient expense, payment guards, money, revenue,
  EXP/levels, five quests with once-only reward claims, transaction history.
- Versioned local saves include pending customers/orders, seats, cups, machine
  progress, account and claimed quests. Browser storage is a single-player
  adapter, **not** a trustworthy multiplayer economy.

## Boundaries of this delivery

Milestone 3 is **not implemented**: furniture purchases, drag/place/rotate Edit
Mode, decoration inventory, path recalculation after player edits, paid café
expansion tiers, new seating capacity and recipe unlocks tied to upgrades.
The already-built rear room remains present visually; it is not falsely sold
as a newly completed upgrade mechanic. B explains that Edit Mode is unavailable.
No multiplayer, backend payments, inventory economy or other professions are
included. The real POS here settles fictional in-game currency only.

Colliders are conservative semantic shapes, not triangle-perfect rigid-body
physics. The serviced café and its entrances are the validated gameplay area;
free-camera exploration remains available throughout the existing map. Advanced
terrain traversal, vehicle physics and arbitrary interiors are outside this pass.

## Source modules

`src/game/data.js` holds timing, portions, recipes and quests. `model.js` composes the state. `customers.js` owns the customer FSM,
`orders.js` owns accepting/serving, and `recipe-validator.js` checks recipes.
`crafting.js`, `payments.js`, `economy.js`, `quests.js` and `save.js` isolate
their corresponding rules. `collision.js` contains contact,
sliding and A* logic; `world-collision.js` adapts the Three.js scene/capsule.
`world.js` binds the models and animations, `runtime.js` binds controls and
proximity, and `ui.js`/`ui.css` implement the compact HUD and functional panels.

A development-only `?test` hook exposes scene/model handles for geometry tests;
Vite removes that branch from the production build. Test scripts can position
an observer and advance simulation time; serving, payment and cleaning still
use the actual stations and rule guards.

## Validation recorded for this pass

- `npm test`: **33 passed**, 0 failed, covering all four recipe lifecycles,
  rejected recipes/costs, duplicate payment/reward guards, seat admission and
  reuse, save round-trip, wall/door contacts, pathfinding and the existing map.
- `npm run build`: successful production output; the approximately 753 kB /
  222 kB gzip bundle receives only Vite's non-failing size advisory.
- Actual-scene browser flow: physical door blocks/allows capsule travel,
  customer navigates to the counter, E/UI accepts and crafts coffee, cup is
  served, customer sits/drinks/returns, POS pays exactly once, customer walks
  outside, player cleans, the seat is AVAILABLE and the browser save is written.
  Final accounting: **25 revenue, 3 ingredient cost, 122 balance, 18 EXP**.
- This automation moves the observer to verified clear station positions and
  advances simulation time; NPCs use the real navigation/obstacles, and E/UI
  actions still use the live proximity and business-rule guards. The player
  capsule is tested separately against the actual closed/open door.
- Production is also checked separately for restoring that actual saved
  balance, recipe/ledger panels, mobile layout and preserved camera views.
  The QA hook is absent in production. Software WebGL is used in this
  environment; no hardware frame-rate claim is made.

The optional reproducible browser test is `scripts/check-gameplay.cjs`. It
requires a running development server and Playwright (not an app dependency):

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node scripts/check-gameplay.cjs
```

`APP_URL` can override the default `http://127.0.0.1:5173/?test&view=counter`.
`CHROMIUM_EXECUTABLE` selects a system browser. `PLAYWRIGHT_MODULE` can select
an already-installed test harness. The script uses a fresh browser context.

Review captures: [recipes](gameplay-recipes.png), [customer](gameplay-customer.png),
[POS](gameplay-pos.png), [ledger](gameplay-ledger.png),
[milk-tea mascot](gameplay-mascot.png), [mobile](gameplay-mobile.png).
