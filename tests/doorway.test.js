import test from "node:test";
import assert from "node:assert/strict";
import { CafeGame } from "../src/game/model.js";
import { DoorwayController, insideCount } from "../src/game/doorway.js";
import { TRAFFIC, arrivalDelay } from "../src/game/traffic-config.js";
const layout = {
  spawn: { x: 0, z: 10 },
  entrance: { x: 0, z: 2 },
  outsideWaiting: [
    { x: 2, z: 4 },
    { x: 4, z: 4 },
  ],
  doorInside: { x: 0, z: -2 },
  doorOutside: { x: 0, z: 4 },
  insideWaiting: [
    { x: 2, z: -2 },
    { x: 4, z: -2 },
    { x: 6, z: -2 },
  ],
  queue: [
    { x: -2, z: -4 },
    { x: -4, z: -4 },
    { x: -6, z: -4 },
  ],
  exit: { x: 0, z: 4 },
  departure: { x: 0, z: 16 },
  seats: [{ id: 0 }, { id: 1 }],
};
const customer = (id, state, inside = false) => ({
  id,
  state,
  inside,
  pos: { x: id * 2, z: 0 },
  age: 0,
  waitTime: 0,
  recipe: "black",
});
const game = () => {
  const g = new CafeGame(layout, null, () => 0.5);
  g.doorOpen = g.business = true;
  return g;
};
test("traffic config uses three indoors, two outdoors and randomized 20–35 second arrivals", () => {
  assert.equal(TRAFFIC.maxInside, 3);
  assert.equal(TRAFFIC.maxOutside, 2);
  assert.equal(
    arrivalDelay(() => 0),
    20,
  );
  assert.equal(
    arrivalDelay(() => 1),
    35,
  );
  assert.equal(
    arrivalDelay(() => 0.5),
    27.5,
  );
  const g = game();
  assert.equal(g.nextArrival, 27.5);
  for (let i = 0; i < 270; i++) g.update(0.1, () => false);
  assert.equal(g.customers.length, 0);
  g.update(0.6, () => false);
  assert.equal(g.customers.length, 1);
  assert(g.nextArrival >= 20 && g.nextArrival <= 35);
});
test("outside positions are reserved before arrival, full waiting area rejects a third spawn", () => {
  const g = game();
  assert(g.admit());
  g.customers[0].pos = { x: 2, z: 4 };
  assert(g.admit());
  assert.deepEqual(
    g.customers.map((n) => n.outsideSlot),
    [0, 1],
  );
  g.customers[1].pos = { x: 4, z: 4 };
  assert(!g.admit());
  g.business = false;
  assert(!g.admit());
  g.business = true;
  g.doorOpen = false;
  assert(!g.admit());
});
test("doorway grants only one incoming lease and preserves arrival FIFO", () => {
  const g = game();
  g.customers = [
    customer(1, "WAITING_AT_ENTRANCE"),
    customer(2, "WAITING_AT_ENTRANCE"),
  ];
  g.doorway.update(g);
  assert.equal(g.doorway.owner, 1);
  assert.equal(g.customers[0].state, "ENTERING_DOOR");
  g.doorway.update(g);
  assert.equal(g.doorway.owner, 1);
  assert.equal(g.customers[1].state, "WAITING_AT_ENTRANCE");
  g.customers[0].inside = true;
  g.customers[0].state = "QUEUING";
  g.doorway.release(1);
  g.doorway.update(g);
  assert.equal(g.doorway.owner, 2);
});
test("an outgoing customer gets priority over an arrival; two exits serialize", () => {
  const g = game();
  g.customers = [
    customer(1, "WAITING_AT_ENTRANCE"),
    customer(2, "WAITING_TO_EXIT", true),
    customer(3, "WAITING_TO_EXIT", true),
  ];
  g.doorway.update(g);
  assert.equal(g.doorway.owner, 2);
  assert.equal(g.doorway.direction, "out");
  g.doorway.update(g);
  assert.equal(g.doorway.owner, 2);
  g.customers[1].state = "WALKING_AWAY";
  g.customers[1].inside = false;
  g.doorway.update(g);
  assert.equal(g.doorway.owner, 3);
  g.customers[2].state = "WALKING_AWAY";
  g.customers[2].inside = false;
  g.doorway.update(g);
  assert.equal(g.doorway.owner, 1);
});
test("exiting customer still approaching the inside hold prevents opposite entry", () => {
  const g = game();
  g.customers = [
    customer(1, "WAITING_AT_ENTRANCE"),
    customer(2, "LEAVING_SHOP", true),
  ];
  g.doorway.update(g);
  assert.equal(g.doorway.owner, null);
  g.customers[1].state = "WAITING_TO_EXIT";
  g.doorway.update(g);
  assert.equal(g.doorway.owner, 2);
});
test("three inside customers block new admission even if the order queue has room", () => {
  const g = game();
  g.customers = [
    customer(1, "SITTING_AND_DRINKING", true),
    customer(2, "WAITING_FOR_DRINK", true),
    customer(3, "WAITING_TO_ORDER", true),
    customer(4, "WAITING_AT_ENTRANCE"),
  ];
  assert.equal(insideCount(g), 3);
  g.doorway.update(g);
  assert.equal(g.doorway.owner, null);
  g.customers[0].inside = false;
  g.customers[0].state = "WALKING_AWAY";
  g.doorway.update(g);
  assert.equal(g.doorway.owner, 4);
});
test("closing while patrons remain preserves their egress; empty shop closes and stops entrants", () => {
  const g = game();
  g.customers = [customer(1, "WAITING_TO_EXIT", true)];
  assert(!g.toggleDoor());
  assert(g.doorOpen);
  g.customers[0].inside = false;
  g.customers[0].state = "WALKING_AWAY";
  assert(g.toggleDoor());
  g.customers.push(customer(2, "WAITING_AT_ENTRANCE"));
  g.doorway.update(g);
  assert.equal(g.doorway.owner, null);
});
test("saved in-flight doorway lease is recovered without moving its owner or granting a second lease", () => {
  const g = game();
  g.customers = [
    customer(1, "ENTERING_DOOR"),
    customer(2, "WAITING_AT_ENTRANCE"),
  ];
  g.customers[0].doorLeg = 1;
  const restored = new CafeGame(layout, g.snapshot());
  const before = { ...restored.customers[0].pos };
  restored.doorway.update(restored);
  assert.equal(restored.doorway.owner, 1);
  assert.equal(restored.customers[0].doorLeg, 1);
  assert.deepEqual(restored.customers[0].pos, before);
});
test("door passage is never released on a timer while its occupant is blocked", () => {
  const g = game();
  g.business = false;
  g.customers = [
    customer(1, "ENTERING_DOOR"),
    customer(2, "WAITING_AT_ENTRANCE"),
  ];
  g.customers[0].doorLeg = 1;
  for (let i = 0; i < 600; i++) g.update(0.1, () => false);
  assert.equal(g.doorway.owner, 1);
  assert.equal(g.customers[1].state, "WAITING_AT_ENTRANCE");
});
test("exit holding slots remain distinct when a previous slot owner leaves", () => {
  const g = game();
  g.business = false;
  g.customers = [
    customer(2, "LEAVING_SHOP", true),
    customer(3, "LEAVING_SHOP", true),
  ];
  g.customers[0].exitHold = 1;
  g.update(0.1, () => false);
  assert.equal(g.customers[1].exitHold, 0);
});
test("an occupied or unreachable outside waiting point suppresses spawn", () => {
  const g = game();
  g.admissionAllowed = () => false;
  assert(!g.admit());
  assert.equal(g.nextId, 1);
});
test("an occupied interior queue slot keeps the arriving customer outside the doorway", () => {
  const g = game();
  g.customers = [customer(1, "WAITING_AT_ENTRANCE")];
  g.entryAllowed = () => false;
  g.doorway.update(g);
  assert.equal(g.doorway.owner, null);
  assert.equal(g.customers[0].state, "WAITING_AT_ENTRANCE");
  g.entryAllowed = () => true;
  g.doorway.update(g);
  assert.equal(g.doorway.owner, 1);
});
test("old crowded v2 saves retain account and backup instead of resetting the game", async () => {
  const { loadGame, saveGame, SAVE_KEY } = await import("../src/game/save.js");
  const g = game();
  g.customers = Array.from({ length: 7 }, (_, i) =>
    customer(i + 1, "WAITING_TO_ORDER", true),
  );
  const data = g.snapshot();
  delete data.trafficVersion;
  delete data.trafficLegacyOverflow;
  delete data.nextArrival;
  const old = JSON.stringify({ version: 2, data }),
    entries = new Map([[SAVE_KEY, old]]),
    store = {
      getItem: (k) => entries.get(k) || null,
      setItem: (k, v) => entries.set(k, v),
    };
  const restored = new CafeGame(layout, loadGame(store));
  assert.equal(restored.account.cash, g.account.cash);
  assert.equal(restored.customers.length, 7);
  assert.equal(entries.get(SAVE_KEY + ".traffic-backup"), old);
  assert(!restored.admit());
  saveGame(restored.snapshot(), store);
  assert.equal(loadGame(store).customers.length, 7);
});
test("overlapping restored actors separate gradually without crossing a solid wall", async () => {
  const { separateRestoredActor, blocked } =
    await import("../src/game/collision.js");
  const actors = [
      { x: 0, z: 0 },
      { x: 0, z: 0 },
      { x: 0, z: 0 },
    ],
    wall = { minX: -2, maxX: -0.5, minZ: -2, maxZ: 2 };
  for (let frame = 0; frame < 200; frame++)
    for (const a of actors) {
      const p = separateRestoredActor(
        a,
        actors
          .filter((o) => o !== a)
          .map((o) => ({ ...o, kind: "circle", radius: 0.32 })),
        [wall],
        0.32,
        0.025,
      );
      if (p) {
        assert(Math.hypot(p.x - a.x, p.z - a.z) <= 0.025001);
        assert(!blocked(p, 0.32, [wall]));
        Object.assign(a, p);
      }
    }
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++)
      assert(
        Math.hypot(actors[i].x - actors[j].x, actors[i].z - actors[j].z) >=
          0.639,
      );
});
test("a paid patron crossing the interior aisle reaches their chair before another entry lease", () => {
  const g = game();
  g.customers = [
    customer(1, "WALKING_TO_TABLE", true),
    customer(2, "WAITING_AT_ENTRANCE"),
  ];
  g.doorway.update(g);
  assert.equal(g.doorway.owner, null);
  g.customers[0].state = "SITTING_AND_DRINKING";
  g.doorway.update(g);
  assert.equal(g.doorway.owner, 2);
});
