import { cachedGeometry } from "./geometry-cache.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import roundedFont from "three/examples/fonts/helvetiker_bold.typeface.json" with { type: "json" };
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// All architecture is real geometry; canvas textures are used only for surface artwork.
const palette = {
  cream: "#e9dab2",
  trim: "#baa27c",
  wood: "#634a39",
  teal: "#256b65",
  glass: "#70b8c0",
  green: "#a5ce69",
  dark: "#343b42",
};
let seed = 7381;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const materials = new Map();
function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra }),
    );
  return materials.get(key);
}
function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(
    geometry,
    typeof material === "string" ? mat(material) : material,
  );
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
function box(parent, x, y, z, w, h, d, color, r = 0.08) {
  return mesh(
    parent,
    cachedGeometry(`box:${w}:${h}:${d}:${r}`,()=>{const g=mergeVertices(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),1e-6);g.userData.boxRecipe=[w,h,d,Math.min(r,w/3,h/3,d/3)];return g;}),
    color,
    x,
    y,
    z,
  );
}
function cylinder(parent, x, y, z, rt, rb, h, color, segments = 32) {
  return mesh(
    parent,
    cachedGeometry(`cylinder:${rt}:${rb}:${h}:${segments}`,()=>new THREE.CylinderGeometry(rt, rb, h, segments)),
    color,
    x,
    y,
    z,
  );
}
function sphere(parent, x, y, z, rx, ry, rz, color) {
  const o = mesh(parent, cachedGeometry("sphere:20:12",()=>new THREE.SphereGeometry(1,20,12)), color, x, y, z);
  o.scale.set(rx, ry, rz);
  return o;
}
function tube(parent, points, r, color) {
  return mesh(
    parent,
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
      32,
      r,
      8,
      false,
    ),
    color,
  );
}
function rod(parent, a, b, r, color) {
  const p = new THREE.Vector3(...a),
    q = new THREE.Vector3(...b);
  const o = cylinder(
    parent,
    ...p.clone().add(q).multiplyScalar(0.5).toArray(),
    r,
    r,
    p.distanceTo(q),
    color,
    12,
  );
  o.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    q.sub(p).normalize(),
  );
  return o;
}
function torus(parent, x, y, z, r, t, color, rotation = 0) {
  const o = mesh(parent, cachedGeometry(`torus:${r}:${t}`,()=>new THREE.TorusGeometry(r,t,10,48)), color, x, y, z);
  o.rotation.y = rotation;
  return o;
}
function group(parent, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}
function artwork(draw, w = 512, h = 256) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function label(
  parent,
  text,
  x,
  y,
  z,
  w,
  h,
  ink = "#f6e8b2",
  bg = "#36766b",
  font = "bold 76px sans-serif",
) {
  const map = artwork(
    (c, W, H) => {
      c.fillStyle = bg;
      c.fillRect(0, 0, W, H);
      c.fillStyle = ink;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = font;
      c.fillText(text, W / 2, H / 2, W - 32);
    },
    1024,
    256,
  );
  return mesh(
    parent,
    new THREE.PlaneGeometry(w, h),
    mat("#ffffff", { map }),
    x,
    y,
    z,
  );
}
function archShape(w, h) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}
function arch(parent, x, y, z, w, h, depth, color) {
  const geometry = cachedGeometry(`arch:${w}:${h}:${depth}`,()=>{
    const g=new THREE.ExtrudeGeometry(archShape(w,h),{depth,bevelEnabled:true,bevelSize:.05,bevelThickness:.04,bevelSegments:3,steps:1,curveSegments:32});
    const uv=g.attributes.uv,p=g.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(p.getX(i)+w/2)/w,p.getY(i)/h);
    const indexed=mergeVertices(g,1e-6);g.dispose();indexed.userData.archRecipe=[w,h,depth];return indexed;
  });
  return mesh(parent, geometry, color, x, y, z);
}
let warmWindow;
function getWarmWindow() {
  if (!warmWindow) {
    const map = artwork(
      (c, W, H) => {
        const glow = c.createLinearGradient(0, 0, 0, H);
        glow.addColorStop(0, "#f2e3bd");
        glow.addColorStop(0.6, "#cda46b");
        glow.addColorStop(1, "#927e59");
        c.fillStyle = glow;
        c.fillRect(0, 0, W, H);
        for (let row = 0; row < 4; row++) {
          const yy = H * 0.25 + row * H * 0.19;
          c.fillStyle = "#9c7248";
          c.fillRect(0, yy + 35, W, 10);
          for (let i = 0; i < 8; i++) {
            const xx = 24 + i * 62;
            c.fillStyle = ["#f2d597", "#e4c5ad", "#acbd91", "#dca2ab"][i % 4];
            c.beginPath();
            c.roundRect(xx, yy, 34, 32, 8);
            c.fill();
            c.fillStyle = "#fff2cb";
            c.fillRect(xx + 5, yy + 3, 4, 19);
          }
        }
        c.fillStyle = "#f8e5a8";
        c.beginPath();
        c.arc(W / 2, 70, 30, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#eee5c0";
        c.lineWidth = 7;
        c.beginPath();
        c.moveTo(0, H * 0.7);
        c.lineTo(W * 0.5, 0);
        c.stroke();
      },
      512,
      768,
    );
    warmWindow = mat("#fff3d6", {
      map,
      emissive: "#f5cf8c",
      emissiveMap: map,
      emissiveIntensity: 0.22,
      roughness: 0.3,
    });
  }
  return warmWindow;
}
function archedWindow(parent, x, y, z, w, h) {
  arch(parent, x, y, z, w, h, 0.13, palette.wood);
  arch(
    parent,
    x,
    y + 0.12,
    z + 0.16,
    w - 0.24,
    h - 0.27,
    0.03,
    getWarmWindow(),
  );
  box(
    parent,
    x,
    y + (h - w / 2) * 0.56,
    z + 0.23,
    0.085,
    h - w / 2 + 0.3,
    0.09,
    palette.wood,
    0.02,
  );
  box(
    parent,
    x,
    y + h - w / 2 - 0.05,
    z + 0.24,
    w - 0.15,
    0.1,
    0.1,
    palette.wood,
    0.02,
  );
  box(parent, x, y + 0.9, z + 0.25, w - 0.15, 0.07, 0.09, palette.wood, 0.02);
  const glint = box(
    parent,
    x - w * 0.2,
    y + h * 0.42,
    z + 0.25,
    0.1,
    h * 0.45,
    0.015,
    "#c1e4d5",
    0.01,
  );
  glint.rotation.z = -0.22;
}
const leafGeo = new THREE.SphereGeometry(1, 10, 7);
function foliage(parent, x, y, z, r = 0.6, count = 28) {
  count = Math.ceil(count * 1.6);
  const leaves = new THREE.InstancedMesh(leafGeo, mat("#79ac48"), count);
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2,
      b = Math.acos(2 * random() - 1),
      d = r * Math.cbrt(random());
    transform.position.set(
      x + Math.sin(b) * Math.cos(a) * d,
      y + Math.cos(b) * d * 0.65,
      z + Math.sin(b) * Math.sin(a) * d,
    );
    transform.rotation.set(random() * 3, random() * 3, random() * 3);
    transform.scale.set(
      0.07 + random() * 0.13,
      0.025 + random() * 0.04,
      0.12 + random() * 0.16,
    );
    transform.updateMatrix();
    leaves.setMatrixAt(i, transform.matrix);
    color.setHSL(
      0.21 + random() * 0.08,
      0.4 + random() * 0.2,
      0.31 + random() * 0.2,
    );
    leaves.setColorAt(i, color);
  }
  leaves.castShadow = true;
  parent.add(leaves);
}
function vine(parent, x, y, z, length = 2) {
  const points = [];
  for (let i = 0; i < 8; i++)
    points.push([
      x + Math.sin(i * 1.4) * 0.18,
      y - (i * length) / 7,
      z + Math.cos(i) * 0.12,
    ]);
  tube(parent, points, 0.025, "#668c3f");
  for (let i = 0; i < 12; i++) {
    const yy = y - (i * length) / 12;
    foliage(parent, x + Math.sin(i * 1.4) * 0.22, yy, z, 0.25, 5);
  }
}
function pot(parent, x, y, z, size = 0.35, flowers = false) {
  cylinder(
    parent,
    x,
    y + size * 0.55,
    z,
    size * 0.82,
    size * 0.58,
    size * 1.1,
    "#b77f51",
  );
  cylinder(
    parent,
    x,
    y + size * 1.1,
    z,
    size * 0.9,
    size * 0.9,
    0.1,
    "#ce996b",
  );
  cylinder(
    parent,
    x,
    y + size * 1.15,
    z,
    size * 0.73,
    size * 0.73,
    0.035,
    "#594c35",
  );
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    const px = x + Math.cos(a) * size * 0.5,
      pz = z + Math.sin(a) * size * 0.5;
    rod(
      parent,
      [px, y + size, pz],
      [px + Math.cos(a) * 0.13, y + size * (2 + random()), pz],
      0.016,
      "#5d8f48",
    );
    const leaf = sphere(
      parent,
      px,
      y + size * 1.8,
      pz,
      size * 0.14,
      size * 0.65,
      size * 0.12,
      "#83b64e",
    );
    leaf.rotation.z = Math.cos(a) * 0.5;
    if (flowers) {
      const yy = y + size * (2.4 + random() * 0.5);
      sphere(
        parent,
        px,
        yy,
        pz,
        0.1,
        0.09,
        0.1,
        ["#edc8d7", "#f7d97a", "#e9ece1"][i % 3],
      );
    }
  }
}
function tiledRoof(parent, x, y, z, w, d) {
  const profile = new THREE.Shape();
  profile.moveTo(-d / 2, 0);
  profile.quadraticCurveTo(-d * 0.18, 0.2, 0, 1.15);
  profile.quadraticCurveTo(d * 0.18, 0.2, d / 2, 0);
  profile.lineTo(d / 2, -0.2);
  profile.lineTo(-d / 2, -0.2);
  profile.closePath();
  const geom = new THREE.ExtrudeGeometry(profile, {
    depth: w,
    bevelEnabled: false,
    curveSegments: 24,
  });
  const roof = mesh(parent, geom, "#d29a71", x - w / 2, y, z);
  roof.rotation.y = Math.PI / 2;
  roof.position.set(x - w / 2, y, z);
  for (let i = 0; i <= Math.ceil(w / 0.48); i++) {
    const xx = x - w / 2 + i * 0.48;
    tube(
      parent,
      [
        [xx, y + 0.06, z + d / 2],
        [xx, y + 0.3, z + d * 0.25],
        [xx, y + 1.18, z],
        [xx, y + 0.3, z - d * 0.25],
        [xx, y + 0.06, z - d / 2],
      ],
      0.09,
      "#c18861",
    );
  }
  box(parent, x, y - 0.12, z + d / 2, w + 0.45, 0.22, 0.23, "#d4bc8e");
  for (let i = 0; i < w / 0.6; i++)
    box(
      parent,
      x - w / 2 + i * 0.6,
      y - 0.37,
      z + d / 2 - 0.1,
      0.19,
      0.28,
      0.32,
      "#b38a50",
    );
}
function paving() {
  return artwork(
    (c, W, H) => {
      c.fillStyle = "#b5a69d";
      c.fillRect(0, 0, W, H);
      const nx = 10,
        ny = 12,
        vertices = [];
      for (let row = 0; row <= ny; row++) {
        vertices[row] = [];
        for (let col = 0; col <= nx; col++)
          vertices[row][col] = [
            (col * W) / nx + (col > 0 && col < nx ? (random() - 0.5) * 19 : 0),
            (row * H) / ny + (row > 0 && row < ny ? (random() - 0.5) * 17 : 0),
          ];
      }
      const tones = [
        "#c9aca0",
        "#ceb4a4",
        "#d8bcaa",
        "#bfa7a6",
        "#ccb7ae",
        "#d1aa9c",
        "#c0adb0",
      ];
      for (let row = 0; row < ny; row++)
        for (let col = 0; col < nx; col++) {
          const corners = [
            vertices[row][col],
            vertices[row][col + 1],
            vertices[row + 1][col + 1],
            vertices[row + 1][col],
          ];
          const cx = corners.reduce((a, p) => a + p[0], 0) / 4,
            cy = corners.reduce((a, p) => a + p[1], 0) / 4;
          const pts = corners.map(([x, y]) => [
            cx + (x - cx) * 0.94,
            cy + (y - cy) * 0.94,
          ]);
          c.beginPath();
          for (let i = 0; i < 4; i++) {
            const p = pts[i],
              before = pts[(i + 3) % 4],
              after = pts[(i + 1) % 4];
            const start = [
              p[0] + (before[0] - p[0]) * 0.12,
              p[1] + (before[1] - p[1]) * 0.12,
            ];
            if (i === 0) c.moveTo(...start);
            else c.lineTo(...start);
            c.quadraticCurveTo(
              p[0],
              p[1],
              p[0] + (after[0] - p[0]) * 0.12,
              p[1] + (after[1] - p[1]) * 0.12,
            );
          }
          c.closePath();
          c.fillStyle = tones[Math.floor(random() * tones.length)];
          c.fill();
          c.strokeStyle = "#dec5b4";
          c.lineWidth = 1.5;
          c.stroke();
        }
    },
    512,
    512,
  );
}
function ground(scene) {
  box(scene, 0, -0.35, -28, 130, 0.4, 150, "#aaa08e");
  const asphalt = artwork((c, W, H) => {
    const data = c.createImageData(W, H);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 200 + Math.floor(random() * 44);
      data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    c.putImageData(data, 0, 0);
  });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.repeat.set(6, 85);
  const roadMaterial = mat("#626363", { map: asphalt });
  box(scene, 4, -0.11, -30, 9, 0.18, 135, roadMaterial);
  const pavement = paving();
  pavement.wrapS = pavement.wrapT = THREE.RepeatWrapping;
  pavement.repeat.set(6, 23);
  const pmat = mat("#ffffff", { map: pavement });
  box(scene, -11, 0.08, -29, 21, 0.3, 134, pmat, 0.05);
  // Branch road exits only beyond the approved core (z=27.5..34.5).
  // Project the original UVs so paving inside the core does not shift.
  for (const [z, d] of [
    [-34.25, 123.5],
    [36.25, 3.5],
  ]) {
    const part = box(scene, 17, 0.08, z, 17, 0.3, d, pmat, 0.05);
    part.geometry = part.geometry.clone();
    delete part.geometry.userData.sharedPrimitive;
    const uv = part.geometry.attributes.uv,
      p = part.geometry.attributes.position,
      n = part.geometry.attributes.normal;
    for (let i = 0; i < uv.count; i++)
      if (Math.abs(n.getY(i)) > 0.9)
        uv.setXY(i, (p.getX(i) + 8.5) / 17, 1 - (p.getZ(i) + z + 96) / 134);
  }
  for (let z = -90; z < 36; z += 0.65) {
    box(scene, -0.38, 0.06, z, 0.4, 0.35, 0.61, "#dfcdb2", 0.045);
    if (z < 27.5 || z > 34.5)
      box(scene, 8.7, 0.06, z, 0.4, 0.35, 0.61, "#dfcdb2", 0.045);
  }
  for (let z = -80; z < 16; z += 7)
    box(scene, 4, 0.005, z, 0.15, 0.015, 2.8, "#eee0b8", 0.01);

  const sidewalk = artwork((c, W, H) => {
    c.fillStyle = "#d58e7d";
    c.fillRect(0, 0, W, H);
    c.strokeStyle = "#e9baa4";
    for (let i = 0; i < 8; i++) {
      c.strokeRect(i * 64, 0, 64, 256);
      c.strokeRect(i * 64 - 32, 256, 64, 256);
    }
  });
  sidewalk.wrapS = sidewalk.wrapT = THREE.RepeatWrapping;
  sidewalk.repeat.set(5, 2);
  box(
    scene,
    -7,
    0.235,
    1.45,
    13,
    0.055,
    2.3,
    mat("#ffffff", { map: sidewalk }),
    0.01,
  );
  return {roadMaterial,pavementMaterial:pmat};
}

