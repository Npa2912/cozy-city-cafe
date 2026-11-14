import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installShadowGeometryLOD,sphereError,linearScaleBound} from '../src/shadow-geometry.js';
function fixture(scale=.05){
 const scene=new THREE.Scene(),geometry=new THREE.SphereGeometry(1,8,5),material=new THREE.MeshStandardMaterial();
 const plant=new THREE.InstancedMesh(geometry,material,2);plant.setMatrixAt(0,new THREE.Matrix4().makeScale(scale,scale,scale));plant.setMatrixAt(1,new THREE.Matrix4().makeTranslation(1,0,0).scale(new THREE.Vector3(scale,scale,scale)));plant.userData.streamCell='0,0';plant.castShadow=true;scene.add(plant);scene.updateMatrixWorld(true);
 const sun={intensity:1,castShadow:true,shadow:{camera:{left:-32,right:32},mapSize:{x:2048}}};
 return{scene,plant,geometry,material,sun};
}
test('small-plant shadow proxy stays within half a texel and restores full color geometry/instances/material',()=>{
 const f=fixture(),matrices=f.plant.instanceMatrix.array.slice();let depthGeometry;
 const renderer={shadowMap:{enabled:true,autoUpdate:false,needsUpdate:true,render(){depthGeometry=f.plant.geometry;}}};
 const lod=installShadowGeometryLOD(renderer,f.sun,f.scene);renderer.shadowMap.render([f.sun],f.scene,{});
 assert.notEqual(depthGeometry,f.geometry);assert(depthGeometry.index.count<f.geometry.index.count);assert(sphereError(depthGeometry.parameters.widthSegments,depthGeometry.parameters.heightSegments)*.05<=64/2048*.5);
 assert.equal(f.plant.geometry,f.geometry);assert.equal(f.plant.material,f.material);assert.equal(f.plant.count,2);assert.deepEqual(f.plant.instanceMatrix.array,matrices);assert(lod.stats.proxyTriangles<lod.stats.originalTriangles);lod.dispose();
});
test('a failed shadow draw still restores original high-detail geometry',()=>{
 const f=fixture(),original=()=>{throw Error('lost context')},renderer={shadowMap:{enabled:true,autoUpdate:true,render:original}};
 const lod=installShadowGeometryLOD(renderer,f.sun,f.scene);assert.throws(()=>renderer.shadowMap.render([f.sun],f.scene,{}),/lost context/);assert.equal(f.plant.geometry,f.geometry);lod.dispose();assert.equal(renderer.shadowMap.render,original);
});
test('zero-intensity shadow passes are skipped without removing lighting or casters',()=>{
 const f=fixture();f.sun.intensity=0;let called=0;const renderer={shadowMap:{enabled:true,autoUpdate:false,needsUpdate:true,render(){called++}}};const lod=installShadowGeometryLOD(renderer,f.sun,f.scene);
 renderer.shadowMap.render([f.sun],f.scene,{});assert.equal(called,0);assert.equal(renderer.shadowMap.needsUpdate,false);assert(f.plant.castShadow);assert(f.sun.castShadow);assert.equal(f.plant.geometry,f.geometry);
 f.sun.intensity=1;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.render([f.sun],f.scene,{});assert.equal(called,1);lod.dispose();
});
test('large nearby plants and alpha-cutout casters keep original shadow geometry',()=>{
 const f=fixture(2);let drawn;const renderer={shadowMap:{enabled:true,autoUpdate:true,render(){drawn=f.plant.geometry}}};const lod=installShadowGeometryLOD(renderer,f.sun,f.scene);renderer.shadowMap.render([f.sun],f.scene,{});assert.equal(drawn,f.geometry);
 f.plant.instanceMatrix.version++;f.plant.setMatrixAt(0,new THREE.Matrix4().makeScale(.01,.01,.01));f.plant.setMatrixAt(1,new THREE.Matrix4().makeScale(.01,.01,.01));f.material.alphaTest=.5;renderer.shadowMap.render([f.sun],f.scene,{});assert.equal(drawn,f.geometry);lod.dispose();
});

test('shadow error bound remains conservative under nested affine shear',()=>{
 const matrix=new THREE.Matrix4().set(1,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1),v=new THREE.Vector3(.5257311121,.8506508084,0).normalize();
 const stretch=v.clone().applyMatrix4(matrix).length();assert(matrix.getMaxScaleOnAxis()<stretch);assert(linearScaleBound(matrix.elements)>=stretch);assert.equal(linearScaleBound(new THREE.Matrix4().elements),1);
});
