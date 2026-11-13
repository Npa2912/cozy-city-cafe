import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { batchStaticScene } from "../src/batch-static.js";
test("static batching preserves movable descendants in the van/NPC hierarchy", () => {
  const scene = new THREE.Scene(),
    actor = new THREE.Group();
  actor.userData.dynamic = true;
  scene.add(actor);
  const joint = new THREE.Group();
  actor.add(joint);
  const material = new THREE.MeshStandardMaterial();
  const wheel = new THREE.Mesh(new THREE.BoxGeometry(), material);
  joint.add(wheel);
  for (let i = 0; i < 2; i++) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(), material);
    wall.position.x = i * 3;
    scene.add(wall);
  }
  batchStaticScene(scene);
  assert.equal(wheel.parent, joint);
  assert.equal(joint.parent, actor);
  actor.position.z = 15;
  scene.updateMatrixWorld(true);
  assert.equal(wheel.getWorldPosition(new THREE.Vector3()).z, 15);
  assert.equal(scene.children.filter((o) => o.isMesh).length, 1);
});
test("distant city blocks retain separate culling bounds", () => {
  const scene = new THREE.Scene(),
    material = new THREE.MeshStandardMaterial();
  for (const x of [0, 2, 64, 66]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    mesh.position.x = x;
    scene.add(mesh);
  }
  batchStaticScene(scene);
  const batches = scene.children.filter((o) => o.isMesh);
  assert.equal(batches.length, 2);
  for (const mesh of batches) {
    mesh.geometry.computeBoundingSphere();
    assert(mesh.geometry.boundingSphere.radius < 3);
  }
});
