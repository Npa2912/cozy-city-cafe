# ANTELEO — guided café gameplay

This version continues the existing Three.js city. The player replaces the fixed barista; the city, coast, cameras and moving van remain. Machines and POS face the rear staff aisle. Syrups and spare cups move onto shelving, and the operator can reach each station without crossing the counter.

## Play

1. Click **Chơi quán**, press **E** near the door, then **O** to admit customers.
2. Walk around the right end of the counter into the staff aisle. Open the POS with **E**, choose the first customer's order and click **BẮT ĐẦU PHA CHẾ**.
3. Follow the golden marker and small step panel. Press **E** at the highlighted station. The machine runs briefly; the next step appears automatically.
4. After delivery, open the POS again. Choose banknotes totaling the required change, then confirm. Undo, reset and optional hints work without discarding the customer's tender.
5. The paid customer collects the drink, walks to an available reachable chair and drinks for 18 seconds. With full or unreachable seats they take away. Customers leave through the door and continue along the pavement before being removed.

The door stays open while customers remain inside so their exit cannot be blocked; use O to stop new admission. Once they leave, E can close it. The swing area must be clear.

WASD/mouse move and look; Escape releases the pointer. **J** opens quests. The settings panel offers static highlights, easy change and immediate saving. **H** gives a short reminder instead of the old recipe notebook. The pause button now stops the street, café simulation and world clock together; resume continues them without catch-up.

## Orders, recipes and cash

Arrivals are randomized every 20–35 seconds. The small café admits at most three customers inside, with two reserved outdoor waiting positions and five active customers total. The FIFO order queue admits three customers, with separate physical slots and waiting/patience information. Only its head can begin; only one drink is prepared at once. Orders progress through WAITING, PREPARING, READY, WAITING_PAYMENT, PAID and COMPLETED, or CANCELLED.

| Drink | Price | Guided actions |
| --- | ---: | --- |
| Cà phê đen | 20.000đ | Cup → espresso → delivery |
| Cà phê sữa | 25.000đ | Cup → espresso → milk → delivery |
| Trà sữa truyền thống | 30.000đ | Cup → tea base → shake → delivery |
| Trà sữa trân châu | 35.000đ | Cup → tea base → shake → pearls → delivery |

Wrong stations neither advance the tutorial nor spend ingredients. Brewing costs are deducted once per actual step. Finishing the last step automatically creates a ready drink. Payment precedes seat reservation; sitting never charges a second time.

Tender is selected once from valid VND combinations, at least the price, at most 200.000đ and affordable for the current cash float. The drawer provides 1.000/2.000/5.000/10.000/20.000/50.000/100.000đ notes with repeated selections. Only exact change can be confirmed. The account gains the sale price, rather than the gross tender. Duplicate payment, preparation and quest rewards are guarded.

Five claimable quests track three customers, five prepared drinks, three correct payments, 200.000đ revenue and five consecutive orders. The account stores money, EXP, progress, claims and unlocks.

## Doorway and customer traffic

`src/game/traffic-config.js` owns capacity, arrival interval, actor radius and recovery timings. `doorway.js` grants a single passage lease, prioritizing exits; an entering lease remains held until the customer has cleared the narrow interior mouth and reached the queue. Exit preparation holds and outdoor waits are separate from the swing. Arrival and departure use opposite ends of the sidewalk. Queue points have moved clear of the open glass leaf; a paid head slot is retained until the customer physically clears pickup.

Arrival checks include spawn clearance, waiting-point occupancy, business/door status, order capacity and total capacity. Interior connectivity is checked before entry. Navigation replans with dynamic actor obstacles, keeps actor collision enabled, and reports no-path/occupied conditions. A blocked chair route falls back to takeaway. The doorway lease is never reassigned on a timeout while its actor remains in transit. If the player deliberately blocks a passage, NPCs wait rather than walk through them.

Older v2 saves are backed up as `anteleo.game.v2.traffic-backup`; account/order data remains. Existing over-capacity legacy crowds drain naturally with new admission blocked until capacity allows; they are not teleported or silently deleted to enforce the new limit. Intersecting restored actors separate with small collision-checked steps. Fresh sessions use the new limits immediately.

The optional `scripts/check-doorway.cjs` drives the actual runtime/navigation in Chromium, with slower automated service to build queues. It also constructs controlled arrival and drinking-time scenarios for full outdoor capacity and simultaneous exits. Simulation time is advanced; the browser renderer is paused during batches and resumed for the final screenshot. This is a navigation stress test, not a measured real-time FPS benchmark.

