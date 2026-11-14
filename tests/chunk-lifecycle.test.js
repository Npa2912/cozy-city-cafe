import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {createChunkStreaming} from '../src/chunk-streaming.js';
test('compressed far source meshes can be garbage-collected while the landscape remains',()=>{
 const script=`import * as T from 'three';import {createChunkStreaming} from './src/chunk-streaming.js';let weak;
 function build(){const s=new T.Scene(),o=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial());o.position.set(400,0,400);s.add(o);weak=new WeakRef(o);const c=new T.PerspectiveCamera(50,1,.1,1000);c.position.set(0,200,0);return createChunkStreaming(s,{domElement:{height:500},shadowMap:{}},c)}
 const chunks=build();await chunks.settle();for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,10));global.gc();}await new Promise(r=>setTimeout(r,10));if(weak.deref())throw Error('Source mesh retained after packing');if(!chunks.records[0].low.children.length)throw Error('Landscape disappeared');chunks.dispose();`;
 const result=spawnSync(process.execPath,['--expose-gc','--input-type=module','-e',script],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:20000});assert.equal(result.status,0,result.stderr||result.error?.message);
});
test('leaving a region cancels a pending warm frame without removing the fallback or disabling culling',async()=>{
 const priorRAF=globalThis.requestAnimationFrame,priorCancel=globalThis.cancelAnimationFrame;
 const callbacks=new Map();let id=0;globalThis.requestAnimationFrame=fn=>{callbacks.set(++id,fn);return id};globalThis.cancelAnimationFrame=n=>callbacks.delete(n);
 const s=new THREE.Scene(),o=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());o.position.set(48,0,0);s.add(o);const c=new THREE.PerspectiveCamera(65,1,.1,1000);c.position.set(48,1.8,0);
 const chunks=createChunkStreaming(s,{domElement:{height:500},shadowMap:{},compileAsync:async()=>{}},c);
 try{
  const deadline=Date.now()+3000;while(!chunks.records[0].cancelWarm&&Date.now()<deadline)await new Promise(r=>setTimeout(r,5));assert(chunks.records[0].cancelWarm,'test must reach a pending frame');assert(callbacks.size>0);
  c.position.set(400,200,400);chunks.update(.3);await Promise.race([chunks.settle(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Cancelled region still blocks streaming')),1000))]);
  assert.equal(chunks.records[0].loading,false);assert(chunks.records[0].low.visible);assert(chunks.records[0].low.children.length);assert(chunks.records[0].high.children.every(o=>o.frustumCulled));assert.equal(callbacks.size,0);
 }finally{chunks.dispose();globalThis.requestAnimationFrame=priorRAF;globalThis.cancelAnimationFrame=priorCancel;}
});
test('abandoning an asynchronous shader compile releases the load slot and assembled geometry',async()=>{
 const s=new THREE.Scene(),o=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());o.position.x=48;s.add(o);const c=new THREE.PerspectiveCamera(65,1,.1,1000);c.position.set(48,1.8,0);
 const chunks=createChunkStreaming(s,{domElement:{height:500},shadowMap:{},compileAsync:()=>new Promise(()=>{})},c);
 try{const until=Date.now()+3000;while(!chunks.records[0].cancelWarm&&Date.now()<until)await new Promise(r=>setTimeout(r,5));assert(chunks.records[0].cancelWarm);c.position.set(400,200,400);chunks.update(.3);await chunks.settle();assert.equal(chunks.records[0].loading,false);assert.equal(chunks.records[0].high.children.length,0);assert(chunks.records[0].low.visible);}finally{chunks.dispose();}
});
test('custom pavement UVs survive the always-visible distant representation',async()=>{
 const {box}=await import('../src/street.js');const s=new THREE.Scene(),o=box(s,80,.08,0,17,.3,5,'#fff');o.geometry=o.geometry.clone();delete o.geometry.userData.sharedPrimitive;o.geometry.userData.preserveUV=true;o.material=new THREE.MeshStandardMaterial({map:new THREE.Texture()});const uv=o.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,3+i*.002,5);const expected=uv.array.slice();
 const c=new THREE.PerspectiveCamera(50,1,.1,1000);c.position.set(0,200,0);const chunks=createChunkStreaming(s,{domElement:{height:500},shadowMap:{}},c);try{await chunks.settle();assert.deepEqual(chunks.records[0].low.children[0].geometry.attributes.uv.array,expected);}finally{chunks.dispose();}
});
test('distant rounded architecture reuses indexed vertices without removing faces',async()=>{
 const {box}=await import('../src/street.js'),{RoundedBoxGeometry}=await import('three/addons/geometries/RoundedBoxGeometry.js');const s=new THREE.Scene(),o=box(s,80,0,0,2,3,4,'#fff',.08);o.material=new THREE.MeshStandardMaterial({map:new THREE.Texture()});const expected=new RoundedBoxGeometry(2,3,4,1,.08),c=new THREE.PerspectiveCamera(50,1,.1,1000);c.position.set(0,200,0);const chunks=createChunkStreaming(s,{domElement:{height:500},shadowMap:{}},c);
 try{await chunks.settle();const g=chunks.records[0].low.children[0].geometry;assert(g.index);assert.equal(g.index.count,expected.attributes.position.count);assert(g.attributes.position.count<expected.attributes.position.count);g.computeBoundingBox();expected.computeBoundingBox();assert(g.boundingBox.equals(expected.boundingBox));}finally{chunks.dispose();expected.dispose();}
});
