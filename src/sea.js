import * as THREE from "three";
import {
  mat,
  mesh,
  box,
  cylinder,
  sphere,
  tube,
  rod,
  torus,
  group,
  label,
  foliage,
} from "./street.js";
import { batchRigidParts } from "./life.js";
import { URBAN_PLAN as P } from "./urban-plan.js";

function boat(parent, x, z, scale = 1, sail = false) {
  const g = group(parent, x, -0.4, z, Math.PI / 2);
  g.scale.setScalar(scale);
  g.userData.dynamic = true;
  const outline = new THREE.Shape();
  outline.moveTo(0, 3);
  outline.bezierCurveTo(1.1, 2.6, 1.35, 0, 1, -2.5);
  outline.quadraticCurveTo(0, -3.15, -1, -2.5);
  outline.bezierCurveTo(-1.35, 0, -1.1, 2.6, 0, 3);
  const hull = mesh(
    g,
    new THREE.ExtrudeGeometry(outline, {
      depth: 0.75,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.1,
      bevelSegments: 4,
      curveSegments: 32,
    }),
    sail ? "#8eaebb" : "#408ea8",
    0,
    0.28,
    0,
  );
  hull.rotation.x = Math.PI / 2;
  const deck = mesh(
    g,
    new THREE.ShapeGeometry(outline, 32),
    "#e7d4a4",
    0,
    0.31,
    0,
  );
  deck.rotation.x = Math.PI / 2;
  deck.material.side = THREE.DoubleSide;
  tube(
    g,
    [
      [0, 0.34, 3],
      [0.94, 0.34, 1.6],
      [1.08, 0.34, 0],
      [0.88, 0.34, -2.5],
      [0, 0.34, -2.86],
      [-0.88, 0.34, -2.5],
      [-1.08, 0.34, 0],
      [-0.94, 0.34, 1.6],
      [0, 0.34, 3],
    ],
    0.065,
    "#f4e7bf",
  );
  if (!sail) {
    box(g, 0, 0.91, -0.25, 1.45, 1.15, 1.8, "#f0e6cf", 0.2);
    for (const xx of [-0.36, 0.36])
      box(
        g,
        xx,
        1.06,
        0.68,
        0.57,
        0.53,
        0.04,
        mat("#75afb9", { metalness: 0.2, roughness: 0.25 }),
        0.08,
      );
    for (const side of [-1, 1]) {
      box(g, side * 0.74, 1.05, -0.22, 0.035, 0.56, 1.32, "#79aeb6", 0.07);
      rod(
        g,
        [side * 0.7, 1.58, -1.3],
        [side * 0.7, 1.58, 0.83],
        0.03,
        "#e8d2a5",
      );
    }
    for (const z of [-2.2, 2.1]) {
      cylinder(g, -1.08, 0.45, z, 0.035, 0.05, 0.15, "#b6c3ac");
      rod(g, [-1.21, 0.48, z], [-0.95, 0.48, z], 0.025, "#b6c3ac");
    }
    box(g, 0, 1.57, -0.25, 1.75, 0.15, 2.14, "#6b9fa5", 0.09);
    cylinder(g, 0, 0.66, 2, 0.15, 0.2, 0.55, "#bd9561");
    cylinder(g, 0, 1.8, -0.8, 0.08, 0.08, 0.45, "#667e7b");
    rod(g, [0, 1.65, -0.9], [0, 3.1, -0.9], 0.025, "#bcc9bb");
    const flag = mesh(
      g,
      new THREE.PlaneGeometry(0.48, 0.28),
      mat("#edb97c", { side: THREE.DoubleSide }),
      0.23,
      2.92,
      -0.9,
    );
    flag.rotation.y = -0.1;
    for (const zz of [-2, 1.8]) {
      for (const xx of [-0.95, 0.95])
        rod(g, [xx, 0.35, zz], [xx, 0.85, zz], 0.026, "#c5c7b1");
    }
    for (const side of [-1, 1])
      tube(
        g,
        [
          [side * 0.95, 0.85, -2],
          [side * 1.08, 0.85, 0],
          [side * 0.95, 0.85, 1.8],
        ],
        0.025,
        "#c5c7b1",
      );
    const life = torus(
      g,
      -0.82,
      0.95,
      -0.3,
      0.26,
      0.065,
      "#ed9c65",
      Math.PI / 2,
    );
    label(g, "COZY BAY", 0, 0.1, 2.85, 0.78, 0.18, "#f1e5bf", "#408ea8");
  } else {
    rod(g, [0, 0.4, 0], [0, 5.8, 0], 0.05, "#d4c8aa");
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 5.65);
    sailShape.quadraticCurveTo(-2, 3, -2.3, 1.0);
    sailShape.lineTo(0, 1);
    sailShape.closePath();
    const geo = new THREE.ShapeGeometry(sailShape, 30);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++)
      pos.setZ(
        i,
        Math.sin(((pos.getY(i) - 1) / 4.65) * Math.PI) *
          0.36 *
          (1 - Math.abs(pos.getX(i)) / 3),
      );
    geo.computeVertexNormals();
    mesh(g, geo, mat("#fff5db", { side: THREE.DoubleSide, roughness: 0.9 }));
    rod(g, [-2.3, 1, 0], [0, 1, 0], 0.03, "#c1b48c");
    tube(
      g,
      [
        [0, 5.8, 0],
        [0.7, 2.4, 0],
        [0, 0.4, 2.6],
      ],
      0.01,
      "#d6d9c2",
    );
  }
  batchRigidParts(g);
  return g;
}
function lighthouse(scene) {
  const g = group(scene, 137, 0, -73);
  for (let i = 0; i < 15; i++) {
    const a = i * 2.4,
      r = 5 + Math.sin(i) * 3;
    sphere(
      g,
      Math.cos(a) * r,
      0.2 + Math.sin(i * 3) * 0.6,
      Math.sin(a) * r,
      3.5,
      2.3,
      3.2,
      ["#a6b9b4", "#94adae", "#c5c6b6"][i % 3],
    );
  }
  sphere(g, 0, 1.3, 0, 8.4, 3.0, 7.5, "#acbfa9");
  sphere(g, 0, 3.3, 0, 6.0, 0.9, 5.3, "#9cb871");
  cylinder(g, 0, 8.1, 0, 1.0, 1.4, 8.0, "#f3ead5", 48);
  for (const y of [6.0, 9.0])
    cylinder(
      g,
      0,
      y,
      0,
      1.4 - (y - 4) / 20,
      1.45 - (y - 4) / 20,
      0.85,
      "#dc8877",
      48,
    );
  cylinder(g, 0, 12.2, 0, 1.5, 1.5, 0.19, "#e1cead");
  cylinder(
    g,
    0,
    12.9,
    0,
    0.88,
    0.88,
    1.3,
    mat("#bce1dc", { transparent: true, opacity: 0.65, roughness: 0.2 }),
    24,
  );
  sphere(
    g,
    0,
    12.9,
    0,
    0.34,
    0.5,
    0.34,
    mat("#ffe7a8", { emissive: "#ffc77b", emissiveIntensity: 1 }),
  );
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    rod(
      g,
      [Math.cos(a) * 0.9, 12.25, Math.sin(a) * 0.9],
      [Math.cos(a) * 0.9, 13.55, Math.sin(a) * 0.9],
      0.05,
      "#aa8770",
    );
  }
  cylinder(g, 0, 13.95, 0, 0, 1.6, 0.9, "#d77d70", 32);
  sphere(g, 0, 14.55, 0, 0.1, 0.25, 0.1, "#e3d3b8");
  for (let i = 0; i < 6; i++) foliage(g, -5 + i * 1.6, 3.5, -2, 0.75, 35);
}
export function buildSea(scene) {
  const uniforms = {
    uTime: { value: 0 },
    uShore: { value: P.shoreX },
    uShallow: { value: new THREE.Color("#43c6ca") },
    uDeep: { value: new THREE.Color("#188bb2") },
  };
  // Non-uniform grid: dense where fish and boats are inspected; broad cells
  // extend offshore beyond the horizon. The sea stays on the east map edge.
  const xs = [
    ...Array.from({ length: 35 }, (_, i) => 66 + i * 3),
    220,
    400,
    700,
    1000,
  ];
  const zs = [
    -1000,
    -600,
    -300,
    -180,
    -130,
    ...Array.from({ length: 70 }, (_, i) => -115 + i * 3),
    180,
    300,
    600,
    1000,
  ];
  const vertices = [],
    indices = [];
  for (const z of zs) for (const x of xs) vertices.push(x, 0, z);
  for (let j = 0; j < zs.length - 1; j++)
    for (let i = 0; i < xs.length - 1; i++) {
      const a = j * xs.length + i;
      indices.push(
        a,
        a + xs.length,
        a + 1,
        a + 1,
        a + xs.length,
        a + xs.length + 1,
      );
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `uniform float uTime;varying vec3 vWorld;
 void main(){vec3 p=position;p.y+=sin(p.x*.30+p.z*.18+uTime*.8)*.065+sin(p.z*.62-p.x*.11+uTime*1.2)*.025;vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float uTime;uniform float uShore;uniform vec3 uShallow;uniform vec3 uDeep;varying vec3 vWorld;
 void main(){float shore=clamp(max(vWorld.x-uShore,max(-vWorld.z-100.,vWorld.z-55.))/29.,0.,1.);vec3 c=mix(uShallow,uDeep,shore);
 float a=sin(vWorld.x*6.8+sin(vWorld.z*3.6+uTime)*1.7+uTime*.5);float b=sin(vWorld.z*8.4+sin(vWorld.x*2.4-uTime)*1.4);float lace=pow(clamp(1.-abs(a+b)*.7,0.,1.),15.);
 c+=vec3(.055,.09,.07)*lace*(1.-shore*.95);float crest=pow(max(0.,sin(vWorld.x*.7+vWorld.z*1.2+uTime)*sin(vWorld.z*.7-uTime*.5)),22.);c+=vec3(.15,.25,.23)*crest;
 float foam=(1.-smoothstep(.3,1.8,abs(vWorld.x-uShore)+.22*sin(vWorld.z*2.-uTime)))*(.5+.5*sin(vWorld.z*1.5+uTime));c=mix(c,vec3(.82,.97,.91),foam*.65*step(-100.,vWorld.z)*step(vWorld.z,55.));
 float haze=smoothstep(120.,260.,distance(cameraPosition,vWorld));c=mix(c,vec3(.028,.32,.62),haze*.85);float horizon=1.-smoothstep(170.,320.,distance(cameraPosition,vWorld));gl_FragColor=vec4(c,mix(.56,.99,shore)*horizon);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,
  });
  material.forceSinglePass = true;
  const water = mesh(scene, geometry, material, 0, P.waterY, 0);
  water.castShadow = false;
  water.receiveShadow = false;
  water.userData.dynamic = true;
  water.name = "coastal-water";
  box(scene, 116, -3.8, -20, 100, 0.2, 220, "#70aaa4", 0.03);
  for (let i = 0; i < 19; i++) {
    const z = -57 + i * 5.1;
    if (Math.abs(z - 12) < 5) continue;
    for (let j = 0; j < 3; j++)
      sphere(
        scene,
        67.3 + Math.sin(i * 3 + j) * 0.9,
        -0.72 + j * 0.12,
        z + j * 0.45,
        1.1 + j * 0.18,
        0.65 + j * 0.15,
        0.85 + j * 0.2,
        ["#93b0b2", "#b2c3bd", "#a1b8b6"][j],
      );
  }
  const launch = boat(scene, 76, 5.5, 1, false);
  const sail = boat(scene, 118, -42, 0.8, true);
  // Mooring lines are anchored to pier cleats, not to empty water.
  tube(
    scene,
    [
      [73.8, 0.1, 6.6],
      [72.7, -0.1, 7.2],
      [72.5, 0.37, 9.1],
    ],
    0.018,
    "#c9bb90",
  );
  tube(
    scene,
    [
      [78.1, 0.1, 6.6],
      [79.7, -0.04, 7.3],
      [80, 0.37, 9.1],
    ],
    0.018,
    "#c9bb90",
  );
  lighthouse(scene);
  return {
    update(time) {
      uniforms.uTime.value = time;
      launch.position.y = -0.4 + Math.sin(time * 0.8) * 0.055;
      launch.rotation.z = Math.sin(time * 0.6) * 0.012;
      sail.position.y = -0.4 + Math.sin(time * 0.7 + 2) * 0.045;
      sail.rotation.z = Math.sin(time * 0.55 + 1) * 0.018;
    },
  };
}
