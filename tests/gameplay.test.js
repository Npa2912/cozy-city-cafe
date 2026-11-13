import { validateRecipe } from "../src/game/recipe-validator.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CafeGame } from "../src/game/model.js";
import { CONFIG, RECIPES } from "../src/game/data.js";
import { slide, findPath, blocked } from "../src/game/collision.js";
import { saveGame, loadGame, decodeSave } from "../src/game/save.js";
import {
  collectObstacles,
  createPlayerCollision,
} from "../src/game/world-collision.js";
import * as THREE from "three";
const layout = {
  spawn: { x: 0, z: 3 },
  entrance: { x: 0, z: 1 },
  counter: { x: 0, z: -1 },
  exit: { x: 2, z: 3 },
  seats: [
    {
      center: { x: 3, z: -2 },
      chair: { x: 2, z: -2 },
      approach: { x: 1.5, z: -2 },
    },
    {
      center: { x: 3, z: -4 },
      chair: { x: 2, z: -4 },
      approach: { x: 1.5, z: -4 },
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
  return l < 0.08;
};
function tick(g, seconds) {
  for (let t = 0; t < seconds; t += 0.05) g.update(0.05, move);
}
function setup() {
  const g = new CafeGame(layout);
  g.business = true;
  g.doorOpen = true;
  assert(g.admit());
  g.business = false;
  tick(g, 8);
  assert.equal(g.customers[0].state, "WAITING_TO_ORDER");
  return g;
}
function prepare(g, r) {
  for (const action of r.steps) {
    assert(g.action(action), `${action}: ${g.message}`);
    if (g.job) tick(g, 3.1);
  }
}

test("capsule slides along walls without tunnelling even across a five-metre frame", () => {
  const wall = { minX: 1, maxX: 1.08, minZ: -10, maxZ: 10 };
  const p = slide({ x: 0, z: 0 }, 5, 2, 0.28, [wall]);
  assert(p.x <= 0.721);
  assert(p.z > 1.8);
  assert(!blocked(p, 0.279, [wall]));
});
test("closed door blocks the capsule, open door leaves an actual passage", () => {
  const closed = { minX: -1, maxX: 1, minZ: 0, maxZ: 0.12 };
  assert(slide({ x: 0, z: 2 }, 0, -4, 0.28, [closed]).z > 0.39);
  const open = { minX: -1, maxX: -0.88, minZ: -1.5, maxZ: 0 };
  assert(slide({ x: 0, z: 2 }, 0, -4, 0.28, [open]).z < -1.9);
});
test("path planner routes around furniture and rejects closed entrances", () => {
  const bounds = { minX: -3, maxX: 3, minZ: -3, maxZ: 3 },
    table = { kind: "circle", x: 0, z: 0, radius: 0.8 };
  const path = findPath({ x: -2, z: 0 }, { x: 2, z: 0 }, [table], bounds);
  assert(path?.length);
  for (const p of path) assert(!blocked(p, 0.249, [table]));
  const wall = { minX: -0.2, maxX: 0.2, minZ: -3, maxZ: 3 };
  assert.equal(findPath({ x: -2, z: 0 }, { x: 2, z: 0 }, [wall], bounds), null);
});
test("semantic world colliders retain walls/counters but ignore floors and moving actors", () => {
  const scene = new THREE.Scene(),
    wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 3));
  wall.position.y = 1.5;
  scene.add(wall);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 10));
  scene.add(floor);
  const actor = new THREE.Group();
  actor.userData.dynamic = true;
  actor.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1)));
  scene.add(actor);
  const b = collectObstacles(scene);
  assert.equal(b.length, 1);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(-2, 1.9, 0);
  const player = createPlayerCollision(
    b,
    () => [],
    () => 0.23,
  );
  player.move(camera, 5, 1);
  assert(camera.position.x < -0.37);
  assert.equal(camera.position.y, 1.88);
  assert.equal(player.capsule.radius, 0.28);
});
test("admission requires business, a physical open door and an available seat", () => {
  const g = new CafeGame(layout);
  assert(!g.admit());
  g.business = true;
  assert(!g.admit());
  g.doorOpen = true;
  g.seats.forEach((s) => (s.status = "NEEDS_CLEANING"));
  assert(!g.admit());
  g.seats[0].status = "AVAILABLE";
  assert(g.admit());
  assert.equal(g.seats[0].status, "RESERVED");
  assert(!g.admit());
});
for (const recipe of RECIPES)
  test(`complete customer lifecycle: ${recipe.name}, payment only after drinking`, () => {
    const g = setup(),
      n = g.customers[0];
    n.recipe = recipe.id;
    assert(g.accept(n.id));
    assert(!g.accept(n.id));
    tick(g, 0.1);
    assert.equal(n.state, "WAITING_FOR_DRINK");
    assert(!g.pay(n.id));
    prepare(g, recipe);
    assert(g.serve());
    assert(!g.serve());
    assert.equal(g.account.revenue, 0);
    tick(g, 4);
    assert.equal(n.state, "SITTING_AND_DRINKING");
    assert(!g.pay(n.id));
    tick(g, CONFIG.drinkSeconds + 5);
    assert.equal(n.state, "WAITING_FOR_PAYMENT");
    const cash = g.account.cash;
    assert(g.pay(n.id));
    assert.equal(g.account.cash, cash + recipe.price);
    assert(!g.pay(n.id));
    tick(g, 10);
    assert.equal(g.customers.length, 0);
    assert.equal(g.seats[0].status, "NEEDS_CLEANING");
    assert(g.clean(0));
    tick(g, CONFIG.cleanSeconds + 0.1);
    assert.equal(g.seats[0].status, "AVAILABLE");
    assert.equal(g.account.stats.cleaned, 1);
    assert.equal(g.orders.length, 1);
  });
