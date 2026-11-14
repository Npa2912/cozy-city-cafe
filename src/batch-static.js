import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const colorMaterials=new Map(),instanceMaterials=new Map();
function solidKey(m){
 if(!m.isMeshStandardMaterial||m.transparent||m.map||m.normalMap||m.roughnessMap||m.metalnessMap||m.alphaMap||m.emissiveMap||m.displacementMap||m.vertexColors||m.emissive.r+m.emissive.g+m.emissive.b>.00001)return null;
 return JSON.stringify([m.roughness,m.metalness,m.side,m.flatShading,m.alphaTest,m.depthWrite,m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits]);
}
// Exact geometry and base colors are retained. Compatible opaque solid colors
// share a vertex-colored material per spatial cell, rather than one draw per paint.
function* batchPipeline(scene){
 scene.updateMatrixWorld(true);
 const opaque=new Map(),instances=new Map(),center=new THREE.Vector3();
 scene.traverse(o=>{
  let a=o;while(a&&!a.userData.dynamic)a=a.parent;if(a||!o.isMesh||Array.isArray(o.material)||o.material.transparent)return;
  if(!o.boundingSphere&&o.isInstancedMesh)o.computeBoundingSphere();
  if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();
  center.copy(o.isInstancedMesh?o.boundingSphere.center:o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
  const cell=o.userData.streamCell ?? `${Math.floor(center.x/16)},${Math.floor(center.z/16)}`;
  const solid=solidKey(o.material);
  const key=(solid?`solid:${solid}`:o.material.uuid)+cell+(o.isInstancedMesh?o.geometry.uuid:'')+`:${o.castShadow}:${o.receiveShadow}`;
  const collection=o.isInstancedMesh?instances:opaque;
  if(!collection.has(key))collection.set(key,{objects:[],solid,cell});collection.get(key).objects.push(o);
 });
 for(const {objects,solid,cell}of instances.values()){
  if(objects.length<2){objects[0].userData.streamCell=cell;continue;}const batch=new THREE.InstancedMesh(objects[0].geometry,objects[0].material,objects.reduce((sum,o)=>sum+o.count,0)),matrix=new THREE.Matrix4(),color=new THREE.Color();let index=0;
  if(solid){if(!instanceMaterials.has(solid)){const m=objects[0].material.clone();m.color.set('#fff');instanceMaterials.set(solid,m)}batch.material=instanceMaterials.get(solid);}
  const colored=solid||objects.some(o=>o.instanceColor);
  for(const o of objects){for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);batch.setMatrixAt(index,matrix);if(colored){color.set('#fff');if(o.instanceColor)o.getColorAt(i,color);if(solid)color.multiply(o.material.color);batch.setColorAt(index,color)}index++}o.removeFromParent();o.dispose();}
  batch.castShadow=objects[0].castShadow;batch.receiveShadow=objects[0].receiveShadow;batch.name=`instances:${cell}`;batch.userData.streamCell=cell;batch.computeBoundingSphere();scene.add(batch);yield;
 }
 const pages=[];
 for(const bucket of opaque.values()){
  // Repeated high-detail templates need one vertex buffer, not N transformed
  // copies. Preserve exact matrices/colors; only opaque compatible paints qualify.
  if(bucket.solid){
   const byGeometry=new Map();for(const o of bucket.objects){if(!byGeometry.has(o.geometry))byGeometry.set(o.geometry,[]);byGeometry.get(o.geometry).push(o);}
   const instanced=new Set();
   for(const [geometry,objects]of byGeometry){
    const bytes=Object.values(geometry.attributes).reduce((sum,a)=>sum+a.array.byteLength,0)+(geometry.index?.array.byteLength||0);
    if(objects.length<8||bytes*objects.length<1572864)continue;
    if(!instanceMaterials.has(bucket.solid)){const m=objects[0].material.clone();m.color.set('#fff');instanceMaterials.set(bucket.solid,m);}
    const batch=new THREE.InstancedMesh(geometry,instanceMaterials.get(bucket.solid),objects.length);
    objects.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);batch.setColorAt(i,o.material.color);instanced.add(o);o.removeFromParent();});
    batch.castShadow=objects[0].castShadow;batch.receiveShadow=objects[0].receiveShadow;batch.name=`templates:${bucket.cell}`;batch.userData.streamCell=bucket.cell;batch.computeBoundingSphere();scene.add(batch);yield;
   }
   bucket.objects=bucket.objects.filter(o=>!instanced.has(o));
  }
  let items=[],bytes=0;for(const o of bucket.objects){const n=Object.values(o.geometry.attributes).reduce((s,a)=>s+a.array.byteLength,0)+(o.geometry.index?.array.byteLength||0)+o.geometry.attributes.position.count*(bucket.solid?12:0);if(items.length&&bytes+n>1572864){pages.push({...bucket,objects:items});items=[];bytes=0;}items.push(o);bytes+=n;}if(items.length)pages.push({...bucket,objects:items});
 }
 for(const {objects,solid,cell}of pages){
  if(objects.length<2){objects[0].userData.streamCell=cell;continue;}
  const parts=objects.map(o=>{
   const g=o.geometry.clone();g.clearGroups();g.applyMatrix4(o.matrixWorld);
   if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
   if(solid){const count=g.attributes.position.count,c=new Float32Array(count*3);for(let i=0;i<count;i++){c[i*3]=o.material.color.r;c[i*3+1]=o.material.color.g;c[i*3+2]=o.material.color.b}g.setAttribute('color',new THREE.BufferAttribute(c,3));if(!g.attributes.normal)g.computeVertexNormals();if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(count*2),2));}
   return g;
  });
  const geometry=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!geometry)continue;
  let material=objects[0].material;
  if(solid){if(!colorMaterials.has(solid)){const m=material.clone();m.color.set('#ffffff');m.vertexColors=true;colorMaterials.set(solid,m)}material=colorMaterials.get(solid);}
  const batch=new THREE.Mesh(geometry,material);batch.name=`static:${cell}`;batch.userData.streamCell=cell;batch.castShadow=objects[0].castShadow;batch.receiveShadow=objects[0].receiveShadow;batch.geometry.computeBoundingSphere();
  for(const o of objects){o.removeFromParent();if(!o.geometry.userData.sharedPrimitive)o.geometry.dispose();}
  scene.add(batch);yield;
 }
}

export function batchStaticScene(scene){const pipeline=batchPipeline(scene);while(!pipeline.next().done){}}
export async function batchStaticSceneAsync(scene,budgetMs=4){const pipeline=batchPipeline(scene);let start=performance.now();while(!pipeline.next().done){if(performance.now()-start>=budgetMs){await new Promise(r=>setTimeout(r,0));start=performance.now();}}}
