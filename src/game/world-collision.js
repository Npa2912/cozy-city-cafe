import { forbiddenWater, BRIDGES, FOUNTAINS } from "../western-plan.js";
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
    ...BRIDGES.flatMap(b=>[-1,1].map(side=>({minX:b.minX,maxX:b.maxX,minZ:b.z+side*b.width/2-.06,maxZ:b.z+side*b.width/2+.06}))),
    ...FOUNTAINS.map(f=>({kind:"circle",x:f.x,z:f.z,radius:1.95})),
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
      let p={x:camera.position.x,z:camera.position.z};
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));
      for(let i=0;i<steps;i++){const next=slide(p,dx/steps,dz/steps,.28,nearby);if(!forbiddenWater(next))p=next;else{const px=slide(p,dx/steps,0,.28,nearby),pz=slide(p,0,dz/steps,.28,nearby);if(!forbiddenWater(px))p=px;else if(!forbiddenWater(pz))p=pz;}}
      p.x = Math.max(-144.72, Math.min(87.72, p.x));
      p.z = Math.max(-107.72, Math.min(51.72, p.z));
      camera.position.set(p.x, floorAt(p) + 1.65, p.z);
      capsule.start.set(p.x, floorAt(p) + 0.28, p.z);
      capsule.end.set(p.x, floorAt(p) + 1.37, p.z);
    },
    safe(p) {
      return !forbiddenWater(p) && !blocked(p, 0.28, [...obstacles, ...boundaries, ...getDynamic()]);
    },
  };
}
