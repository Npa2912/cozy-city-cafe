// Optional scene/resource QA. Playwright is supplied externally.
// The manual driver stops the application's loop and substitutes timer frames
// while restoring chunks. GL frames are real, synchronized renders; this does
// not measure interactive RAF FPS or certify GPU upload hitch behavior.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const out = process.env.ARTIFACT_DIR || '/tmp/cozy-city-qa';
fs.mkdirSync(out, { recursive: true });
let browser;
(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  page.setDefaultTimeout(300000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log('BROWSER ERROR', m.text().slice(0, 500)); } });
  // Avoid software-compositor backpressure on a stopped renderer. Scene-only
  // PNGs are read from the actual WebGL canvas immediately after rendering.
  await page.addInitScript(() => {
    new MutationObserver(() => { const c = document.querySelector('canvas'); if (c) c.style.visibility = 'hidden'; }).observe(document, { childList: true, subtree: true });
  });
  const began = Date.now();
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173/?test&view=street', { waitUntil: 'networkidle', timeout: 300000 });
  await page.evaluate(() => document.querySelector('#motion').click());
  await page.waitForFunction(() => document.querySelector('canvas').dataset.ready === 'true');
  const report = { loadMs: Date.now() - began, mode: 'manual timer frames; hidden canvas; real synchronized GL draws', rows: [], routes: [], shots: [], errors };
  console.log('READY', report.loadMs);
  await page.evaluate(() => {
    __cafeTest.renderer.setAnimationLoop(null);
    __cafeTest.environment.clock.paused = true;
    const cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => -setTimeout(() => cb(performance.now()), 16);
    window.cancelAnimationFrame = id => id < 0 ? clearTimeout(-id) : cancel(id);
    // Cancel an initial native warm-frame wait before switching to the manual driver.
    __cafeTest.camera.position.set(400, 200, 400); __cafeTest.chunks.update(.3);
  });
  const initial = await page.evaluate(async () => {
    const { chunks, renderer: r } = __cafeTest;
    await chunks.settle(); chunks.update(0);
    const gl = r.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      hardware: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      chunks: { ...chunks.stats }, allLandscape: chunks.records.every(x => x.low.children.length > 0),
      frustumCulling: chunks.records.every(x => [...x.high.children, ...x.low.children].every(o => o.frustumCulled)), gpuMemoryBytes: null,
    };
  });
  Object.assign(report, initial); assert(initial.allLandscape); assert(initial.frustumCulling); console.log('PACKED', initial.chunks);
  const shots = ['metropolis', 'river', 'roadBridge', 'gardenBridge', 'staff'];
  const views = ['street', 'city', 'coast', 'metropolis', 'westDistrict', 'river', 'roadBridge', 'gardenBridge', 'marketQuarter', 'toAnteleo', 'citySea', 'staff', 'residential', 'marine', 'expanded', 'overview', 'flowers', 'counter', 'annex', 'pos', 'fishing'];
  for (const view of views) {
    const result = await page.evaluate(async ({ view, shot }) => {
      const { renderer: r, scene: s, camera: c, environment: e, chunks, quality } = __cafeTest;
      const { CAMERA_VIEWS } = await import('/src/camera-views.js'), v = CAMERA_VIEWS[view];
      document.querySelector('#view').value = view;
      c.position.fromArray(v.position); c.fov = v.fov; c.updateProjectionMatrix(); c.lookAt(...v.target); c.updateMatrixWorld();
      e.clock.setHour(9); quality.update(c); e.apply(); chunks.update(.21, quality.level); await chunks.settle();
      for (let i = 0; i < 12; i++) chunks.update(.05, quality.level);
      const frameMs = [];
      for (let i = 0; i < (['street', 'city', 'coast'].includes(view) ? 3 : 1); i++) {
        r.shadowMap.needsUpdate = i === 0; const start = performance.now(); r.render(s, c); r.getContext().finish(); frameMs.push(performance.now() - start);
      }
      return {
        view, frameMs, meanFps: 1000 * frameMs.length / frameMs.reduce((s, n) => s + n, 0), worstFps: 1000 / Math.max(...frameMs),
        calls: r.info.render.calls, triangles: r.info.render.triangles, geometries: r.info.memory.geometries,
        textures: r.info.memory.textures, heap: performance.memory?.usedJSHeapSize ?? null, chunks: { ...chunks.stats },
        image: shot ? r.domElement.toDataURL('image/png') : null,
      };
    }, { view, shot: shots.includes(view) });
    const { image, ...row } = result;
    report.rows.push(row); console.log('VIEW', JSON.stringify(row));
    if (image) { fs.writeFileSync(path.join(out, view + '.png'), Buffer.from(image.split(',')[1], 'base64')); report.shots.push(view); }
    fs.writeFileSync(path.join(out, 'profile-after.json'), JSON.stringify(report, null, 2));
  }
  for (const speed of [5, 9, 25]) {
    const route = await page.evaluate(async speed => {
      const { camera: c, game, chunks, quality } = __cafeTest, { BRIDGES, westernFloor } = await import('/src/western-plan.js');
      let crossed = 0, maxCPU = 0;
      for (const b of BRIDGES) {
        const z = b.z + (b.road ? 5.2 : 0); c.position.set(b.minX - .5, westernFloor({ x: b.minX - .5, z }) + 1.65, z); c.lookAt(b.maxX, 1.7, z);
        for (let i = 0; i < Math.ceil(30 / speed / .02); i++) {
          const t = performance.now(); game.movePlayer(speed * .02, 0); chunks.update(.02, quality.level); maxCPU = Math.max(maxCPU, performance.now() - t);
        }
        if (c.position.x <= b.maxX) throw Error('Bridge blocked ' + b.id + ' at ' + c.position.x); crossed++;
      }
      await chunks.settle(); return { speed, crossed, maxMovementAndPlanMs: maxCPU, chunks: { ...chunks.stats } };
    }, speed);
    report.routes.push(route); console.log('ROUTE', route);
  }
  report.memory = [];
  const cdp = await page.context().newCDPSession(page);
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.evaluate(async () => {
      const { camera: c, chunks, renderer: r, scene: s } = __cafeTest;
      for (const [x, z] of [[-124, -85], [-47, 30], [75, 20], [-124, -85]]) {
        c.position.set(x, 1.88, z); c.lookAt(x, 2, z - 20); for (let i = 0; i < 15; i++) chunks.update(.05); await chunks.settle();
        // Force genuine GPU resource use on visits, not just CPU restoration.
        r.render(s, c); r.getContext().finish();
      }
      c.position.set(135, 125, 155); c.lookAt(-40, 4, -20); for (let i = 0; i < 20; i++) chunks.update(.05); await chunks.settle();
    });
    await cdp.send('HeapProfiler.collectGarbage');
    const sample = await page.evaluate(() => ({ heap: performance.memory?.usedJSHeapSize ?? null, highChunks: __cafeTest.chunks.stats.highChunks,
      fadeMaterials: __cafeTest.chunks.records.reduce((s, r) => s + r.highMaterials.size + r.lowMaterials.size, 0), geometries: __cafeTest.renderer.info.memory.geometries }));
    report.memory.push(sample); console.log('MEMORY', cycle, sample);
  }
  report.quality = [];
  for (const level of ['low', 'medium', 'high']) report.quality.push(await page.evaluate(level => {
    const t = __cafeTest; t.quality.set(level); t.chunks.update(.3, level); t.renderer.render(t.scene, t.camera);
    return { level, calls: t.renderer.info.render.calls, width: t.renderer.domElement.width, shadow: t.sun.shadow.mapSize.x };
  }, level));
  const night = await page.evaluate(() => { const t = __cafeTest; t.environment.clock.setHour(22); t.environment.apply(); t.renderer.render(t.scene, t.camera); return t.renderer.domElement.toDataURL('image/png'); });
  fs.writeFileSync(path.join(out, 'night.png'), Buffer.from(night.split(',')[1], 'base64'));
  report.note = 'SwiftShader software GPU. Main loop stopped; timer-based chunk warming and hidden canvas avoid compositor stalls. Synchronized GL samples are not interactive FPS or upload-hitch certification. Initial procedural construction remains. GPU VRAM API unavailable.';
  fs.writeFileSync(path.join(out, 'profile-after.json'), JSON.stringify(report, null, 2));
  assert.deepEqual(errors, []); console.log('CITY QA PASSED'); await browser.close();
})().catch(async e => { console.error(e); if (browser) await browser.close(); process.exit(1); });
