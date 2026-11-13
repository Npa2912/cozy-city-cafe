// Real Three.js geometry stress test. No additional application dependency is required.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
let browser, page;
(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  page = await browser.newPage({ viewport: { width: 900, height: 650 } });
  page.setDefaultTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const real = performance.now.bind(performance);
    window.__realNow = real;
    performance.now = () => window.__heldTime ?? real();
  });
  await page.goto(
    process.env.APP_URL || "http://127.0.0.1:5173/?test&view=staff",
    { timeout: 180000, waitUntil: "networkidle" },
  );
  await page.evaluate(() => {
    document.querySelector("#motion").click();
  });
  await page.waitForFunction(
    () => document.querySelector("canvas").dataset.ready === "true",
    null,
    { timeout: 180000 },
  );
  console.log("READY");
  const geometry = await page.evaluate(async () => {
    const { game, camera, pov } = __cafeTest;
    const { blocked, findPath } = await import("/src/game/collision.js");
    game.start();
    pov.unlock();
    const p = game.world.point(-3.7, -3.95);
    camera.position.set(p.x, 2.041, p.z);
    const t = game.world.point(-3.7, -3.2);
    camera.lookAt(t.x, t.y, t.z);
    window.__heldTime = __realNow();
    window.__raf = requestAnimationFrame;
    window.requestAnimationFrame = (cb) => {
      window.__pendingFrame = cb;
      return 0;
    };
    game.model.doorOpen = true;
    game.world.setDoorInstant(true);
    game.model.business = true;
    window.qa = { minSep: Infinity, maxInside: 0, maxOutside: 0, transits: 0 };
    return Object.fromEntries(
      Object.entries(game.world.layout)
        .filter(([k]) =>
          [
            "spawn",
            "entrance",
            "doorInside",
            "doorOutside",
            "outsideWaiting",
            "insideWaiting",
          ].includes(k),
        )
        .map(([k, v]) => [
          k,
          (Array.isArray(v) ? v : [v]).map((p) => ({
            p,
            blocked: blocked(p, 0.32, [
              ...game.obstacles,
              game.world.doorShape(),
            ]),
          })),
        ]),
    );
  });
  console.log(JSON.stringify(geometry));
  console.log(
    await page.evaluate(async () => {
      const { blocked, findPath } = await import("/src/game/collision.js"),
        g = __cafeTest.game,
        sh = [...g.obstacles, g.world.doorShape()];
      let rows = [];
      for (let z = -5; z < 3; z += 0.5) {
        let row = z + ":";
        for (let x = -6; x <= -2; x += 0.25)
          row += blocked({ x, z }, 0.32, sh) ? "#" : ".";
        rows.push(row);
      }
      return rows.join("\n");
    }),
  );
  assert(
    Object.values(geometry)
      .flat()
      .every((p) => !p.blocked),
    "All staging points must be collision-free",
  );
  for (let b = 0; b < 30; b++) {
    const result = await page.evaluate(async () => {
      const { game } = __cafeTest,
        m = game.model,
        { RECIPES, ACTIONS } = await import("/src/game/data.js"),
        { notesFor } = await import("/src/game/cash-register.js");
      for (let i = 0; i < 300; i++) {
        if (!m.activeOrder && m.clock % 80 < 2) {
          const n = m.customers.find((n) => n.id === m.queue[0]);
          if (n?.queueReady) m.startOrder(n.id);
        }
        const o = m.orders.find((o) => o.customer === m.activeOrder);
        if (o?.status === "PREPARING" && !m.job) {
          const r = RECIPES.find((r) => r.id === o.recipe);
          m.interact(ACTIONS[r.steps[o.step]].station);
        }
        if (o?.status === "WAITING_PAYMENT") {
          m.openCash(o.customer);
          m.resetNotes();
          for (const bill of notesFor(
            o.tender - RECIPES.find((r) => r.id === o.recipe).price,
          ))
            m.addNote(bill);
          m.pay(o.customer);
        }
        game.update(0.1);
        if (m.customers.some((n) => n.navigation?.stalled > 35))
          throw Error("STUCK " + JSON.stringify(m.customers));
        const inside = m.customers.filter((n) => n.inside).length,
          outside = m.customers.filter((n) =>
            ["WALKING_TO_SHOP", "WAITING_AT_ENTRANCE"].includes(n.state),
          ).length,
          transit = m.customers.filter((n) =>
            ["ENTERING_DOOR", "EXITING_DOOR"].includes(n.state),
          );
        qa.maxInside = Math.max(qa.maxInside, inside);
        qa.maxOutside = Math.max(qa.maxOutside, outside);
        qa.transits = Math.max(qa.transits, transit.length);
        if (inside > 3 || outside > 2 || transit.length > 1)
          throw Error("CAPACITY " + JSON.stringify(m.snapshot()));
        for (let a = 0; a < m.customers.length; a++)
          for (let b = a + 1; b < m.customers.length; b++) {
            const x = m.customers[a],
              y = m.customers[b],
              d = Math.hypot(x.pos.x - y.pos.x, x.pos.z - y.pos.z);
            qa.minSep = Math.min(qa.minSep, d);
            if (d < 0.6)
              throw Error("OVERLAP " + d + " " + JSON.stringify([x, y]));
          }
      }
      return {
        clock: m.clock,
        completed: m.orders.filter((o) => o.status === "COMPLETED").length,
        qa,
        customers: m.customers.map((n) => ({
          id: n.id,
          state: n.state,
          pos: n.pos,
          nav: n.navigation,
          replans: n.replans,
        })),
      };
    });
    console.log(JSON.stringify(result));
  }
  const state = await page.evaluate(() => ({
    qa,
    completed: __cafeTest.game.model.orders.filter(
      (o) => o.status === "COMPLETED",
    ).length,
  }));
  assert(state.completed >= 8, JSON.stringify(state));
  assert.deepEqual(errors, []);

  const special = await page.evaluate(async () => {
    const { game } = __cafeTest,
      m = game.model,
      { RECIPES, ACTIONS, CONFIG } = await import("/src/game/data.js"),
      { notesFor } = await import("/src/game/cash-register.js");
    m.business = false;
    const serve = () => {
      if (!m.activeOrder) {
        const n = m.customers.find((n) => n.id === m.queue[0]);
        if (n?.queueReady) m.startOrder(n.id);
      }
      const o = m.orders.find((o) => o.customer === m.activeOrder);
      if (o?.status === "PREPARING" && !m.job) {
        const r = RECIPES.find((r) => r.id === o.recipe);
        m.interact(ACTIONS[r.steps[o.step]].station);
      }
      if (o?.status === "WAITING_PAYMENT") {
        m.openCash(o.customer);
        m.resetNotes();
        for (const b of notesFor(
          o.tender - RECIPES.find((r) => r.id === o.recipe).price,
        ))
          m.addNote(b);
        m.pay(o.customer);
      }
    };
    const step = () => {
      game.update(0.1);
      for (let i = 0; i < m.customers.length; i++)
        for (let j = i + 1; j < m.customers.length; j++)
          if (
            Math.hypot(
              m.customers[i].pos.x - m.customers[j].pos.x,
              m.customers[i].pos.z - m.customers[j].pos.z,
            ) < 0.6
          )
            throw Error("special overlap");
    };
    for (let i = 0; i < 3000 && m.customers.length; i++) {
      serve();
      step();
    }
    if (m.customers.length) throw Error("Could not drain previous customers");
    // Controlled arrivals exercise full capacity independently of the timer test.
    m.business = true;
    if (!m.admit()) throw Error("first controlled admission");
    m.business = false;
    for (let i = 0; i < 600 && !m.customers[0]?.queueReady; i++) step();
    for (let k = 0; k < 2; k++) {
      m.business = true;
      if (!m.admit()) throw Error("controlled admission " + k);
      m.business = false;
      for (
        let i = 0;
        i < 600 && m.customers.filter((n) => n.queueReady).length < k + 2;
        i++
      )
        step();
    }
    if (m.customers.filter((n) => n.inside).length !== 3)
      throw Error("three customers not inside");
    // Hold two paid drinkers at their tables to create a full inside + outside case.
    for (
      let i = 0;
      i < 1000 &&
      m.customers.filter((n) => n.state === "SITTING_AND_DRINKING").length < 2;
      i++
    ) {
      serve();
      for (const n of m.customers)
        if (n.state === "SITTING_AND_DRINKING") n.age = 0;
      step();
    }
    if (
      m.customers.filter((n) => n.state === "SITTING_AND_DRINKING").length !== 2
    )
      throw Error("need two seated drinkers");
    let secondOutside = false;
    for (let i = 0; i < 400; i++) {
      m.business = true;
      m.admit();
      m.business = false;
      for (const n of m.customers)
        if (n.state === "SITTING_AND_DRINKING") n.age = 0;
      step();
      if (
        m.customers.filter((n) =>
          ["WALKING_TO_SHOP", "WAITING_AT_ENTRANCE"].includes(n.state),
        ).length === 2
      ) {
        secondOutside = true;
        break;
      }
    }
    if (!secondOutside) throw Error("outside area never filled");
    m.business = true;
    const refused = !m.admit();
    m.business = false;
    if (!refused) throw Error("sixth customer accepted");
    if (m.toggleDoor()) throw Error("door closed on remaining customers");
    for (const n of m.customers)
      if (n.state === "SITTING_AND_DRINKING") n.age = CONFIG.drinkSeconds;
    let sameTimeExits = false,
      waitingEntry = false,
      seenOwnerOut = false;
    for (let i = 0; i < 4000 && m.customers.length; i++) {
      serve();
      step();
      const exits = m.customers.filter((n) =>
        ["LEAVING_SHOP", "WAITING_TO_EXIT", "EXITING_DOOR"].includes(n.state),
      );
      if (exits.length >= 2) sameTimeExits = true;
      if (
        m.customers.some((n) => n.state === "WAITING_AT_ENTRANCE") &&
        exits.length
      )
        waitingEntry = true;
      if (m.doorway.direction === "out") seenOwnerOut = true;
      if (
        m.customers.filter((n) =>
          ["ENTERING_DOOR", "EXITING_DOOR"].includes(n.state),
        ).length > 1
      )
        throw Error("two doorway owners");
    }
    if (m.customers.length)
      throw Error("special cycle stuck " + JSON.stringify(m.customers));
    if (!sameTimeExits || !waitingEntry || !seenOwnerOut)
      throw Error("special scenarios not actually exercised");
    if (!m.toggleDoor() || m.doorOpen) throw Error("empty shop did not close");
    return {
      twoOutside: secondOutside,
      fullRefused: refused,
      twoExits: sameTimeExits,
      entryWaited: waitingEntry,
      allDeparted: true,
      completed: m.orders.filter((o) => o.status === "COMPLETED").length,
    };
  });
  console.log("SPECIAL CAPACITY/EXIT CASES", special);
  await page.evaluate(() => {
    requestAnimationFrame = __raf;
    if (__pendingFrame) __raf(__pendingFrame);
  });
  await page.screenshot({ path: "/tmp/cozy-doorway.png", timeout: 180000 });
  console.log("REAL GEOMETRY DOORWAY PASSED", state);
  await browser.close();
})().catch(async (e) => {
  console.error(e);
  if (page)
    console.log(
      await page
        .evaluate(() => JSON.stringify(__cafeTest.game.model.snapshot()))
        .catch(() => null),
    );
  if (browser) await browser.close();
  process.exit(1);
});
