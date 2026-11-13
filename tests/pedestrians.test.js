import test from "node:test";
import assert from "node:assert/strict";
import { WALK_ROUTES, sampleWalk } from "../src/pedestrians.js";
test("walkers stay on the reserved pavement lanes and never intersect one another", () => {
  for (let t = 0; t < 240; t += 0.1) {
    const people = WALK_ROUTES.map((route, i) => sampleWalk(t, route, i * 1.6));
    for (const [i, p] of people.entries()) {
      assert(p.x < -0.5 || p.x > 8.9, "pedestrian must not enter the road");
      assert(
        p.z >= Math.min(WALK_ROUTES[i].z, WALK_ROUTES[i].end) - 0.001 &&
          p.z <= Math.max(WALK_ROUTES[i].z, WALK_ROUTES[i].end) + 0.001,
      );
      for (const q of people.slice(i + 1))
        assert(Math.hypot(p.x - q.x, p.z - q.z) > 0.62);
    }
  }
});
test("walking routes ease to zero speed at the turn instead of snapping position", () => {
  for (const route of WALK_ROUTES) {
    const duration = Math.abs(route.end - route.z) / 0.65;
    assert(
      Math.abs(sampleWalk(duration - 0.001, route).z - route.end) < 0.00001,
    );
    assert.equal(sampleWalk(duration + 0.5, route).z, route.end);
    assert.equal(sampleWalk(duration + 0.5, route).stride, 0);
  }
});
