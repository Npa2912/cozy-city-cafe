import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import "./style.css";
import { buildStreet } from "./street.js";
import { refineStreet } from "./refinement.js";
import { buildLife } from "./life.js";
import { batchStaticScene } from "./batch-static.js";

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
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#269add");
  scene.fog = new THREE.Fog("#b9d5df", 52, 135);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 240);
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.maxPolarAngle = Math.PI * 0.56;
  orbit.minDistance = 3;
  orbit.maxDistance = 65;
  const pov = new PointerLockControls(camera, canvas);
  const keys = new Set();
  const views = {
    overview: { position: [13.8, 11.8, 19.5], target: [-4, 4.8, -10], fov: 57 },
    flowers: { position: [12, 3.2, 14.5], target: [-4, 4.6, -8], fov: 60 },
    street: { position: [10.8, 1.9, 5.8], target: [-3.8, 3.2, -8], fov: 65 },
    counter: { position: [-4.2, 2.2, -6.5], target: [-7.3, 2.25, 0], fov: 65 },
  };
  let selectedView = "overview";
  const orbitButton = document.querySelector("#orbit");
  const povButton = document.querySelector("#pov");
  const help = document.querySelector("#help");
  function setMode(walking) {
    orbit.enabled = !walking;
    orbitButton.setAttribute("aria-pressed", String(!walking));
    povButton.setAttribute("aria-pressed", String(walking));
    help.textContent = walking
      ? "WASD để di chuyển · Chuột để nhìn · Esc để thoát"
      : "Kéo để xoay · Cuộn để thu phóng · Chuột phải để dịch chuyển";
    keys.clear();
  }
  let needsRender = true;
  let returnToReference = false;
  function reset(view = "overview") {
    if (document.pointerLockElement === canvas) {
      returnToReference = true;
      pov.unlock();
      return;
    }
    orbit.enableDamping = false;
    orbit.update();
    setMode(false);
    selectedView = typeof view === "string" ? view : "overview";
    const preset = views[selectedView];
    camera.position.fromArray(preset.position);
    orbit.target.fromArray(preset.target);
    document.querySelector("#view").value = selectedView;
    camera.fov = innerWidth < 700 ? 75 : preset.fov;
    camera.updateProjectionMatrix();
    orbit.update();
    orbit.enableDamping = true;
    needsRender = true;
  }
  reset();
  scene.add(new THREE.HemisphereLight(0xd6efff, 0xc1b398, 1.65));
  const sun = new THREE.DirectionalLight(0xffedc4, 3.8);
  sun.position.set(22, 35, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -45,
    right: 45,
    top: 45,
    bottom: -45,
    far: 130,
  });
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const district = buildStreet(scene);
  refineStreet(scene, district);
  const life = buildLife(scene, district);
  life.update(0, 0);
  scene.traverse((object) => {
    if (
      object.isMesh &&
      !Array.isArray(object.material) &&
      object.material.transparent
    )
      object.castShadow = false;
  });
  batchStaticScene(scene);
  status.textContent = "ANTELEO · Cà phê, trà sữa & phố hoa";
  document
    .querySelector("#view")
    .addEventListener("change", (event) => reset(event.target.value));
  orbitButton.addEventListener("click", () => pov.unlock());
  povButton.addEventListener("click", () => {
    pov.lock();
  });
  pov.addEventListener("lock", () => {
    camera.position.y = 1.9;
    setMode(true);
  });
  document.addEventListener("pointerlockerror", () => {
    status.textContent = "Cho phép khóa chuột để dùng POV WASD.";
  });
  pov.addEventListener("unlock", () => {
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
    if (pov.isLocked && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => keys.clear());
  function resize() {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.fov = innerWidth < 700 ? 75 : views[selectedView].fov;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  window.addEventListener("resize", resize);
  resize();
  document.querySelector("#capture").addEventListener("click", () => {
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
    updateMotionLabel();
    needsRender = true;
  });
  const clock = new THREE.Clock();
  let time = 0,
    shadowTime = 0;
  const animate = () => {
    const elapsed = clock.getDelta();
    const delta = Math.min(elapsed, 0.05);
    const lifeDelta = Math.min(elapsed, 1);
    if (playing) {
      time += lifeDelta;
      life.update(lifeDelta, time);
    }
    shadowTime += lifeDelta;
    if (playing && shadowTime > 0.033) {
      renderer.shadowMap.needsUpdate = true;
      shadowTime = 0;
    }
    if (pov.isLocked) {
      const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
      const right = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
      const speed = (5 * delta) / (Math.hypot(forward, right) || 1);
      pov.moveForward(forward * speed);
      pov.moveRight(right * speed);
      camera.position.y = 1.9;
    }
    const orbitChanged = !pov.isLocked && orbit.update();
    if (needsRender || pov.isLocked || orbitChanged || playing) {
      renderer.render(scene, camera);
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
      canvas.dataset.ready = "true";
      canvas.setAttribute("aria-busy", "false");
      status.textContent = "ANTELEO · Cà phê, trà sữa & phố hoa";
      renderer.setAnimationLoop(animate);
    })
    .catch((error) => {
      canvas.setAttribute("aria-busy", "false");
      status.textContent =
        "Không thể chuẩn bị khung cảnh WebGL. Hãy tải lại trang.";
      console.error(error);
    });
}