The final Chromium run passed 900 simulated seconds of slow service (10 completed customers), followed by controlled capacity/exit cases (18 completed customers total). Normal-run peak: three inside, one waiting outside, one doorway transit; minimum pair separation was approximately 0.80 m. The controlled case reached two outdoor waiters, rejected further arrival, made two customers request exit together, kept entrants waiting, and drained every customer. No overlap below the 0.60 m test threshold or stuck actor remained in these cases. All navigation staging points were checked against the actual scene colliders. The cash/recipes/account logic is driven through the game model during this stress test. A separate final UI regression run also passed using E and POS buttons: three physical queued customers, cup/espresso/delivery, exact change, seating, exit and save (117.000đ cash / 20.000đ sales / 3.000đ ingredients).

Reproduce with the Vite development server running:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_EXECUTABLE=/usr/bin/chromium node scripts/check-doorway.cjs
```

[Machine-readable QA summary](doorway-qa.json).

## Save compatibility

`anteleo.game.v2` preserves the queue, active tutorial, selected cash notes, seats, money, EXP, quests and settings. Legacy `anteleo.game.v1` remains intact and is copied to `anteleo.game.v1.backup`. Migration converts one old xu to 1.000đ, retains earned EXP/claims, refunds unfinished legacy ingredients and safely ends the incompatible old session. It does not credit unpaid old drinks as sales. A full backup store leaves the source intact and still allows in-memory migration. Browser storage remains local and can fail when storage is unavailable.

## Source organization

`src/game/queue.js`, `orders.js`, `crafting.js`, `cash-register.js`, `payments.js`, `seating.js` and `customers.js` separate the queue, order state, tutorial, note selection, settlement and NPC lifecycle. `model.js` coordinates them. `world.js` binds scene objects and highlights; `runtime.js` connects proximity, inputs and navigation. `collision.js` contains capsule collision and A* navigation. `ui.js`, `quests.js`, `economy.js` and `save.js` own their respective concerns. Static scene batching excludes animated objects.

## Validation

- **58 tests pass**: all four guided drinks, FIFO/capacity, wrong equipment, cash validity and repeated notes, undo/reset, incorrect or duplicate payment, atomic seats, full/unreachable-seat takeaway, sidewalk departure, quest deduplication, migration and save restoration, plus existing collision/city/traffic checks.
- **Production build passes**. Vite reports a nonfatal approximately 767 kB bundle advisory (227 kB gzip).
- Chromium ran the real Three.js scene: three arrivals physically queue; the first order is selected through the POS; cup/espresso/delivery run through E at real stations; 100.000đ tender receives 80.000đ change; the customer pays, walks to a chair, drinks, exits and walks along the sidewalk. Final balance: 117.000đ, sales: 20.000đ, ingredients: 3.000đ. No JavaScript or shader errors were captured.
- Production Chromium also restored a real legacy save to 122.000đ cash, 25.000đ revenue and 18 EXP; verified the original/backup equality, saved static/easy settings, all 13 camera choices, and absence of the development bridge and JavaScript/shader errors. [Restored production session](guided-production-restore.png).
- Browser QA positions the observer at collision-checked staff locations and advances simulation in 0.05-second steps. It exercises actual UI inputs, NPC navigation and scene bindings; it is not an FPS or manual walking usability benchmark. Mobile cash UI was checked at 390×844 with no horizontal overflow.

Run the optional browser check with the dev server already running:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_EXECUTABLE=/usr/bin/chromium node scripts/check-gameplay.cjs
```

The development-only `?test` bridge is stripped from production. Screenshots: [orders](guided-orders.png), [brewing](guided-brewing.png), [cash drawer](guided-cash.png), [mobile cash drawer](guided-cash-mobile.png).

## Scope and remaining limitations

This is an offline single-player prototype. Multiplayer authority/networking, purchased furniture, Edit Mode and upgrade expansion are not implemented. The banknotes are stylized denomination cards, not scans. The café has detailed physical collision/navigation; city-wide pedestrian and vehicle movement retains the existing preview routes. Procedural assets still differ from reference artwork in fine material, hair, lettering and lighting detail. The earlier manual-recipe/post-drinking-payment guide is archived as `GAMEPLAY-v1.md` and no longer describes current controls.

No merge, Vercel deployment or environment publication is performed by this change.
