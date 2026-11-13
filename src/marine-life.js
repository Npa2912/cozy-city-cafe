import * as THREE from "three";
import { mat, mesh, sphere, group, torus } from "./street.js";
import { batchRigidParts } from "./life.js";
import { sampleFish, sampleJump } from "./marine-motion.js";
function fin(parent, points, color) {
  const shape = new THREE.Shape();
  shape.moveTo(...points[0]);
  for (const p of points.slice(1))
    shape.quadraticCurveTo(p[0], p[1], p[2] ?? p[0], p[3] ?? p[1]);
  shape.closePath();
  return mesh(
    parent,
    new THREE.ShapeGeometry(shape, 12),
    mat(color, { side: THREE.DoubleSide }),
  );
}
function fish(scene, index) {
  const g = group(scene);
  g.userData.dynamic = true;
  g.name = "coastal-fish-" + index;
  const color = ["#e6b25b", "#76b9ad", "#e0a59a"][index % 3];
  sphere(g, 0, 0, 0, 0.34, 0.14, 0.11, color);
  sphere(g, 0.08, -0.035, 0, 0.2, 0.07, 0.105, "#f1ddaa");
  const tail = group(g, -0.29, 0, 0);
  fin(
    tail,
    [
      [0, 0],
      [-0.25, 0.2],
      [-0.22, 0],
      [-0.25, -0.2],
    ],
    color,
  );
  fin(
    g,
    [
      [-0.12, 0.08],
      [-0.14, 0.26],
      [0.14, 0.13],
    ],
    color,
  );
  const pectoral = fin(
    g,
    [
      [0.09, -0.02],
      [-0.09, -0.18],
      [-0.11, 0.03],
    ],
    "#e8ce9a",
  );
  pectoral.rotation.x = 0.8;
  for (const side of [-1, 1]) {
    sphere(g, 0.21, 0.045, side * 0.092, 0.048, 0.05, 0.02, "#f7e7c5");
    sphere(g, 0.225, 0.05, side * 0.11, 0.024, 0.027, 0.008, "#293f40");
  }
  batchRigidParts(g);
  return { g, tail };
}
export function buildMarineLife(scene) {
  const school = Array.from({ length: 18 }, (_, i) => fish(scene, i));
  const jumpers = [fish(scene, 18), fish(scene, 19)];
  const rings = jumpers.map(() => {
    const material = new THREE.MeshBasicMaterial({
      color: "#e9ffff",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const ring = torus(scene, 0, -0.58, 0, 0.7, 0.024, material);
    ring.rotation.x = Math.PI / 2;
    ring.userData.dynamic = true;
    ring.castShadow = false;
    return ring;
  });
  return {
    update(time) {
      school.forEach(({ g, tail }, i) => {
        const p = sampleFish(time, i);
        g.position.set(p.x, p.y, p.z);
        g.rotation.y = p.heading;
        tail.rotation.y = p.tail;
      });
      jumpers.forEach(({ g, tail }, i) => {
        const p = sampleJump(time, i);
        g.visible = p.active;
        g.position.set(p.x, p.y, p.z);
        g.rotation.set(0, 0, p.pitch);
        tail.rotation.y = Math.sin(time * 10) * 0.3;
        const ring = rings[i];
        ring.visible = p.splash;
        ring.position.set(74.1, -0.57, p.z);
        ring.scale.setScalar(0.3 + p.splashAge * 1.25);
        ring.material.opacity = p.splash ? (1 - p.splashAge / 0.85) * 0.6 : 0;
      });
    },
  };
}