test("wrong recipe is rejected with ingredient expense, no revenue and a retry", () => {
  const g = setup(),
    n = g.customers[0];
  g.accept(n.id);
  tick(g, 0.1);
  const cash = g.account.cash;
  prepare(g, RECIPES[1]);
  assert(!g.serve());
  assert.equal(n.state, "WAITING_FOR_DRINK");
  assert.equal(g.account.revenue, 0);
  assert(g.account.cash < cash);
  assert.equal(g.account.stats.errors, 1);
  assert(g.message.includes("Khách từ chối"));
  prepare(g, RECIPES[0]);
  assert(g.serve());
});
test("machines have distinct input rules and cannot finish a busy drink", () => {
  const g = new CafeGame(layout);
  assert(!g.action("coffee"));
  g.action("cup");
  assert(!g.action("shake"));
  g.action("tea");
  assert(!g.action("coffee"));
  g.action("milk");
  g.action("sugar");
  assert(g.action("shake"));
  assert(!g.action("finish"));
  tick(g, 3.1);
  assert(g.action("finish"));
  assert(!g.action("milk"));
  assert(!validateRecipe(RECIPES[0], ["cup", "milk", "coffee", "finish"]).ok);
});
test("quest rewards require progress and are claimed exactly once", () => {
  const g = new CafeGame(layout),
    cash = g.account.cash;
  assert(!g.claim("coffee3"));
  g.account.stats.coffee = 3;
  assert(g.claim("coffee3"));
  assert.equal(g.account.cash, cash + 40);
  assert(!g.claim("coffee3"));
  assert.equal(g.account.cash, cash + 40);
});
test("save restores pending orders, expenses, reservations and claimed rewards", () => {
  const g = setup();
  g.accept(g.customers[0].id);
  tick(g, 0.1);
  g.action("cup");
  g.account.stats.cleaned = 3;
  g.claim("clean3");
  const memory = new Map(),
    storage = {
      setItem: (k, v) => memory.set(k, v),
      getItem: (k) => memory.get(k),
    };
  assert(saveGame(g.snapshot(), storage));
  const loaded = loadGame(storage),
    restored = new CafeGame(layout, loaded);
  assert.deepEqual(restored.snapshot(), g.snapshot());
  assert(!restored.accept(restored.customers[0].id));
  assert(!restored.claim("clean3"));
  assert(!restored.pay(restored.customers[0].id));
  assert.equal(decodeSave("broken"), null);
  assert.equal(decodeSave('{"version":99}'), null);
  assert(
    !saveGame(g.snapshot(), {
      setItem() {
        throw Error("quota");
      },
    }),
  );
});

test("a departing customer keeps the doorway queue reserved until fully outside", () => {
  const g = setup(),
    n = g.customers[0];
  g.accept(n.id);
  tick(g, 0.1);
  prepare(g, RECIPES[0]);
  g.serve();
  tick(g, 30);
  assert.equal(n.state, "WAITING_FOR_PAYMENT");
  g.clean(0);
  tick(g, 3);
  assert.equal(g.seats[0].status, "AVAILABLE");
  g.pay(n.id);
  g.business = true;
  assert(!g.admit());
  g.business = false;
  tick(g, 15);
  assert.equal(g.customers.length, 0);
  g.business = true;
  assert(g.admit());
});
test("a second customer reserves a different chair and both cannot use the counter at once", () => {
  const g = setup(),
    n = g.customers[0];
  g.accept(n.id);
  tick(g, 0.1);
  prepare(g, RECIPES[0]);
  g.serve();
  tick(g, 4);
  assert.equal(n.state, "SITTING_AND_DRINKING");
  g.business = true;
  assert(g.admit());
  g.business = false;
  assert.equal(g.customers[1].seat, 1);
  assert(!g.admit());
  tick(g, 10);
  assert.equal(
    g.customers.filter((n) => n.state === "WAITING_TO_ORDER").length,
    1,
  );
  assert.equal(g.orders.length, 1);
});

test("existing fishing POV stays on the pier and cannot step sideways into water", () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(76, 1.9, 12);
  const player = createPlayerCollision(
    [],
    () => [],
    () => 0.25,
  );
  player.move(camera, 0, 0);
  assert.equal(camera.position.x, 76);
  player.move(camera, 0, 10);
  assert(camera.position.z <= 14.721 && camera.position.z > 14.7);
  assert.equal(camera.position.x, 76);
  player.move(camera, 20, 0);
  assert(camera.position.x <= 87.721);
});