function flowerLogo(parent, x, y, z, size = 1) {
  cylinder(parent, x, y, z, size, size, 0.18, "#baa575").rotation.x =
    Math.PI / 2;
  for (let i = 0; i < 7; i++) {
    let a = (i * Math.PI * 2) / 7;
    const petal = sphere(
      parent,
      x + Math.sin(a) * 0.48 * size,
      y + Math.cos(a) * 0.48 * size,
      z + 0.13,
      0.3 * size,
      0.45 * size,
      0.14 * size,
      [
        "#7e83c8",
        "#98a9dc",
        "#a8cbe1",
        "#f0d580",
        "#a7b5e0",
        "#8c83c8",
        "#939fe2",
      ][i],
    );
    petal.rotation.z = -a;
  }
  sphere(
    parent,
    x,
    y,
    z + 0.34,
    0.24 * size,
    0.25 * size,
    0.15 * size,
    "#efc94c",
  );
}
function giantMilkTea(scene) {
  const g = group(scene, 2, 8.1, -2);
  g.name = "anteleo-milk-tea-mascot";
  cylinder(g, 0, 1.78, 0, 1.2, 1.0, 2.2, "#cba77a", 64);
  cylinder(g, 0, 0.12, 0, 0.96, 0.92, 0.24, "#74977b", 64);
  for (let i = 0; i < 20; i++) {
    const a = i * 2.399,
      r = 0.5 + (i % 3) * 0.16;
    sphere(
      g,
      Math.cos(a) * r,
      0.28 + (i % 3) * 0.18,
      Math.sin(a) * r,
      0.17,
      0.17,
      0.17,
      "#5d4439",
    );
  }
  cylinder(
    g,
    0,
    1.45,
    0,
    1.22,
    0.96,
    2.9,
    mat("#e2e6cf", { transparent: true, opacity: 0.23, roughness: 0.22 }),
    64,
  );
  cylinder(g, 0, 2.96, 0, 1.3, 1.3, 0.18, "#92b695", 64);
  sphere(g, 0, 3.03, 0, 1.29, 0.2, 1.29, "#cde0b2");
  const straw = group(g, 0.3, 3.1, 0);
  straw.rotation.z = -0.2;
  cylinder(straw, 0, 0.85, 0, 0.12, 0.12, 1.9, "#b58eab", 32);
  for (const x of [-0.32, 0.32]) {
    sphere(g, x, 1.68, 1.12, 0.075, 0.1, 0.035, "#4c453b");
    sphere(g, x - 0.02, 1.72, 1.15, 0.024, 0.027, 0.012, "#fff3d5");
    sphere(g, x * 1.65, 1.48, 1.1, 0.13, 0.065, 0.026, "#d79691");
  }
  tube(
    g,
    [
      [-0.16, 1.43, 1.16],
      [0, 1.35, 1.19],
      [0.16, 1.43, 1.16],
    ],
    0.028,
    "#735047",
  );
}
function wateringCan(scene) {
  const g = group(scene, 2, 8, -2, -0.1);
  g.scale.set(1.2, 1.55, 1.55);
  cylinder(g, 0, 1.25, 0, 1.24, 1.02, 2.4, "#91bb56", 64);
  const lid = sphere(g, 0, 2.49, 0, 1.32, 0.63, 1.32, "#b5d87d");
  cylinder(g, 0, 2.48, 0, 1.36, 1.36, 0.16, "#83a84d");
  sphere(g, 0, 3.08, 0, 0.17, 0.12, 0.17, "#9fc565");
  tube(
    g,
    [
      [-1.1, 1.8, -0.02],
      [-1.65, 1.1, -0.05],
      [-1.96, 2.1, -0.04],
      [-2.25, 3.0, -0.02],
    ],
    0.3,
    "#9fc56a",
  );
  const rose = cylinder(g, -2.28, 3.04, 0, 0.52, 0.35, 0.25, "#b5d87e");
  rose.rotation.z = 0.3;
  for (let i = 0; i < 18; i++) {
    const a = i * 2.4,
      r = 0.4 * Math.sqrt(i / 18);
    sphere(
      g,
      -2.28 + Math.cos(a) * r,
      3.19,
      Math.sin(a) * r,
      0.042,
      0.02,
      0.042,
      "#82a85a",
    );
  }
  tube(
    g,
    [
      [-0.85, 2.4, -0.3],
      [-1.05, 3.8, -0.4],
      [0, 4.25, -0.45],
      [1.45, 3.6, -0.35],
      [1.5, 1.8, -0.25],
    ],
    0.095,
    "#83ab54",
  );
  sphere(g, 1.13, 1.5, 0, 0.28, 0.4, 0.35, "#83a852");
  return lid;
}
function shop(scene) {
  const g = group(scene, -3.8, 0, -5, Math.PI / 2);
  g.scale.set(1.5, 1.15, 1);
  box(g, -2.85, 3, -5.1, 7.3, 5.8, 0.4, palette.cream, 0.12);
  box(g, 4.25, 3, -5.1, 4.5, 5.8, 0.4, palette.cream, 0.12);
  box(g, 1.4, 4.425, -5.1, 1.2, 2.95, 0.4, palette.cream, 0.08);
  for (const xx of [-6.3, 6.3])
    box(g, xx, 3, -2.4, 0.4, 5.8, 5.5, palette.cream, 0.18);
  box(g, 0, 5.65, -2.5, 13, 0.35, 5.6, palette.cream, 0.15);
  box(g, 0, 0.28, -2.1, 12.4, 0.12, 5.5, "#b19c76");
  box(g, 0, 4.9, -4.8, 11, 0.7, 0.05, "#a6b9a0");
  // Fixed glazing leaves the operable central portal physically clear.
  for (const [x, w] of [
    [-3.9, 4],
    [3.6, 4.6],
  ])
    box(
      g,
      x,
      2.8,
      0.55,
      w,
      4.8,
      0.12,
      mat("#e3e8d5", { transparent: true, opacity: 0.1, roughness: 0.18 }),
    );
  box(g, -3.2, 0.72, -2.8, 5.0, 0.75, 1.1, "#a37c51");
  for (let j = 0; j < 3; j++) {
    box(g, -3.6, 1.6 + j * 0.62, -4.55, 4.2, 0.1, 0.45, "#694f36");
  }
  for (const x of [-4.6, -2.8, 2.4, 4.7]) {
    box(g, x, 2.75, 0.68, 0.13, 4.8, 0.13, palette.wood, 0.03);
    box(g, x, 2.8, 0.75, 1.5, 0.08, 0.1, palette.wood, 0.02);
  }
  box(g, 0, 3.2, 0.74, 12, 0.11, 0.12, palette.wood, 0.02);
  const frame = archShape(3.65, 5.1);
  const hole = new THREE.Path(
    archShape(3.25, 4.76)
      .getPoints(48)
      .reverse()
      .map((p) => new THREE.Vector2(p.x, p.y + 0.15)),
  );
  frame.holes.push(hole);
  mesh(
    g,
    new THREE.ExtrudeGeometry(frame, {
      depth: 0.2,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 3,
    }),
    palette.wood,
    -0.3,
    0.32,
    0.78,
  );
  for (const [x, w] of [
    [-1.54, 0.76],
    [0.94, 0.76],
  ])
    box(
      g,
      x,
      1.95,
      1,
      w,
      3.2,
      0.04,
      mat("#c1ded9", { transparent: true, opacity: 0.14 }),
      0.04,
    );
  box(
    g,
    -0.3,
    4.28,
    1,
    3.25,
    0.85,
    0.04,
    mat("#c1ded9", { transparent: true, opacity: 0.12 }),
  );
  box(g, -0.3, 3.75, 1.1, 3.2, 0.14, 0.12, palette.wood, 0.025);
  box(g, -0.3, 4.25, 1.1, 0.12, 0.9, 0.1, palette.wood, 0.025);
  const hinge = group(g, -1.15, 0.34, 1.04);
  hinge.name = "cafe-door-hinge";
  hinge.userData.dynamic = true;
  g.userData.door = hinge;
  const door = group(hinge, 0.85, 0, 0);
  for (const xx of [-0.8, 0.8])
    box(door, xx, 1.8, 0, 0.14, 3.6, 0.18, palette.wood, 0.06);
  for (const yy of [0.08, 1.2, 2.3, 3.52])
    box(door, 0, yy, 0, 1.7, 0.14, 0.18, palette.wood, 0.04);
  for (const yy of [0.65, 1.77, 2.88])
    box(
      door,
      0,
      yy,
      0.11,
      1.42,
      0.95,
      0.04,
      mat("#90bcc0", {
        transparent: true,
        opacity: 0.18,
        roughness: 0.18,
        metalness: 0.2,
      }),
      0.13,
    );
  torus(door, 0, 2, 0.18, 0.35, 0.06, "#598f68");
  sphere(door, 0, 2, 0.15, 0.31, 0.31, 0.02, "#c08279");
  rod(door, [0.58, 1.3, 0.2], [0.58, 1.8, 0.2], 0.04, "#d2b979");
  box(g, 0, 5.65, 0.45, 13.55, 0.55, 1.12, palette.trim, 0.19);
  box(g, 0, 6.02, 0.48, 13.5, 0.28, 1.2, palette.cream, 0.12);
  // Curved stucco parapet with an inset arch, rather than a box roof.
  const s = new THREE.Shape();
  s.moveTo(-6.8, 0);
  s.lineTo(6.8, 0);
  s.lineTo(6.8, 0.55);
  s.quadraticCurveTo(4.8, 1.15, 2, 1.15);
  s.bezierCurveTo(1.6, 3.0, -1.9, 3.0, -2.8, 1.2);
  s.quadraticCurveTo(-5.3, 1.4, -6.8, 0.75);
  s.closePath();
  mesh(
    g,
    new THREE.ExtrudeGeometry(s, {
      depth: 0.65,
      bevelEnabled: true,
      bevelSize: 0.13,
      bevelThickness: 0.13,
      bevelSegments: 4,
      curveSegments: 48,
    }),
    palette.cream,
    0,
    6.1,
    0.1,
  );
  arch(g, -0.5, 6.25, 0.84, 4.5, 2.45, 0.06, "#c7b995");
  arch(g, -0.5, 6.38, 0.93, 4.12, 2.14, 0.04, "#aaaab9");
  flowerLogo(g, -0.5, 7.35, 1.04, 0.93);
  const lettering = new TextGeometry("ANTELEO", {
    font: new FontLoader().parse(roundedFont),
    size: 0.62,
    depth: 0.16,
    curveSegments: 12,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 3,
  });
  mesh(g, lettering, [mat("#f2d262"), mat("#4e9e78")], 2.05, 6.95, 0.92);
  // Sculpted side pilasters.
  for (const x of [-6.15, 6.15]) {
    box(g, x, 2.8, 0.58, 0.5, 5.5, 0.65, palette.trim, 0.22);
    box(g, x, 0.35, 0.66, 0.68, 0.7, 0.75, palette.cream, 0.12);
  }
  for (const x of [-3.5, 3.1]) {
    rod(g, [x, 5.6, 1], [x, 4.7, 1], 0.018, "#465354");
    cylinder(g, x, 4.67, 1, 0.3, 0.1, 0.16, "#5e7875");
    sphere(
      g,
      x,
      4.56,
      1,
      0.11,
      0.12,
      0.11,
      mat("#fff4c0", { emissive: "#ffe6a3", emissiveIntensity: 0.5 }),
    );
  }
  box(g, 4.9, 0.74, 1.45, 3.7, 0.17, 0.8, "#70503a");
  for (const x of [3.5, 6.2]) box(g, x, 0.42, 1.4, 0.12, 0.6, 0.12, "#4a4440");
  for (let i = 0; i < 8; i++) {
    let x = -5.4 + random() * 10;
    if (Math.abs(x) < 2) x = x < 0 ? -2.8 : 2.8;
    pot(g, x, 0.35, -0.2, 0.24);
  }
  box(g, -1, 0.29, 1.7, 3, 0.035, 1, "#c495a8", 0.2);
  for (let i = 0; i < 11; i++) {
    foliage(g, -6.6 + i * 0.48, 6.4 + Math.sin(i * 0.8) * 0.25, -0.8, 0.6, 24);
    if (i % 2 === 0) vine(g, -6.3 + i * 0.4, 6.3, 0.65, 1.5 + random());
  }
  const canSign = group(g, -5.7, 4.8, 1.4);
  rod(canSign, [0, 0.9, -0.4], [0, 0.9, 0.4], 0.035, "#464e42");
  box(canSign, 0, 0, 0.45, 0.85, 1.25, 0.16, "#b6d77b", 0.12);
  const handle = torus(canSign, -0.43, 0.24, 0.45, 0.31, 0.055, "#b6d77b");
  tube(
    canSign,
    [
      [0.38, -0.3, 0.45],
      [0.62, 0.04, 0.45],
      [0.85, 0.51, 0.45],
    ],
    0.1,
    "#b6d77b",
  );
  const smallFlower = group(canSign, 0, -0.12, 0.57);
  smallFlower.scale.setScalar(0.35);
  flowerLogo(smallFlower, 0, 0, 0, 1);
  // The rooftop sculpture rests on a raised service roof, including from rear views.
  box(g, 2, 6.95, -2.2, 4.4, 2.1, 3.8, palette.cream, 0.25);
  box(g, 2, 8.0, -2.2, 4.6, 0.16, 4.0, palette.trim, 0.08);
  for (let i = 0; i < 5; i++)
    box(g, 4.23, 6.45 + i * 0.19, -2.2, 0.035, 0.07, 1.6, "#b4a582", 0.015);
  giantMilkTea(g);
  return g;
}
function vending(scene, x, z) {
  const g = group(scene, x, 0.3, z, Math.PI / 2);
  box(g, 0, 1.4, 0, 1.9, 2.8, 0.9, "#8273c1", 0.14);
  box(g, 0, 2.86, 0, 2.02, 0.12, 0.98, "#b5a5e2", 0.045);
  box(g, -0.22, 1.7, 0.49, 1.15, 1.75, 0.07, "#393f55", 0.08);
  box(g, -0.22, 1.7, 0.54, 1.01, 1.59, 0.03, "#72b2b8", 0.04);
  for (let j = 0; j < 4; j++) {
    box(g, -0.22, 1.05 + j * 0.39, 0.64, 1.03, 0.045, 0.1, "#b3a8c0");
    for (let i = 0; i < 5; i++) {
      const xx = -0.61 + i * 0.2;
      const yy = 1.19 + j * 0.39;
      cylinder(
        g,
        xx,
        yy,
        0.64,
        0.05,
        0.06,
        0.22,
        ["#b3dfb3", "#eab58a", "#b8d5e1", "#cd9bca", "#f2e0a8"][i],
        12,
      );
      cylinder(g, xx, yy + 0.13, 0.64, 0.034, 0.034, 0.04, "#eef0d7", 8);
    }
  }
  box(g, 0.63, 1.65, 0.53, 0.42, 1.55, 0.1, "#e3d263");
  box(g, 0.63, 2.08, 0.6, 0.3, 0.25, 0.025, "#578080");
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 2; i++)
      box(
        g,
        0.55 + i * 0.16,
        1.42 + j * 0.15,
        0.61,
        0.09,
        0.08,
        0.035,
        "#f6ead5",
        0.02,
      );
  box(g, 0.63, 1.02, 0.61, 0.28, 0.11, 0.035, "#574d59");
  box(g, -0.25, 0.44, 0.5, 1.26, 0.4, 0.1, "#52465c");
  box(g, -0.25, 0.47, 0.56, 1.05, 0.24, 0.05, "#332e3c");
  label(g, "DRINKS", 0, 2.66, 0.49, 1.5, 0.18, "#e9f3c2", "#6daf98");
  for (const xx of [-0.7, 0.7]) box(g, xx, 0.03, 0, 0.18, 0.12, 0.6, "#4e4a55");
}
function barber(scene, x, z) {
  const g = group(scene, x, 0, z);
  rod(g, [0, 2.0, 0], [0, 4.25, 0], 0.11, "#4c4940");
  const stripes = artwork(
    (c, W, H) => {
      c.fillStyle = "#f5ebd7";
      c.fillRect(0, 0, W, H);
      for (let i = -8; i < 12; i++) {
        c.fillStyle = i % 2 ? "#578cc8" : "#dc596d";
        c.beginPath();
        c.moveTo(i * 64, 0);
        c.lineTo(i * 64 + 27, 0);
        c.lineTo(i * 64 + 27 + H * 0.6, H);
        c.lineTo(i * 64 + H * 0.6, H);
        c.closePath();
        c.fill();
      }
    },
    256,
    512,
  );
  cylinder(
    g,
    0,
    3.08,
    0,
    0.3,
    0.3,
    1.2,
    mat("#ffffff", { map: stripes, roughness: 0.28 }),
  );
  cylinder(
    g,
    0,
    3.08,
    0,
    0.315,
    0.315,
    1.22,
    mat("#e5f7f8", { transparent: true, opacity: 0.1, roughness: 0.1 }),
  );
  for (const yy of [2.4, 3.76]) {
    cylinder(g, 0, yy, 0, 0.39, 0.39, 0.14, "#6c6550");
    cylinder(g, 0, yy + 0.13, 0, 0.29, 0.35, 0.12, "#b19a6f");
  }
  sphere(g, 0, 4.02, 0, 0.27, 0.27, 0.27, "#49423f");
}
function bench(scene, x, z, rotation = 0) {
  const g = group(scene, x, 0.23, z, rotation);
  for (const xx of [-1.18, 1.18]) {
    tube(
      g,
      [
        [xx, 0, 0.34],
        [xx - 0.02, 0.38, 0.27],
        [xx, 0.6, 0],
        [xx, 0.65, -0.24],
        [xx, 0.98, -0.43],
        [xx, 1.38, -0.48],
      ],
      0.075,
      "#48534a",
    );
    tube(
      g,
      [
        [xx, 0.0, -0.38],
        [xx, 0.4, -0.27],
        [xx, 0.57, 0.05],
      ],
      0.065,
      "#48534a",
    );
    tube(
      g,
      [
        [xx, 0.57, 0.3],
        [xx, 0.83, 0.3],
        [xx, 0.95, 0.06],
        [xx, 0.88, -0.3],
      ],
      0.045,
      "#48534a",
    );
  }
  for (let i = 0; i < 5; i++)
    box(g, 0, 0.58, -0.27 + i * 0.135, 2.9, 0.12, 0.11, "#cda16a", 0.04);
  for (let i = 0; i < 4; i++)
    box(
      g,
      0,
      0.85 + i * 0.17,
      -0.38 - i * 0.035,
      2.9,
      0.13,
      0.1,
      "#deb47b",
      0.04,
    );
  for (const xx of [-1.14, 1.14])
    for (let i = 0; i < 4; i++)
      sphere(
        g,
        xx,
        0.85 + i * 0.17,
        -0.31 - i * 0.035,
        0.025,
        0.025,
        0.015,
        "#b29358",
      );
  return g;
}
function bin(scene, x, z) {
  const g = group(scene, x, 0.25, z);
  box(g, 0, 0.9, 0, 0.95, 1.8, 0.83, "#777781", 0.2);
  sphere(g, 0, 1.75, 0, 0.47, 0.3, 0.4, "#84808c");
  box(g, 0, 1.42, 0.43, 0.67, 0.44, 0.04, "#333b43", 0.08);
  box(g, 0, 1.17, 0.47, 0.72, 0.08, 0.13, "#a29da3");
  box(g, 0, 0.54, 0.44, 0.7, 0.66, 0.025, "#777781", 0.08);
}
function hydrant(scene, x, z) {
  cylinder(scene, x, 0.56, z, 0.14, 0.18, 0.7, "#ac4145");
  sphere(scene, x, 0.95, z, 0.16, 0.14, 0.16, "#c65356");
  cylinder(scene, x, 0.23, z, 0.25, 0.25, 0.08, "#a13d43");
  rod(scene, [x - 0.29, 0.64, z], [x + 0.29, 0.64, z], 0.1, "#b74a4d");
  for (const dx of [-0.29, 0.29])
    sphere(scene, x + dx, 0.64, z, 0.06, 0.13, 0.13, "#d06362");
}
function lamp(scene, x, z, h = 7) {
  const g = group(scene, x, 0, z);
  box(g, 0, 0.28, 0, 0.72, 0.35, 0.72, "#444552");
  cylinder(g, 0, 0.6, 0, 0.16, 0.27, 0.65, "#41424c");
  cylinder(g, 0, h / 2, 0, 0.07, 0.11, h - 0.5, "#393e48");
  tube(
    g,
    [
      [0, h - 0.8, 0],
      [-0.12, h + 0.2, 0],
      [-0.9, h + 0.6, 0],
      [-1.55, h + 0.42, 0],
      [-1.9, h + 0.1, 0],
    ],
    0.065,
    "#353c40",
  );
  const shade = sphere(g, -1.9, h + 0.02, 0, 0.48, 0.13, 0.28, "#394c43");
  box(
    g,
    -1.9,
    h - 0.04,
    0,
    0.62,
    0.035,
    0.35,
    mat("#fff3b0", { emissive: "#ffd882", emissiveIntensity: 0.7 }),
    0.1,
  );
  return shade;
}
function hangingSign(parent, x, y, z, style = "flower") {
  rod(parent, [x, y + 0.65, z - 0.7], [x, y + 0.65, z + 0.6], 0.065, "#423f3b");
  rod(
    parent,
    [x, y + 0.65, z + 0.45],
    [x, y + 0.25, z + 0.45],
    0.035,
    "#423f3b",
  );
  box(parent, x, y, z + 0.45, 1.1, 1.05, 0.2, "#675a49", 0.14);
  box(parent, x, y, z + 0.57, 0.92, 0.87, 0.035, "#f3e7cf", 0.12);
  if (style === "flower") {
    flowerLogo(parent, x, y, z + 0.61, 0.34);
  } else
    label(parent, "CAFÉ", x, y, z + 0.61, 0.85, 0.45, "#ad8559", "#f3e7cf");
}
function umbrella(scene, x, y, z, r = 1.6) {
  const g = group(scene, x, y, z);
  rod(g, [0, -2, 0], [0, 0.2, 0], 0.035, "#dbd8bb");
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5,
      b = ((i + 1) * Math.PI) / 5;
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    s.absarc(0, 0, r, a, b, false);
    s.lineTo(0, 0);
    const geom = new THREE.ShapeGeometry(s, 8);
    const p = geom.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const xx = p.getX(j),
        yy = p.getY(j);
      p.setZ(j, 0.55 * (1 - Math.hypot(xx, yy) / r));
    }
    geom.computeVertexNormals();
    const part = mesh(
      g,
      geom,
      mat(i % 2 ? "#eee4cf" : "#66b7c3", { side: THREE.DoubleSide }),
    );
    part.rotation.x = -Math.PI / 2;
    tube(
      g,
      [
        [0, 0.55, 0],
        [Math.cos(a) * r * 0.6, 0.25, Math.sin(a) * r * 0.6],
        [Math.cos(a) * r, 0, Math.sin(a) * r],
      ],
      0.015,
      "#e6dfbc",
    );
  }
}
function smallBuilding(scene, x, z, w = 8, color = "#387f70") {
  const g = group(scene, x, 0, z);
  box(g, 0, 2.5, -2.8, w, 5, 5.5, color, 0.18);
  box(g, 0, 0.5, 0.12, w, 0.9, 0.3, "#bca887", 0.09);
  for (let i = 0; i < 2; i++)
    archedWindow(g, -w * 0.25 + i * w * 0.5, 0.28, 0.05, 2, 3.4);
  tiledRoof(g, 0, 5.15, -2.5, w + 1, 6.6);
  box(g, 0, 4.35, 0.16, w, 0.22, 0.27, "#b69d72");
  for (let i = 0; i < 9; i++) {
    foliage(g, -w / 2 + i * 0.6, 5.6, 0, 0.6, 18);
    if (i % 3 === 0) vine(g, -w / 2 + i * 0.6, 5.6, 0.4, 1.7);
  }
  hangingSign(g, w * 0.35, 3.55, 1, "cafe");
  return g;
}
function tower(scene, x, z, w, h, color, variant = 0) {
  const g = group(scene, x, 0, z);
  const d = 5 + random() * 2;
  box(g, 0, h / 2, -d / 2, w, h, d, color, 0.28);
  box(g, 0, h + 0.15, -d / 2, w + 0.35, 0.32, d + 0.35, "#dfddd2", 0.1);
  if (variant === 1) {
    box(g, 0, h + 0.45, -d / 2, w + 0.6, 0.95, d + 0.6, color, 0.4);
    sphere(g, 0, h + 1.2, -d / 2, 0.3, 0.4, 0.3, "#73b880");
  }
  if (variant === 2)
    for (let i = 0; i < 5; i++)
      box(
        g,
        -w * 0.4 + i * w * 0.2,
        h + 0.55,
        0,
        0.4,
        0.8,
        0.55,
        "#e7c85c",
        0.05,
      );
  for (let yy = 1; yy < h; yy += 1.1)
    box(g, w * 0.49, yy, 0, 0.055, 0.022, 0.05, "#b9baaa", 0.005);
  cylinder(g, w * 0.23, h + 0.65, -d * 0.6, 0.55, 0.55, 1.0, "#cfb6ad");
  const floors = Math.floor((h - 1) / 2.3);
  // Window bays continue around the side and rear façades, rather than leaving
  // blank tower sides when the free camera moves off the reference view.
  for (const side of [-1, 1]) {
    for (let j = 0; j < floors; j++) {
      const yy = 2 + j * 2.25;
      for (let i = 0; i < 3; i++) {
        const zz = -d * 0.18 - i * d * 0.32;
        box(
          g,
          side * (w / 2 + 0.025),
          yy,
          zz,
          0.08,
          1.35,
          d * 0.23,
          "#6b9eaf",
          0.04,
        );
        box(
          g,
          side * (w / 2 + 0.09),
          yy - 0.76,
          zz,
          0.24,
          0.1,
          d * 0.28,
          "#eadfcd",
          0.03,
        );
        box(
          g,
          side * (w / 2 + 0.08),
          yy,
          zz,
          0.04,
          1.35,
          0.045,
          "#e2dcca",
          0.01,
        );
      }
      box(
        g,
        side * (w / 2 + 0.03),
        yy - 0.95,
        -d / 2,
        0.1,
        0.06,
        d,
        "#d5d1bf",
        0.02,
      );
    }
    for (const zz of [-0.05, -d + 0.05])
      box(g, side * (w / 2 - 0.08), h / 2, zz, 0.15, h, 0.16, "#dbd9c5", 0.05);
  }
  for (let j = 0; j < floors; j++)
    for (let i = 0; i < 3; i++) {
      const xx = -w * 0.32 + i * w * 0.32,
        yy = 2 + j * 2.25;
      box(g, xx, yy, -d - 0.035, w * 0.23, 1.35, 0.08, "#81adb9", 0.04);
      box(g, xx, yy - 0.76, -d - 0.08, w * 0.27, 0.1, 0.22, "#eadfcd", 0.03);
    }

  for (let j = 0; j < floors; j++) {
    const yy = 2 + j * 2.25;
    for (let i = 0; i < 3; i++) {
      const xx = -w * 0.32 + i * w * 0.32;
      box(
        g,
        xx,
        yy,
        0.06,
        w * 0.23,
        1.35,
        0.1,
        ["#6f9da9", "#4d7c92", "#91b0b6"][j % 3],
        0.045,
      );
      box(g, xx, yy - 0.76, 0.19, w * 0.27, 0.1, 0.25, "#e4dbc5", 0.025);
      box(g, xx, yy, 0.14, 0.055, 1.3, 0.06, "#c7d5cc", 0.01);
    }
    if (variant === 0 && h > 20) {
      box(g, -w * 0.55, yy - 0.75, -d * 0.18, w * 0.35, 0.18, 3.3, "#c1c8c5");
      rod(
        g,
        [-w * 0.68, yy - 0.6, 1],
        [-w * 0.68, yy + 0.15, 1],
        0.025,
        "#bac7c6",
      );
    }
    if (variant === 1) {
      box(g, 0, yy - 0.8, 0.6, w * 0.87, 0.2, 1.3, "#8a9d9c");
      box(g, 0, yy - 0.42, 1.18, w * 0.87, 0.55, 0.12, "#617a7b");
      for (let i = 0; i < 4; i++) {
        foliage(g, -w * 0.3 + i * w * 0.2, yy - 0.15, 1.1, 0.4, 14);
        if (i % 2 === 0) vine(g, -w * 0.3 + i * w * 0.2, yy - 0.16, 1.2, 0.8);
      }
    }
    if (variant === 2) {
      box(g, -w * 0.44, yy, 0.2, 0.3, 1.9, 0.3, "#d5b648");
      box(g, w * 0.44, yy, 0.2, 0.3, 1.9, 0.3, "#d5b648");
    }
  }
  for (let i = 0; i < 3; i++) {
    rod(
      g,
      [-w * 0.3 + i * w * 0.3, h + 0.2, -1],
      [-w * 0.3 + i * w * 0.3, h + 1, -1],
      0.025,
      "#8d9590",
    );
    sphere(g, -w * 0.3 + i * w * 0.3, h + 1, -1, 0.06, 0.07, 0.06, "#ffe3b0");
  }
  if (variant === 2)
    label(g, "CITY", 0, h - 1, 0.2, w * 0.8, 1.3, "#f5de8f", "#b59548");
  return g;
}
function billboard(parent, x, y, z, w, h) {
  box(parent, x, y, z, w + 0.25, h + 0.25, 0.35, "#f0e4d6", 0.2);
  const texture = artwork(
    (c, W, H) => {
      c.fillStyle = "#f5dfc6";
      c.fillRect(0, 0, W, H);
      c.strokeStyle = "#df6679";
      c.lineWidth = 18;
      c.strokeRect(16, 16, W - 32, H - 32);
      c.save();
      c.translate(W / 2, H * 0.5);
      for (let i = 0; i < 12; i++) {
        c.rotate(Math.PI / 6);
        c.fillStyle = i % 2 ? "#f8bd5e" : "#91bbc0";
        c.fillRect(-12, -H * 0.37, 24, H * 0.25);
      }
      c.restore();
      c.fillStyle = "#e1887c";
      c.beginPath();
      c.arc(W / 2, H * 0.5, W * 0.27, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#f8ebce";
      c.beginPath();
      c.arc(W / 2, H * 0.5, W * 0.16, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#528f91";
      c.font = "bold 70px sans-serif";
      c.textAlign = "center";
      c.fillText("COZY", W / 2, H * 0.19);
      c.font = "bold 30px sans-serif";
      c.fillText("FRESH EVERY DAY", W / 2, H * 0.9);
    },
    512,
    1024,
  );
  mesh(
    parent,
    new THREE.PlaneGeometry(w, h),
    mat("#fff", { map: texture }),
    x,
    y,
    z + 0.2,
  );
}
function distantCafe(scene) {
  const g = group(scene, 16, 0, -23.7, -Math.PI / 2);
  g.scale.x = 0.58;
  box(g, 0, 2.5, -2, 11, 5, 5, "#4a9689", 0.5);
  arch(g, 0, 0.3, 0.6, 8.8, 5, 0.2, "#4b9f9f");
  for (let i = 0; i < 5; i++)
    box(g, -3.5 + i * 1.75, 2, 0.95, 1.42, 2.9, 0.12, "#538790", 0.14);
  label(g, "FRESH & COZY", 0, 3.9, 1.1, 7, 0.7, "#f5d5bb", "#3e7f80");
  box(g, 0, 6.8, -1.5, 4, 3.6, 4, "#d0c6a9", 0.22);
  const donutSign = group(g, 0, 4, 0, Math.PI / 2);
  const doughnut = torus(donutSign, 0, 7, -1, 1.75, 0.66, "#e58f9d");
  doughnut.rotation.z = 0.2;
  for (let i = 0; i < 32; i++) {
    const a = random() * Math.PI * 2;
    const rr = 1.5 + random() * 0.45;
    const sprinkle = box(
      donutSign,
      Math.sin(a) * rr,
      7 + Math.cos(a) * rr,
      -0.31,
      0.13,
      0.04,
      0.04,
      ["#ecc28a", "#cf8d83", "#edb6a7"][i % 3],
      0.01,
    );
    sprinkle.rotation.z = random() * 3;
  }
  umbrella(scene, 12.5, 3.1, -34, 2.1);
}
function van(scene, x, z) {
  const g = group(scene, x, 0.35, z);
  box(g, 0, 0.65, 0, 2.1, 1.1, 3.5, "#e7e5c9", 0.2);
  box(g, 0, 1.35, -0.2, 2, 1, 2.8, "#e8e8ce", 0.2);
  box(g, 0, 1.43, 1.22, 1.75, 0.65, 0.06, "#7ba6ad", 0.08);
  for (const xx of [-1.03, 1.03]) {
    box(g, xx, 1.43, -0.1, 0.03, 0.65, 2.5, "#6e9fa3", 0.06);
    for (const zz of [-1, 1]) {
      const wheel = cylinder(g, xx, 0.33, zz, 0.32, 0.32, 0.18, "#373b40", 24);
      wheel.rotation.z = Math.PI / 2;
    }
  }
  box(g, 0, 0.55, 1.79, 1.8, 0.12, 0.07, "#aeb6b1");
}
function scooter(scene, x, z) {
  const g = group(scene, x, 0.4, z, -0.3);
  for (const zz of [-0.53, 0.55]) {
    const w = cylinder(g, 0, 0.27, zz, 0.26, 0.26, 0.2, "#303b43");
    w.rotation.z = Math.PI / 2;
  }
  box(g, 0, 0.65, 0, 0.48, 0.48, 1, "#a9c4c9", 0.18);
  box(g, 0, 0.92, -0.12, 0.49, 0.13, 0.56, "#3b4a50");
  rod(g, [0, 0.4, 0.55], [0, 1.3, 0.44], 0.06, "#929d9a");
  rod(g, [-0.35, 1.3, 0.44], [0.35, 1.3, 0.44], 0.045, "#3c4851");
  sphere(g, 0, 1.15, 0.55, 0.17, 0.15, 0.1, "#e7e3bc");
}
function rightForeground(scene) {
  const g = group(scene, 16, 0, 9, -Math.PI / 2);
  g.name = "core-florist";
  box(g, 0, 4, -3.5, 9, 8, 9, "#286e61", 0.3);
  for (let i = 0; i < 3; i++) archedWindow(g, -2.8 + i * 2.7, 0.3, 1.1, 2, 4.7);
  box(g, 0, 5.5, 1.2, 9.5, 0.3, 0.45, "#739078");
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0, 0.3);
    s.bezierCurveTo(0, 1.4, -1.5, 1.5, -2.5, 1.6);
    s.lineTo(-2.5, 1.35);
    s.bezierCurveTo(-1.4, 1.2, -0.2, 1.1, -0.2, 0);
    s.quadraticCurveTo(-0.1, -0.18, 0, 0);
    const panel = mesh(
      g,
      new THREE.ExtrudeGeometry(s, {
        depth: 1.0,
        bevelEnabled: true,
        bevelSize: 0.04,
        bevelThickness: 0.04,
        bevelSegments: 2,
      }),
      i % 2 ? "#fff1db" : "#5d9b84",
      -4.5 + i * 1.03,
      5.9,
      1.4,
    );
    panel.rotation.y = Math.PI / 2;
  }

  scooter(scene, 13, -4);
  return g;
}
export function buildStreet(scene) {
  seed = 7381;
  const {roadMaterial,pavementMaterial} = ground(scene);
  // Street axis extends from the foreground to the market at the vanishing point.
  tower(scene, -14, -9, 7, 21, "#e6e0d9");
  tower(scene, -10, -17, 6.5, 16, "#e1c35c", 2);
  tower(scene, -7, -24, 6, 25, "#a7cb84", 1);
  tower(scene, -4.5, -30, 4.4, 27, "#d4d2c8");
  tower(scene, 13.5, -34, 5, 19, "#dfadc1");
  tower(scene, 15, -37, 6, 23, "#9ac4d7");
  tower(scene, 18, -47, 6, 16, "#e3b8ab");
  billboard(scene, -4.5, 19, -29.6, 3.1, 9.5);
  const air = group(scene, -3.2, 12, -29.75);
  air.scale.setScalar(0.45);
  box(air, 0, 0, 0, 3.2, 2.5, 1.1, "#dbcfc0", 0.2);
  const fan = cylinder(air, -0.6, 0, 0.65, 0.9, 0.9, 0.13, "#5e6c72");
  fan.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    rod(
      air,
      [-0.6, 0, 0.75],
      [-0.6 + Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.75],
      0.025,
      "#96a3a1",
    );
  }
  smallBuilding(scene, -6, 10, 7, "#28746e").rotation.y = Math.PI / 2;
  const cafe = shop(scene);
  smallBuilding(scene, -5, -19, 7, "#397d69").rotation.y = Math.PI / 2;
  smallBuilding(scene, 16, -17, 7, "#558d78").rotation.y = -Math.PI / 2;
  smallBuilding(scene, 16, -30, 6, "#89ab98").rotation.y = -Math.PI / 2;
  const florist = rightForeground(scene);
  distantCafe(scene);
  vending(scene, -2.6, 3.3);
  barber(scene, -2.6, 5.0);
  bench(scene, 9.7, 8.8, Math.PI / 2);
  bench(scene, 9.7, 2.4, Math.PI / 2);
  bin(scene, 10.0, -0.5);
  hydrant(scene, 10.7, 1.2);
  lamp(scene, 11.2, -0.2, 7.5);
  lamp(scene, 8.9, -18, 6);
  lamp(scene, -0.1, -22, 5.6);
  // Tall near-left utility pole frames the reference view.
  cylinder(scene, -2, 6.1, 9, 0.15, 0.2, 12, "#a3aaa3");
  cylinder(scene, -2, 0.9, 9, 0.32, 0.37, 1.8, "#62667e");
  hangingSign(scene, -2.8, 4.7, 3.3, "cafe");

  umbrella(scene, 13.2, 3.4, -24, 1.7);
  umbrella(scene, 8.8, 2.8, -29, 1.5);
  for (const [x, z] of [
    [12, -2],
    [10.2, -8],
    [-2.2, -18],
    [14, -24],
    [-15, 1],
  ]) {
    pot(scene, x, 0.25, z, 0.5, true);
    pot(scene, x + 0.65, 0.25, z + 0.3, 0.33, true);
  }
  // Awnings, pipes and setbacks keep the side streets detailed from free-camera views.
  for (let i = 0; i < 5; i++) {
    const z = -20 - i * 8;
    box(scene, 16, 3, z, 3, 0.25, 1.2, i % 2 ? "#e6cd9f" : "#649f91");
    rod(scene, [15, 0, z], [15, 5, z], 0.06, "#a5b5a0");
    label(
      scene,
      ["TEA", "CAFE", "FLOWERS", "MARKET", "COZY"][i],
      14,
      4.6,
      z,
      1.4,
      0.55,
      "#f1ddad",
      "#467f79",
    );
  }
  for (let i = 0; i < 9; i++) {
    const rawX = -28 + random() * 60,
      x = rawX > -8 && rawX < 14 ? (rawX < 4 ? -12 : 18) : rawX,
      z = -47 - random() * 35,
      h = 12 + random() * 12;
    tower(
      scene,
      x,
      z,
      4 + random() * 3,
      h,
      ["#d8b5a6", "#a0b6c6", "#c4c9b4", "#e1c983", "#a1bbb1"][i % 5],
    );
  }
  // A painted atmospheric sky avoids hard geometric silhouettes in the clouds.
  const sky = artwork(
    (c, W, H) => {
      const gradient = c.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, "#0878bf");
      gradient.addColorStop(0.48, "#1198dd");
      gradient.addColorStop(0.72, "#8dcce7");
      gradient.addColorStop(1, "#c5e2e9");
      c.fillStyle = gradient;
      c.fillRect(0, 0, W, H);
      for (let cloud = 0; cloud < 26; cloud++) {
        const xx = random() * W,
          yy = H * (0.31 + random() * 0.19),
          size = 22 + random() * 29;
        // Fill the union once, so overlapping lobes form one cloud rather
        // than a row of individually outlined circles.
        c.beginPath();
        for (let p = 0; p < 13; p++) {
          const t = p / 12,
            x = xx + (t - 0.5) * size * 3.5;
          const y =
            yy -
            Math.sin(t * Math.PI) * size * 0.3 +
            (random() - 0.5) * size * 0.22;
          const r =
            size * (0.3 + Math.sin(t * Math.PI) * 0.45 + random() * 0.2);
          c.moveTo(x + r, y);
          c.arc(x, y, r, 0, Math.PI * 2);
        }
        const cloudLight = c.createLinearGradient(0, yy - size, 0, yy + size);
        cloudLight.addColorStop(0, "#ffffff");
        cloudLight.addColorStop(0.45, "#fcfeff");
        cloudLight.addColorStop(1, "#c9e2f4");
        c.fillStyle = cloudLight;
        c.shadowColor = "rgba(245,252,255,.55)";
        c.shadowBlur = 7;
        c.fill();
        c.shadowBlur = 0;
      }
    },
    4096,
    2048,
  );
  sky.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = sky;
  return { cafe, florist, roadMaterial, pavementMaterial };
}

export {
  mat,
  mesh,
  box,
  cylinder,
  sphere,
  tube,
  rod,
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
  bench,
  bin,
  lamp,
  umbrella,
  smallBuilding,
  tower,
};
