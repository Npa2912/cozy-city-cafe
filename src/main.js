import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import "./style.css";
import { buildStreet } from "./street.js";
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
  const initialPosition = new THREE.Vector3(14, 3.7, 13);
  const initialTarget = new THREE.Vector3(-4, 5.4, -10);
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
  function reset() {
    if (document.pointerLockElement === canvas) {
      returnToReference = true;
      pov.unlock();
      return;
    }
    orbit.enableDamping = false;
    orbit.update();
    setMode(false);
    camera.position.copy(initialPosition);
    orbit.target.copy(initialTarget);
    camera.fov = innerWidth < 700 ? 75 : 58;
    camera.updateProjectionMatrix();
    orbit.update();
    orbit.enableDamping = true;
    needsRender = true;
  }
  reset();
  scene.add(new THREE.HemisphereLight(0xd6efff, 0xc1b398, 2.2));
  const sun = new THREE.DirectionalLight(0xffe4b5, 3);
  sun.position.set(-20, 35, 18);
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
  buildStreet(scene);
  batchStaticScene(scene);
  status.textContent = "Ngoại cảnh · Reference study";
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
    camera.fov = innerWidth < 700 ? 75 : 58;
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
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    if (pov.isLocked) {
      const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
      const right = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
      const speed = (5 * delta) / (Math.hypot(forward, right) || 1);
      pov.moveForward(forward * speed);
      pov.moveRight(right * speed);
      camera.position.y = 1.9;
    }
    const orbitChanged = !pov.isLocked && orbit.update();
    if (needsRender || pov.isLocked || orbitChanged) {
      renderer.render(scene, camera);
      needsRender = false;
    }
  });
}
