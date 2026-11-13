import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createFoliageLOD } from "../src/foliage-lod.js";
test("distant foliage reduces tessellation without replacing positions, colors or near detail", () => {
  const scene = new THREE.Scene(),
    high = new THREE.SphereGeometry(1, 10, 7),
    material = new THREE.MeshStandardMaterial();
  const plant = new THREE.InstancedMesh(high, material, 2);
  plant.setMatrixAt(0, new THREE.Matrix4().makeTranslation(100, 0, 0));
  plant.setMatrixAt(1, new THREE.Matrix4().makeTranslation(101, 0, 0));
  plant.setColorAt(0, new THREE.Color("#6e9e4b"));
  plant.setColorAt(1, new THREE.Color("#e6a8bc"));
  scene.add(plant);
  const transform = Array.from(plant.instanceMatrix.array),
    colors = Array.from(plant.instanceColor.array),
    camera = new THREE.PerspectiveCamera();
  const update = createFoliageLOD(scene);
  update(camera);
  assert(
    plant.geometry.attributes.position.count < high.attributes.position.count,
  );
  camera.position.set(100, 2, 2);
  update(camera);
  assert.equal(plant.geometry, high);
  assert.deepEqual(Array.from(plant.instanceMatrix.array), transform);
  assert.deepEqual(Array.from(plant.instanceColor.array), colors);
  assert.equal(plant.material, material);
});
