import * as THREE from "three";
import {
  mat,
  mesh,
  box,
  cylinder,
  sphere,
  rod,
  torus,
  group,
  label,
  archedWindow,
  tiledRoof,
  vine,
} from "./street.js";
import { flowerBox, table, chair, lantern } from "./refinement.js";

function awning(g, x, y, z, w, color) {
  for (let i = 0; i < Math.ceil(w / 0.5); i++) {
    const width = w / Math.ceil(w / 0.5),
      xx = x - w / 2 + (i + 0.5) * width,
      c = i % 2 ? "#fff1d6" : color;
    const panel = box(g, xx, y, z + 0.65, width + 0.015, 0.09, 1.45, c, 0.025);
    panel.rotation.x = 0.18;
    sphere(g, xx, y - 0.15, z + 1.37, width / 2, 0.19, 0.07, c);
  }
  for (const side of [-1, 1])
    rod(
      g,
      [x + side * w * 0.45, y - 0.12, z],
      [x + side * w * 0.45, y - 0.23, z + 1.25],
      0.025,
      "#b6a383",
    );
}
function railing(g, x, y, z, w, d) {
  for (const zz of [z - d / 2, z + d / 2]) {
    rod(g, [x - w / 2, y + 1, zz], [x + w / 2, y + 1, zz], 0.045, "#648e80");
    for (let i = 0; i <= Math.ceil(w / 0.45); i++)
      rod(
        g,
        [x - w / 2 + (i * w) / Math.ceil(w / 0.45), y, zz],
        [x - w / 2 + (i * w) / Math.ceil(w / 0.45), y + 1, zz],
        0.023,
        "#6b9a88",
      );
  }
  for (const xx of [x - w / 2, x + w / 2]) {
    rod(g, [xx, y + 1, z - d / 2], [xx, y + 1, z + d / 2], 0.045, "#648e80");
    for (let i = 0; i <= Math.ceil(d / 0.45); i++)
      rod(
        g,
        [xx, y, z - d / 2 + (i * d) / Math.ceil(d / 0.45)],
        [xx, y + 1, z - d / 2 + (i * d) / Math.ceil(d / 0.45)],
        0.023,
        "#6b9a88",
      );
  }
}
function shutters(g, x, y, z, w, h, color) {
  for (const s of [-1, 1]) {
    box(
      g,
      x + s * (w / 2 + 0.22),
      y + h * 0.42,
      z,
      0.34,
      h * 0.83,
      0.09,
      color,
      0.04,
    );
    for (let i = 0; i < 8; i++)
      box(
        g,
        x + s * (w / 2 + 0.22),
        y + 0.12 + i * h * 0.09,
        z + 0.06,
        0.27,
        0.045,
        0.035,
        "#d4d7b4",
        0.008,
      );
  }
}
function tiled(g, w, d, h, color) {
  const roof = group(g, 0, h, -d / 2);
  tiledRoof(roof, 0, 0, 0, w + 0.65, d + 0.8);
  // Recolor only this new roof; original café roof/materials remain unchanged.
  roof.traverse((o) => {
    if (o.isMesh) {
      const c = new THREE.Color(color);
      if (o.geometry.type === "TubeGeometry") c.multiplyScalar(0.83);
      // Shared colors let the static batcher merge roof ribs across a block.
      o.material = mat("#" + c.getHexString());
    }
  });
  box(g, 0, h - 0.25, -d / 2, w + 0.45, 0.16, d + 0.5, "#f2d9b4", 0.06);
}
function pergola(g, x, y, z, w, d) {
  for (const xx of [-w / 2, w / 2])
    for (const zz of [-d / 2, d / 2])
      rod(g, [x + xx, y, z + zz], [x + xx, y + 2.5, z + zz], 0.065, "#bd9d70");
  for (let i = 0; i < 8; i++)
    rod(
      g,
      [x - w * 0.56, y + 2.5, z - d / 2 + (i * d) / 7],
      [x + w * 0.56, y + 2.5, z - d / 2 + (i * d) / 7],
      0.05,
      "#d3b88a",
    );
  for (const xx of [-w / 2, w / 2])
    rod(
      g,
      [x + xx, y + 2.5, z - d * 0.56],
      [x + xx, y + 2.5, z + d * 0.56],
      0.065,
      "#ad8d61",
    );
  for (const xx of [-w / 2, w / 2]) {
    flowerBox(g, x + xx, y, z - d * 0.42, 0.7, 0.7, true);
    vine(g, x + xx, y + 2.5, z - d / 2, 1.4);
  }
}
function terrace(g, w, d, h) {
  box(g, 0, h, -d / 2, w + 0.5, 0.2, d + 0.5, "#efd9b3", 0.09);
  railing(g, 0, h + 0.1, -d / 2, w - 0.1, d - 0.1);
  for (const xx of [-w * 0.3, 0, w * 0.3])
    flowerBox(g, xx, h + 0.12, -0.2, w * 0.24, 0.55, true);
  const access = group(g, -w * 0.27, h + 0.1, -d * 0.75);
  box(access, 0, 1.05, 0, w * 0.3, 2.1, d * 0.29, "#d4cfb0", 0.12);
  box(access, 0, 2.15, 0, w * 0.34, 0.14, d * 0.34, "#eee1c4", 0.055);
  archedWindow(access, 0, 0.03, d * 0.15, 0.85, 1.9);
  pergola(g, w * 0.12, h + 0.1, -d * 0.43, w * 0.54, d * 0.55);
  table(g, w * 0.12, h + 0.13, -d * 0.43, 0.5);
  chair(g, w * 0.12 - 0.75, h + 0.13, -d * 0.43, Math.PI / 2);
  chair(g, w * 0.12 + 0.75, h + 0.13, -d * 0.43, -Math.PI / 2);
}
function gable(g, w, d, h, color) {
  tiled(g, w, d, h, color);
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.quadraticCurveTo(-w * 0.33, 0.15, 0, 2.0);
  s.quadraticCurveTo(w * 0.33, 0.15, w / 2, 0);
  s.closePath();
  mesh(
    g,
    new THREE.ExtrudeGeometry(s, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSize: 0.07,
      bevelThickness: 0.07,
      bevelSegments: 3,
      curveSegments: 24,
    }),
    "#f2debb",
    0,
    h - 0.1,
    0.18,
  );
  const ring = torus(g, 0, h + 0.75, 0.47, 0.39, 0.065, "#af9070");
  cylinder(g, 0, h + 0.75, 0.46, 0.31, 0.31, 0.06, "#8cb7ba").rotation.x =
    Math.PI / 2;
  tubeRoof(g, w, h);
}
function tubeRoof(g, w, h) {
  // Curved front bargeboards give gables a silhouette distinct from the tile roofs.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-w / 2, h, 0.46),
    new THREE.Vector3(-w * 0.25, h + 0.65, 0.46),
    new THREE.Vector3(0, h + 1.94, 0.46),
    new THREE.Vector3(w * 0.25, h + 0.65, 0.46),
    new THREE.Vector3(w / 2, h, 0.46),
  ]);
  mesh(g, new THREE.TubeGeometry(curve, 40, 0.1, 8, false), "#e1c293");
}
export function districtBuilding(scene, p) {
  const {
    x,
    z,
    w,
    d,
    floors,
    color,
    style,
    sign,
    awning: stripe = "#89afa2",
    rotation = 0,
  } = p;
  const g = group(scene, x, 0, z, rotation);
  g.name = p.id || sign || "garden-home";
  const floor = 3.45,
    h = floors * floor + 0.35,
    trim = "#f2ddba";
  box(g, 0, h / 2, -d / 2, w, h, d, color, 0.24);
  box(g, 0, 0.39, -d / 2, w + 0.12, 0.38, d + 0.14, "#c6b693", 0.08);
  for (let level = 1; level <= floors; level++)
    box(
      g,
      0,
      level * floor + 0.15,
      -d / 2,
      w + 0.3,
      0.18,
      d + 0.3,
      trim,
      0.055,
    );
  for (const xx of [-w / 2 + 0.15, w / 2 - 0.15])
    box(g, xx, h / 2, 0.09, 0.22, h, 0.18, trim, 0.055);
  const bays = style === "duplex" ? 4 : 3,
    bay = w / bays;
  for (let i = 0; i < bays; i++) {
    const xx = -w / 2 + bay * (i + 0.5);
    archedWindow(g, xx, 0.25, 0.04, bay * 0.77, 2.85);
    if (i === Math.floor(bays / 2)) {
      box(g, xx, 1.36, 0.13, 0.055, 2.18, 0.045, "#785d41", 0.01);
      sphere(g, xx + 0.23, 1.21, 0.2, 0.05, 0.05, 0.05, "#d9b36a");
    } else flowerBox(g, xx, 0.24, 0.4, bay * 0.72, 0.47, true);
  }
  for (let level = 1; level < floors; level++) {
    for (let i = 0; i < (style === "duplex" ? 4 : 3); i++) {
      const count = style === "duplex" ? 4 : 3,
        xx = -w / 2 + (w / count) * (i + 0.5),
        ww = (w / count) * 0.58,
        yy = level * floor + 0.55;
      archedWindow(g, xx, yy, 0.055, ww, 2.3);
      shutters(
        g,
        xx,
        yy,
        0.11,
        ww,
        2.3,
        style === "gable" ? "#5a9296" : "#88a58b",
      );
      if ((i + level) % 2 === 0) {
        box(g, xx, yy - 0.08, 0.5, ww + 0.7, 0.16, 1.15, trim, 0.08);
        railing(g, xx, yy, 0.58, ww + 0.55, 0.95);
        flowerBox(g, xx, yy + 0.02, 0.65, ww * 0.8, 0.4, true);
      } else flowerBox(g, xx, yy - 0.09, 0.32, ww * 0.88, 0.43, true);
    }
  }
  for (const side of [-1, 1]) {
    const wall = group(
      g,
      side * (w / 2 + 0.025),
      0,
      -d / 2,
      (side * Math.PI) / 2,
    );
    for (let level = 0; level < floors; level++)
      for (const xx of [-d * 0.23, d * 0.23]) {
        archedWindow(
          wall,
          xx,
          level * floor + 0.4,
          0.02,
          d * 0.32,
          level === 0 ? 2.7 : 2.3,
        );
        if (level > 0)
          flowerBox(wall, xx, level * floor + 0.36, 0.27, d * 0.3, 0.4, true);
      }
  }
  const back = group(g, 0, 0, -d - 0.03, Math.PI);
  for (let level = 0; level < floors; level++)
    for (const xx of [-w * 0.29, 0, w * 0.29]) {
      archedWindow(back, xx, level * floor + 0.42, 0, w * 0.2, 2.3);
      if (level === 1)
        flowerBox(back, xx, level * floor + 0.34, 0.28, w * 0.18, 0.4, true);
    }
  awning(g, 0, 2.93, 0.1, w - 0.45, stripe);
  label(
    g,
    sign || "GARDEN HOUSE",
    0,
    3.22,
    0.25,
    w - 0.6,
    0.39,
    "#fff2cf",
    "#527b68",
    "bold 70px serif",
  );
  for (const xx of [-w * 0.43, w * 0.43]) lantern(g, xx, 2.45, 0.55, 0.85);
  if (style === "terrace" || style === "corner") terrace(g, w, d, h);
  else if (style === "gable") gable(g, w, d, h, "#d88e68");
  else {
    tiled(g, w, d, h, "#d49a72");
    // Paired dormers, rather than another identical monolithic roof.
    for (const xx of [-w * 0.25, w * 0.25]) {
      const dormer = group(g, xx, h + 0.2, -d * 0.43);
      box(dormer, 0, 0.65, 0, 1.6, 1.35, 1.25, trim, 0.13);
      archedWindow(dormer, 0, 0.06, 0.65, 0.96, 1.1);
      tiled(dormer, 1.9, 1.5, 1.4, "#94a9b8");
    }
  }
  if (style === "corner") {
    // Curved oriel: rounded bay at the street corner, with glazing on the curve.
    const bay = group(g, w * 0.32, 0, 0.12),
      r = w * 0.18;
    for (let level = 0; level < floors; level++) {
      cylinder(bay, 0, level * floor + 1.7, 0, r, r, 3.2, color, 48);
      cylinder(
        bay,
        0,
        (level + 1) * floor + 0.08,
        0,
        r + 0.12,
        r + 0.12,
        0.17,
        trim,
        48,
      );
      for (let k = -2; k <= 2; k++) {
        const a = k * 0.5;
        const window = group(
          bay,
          Math.sin(a) * (r + 0.01),
          0,
          Math.cos(a) * (r + 0.01),
          a,
        );
        archedWindow(window, 0, level * floor + 0.4, 0, 0.68, 2.45);
      }
    }
    cylinder(bay, 0, h + 0.08, 0, r + 0.22, r + 0.22, 0.22, trim, 48);
    flowerBox(g, w * 0.29, h + 0.22, 1.0, w * 0.3, 0.55, true);
  }
  for (const xx of [-w * 0.43, w * 0.43])
    vine(g, xx, h - 0.1, 0.16, Math.min(3.2, h * 0.4));
  return g;
}
