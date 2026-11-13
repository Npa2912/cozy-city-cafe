import {
  mat,
  box,
  cylinder,
  sphere,
  rod,
  tube,
  torus,
  group,
  bench,
  lamp,
  umbrella,
} from "./street.js";
import { flowerBox, tree, table, chair } from "./refinement.js";
import { NEIGHBORHOOD as N } from "./neighborhood-plan.js";
export function matchingRoad(scene, x, z, w, d, source) {
  const material = source.clone();
  material.map = source.map.clone();
  material.map.repeat.set((w / 9) * 6, (d / 135) * 85);
  material.map.needsUpdate = true;
  return box(scene, x, -0.11, z, w, 0.18, d, material, 0.02);
}
export function civicSpaces(scene, tiles, source, paved) {
  const road = N.road;
  matchingRoad(scene, 40, (road.minZ + 27.5) / 2, 7, 27.5 - road.minZ, source);
  // The branch joins the old main road at x=4 and the residential street at x=40.
  matchingRoad(scene, 29, 31, 50, 7, source);
  for (const side of [36.32, 43.68])
    for (let z = -67.6; z < 27.1; z += 0.65)
      box(scene, side, 0.06, z, 0.34, 0.35, 0.61, "#dfcdb2", 0.04);
  for (const z of [27.35, 34.65])
    for (let x = 9.2; x < 54; x += 0.65) {
      if (z < 30 && x > 36.25 && x < 43.75) continue;
      box(scene, x, 0.06, z, 0.61, 0.35, 0.35, "#dfcdb2", 0.04);
    }
  for (let z = -62; z < 24; z += 6)
    box(scene, 40, -0.012, z, 0.14, 0.012, 2.6, "#eee0b8", 0.008);
  for (let x = 12; x < 51; x += 6) {
    if (x > 35 && x < 45) continue;
    box(scene, x, -0.012, 31, 2.4, 0.012, 0.14, "#eee0b8", 0.008);
  }
  for (const z of [24, -9, -42])
    for (let i = 0; i < 8; i++)
      box(
        scene,
        40,
        -0.009,
        z - 1.25 + i * 0.36,
        6.0,
        0.012,
        0.19,
        "#f1e8d5",
        0.006,
      );
  for (let i = 0; i < 9; i++)
    box(scene, 50.8 + i * 0.36, -0.008, 31, 0.19, 0.012, 6.2, "#f1e8d5", 0.006);
  for (const [x, z] of [
    [33.5, 23],
    [45.2, 23],
    [33.5, -18],
    [45.2, -27],
    [33.5, -50],
    [45.2, -61],
  ])
    lamp(scene, x, z, 5.5);
  // End the neighbourhood road at a planted civic garden, not a raw mesh edge.
  paved(scene, 40, -72, 29, 8, tiles);
  for (const x of [29, 40, 51])
    flowerBox(scene, x, 0.23, -73.2, 4.5, 1.1, true);
  for (const x of [29, 51]) tree(scene, x, -71.1, 6.5, 1.65);
  bench(scene, 40, -70.5, 0);
  const plaza = group(scene, N.plaza.x, 0.23, N.plaza.z);
  cylinder(plaza, 0, 0.025, 0, 4.3, 4.3, 0.06, "#d9ba9a", 64);
  for (const r of [3.5, 4.05]) {
    const t = torus(plaza, 0, 0.065, 0, r, 0.045, "#e9d9b8");
    t.rotation.x = Math.PI / 2;
  }
  cylinder(plaza, 0, 0.22, 0, 1.85, 1.95, 0.44, "#e7cfad", 64);
  cylinder(
    plaza,
    0,
    0.45,
    0,
    1.65,
    1.65,
    0.05,
    mat("#69bdcf", { roughness: 0.22, metalness: 0.2 }),
    64,
  );
  const rim = torus(plaza, 0, 0.47, 0, 1.82, 0.12, "#ead8b4");
  rim.rotation.x = Math.PI / 2;
  cylinder(plaza, 0, 0.94, 0, 0.18, 0.3, 1.12, "#e7d8b6");
  cylinder(plaza, 0, 1.52, 0, 0.85, 0.55, 0.17, "#e9dab9", 48);
  cylinder(plaza, 0, 1.64, 0, 0.71, 0.71, 0.05, "#75c8d4", 48);
  cylinder(plaza, 0, 2.05, 0, 0.1, 0.14, 0.8, "#e2d8b9");
  sphere(plaza, 0, 2.51, 0, 0.2, 0.2, 0.2, "#e6d3ad");
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3,
      dx = Math.cos(a),
      dz = Math.sin(a);
    tube(
      plaza,
      [
        [0, 2.55, 0],
        [dx * 0.42, 2.4, dz * 0.42],
        [dx * 0.78, 1.7, dz * 0.78],
        [dx * 1.18, 0.5, dz * 1.18],
      ],
      0.018,
      mat("#c0e9ea", { transparent: true, opacity: 0.65 }),
    );
  }
  // Open rose arbor at the back, kept outside the pavement and fountain basin.
  for (const x of [-3.6, 3.6])
    for (const z of [-3.4, -2.1])
      rod(plaza, [x, 0, z], [x, 3.6, z], 0.07, "#bca06d");
  for (let i = 0; i < 10; i++)
    rod(
      plaza,
      [-3.8, 3.6, -3.4 + i * 0.15],
      [3.8, 3.6, -3.4 + i * 0.15],
      0.045,
      "#ceb481",
    );
  for (const x of [-3.6, 3.6]) {
    flowerBox(plaza, x, 0, -3.0, 0.8, 0.8, true);
    flowerBox(plaza, x, 3.61, -2.75, 1.6, 0.65, true);
  }
  for (const z of [-6.5, 6.5]) {
    flowerBox(scene, 29.4, 0.23, N.plaza.z + z, 4.4, 0.8, true);
    bench(scene, 29.6, N.plaza.z + z * 0.72, z > 0 ? Math.PI : 0);
  }
  tree(scene, 26.8, -7, 6.5, 1.55);
  // Discrete café courts in gaps: paths remain clear along both sides of the road.
  for (const [x, z, rotation] of [
    [30, -37, Math.PI / 2],
    [51, -9, -Math.PI / 2],
    [51, -43, -Math.PI / 2],
    [30, 9, Math.PI / 2],
  ]) {
    const court = group(scene, x, 0.23, z, rotation);
    flowerBox(court, -1.65, 0, -1.1, 1.1, 0.75, true);
    flowerBox(court, 1.65, 0, -1.1, 1.1, 0.75, true);
    table(court, 0, 0, -0.9, 0.55);
    chair(court, -0.8, 0, -0.9, Math.PI / 2);
    chair(court, 0.8, 0, -0.9, -Math.PI / 2);
    umbrella(court, 0, 2.6, -0.9, 1.25);
    rod(court, [0, 0, -0.9], [0, 0.6, -0.9], 0.035, "#dbd8bb");
  }
  for (const [x, z] of [
    [46, -8],
    [46, -26],
    [46, -43],
    [34.5, -36],
    [34.5, -52],
  ]) {
    tree(scene, x, z, 5.6, 1.35);
    flowerBox(scene, x < 40 ? 33.6 : x, 0.23, z + 2, 1.5, 0.75, true);
  }
  // A low garden strip fills rear setbacks without intruding into old buildings.
  for (const z of [-5, -20, -36, -53, -65])
    flowerBox(scene, 26.2, 0.23, z, 1.1, 2.0, true);
}
