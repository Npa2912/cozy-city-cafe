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
  const lastPosition=new THREE.Vector3(Infinity,Infinity,Infinity);let lastScale=0;
  return (camera, scale=1) => {
    if(lastPosition.distanceToSquared(camera.position)<.25 && lastScale===scale)return;
    lastPosition.copy(camera.position);lastScale=scale;
    for (const batch of batches) {
      const distance = batch.center.distanceTo(camera.position) - batch.radius;
      batch.object.geometry =
        distance > 80*scale ? far : distance > 35*scale ? medium : batch.high;
    }
  };
}
