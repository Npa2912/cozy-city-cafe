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
  foliage,
  vine,
  pot,
  tiledRoof,
  flowerLogo,
  umbrella,
  smallBuilding,
  tower,
} from "./street.js";

let seed = 37421;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const petalGeometry = new THREE.SphereGeometry(1, 8, 5);
const stemGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
let flowerBank;
function instance(
  parent,
  geometry,
  color,
  x,
  y,
  z,
  sx,
  sy,
  sz,
  rz = 0,
  ry = 0,
) {
  const key = color + geometry.uuid;
  if (!flowerBank.has(key)) flowerBank.set(key, { geometry, color, items: [] });
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  o.rotation.set(0, ry, rz);
  o.updateMatrix();
  flowerBank.get(key).items.push({ parent, matrix: o.matrix.clone() });
}
function flower(
  parent,
  x,
  y,
  z,
  size = 0.1,
  color = "#f4a1bf",
  sunflower = false,
) {
  const h = 0.27 + random() * 0.34;
  instance(parent, stemGeometry, "#66884a", x, y + h / 2, z, 0.012, h, 0.012);
  for (const side of [-1, 1])
    instance(
      parent,
      petalGeometry,
      "#85b94f",
      x + side * 0.065,
      y + h * 0.45,
      z,
      0.045,
      0.12,
      0.024,
      side * 0.75,
    );
  const petals = sunflower ? 12 : 6;
  for (let i = 0; i < petals; i++) {
    const a = (i * Math.PI * 2) / petals;
    instance(
      parent,
      petalGeometry,
      color,
      x + Math.sin(a) * size * 0.7,
      y + h + Math.cos(a) * size * 0.7,
      z,
      size * 0.47,
      size * 0.73,
      size * 0.22,
      -a,
    );
  }
  instance(
    parent,
    petalGeometry,
    sunflower ? "#775039" : "#efd46c",
    x,
    y + h,
    z + size * 0.24,
    size * 0.43,
    size * 0.43,
    size * 0.25,
  );
}
function flowerCluster(parent, x, y, z, size = 0.32, color = "#ef9fc2") {
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4,
      r = Math.sqrt(i / 9) * size;
    const px = x + Math.cos(a) * r,
      py = y + Math.sin(a) * r * 0.6,
      pz = z + (random() - 0.5) * size;
    for (let j = 0; j < 5; j++) {
      const b = j * Math.PI * 0.4;
      instance(
        parent,
        petalGeometry,
        color,
        px + Math.cos(b) * 0.045,
        py + Math.sin(b) * 0.045,
        pz,
        0.04,
        0.045,
        0.017,
        -b,
      );
    }
    instance(
      parent,
      petalGeometry,
      "#f8dc86",
      px,
      py,
      pz + 0.02,
      0.017,
      0.017,
      0.013,
    );
  }
}
function flowerBox(parent, x, y, z, w = 2, d = 0.8, pink = false) {
  box(parent, x, y + 0.32, z, w, 0.6, d, "#a8794c", 0.07);
  box(parent, x, y + 0.61, z, w - 0.12, 0.035, d - 0.12, "#625341", 0.02);
  for (let i = 0; i < Math.ceil(w / 0.25); i++)
    box(
      parent,
      x - w / 2 + 0.14 + i * 0.25,
      y + 0.33,
      z + d / 2,
      0.21,
      0.54,
      0.06,
      i % 2 ? "#c8965d" : "#b38450",
      0.025,
    );
  for (const xx of [x - w * 0.37, x + w * 0.37])
    box(
      parent,
      xx,
      y + 0.32,
      z + d / 2 + 0.035,
      0.07,
      0.62,
      0.045,
      "#655f4d",
      0.015,
    );
  for (let i = 0; i < w * 24; i++) {
    const xx = x + (random() - 0.5) * (w - 0.12),
      zz = z + (random() - 0.5) * (d - 0.1);
    instance(
      parent,
      petalGeometry,
      "#74a747",
      xx,
      y + 0.8,
      zz,
      0.11,
      0.14,
      0.1,
      random() * 3,
    );
    flower(
      parent,
      xx,
      y + 0.64,
      zz,
      0.075 + random() * 0.045,
      pink
        ? ["#ed78ad", "#f6bdd5", "#ed9ac3"][i % 3]
        : ["#fff1c9", "#f3bc4d", "#f6aac7", "#b4a2e0"][i % 4],
    );
  }
  for (let i = 0; i < Math.ceil(w * 3); i++)
    flowerCluster(
      parent,
      x + (random() - 0.5) * w,
      y + 0.99,
      z + (random() - 0.5) * d,
      0.2,
      pink ? "#f2add0" : ["#ef9fc2", "#f9efd2", "#f5d369"][i % 3],
    );
  for (let i = 0; i < 3; i++)
    vine(
      parent,
      x - w / 2 + 0.3 + (i * w) / 3,
      y + 0.7,
      z + d / 2,
      0.8 + random() * 0.3,
    );
}
function bouquetBucket(parent, x, y, z, size = 0.4, type = "mixed") {
  const bucket = mesh(
    parent,
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(size * 0.64, 0),
        new THREE.Vector2(size * 0.76, size * 0.1),
        new THREE.Vector2(size, size * 1.28),
        new THREE.Vector2(size * 1.03, size * 1.34),
      ],
      32,
    ),
    mat("#b3c3b8", { metalness: 0.58, roughness: 0.42 }),
    x,
    y,
    z,
  );
  const rim = torus(parent, x, y + size * 1.3, z, size, 0.028, "#e0d9bd");
  rim.rotation.x = Math.PI / 2;
  if (type === "hydrangea")
    flowerCluster(parent, x, y + size * 2.3, z, size * 1.1, "#a6a3e1");
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4,
      r = Math.sqrt(i / 12) * size * 0.9;
    let color =
      type === "sunflower"
        ? "#efc839"
        : type === "hydrangea"
          ? ["#929cde", "#b4a6e6", "#8799d5"][i % 3]
          : ["#ee8eb9", "#f4bbcf", "#fff0c3", "#efce5e"][i % 4];
    flower(
      parent,
      x + Math.cos(a) * r,
      y + size * 1.2,
      z + Math.sin(a) * r,
      type === "sunflower" ? 0.19 : type === "hydrangea" ? 0.09 : 0.12,
      color,
      type === "sunflower",
    );
  }
  return bucket;
}
function tree(parent, x, z, height = 8, spread = 3.2) {
  const g = group(parent, x, 0.23, z);
  const bark = mat("#827052");
  const points = [
    [0, 0, 0],
    [0.1, height * 0.25, 0.1],
    [-0.16, height * 0.54, -0.12],
    [0.1, height * 0.82, 0.05],
  ];
  const trunk = mesh(
    g,
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
      24,
      0.18,
      12,
      false,
    ),
    bark,
  );
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4,
      r = spread * (0.4 + random() * 0.6),
      yy = height * (0.65 + random() * 0.27),
      xx = Math.cos(a) * r,
      zz = Math.sin(a) * r;
    tube(
      g,
      [
        [0, height * 0.45, 0],
        [xx * 0.45, yy * 0.85, zz * 0.45],
        [xx, yy, zz],
      ],
      0.055 + (i % 2) * 0.02,
      "#8f7752",
    );
    foliage(g, xx, yy, zz, 1.15, 100);
    for (let j = 0; j < 4; j++)
      flower(
        g,
        xx + (random() - 0.5) * 1.5,
        yy + 0.3,
        zz + (random() - 0.5) * 1.5,
        0.09,
        j % 2 ? "#ffcf65" : "#f3b7ce",
      );
  }
  const soil = cylinder(g, 0, 0.08, 0, 0.62, 0.62, 0.12, "#6f6750");
  const ring = torus(g, 0, 0.13, 0, 0.73, 0.09, "#c4b798");
  ring.rotation.x = Math.PI / 2;
  for (let i = 0; i < 14; i++)
    instance(
      g,
      petalGeometry,
      "#7ca550",
      Math.cos(i) * 0.5,
      0.16,
      Math.sin(i) * 0.5,
      0.12,
      0.28,
      0.09,
      i,
    );
  return trunk;
}
function chair(parent, x, y, z, ry = 0) {
  const g = group(parent, x, y, z, ry);
  cylinder(g, 0, 0.52, 0, 0.31, 0.31, 0.1, "#cfa163");
  for (const xx of [-0.21, 0.21])
    for (const zz of [-0.2, 0.2])
      rod(g, [xx, 0.5, zz], [xx * 1.15, 0, zz * 1.2], 0.035, "#8c623f");
  tube(
    g,
    [
      [-0.27, 0.54, -0.19],
      [-0.29, 0.95, -0.22],
      [0, 1.12, -0.26],
      [0.29, 0.95, -0.22],
      [0.27, 0.54, -0.19],
    ],
    0.04,
    "#a67d4c",
  );
  for (const xx of [-0.16, 0, 0.16])
    rod(g, [xx, 0.58, -0.23], [xx, 1.02, -0.24], 0.018, "#c3985c");
  return g;
}
function table(parent, x, y, z, size = 0.7) {
  const g = group(parent, x, y, z);
  cylinder(g, 0, 0.82, 0, size, size, 0.09, "#deb783");
  cylinder(g, 0, 0.39, 0, 0.055, 0.07, 0.78, "#666659");
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094;
    rod(
      g,
      [0, 0.2, 0],
      [Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45],
      0.035,
      "#666659",
    );
  }
  pot(g, 0, 0.87, 0, 0.12, true);
  cup(g, 0.28, 0.88, 0, "#f8ead5", false);
  return g;
}
function cup(parent, x, y, z, color = "#f8e8c8", straw = false) {
  cylinder(
    parent,
    x,
    y + 0.1,
    z,
    0.09,
    0.065,
    0.2,
    straw
      ? mat(color, { transparent: true, opacity: 0.7, roughness: 0.25 })
      : color,
    20,
  );
  if (straw)
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4;
      sphere(
        parent,
        x + Math.cos(a) * 0.045,
        y + 0.025 + (i % 2) * 0.03,
        z + Math.sin(a) * 0.045,
        0.018,
        0.018,
        0.018,
        "#634d3e",
      );
    }
  cylinder(parent, x, y + 0.205, z, 0.085, 0.085, 0.012, "#815c3c");
  if (straw) {
    cylinder(parent, x, y + 0.217, z, 0.095, 0.095, 0.025, "#e3d5ad");
    rod(
      parent,
      [x + 0.025, y + 0.22, z],
      [x + 0.04, y + 0.45, z],
      0.012,
      "#d99ea5",
    );
  } else {
    const h = torus(parent, x + 0.095, y + 0.12, z, 0.06, 0.018, color);
  }
}
function chalkboard(parent, x, y, z, text = "Coffee & Milk Tea", ry = 0) {
  const g = group(parent, x, y, z, ry);
  box(g, 0, 0.71, 0, 0.72, 1.14, 0.11, "#a5794b", 0.06);
  box(g, 0, 0.73, 0.07, 0.6, 0.93, 0.025, "#3e594e", 0.03);
  label(
    g,
    text,
    0,
    0.98,
    0.09,
    0.55,
    0.15,
    "#fff0c9",
    "#3e594e",
    "italic 58px serif",
  );
  label(g, "FRESH DAILY", 0, 0.74, 0.09, 0.54, 0.14, "#e5d5a0", "#3e594e");
  flowerLogo(g, 0, 0.45, 0.095, 0.15);
  for (const xx of [-0.27, 0.27]) {
    rod(g, [xx, 1.15, -0.07], [xx, 0, -0.5], 0.035, "#9e794e");
    rod(g, [xx, 0.17, 0.03], [xx, 0.17, -0.4], 0.025, "#9e794e");
  }
}
function lantern(parent, x, y, z, scale = 1) {
  const g = group(parent, x, y, z);
  g.scale.setScalar(scale);
  cylinder(
    g,
    0,
    0,
    0,
    0.18,
    0.14,
    0.39,
    mat("#ffe5a1", { emissive: "#ffd15f", emissiveIntensity: 1.3 }),
    8,
  );
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.785;
    rod(
      g,
      [Math.cos(a) * 0.19, -0.22, Math.sin(a) * 0.19],
      [Math.cos(a) * 0.19, 0.22, Math.sin(a) * 0.19],
      0.018,
      "#566052",
    );
  }
  cylinder(g, 0, 0.25, 0, 0, 0.28, 0.16, "#566052", 8);
  sphere(g, 0, 0.38, 0, 0.035, 0.06, 0.035, "#566052");
  cylinder(g, 0, -0.24, 0, 0.22, 0.12, 0.08, "#566052", 8);
}
function cafeInterior(cafe) {
  const warm = mat("#f3dab0", { emissive: "#b6854e", emissiveIntensity: 0.4 });
  box(cafe, 0, 2.75, -4.83, 11.8, 4.7, 0.08, warm);
  const equipment = group(cafe, 0, -0.6, 0.7);
  box(equipment, -3.3, 1.75, -3.5, 5.4, 0.13, 1.3, "#e9d5b0", 0.07);
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 10; i++)
      cup(
        cafe,
        -5.2 + i * 0.34,
        1.66 + j * 0.61,
        -4.46,
        ["#e9ddb5", "#a7cab0", "#d6adbd"][i % 3],
        i % 3 === 0,
      );
  }
  const menuMap = artwork(
    (c, W, H) => {
      c.fillStyle = "#3d5044";
      c.fillRect(0, 0, W, H);
      c.strokeStyle = "#cfb479";
      c.lineWidth = 12;
      c.strokeRect(7, 7, W - 14, H - 14);
      c.fillStyle = "#f7e8c1";
      c.font = "bold 52px serif";
      c.fillText("Coffee", 45, 78);
      c.fillText("Milk Tea", W / 2 + 35, 78);
      c.font = "28px sans-serif";
      for (const [i, text] of [
        "Espresso  ·  3.5",
        "Café Latte  ·  4.0",
        "Mocha  ·  4.5",
        "Cappuccino · 4.0",
      ].entries())
        c.fillText(text, 45, 142 + i * 57);
      for (const [i, text] of [
        "Brown sugar · 4.0",
        "Taro latte · 4.5",
        "Matcha tea · 4.0",
        "Jasmine tea · 3.5",
      ].entries())
        c.fillText(text, W / 2 + 35, 142 + i * 57);
    },
    1024,
    400,
  );
  box(cafe, -3.7, 3.35, 0.82, 2.8, 1.18, 0.1, "#b18d5b", 0.07);
  mesh(
    cafe,
    new THREE.PlaneGeometry(2.65, 1.05),
    mat("#fff", { map: menuMap }),
    -3.7,
    3.35,
    0.88,
  );
  // Espresso machine: group head, steam wand, hopper, gauges, handles and drip tray.
  box(
    equipment,
    -3.7,
    2.13,
    -3.55,
    1.1,
    0.64,
    0.63,
    mat("#bfc6bc", { metalness: 0.65, roughness: 0.28 }),
    0.1,
  );
  box(equipment, -3.7, 2.34, -3.19, 0.93, 0.23, 0.1, "#f0e3bd", 0.05);
  for (const xx of [-3.95, -3.5]) {
    const gauge = cylinder(
      equipment,
      xx,
      2.36,
      -3.12,
      0.065,
      0.065,
      0.04,
      "#faf0cd",
      20,
    );
    gauge.rotation.x = Math.PI / 2;
    rod(equipment, [xx, 2.12, -3.2], [xx, 2.03, -2.98], 0.03, "#425452");
    cup(equipment, xx, 1.82, -3.16);
  }
  box(equipment, -3.7, 1.8, -3.16, 1.03, 0.06, 0.3, "#66746b", 0.025);
  for (let i = 0; i < 9; i++)
    box(
      equipment,
      -4.13 + i * 0.1,
      1.84,
      -3.16,
      0.025,
      0.01,
      0.24,
      "#c3c9b9",
      0.004,
    );
  cylinder(equipment, -4.7, 2.22, -3.6, 0.15, 0.11, 0.45, "#b4c8bc");
  sphere(
    equipment,
    -4.7,
    2.5,
    -3.6,
    0.19,
    0.2,
    0.19,
    mat("#bca58b", { transparent: true, opacity: 0.65 }),
  );
  // A curved glass pastry display with individually modeled buns.
  box(equipment, -1.0, 1.83, -3.45, 0.75, 0.08, 0.65, "#b29b6b", 0.05);
  box(
    equipment,
    -1.0,
    2.06,
    -3.45,
    0.73,
    0.43,
    0.6,
    mat("#e2e8d7", { transparent: true, opacity: 0.18, roughness: 0.15 }),
    0.12,
  );
  for (let i = 0; i < 4; i++) {
    sphere(
      equipment,
      -1.23 + (i % 2) * 0.35,
      1.96,
      -3.6 + Math.floor(i / 2) * 0.3,
      0.13,
      0.08,
      0.09,
      "#d9af6a",
    );
    tube(
      equipment,
      [
        [-1.3 + (i % 2) * 0.35, 2.02, -3.6 + Math.floor(i / 2) * 0.3],
        [-1.23 + (i % 2) * 0.35, 2.05, -3.6 + Math.floor(i / 2) * 0.3],
        [-1.16 + (i % 2) * 0.35, 2.02, -3.6 + Math.floor(i / 2) * 0.3],
      ],
      0.015,
      "#f1d19a",
    );
  }
  // Bubble-tea sealer, blender and transparent ingredient jars.
  box(equipment, -2.4, 2.05, -3.5, 0.48, 0.5, 0.52, "#c6b5be", 0.07);
  cylinder(equipment, -2.4, 2.36, -3.5, 0.15, 0.15, 0.12, "#e5c6cc");
  cup(equipment, -2.4, 1.85, -3.23, "#c3a278", true);
  cylinder(equipment, -1.9, 2.0, -3.5, 0.16, 0.2, 0.25, "#9bb8a8");
  cylinder(
    equipment,
    -1.9,
    2.28,
    -3.5,
    0.15,
    0.1,
    0.35,
    mat("#eadab9", { transparent: true, opacity: 0.65 }),
  );
  cylinder(equipment, -1.9, 2.47, -3.5, 0.16, 0.16, 0.04, "#6d8e7c");
  for (let i = 0; i < 4; i++) {
    cylinder(
      equipment,
      -5.5 + i * 0.26,
      2.02,
      -3.5,
      0.09,
      0.09,
      0.38,
      mat(["#e5bb8c", "#c8aa7b", "#e6d0a0", "#cb9695"][i], { roughness: 0.35 }),
    );
    cylinder(equipment, -5.5 + i * 0.26, 2.23, -3.5, 0.1, 0.1, 0.05, "#ae9270");
  }
  label(
    cafe,
    "Coffee     Milk Tea",
    -3.5,
    4.04,
    -4.7,
    4.3,
    0.55,
    "#f6e5bc",
    "#3f574d",
    "bold 80px serif",
  );
  label(
    cafe,
    "Espresso · Latte · Matcha · Brown sugar",
    -3.5,
    3.55,
    -4.7,
    4.2,
    0.35,
    "#f7ebc9",
    "#3f574d",
  );
  for (let i = 0; i < 3; i++) {
    box(cafe, 2 + i * 1.15, 3.7, -4.65, 0.85, 1.1, 0.07, "#8f6d46");
    label(
      cafe,
      ["BLOOM", "SLOW DAYS", "COFFEE"][i],
      2 + i * 1.15,
      3.7,
      -4.59,
      0.72,
      0.9,
      "#b78664",
      "#eeddb7",
    );
  }
  table(cafe, 3.5, 0.34, -3, 0.58);
  chair(cafe, 2.65, 0.34, -3, Math.PI / 2);
  chair(cafe, 4.35, 0.34, -3, -Math.PI / 2);
  table(cafe, 0.5, 0.34, -3.3, 0.55);
  chair(cafe, 0.5, 0.34, -4.15, 0);
  chair(cafe, -0.3, 0.34, -3.2, Math.PI / 2);
  for (const xx of [-4, -1, 2, 4.6]) {
    rod(cafe, [xx, 5.4, -2.1], [xx, 4.38, -2.1], 0.015, "#777054");
    lantern(cafe, xx, 4.12, -2.1, 1.25);
  }
  for (const x of [-3, 3]) {
    const light = new THREE.PointLight("#ffcf77", 9, 7, 2);
    light.position.set(x, 3.4, -2);
    cafe.add(light);
  }
  for (const xx of [-5, -2, 1, 4.8]) {
    lantern(cafe, xx, 4.75, 1.15, 0.85);
  }
  chalkboard(cafe, -3.6, 0.3, 1.65, "Coffee / Tea");
  flowerBox(cafe, -4.8, 0.3, 1.25, 1.6, 0.65, true);
  flowerBox(cafe, 4.7, 0.83, 1.4, 2.5, 0.8, true);
  // Petaled mosaic, with each sector following the same circular silhouette.
  const mosaic = group(cafe, -0.4, 0.307, 1.85);
  mosaic.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const tile = mesh(
      mosaic,
      new THREE.CircleGeometry(0.46, 32),
      mat(["#e6b3c5", "#e9ce80", "#a5cbd4", "#b3cc98"][i % 4]),
      Math.sin(a) * 0.68,
      Math.cos(a) * 0.68,
      0,
    );
    tile.scale.set(0.75, 1, 1);
  }
  mesh(mosaic, new THREE.CircleGeometry(0.32, 32), "#eecb76", 0, 0, 0.01);
}
function flowerShop(scene) {
  const g = group(scene, 16, 0, 9, -Math.PI / 2);
  // Dedicated florist sign, curved brass hangers, shelves and individual metal buckets.
  const sign = group(g, -3.1, 4.45, 3.0, 0.72);
  box(sign, 0, 0, 0, 2.15, 1.12, 0.18, "#c99e66", 0.24);
  box(sign, 0, 0, 0.12, 1.98, 0.96, 0.045, "#805f43", 0.2);
  label(
    sign,
    "Flower",
    0,
    -0.1,
    0.16,
    1.78,
    0.47,
    "#fff1da",
    "#805f43",
    "italic bold 105px serif",
  );
  flowerLogo(sign, 0, 0.3, 0.17, 0.2);
  for (const xx of [-0.74, 0.74])
    tube(
      sign,
      [
        [xx, 0.55, 0],
        [xx, 0.86, 0],
        [xx + 0.15, 0.99, 0],
        [xx + 0.24, 0.84, 0],
      ],
      0.024,
      "#d3af6b",
    );
  for (const x of [-3.6, -1.8, 0.2, 2.2, 3.6]) {
    const h = x % 2 === 0 ? 0.45 : 0.15;
    box(g, x, h + 0.24, 2.35, 1.25, 0.48, 0.85, "#bb9868", 0.06);
    for (let i = 0; i < 5; i++)
      box(
        g,
        x - 0.48 + i * 0.24,
        h + 0.25,
        2.8,
        0.2,
        0.4,
        0.04,
        "#cba778",
        0.02,
      );
    bouquetBucket(
      g,
      x,
      h + 0.49,
      2.35,
      0.34,
      x === 2.2 ? "sunflower" : x === 0.2 ? "hydrangea" : "mixed",
    );
    bouquetBucket(g, x + 0.32, 0.23, 3.1, 0.3, x < 0 ? "hydrangea" : "mixed");
  }
  for (const xx of [-3.6, -1.4, 1.1, 3.5])
    flowerBox(g, xx, 4.9, 0.9, 1.85, 0.62, true);
  for (let i = 0; i < 12; i++) {
    foliage(g, -4.2 + i * 0.75, 6.8, 0.7, 0.65, 40);
    for (let j = 0; j < 4; j++)
      flower(
        g,
        -4.2 + i * 0.75 + (random() - 0.5) * 0.5,
        6.95,
        0.95,
        0.12,
        "#f6a9cc",
      );
    if (i % 2 === 0) vine(g, -4.2 + i * 0.75, 6.8, 1.4, 1.7);
  }
  for (const xx of [-3, 0, 3]) {
    lantern(g, xx, 3.65, 1.8, 1.35);
    rod(g, [xx, 4.25, 1.4], [xx, 4.25, 1.8], 0.035, "#8a7f54");
  }
  chalkboard(g, -2.8, 0.23, 3.7, "FRESH FLOWERS", 0.1);
  table(scene, 12.6, 0.23, 12.8, 0.65);
  chair(scene, 12.65, 0.23, 11.8, 0);
  chair(scene, 13.35, 0.23, 13, -Math.PI / 2);
}
function bridge(scene, z = -32) {
  const g = group(scene, 4.2, 0, z);
  const blue = "#73b7c7";
  for (const zz of [-0.9, 0.9]) {
    tube(
      g,
      [
        [-7, 8.5, zz],
        [-4, 10.9, zz],
        [0, 11.6, zz],
        [4, 10.9, zz],
        [7, 8.5, zz],
      ],
      0.16,
      blue,
    );
    tube(
      g,
      [
        [-7, 7.6, zz],
        [-4, 10, zz],
        [0, 10.7, zz],
        [4, 10, zz],
        [7, 7.6, zz],
      ],
      0.13,
      blue,
    );
    for (let i = 0; i <= 18; i++) {
      const x = -7 + (i * 14) / 18,
        yy = 10.7 - 3.1 * (x / 7) ** 2;
      rod(g, [x, yy, zz], [x, yy + 0.86, zz], 0.045, "#b9d7ce");
    }
  }
  for (let i = 0; i < 28; i++) {
    const x = -7 + i * 0.5,
      yy = 10.6 - 3.1 * (x / 7) ** 2;
    box(g, x, yy, 0, 0.48, 0.12, 2.1, "#9fc2bc", 0.025);
  }
  for (const xx of [-7.4, 7.4]) {
    box(g, xx, 4, 0, 0.65, 8, 2.6, "#97b8a8");
    flowerBox(g, xx, 8.1, 0, 1.5, 2.4, true);
  }
}
function streetDetails(scene) {
  // Street furniture occupies a curb strip. A separate clear strip is reserved
  // for walking NPCs at x=11.6 and x=-1.0.
  for (const z of [5.4, -5.5, -16, -28, -43]) {
    flowerBox(scene, 9.9, 0.23, z, 1.15, 1.65, true);
    for (const side of [-1, 1]) {
      const x = side < 0 ? -0.12 : 9.1;
      const g = group(scene, x, 0.23, z + 1.8);
      cylinder(g, 0, 0.36, 0, 0.07, 0.1, 0.7, "#44534d");
      cylinder(
        g,
        0,
        0.66,
        0,
        0.115,
        0.115,
        0.3,
        mat("#ffdfa0", { emissive: "#ffc35b", emissiveIntensity: 0.75 }),
      );
      cylinder(g, 0, 0.83, 0, 0.15, 0.15, 0.055, "#526251");
      sphere(g, 0, 0.91, 0, 0.045, 0.06, 0.045, "#526251");
    }
  }
  for (const z of [-10, 1, 16]) {
    box(scene, -0.48, 0.24, z, 0.54, 0.025, 1.15, "#79817b", 0.02);
    for (let i = 0; i < 10; i++)
      box(
        scene,
        -0.48,
        0.26,
        z - 0.48 + i * 0.105,
        0.42,
        0.012,
        0.028,
        "#303b3e",
        0.005,
      );
  }
  // Zebra crossing across the full asphalt width, aligned to the curb openings.
  for (let i = 0; i < 9; i++)
    box(scene, 4.05, 0.005, 11 + i * 0.39, 8.4, 0.012, 0.22, "#f6edda", 0.008);
  for (const z of [-2.3, -11]) {
    tree(scene, 10.1, z, 6.7, 1.7);
  }
  tree(scene, -3.1, 12.8, 10, 3.3);
  tree(scene, 13.3, 16.7, 9.3, 3.0);
  for (const [x, z] of [
    [-7, -22],
    [-9, -34],
    [18, -19],
    [18, -29],
    [-13, 12],
    [-20, -8],
    [23, 15],
    [-18, -46],
    [19, -48],
  ])
    tree(scene, x, z, 6.5 + random() * 2.5, 2.1);
  // Sidewalk terraces, not placed in the walking lanes.
  umbrella(scene, -8, 3.3, 9, 1.2);
  table(scene, -8, 0.23, 9, 0.55);
  chair(scene, -8.8, 0.23, 9, Math.PI / 2);
  chair(scene, -7.2, 0.23, 9, -Math.PI / 2);
  // An actual bicycle with spokes, frame triangle, fork, handlebar and saddle.
  const bicycle = group(scene, 10, 0.23, -8, 0);
  for (const z of [-0.62, 0.62]) {
    const wheel = torus(
      bicycle,
      0,
      0.43,
      z,
      0.4,
      0.035,
      "#4b6262",
      Math.PI / 2,
    );
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      rod(
        bicycle,
        [0, 0.43, z],
        [0, 0.43 + Math.sin(a) * 0.38, z + Math.cos(a) * 0.38],
        0.007,
        "#c5c7b5",
      );
    }
  }
  for (const [a, b] of [
    [
      [0, 0.43, -0.62],
      [0, 0.86, -0.2],
    ],
    [
      [0, 0.86, -0.2],
      [0, 0.43, 0],
    ],
    [
      [0, 0.43, 0],
      [0, 0.43, -0.62],
    ],
    [
      [0, 0.86, -0.2],
      [0, 0.83, 0.43],
    ],
    [
      [0, 0.83, 0.43],
      [0, 0.43, 0],
    ],
    [
      [0, 0.83, 0.43],
      [0, 0.43, 0.62],
    ],
  ])
    rod(bicycle, a, b, 0.028, "#81b5aa");
  box(bicycle, 0, 0.97, -0.21, 0.19, 0.08, 0.26, "#6c6554");
  rod(bicycle, [0, 0.83, 0.43], [0, 1.12, 0.47], 0.023, "#b5c4b4");
  rod(bicycle, [-0.22, 1.12, 0.47], [0.22, 1.12, 0.47], 0.025, "#566d66");
}
export function refineStreet(scene, { cafe }) {
  seed = 37421;
  flowerBank = new Map();
  cafeInterior(cafe);
  flowerShop(scene);
  streetDetails(scene);
  bridge(scene);
  // Fill the left alley and extend both ends with coherent shopfronts.
  for (const [x, z, w, color, rot] of [
    [-10, 20, 7, "#7aa8a1", 0],
    [-18, 20, 7, "#c59f9c", 0],
    [-20, 4, 7, "#8caca4", Math.PI / 2],
    [-20, -8, 7, "#b6b3a1", Math.PI / 2],
    [-20, -21, 7, "#b7a4bf", Math.PI / 2],
    [17, -44, 7, "#7da999", -Math.PI / 2],
    [-5, -36, 7, "#739f91", Math.PI / 2],
    [17, -56, 7, "#bd9e9e", -Math.PI / 2],
    [-5, -49, 7, "#a7b79a", Math.PI / 2],
  ]) {
    const shop = smallBuilding(scene, x, z, w, color);
    shop.rotation.y = rot;
    for (let i = 0; i < 4; i++)
      flowerBox(shop, -w * 0.35 + i * w * 0.23, 0.24, 0.65, 1.05, 0.55, true);
    for (let i = 0; i < 6; i++) {
      flower(
        shop,
        -w / 2 + (i * w) / 6,
        5.85,
        0.3,
        0.13,
        i % 2 ? "#f8b1c9" : "#fff1bc",
      );
    }
    label(
      shop,
      "Coffee & Bakery",
      0,
      4.4,
      0.35,
      w * 0.7,
      0.42,
      "#f7e4bc",
      "#537b66",
      "italic 74px serif",
    );
  }
  // Side alley steps and planted upper terrace.
  for (let i = 0; i < 14; i++)
    box(
      scene,
      -12,
      0.23 + i * 0.22,
      5 - i * 0.38,
      3,
      0.22,
      0.43,
      "#d6c3a4",
      0.045,
    );
  for (const x of [-13.6, -10.4])
    rod(scene, [x, 0.9, 5.2], [x, 4.0, -0.2], 0.045, "#6e8d84");
  flowerBox(scene, -12, 3.3, -1, 3.6, 1, true);
  for (let i = 0; i < 6; i++) {
    const x = -25 + i * 10;
    const t = tower(
      scene,
      x,
      -71,
      7,
      18 + (i % 3) * 4,
      ["#d8b3c5", "#a4c5bb", "#d5bd99"][i % 3],
      i % 3,
    );
    flowerBox(t, 0, 18.35 + (i % 3) * 4, -2, 5, 1.8, true);
  }
  // Roof gardens and flowering cascades throughout the existing block.
  for (const [x, y, z, w] of [
    [-14, 21.4, -10, 5],
    [-10, 16.4, -18, 4.6],
    [-7, 26, -25, 4.4],
    [-4.5, 27.4, -31, 3.3],
    [13.5, 19.4, -35, 3.8],
    [15, 23.4, -38, 4.5],
  ]) {
    flowerBox(scene, x, y, z, w, 1.1, true);
    for (let i = 0; i < 4; i++)
      vine(scene, x - w / 2 + (i * w) / 3, y + 0.7, z + 0.55, 1 + random());
  }
  // Small flowers across the café parapet, leaving its logo and name legible.
  for (const xx of [-5.7, -4.7, -3.7, 3.9, 4.8, 5.8]) {
    flowerCluster(cafe, xx, 6.8, 0.07, 0.3, "#f2a2c9");
    foliage(cafe, xx, 6.38, -0.2, 0.4, 25);
    for (let j = 0; j < 6; j++)
      flower(
        cafe,
        xx + (random() - 0.5) * 0.55,
        6.55,
        -0.05 + random() * 0.25,
        0.085,
        j % 2 ? "#f6a5c5" : "#fff1bc",
      );
  }
  for (let i = 0; i < 180; i++) {
    const x = 9.15 + random() * 5.5,
      z = -16 + random() * 32;
    instance(
      scene,
      petalGeometry,
      ["#ebbad0", "#f2d0dd", "#ead3aa"][i % 3],
      x,
      0.242,
      z,
      0.035,
      0.006,
      0.055,
      0,
      random() * Math.PI,
    );
  }
  scene.updateMatrixWorld(true);
  for (const { geometry, color, items } of flowerBank.values()) {
    const cells = new Map();
    for (const item of items) {
      const matrix = new THREE.Matrix4().multiplyMatrices(
        item.parent.matrixWorld,
        item.matrix,
      );
      const p = new THREE.Vector3().setFromMatrixPosition(matrix);
      const key = `${Math.floor(p.x / 16)},${Math.floor(p.z / 16)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(matrix);
    }
    for (const matrices of cells.values()) {
      const batch = new THREE.InstancedMesh(
        geometry,
        mat(color),
        matrices.length,
      );
      matrices.forEach((matrix, i) => batch.setMatrixAt(i, matrix));
      batch.castShadow = false;
      batch.receiveShadow = true;
      batch.computeBoundingSphere();
      scene.add(batch);
    }
  }
  flowerBank = null;
}
