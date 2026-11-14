import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {encodeChunk,decodeChunk} from '../src/chunk-codec.js';import {budgetRadius,preloadDistance} from '../src/chunk-policy.js';
test('compressed chunks restore exact near geometry, colors, indices, transforms and instances',async()=>{
 const g=new THREE.BoxGeometry(2,3,4);g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*3).fill(.35),3));
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial());m.position.set(7,3,4);m.updateMatrix();m.castShadow=true;
 const inst=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),m.material,2);inst.setMatrixAt(0,new THREE.Matrix4().makeTranslation(5,6,7));inst.setMatrixAt(1,new THREE.Matrix4().makeScale(2,1,3));inst.setColorAt(0,new THREE.Color('#abcdef'));inst.setColorAt(1,new THREE.Color('#7788aa'));inst.computeBoundingSphere();
 const encoded=await encodeChunk([m,inst]),restored=await decodeChunk(encoded);assert(encoded.blob.size<encoded.rawBytes);
 for(let i=0;i<2;i++){const a=[m,inst][i],b=restored[i];assert.deepEqual([...a.geometry.attributes.position.array],[...b.geometry.attributes.position.array]);assert.deepEqual([...a.geometry.index.array],[...b.geometry.index.array]);assert.deepEqual(a.matrix.toArray(),b.matrix.toArray());assert.equal(a.castShadow,b.castShadow);}
 assert.deepEqual(restored[1].geometry.userData.shadowSphere,[1,12,8]);
 assert.deepEqual([...inst.instanceMatrix.array],[...restored[1].instanceMatrix.array]);assert.deepEqual([...inst.instanceColor.array],[...restored[1].instanceColor.array]);assert.deepEqual([...g.attributes.color.array],[...restored[0].geometry.attributes.color.array]);
});
test('loading radius follows measured geometry density and upload budget; fast travel increases prefetch',()=>{
 const records=Array.from({length:20},(_,i)=>({center:{x:i*8,z:0},bytes:12*1048576}));const low=budgetRadius(records,{x:0,z:0},'low'),high=budgetRadius(records,{x:0,z:0},'high');assert(high>low);assert(low>=32);assert(preloadDistance(25,300)>preloadDistance(5,300));assert(preloadDistance(25,900)>preloadDistance(25,50));assert(preloadDistance(1000,100000)<=96);
});
test('restored chunks retain shared geometry identity so instancing survives eviction and reload',async()=>{
 const g=new THREE.SphereGeometry(1,10,7),m=new THREE.MeshStandardMaterial(),objects=[];
 for(let i=0;i<12;i++){const o=new THREE.InstancedMesh(g,m,3);o.position.set(i,0,0);o.updateMatrix();objects.push(o);}
 const restored=await decodeChunk(await encodeChunk(objects));assert(restored.every(o=>o.geometry===restored[0].geometry));assert.equal(restored.length,12);assert(restored.every(o=>o.count===3));assert.deepEqual([...g.attributes.position.array],[...restored[0].geometry.attributes.position.array]);
});
