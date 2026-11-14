import * as THREE from "three";
import { LIGHT_KEYS, TIME_CONFIG } from "./EnvironmentTimeConfig.js";
import { GameClock } from "./GameClock.js";
export function lightingAt(minutes) {
  const h = (((minutes % 1440) + 1440) % 1440) / 60;
  const i = LIGHT_KEYS.findIndex((k) => k[0] > h),
    a = LIGHT_KEYS[Math.max(0, i - 1)],
    b = LIGHT_KEYS[i < 0 ? LIGHT_KEYS.length - 1 : i];
  let t = (h - a[0]) / (b[0] - a[0]);
  t = t * t * (3 - 2 * t);
  const mix = (x, y) => x + (y - x) * t,
    color = (index) =>
      new THREE.Color(a[index]).lerp(new THREE.Color(b[index]), t);
  const angle =
    h >= 5 && h < 19
      ? ((h - 5) / 14) * Math.PI
      : Math.PI + ((h >= 19 ? h - 19 : h + 5) / 10) * Math.PI;
  const elevation = Math.sin(angle);
  return {
    sun: mix(a[1], b[1]),
    ambient: mix(a[2], b[2]),
    lamps: mix(a[3], b[3]),
    top: color(4),
    horizon: color(5),
    sunColor: color(6),
    shallow: color(7),
    deep: color(8),
    direction: new THREE.Vector3(
      Math.cos(angle),
      elevation,
      0.2 * Math.cos(angle),
    ).normalize(),
    noon: Math.max(0, elevation),
    night: mix(a[3], b[3]),
  };
}
export function createDayNight({
  scene,
  camera,
  renderer,
  sun,
  ambient,
  storage,
}) {
  const clock = GameClock.load(storage),
    fixtures = [],
    emissives = new Map(),
    existingLights = [],
    apartmentMaterials = new Map();
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (o.isPointLight)
      existingLights.push({ light: o, intensity: o.intensity });
    // Reuse two material variants per original pane: some apartments glow,
    // others retain their unlit glass. Daytime base colors remain unchanged.
    if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material)) {
      const m = o.material;
      if (
        m?.isMeshStandardMaterial &&
        m.color.b > m.color.r * 1.15 &&
        m.color.g > m.color.r * 1.05 &&
        !m.emissiveMap
      ) {
        const b = new THREE.Box3().setFromObject(o),
          p = b.getCenter(new THREE.Vector3()),
          size = b.getSize(new THREE.Vector3());
        if (
          p.y > 5 &&
          Math.max(size.x, size.y, size.z) < 3.5 &&
          Math.min(size.x, size.y, size.z) < 0.22 &&
          Math.abs(
            Math.floor(p.x * 3) + Math.floor(p.z * 5) + Math.floor(p.y * 2),
          ) %
            7 <
            3
        ) {
          if (!apartmentMaterials.has(m)) {
            const copy = m.clone();
            copy.emissive.set("#ffda9b");
            copy.emissiveIntensity = 0.32;
            apartmentMaterials.set(m, copy);
          }
          o.material = apartmentMaterials.get(m);
        }
      }
    }
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of materials) {
      if (
        !m?.emissive ||
        m.emissiveIntensity <= 0 ||
        m.emissive.r + m.emissive.g + m.emissive.b < 0.001
      )
        continue;
      emissives.set(m, m.emissiveIntensity);
      if (o.isMesh && m.emissiveIntensity >= 0.45) {
        const box = new THREE.Box3().setFromObject(o),
          size = box.getSize(new THREE.Vector3()),
          p = box.getCenter(new THREE.Vector3());
        if (
          p.y > 0.8 &&
          p.y < 15 &&
          Math.max(size.x, size.y, size.z) < 1.6 &&
          !fixtures.some((f) => f.distanceToSquared(p) < 2)
        )
          fixtures.push(p);
      }
    }
  });
  const pool = Array.from({ length: TIME_CONFIG.localLightBudget }, () => {
    const l = new THREE.PointLight("#ffd18a", 0, 14, 2);
    scene.add(l);
    return l;
  });
  const moonLight = new THREE.DirectionalLight("#afc9ff", 0.22);
  scene.add(moonLight);
  const originalSky = scene.background;
  const skyUniforms = {
    uClouds: { value: originalSky },
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uSun: { value: new THREE.Vector3() },
    uNight: { value: 0 },
    uWarm: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(280, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: skyUniforms,
      vertexShader:
        "varying vec3 vDir;varying vec2 vUv;void main(){vDir=normalize(position);vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec3 vDir;varying vec2 vUv;uniform sampler2D uClouds;uniform vec3 uTop,uHorizon,uSun;uniform float uNight,uWarm;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec3 d=normalize(vDir);float h=clamp(d.y,0.,1.);vec3 c=mix(uHorizon,uTop,smoothstep(0.,.65,h));vec3 tex=texture2D(uClouds,vUv).rgb;
 float cloud=smoothstep(.62,.94,min(tex.r,min(tex.g,tex.b)))*smoothstep(0.,.2,h);vec3 cloudColor=mix(vec3(.93,.97,1.),vec3(1.,.76,.66),uWarm*(.5+.5*max(0.,dot(d,uSun))));cloudColor=mix(cloudColor,uTop*1.45,uNight*.92);c=mix(c,cloudColor,cloud*.87);
 float glow=pow(max(0.,dot(d,uSun)),18.)*uWarm;c+=vec3(.22,.11,.06)*glow;
 vec2 cells=vUv*vec2(640.,320.),f=fract(cells)-.5;float stars=step(.996,hash(floor(cells)))*(1.-smoothstep(.02,.13,length(f)))*smoothstep(.12,.4,h);c+=vec3(.7,.8,1.)*stars*uNight;gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
 }`,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  sky.userData.dynamic = true;
  scene.background = null;
  scene.add(sky);
  const sunDisk = new THREE.Mesh(
    new THREE.SphereGeometry(3.5, 24, 16),
    new THREE.MeshBasicMaterial({
      color: "#fff2c2",
      fog: false,
      toneMapped: false,
    }),
  );
  const moonDisk = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 24, 16),
    new THREE.MeshBasicMaterial({
      color: "#dbe7ff",
      fog: false,
      toneMapped: false,
    }),
  );
  sunDisk.userData.dynamic = true;
  moonDisk.userData.dynamic = true;
  scene.add(sunDisk, moonDisk);
  // Paint crater details once, keeping the moon in the same cartoon style.
  const moonCanvas = document.createElement("canvas");
  moonCanvas.width = 256;
  moonCanvas.height = 128;
  const ctx = moonCanvas.getContext("2d");
  ctx.fillStyle = "#dbe7ff";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#abbcd8";
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    ctx.arc(
      (i * 73) % 256,
      20 + ((i * 37) % 90),
      4 + (i % 4) * 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  moonDisk.material.map = new THREE.CanvasTexture(moonCanvas);
  const water = scene.getObjectByName("coastal-water")?.material.uniforms;
  const hud = document.createElement("div");
  hud.id = "world-clock";
  hud.setAttribute("role", "timer");
  document.querySelector("#app").append(hud);
  let saveElapsed = 0,
    lastText = "",
    selectionElapsed = 10;
  const state = {
    clock,
    fixtures,
    pool,
    sky,
    sunDisk,
    moonDisk,
    apply,
    update,
    persist: () => clock.save(storage),
  };
  function apply() {
    const l = lightingAt(clock.minute);
    ambient.intensity = l.ambient;
    ambient.color.copy(l.top).lerp(new THREE.Color("#dceeff"), 0.65);
    ambient.groundColor
      .copy(l.horizon)
      .lerp(new THREE.Color("#c1b398"), 0.6)
      .multiplyScalar(0.6 + 0.4 * l.noon);
    sun.intensity = l.sun;
    sun.color.copy(l.sunColor);
    sun.position.copy(sun.target.position).addScaledVector(l.direction, 125);
    sun.shadow.radius = 1.2 + 2.4 * (1 - l.noon);

    const moonAmount =
      THREE.MathUtils.smoothstep(-l.direction.y, 0, 0.2) * l.night;
    moonLight.intensity = 0.28 * moonAmount;
    moonLight.position.copy(l.direction).multiplyScalar(-100);
    moonDisk.position.copy(camera.position).addScaledVector(l.direction, -220);
    moonDisk.visible = l.direction.y < 0;
    sunDisk.position.copy(camera.position).addScaledVector(l.direction, 220);
    sunDisk.visible = l.direction.y > -0.05;
    sky.position.copy(camera.position);
    skyUniforms.uTop.value.copy(l.top);
    skyUniforms.uHorizon.value.copy(l.horizon);
    skyUniforms.uSun.value.copy(l.direction);
    skyUniforms.uNight.value = l.night;
    skyUniforms.uWarm.value = Math.max(0, 1 - l.noon) * Math.min(1, l.sun);
    scene.fog.color.copy(l.horizon);
    renderer.toneMappingExposure = 0.96;
    for (const [m, base] of emissives)
      m.emissiveIntensity = base * 2.5 * l.lamps;
    for (const { light, intensity } of existingLights)
      light.intensity = intensity * (0.35 + 1.15 * l.lamps);
    pool.forEach(
      (light) => (light.intensity = light.userData.fixture ? 34 * l.lamps : 0),
    );
    if (water) {
      water.uShallow.value.copy(l.shallow);
      water.uDeep.value.copy(l.deep);
      water.uReflection.value
        .copy(l.sunColor)
        .lerp(new THREE.Color("#b9d7ff"), moonAmount);
      water.uSunDirection.value.copy(l.direction);
      water.uNight.value = moonAmount;
      water.uGlint.value = 0.15 + 0.65 * l.noon + 0.32 * l.night;
      water.uHaze.value.copy(l.horizon);
    }
    const text = `${l.night > 0.8 ? "☾" : "☀"} Ngày ${clock.day} – ${clock.label} · ${clock.period}`;
    if (text !== lastText) {
      hud.textContent = text;
      lastText = text;
    }
  }
  function update(dt, active = true) {
    clock.advance(dt, active && !document.hidden);
    saveElapsed += dt;
    selectionElapsed += dt;
    if (selectionElapsed > 1) {
      selectionElapsed = 0;
      const near = fixtures
        .slice()
        .sort(
          (a, b) =>
            a.distanceToSquared(camera.position) -
            b.distanceToSquared(camera.position),
        )
        .slice(0, pool.length);
      pool.forEach((light, i) => {
        light.userData.fixture = !!near[i];
        if (near[i])
          light.position.copy(near[i]).add(new THREE.Vector3(0, -0.12, 0));
      });
    }
    apply();
    if (saveElapsed >= TIME_CONFIG.saveIntervalSeconds) {
      saveElapsed = 0;
      state.persist();
    }
  }
  window.addEventListener("pagehide", state.persist);
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).get("debugTime") === "1"
  ) {
    const panel = document.createElement("details");
    panel.id = "debug-time";
    panel.innerHTML =
      "<summary>Thời gian · DEV</summary>" +
      [6, 9, 12, 16, 18, 21, 0]
        .map(
          (h) =>
            `<button data-hour="${h}">${String(h).padStart(2, "0")}:00</button>`,
        )
        .join("") +
      '<button data-time="pause">Tạm dừng</button><button data-time="resume">Tiếp tục</button><button data-time="fast">Nhanh ×10</button><button data-time="normal">Chuẩn 1s = 1 phút</button>';
    panel.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.hour !== undefined) clock.setHour(Number(b.dataset.hour));
      else if (b.dataset.time === "pause") clock.paused = true;
      else if (b.dataset.time === "resume") clock.paused = false;
      else clock.minutesPerSecond = b.dataset.time === "fast" ? 10 : 1;
      apply();
      renderer.shadowMap.needsUpdate = true;
      state.persist();
    });
    document.querySelector("#app").append(panel);
  }
  sun.shadow.camera.far = 300;
  sun.shadow.camera.updateProjectionMatrix();
  update(0);
  return state;
}
