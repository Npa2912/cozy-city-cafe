import { reserveSeat } from "../src/game/seating.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CafeGame } from "../src/game/model.js";
import { CONFIG, RECIPES, ACTIONS, ORDER_STATES } from "../src/game/data.js";
import { slide, findPath, blocked } from "../src/game/collision.js";
import {
  collectObstacles,
  createPlayerCollision,
} from "../src/game/world-collision.js";
import {
  DENOMINATIONS,
  validTenders,
  chooseTender,
  notesFor,
  selectedTotal,
} from "../src/game/cash-register.js";
import {
  saveGame,
  loadGame,
  decodeSave,
  migrateV1,
  SAVE_KEY,
  LEGACY_KEY,
  BACKUP_KEY,
} from "../src/game/save.js";
const layout = {
  spawn: { x: 0, z: 6 },
  entrance: { x: 0, z: 4 },
  queue: [
    { x: 0, z: 0 },
    { x: 0, z: 1.4 },
    { x: 0, z: 2.8 },
  ],
  counter: { x: 0, z: 0 },
  handoff: { x: 1, z: 0 },
  exit: { x: 2, z: 6 },
  seats: [
    {
      center: { x: 4, z: -1 },
      chair: { x: 3, z: -1 },
      approach: { x: 2.4, z: -1 },
    },
    {
      center: { x: 4, z: -3 },
      chair: { x: 3, z: -3 },
      approach: { x: 2.4, z: -3 },
    },
  ],
};
const move = (n, p, dt) => {
  const dx = p.x - n.pos.x,
    dz = p.z - n.pos.z,
    l = Math.hypot(dx, dz),
    step = Math.min(l, CONFIG.walkSpeed * dt);
  if (l) {
    n.pos.x += (dx / l) * step;
    n.pos.z += (dz / l) * step;
  }
  return l < 0.075;
};
function tick(g, seconds, reach = () => true) {
  for (let t = 0; t < seconds; t += 0.05) g.update(0.05, move, reach);
}
function setup(recipe = "black") {
  const g = new CafeGame(layout, null, () => 0.5);
  g.business = true;
  g.doorOpen = true;
  g.admit();
  g.business = false;
  g.customers[0].recipe = recipe;
  tick(g, 12);
  assert(g.customers[0].queueReady);
  return g;
}
function brew(g) {
  const o = g.orders.find((o) => o.customer === g.activeOrder),
    r = RECIPES.find((r) => r.id === o.recipe);
  for (const action of r.steps) {
    assert(g.interact(ACTIONS[action].station), g.message);
    if (g.job) tick(g, 3.1);
  }
  assert.equal(o.status, "READY");
  tick(g, 0.8);
  assert.equal(o.status, "WAITING_PAYMENT");
  return o;
}
function settle(g, o) {
  assert(g.openCash(o.customer));
  for (const n of notesFor(
    o.tender - RECIPES.find((r) => r.id === o.recipe).price,
  ))
    g.addNote(n);
  return g.pay(o.customer);
}

test("capsule slides along thin walls without tunnelling across a low-FPS frame", () => {
  const wall = { minX: 1, maxX: 1.08, minZ: -10, maxZ: 10 },
    p = slide({ x: 0, z: 0 }, 5, 2, 0.28, [wall]);
  assert(p.x <= 0.721);
  assert(p.z > 1.8);
  assert(!blocked(p, 0.279, [wall]));
});
test("closed door blocks a capsule and the open door provides a passage", () => {
  assert(
    slide({ x: 0, z: 2 }, 0, -4, 0.28, [
      { minX: -1, maxX: 1, minZ: 0, maxZ: 0.12 },
    ]).z > 0.39,
  );
  assert(
    slide({ x: 0, z: 2 }, 0, -4, 0.28, [
      { minX: -1, maxX: -0.88, minZ: -1.5, maxZ: 0 },
    ]).z < -1.9,
  );
});
test("A* goes around furniture without cutting corners or crossing closed walls", () => {
  const b = { minX: -3, maxX: 3, minZ: -3, maxZ: 3 },
    table = { kind: "circle", x: 0, z: 0, radius: 0.8 },
    path = findPath({ x: -2, z: 0 }, { x: 2, z: 0 }, [table], b);
  assert(path?.length);
  for (const p of path) assert(!blocked(p, 0.249, [table]));
  assert.equal(
    findPath(
      { x: -2, z: 0 },
      { x: 2, z: 0 },
      [{ minX: -0.2, maxX: 0.2, minZ: -3, maxZ: 3 }],
      b,
    ),
    null,
  );
});
test("semantic colliders keep physical walls and ignore floors/moving actors", () => {
  const scene = new THREE.Scene(),
    wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 3));
  wall.position.y = 1.5;
  scene.add(wall);
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 10)));
  const a = new THREE.Group();
  a.userData.dynamic = true;
  a.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1)));
  scene.add(a);
  const b = collectObstacles(scene);
  assert.equal(b.length, 1);
  const c = new THREE.PerspectiveCamera();
  c.position.set(-2, 1.9, 0);
  const player = createPlayerCollision(
    b,
    () => [],
    () => 0.23,
  );
  player.move(c, 5, 1);
  assert(c.position.x < -0.37);
  assert.equal(player.capsule.radius, 0.28);
});
test("existing fishing POV remains on the pier without stepping sideways into water", () => {
  const c = new THREE.PerspectiveCamera();
  c.position.set(76, 1.9, 12);
  const p = createPlayerCollision(
    [],
    () => [],
    () => 0.25,
  );
  p.move(c, 0, 0);
  assert.equal(c.position.x, 76);
  p.move(c, 0, 10);
  assert(c.position.z <= 14.721 && c.position.z > 14.7);
  p.move(c, 20, 0);
  assert(c.position.x <= 87.721);
});

