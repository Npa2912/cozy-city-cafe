import * as THREE from "three";
import {
  mat,
  mesh,
  box,
  cylinder,
  sphere,
  rod,
  tube,
  torus,
  group,
  artwork,
  label,
  arch,
  archedWindow,
  tiledRoof,
  foliage,
  vine,
  pot,
  bench,
  lamp,
  umbrella,
} from "./street.js";
import {
  withFlowers,
  flowerBox,
  bouquetBucket,
  tree,
  table,
  chair,
  lantern,
  chalkboard,
} from "./refinement.js";
import { person, batchRigidParts } from "./life.js";
import { sampleWalk } from "./pedestrians.js";
import { buildCafeAnnex } from "./cafe-annex.js";
import { buildSea } from "./sea.js";
import { URBAN_PLAN as P } from "./urban-plan.js";
let seed = 9143;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const palmLeaf = new THREE.SphereGeometry(1, 10, 6);
function palm(scene, x, z, h = 7.5, baseY = 0.23) {
  const g = group(scene, x, baseY, z),
    topX = h * 0.08;
  tube(
    g,
    [
      [0, 0, 0],
      [-0.08, h * 0.35, 0.1],
      [topX * 0.5, h * 0.7, 0.05],
      [topX, h, 0],
    ],
    0.16,
    "#a48b60",
  );
  for (let i = 0; i < h / 0.4; i++) {
    const y = i * 0.4,
      xx = ((y * y) / (h * h)) * topX;
    const ring = torus(g, xx, y, 0, 0.165, 0.016, "#8d7855");
    ring.rotation.x = Math.PI / 2;
  }
  const leaves = new THREE.InstancedMesh(palmLeaf, mat("#7eae53"), 108),
    o = new THREE.Object3D();
  let index = 0;
  for (let f = 0; f < 9; f++) {
    const a = f * 2.399,
      dx = Math.cos(a),
      dz = Math.sin(a);
    tube(
      g,
      [
        [topX, h, 0],
        [topX + dx * 0.9, h + 0.55, dz * 0.9],
        [topX + dx * 1.8, h + 0.12, dz * 1.8],
        [topX + dx * 2.6, h - 0.62, dz * 2.6],
      ],
      0.028,
      "#93b958",
    );
    for (let j = 0; j < 6; j++)
      for (const side of [-1, 1]) {
        const r = 0.5 + j * 0.33,
          w = (1 - j / 8) * 0.57;
        o.position.set(
          topX + dx * r + Math.cos(a + Math.PI / 2) * side * w * 0.45,
          h + 0.4 - (r / 2.6) ** 2 * 0.95,
          dz * r + Math.sin(a + Math.PI / 2) * side * w * 0.45,
        );
        o.rotation.set(-0.1, a + side * 0.7, side * 0.1);
        o.scale.set(0.16, 0.028, w);
        o.updateMatrix();
        leaves.setMatrixAt(index++, o.matrix);
      }
  }
  leaves.castShadow = true;
  g.add(leaves);
  for (let i = 0; i < 3; i++)
    sphere(
      g,
      topX + Math.cos(i * 2) * 0.22,
      h - 0.12,
      Math.sin(i * 2) * 0.22,
      0.16,
      0.2,
      0.16,
      "#9c895b",
    );
  const rim = torus(g, 0, 0.09, 0, 0.7, 0.07, "#c8b693");
  rim.rotation.x = Math.PI / 2;
  cylinder(g, 0, 0.05, 0, 0.65, 0.65, 0.1, "#897b58");
}
function paving() {
  const t = artwork(
    (c, W, H) => {
      c.fillStyle = "#bba895";
      c.fillRect(0, 0, W, H);
      for (let y = 0; y < 12; y++)
        for (let x = -1; x < 10; x++) {
          c.fillStyle = ["#dab6a1", "#d0aa9c", "#e1c1aa", "#c8b1a6"][
            Math.floor(random() * 4)
          ];
          c.beginPath();
          c.roundRect(x * 58 + (y % 2) * 29 + 2, y * 43 + 2, 54, 39, 5);
          c.fill();
          c.strokeStyle = "#ecd2bd";
          c.lineWidth = 1;
          c.stroke();
        }
    },
    512,
    512,
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function paved(scene, x, z, w, d, texture) {
  const map = texture.clone();
  map.repeat.set(w / 5, d / 5);
  map.needsUpdate = true;
  return box(scene, x, 0.08, z, w, 0.3, d, mat("#fff", { map }), 0.04);
}
function townHouse(scene, x, z, color, rotation = 0, sign = "") {
  const g = group(scene, x, 0, z, rotation),
    w = 6.5,
    d = 5.2;
  box(g, 0, 3.65, -d / 2, w, 7.3, d, color, 0.22);
  box(g, 0, 0.5, 0.1, w, 0.65, 0.2, "#d4c09f", 0.06);
  box(g, 0, 3.65, 0.1, w + 0.2, 0.25, 0.3, "#e9d8b5", 0.07);
  archedWindow(g, -1.7, 0.25, 0.06, 2.0, 3.0);
  archedWindow(g, 1.65, 0.25, 0.06, 2.0, 3.0);
  for (const xx of [-1.8, 1.8]) {
    archedWindow(g, xx, 4.05, 0.07, 1.65, 2.35);
    box(g, xx, 3.97, 0.5, 2.25, 0.16, 1.2, "#b9c5ad", 0.12);
    for (let i = 0; i < 6; i++)
      rod(
        g,
        [xx - 0.95 + i * 0.38, 4.06, 1.02],
        [xx - 0.95 + i * 0.38, 4.8, 1.02],
        0.022,
        "#698e7d",
      );
    rod(g, [xx - 1.03, 4.8, 1.02], [xx + 1.03, 4.8, 1.02], 0.035, "#6d9180");
    flowerBox(g, xx, 4.01, 0.72, 1.42, 0.45, true);
  }
  for (const side of [-1, 1]) {
    const wall = group(
      g,
      side * (w / 2 + 0.025),
      0,
      -2.6,
      (side * Math.PI) / 2,
    );
    for (const y of [0.35, 4.05])
      for (const xx of [-1.25, 1.25])
        archedWindow(wall, xx, y, 0.0, 1.45, y < 1 ? 2.8 : 2.35);
  }
  const back = group(g, 0, 0, -d - 0.04, Math.PI);
  for (const y of [0.35, 4.05])
    for (const xx of [-1.7, 1.7])
      archedWindow(back, xx, y, 0, 1.8, y < 1 ? 2.8 : 2.35);
  tiledRoof(g, 0, 7.42, -2.5, 7.1, 6.25);
  for (const xx of [-2.2, 0, 2.2]) {
    foliage(g, xx, 7.75, -1.6, 0.48, 30);
    vine(g, xx, 7.65, 0.55, 1.4);
  }
  if (sign)
    label(
      g,
      sign,
      0,
      3.37,
      0.31,
      4.8,
      0.45,
      "#fff0c8",
      "#568674",
      "italic bold 77px serif",
    );
  lantern(g, -2.9, 2.8, 0.46, 1.1);
  lantern(g, 2.9, 2.8, 0.46, 1.1);
  return g;
}
function seasideKiosk(scene) {
  const g = group(scene, 56, 0, 10);
  box(g, 0, 1.95, -2.1, 5, 3.9, 4.5, "#79a58e", 0.18);
  box(g, 0, 3.88, -2.1, 5.3, 0.18, 4.7, "#ead7ae", 0.09);
  for (const x of [-1.65, 0, 1.65]) archedWindow(g, x, 0.28, 0.2, 1.42, 3.0);
  label(
    g,
    "SEA & BLOOM",
    0,
    3.42,
    0.42,
    4.5,
    0.42,
    "#f4df9f",
    "#477f6b",
    "bold 86px serif",
  );
  for (let i = 0; i < 9; i++) {
    const shade = box(
      g,
      -2.4 + i * 0.6,
      3.0,
      0.94,
      0.6,
      0.1,
      1.55,
      i % 2 ? "#f3e5c6" : "#81b69c",
      0.035,
    );
    shade.rotation.x = 0.18;
    sphere(
      g,
      -2.4 + i * 0.6,
      2.86,
      1.7,
      0.3,
      0.19,
      0.07,
      i % 2 ? "#f3e5c6" : "#81b69c",
    );
  }
  // Open roof terrace, with an actual stair up the west side.
  for (const z of [-4.25, 0.15])
    for (let i = 0; i < 10; i++)
      rod(
        g,
        [-2.4 + i * 0.53, 4.0, z],
        [-2.4 + i * 0.53, 4.88, z],
        0.028,
        "#6f8c70",
      );
  for (const x of [-2.4, 2.4])
    for (let i = 0; i < 8; i++) {
      const z = -4.1 + i * 0.58;
      if (x < 0 && z > -1.3) continue;
      rod(g, [x, 4.0, z], [x, 4.88, z], 0.028, "#6f8c70");
    }
  for (const z of [-4.25, 0.15])
    rod(g, [-2.5, 4.9, z], [2.5, 4.9, z], 0.055, "#c5bd91");
  for (const x of [-2.4, 2.4])
    rod(g, [x, 4.9, -4.25], [x, 4.9, x < 0 ? -1.3 : 0.15], 0.055, "#c5bd91");
  table(g, 0, 3.98, -2, 0.55);
  chair(g, -0.83, 3.98, -2, Math.PI / 2);
  chair(g, 0.83, 3.98, -2, -Math.PI / 2);
  umbrella(g, 0, 6.65, -2, 1.5);
  rod(g, [0, 3.98, -2], [0, 4.68, -2], 0.035, "#dbd8bb");
  for (const x of [-2.2, 2.2]) {
    rod(g, [x, 4, -3.9], [x, 6.8, -3.9], 0.06, "#b59b6f");
    rod(g, [x, 6.8, -3.9], [x, 6.8, 0.1], 0.06, "#b59b6f");
  }
  for (let i = 0; i < 8; i++)
    rod(
      g,
      [-2.3, 6.8, -3.8 + i * 0.53],
      [2.3, 6.8, -3.8 + i * 0.53],
      0.045,
      "#c2ab7d",
    );
  flowerBox(g, -1.5, 4.0, -0.05, 1.45, 0.55, true);
  flowerBox(g, 1.5, 4.0, -0.05, 1.45, 0.55, true);
  for (let i = 0; i < 14; i++)
    box(
      scene,
      52.5,
      0.23 + i * 0.27,
      4.3 + i * 0.39,
      1.1,
      0.26,
      0.41,
      "#d7c29b",
      0.035,
    );
  box(scene, 53.25, 3.91, 9.35, 1.2, 0.14, 0.8, "#d7c29b", 0.04);
  rod(scene, [51.95, 1.0, 4.1], [51.95, 4.8, 9.6], 0.035, "#7b947b");
  chalkboard(g, -1.6, 0.23, 1.8, "BLOOM & TEA", 0.06);
  bouquetBucket(g, 1.8, 0.23, 1.2, 0.35, "sunflower");
}
function wayfinding(scene, x, z) {
  const g = group(scene, x, 0.23, z);
  cylinder(g, 0, 1.4, 0, 0.065, 0.09, 2.8, "#8a7658");
  for (const [y, text, color] of [
    [2.7, "BIỂN  →", "#70a9ab"],
    [2.15, "KHU CÂU CÁ  →", "#6f9b83"],
  ]) {
    box(g, 0, y, 0, 2.1, 0.45, 0.14, color, 0.09);
    label(
      g,
      text,
      0,
      y,
      0.08,
      1.9,
      0.32,
      "#fff0c7",
      color,
      "bold 66px sans-serif",
    );
  }
}
function shoreWall(scene) {
  box(scene, 64.9, -1.4, -14, 2.2, 3.25, 108, "#8caba7", 0.04);
  for (let row = 0; row < 3; row++)
    for (let z = -67; z < 40; z += 2.5) {
      box(
        scene,
        65.95,
        -1.98 + row * 0.73,
        z + (row % 2) * 1.25,
        0.33,
        0.69,
        2.4,
        ["#a3bab2", "#c0c9b6", "#9eb5af"][
          (row + Math.round(z)) % 3 < 0 ? 0 : (row + Math.round(z)) % 3
        ],
        0.09,
      );
    }
  for (let z = -67; z <= 40; z += 3) {
    if (z > 8 && z < 16) continue;
    cylinder(scene, 65.45, 0.83, z, 0.07, 0.1, 1.2, "#6e8f87");
    sphere(scene, 65.45, 1.48, z, 0.11, 0.11, 0.11, "#c0c8af");
  }
  for (const [a, b] of [
    [-67, 8],
    [16, 40],
  ])
    for (const y of [0.66, 1.22])
      rod(scene, [65.45, y, a], [65.45, y, b], 0.035, "#8ba79a");
}
function fishingPier(scene) {
  const p = P.pier;
  for (let x = p.minX; x < p.maxX; x += 0.38) {
    box(
      scene,
      x + 0.18,
      0.15,
      12,
      0.355,
      0.2,
      6,
      ["#ba996a", "#caaa7b", "#c4a170"][Math.round(x * 10) % 3],
      0.025,
    );
    for (const z of [9.35, 14.65]) {
      sphere(scene, x + 0.18, 0.256, z, 0.022, 0.012, 0.022, "#867f61");
    }
  }
  for (const x of [66, 71, 77, 83, 87.5])
    for (const z of [9.15, 14.85]) {
      cylinder(scene, x, -1.7, z, 0.16, 0.21, 4.1, "#8e8064");
      cylinder(scene, x, 0.76, z, 0.14, 0.17, 1.02, "#ac9166");
      cylinder(scene, x, 1.29, z, 0.2, 0.2, 0.12, "#bb9d71");
    }
  for (const [a, b] of [
    [66, 71],
    [71, 77],
    [77, 83],
    [83, 87.5],
  ])
    for (const z of [9.15, 14.85])
      rod(scene, [a, -1.1, z], [b, -2.6, z], 0.08, "#9a8b68");
  for (const z of [9.15, 14.85]) {
    for (const y of [0.66, 1.08])
      rod(scene, [66, y, z], [87.5, y, z], 0.033, "#929d7d");
  }
  for (let z = 9.15; z <= 14.85; z += 1.9)
    rod(scene, [87.6, 0.55, z], [87.6, 1.2, z], 0.045, "#83957c");
  for (const y of [0.66, 1.08])
    rod(scene, [87.6, y, 9.15], [87.6, y, 14.85], 0.033, "#929d7d");
  const gate = group(scene, 65.8, 0.25, 12, -Math.PI / 2);
  for (const x of [-2.0, 2.0]) {
    cylinder(gate, x, 1.65, 0, 0.1, 0.13, 3.3, "#af8e5d");
    sphere(gate, x, 3.35, 0, 0.15, 0.13, 0.15, "#d2b479");
  }
  box(gate, 0, 3.18, 0, 4.4, 0.95, 0.23, "#b78e58", 0.2);
  box(gate, 0, 3.18, 0.14, 4.13, 0.76, 0.04, "#e6d6aa", 0.15);
  label(
    gate,
    "KHU CÂU CÁ",
    0,
    3.14,
    0.17,
    3.8,
    0.48,
    "#557e7c",
    "#e6d6aa",
    "bold 83px sans-serif",
  );
  const badge = cylinder(gate, 0, 4.0, 0, 0.51, 0.51, 0.17, "#f0dfae");
  badge.rotation.x = Math.PI / 2;
  sphere(gate, 0, 4.0, 0.11, 0.34, 0.14, 0.055, "#6ca8ae");
  const tail = new THREE.Shape();
  tail.moveTo(-0.25, 0);
  tail.lineTo(-0.47, 0.16);
  tail.lineTo(-0.47, -0.16);
  tail.closePath();
  mesh(gate, new THREE.ShapeGeometry(tail), "#6ca8ae", 0, 4.0, 0.13);
  sphere(gate, 0.18, 4.03, 0.17, 0.022, 0.022, 0.012, "#3d5c59");
  const rear = group(gate, 0, 3.18, -0.14, Math.PI);
  label(
    rear,
    "KHU CÂU CÁ",
    0,
    0,
    0,
    3.8,
    0.48,
    "#f6e4b9",
    "#b78e58",
    "bold 78px sans-serif",
  );
  bench(scene, 69.0, 13.65, 0);
  bench(scene, 75.1, 13.65, 0);
  for (const x of [67.2, 86.5]) lantern(scene, x, 1.65, 9.2, 0.95);
  box(scene, 84.4, 0.61, 10.15, 1.05, 0.7, 0.7, "#94b6ab", 0.09);
  box(scene, 84.4, 1.0, 10.15, 1.12, 0.1, 0.76, "#e4dfc0", 0.05);
  rod(scene, [84.1, 1.06, 10.15], [84.7, 1.06, 10.15], 0.03, "#708f82");
  for (const x of [79.8, 81.1]) {
    box(scene, x, 0.5, 9.9, 0.83, 0.51, 0.65, "#b29366", 0.04);
    for (let i = 0; i < 4; i++)
      box(
        scene,
        x - 0.29 + i * 0.19,
        0.51,
        10.245,
        0.15,
        0.43,
        0.035,
        "#caab7b",
        0.02,
      );
  }
  cylinder(scene, 86.3, 0.72, 13.7, 0.35, 0.31, 0.93, "#ac9268");
  for (const y of [0.35, 0.8, 1.13]) {
    const ring = torus(scene, 86.3, y, 13.7, 0.35, 0.025, "#788879");
    ring.rotation.x = Math.PI / 2;
  }
  // Draped net rests on the crate, with open mesh rather than a solid green sheet.
  for (let i = 0; i < 8; i++)
    tube(
      scene,
      [
        [79.35 + i * 0.12, 0.8, 9.5],
        [79.35 + i * 0.12, 0.91, 9.9],
        [79.35 + i * 0.12, 0.63, 10.5],
        [79.35 + i * 0.12, 0.28, 10.7],
      ],
      0.006,
      "#a3b28f",
    );
  for (let j = 0; j < 7; j++) {
    const z = 9.5 + j * 0.17,
      yy = z < 10 ? 0.88 : 0.88 - (z - 10) * 0.85;
    rod(scene, [79.35, yy, z], [80.2, yy, z], 0.006, "#a3b28f");
  }
  for (const x of [72.5, 80]) {
    cylinder(scene, x, 0.31, 9.1, 0.06, 0.08, 0.12, "#708c83");
    rod(scene, [x - 0.14, 0.38, 9.1], [x + 0.14, 0.38, 9.1], 0.025, "#a7b6a1");
  }
  const life = torus(
    scene,
    66.1,
    1.1,
    15.05,
    0.35,
    0.075,
    "#df9a67",
    Math.PI / 2,
  );
  flowerBox(scene, 64.0, 0.23, 16.9, 1.2, 0.75, true);
}
function beach(scene) {
  const s = new THREE.Shape();
  s.moveTo(56, 36.5);
  s.lineTo(65.8, 36.5);
  s.bezierCurveTo(71, 37, 73, 43, 70, 47.5);
  s.bezierCurveTo(68, 51, 60, 52, 57, 47);
  s.lineTo(56, 36.5);
  s.closePath();
  const sand = mesh(
    scene,
    new THREE.ExtrudeGeometry(s, {
      depth: 0.77,
      bevelEnabled: true,
      bevelSize: 0.15,
      bevelThickness: 0.1,
      bevelSegments: 4,
      curveSegments: 40,
    }),
    "#e8d4a5",
    0,
    0.015,
    0,
  );
  sand.rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++)
    box(
      scene,
      59.5,
      0.175 - i * 0.07,
      40.0 + i * 0.45,
      4,
      0.1,
      0.5,
      "#d9c5a0",
      0.04,
    );
  umbrella(scene, 61.5, 2.8, 43, 1.8);
  rod(scene, [61.5, 0.015, 43], [61.5, 0.82, 43], 0.035, "#dbd8bb");
  palm(scene, 57.8, 42, 7.2, 0.015);
  for (const x of [60.5, 62.4]) {
    const g = group(scene, x, 0.04, 44.7, 0.25);
    for (let i = 0; i < 6; i++)
      box(
        g,
        0,
        0.34 + i * 0.02,
        -0.55 + i * 0.19,
        0.64,
        0.055,
        0.16,
        "#d5c49b",
        0.025,
      );
    for (const xx of [-0.28, 0.28])
      rod(g, [xx, 0, -0.55], [xx, 0.57, 0.55], 0.035, "#b2a881");
    const back = box(g, 0, 0.85, 0.7, 0.64, 0.85, 0.07, "#9bbcaf", 0.03);
    back.rotation.x = -0.4;
  }
  for (let i = 0; i < 15; i++) {
    const a = i * 2.4;
    sphere(
      scene,
      67.5 + Math.cos(a) * 2,
      0.02,
      43 + Math.sin(a) * 3,
      0.06,
      0.028,
      0.09,
      ["#fff0cb", "#e1b9a2", "#f4d0ba"][i % 3],
    );
  }
}
function finishFloristBack(florist){
 // Keep the approved frontage and awning; finish the sides exposed by the new
 // aerial view and make its existing solid roof a usable garden terrace.
 const rear=group(florist,0,0,-8.05,Math.PI);
 for(const y of [.30,4.45])for(const x of [-3,0,3])archedWindow(rear,x,y,0,2.05,y<1?3.0:2.45);
 for(const y of [3.9,7.78])box(rear,0,y,.08,9.1,.19,.25,'#d9c5a0',.055);
 for(const side of [-1,1]){
  const wall=group(florist,side*4.53,0,-3.5,side*Math.PI/2);
  for(const y of [.30,4.45])for(const x of [-2.8,0,2.8])archedWindow(wall,x,y,0,1.85,y<1?3.0:2.45);
  box(wall,0,3.9,.09,9,.19,.25,'#d9c5a0',.055);
 }
 box(florist,0,8.04,-3.5,8.5,.12,8.2,'#d4bc8d',.07);
 for(const z of [-7.35,.35]){
  for(let i=0;i<12;i++)rod(florist,[-4.05+i*.74,8.10,z],[-4.05+i*.74,9.18,z],.027,'#7d9576');
  rod(florist,[-4.12,9.2,z],[4.12,9.2,z],.05,'#c2bc91');
 }
 for(const x of [-4.1,4.1]){for(let i=0;i<11;i++)rod(florist,[x,8.10,-7.3+i*.75],[x,9.18,-7.3+i*.75],.027,'#7d9576');rod(florist,[x,9.2,-7.35],[x,9.2,.4],.05,'#c2bc91');}
 const access=group(florist,-2.8,8.1,-6.05);box(access,0,1.25,-.2,1.8,2.5,1.8,'#8ba98e',.13);box(access,0,2.58,-.2,2.06,.16,2.06,'#e4d5b0',.07);archedWindow(access,0,.02,.74,1.1,2.15);
 for(const x of [-3,3])for(const z of [-3.7,-.15])rod(florist,[x,8.1,z],[x,10.8,z],.07,'#b69d71');
 for(let i=0;i<9;i++)rod(florist,[-3.2,10.8,-3.7+i*.45],[3.2,10.8,-3.7+i*.45],.045,'#c6ae7e');
 for(const x of [-3,3])rod(florist,[x,10.8,-3.9],[x,10.8,.15],.055,'#b69d71');
 table(florist,.6,8.11,-2,.62);chair(florist,-.3,8.11,-2,Math.PI/2);chair(florist,1.5,8.11,-2,-Math.PI/2);
 for(const x of [-3,0,3])flowerBox(florist,x,8.11,.16,1.8,.55,true);
 for(const x of [1.3,3.1])flowerBox(florist,x,8.11,-7.10,1.3,.55,true);
 for(const x of [-2.8,2.8]){foliage(florist,x,10.82,-.25,.5,36);vine(florist,x,10.8,-.1,1.45);}
}
function westernGarden(scene, tiles) {
  // The wider camera reveals the old unused base behind the town. Finish it as
  // a residential garden edge, keeping the approved alley and stair untouched.
  paved(scene, -27.25, -8, 3.5, 66, tiles);
  paved(scene, -29.25, 24, 15.5, 1.8, tiles);
  paved(scene, -29.25, -40, 15.5, 1.8, tiles);
  const meadow = artwork(
    (c, W, H) => {
      c.fillStyle = "#a6b58b";
      c.fillRect(0, 0, W, H);
      for (let i = 0; i < 6000; i++) {
        c.fillStyle = ["#9bac82", "#b6bf9b", "#a7b88c"][i % 3];
        c.fillRect(random() * W, random() * H, 1, 2 + random() * 3);
      }
    },
    512,
    512,
  );
  meadow.wrapS = meadow.wrapT = THREE.RepeatWrapping;
  meadow.repeat.set(5, 12);
  const grass = mat("#fff", { map: meadow });
  box(scene, -41.75, 0.02, -18, 40.5, 0.2, 96, grass, 0.02);
  sphere(scene, -52, -1, -20, 14, 8, 90, grass);
  for (const [x, z, color] of [
    [-29, 10, "#9bbfb2"],
    [-29, -10, "#d2afba"],
    [-29, -30, "#acbdd2"],
  ])
    townHouse(scene, x, z, color, Math.PI / 2);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-36.5, 0.231, 24),
    new THREE.Vector3(-36.7, 0.231, 10),
    new THREE.Vector3(-36.1, 0.231, -8),
    new THREE.Vector3(-36.7, 0.231, -24),
    new THREE.Vector3(-36.5, 0.231, -40),
  ]);
  const vertices = [],
    uvs = [],
    indices = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64,
      p = curve.getPoint(t),
      tangent = curve.getTangent(t),
      n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    for (const side of [-1, 1]) {
      vertices.push(p.x + n.x * 0.85 * side, p.y, p.z + n.z * 0.85 * side);
      uvs.push(side < 0 ? 0 : 1, t * 22);
    }
    if (i < 64) {
      const j = i * 2;
      indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  const path = new THREE.BufferGeometry();
  path.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  path.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  path.setIndex(indices);
  path.computeVertexNormals();
  mesh(scene, path, mat("#e0ccb0", { side: THREE.DoubleSide }));
  for (const x of [-60, -50, -40])
    for (const z of [-65, -43, -20, 2, 22]) {
      const q = ((x + 52) / 14) ** 2 + ((z + 20) / 90) ** 2;
      const t = tree(scene, x, z, 5.4 + random(), 1.8);
      t.parent.position.y = Math.max(
        0.12,
        -1 + 8 * Math.sqrt(Math.max(0, 1 - q)),
      );
    }
  // Small park shelter is placed on the flat foreground, outside the hill.
  const g = group(scene, -33, 0.23, 18);
  cylinder(g, 0, 0.03, 0, 2.45, 2.45, 0.08, "#ccb992", 48);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    rod(
      g,
      [Math.cos(a) * 2.15, 0.05, Math.sin(a) * 2.15],
      [Math.cos(a) * 2.15, 3.65, Math.sin(a) * 2.15],
      0.08,
      "#a68a5e",
    );
  }
  cylinder(g, 0, 4.1, 0, 0.45, 2.6, 1.05, "#bba06c", 48);
  const eave = torus(g, 0, 3.59, 0, 2.6, 0.075, "#927c56");
  eave.rotation.x = Math.PI / 2;
  table(g, 0, 0.08, 0, 0.55);
  chair(g, -0.9, 0.08, 0, Math.PI / 2);
  chair(g, 0.9, 0.08, 0, -Math.PI / 2);
  lantern(g, 0, 3.2, 0, 1.1);
  rod(g, [0, 3.55, 0], [0, 4.2, 0], 0.02, "#8a815e");
  paved(scene, -33, 22.2, 1.4, 3.6, tiles);
  paved(scene, -35.3, -15, 2, 3.5, tiles);
  bench(scene, -35, -15, -Math.PI / 2);
  flowerBox(scene, -34.7, 0.12, -18, 1.4, 0.65, true);
  flowerBox(scene, -29.8, 0.23, 18, 1.3, 0.65, true);
  const sign = group(scene, -27.2, 0.23, 24.8);
  cylinder(sign, 0, 1.1, 0, 0.055, 0.07, 2.2, "#8d7a58");
  box(sign, 0, 2.04, 0, 2.1, 0.45, 0.13, "#83a18a", 0.07);
  label(sign, "GARDEN WALK", 0, 2.04, 0.075, 1.9, 0.3, "#f6e5b9", "#83a18a");
}
export function extendCity(scene, district) {
  let sea, coastalWalker, fisher;
  withFlowers(scene, () => {
    const tiles = paving();
    westernGarden(scene, tiles);
    finishFloristBack(district.florist);
    // Fill the eastern land with planned blocks and courts, not arbitrary props.
    paved(scene, 40, -21.5, 29, 93, tiles);
    paved(scene, 60, -14, 12, 108, tiles);
    const asphalt = artwork(
      (c, W, H) => {
        c.fillStyle = "#777a72";
        c.fillRect(0, 0, W, H);
        for (let i = 0; i < 10000; i++) {
          c.fillStyle = i % 2 ? "#888b82" : "#6f746e";
          c.fillRect(random() * W, random() * H, 1, 1);
        }
      },
      256,
      256,
    );
    asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
    asphalt.repeat.set(32, 4.5);
    box(
      scene,
      29,
      -0.112,
      31,
      50,
      0.18,
      7,
      mat("#92998e", { map: asphalt }),
      0.025,
    );
    paved(scene, 45.75, 25.5, 40.5, 4, tiles);
    paved(scene, 36.75, 36.1, 56.5, 3.2, tiles);
    for (const z of [27.35, 34.65])
      for (let x = 9.2; x < 54; x += 0.65)
        box(scene, x, 0.06, z, 0.61, 0.35, 0.35, "#dfcbb0", 0.04);
    for (let x = 12; x < 51; x += 6)
      box(scene, x, -0.012, 31, 2.4, 0.012, 0.13, "#f1e6cd", 0.008);
    for (let i = 0; i < 9; i++)
      box(
        scene,
        50.8 + i * 0.36,
        -0.008,
        31,
        0.19,
        0.012,
        6.2,
        "#f1e8d5",
        0.006,
      );
    for (const [x, name, color] of [
      [32, "PETITE BAKERY", "#b7b99c"],
      [41, "COZY MART", "#8fb6a8"],
      [50, "ATELIER", "#d7b1b0"],
    ]) {
      const g = townHouse(scene, x, 20, color, 0, name);
      flowerBox(g, -2.0, 0.23, 0.7, 1.2, 0.65, true);
      flowerBox(g, 2.0, 0.23, 0.7, 1.2, 0.65, true);
      chalkboard(g, 0, 0.23, 1.1, "WELCOME");
    }
    for (const z of [-6, -20, -34])
      townHouse(
        scene,
        36,
        z,
        ["#91c1ad", "#d6a8b8", "#a6c5dc"][Math.abs(z / 2) % 3 | 0],
        Math.PI / 2,
      );
    for (const [i, z] of [-6, -20, -34, -48, -60].entries())
      townHouse(
        scene,
        44,
        z,
        ["#e3bd85", "#8fc5bd", "#c3aed8"][i % 3],
        -Math.PI / 2,
      );
    for (const z of [-13, -27, -41]) {
      tree(scene, 39, z, 6.2, 1.4);
      flowerBox(scene, 42.8, 0.23, z, 1.2, 0.8, true);
    }
    for (const x of [28, 38, 48]) {
      tree(scene, x, 23.2, 6.5, 1.5);
      flowerBox(scene, x + 2, 0.23, 21.2, 1.5, 0.7, true);
    }
    tree(scene, 38, -53, 6.3, 1.5);
    tree(scene, 38, -62, 6.3, 1.5);
    // Landscaped headland closes the northern promenade instead of exposing
    // an unfinished terrain edge beyond the houses.
    sphere(scene, 60, -0.3, -84, 7.8, 2.8, 16, "#9cad82");
    for (const [x, z] of [
      [57, -81],
      [62, -88],
      [56, -93],
    ]) {
      const t = tree(scene, x, z, 5.5, 1.6),
        q = ((x - 60) / 7.8) ** 2 + ((z + 84) / 16) ** 2;
      t.parent.position.y = -0.3 + 2.8 * Math.sqrt(Math.max(0.05, 1 - q));
    }
    for (const z of [-75, -83, -92])
      sphere(scene, 66.5, -0.6, z, 1.8, 1.2, 2.4, "#aabeb5");
    flowerBox(scene, 60, 0.23, -66.8, 3.6, 0.7, true);
    seasideKiosk(scene);
    shoreWall(scene);
    fishingPier(scene);
    beach(scene);
    for (const z of [-63, -49, -33, -18, -3, 22, 36])
      palm(scene, 56.8, z, 7.3 + (Math.abs(z) % 3) * 0.3);
    for (const z of [-60, -44, -25, -5, 26]) bench(scene, 64.0, z, Math.PI / 2);
    for (const z of [-58, -37, -16, 3, 22, 33])
      flowerBox(scene, 64, 0.23, z, 1.2, 1.65, true);
    for (const z of [-63, -51, -28, -7, 19, 35]) lamp(scene, 63.8, z, 5.1);
    for (const [x, z] of [
      [58, -40],
      [58, -15],
      [58, 29],
    ]) {
      table(scene, x, 0.23, z, 0.6);
      chair(scene, x - 0.85, 0.23, z, Math.PI / 2);
      chair(scene, x + 0.85, 0.23, z, -Math.PI / 2);
    }
    wayfinding(scene, 20.0, 24);
    wayfinding(scene, 54.4, 25);
    buildCafeAnnex(scene, district.cafe);
    sea = buildSea(scene);
    coastalWalker = person(scene, {
      x: P.coastWalk.x,
      z: P.coastWalk.z,
      color: "#e1bc91",
      skirt: true,
      hat: true,
      hair: "#674e3d",
    });
    fisher = person(scene, {
      x: 82,
      z: 13.7,
      color: "#9fbfc7",
      skirt: false,
      hat: true,
      hair: "#574738",
    });
    fisher.g.position.y = 0.18;
    for (const i of [0, 2]) fisher.limbs[i].rotation.x = -0.8;
    tube(
      fisher.g,
      [
        [0.09, 1.04, 0.23],
        [0.17, 2.12, 1.1],
        [0.28, 2.75, 2.5],
      ],
      0.018,
      "#738575",
    );
    const reel = cylinder(
      fisher.g,
      0.13,
      1.12,
      0.4,
      0.08,
      0.08,
      0.05,
      "#b6bca2",
    );
    reel.rotation.z = Math.PI / 2;
    tube(
      fisher.g,
      [
        [0.28, 2.75, 2.5],
        [0.35, 1.0, 4.0],
        [0.35, -0.88, 5.0],
      ],
      0.004,
      "#e2e5c5",
    );
    sphere(fisher.g, 0.35, -0.85, 5, 0.045, 0.07, 0.045, "#e3a16b");
    batchRigidParts(fisher.g);
  });
  return {
    update(dt, time) {
      sea.update(time);
      const p = sampleWalk(time, P.coastWalk);
      coastalWalker.g.position.z = p.z;
      const turn = Math.atan2(
        Math.sin(p.heading - coastalWalker.g.rotation.y),
        Math.cos(p.heading - coastalWalker.g.rotation.y),
      );
      coastalWalker.g.rotation.y += turn * Math.min(1, dt * 4);
      coastalWalker.limbs.forEach(
        (limb, i) =>
          (limb.rotation.x =
            Math.sin(time * 4.5) * 0.32 * p.stride * [1, -1, -1, 1][i]),
      );
      fisher.g.rotation.y = Math.sin(time * 0.3) * 0.025;
    },
  };
}
