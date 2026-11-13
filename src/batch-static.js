import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** The exterior is static. Bake world transforms and batch by material so that
 * the detailed façades and foliage remain practical on integrated GPUs. Keep
 * transparent glazing separate so Three.js can sort it back to front. */
export function batchStaticScene(scene) {
  scene.updateMatrixWorld(true);
  const opaque = new Map();
  const instances = new Map();
  scene.traverse((object) => {
    if (
      !object.isMesh ||
      Array.isArray(object.material) ||
      object.material.transparent
    )
      return;
    const collection = object.isInstancedMesh ? instances : opaque;
    const key =
      object.material.uuid +
      (object.isInstancedMesh ? object.geometry.uuid : "");
    if (!collection.has(key)) collection.set(key, []);
    collection.get(key).push(object);
  });
  for (const objects of instances.values()) {
    if (objects.length < 2) continue;
    const count = objects.reduce((sum, object) => sum + object.count, 0);
    const batch = new THREE.InstancedMesh(
      objects[0].geometry,
      objects[0].material,
      count,
    );
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    let cursor = 0;
    for (const object of objects) {
      for (let i = 0; i < object.count; i++) {
        object.getMatrixAt(i, matrix);
        matrix.premultiply(object.matrixWorld);
        batch.setMatrixAt(cursor, matrix);
        if (object.instanceColor) {
          object.getColorAt(i, color);
          batch.setColorAt(cursor, color);
        }
        cursor++;
      }
      object.removeFromParent();
      object.dispose();
    }
    batch.castShadow = true;
    batch.computeBoundingSphere();
    scene.add(batch);
  }
  for (const objects of opaque.values()) {
    if (objects.length < 2) continue;
    const geometries = objects.map((object) => {
      const geometry = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      geometry.clearGroups();
      geometry.applyMatrix4(object.matrixWorld);
      return geometry;
    });
    const geometry = mergeGeometries(geometries, false);
    for (const item of geometries) item.dispose();
    if (!geometry) continue;
    const batch = new THREE.Mesh(geometry, objects[0].material);
    batch.castShadow = true;
    batch.receiveShadow = true;
    for (const object of objects) {
      object.removeFromParent();
      object.geometry.dispose();
    }
    scene.add(batch);
  }
}
