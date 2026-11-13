import test from "node:test";
import assert from "node:assert/strict";
import {
  URBAN_PLAN as P,
  PROTECTED_REAR_NEIGHBORS,
  overlaps,
} from "../src/urban-plan.js";
import { CAMERA_VIEWS } from "../src/camera-views.js";
import { sampleWalk } from "../src/pedestrians.js";

test("café annex fits behind the approved core without moving the tower, stairs or alley shop", () => {
  for (const old of PROTECTED_REAR_NEIGHBORS)
    assert(!overlaps(P.annex, old, 0.1), old.name);
  assert.equal(P.annex.floorY, 0.39);
  const doorCenter = -5 - P.rearDoor.localX * 1.5;
  assert(doorCenter > P.annex.minZ && doorCenter < P.annex.maxZ);
  assert(P.rearDoor.minZ >= P.annex.minZ && P.rearDoor.maxZ <= P.annex.maxZ);
});
test("POS sits on the existing counter and does not intersect the pastry case", () => {
  const terminal = {
    minX: P.pos.x - 0.24,
    maxX: P.pos.x + 0.24,
    minZ: P.pos.z - 0.16,
    maxZ: P.pos.z + 0.16,
  };
  assert(terminal.minX >= -6 && terminal.maxX <= -0.6);
  assert(terminal.minZ >= -3.45 && terminal.maxZ <= -2.15);
  assert(
    !overlaps(terminal, {
      minX: -1.375,
      maxX: -0.625,
      minZ: -3.05,
      maxZ: -2.45,
    }),
  );
});
test("promenade joins the branch road and pier, with the water at the outer map edge", () => {
  assert.equal(P.connector.maxX, P.promenade.minX);
  assert.equal(P.shoreX, P.promenade.maxX);
  assert(P.pier.minX < P.shoreX && P.pier.maxX > P.shoreX);
  assert(P.pier.deckY > P.waterY + 0.8);
  assert(P.pier.minZ > P.promenade.minZ && P.pier.maxZ < P.promenade.maxZ);
  for (let t = 0; t < 240; t += 0.2) {
    const p = sampleWalk(t, P.coastWalk);
    assert(p.x > P.promenade.minX + 0.35 && p.x < P.shoreX - 0.35);
    assert(p.z > P.promenade.minZ && p.z < P.promenade.maxZ);
  }
});
test("the four approved camera presets are retained alongside the new areas", () => {
  assert.deepEqual(CAMERA_VIEWS.overview.position, [13.8, 11.8, 19.5]);
  assert.deepEqual(CAMERA_VIEWS.flowers.position, [12, 3.2, 14.5]);
  assert.deepEqual(CAMERA_VIEWS.street.position, [10.8, 1.9, 5.8]);
  assert.deepEqual(CAMERA_VIEWS.counter.position, [-4.2, 2.2, -6.5]);
  for (const key of ["expanded", "annex", "pos", "coast", "fishing"])
    assert(CAMERA_VIEWS[key]);
});
test("coastal and fishing POV starts are on walkable land/deck, not over water", async () => {
  const { WALK_STARTS } = await import("../src/camera-views.js");
  const coast = WALK_STARTS.coast.position,
    pier = WALK_STARTS.fishing.position;
  assert(coast[0] > P.promenade.minX + 0.3 && coast[0] < P.shoreX - 0.3);
  assert(coast[2] > P.promenade.minZ && coast[2] < P.promenade.maxZ);
  assert(pier[0] > P.pier.minX + 0.3 && pier[0] < P.pier.maxX - 0.3);
  assert(pier[2] > P.pier.minZ + 0.3 && pier[2] < P.pier.maxZ - 0.3);
  assert(WALK_STARTS.expanded.position[2] < P.connector.minZ);
});