test("admission requires business and an open physical door, not an empty chair", () => {
  const g = new CafeGame(layout);
  assert(!g.admit());
  g.business = true;
  assert(!g.admit());
  g.doorOpen = true;
  g.seats.forEach((s) => (s.status = "OCCUPIED"));
  assert(g.admit());
  assert.equal(g.customers[0].seat, null);
  assert.equal(g.queue.length, 1);
});
test("three arrivals queue FIFO at different positions and a fourth is refused", () => {
  const g = new CafeGame(layout);
  g.business = true;
  g.doorOpen = true;
  assert(g.admit());
  g.business = false;
  tick(g, 3);
  assert(g.admit() === false);
  g.business = true;
  assert(g.admit());
  g.business = false;
  tick(g, 3);
  g.business = true;
  assert(g.admit());
  g.business = false;
  tick(g, 18);
  assert.deepEqual(g.queue, [1, 2, 3]);
  assert.equal(g.orders.length, 3);
  assert(!g.admit());
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++)
      assert(
        Math.hypot(
          g.customers[i].pos.x - g.customers[j].pos.x,
          g.customers[i].pos.z - g.customers[j].pos.z,
        ) > 0.9,
      );
  assert(!g.startOrder(2));
  assert(g.startOrder(1));
  assert(!g.startOrder(1));
  assert(!g.startOrder(2));
});
for (const recipe of RECIPES)
  test(`guided cycle pays before seating: ${recipe.name}`, () => {
    const g = setup(recipe.id),
      n = g.customers[0];
    assert(g.startOrder(n.id));
    assert(!g.interact("delivery"));
    assert.equal(g.orders[0].step, 0);
    const o = brew(g);
    assert(g.seats.every((s) => s.status === "AVAILABLE"));
    assert.equal(g.account.revenue, 0);
    const balance = g.account.cash;
    assert(settle(g, o));
    assert.equal(o.status, "PAID");
    assert.equal(g.account.cash, balance + recipe.price);
    assert.equal(g.account.revenue, recipe.price);
    assert(!g.pay(n.id));
    tick(g, 6);
    assert.equal(n.state, "SITTING_AND_DRINKING");
    assert.equal(g.seats[n.seat].status, "OCCUPIED");
    tick(g, CONFIG.drinkSeconds + 15);
    assert.equal(g.customers.length, 0);
    assert(g.seats.every((s) => s.status === "AVAILABLE"));
    assert.equal(o.status, "COMPLETED");
    assert.equal(g.account.stats.changeCorrect, 1);
  });
