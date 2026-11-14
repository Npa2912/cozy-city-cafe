import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  group,
  box,
  cylinder,
  sphere,
  rod,
  tube,
  torus,
  mat,
  label,
} from "./street.js";
import { WALK_ROUTES, sampleWalk } from "./pedestrians.js";
import { createTrafficController } from "./traffic.js";

function batchRigidParts(root) {
  for (const child of [...root.children])
    if (child.isGroup) batchRigidParts(child);
  const buckets = new Map();
  for (const child of root.children) {
    if (
      !child.isMesh ||
      child.isInstancedMesh ||
      Array.isArray(child.material) ||
      child.material.transparent
    )
      continue;
    if (!buckets.has(child.material)) buckets.set(child.material, []);
    buckets.get(child.material).push(child);
  }
  for (const [material, objects] of buckets) {
    if (objects.length < 2) continue;
    const parts = objects.map((object) => {
      object.updateMatrix();
      const geo = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      geo.clearGroups();
      geo.applyMatrix4(object.matrix);
      return geo;
    });
    const geo = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    if (!geo) continue;
    const merged = new THREE.Mesh(geo, material);
    merged.castShadow = true;
    merged.receiveShadow = true;
    root.add(merged);
    objects.forEach((object) => {
      object.removeFromParent();
      if (!object.geometry.userData.sharedPrimitive) object.geometry.dispose();
    });
  }
}
function buildVan(scene) {
  const g = group(scene, 2, -0.04, -12);
  g.userData.dynamic = true;
  g.name = "animated-cafe-van";
  box(g, 0, 0.89, 0, 2.03, 1.22, 3.6, "#87c9bf", 0.28);
  box(g, 0, 1.69, -0.12, 2.0, 1.25, 3.23, "#fff1d7", 0.27);
  box(g, 0, 2.31, -0.18, 1.96, 0.14, 3.12, "#f5e6ce", 0.1);
  box(g, 0, 2.43, -0.45, 0.76, 0.14, 0.58, "#d8d6c9", 0.07);
  // Wraparound split windshield; cream pillars, wipers and metallic edging.
  for (const xx of [-0.46, 0.46]) {
    box(
      g,
      xx,
      1.76,
      1.51,
      0.81,
      0.82,
      0.055,
      mat("#608d9c", { metalness: 0.25, roughness: 0.18 }),
      0.11,
    );
    const shine = box(
      g,
      xx - 0.1,
      1.9,
      1.55,
      0.07,
      0.5,
      0.018,
      "#c6e5d8",
      0.01,
    );
    shine.rotation.z = -0.25;
    rod(g, [xx - 0.23, 1.43, 1.57], [xx + 0.2, 1.49, 1.57], 0.025, "#414c50");
  }
  box(g, 0, 1.76, 1.56, 0.075, 0.89, 0.055, "#eddfc3", 0.02);
  box(g, 0, 1.12, 1.82, 1.92, 0.46, 0.1, "#f4e7ce", 0.14);
  for (const xx of [-0.76, 0.76]) {
    const rim = cylinder(g, xx, 1.12, 1.91, 0.2, 0.2, 0.06, "#c8b991");
    rim.rotation.x = Math.PI / 2;
    const lamp = cylinder(
      g,
      xx,
      1.12,
      1.95,
      0.15,
      0.15,
      0.04,
      mat("#fff3ac", { emissive: "#ffd25a", emissiveIntensity: 1 }),
    );
    lamp.rotation.x = Math.PI / 2;
    box(g, xx, 0.82, 1.84, 0.15, 0.1, 0.03, "#edab48");
  }
  box(g, 0, 0.73, 1.87, 1.85, 0.15, 0.12, "#aeb5af", 0.06);
  box(g, 0, 0.94, 1.91, 0.55, 0.2, 0.025, "#667575", 0.025);
  for (let i = 0; i < 5; i++)
    box(g, -0.22 + i * 0.11, 0.95, 1.93, 0.035, 0.12, 0.018, "#cbd0c3", 0.005);
  label(g, "CAFE 01", 0, 0.71, 1.95, 0.52, 0.13, "#49534e", "#efd787");
  const wheels = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++)
      box(
        g,
        side * 1.015,
        1.75,
        0.96 - i * 0.98,
        0.035,
        0.73,
        0.82,
        mat("#7aacae", { roughness: 0.18, metalness: 0.2 }),
        0.08,
      );
    box(g, side * 1.04, 1.17, -0.2, 0.035, 0.9, 1.75, "#83c4b9", 0.08);
    for (const zz of [-0.95, 0.82])
      rod(
        g,
        [side * 1.062, 0.94, zz],
        [side * 1.062, 2.11, zz],
        0.015,
        "#e7e5cb",
      );
    box(g, side * 1.085, 1.32, 0.46, 0.045, 0.07, 0.22, "#d3d8ca", 0.025);
    const mirror = group(g, side * 1.21, 1.62, 1.16);
    rod(mirror, [-side * 0.2, 0, 0], [0, 0, 0.12], 0.03, "#657c7a");
    box(mirror, 0, 0.04, 0.12, 0.13, 0.28, 0.19, "#e8e3cd", 0.04);
    for (const zz of [-1.14, 1.12]) {
      const pivot = group(g, side * 1.0, 0.41, zz);
      const tire = cylinder(pivot, 0, 0, 0, 0.39, 0.39, 0.24, "#354046", 32);
      tire.rotation.z = Math.PI / 2;
      const hub = cylinder(
        pivot,
        side * 0.13,
        0,
        0,
        0.23,
        0.23,
        0.03,
        "#d2d3c5",
      );
      hub.rotation.z = Math.PI / 2;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        sphere(
          pivot,
          side * 0.15,
          Math.sin(a) * 0.16,
          Math.cos(a) * 0.16,
          0.025,
          0.025,
          0.025,
          "#7d8f91",
        );
      }
      wheels.push(pivot);
    }
    box(g, side * 0.77, 1.1, -1.82, 0.17, 0.39, 0.04, "#bd6968", 0.06);
  }
  batchRigidParts(g);
  return { g, wheels };
}
function person(
  scene,
  {
    x,
    z,
    color = "#a3c9d7",
    skirt = false,
    hair = "#493632",
    hat = false,
    scale = 1,
    heading = 0,
  },
) {
  const g = group(scene, x, 0.16, z, heading);
  g.scale.setScalar(scale);
  g.userData.dynamic = true;
  const skin = "#f4c8a8",
    limbs = [];
  // Rounded doll proportions with modeled hair strands, ears, cheeks and eye highlights.
  const torso = meshTorso(g, color, skirt);
  sphere(g, 0, 1.47, 0, 0.31, 0.35, 0.28, skin);
  sphere(g, 0, 1.59, -0.065, 0.33, 0.28, 0.28, hair);
  for (let i = 0; i < 8; i++) {
    const a = (i / 7 - 0.5) * 2;
    const curl = sphere(
      g,
      Math.sin(a) * 0.28,
      1.65 - Math.abs(a) * 0.13,
      0.19 + Math.cos(a) * 0.055,
      0.085,
      0.13,
      0.075,
      hair,
    );
    curl.rotation.z = -a * 0.4;
  }
  for (const side of [-1, 1]) {
    sphere(g, side * 0.3, 1.47, 0, 0.06, 0.085, 0.055, skin);
    sphere(g, side * 0.112, 1.48, 0.257, 0.041, 0.06, 0.021, "#3e3231");
    sphere(g, side * 0.104, 1.5, 0.276, 0.012, 0.017, 0.009, "#fff5e3");
    sphere(g, side * 0.186, 1.39, 0.243, 0.055, 0.022, 0.012, "#e5a699");
    tube(
      g,
      [
        [side * 0.075, 1.59, 0.263],
        [side * 0.11, 1.61, 0.265],
        [side * 0.145, 1.59, 0.26],
      ],
      0.012,
      hair,
    );
    const arm = group(g, side * 0.235, 1.16, 0);
    cylinder(arm, 0, -0.13, 0, 0.09, 0.085, 0.3, color, 16);
    sphere(arm, 0, -0.29, 0, 0.075, 0.14, 0.075, skin);
    sphere(arm, 0, -0.43, 0, 0.08, 0.075, 0.08, skin);
    limbs.push(arm);
    const leg = group(g, side * 0.105, 0.64, 0);
    cylinder(leg, 0, -0.2, 0, 0.075, 0.067, 0.43, skirt ? skin : "#596b7e", 16);
    cylinder(leg, 0, -0.39, 0, 0.073, 0.07, 0.15, "#f4eddd", 16);
    sphere(leg, 0, -0.5, 0.06, 0.1, 0.07, 0.16, "#765447");
    limbs.push(leg);
  }
  sphere(g, 0, 1.44, 0.282, 0.032, 0.04, 0.035, skin);
  tube(
    g,
    [
      [-0.045, 1.356, 0.256],
      [0, 1.345, 0.272],
      [0.045, 1.356, 0.256],
    ],
    0.01,
    "#b16e66",
  );
  if (skirt) {
    for (const side of [-1, 1]) {
      sphere(g, side * 0.29, 1.28, -0.11, 0.09, 0.24, 0.09, hair);
    }
    tube(
      g,
      [
        [-0.16, 1.24, -0.22],
        [-0.12, 0.9, -0.23],
        [0.13, 0.8, 0.05],
      ],
      0.025,
      "#c49864",
    );
    box(g, 0.2, 0.84, 0.12, 0.17, 0.23, 0.09, "#bb8b55", 0.05);
  } else {
    box(g, 0, 1.01, -0.18, 0.34, 0.4, 0.16, "#667c86", 0.09);
    for (const side of [-1, 1])
      tube(
        g,
        [
          [side * 0.17, 0.92, -0.22],
          [side * 0.17, 1.23, -0.08],
          [side * 0.17, 0.98, 0.15],
        ],
        0.022,
        "#b8c7bb",
      );
  }
  if (hat) {
    cylinder(g, 0, 1.81, 0, 0.4, 0.4, 0.05, "#e8cc88");
    cylinder(g, 0, 1.9, 0, 0.25, 0.29, 0.19, "#e8cc88");
    cylinder(g, 0, 1.83, 0, 0.278, 0.278, 0.055, "#907958");
  }
  batchRigidParts(g);
  return { g, limbs };
}
function meshTorso(g, color, skirt) {
  sphere(g, 0, 1.02, 0, 0.22, 0.32, 0.14, color);
  if (skirt) cylinder(g, 0, 0.69, 0, 0.17, 0.3, 0.28, color, 32);
  else box(g, 0, 0.72, 0, 0.35, 0.2, 0.24, "#596b7e", 0.07);
}
export function buildLife(scene, { cafe }) {
  const traffic = createTrafficController(),
    van = buildVan(scene);
  const walkers = WALK_ROUTES.map((config, i) => {
    const initial = sampleWalk(0, config, i * 1.6);
    return {
      ...person(scene, { ...config, z: initial.z, heading: initial.heading }),
      route: config,
      phase: i * 1.6,
    };
  });
  const shopper = person(scene, {
    x: 12.8,
    z: 7.8,
    color: "#edc587",
    skirt: true,
    heading: Math.PI / 2,
    hair: "#61473a",
  });
  const friend = person(scene, {
    x: -3.5,
    z: 10.3,
    color: "#d9a2a4",
    skirt: true,
    heading: -Math.PI / 2,
    scale: 0.9,
  });
  const paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    van: van.g,
    update(dt, time) {
      // The van never waits longer than 1.6 seconds; pause is an explicit short state.
      let pose = traffic.update(0);
      for (let left = dt; left > 0; left -= 0.05)
        pose = traffic.update(Math.min(left, 0.05));
      van.g.position.set(pose.x, -0.04, pose.z);
      van.g.rotation.y = pose.heading;
      for (const wheel of van.wheels) wheel.rotation.x = pose.distance / 0.39;
      for (const [i, p] of walkers.entries()) {
        const pose = sampleWalk(time, p.route, p.phase);
        p.g.position.z = pose.z;
        const turn = Math.atan2(
          Math.sin(pose.heading - p.g.rotation.y),
          Math.cos(pose.heading - p.g.rotation.y),
        );
        p.g.rotation.y += turn * Math.min(1, dt * 4);
        const stride = !paused ? Math.sin(time * 5 + i) * 0.4 * pose.stride : 0;
        p.limbs.forEach((limb, j) => {
          limb.rotation.x = stride * [1, -1, -1, 1][j];
        });
        p.g.position.y =
          0.16 +
          (!paused
            ? Math.abs(Math.sin(time * 5 + i)) * 0.025 * pose.stride
            : 0);
      }
      if (!paused) {
        shopper.g.rotation.y = Math.PI / 2 + Math.sin(time * 0.5) * 0.08;
        friend.g.rotation.y = -Math.PI / 2 + Math.sin(time * 0.4) * 0.12;
      }
      return pose;
    },
  };
}

export { person, batchRigidParts };
