import * as THREE from "three";
import {
  group,
  box,
  cylinder,
  sphere,
  rod,
  tube,
  mesh,
  mat,
  artwork,
  label,
  arch,
  tiledRoof,
  foliage,
  pot,
} from "./street.js";
import { table, chair, cup, lantern, flowerBox } from "./refinement.js";
import { person, batchRigidParts } from "./life.js";
import { URBAN_PLAN as P } from "./urban-plan.js";

function roundedPath(x, y, w, h, r = 0.18) {
  const p = new THREE.Path();
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  p.closePath();
  return p;
}
function pos(cafe) {
  const root = cafe;
  cafe = group(root, 0.9, 0, -0.25);
  cafe.name = "staff-pos-assembly";
  const g = group(cafe, P.pos.x, P.pos.y, P.pos.z);
  g.name = "cashier-pos-terminal";
  g.scale.setScalar(0.65);
  box(g, 0, 0, 0, 0.47, 0.055, 0.31, "#54796f", 0.065);
  cylinder(g, 0, 0.14, -0.035, 0.055, 0.08, 0.26, "#637d73");
  const screen = group(g, 0, 0.41, -0.025, -0.0);
  screen.rotation.x = -0.17;
  box(screen, 0, 0, 0, 0.62, 0.43, 0.095, "#3a514b", 0.06);
  const order = artwork(
    (c, W, H) => {
      c.fillStyle = "#eceddc";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#407669";
      c.fillRect(0, 0, W, 64);
      c.font = "bold 34px sans-serif";
      c.fillStyle = "#fff3d5";
      c.fillText("ANTELEO · ORDER", 28, 44);
      c.font = "28px sans-serif";
      c.fillStyle = "#455f51";
      c.fillText("Brown sugar milk tea", 28, 110);
      c.fillText("Café latte", 28, 156);
      c.fillText("Topping · Pearl", 28, 202);
      c.fillStyle = "#e3b965";
      c.fillRect(24, H - 74, W - 48, 48);
      c.fillStyle = "#465f4c";
      c.font = "bold 28px sans-serif";
      c.fillText("TOTAL  8.00  ·  PAY", 42, H - 40);
    },
    512,
    320,
  );
  // Full order display faces the barista; the smaller front display faces guests.
  const back = mesh(
    screen,
    new THREE.PlaneGeometry(0.55, 0.35),
    mat("#fff", {
      map: order,
      emissive: "#d9e3c8",
      emissiveMap: order,
      emissiveIntensity: 0.28,
    }),
    0,
    0,
    -0.053,
  );
  back.rotation.y = Math.PI;
  const customer = artwork(
    (c, W, H) => {
      c.fillStyle = "#4e8475";
      c.fillRect(0, 0, W, H);
      c.textAlign = "center";
      c.fillStyle = "#fff0c3";
      c.font = "bold 53px sans-serif";
      c.fillText("ANTELEO", W / 2, 90);
      c.font = "32px sans-serif";
      c.fillText("Coffee & Milk Tea", W / 2, 155);
      c.fillText("TOTAL  8.00", W / 2, 228);
    },
    512,
    288,
  );
  root.userData.posDisplays = { order, customer };
  mesh(
    screen,
    new THREE.PlaneGeometry(0.52, 0.3),
    mat("#fff", {
      map: customer,
      emissive: "#d2e1be",
      emissiveMap: customer,
      emissiveIntensity: 0.22,
    }),
    0,
    0,
    0.054,
  );
  // Card/NFC terminal, printer, receipt and cash drawer have separate supports.
  const card = group(cafe, -2.26, 1.225, -2.34);
  card.rotation.x = 0.16;
  card.rotation.y = Math.PI;
  box(card, 0, 0.065, 0, 0.23, 0.13, 0.29, "#486a63", 0.035);
  box(
    card,
    0,
    0.14,
    -0.04,
    0.17,
    0.025,
    0.13,
    mat("#b6d1aa", { emissive: "#88ab85", emissiveIntensity: 0.35 }),
    0.015,
  );
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 3; i++)
      box(
        card,
        -0.06 + i * 0.06,
        0.146,
        0.055 + j * 0.047,
        0.035,
        0.016,
        0.027,
        j === 2 && i === 2 ? "#92b77b" : "#d9d5b4",
        0.007,
      );
  box(cafe, -2.72, 1.34, -2.37, 0.35, 0.27, 0.34, "#d4d5bf", 0.06);
  box(cafe, -2.72, 1.47, -2.24, 0.25, 0.025, 0.045, "#52645b", 0.008);
  const receipt = mesh(
    cafe,
    new THREE.PlaneGeometry(0.18, 0.2),
    mat("#fff3d7", { side: THREE.DoubleSide }),
    -2.72,
    1.54,
    -2.2,
  );
  receipt.rotation.x = -0.35;
  for (let i = 0; i < 4; i++)
    box(
      cafe,
      -2.72,
      1.49 + i * 0.025,
      -2.184,
      0.115,
      0.005,
      0.003,
      "#9aab93",
      0.001,
    );
  const drawer = group(cafe, -1.8, 1.045, -2.3);
  drawer.userData.dynamic = true;
  root.userData.cashDrawer = drawer;
  box(drawer, 0, 0, 0, 0.6, 0.16, 0.38, "#5e786b", 0.04);
  for (const x of [-0.16, 0, 0.16])
    box(drawer, x, 0.095, 0, 0.12, 0.012, 0.2, "#b1c9aa", 0.01);
  box(cafe, -1.8, 1.04, -2.1, 0.16, 0.025, 0.02, "#b5be9d", 0.008);
  label(
    cafe,
    "ORDER · THANH TOÁN",
    -1.8,
    0.83,
    -2.235,
    1.0,
    0.18,
    "#f0d8aa",
    "#8c704c",
    "bold 68px sans-serif",
  );
}
function rearPortal(cafe) {
  // Both original rear-wall layers share this opening; the front is untouched.
  const outer = new THREE.Shape(
    roundedPath(-0.75, 0, 1.5, 2.8, 0.25).getPoints(),
  );
  outer.holes.push(roundedPath(-0.6, 0.05, 1.2, 2.66, 0.22));
  mesh(
    cafe,
    new THREE.ExtrudeGeometry(outer, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 3,
    }),
    "#789780",
    P.rearDoor.localX,
    0.34,
    -4.92,
  );
  label(
    cafe,
    "GARDEN ROOM  /  PREP",
    1.4,
    3.35,
    -4.73,
    1.55,
    0.25,
    "#e4d5ab",
    "#60816b",
    "bold 62px sans-serif",
  );
  box(cafe, 1.4, 0.343, -5.13, 1.2, 0.025, 0.75, "#d4bf91", 0.025);
}
function framedWestWall(scene) {
  const g = group(scene, -17.0, P.annex.floorY, -4.85, -Math.PI / 2),
    w = 6.7,
    h = 5.15;
  const wall = new THREE.Shape();
  wall.moveTo(-w / 2, 0);
  wall.lineTo(-0.71, 0);
  wall.lineTo(-0.71, 2.91);
  wall.quadraticCurveTo(-0.71, 3.14, -0.48, 3.14);
  wall.lineTo(0.48, 3.14);
  wall.quadraticCurveTo(0.71, 3.14, 0.71, 2.91);
  wall.lineTo(0.71, 0);
  wall.lineTo(w / 2, 0);
  wall.lineTo(w / 2, h);
  wall.lineTo(-w / 2, h);
  wall.closePath();
  for (const x of [-2.1, 2.1])
    wall.holes.push(
      roundedPath(
        x - 0.71,
        x === 0 ? 0 : 0.82,
        1.42,
        x === 0 ? 3.14 : 2.45,
        0.23,
      ),
    );
  mesh(
    g,
    new THREE.ExtrudeGeometry(wall, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 3,
    }),
    "#e2d6b5",
  );
  for (const x of [-2.1, 0, 2.1]) {
    const y = x === 0 ? 0 : 0.82,
      hh = x === 0 ? 3.14 : 2.45;
    const frame = new THREE.Shape(
      roundedPath(x - 0.82, y - 0.04, 1.64, hh + 0.08, 0.27).getPoints(),
    );
    frame.holes.push(roundedPath(x - 0.71, y, 1.42, hh, 0.23));
    mesh(
      g,
      new THREE.ExtrudeGeometry(frame, {
        depth: 0.1,
        bevelEnabled: true,
        bevelSize: 0.015,
        bevelThickness: 0.015,
        bevelSegments: 2,
      }),
      "#78927a",
      0,
      0,
      0.23,
    );
    box(
      g,
      x,
      y + hh / 2,
      0.26,
      1.4,
      hh - 0.02,
      0.025,
      mat("#cce1d2", { transparent: true, opacity: 0.14, roughness: 0.2 }),
      0.2,
    );
    if (x !== 0) {
      box(g, x, y + hh * 0.52, 0.3, 1.42, 0.055, 0.06, "#78927a", 0.015);
      box(g, x, y + hh * 0.5, 0.3, 0.055, hh, 0.06, "#78927a", 0.015);
    }
  }
}
export function buildCafeAnnex(scene, cafe) {
  pos(cafe);
  rearPortal(cafe);
  const a = P.annex,
    cx = (a.minX + a.maxX) / 2,
    cz = (a.minZ + a.maxZ) / 2;
  const floorMap = artwork(
    (c, W, H) => {
      c.fillStyle = "#c6aa7c";
      c.fillRect(0, 0, W, H);
      for (let j = 0; j < 10; j++) {
        c.fillStyle = j % 2 ? "#d5b98b" : "#c8ad81";
        c.fillRect(0, (j * H) / 10, W, H / 10 - 2);
        c.strokeStyle = "#ac956f";
        for (let i = 0; i < 3; i++)
          c.strokeRect((i * W) / 3 + (j % 2) * 40, (j * H) / 10, W / 3, H / 10);
      }
    },
    512,
    512,
  );
  floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
  floorMap.repeat.set(2, 2);
  box(
    scene,
    cx,
    0.3,
    cz,
    a.maxX - a.minX,
    0.18,
    a.maxZ - a.minZ,
    mat("#fff", { map: floorMap }),
    0.04,
  );
  for (const z of [a.minZ, a.maxZ]) {
    box(scene, cx, 2.94, z, a.maxX - a.minX, 5.1, 0.22, "#e6d9b9", 0.1);
    box(
      scene,
      cx,
      0.64,
      z + (z === a.minZ ? 0.12 : -0.12),
      8.1,
      0.12,
      0.06,
      "#9b9879",
      0.025,
    );
  }
  framedWestWall(scene);
  box(scene, cx, 5.52, cz, 8.5, 0.24, 7.0, "#e8d8b5", 0.1);
  tiledRoof(scene, cx, 5.68, cz, 8.5, 7.0);
  // Clear entrance aisle on the east; working counters run along the west wall.
  // The two prep runs leave a real passage to the west patio door.
  for (const [z, d] of [
    [-6.4, 1.5],
    [-3.225, 1.65],
  ]) {
    box(scene, -16.25, 0.86, z, 1.1, 0.94, d, "#8aa18b", 0.09);
    box(scene, -16.25, 1.38, z, 1.24, 0.12, d + 0.02, "#ecdcb6", 0.055);
  }
  for (const z of [-6.8, -6.0, -3.65, -2.8]) {
    box(scene, -15.67, 0.88, z, 0.035, 0.65, 0.65, "#708c79", 0.025);
    rod(
      scene,
      [-15.63, 0.94, z - 0.13],
      [-15.63, 0.94, z + 0.13],
      0.019,
      "#d1c69e",
    );
  }
  box(scene, -16.2, 1.45, -6.25, 0.73, 0.035, 0.85, "#9eafa5", 0.09);
  box(scene, -16.2, 1.47, -6.25, 0.55, 0.025, 0.65, "#647e77", 0.08);
  tube(
    scene,
    [
      [-16.65, 1.43, -6.25],
      [-16.65, 1.88, -6.25],
      [-16.26, 1.93, -6.25],
      [-16.14, 1.73, -6.25],
    ],
    0.028,
    "#b8c7b7",
  );
  box(scene, -16.55, 2.32, -6.35, 0.6, 0.1, 1.45, "#a48d65", 0.04);
  for (const z of [-6.95, -5.75])
    for (const x of [-16.7, -16.4])
      rod(scene, [x, 1.44, z], [x, 2.32, z], 0.025, "#aa9872");
  for (let i = 0; i < 5; i++) {
    cylinder(
      scene,
      -16.45,
      2.52,
      -6.85 + i * 0.25,
      0.09,
      0.07,
      0.3,
      ["#d9bc8a", "#c59b88", "#c4baa0"][i % 3],
    );
    cylinder(scene, -16.45, 2.69, -6.85 + i * 0.25, 0.1, 0.1, 0.04, "#d5d6bd");
  }
  for (const z of [-3.0, -3.45]) {
    cylinder(
      scene,
      -16.17,
      1.66,
      z,
      0.1,
      0.08,
      0.45,
      mat("#c8d3c5", { metalness: 0.6, roughness: 0.32 }),
    );
    cylinder(scene, -16.17, 1.91, z, 0.07, 0.1, 0.06, "#b4c3b5");
  }
  box(scene, -15.65, 1.53, -2.9, 0.15, 0.2, 0.39, "#e5d8b6", 0.03);
  for (let i = 0; i < 6; i++)
    cylinder(
      scene,
      -15.62,
      1.75,
      -3.02 + i * 0.04,
      0.009,
      0.009,
      0.3,
      "#b7b3a1",
      8,
    );
  // Compact refrigerator and labeled dry stock at the north end.
  box(scene, -15.75, 1.55, -7.5, 1.45, 2.28, 0.64, "#bdc8b3", 0.12);
  box(scene, -15.75, 1.6, -7.15, 1.27, 1.98, 0.04, "#dce0c9", 0.08);
  rod(scene, [-15.23, 1.5, -7.1], [-15.23, 1.95, -7.1], 0.025, "#778d7b");
  label(
    scene,
    "PREP · KEEP FRESH",
    -15.75,
    2.28,
    -7.1,
    1.13,
    0.2,
    "#58725c",
    "#dce0c9",
  );
  box(scene, -13.9, 0.8, -7.7, 1.5, 0.8, 0.6, "#b6a07a", 0.06);
  box(scene, -13.9, 1.6, -7.7, 1.5, 0.12, 0.65, "#8b8266", 0.04);
  for (let i = 0; i < 4; i++) {
    box(
      scene,
      -14.4 + i * 0.34,
      1.02,
      -7.7,
      0.26,
      0.34,
      0.39,
      "#e2ca9d",
      0.025,
    );
    label(
      scene,
      ["TEA", "SUGAR", "PEARL", "CUPS"][i],
      -14.4 + i * 0.34,
      1.03,
      -7.49,
      0.23,
      0.1,
      "#6e7353",
      "#e2ca9d",
    );
  }
  for (const [x, z] of [
    [-12.6, -3.6],
    [-12.4, -5.9],
  ]) {
    table(scene, x, 0.39, z, 0.64);
    chair(scene, x - 0.85, 0.39, z, -Math.PI / 2);
    chair(scene, x + 0.85, 0.39, z, Math.PI / 2);
  }
  const guest = person(scene, {
    x: -13.45,
    z: -3.6,
    color: "#d0b8bd",
    skirt: false,
    heading: Math.PI / 2,
    hair: "#6c4e3c",
  });
  guest.g.position.y = 0.27;
  for (const i of [1, 3]) {
    const leg = guest.limbs[i];
    for (const c of leg.children) c.geometry?.dispose();
    leg.clear();
    rod(leg, [0, 0, 0], [0, -0.07, 0.3], 0.075, "#6b7e83");
    sphere(leg, 0, -0.07, 0.3, 0.075, 0.075, 0.075, "#6b7e83");
    rod(leg, [0, -0.07, 0.3], [0, -0.38, 0.3], 0.065, "#e8d9ba");
    sphere(leg, 0, -0.44, 0.36, 0.1, 0.07, 0.16, "#86674c");
  }
  for (const i of [0, 2]) guest.limbs[i].rotation.x = -1.0;
  batchRigidParts(guest.g);
  for (const x of [-15, -12, -10]) {
    rod(scene, [x, 5.43, -4.6], [x, 4.35, -4.6], 0.018, "#8d8b6d");
    lantern(scene, x, 4.1, -4.6, 1.3);
  }
  const light = new THREE.PointLight("#ffdb94", 10, 9, 2);
  light.position.set(-13.3, 3.6, -4.5);
  scene.add(light);
  // Botanical wall art and a layered indoor plant finish the guest area.
  const print = artwork(
    (c, W, H) => {
      c.fillStyle = "#f0e4c9";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#c59778";
      c.beginPath();
      c.moveTo(W * 0.35, H * 0.66);
      c.lineTo(W * 0.65, H * 0.66);
      c.lineTo(W * 0.6, H * 0.88);
      c.lineTo(W * 0.4, H * 0.88);
      c.closePath();
      c.fill();
      c.strokeStyle = "#78966a";
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(W * 0.5, H * 0.7);
      c.bezierCurveTo(W * 0.4, H * 0.5, W * 0.65, H * 0.28, W * 0.48, H * 0.14);
      c.stroke();
      for (let i = 0; i < 7; i++) {
        c.save();
        c.translate(W * 0.5 + Math.sin(i) * W * 0.07, H * (0.62 - i * 0.065));
        c.rotate(i % 2 ? -0.6 : 0.7);
        c.fillStyle = i % 2 ? "#9aac78" : "#7f9b70";
        c.beginPath();
        c.ellipse(i % 2 ? 27 : -27, 0, 31, 13, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      c.fillStyle = "#d2a4b3";
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        c.beginPath();
        c.ellipse(
          W * 0.48 + Math.cos(a) * 16,
          H * 0.15 + Math.sin(a) * 16,
          13,
          17,
          a,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
    },
    384,
    512,
  );
  const artWall = group(scene, -13.1, 2.85, -1.635, Math.PI);
  for (const x of [-1.5, 0, 1.5]) {
    box(artWall, x, 0, 0, 1.25, 1.6, 0.09, "#bc9b6b", 0.055);
    mesh(
      artWall,
      new THREE.PlaneGeometry(1.09, 1.44),
      mat("#fff", { map: print }),
      x,
      0,
      0.051,
    );
  }
  cylinder(scene, -14.9, 0.69, -2.15, 0.32, 0.23, 0.6, "#c3ad87");
  cylinder(scene, -14.9, 1.005, -2.15, 0.34, 0.34, 0.06, "#d7c49f");
  rod(scene, [-14.9, 1.04, -2.15], [-14.9, 2.3, -2.15], 0.018, "#8a8f65");
  for (let i = 0; i < 4; i++)
    foliage(
      scene,
      -14.9 + Math.sin(i) * 0.09,
      1.2 + i * 0.32,
      -2.15 + Math.cos(i) * 0.06,
      0.23,
      10,
    );
  label(
    scene,
    "ANTELEO · GARDEN ROOM",
    -12.8,
    3.7,
    -8.06,
    3.6,
    0.45,
    "#6d8467",
    "#e6d9b9",
    "italic 75px serif",
  );
  for (const [x, z] of [
    [-10, -2.1],
    [-16.5, -2.1],
    [-11, -7.7],
  ])
    pot(scene, x, 0.39, z, 0.33, true);
  // Patio connects to the existing alley without moving its stairs or buildings.
  box(scene, -18.65, 0.15, -2.8, 3.1, 0.16, 5.5, "#ccb797", 0.06);
  box(scene, -17.35, 0.27, -4.85, 0.52, 0.13, 1.6, "#d6c39f", 0.03);
  table(scene, -18.8, 0.23, -3.1, 0.55);
  chair(scene, -18.8, 0.23, -4, 0);
  chair(scene, -18.8, 0.23, -2.2, Math.PI);
  flowerBox(scene, -19.95, 0.23, -1.2, 1.5, 0.65, true);
  flowerBox(scene, -14.6, 5.85, -1.7, 1.8, 0.75, true);
}