test("wrong equipment and missing steps never advance tutorial or consume money", () => {
  const g = setup("milkCoffee");
  g.startOrder(1);
  const cash = g.account.cash;
  assert(!g.interact("coffee"));
  assert(!g.interact("delivery"));
  assert.equal(g.account.cash, cash);
  assert(g.interact("ingredients"));
  assert(!g.interact("tea"));
  assert(g.interact("coffee"));
  assert(!g.interact("milk"));
  tick(g, 3.1);
  assert.equal(g.orders[0].step, 2);
  assert(g.interact("milk"));
  assert.equal(g.orders[0].step, 3);
  assert(g.interact("delivery"));
  assert.equal(g.orders[0].status, "READY");
});
test("every configured tender is valid VND, affordable and yields representable change", () => {
  for (const r of RECIPES)
    for (const cash of [0, 5000, 100000, 300000]) {
      const options = validTenders(r.price, cash);
      assert(options.length);
      for (const n of options) {
        assert(n >= r.price && n <= 200000);
        assert(n - r.price <= cash);
        assert.equal(selectedTotal(notesFor(n)), n);
        assert.equal(selectedTotal(notesFor(n - r.price)), n - r.price);
      }
      for (let i = 0; i <= 10; i++)
        assert(options.includes(chooseTender(r.price, cash, () => i / 10)));
    }
  assert.equal(notesFor(37483), null);
});
test("cash register handles multiple bills, undo, reset, wrong change and duplicate protection", () => {
  const g = setup("milkCoffee");
  g.startOrder(1);
  const o = brew(g);
  o.tender = 100000;
  assert(g.openCash(1));
  assert(!g.addNote(1234));
  g.addNote(50000);
  g.addNote(20000);
  assert(!g.pay(1));
  assert.equal(g.account.revenue, 0);
  g.addNote(10000);
  g.undoNote();
  assert.equal(selectedTotal(g.register.notes), 70000);
  g.addNote(5000);
  assert(g.pay(1));
  assert.equal(g.account.revenue, 25000);
  assert(!g.pay(1));
  assert(!g.openCash(1));
});
test("not enough selected change or depleted float cannot be confirmed", () => {
  const g = setup();
  g.startOrder(1);
  const o = brew(g);
  o.tender = 50000;
  g.openCash(1);
  g.addNote(20000);
  assert(!g.pay(1));
  g.resetNotes();
  g.addNote(20000);
  g.addNote(10000);
  g.account.cash = 0;
  assert(!g.pay(1));
  assert.equal(g.account.revenue, 0);
});
test("cancelled orders cannot brew, pay, or generate revenue twice", () => {
  const g = setup();
  assert(g.cancel(1));
  assert(!g.startOrder(1));
  assert(!g.openCash(1));
  assert(!g.pay(1));
  assert(!g.cancel(1));
  assert.equal(g.account.revenue, 0);
  assert.equal(g.orders[0].status, "CANCELLED");
  tick(g, 15);
  assert.equal(g.customers.length, 0);
});
test("full seats cause paid takeaway without waiting for a seat", () => {
  const g = setup();
  g.seats.forEach((s, i) => {
    s.status = "OCCUPIED";
    s.customer = 99 + i;
  });
  g.startOrder(1);
  const o = brew(g);
  assert(settle(g, o));
  const n = g.customers[0];
  tick(g, 3);
  assert(n.takeaway);
  assert.equal(n.seat, null);
  tick(g, 15);
  assert.equal(g.customers.length, 0);
  assert.equal(o.status, "COMPLETED");
  assert(g.seats.every((s) => s.status === "OCCUPIED"));
});
test("an unreachable empty seat falls back to takeaway rather than trapping the NPC", () => {
  const g = setup();
  g.startOrder(1);
  const o = brew(g);
  settle(g, o);
  tick(g, 3, () => false);
  assert(g.customers[0].takeaway);
  assert(g.seats.every((s) => s.status === "AVAILABLE"));
  tick(g, 15, () => false);
  assert.equal(g.customers.length, 0);
});
test("seat reservation is atomic for two paid patrons", () => {
  const g = new CafeGame(layout),
    a = { id: 1, pos: layout.handoff },
    b = { id: 2, pos: layout.handoff },
    c = { id: 3, pos: layout.handoff };
  const first = reserveSeat(g, a),
    second = reserveSeat(g, b);
  assert.equal(first.id, 0);
  assert.equal(second.id, 1);
  assert.notEqual(a.seat, b.seat);
  assert.equal(reserveSeat(g, c), null);
  assert(c.takeaway);
});
test("quests require earned progress and can be claimed only once", () => {
  const g = new CafeGame(layout),
    cash = g.account.cash;
  assert(!g.claim("v2serve3"));
  g.account.stats.served = 3;
  assert(g.claim("v2serve3"));
  assert.equal(g.account.cash, cash + 15000);
  assert(!g.claim("v2serve3"));
});
const memory = () => {
  const map = new Map();
  return {
    map,
    setItem: (k, v) => map.set(k, v),
    getItem: (k) => map.get(k) || null,
  };
};
test("v2 save preserves pending cash notes, queue, guide progress and paid reward guards", () => {
  const g = setup();
  g.startOrder(1);
  brew(g);
  g.openCash(1);
  g.addNote(1000);
  const store = memory();
  assert(saveGame(g.snapshot(), store));
  const h = new CafeGame(layout, loadGame(store));
  assert.deepEqual(h.snapshot(), g.snapshot());
  assert(!h.startOrder(1));
  assert.equal(decodeSave("bad"), null);
  assert(
    !saveGame(g.snapshot(), {
      setItem() {
        throw Error("quota");
      },
    }),
  );
});
test("v1 migration backs up source, converts xu to VND, preserves EXP/claims and refunds unfinished work once", () => {
  const store = memory(),
    old = {
      version: 1,
      data: {
        account: {
          cash: 122,
          xp: 18,
          revenue: 25,
          costs: 3,
          claimed: ["coffee3"],
          history: [{ amount: 25, label: "Cà phê đen" }],
          stats: { served: 1, streak: 1, bestStreak: 1 },
        },
        nextId: 2,
        doorOpen: true,
        craft: { steps: ["cup", "coffee"] },
        orders: [],
      },
    };
  const text = JSON.stringify(old);
  store.setItem(LEGACY_KEY, text);
  const migrated = loadGame(store);
  assert.equal(store.getItem(BACKUP_KEY), text);
  assert.equal(migrated.account.cash, 125000);
  assert.equal(migrated.account.revenue, 25000);
  assert.equal(migrated.account.xp, 18);
  assert(migrated.account.claimed.includes("coffee3"));
  const g = new CafeGame(layout, migrated);
  assert(saveGame(g.snapshot(), store));
  assert.equal(loadGame(store).account.cash, 125000);
  assert.equal(store.getItem(LEGACY_KEY), text);
  assert.equal(migrateV1("bad"), null);
});

