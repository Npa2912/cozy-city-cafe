import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { batchStaticScene } from "../src/batch-static.js";
test("static batching preserves movable descendants in the van/NPC hierarchy", () => {
  const scene = new THREE.Scene(),
    actor = new THREE.Group();
  actor.userData.dynamic = true;
  scene.add(actor);
  const joint = new THREE.Group();
  actor.add(joint);
  const material = new THREE.MeshStandardMaterial();
  const wheel = new THREE.Mesh(new THREE.BoxGeometry(), material);
  joint.add(wheel);
  for (let i = 0; i < 2; i++) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(), material);
    wall.position.x = i * 3;
    scene.add(wall);
  }
  batchStaticScene(scene);
  assert.equal(wheel.parent, joint);
  assert.equal(joint.parent, actor);
  actor.position.z = 15;
  scene.updateMatrixWorld(true);
  assert.equal(wheel.getWorldPosition(new THREE.Vector3()).z, 15);
  assert.equal(scene.children.filter((o) => o.isMesh).length, 1);
});
test("distant city blocks retain separate culling bounds", () => {
  const scene = new THREE.Scene(),
    material = new THREE.MeshStandardMaterial();
  for (const x of [0, 2, 64, 66]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    mesh.position.x = x;
    scene.add(mesh);
  }
  batchStaticScene(scene);
  const batches = scene.children.filter((o) => o.isMesh);
  assert.equal(batches.length, 2);
  for (const mesh of batches) {
    mesh.geometry.computeBoundingSphere();
    assert(mesh.geometry.boundingSphere.radius < 3);
  }
});
test('compatible paints batch with exact vertex colors, preserving topology and separate emissive windows',()=>{
 const scene=new THREE.Scene(),colors=['#ca957f','#75a99f','#c9b970'];
 for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color:colors[i]}));m.position.x=i*3;scene.add(m)}
 const glow=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({emissive:'#ffaa77',emissiveIntensity:.5}));scene.add(glow);
 const triangles=scene.children.slice(0,3).reduce((s,o)=>s+o.geometry.index.count/3,0);batchStaticScene(scene);
 const b=scene.children.find(o=>o.material.vertexColors);assert(b);assert.equal(b.geometry.index.count/3,triangles);const c=b.geometry.attributes.color;for(const hex of colors){const color=new THREE.Color(hex);assert(Array.from({length:c.count},(_,i)=>Math.abs(c.getX(i)-color.r)<1e-6&&Math.abs(c.getY(i)-color.g)<1e-6&&Math.abs(c.getZ(i)-color.b)<1e-6).some(Boolean))}assert.equal(glow.parent,scene);
});
test('different flower paints share instance batches with exact multiplicative colors and counts',()=>{
 const scene=new THREE.Scene(),g=new THREE.SphereGeometry(1,8,5);
 const a=new THREE.InstancedMesh(g,new THREE.MeshStandardMaterial({color:'#ed94aa'}),2),b=new THREE.InstancedMesh(g,new THREE.MeshStandardMaterial({color:'#e9cf73'}),3);scene.add(a,b);a.setColorAt(0,new THREE.Color('#7799aa'));a.setColorAt(1,new THREE.Color('#ffffff'));
 const expected=new THREE.Color('#ed94aa').multiply(new THREE.Color('#7799aa'));batchStaticScene(scene);const batched=scene.children.find(o=>o.isInstancedMesh);assert.equal(scene.children.length,1);assert.equal(batched.count,5);assert.equal(batched.material.color.getHexString(),'ffffff');const c=new THREE.Color();batched.getColorAt(0,c);assert(Math.abs(c.r-expected.r)<1e-6&&Math.abs(c.g-expected.g)<1e-6&&Math.abs(c.b-expected.b)<1e-6);
});
test('large repeated architecture uses exact templates with original transforms and paints',()=>{
 const s=new THREE.Scene(),g=new THREE.SphereGeometry(1,48,32);
 for(let i=0;i<32;i++){const o=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:i%2?'#ad5544':'#55aa99'}));o.position.set(i*.3,1,0);s.add(o);}
 s.updateMatrixWorld(true);const expected=s.children.map(o=>({matrix:o.matrixWorld.clone(),color:o.material.color.clone()}));batchStaticScene(s);
 assert.equal(s.children.length,1);const o=s.children[0];assert(o.isInstancedMesh);assert.equal(o.geometry,g);assert.equal(o.count,32);
 const m=new THREE.Matrix4(),c=new THREE.Color();for(let i=0;i<32;i++){o.getMatrixAt(i,m);o.getColorAt(i,c);assert(m.elements.every((n,j)=>Math.abs(n-expected[i].matrix.elements[j])<1e-6));assert(['r','g','b'].every(k=>Math.abs(c[k]-expected[i].color[k])<1e-6));}
 assert(o.frustumCulled);assert(o.boundingSphere.radius>1);
});
