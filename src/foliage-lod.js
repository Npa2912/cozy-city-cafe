import * as THREE from "three";

// Only tiny instanced leaves/petals change tessellation with distance. All
// instance transforms, colors, stems, branches and architecture are retained.
// Approaching a planter or tree restores its original geometry automatically.
export function createFoliageLOD(scene) {
  scene.updateMatrixWorld(true);
  const medium = new THREE.SphereGeometry(1, 6, 4),
    far = new THREE.SphereGeometry(1, 4, 3),
    batches = [];
  scene.traverse((object) => {
    if (
      !object.isInstancedMesh ||
      object.geometry.type !== "SphereGeometry" ||
      object.geometry.parameters.radius !== 1
    )
      return;
    if (!object.boundingSphere) object.computeBoundingSphere();
    const sphere = object.boundingSphere
      .clone()
      .applyMatrix4(object.matrixWorld);
    batches.push({
      object,
      high: object.geometry,
      center: sphere.center,
      radius: sphere.radius,
    });
  });
  return (camera) => {
    for (const batch of batches) {
      const distance = batch.center.distanceTo(camera.position) - batch.radius;
      batch.object.geometry =
        distance > 80 ? far : distance > 35 ? medium : batch.high;
    }
  };
}
