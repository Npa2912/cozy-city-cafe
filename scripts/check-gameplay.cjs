// Optional browser QA. Run against the Vite dev server; the test bridge is absent in production.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  assert = require("node:assert/strict");
let b, p;
(async () => {
  b = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  p = await b.newPage({ viewport: { width: 900, height: 650 } });
  p.setDefaultTimeout(180000);
  const errors = [];
  p.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("ERROR", e.message);
  });
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 800));
  });
  await p.addInitScript(() => {
    const real = performance.now.bind(performance);
    window.__realNow = real;
    performance.now = () => window.__heldTime ?? real();
  });
  await p.goto(
    process.env.APP_URL || "http://127.0.0.1:5173/?test&view=staff",
    { waitUntil: "networkidle", timeout: 180000 },
  );
  await p.evaluate(() => {
    if (document.querySelector("#motion").textContent === "Tạm dừng")
      document.querySelector("#motion").click();
  });
  await p.waitForFunction(
    () => document.querySelector("canvas").dataset.ready === "true",
    null,
    { timeout: 180000 },
  );
  console.log("ready");
  await p.evaluate(() => (window.__heldTime = __realNow()));
  await p.mouse.click(
    ...(await p.evaluate(() => {
      const r = document.querySelector("#game-start").getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    })),
  );
  await p.keyboard.press("Escape");
  const position = async (id) =>
    p.evaluate((id) => {
      const { game, camera, pov } = __cafeTest;
      pov.unlock();
      const target = game.world.stations.find((s) => s.id === id).position,
        l = game.world.toLocal(target),
        pos = game.world.point(l.x, id === "door" ? 2.05 : -3.95);
      camera.position.set(pos.x, game.world.floorAt(pos) + 1.65, pos.z);
      camera.lookAt(target.x, target.y, target.z);
      game.update(0);
      return { safe: game.collision.safe(pos), staff: game.world.isStaff(pos) };
    }, id);
  await position("door");
  await p.keyboard.press("KeyE");
  assert(await p.evaluate(() => __cafeTest.game.model.doorOpen));
  await p.evaluate(() => {
    for (let i = 0; i < 40; i++) __cafeTest.game.update(0.05);
  });
  console.log(
    "staff access",
    await p.evaluate(async () => {
      const { game } = __cafeTest;
      const { findPath, blocked } = await import("/src/game/collision.js");
      const from = game.world.point(-0.3, -0.8),
        to = game.world.point(-3.7, -3.95),
        shapes = [...game.obstacles, game.world.doorShape()],
        path = findPath(from, to, shapes, game.world.bounds, 0.28);
      return { path: !!path, staffBlocked: blocked(to, 0.28, shapes) };
    }),
  );
  assert((await position("counter")).safe, "staff POS location must be clear");
  await p.evaluate(() => {
    __cafeTest.game.model.random = () => 0.99;
  });
  await p.keyboard.press("KeyO");
  const advance = async (test, limit = 1500) =>
    p.evaluate(
      ({ test, limit }) => {
        const { game } = __cafeTest;
        for (let i = 0; i < limit; i++) {
          game.update(0.05);
          if (
            test === "queue" &&
            game.model.orders.filter((o) => o.status === "WAITING").length ===
              3 &&
            game.model.customers.every((n) => n.queueReady)
          )
            return { ok: true, customers: game.model.customers };
          if (
            test === "sit" &&
            game.model.customers.find((n) => n.id === 1)?.state ===
              "SITTING_AND_DRINKING"
          )
            return { ok: true };
          if (test === "exit" && game.model.orders[0]?.status === "COMPLETED")
            return { ok: true };
        }
        return { ok: false, state: game.model.snapshot() };
      },
      { test, limit },
    );
  let result = await advance("queue");
  console.log("queue", JSON.stringify(result));
  assert(result.ok, "three customers must physically queue");
  await p.keyboard.press("KeyO");
  await position("counter");
  await p.keyboard.press("KeyE");
  assert.equal(await p.locator(".order-card").count(), 3);
  assert(await p.locator('[data-action="start"][data-id="1"]').isEnabled());
  assert(!(await p.locator('[data-action="start"][data-id="2"]').isEnabled()));
  await p.screenshot({ path: "/tmp/cozy-guided-orders.png", timeout: 180000 });
  await p.evaluate(() =>
    document.querySelector('[data-action="start"][data-id="1"]').click(),
  );
  assert.equal(await p.evaluate(() => __cafeTest.game.model.activeOrder), 1);
  for (const station of ["ingredients", "coffee", "delivery"]) {
    assert((await position(station)).safe, station + " staff space");
    await p.keyboard.press("KeyE");
    if (station === "coffee") {
      assert(await p.evaluate(() => !!__cafeTest.game.model.job));
      await p.screenshot({
        path: "/tmp/cozy-guided-tutorial.png",
        timeout: 180000,
      });
      await p.evaluate(() => {
        for (let i = 0; i < 65; i++) __cafeTest.game.update(0.05);
      });
    }
  }
  await p.evaluate(() => {
    for (let i = 0; i < 20; i++) __cafeTest.game.update(0.05);
  });
  assert.equal(
    await p.evaluate(() => __cafeTest.game.model.orders[0].status),
    "WAITING_PAYMENT",
  );
  assert(
    await p.evaluate(() =>
      __cafeTest.game.model.seats.every((s) => s.status === "AVAILABLE"),
    ),
  );
  await position("counter");
  await p.keyboard.press("KeyE");
  assert.equal(await p.locator(".cash-drawer button").count(), 7);
  await p.evaluate(() =>
    document.querySelector('[data-action="note"][data-id="50000"]').click(),
  );
  assert(!(await p.locator('[data-action="confirm"]').isEnabled()));
  await p.evaluate(() =>
    document.querySelector('[data-action="note"][data-id="20000"]').click(),
  );
  await p.evaluate(() =>
    document.querySelector('[data-action="undo"]').click(),
  );
  assert.equal(
    await p.evaluate(() => __cafeTest.game.model.register.notes.length),
    1,
  );
  await p.evaluate(() =>
    document.querySelector('[data-action="reset"]').click(),
  );
  await p.evaluate(() =>
    document.querySelector('[data-action="hint"]').click(),
  );
  for (const note of [50000, 20000, 10000])
    await p.evaluate(
      (note) =>
        document
          .querySelector(`[data-action="note"][data-id="${note}"]`)
          .click(),
      note,
    );
  assert(await p.locator('[data-action="confirm"]').isEnabled());
  await p.screenshot({ path: "/tmp/cozy-guided-cash.png", timeout: 180000 });
  await p.evaluate(() =>
    document.querySelector('[data-action="confirm"]').click(),
  );
  assert.equal(
    await p.evaluate(() => __cafeTest.game.model.account.revenue),
    20000,
  );
  assert.equal(
    await p.evaluate(() => __cafeTest.game.model.account.cash),
    117000,
  );
  assert(!(await p.evaluate(() => __cafeTest.game.model.pay(1))));
  result = await advance("sit");
  console.log("seating", result);
  assert(result.ok);
  result = await advance("exit");
  console.log("exit", JSON.stringify(result));
  assert(result.ok);
  assert.equal(
    await p.evaluate(() => __cafeTest.game.model.seats[0].status),
    "AVAILABLE",
  );
  assert.deepEqual(await p.evaluate(() => __cafeTest.game.model.queue), [2, 3]);
  await p.evaluate(() => __cafeTest.game.persist());
  await p.context().storageState({ path: "/tmp/cozy-guided-save.json" });
  assert.deepEqual(errors, []);
  console.log(
    "GUIDED REAL-SCENE FLOW PASSED: FIFO3, coffee tutorial, cash 100000-80000=20000, seating, exit, save",
  );
  await b.close();
})().catch(async (e) => {
  console.error(e);
  if (p)
    console.log(
      await p
        .evaluate(() =>
          JSON.stringify({
            state: __cafeTest.game.model.snapshot(),
            panel: __cafeTest.game.ui.panel,
            player: __cafeTest.camera.position.toArray(),
          }),
        )
        .catch(() => null),
    );
  if (b) await b.close();
  process.exit(1);
});
