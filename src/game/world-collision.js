import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { slide, blocked } from "./collision.js";
export function collectObstacles(scene) {
  scene.updateMatrixWorld(true);
  const shapes = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    let a = o;
    while (a) {
      if (a.userData.dynamic || a.userData.gameSeat) return;
      a = a.parent;
    }
    const type = o.geometry.type;
    if (
      ![
        "RoundedBoxGeometry",
        "BoxGeometry",
        "CylinderGeometry",
        "TubeGeometry",
      ].includes(type)
    )
      return;
    const b = new THREE.Box3().setFromObject(o),
      s = b.getSize(new THREE.Vector3());
    if (b.min.y > 1.95 || b.max.y < 0.55) return;
    if (type.includes("Box")) {
      if (
        (s.y >= 0.55 && Math.max(s.x, s.z) >= 0.12) ||
        (b.min.y > 0.45 && Math.max(s.x, s.z) > 0.7 && Math.min(s.x, s.z) > 0.3)
      )
        shapes.push({
          minX: b.min.x,
          maxX: b.max.x,
          minZ: b.min.z,
          maxZ: b.max.z,
        });
    } else if (
      b.min.y < 0.6 &&
      s.y > 0.8 &&
      Math.max(s.x, s.z) < 2.5 &&
      Math.min(s.x, s.z) > 0.13
    )
      shapes.push({
        kind: "circle",
        x: (b.min.x + b.max.x) / 2,
        z: (b.min.z + b.max.z) / 2,
        radius: Math.max(s.x, s.z) / 2,
      });
  });
  return shapes;
}
export function createPlayerCollision(obstacles, getDynamic, floorAt) {
  const boundaries = [
    { minX: 66, maxX: 2000, minZ: -2000, maxZ: 9 },
    { minX: 66, maxX: 2000, minZ: 15, maxZ: 2000 },
    { minX: 88, maxX: 2000, minZ: 9, maxZ: 15 },
  ];
  const capsule = new Capsule(
    new THREE.Vector3(0, 0.5, 0),
    new THREE.Vector3(0, 1.6, 0),
    0.28,
  );
  return {
    capsule,
    move(camera, dx, dz) {
      const range = Math.hypot(dx, dz) + 1;
      const nearby = [...obstacles, ...boundaries, ...getDynamic()].filter(
        (b) =>
          b.kind === "circle"
            ? Math.hypot(b.x - camera.position.x, b.z - camera.position.z) <
              range + b.radius
            : b.maxX > camera.position.x - range &&
              b.minX < camera.position.x + range &&
              b.maxZ > camera.position.z - range &&
              b.minZ < camera.position.z + range,
      );
      const p = slide(camera.position, dx, dz, 0.28, nearby);
      p.x = Math.max(-63, Math.min(87.72, p.x));
      p.z = Math.max(-98, Math.min(46, p.z));
      camera.position.set(p.x, floorAt(p) + 1.65, p.z);
      capsule.start.set(p.x, floorAt(p) + 0.28, p.z);
      capsule.end.set(p.x, floorAt(p) + 1.37, p.z);
    },
    safe(p) {
      return !blocked(p, 0.28, [...obstacles, ...boundaries, ...getDynamic()]);
    },
  };
}
