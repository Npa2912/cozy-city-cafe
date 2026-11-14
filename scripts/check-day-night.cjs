const path = require("node:path"),
  os = require("node:os");
const artifactDir = process.env.ARTIFACT_DIR || os.tmpdir();
require("node:fs").mkdirSync(artifactDir, { recursive: true });
// Development browser QA: four actual time controls, screenshots, restoration and gameplay pause.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
let b, p;
(async () => {
  b = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  p = await b.newPage({ viewport: { width: 900, height: 600 } });
  p.setDefaultTimeout(180000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 800));
  });
  await p.goto(
    process.env.APP_URL ||
      "http://127.0.0.1:5173/?test&debugTime=1&view=street",
    { waitUntil: "networkidle", timeout: 180000 },
  );
  await p.evaluate(() => document.querySelector("#motion").click());
  await p.waitForFunction(
    () => document.querySelector("canvas").dataset.ready === "true",
    null,
    { timeout: 180000 },
  );
  console.log("READY");
  const frames = [];
  for (const [hour, label] of [
    [9, "morning"],
    [12, "noon"],
    [18, "sunset"],
    [21, "night"],
  ]) {
    await p.evaluate((h) => {
      const panel = document.querySelector("#debug-time");
      panel.open = true;
      panel.querySelector('[data-time="pause"]').click();
      panel.querySelector(`[data-hour="${h}"]`).click();
      panel.open = false;
    }, hour);
    const state = await p.evaluate((h) => {
      const { environment: e, scene: s, sun, ambient } = __cafeTest;
      return {
        hour: h,
        sun: sun.intensity,
        elevation: sun.position.y,
        ambient: ambient.intensity,
        lights: e.pool.map((l) => ({
          intensity: l.intensity,
          position: l.position.toArray(),
        })),
        clock: document.querySelector("#world-clock").textContent,
        moon: e.moonDisk.visible,
        sky: e.sky.parent === s,
        water: s
          .getObjectByName("coastal-water")
          .material.uniforms.uShallow.value.getHexString(),
        lampCount: e.fixtures.length,
      };
    }, hour);
    frames.push(state);
    console.log(JSON.stringify(state));
    await p.screenshot({
      path: path.join(artifactDir, `cozy-time-${label}.png`),
      timeout: 180000,
    });
  }
  assert(frames[1].sun > frames[0].sun);
  assert(frames[1].elevation > frames[2].elevation);
  assert.equal(frames[3].sun, 0);
  assert(frames[3].lights.some((l) => l.intensity > 0));
  assert(frames[3].moon && frames[3].sky);
  assert(frames[0].lights.every((l) => l.intensity === 0));
  console.log(
    "CLOCK",
    await p.evaluate(() => {
      const { environment: e, game } = __cafeTest;
      e.clock.paused = false;
      e.clock.setHour(23);
      e.clock.advance(60);
      if (e.clock.day !== 2) throw Error("rollover");
      const before = e.clock.totalMinutes;
      e.clock.advance(5, false);
      if (e.clock.totalMinutes !== before) throw Error("paused");
      e.persist();
      return e.clock.snapshot();
    }),
  );
  await p.reload({ waitUntil: "networkidle", timeout: 180000 });
  await p.evaluate(() => document.querySelector("#motion").click());
  await p.waitForFunction(
    () => document.querySelector("canvas").dataset.ready === "true",
    null,
    { timeout: 180000 },
  );
  assert.equal(await p.evaluate(() => __cafeTest.environment.clock.day), 2);
  assert.equal(
    await p.evaluate(() => __cafeTest.environment.clock.label),
    "00:00",
  );
  await p.setViewportSize({ width: 390, height: 844 });
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth === innerWidth),
  );
  await p.setViewportSize({ width: 900, height: 600 });
  await p.mouse.click(
    ...(await p.evaluate(() => {
      const r = document.querySelector("#game-start").getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    })),
  );
  await p.keyboard.press("Escape");
  assert(
    await p.evaluate(() => {
      const g = __cafeTest.game;
      g.paused = true;
      const t = g.model.clock;
      g.update(5);
      if (g.model.clock !== t) return false;
      g.paused = false;
      g.update(1);
      const ok = g.model.clock === t + 1;
      g.stop();
      return ok;
    }),
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(artifactDir, "cozy-time-qa.json"),
    JSON.stringify({ frames, errors, restore: true, mobile: true }, null, 2),
  );
  console.log("DAY NIGHT BROWSER PASSED");
  await b.close();
})().catch(async (e) => {
  console.error(e);
  if (b) await b.close();
  process.exit(1);
});
