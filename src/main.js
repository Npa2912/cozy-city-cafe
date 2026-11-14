import { createChunkStreaming } from "./chunk-streaming.js";
import { renderQuality } from "./render-quality.js";
import { buildWesternDistrict } from "./western-district.js";
import { createDayNight } from "./systems/DayNightCycle.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import "./style.css";
import { createCafeGame } from "./game/runtime.js";
import { buildStreet } from "./street.js";
import { refineStreet } from "./refinement.js";
import { buildLife } from "./life.js";
import { extendCity } from "./coastal-district.js";

import { CAMERA_VIEWS, WALK_STARTS } from "./camera-views.js";


const canvas = document.querySelector("#scene");
const status = document.querySelector("#status");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch {
  status.textContent =
    "Trình duyệt cần hỗ trợ WebGL để hiển thị khung cảnh 3D.";
}

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#269add");
  scene.fog = new THREE.Fog("#b9d5df", 170, 450);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 750);
  scene.fog.far=680;scene.fog.near=220;
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.maxPolarAngle = Math.PI * 0.56;
  orbit.minDistance = 0.8;
  orbit.maxDistance = 430;
  const pov = new PointerLockControls(camera, canvas);
  const keys = new Set();
  const views = CAMERA_VIEWS;
  const requestedView = new URLSearchParams(location.search).get("view");
  let selectedView = Object.hasOwn(views, requestedView)
    ? requestedView
    : "metropolis";
  let activeFov = views[selectedView].fov;
  const orbitButton = document.querySelector("#orbit");
  const povButton = document.querySelector("#pov");
  const help = document.querySelector("#help");
  function setMode(walking) {
    orbit.enabled = !walking && !game?.active;
    orbitButton.setAttribute("aria-pressed", String(!walking));
    povButton.setAttribute("aria-pressed", String(walking));
    help.textContent = walking
      ? "WASD để di chuyển · Chuột để nhìn · Esc để thoát"
      : "Kéo để xoay · Cuộn để thu phóng · Chuột phải để dịch chuyển";
    keys.clear();
  }
  let game;
  let needsRender = true;
  let returnToReference = false;
  function reset(view = "metropolis") {
    if (document.pointerLockElement === canvas) {
      returnToReference = true;
      pov.unlock();
      return;
    }
    if (game?.active) game.stop();
    orbit.enableDamping = false;
    orbit.update();
    setMode(false);
    selectedView = typeof view === "string" ? view : "metropolis";
    const preset = views[selectedView];
    camera.position.fromArray(preset.position);
    orbit.target.fromArray(preset.target);
    document.querySelector("#view").value = selectedView;
    activeFov = preset.fov;
    camera.fov = innerWidth < 700 ? 75 : activeFov;
    camera.updateProjectionMatrix();
    orbit.update();
    orbit.enableDamping = true;
    needsRender = true;
  }
  reset(selectedView);
  const ambient = new THREE.HemisphereLight(0xd6efff, 0xc1b398, 1.2);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffedc4, 3.5);
  sun.position.set(52, 35, 3);
  sun.target.position.set(30, 0, -15);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -100,
    right: 100,
    top: 100,
    bottom: -100,
    far: 260,
  });
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const district = buildStreet(scene);
  refineStreet(scene, district);
  const expansion = extendCity(scene, district);
  expansion.update(0, 0);
  const life = buildLife(scene, district);
  life.update(0, 0);
  const western = buildWesternDistrict(scene, district);
  western.update(0);
  const environment = createDayNight({
    scene,
    camera,
    renderer,
    sun,
    ambient,
    storage: localStorage,
  });
  game = createCafeGame({
    scene,
    cafe: district.cafe,
    camera,
    pov,
    orbit,
    canvas,
    onDirty: () => {
      needsRender = true;
    },
  });
  scene.traverse((object) => {
    if (
      object.isMesh &&
      !Array.isArray(object.material) &&
      object.material.transparent
    )
      object.castShadow = false;
  });
  const quality=renderQuality(renderer,sun,scene);
  const chunks=createChunkStreaming(scene,renderer,camera);
  const updateFoliageLOD = (camera)=>quality.update(camera);
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("test"))
    window.__cafeTest = {
      game,
      camera,
      pov,
      environment,
      scene,
      renderer,
      sun,
      ambient,
      chunks,
      quality,
      western,
    };

  updateFoliageLOD(camera);
  status.textContent = "ANTELEO · Thành phố, biển & câu cá";
  document
    .querySelector("#view")
    .addEventListener("change", (event) => reset(event.target.value));
  orbitButton.addEventListener("click", () => {
    game.stop();
    pov.unlock();
    setMode(false);
  });
  povButton.addEventListener("click", () => {
    if (game.active) {
      pov.lock();
      return;
    }
    const start = WALK_STARTS[selectedView];
    if (start) {
      camera.position.fromArray(start.position);
      camera.lookAt(new THREE.Vector3(...start.target));
    }
    activeFov = 65;
    camera.fov = innerWidth < 700 ? 75 : activeFov;
    camera.updateProjectionMatrix();
    pov.lock();
  });
  pov.addEventListener("lock", () => {
    game.movePlayer(0, 0);
    setMode(true);
  });
  document.addEventListener("pointerlockerror", () => {
    status.textContent = "Cho phép khóa chuột để dùng POV WASD.";
  });
  pov.addEventListener("unlock", () => {
    if (game?.active) {
      keys.clear();
      orbit.enabled = false;
      needsRender = true;
      return;
    }
    if (returnToReference) {
      returnToReference = false;
      reset();
      return;
    }
    const direction = camera.getWorldDirection(new THREE.Vector3());
    orbit.target.copy(camera.position).addScaledVector(direction, 8);
    setMode(false);
  });
  document.querySelector("#reset").addEventListener("click", reset);
  window.addEventListener("keydown", (event) => {
    if (event.code === "Escape" && document.pointerLockElement === canvas) {
      pov.unlock();
      return;
    }
    if (pov.isLocked && ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => keys.clear());
  function resize() {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.fov = innerWidth < 700 ? 75 : activeFov;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  window.addEventListener("resize", resize);
  resize();
  document.querySelector("#capture").addEventListener("click", () => {
    updateFoliageLOD(camera);
    renderer.render(scene, camera);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = "cozy-city-cafe.png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  });
  const motionButton = document.querySelector("#motion");
  let playing = true;
  function updateMotionLabel() {
    motionButton.textContent = playing ? "Tạm dừng" : "Tiếp tục";
    motionButton.setAttribute("aria-pressed", String(!playing));
  }
  updateMotionLabel();
  motionButton.addEventListener("click", () => {
    playing = !playing;
    game.paused = !playing;
    updateMotionLabel();
    needsRender = true;
  });
  document.querySelector("#game-start").addEventListener("click", () => {
    playing = true;
    game.paused = false;
    updateMotionLabel();
  });
  const clock = new THREE.Clock();
  document.addEventListener("visibilitychange", () => {
    clock.getDelta();
    if (document.hidden) environment.persist();
  });
  let time = 0,
    shadowTime = 0;
  const animate = () => {
    const elapsed = clock.getDelta();
    const environmentStart=performance.now();
    environment.update(elapsed, playing);
    const environmentMs=performance.now()-environmentStart;
    const delta = Math.min(elapsed, 0.05);
    const lifeDelta = Math.min(elapsed, 1);
    if (playing) {
      time += lifeDelta;
      life.update(lifeDelta, time);
      expansion.update(lifeDelta, time);
      western.update(time);
    }
    shadowTime += lifeDelta;
    if ((playing || game.active) && shadowTime > quality.settings.shadowInterval) {
      renderer.shadowMap.needsUpdate = true;
      shadowTime = 0;
    }
    const npcStart=performance.now();
    game.update(lifeDelta);
    const npcMs=performance.now()-npcStart;
    if (pov.isLocked && !game.modal) {
      const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
      const right = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
      const speed = ((keys.has("ShiftLeft")||keys.has("ShiftRight")?9:5) * delta) / (Math.hypot(forward, right) || 1);
      const direction = camera.getWorldDirection(new THREE.Vector3());
      direction.y = 0;
      direction.normalize();
      const side = new THREE.Vector3()
        .crossVectors(direction, camera.up)
        .normalize();
      game.movePlayer(
        direction.x * forward * speed + side.x * right * speed,
        direction.z * forward * speed + side.z * right * speed,
      );
    }
    chunks.update(elapsed,quality.level);
    const orbitChanged = orbit.enabled && !pov.isLocked && orbit.update();
    if (
      needsRender ||
      chunks.needsRender ||
      renderer.shadowMap.needsUpdate ||
      pov.isLocked ||
      orbitChanged ||
      playing ||
      (game.active && lifeDelta > 0)
    ) {
      updateFoliageLOD(camera);
      environment.apply();
      const submitStart=performance.now();
      renderer.render(scene, camera);
      quality.sample(elapsed,{environmentMs,npcMs,submitMs:performance.now()-submitStart});
      needsRender = false;
    }
  };
  // Prepare shader programs asynchronously before starting the moving scene,
  // so cold-start compilation does not trap the controls behind GPU work.
  canvas.setAttribute("aria-busy", "true");
  status.textContent = "Đang chuẩn bị ánh sáng và vật liệu…";
  renderer
    .compileAsync(scene, camera)
    .then(() => {
      renderer.render(scene, camera);
      needsRender = false;
      canvas.dataset.ready = "true";
      canvas.setAttribute("aria-busy", "false");
      status.textContent = "ANTELEO · Thành phố, biển & câu cá";
      renderer.setAnimationLoop(animate);
    })
    .catch((error) => {
      canvas.setAttribute("aria-busy", "false");
      status.textContent =
        "Không thể chuẩn bị khung cảnh WebGL. Hãy tải lại trang.";
      console.error(error);
    });
}
