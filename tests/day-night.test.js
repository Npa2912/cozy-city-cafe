import test from "node:test";
import assert from "node:assert/strict";
import { GameClock } from "../src/systems/GameClock.js";
import { lightingAt } from "../src/systems/DayNightCycle.js";
import { periodAt } from "../src/systems/EnvironmentTimeConfig.js";
test("new day starts 07:00; 1440 real seconds advance exactly one day", () => {
  const c = new GameClock();
  assert.equal(c.label, "07:00");
  assert.equal(c.day, 1);
  c.advance(1440);
  assert.equal(c.day, 2);
  assert.equal(c.label, "07:00");
});
test("clock agrees at 30/60 FPS, irregular frames and a long dropped frame", () => {
  const times = [
    Array(1800).fill(1 / 30),
    Array(3600).fill(1 / 60),
    [0.1, 10, 2.9, 47],
  ];
  const clocks = times.map((ds) => {
    const c = new GameClock();
    ds.forEach((d) => c.advance(d));
    return c;
  });
  for (const c of clocks) assert(Math.abs(c.totalMinutes - 480) < 1e-6);
});
test("pause and inactive sessions do not accrue time, resume has no catchup", () => {
  const c = new GameClock();
  c.paused = true;
  c.advance(800);
  c.paused = false;
  c.advance(800, false);
  assert.equal(c.label, "07:00");
  c.advance(1);
  assert.equal(c.label, "07:01");
});
test("midnight, persisted speed/time and corrupt saves", () => {
  const c = new GameClock();
  c.setHour(23);
  c.advance(60);
  assert.equal(c.day, 2);
  assert.equal(c.label, "00:00");
  c.minutesPerSecond = 2;
  const map = new Map(),
    store = { setItem: (k, v) => map.set(k, v), getItem: (k) => map.get(k) };
  assert(c.save(store));
  const loaded = GameClock.load(store);
  assert.equal(loaded.day, 2);
  assert.equal(loaded.minutesPerSecond, 2);
  assert.equal(new GameClock({ totalMinutes: NaN }).label, "07:00");
  assert(
    !c.save({
      setItem() {
        throw Error("full");
      },
    }),
  );
});
test("all requested periods and midday contrast/sun direction/night lighting", () => {
  assert.deepEqual(
    [6, 9, 12, 16, 18, 21].map((h) => periodAt(h * 60)),
    [
      "Bình minh",
      "Buổi sáng",
      "Buổi trưa",
      "Buổi chiều",
      "Hoàng hôn",
      "Ban đêm",
    ],
  );
  const morning = lightingAt(540),
    noon = lightingAt(720),
    afternoon = lightingAt(960),
    dusk = lightingAt(1080),
    night = lightingAt(1260);
  assert(noon.sun > morning.sun);
  assert(noon.direction.y > afternoon.direction.y);
  assert(noon.ambient < morning.ambient);
  assert(dusk.sunColor.r > dusk.sunColor.b);
  assert(dusk.shallow.r > dusk.shallow.b);
  assert.equal(night.sun, 0);
  assert.equal(night.lamps, 1);
  assert.equal(morning.lamps, 0);
  assert(morning.direction.x > 0 && afternoon.direction.x < 0);
});
test("lighting has no discontinuity at stage boundaries or midnight", () => {
  for (const h of [0, 5, 6, 7, 9, 11, 12, 14, 16, 17, 18, 19, 22, 24]) {
    const a = lightingAt(h * 60 - 0.001),
      b = lightingAt(h * 60 + 0.001);
    assert(Math.abs(a.sun - b.sun) < 0.001);
    assert(a.direction.distanceTo(b.direction) < 0.001);
    assert(
      Math.hypot(a.top.r - b.top.r, a.top.g - b.top.g, a.top.b - b.top.b) <
        0.001,
    );
    assert(Math.abs(a.lamps - b.lamps) < 0.001);
  }
});
