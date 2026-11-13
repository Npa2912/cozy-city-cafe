import test from "node:test";
import assert from "node:assert/strict";
import {
  createTrafficController,
  routePose,
  routeLength,
} from "../src/traffic.js";

test("van stays in the two asphalt lanes, including continuous end turns", () => {
  let previous = routePose(0);
  for (let s = 0.01; s < routeLength + 0.01; s += 0.01) {
    const p = routePose(s);
    assert(p.x >= 2 - 1e-8 && p.x <= 6.5 + 1e-8);
    assert(p.z >= -64.25 - 1e-8 && p.z <= 26.25 + 1e-8);
    assert(Math.hypot(p.x - previous.x, p.z - previous.z) < 0.011);
    previous = p;
  }
  const start = routePose(0),
    end = routePose(routeLength);
  assert(Math.hypot(start.x - end.x, start.z - end.z) < 1e-8);
});
test("automatic van brakes, waits under 1.8 seconds and resumes over multiple circuits", () => {
  const car = createTrafficController();
  let stationary = 0,
    maxStationary = 0,
    stops = 0,
    wasStopped = false,
    previousSpeed = 2.7,
    movingTime = 0;
  for (let i = 0; i < 240 / 0.02; i++) {
    const p = car.update(0.02);
    assert(p.speed >= 0 && p.speed <= 2.70001);
    assert(Math.abs(p.speed - previousSpeed) <= 0.031 || p.stopped);
    previousSpeed = p.speed;
    if (p.speed < 0.01) {
      stationary += 0.02;
      maxStationary = Math.max(stationary, maxStationary);
    } else {
      stationary = 0;
      movingTime += 0.02;
    }
    if (p.stopped && !wasStopped) {
      stops++;
      assert(Math.abs(p.z - 7) < 0.01);
      assert.equal(p.x, 2);
    }
    wasStopped = p.stopped;
  }
  assert(stops >= 3);
  assert(maxStationary <= 1.8, `stopped ${maxStationary}s`);
  assert(movingTime > 225);
});