test("takeaway continues along the sidewalk before completing the order", () => {
  const g = setup();
  g.layout = { ...layout, departure: { x: 2, z: 14 } };
  g.seats.forEach((s) => {
    s.status = "OCCUPIED";
    s.customer = 99 + s.id;
  });
  g.startOrder(1);
  const o = brew(g);
  settle(g, o);
  let seen = false;
  for (let i = 0; i < 500; i++) {
    g.update(0.05, move, () => true);
    const n = g.customers[0];
    if (n?.state === "WALKING_AWAY") {
      seen = true;
      assert(n.pickedUp);
      assert.equal(o.status, "PAID");
      break;
    }
  }
  assert(seen);
  tick(g, 20);
  assert.equal(o.status, "COMPLETED");
  assert.equal(g.customers.length, 0);
});
test("opening the same cash drawer never re-rolls tender or loses selected notes", () => {
  const g = setup();
  g.startOrder(1);
  const o = brew(g),
    tender = o.tender;
  g.openCash(1);
  g.addNote(1000);
  g.random = () => 0;
  assert(g.openCash(1));
  assert.equal(o.tender, tender);
  assert.deepEqual(g.register.notes, [1000]);
});
test("a full backup store does not erase or hide safely convertible v1 money", () => {
  const old = JSON.stringify({
    version: 1,
    data: {
      account: {
        cash: 95,
        xp: 4,
        revenue: 0,
        costs: 5,
        stats: {},
        claimed: [],
        history: [],
      },
    },
  });
  const storage = {
    getItem: (k) => (k === LEGACY_KEY ? old : null),
    setItem() {
      throw Error("quota");
    },
  };
  const migrated = loadGame(storage);
  assert.equal(migrated.account.cash, 95000);
  assert.equal(storage.getItem(LEGACY_KEY), old);
});

test("safe requested closure works with diners and reopens for their exit", () => {
  const g = new CafeGame(layout);
  assert(!g.toggleDoor(false));assert(!g.doorOpen);assert(g.toggleDoor());
  g.customers = [{ id:1, state:"SITTING_AND_DRINKING", inside:true }];
  assert(g.toggleDoor());assert(!g.doorOpen);assert(g.closeRequested);
  g.customers[0].state="LEAVING_SHOP";g.updateDoorSafety(true);assert(g.doorOpen);
  g.customers[0].state="WALKING_AWAY";g.customers[0].inside=false;
  g.updateDoorSafety(false);assert(g.doorOpen);g.updateDoorSafety(true);assert(!g.doorOpen);
});
