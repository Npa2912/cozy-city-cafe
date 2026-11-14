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
