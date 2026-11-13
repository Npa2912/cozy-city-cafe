import test from "node:test";
import assert from "node:assert/strict";
import {
  FRONTAGES,
  frontageBounds,
  NEIGHBORHOOD as N,
} from "../src/neighborhood-plan.js";
import { overlaps } from "../src/urban-plan.js";
import { sampleFish, sampleJump, SHOALS } from "../src/marine-motion.js";

test("varied frontages keep every footprint out of the residential road and each other", () => {
  const bounds = FRONTAGES.map(frontageBounds);
  for (let i = 0; i < bounds.length; i++) {
    assert(!overlaps(bounds[i], N.road), FRONTAGES[i].id);
    assert(bounds[i].minX >= 25.5 && bounds[i].maxX <= 54);
    for (let j = i + 1; j < bounds.length; j++)
      assert(!overlaps(bounds[i], bounds[j], 0.3));
  }
  assert.equal(new Set(FRONTAGES.map((p) => p.style)).size, 4);
  assert.equal(new Set(FRONTAGES.map((p) => p.floors)).size, 3);
  for (const style of new Set(FRONTAGES.map((p) => p.style)))
    assert(FRONTAGES.filter((p) => p.style === style).length <= 3);
});
test("fish stay in nearshore pools outside the pier and turn continuously", () => {
  for (let i = 0; i < 18; i++)
    for (let t = 0; t < 120; t += 0.3) {
      const p = sampleFish(t, i),
        q = sampleFish(t + 0.01, i),
        s = SHOALS[Math.floor(i / 6)];
      assert(p.x > 66.8 && p.y < -0.9 && p.y > -1.4);
      assert(Math.abs(p.z - s.z) < 2);
      assert(!(p.x > 65 && p.x < 88 && p.z > 9 && p.z < 15));
      assert(Math.hypot(q.x - p.x, q.z - p.z) < 0.02);
    }
});
test("gentle jumps repeat with a quiet interval and return below the water before the splash", () => {
  for (const index of [0, 1]) {
    let airborne = 0,
      quiet = 0;
    for (let t = 0; t < 30; t += 0.025) {
      const p = sampleJump(t, index);
      assert(p.y <= 0.56 && p.y >= -0.88);
      if (p.active) airborne++;
      else quiet++;
      if (p.splash) assert(!p.active);
    }
    assert(quiet > airborne * 7);
    assert.deepEqual(sampleJump(0.4, index), sampleJump(15.4, index));
  }
});

test("global static batching preserves swimming fish and occasional jumping fish visibility", async () => {
  const THREE = await import("three");
  const { buildMarineLife } = await import("../src/marine-life.js");
  const { batchStaticScene } = await import("../src/batch-static.js");
  const scene = new THREE.Scene(),
    marine = buildMarineLife(scene);
  marine.update(0);
  batchStaticScene(scene);
  const swimmer = scene.getObjectByName("coastal-fish-0");
  const jumper = scene.getObjectByName("coastal-fish-18");
  assert(swimmer && jumper);
  let meshes = 0;
  swimmer.traverse((o) => {
    if (o.isMesh) meshes++;
  });
  assert(meshes > 0);
  const before = swimmer.position.clone();
  marine.update(0.72);
  assert(swimmer.position.distanceTo(before) > 0.1);
  assert(jumper.visible && jumper.position.y > -0.1);
  marine.update(2);
  assert(!jumper.visible);
});

test("junction pavements leave the full seven-metre street open into the T junction", () => {
  for (const p of N.junctionWalks) {
    const b = {
      minX: p.x - p.w / 2,
      maxX: p.x + p.w / 2,
      minZ: p.z - p.d / 2,
      maxZ: p.z + p.d / 2,
    };
    assert(!overlaps(b, N.road));
    assert.equal(b.maxZ, 27.5);
  }
  assert.equal(N.junctionWalks[0].x + N.junctionWalks[0].w / 2, N.road.minX);
  assert.equal(N.junctionWalks[1].x - N.junctionWalks[1].w / 2, N.road.maxX);
});
