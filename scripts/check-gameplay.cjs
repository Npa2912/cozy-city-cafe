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
  p = await b.newPage({ viewport: { width: 800, height: 600 } });
  p.setDefaultTimeout(180000);
  const errors = [];
  p.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("ERROR", e.message);
  });
  p.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("pointer lock"))
      errors.push(m.text().slice(0, 800));
  });
  await p.addInitScript(() => {
    const real = performance.now.bind(performance);
    window.__realNow = real;
    performance.now = () => window.__heldTime ?? real();
  });
  await p.goto(
    process.env.APP_URL || "http://127.0.0.1:5173/?test&view=counter",
    { waitUntil: "networkidle", timeout: 180000 },
  );
  await p.evaluate(() => {
    localStorage.clear();
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
  const position = async (x, z, id) =>
    p.evaluate(
      ({ x, z, id }) => {
        const { game, camera, pov } = __cafeTest;
        pov.unlock();
        const pos = game.world.point(x, z);
        camera.position.set(pos.x, game.world.floorAt(pos) + 1.65, pos.z);
        const target =
          game.world.stations.find((s) => s.id === id)?.position ||
          game.world.seats[0].center;
        camera.lookAt(target.x, target.y ?? 1.3, target.z);
        game.update(0);
        return {
          safe: game.collision.safe(pos),
          prompt: document.querySelector(".game-interact").textContent,
        };
      },
      { x, z, id },
    );
  await position(-0.3, 2.05, "door");
  const closed = await p.evaluate(() => {
    const { game, camera } = __cafeTest;
    game.movePlayer(-4, 0);
    return camera.position.x;
  });
  assert(closed > -2.4, "closed door blocks real world capsule");
  await position(-0.3, 2.05, "door");
  await p.keyboard.press("KeyE");
  assert(await p.evaluate(() => __cafeTest.game.model.doorOpen));
  await p.evaluate(() => {
    for (let i = 0; i < 40; i++) __cafeTest.game.update(0.05);
  });
  const opened = await p.evaluate(() => {
    const { game, camera } = __cafeTest;
    game.movePlayer(-3, 0);
    return camera.position.x;
  });
  assert(opened < -3.8);
  console.log("actual door/capsule passed");
  await position(-4.8, -1.1, "ingredients");
  await p.evaluate(() =>
    document.querySelector('[data-action="business"]').click(),
  );
  const advance = async (state, limit = 1000) =>
    p.evaluate(
      ({ state, limit }) => {
        const { game } = __cafeTest;
        for (let i = 0; i < limit; i++) {
          game.update(0.05);
          if (game.model.customers[0]?.state === state)
            return { state, pos: game.model.customers[0].pos };
        }
        return { customers: game.model.customers, message: game.model.message };
      },
      { state, limit },
    );
  let r = await advance("WAITING_TO_ORDER");
  console.log("arrival", JSON.stringify(r));
  assert.equal(r.state, "WAITING_TO_ORDER");
  await p.evaluate(() => {
    if (__cafeTest.game.model.business)
      document.querySelector('[data-action="business"]').click();
  });
  const openStation = async (x, z, id) => {
    console.log("station", id, await position(x, z, id));
    await p.keyboard.press("KeyE");
  };
  await openStation(-2.5, -1, "counter");
  await p.evaluate(() =>
    document.querySelector('[data-action="accept"]').click(),
  );
  await p.evaluate(() => __cafeTest.game.ui.close());
  await openStation(-5.15, -1.1, "ingredients");
  await p.evaluate(() =>
    document.querySelector('[data-action="craft"][data-id="cup"]').click(),
  );
  assert.deepEqual(await p.evaluate(() => __cafeTest.game.model.craft.steps), [
    "cup",
  ]);
  await p.evaluate(() => __cafeTest.game.ui.close());
  await openStation(-3.7, -1.1, "coffee");
  await p.evaluate(() =>
    document.querySelector('[data-action="craft"][data-id="coffee"]').click(),
  );
  assert(await p.evaluate(() => !!__cafeTest.game.model.job));
  await p.evaluate(() => {
    for (let i = 0; i < 65; i++) __cafeTest.game.update(0.05);
    __cafeTest.game.ui.close();
  });
  await openStation(-5.15, -1.1, "ingredients");
  await p.evaluate(() =>
    document.querySelector('[data-action="craft"][data-id="finish"]').click(),
  );
  await p.evaluate(() => __cafeTest.game.ui.close());
  await position(-0.7, -1.1, "delivery");
  await p.keyboard.press("KeyE");
  assert.equal(
    await p.evaluate(() => __cafeTest.game.model.orders[0].status),
    "SERVED",
  );
  console.log("UI craft and serve passed");
  await position(-4.8, -1.1, "ingredients");
  r = await advance("SITTING_AND_DRINKING");
  console.log("seating", JSON.stringify(r));
  assert.equal(r.state, "SITTING_AND_DRINKING");
  await p.evaluate(() => {
    for (let i = 0; i < 25; i++) __cafeTest.game.update(0.05);
    const { game, camera } = __cafeTest;
    const pos = game.world.point(1.3, -1.2);
    camera.position.set(pos.x, 2.04, pos.z);
    const s = game.world.seats[0].chair;
    camera.lookAt(s.x, 1.4, s.z);
    game.update(0);
  });
  await position(-4.8, -1.1, "ingredients");
  r = await advance("WAITING_FOR_PAYMENT");
  console.log("cashier", JSON.stringify(r));
  assert.equal(r.state, "WAITING_FOR_PAYMENT");
  await openStation(-2.5, -1, "counter");
  assert(await p.locator('[data-action="pay"]').isEnabled());
  await p.evaluate(() => document.querySelector('[data-action="pay"]').click());
  assert.equal(
    await p.evaluate(() => __cafeTest.game.model.account.revenue),
    25,
  );
  assert(!(await p.evaluate(() => __cafeTest.game.model.pay(1))));
  await p.evaluate(() => __cafeTest.game.ui.close());
  await position(-4.8, -1.1, "ingredients");
  await p.evaluate(() => {
    for (let i = 0; i < 500; i++) __cafeTest.game.update(0.05);
  });
  assert.equal(
    await p.evaluate(() => __cafeTest.game.model.customers.length),
    0,
  );
  await position(3.1, -2.2, "clean0");
  await p.keyboard.press("KeyE");
  await p.evaluate(() => {
    for (let i = 0; i < 60; i++) __cafeTest.game.update(0.05);
  });
  assert.equal(
    await p.evaluate(() => __cafeTest.game.model.seats[0].status),
    "AVAILABLE",
  );
  await p.evaluate(() => __cafeTest.game.persist());
  assert(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("anteleo.game.v1")).data.account
          .revenue === 25,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "FULL REAL-GEOMETRY FLOW PASSED, revenue25, clean seat, save, no errors",
  );
  await b.close();
})().catch(async (e) => {
  console.error(e);
  if (p)
    console.log(
      await p
        .evaluate(async () => {
          const { game, camera, pov } = __cafeTest;
          const { findPath, blocked, contact } = await import(
            "/src/game/collision.js"
          );
          const n = game.model.customers[0],
            goal = game.world.layout.exit,
            shapes = [...game.obstacles, game.world.doorShape()];
          return JSON.stringify({
            state: game.model.snapshot(),
            goal,
            blocked: blocked(goal, 0.23, shapes),
            blockers: shapes.filter((s) => contact(goal, 0.23, s)),
            path: n && findPath(n.pos, goal, shapes, game.world.bounds),
            player: camera.position.toArray(),
            locked: pov.isLocked,
            panel: game.ui.panel,
          });
        })
        .catch(() => null),
    );
  if (b) await b.close();
  process.exit(1);
});
