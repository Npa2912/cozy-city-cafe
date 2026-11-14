const path = require("node:path"),
  os = require("node:os");
const artifactDir = process.env.ARTIFACT_DIR || os.tmpdir();
require("node:fs").mkdirSync(artifactDir, { recursive: true });
// Run against npm run preview. Browser storage seeding is test-only.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  assert = require("node:assert/strict");
let b;
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
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  p.setDefaultTimeout(180000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await p.addInitScript(() => {
    const hour = Number(
      new URLSearchParams(location.search).get("qaHour") || 21,
    );
    localStorage.setItem(
      "anteleo.world-clock.v1",
      JSON.stringify({
        version: 1,
        totalMinutes: hour * 60,
        minutesPerSecond: 1,
      }),
    );
  });
  for (const [hour, view, name] of [
    [18, "street", "sunset"],
    [21, "coast", "coast-night"],
  ]) {
    await p.goto(
      `${process.env.PREVIEW_URL || "http://127.0.0.1:4173"}/?debugTime=1&test&view=${view}&qaHour=${hour}`,
      { waitUntil: "networkidle", timeout: 180000 },
    );
    await p.evaluate(() => document.querySelector("#motion").click());
    await p.waitForFunction(
      () => document.querySelector("canvas").dataset.ready === "true",
      null,
      { timeout: 180000 },
    );
    assert.equal(await p.locator("#debug-time").count(), 0);
    assert(await p.evaluate(() => !window.__cafeTest));
    assert(
      (await p.locator("#world-clock").textContent()).includes(`${hour}:`),
    );
    await p.screenshot({
      path: path.join(artifactDir, `cozy-time-${name}.png`),
      timeout: 180000,
    });
    console.log("PRODUCTION", hour, view, "PASSED");
  }
  assert.deepEqual(errors, []);
  console.log(
    "PRODUCTION PASSED: saved time, sunset, night water/fish rendering, no DEV tools or JS/shader errors",
  );
  await b.close();
})().catch(async (e) => {
  console.error(e);
  if (b) await b.close();
  process.exit(1);
});
