import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {batchStaticScene,batchStaticSceneAsync} from './batch-static.js';
import {encodeChunk,decodeChunk} from './chunk-codec.js';
import {CHUNK_POLICY,budgetRadius,preloadDistance} from './chunk-policy.js';
const lowCache=new Map();
function lowGeometry(g,plants=false){
 const key=g.uuid+(plants?":plants":"");if(lowCache.has(key))return lowCache.get(key);const p=g.parameters||{};let low;
 try{
  if(g.userData.archRecipe){const[w,h,d]=g.userData.archRecipe;low=new THREE.ExtrudeGeometry(p.shapes,{...p.options,curveSegments:8,bevelSegments:1});const uv=low.attributes.uv,v=low.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(v.getX(i)+w/2)/w,v.getY(i)/h);}
  else if(g.userData.boxRecipe){const[w,h,d,r]=g.userData.boxRecipe;low=new RoundedBoxGeometry(w,h,d,1,r);}
  else if(g.type==='SphereGeometry')low=new THREE.SphereGeometry(p.radius,Math.min(p.widthSegments,plants?4:8),Math.min(p.heightSegments,plants?3:5),p.phiStart,p.phiLength,p.thetaStart,p.thetaLength);
  else if(g.type==='CylinderGeometry')low=new THREE.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,Math.min(p.radialSegments,12),p.heightSegments,p.openEnded,p.thetaStart,p.thetaLength);
  else if(g.type==='TubeGeometry')low=new THREE.TubeGeometry(p.path,Math.min(p.tubularSegments,12),p.radius,Math.min(p.radialSegments,5),p.closed);
  else if(g.type==='TorusGeometry')low=new THREE.TorusGeometry(p.radius,p.tube,Math.min(p.radialSegments,6),Math.min(p.tubularSegments,24),p.arc);
  else if(g.type==='ExtrudeGeometry')low=new THREE.ExtrudeGeometry(p.shapes,{...p.options,curveSegments:8,bevelSegments:1});
 }catch{low=null;}
 low||=g;low.userData.sharedPrimitive=true;lowCache.set(key,low);return low;
}
const dynamic=o=>{while(o){if(o.userData.dynamic)return true;o=o.parent;}return false;};
function fadeMaterial(source,chunk,high){
 const m=source.clone();const prior=source.onBeforeCompile;
 m.onBeforeCompile=(shader,renderer)=>{prior?.(shader,renderer);shader.uniforms.uChunkFade={value:1};m.userData.chunkShader=shader;shader.fragmentShader='uniform float uChunkFade;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace(/void main\s*\(\s*\)\s*{/,`void main(){float coverage=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);if(coverage${high?'>':'<'}uChunkFade)discard;`);};
 m.customProgramCacheKey=()=>`chunk-fade-v1:${high}:${source.customProgramCacheKey()}`;
 return m;
}
function geometryBytes(o){let n=0;for(const a of Object.values(o.geometry.attributes))n+=a.array.byteLength;if(o.geometry.index)n+=o.geometry.index.array.byteLength;if(o.isInstancedMesh)n+=o.instanceMatrix.array.byteLength+(o.instanceColor?.array.byteLength||0);return n;}
function disposeObjects(objects){for(const o of objects){o.removeFromParent();if(!o.geometry.userData.sharedPrimitive)o.geometry.dispose();if(o.isInstancedMesh)o.dispose();}}
export function createChunkStreaming(scene,renderer,camera){
 scene.updateMatrixWorld(true);const source=[];scene.traverse(o=>{if(o.isMesh&&!dynamic(o)&&!Array.isArray(o.material))source.push(o);});
 const lowScene=new THREE.Scene(),center=new THREE.Vector3();
 for(const o of source){
  if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();if(o.isInstancedMesh&&!o.boundingSphere)o.computeBoundingSphere();center.copy(o.isInstancedMesh?o.boundingSphere.center:o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
  const cell=`${Math.floor(center.x/CHUNK_POLICY.cell)},${Math.floor(center.z/CHUNK_POLICY.cell)}`;o.userData.streamCell=cell;
  const low=o.clone(false);low.geometry=lowGeometry(o.geometry,o.isInstancedMesh);low.matrixAutoUpdate=false;low.matrix.copy(o.matrixWorld);low.userData={...o.userData,streamCell:cell};lowScene.add(low);
 }
 batchStaticScene(lowScene);
 const groups=new Map();
 function groupFor(key){if(!groups.has(key)){const[x,z]=key.split(',').map(Number);groups.set(key,{key,center:new THREE.Vector3((x+.5)*16,0,(z+.5)*16),high:new THREE.Group(),low:new THREE.Group(),sources:[],raw:[],bytes:0,weight:0,wanted:false,packed:null,materials:[],sourceMaterials:[],highMaterials:new Map(),lowMaterials:new Map(),loading:false});}return groups.get(key);}
 for(const o of source){const r=groupFor(o.userData.streamCell),world=o.matrixWorld.clone();o.removeFromParent();o.matrixAutoUpdate=false;o.matrix.copy(world);r.sources.push(o);r.bytes+=geometryBytes(o)+(o.isInstancedMesh?0:o.geometry.attributes.position.count*12);r.sourceMaterials.push(o.material);}
 const lowObjects=[];lowScene.traverse(o=>{if(o.isMesh)lowObjects.push(o);});for(const o of lowObjects){const r=groupFor(o.userData.streamCell),world=o.matrixWorld.clone();o.removeFromParent();o.matrixAutoUpdate=false;o.matrix.copy(world);r.low.add(o);}
 const records=[...groups.values()].filter(r=>r.sources.length);let alive=true,busy=false,packing=false,latency=30,elapsed=0,lastPlan=-100,lastPosition=camera.position.clone(),velocity=new THREE.Vector3(),radius=32,preload=32,dirty=true;
 const stats={chunks:records.length,highChunks:0,highBytes:0,compressedBytes:0,sourceByteEstimate:records.reduce((s,r)=>s+r.bytes,0),radius:32,preload:32,loadMs:0,transitions:0};
 function bind(o,r,high,index){o.userData.originalCast=o.castShadow;const original=high?r.materials[index]:o.material,map=high?r.highMaterials:r.lowMaterials;if(!map.has(original))map.set(original,fadeMaterial(original,r,high));o.material=map.get(original);o.onBeforeRender=()=>{o.material.emissiveIntensity=original.emissiveIntensity;if(o.material.emissive)o.material.emissive.copy(original.emissive);const shader=o.material.userData.chunkShader;if(shader)shader.uniforms.uChunkFade.value=r.weight;};}
 function install(r,objects){r.bytes=objects.reduce((s,o)=>s+geometryBytes(o),0);r.raw=objects;r.materials=objects.map(o=>o.material);objects.forEach((o,i)=>{bind(o,r,true,i);r.high.add(o);});}
 function startPack(r){if(r.packPromise)return r.packPromise;if(r.packed)return Promise.resolve(r.packed);r.packPromise=encodeChunk(r.sources).then(packed=>{r.packed=packed;stats.compressedBytes+=packed.blob.size;if(!r.loading&&r.sources.length){disposeObjects(r.sources);r.sources=[];}return packed;}).catch(e=>{console.warn('Chunk compression unavailable',r.key,e.message);r.packed={unavailable:true};return r.packed;});return r.packPromise;}
 for(const r of records){
  r.high.name=`detail:${r.key}`;r.low.name=`landscape:${r.key}`;r.high.userData.dynamic=r.low.userData.dynamic=true;
  r.pinned=Math.abs(r.center.x)<=8.01&&Math.abs(r.center.z)<=8.01;r.ready=r.pinned;r.weight=r.pinned?1:0;r.high.visible=r.pinned;r.low.visible=!r.pinned;
  r.low.children.forEach(o=>bind(o,r,false));scene.add(r.low,r.high);
  if(r.pinned){startPack(r);const temp=new THREE.Scene();for(const o of r.sources)temp.add(o);batchStaticScene(temp);const objects=[];temp.traverse(o=>{if(o.isMesh)objects.push(o)});install(r,objects);r.sources=[];}
 }
 source.length=0;lowObjects.length=0;
 async function packNext(){if(packing||!alive)return;const r=records.find(q=>!q.packed&&!q.packPromise&&!q.loading);if(!r)return;packing=true;try{await startPack(r);}finally{packing=false;}}
 async function loadNext(){
  if(busy||!alive)return;
  const targets=records.filter(r=>r.wanted&&!r.ready&&!r.loading).sort((a,b)=>(a.priority??0)-(b.priority??0));const r=targets[0];if(!r)return;
  busy=r.loading=true;const start=performance.now();
  try{
   await startPack(r);
   const sources=r.sources.length?r.sources:await decodeChunk(r.packed);
   if(!alive){disposeObjects(sources);return;}
   const temp=new THREE.Scene();for(let i=0;i<sources.length;i++){const o=sources[i];o.material=r.sourceMaterials[i];o.userData.streamCell=r.key;temp.add(o);}
   await batchStaticSceneAsync(temp,4);
   const objects=[];temp.traverse(o=>{if(o.isMesh)objects.push(o)});install(r,objects);r.sources=[];
   for(const o of objects)o.visible=false;
   await renderer.compileAsync(r.high,camera,scene);
   let page=[],pageBytes=0;
   const uploadPage=async()=>{
    for(const o of page){o.visible=true;o.castShadow=false;o.userData.warmFrustum=o.frustumCulled;o.frustumCulled=false;}
    await new Promise(resolve=>{let id,done=false;const finish=()=>{if(done)return;done=true;cancelAnimationFrame(id);r.cancelWarm=null;resolve();};r.cancelWarm=finish;id=requestAnimationFrame(()=>{id=requestAnimationFrame(finish);});});
    for(const o of page){o.visible=false;o.frustumCulled=o.userData.warmFrustum;delete o.userData.warmFrustum;}page=[];pageBytes=0;
   };
   for(const o of objects){if(!alive||!r.wanted)break;const bytes=geometryBytes(o);if(page.length&&(pageBytes+bytes>1572864||page.length>=64)){await uploadPage();if(!alive||!r.wanted)break;}page.push(o);pageBytes+=bytes;}if(page.length&&alive&&r.wanted)await uploadPage();
   for(const o of objects){o.visible=true;o.castShadow=!!o.userData.originalCast&&r.weight>=.5;}
   r.ready=true;latency=latency*.8+(performance.now()-start)*.2;stats.loadMs=latency;
  }catch(e){console.error('Chunk restore failed',r.key,e);}finally{busy=r.loading=false;}
 }
 function plan(level){const projectedError=.08*renderer.domElement.height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.max(1,camera.position.y));const distantOverview=projectedError<.9;radius=budgetRadius(records,camera.position,level);preload=preloadDistance(velocity.length(),latency);const direction=velocity.clone().normalize();const ahead=camera.position.clone().addScaledVector(direction,preload);const facing=camera.getWorldDirection(new THREE.Vector3());facing.y=0;ahead.addScaledVector(facing.normalize(),16);
  for(const r of records){const d=Math.hypot(r.center.x-camera.position.x,r.center.z-camera.position.z),predicted=Math.hypot(r.center.x-ahead.x,r.center.z-ahead.z);const selected=d<radius+16||(d<radius+preload&&predicted<radius);r.priority=d<CHUNK_POLICY.nearRadius?d-1000:d-Math.max(0,r.center.clone().sub(camera.position).normalize().dot(direction))*preload*.7;r.wanted=r.pinned||(!distantOverview&&(selected||(r.wanted&&d<radius+preload+32)));}
  const budget=CHUNK_POLICY.budgetMiB[level]*1048576;let selectedBytes=records.filter(r=>r.wanted).reduce((s,r)=>s+r.bytes,0);
  for(const r of [...records].sort((a,b)=>(b.priority??0)-(a.priority??0))){if(selectedBytes<=budget*1.35)break;if(r.wanted&&!r.pinned&&Math.hypot(r.center.x-camera.position.x,r.center.z-camera.position.z)>CHUNK_POLICY.nearRadius){r.wanted=false;selectedBytes-=r.bytes;}}
  for(const r of records)if(!r.wanted)r.cancelWarm?.();
  stats.radius=radius;stats.preload=preload;stats.projectedError=projectedError;
 }
 function update(dt,level='high'){
  dirty=false;elapsed+=dt;const distance=camera.position.distanceTo(lastPosition);if(dt>0&&distance<80){const next=camera.position.clone().sub(lastPosition).divideScalar(dt);if(next.length()>40)next.setLength(40);velocity.lerp(next,.35);}else if(distance>=80)velocity.set(0,0,0);lastPosition.copy(camera.position);
  if(elapsed-lastPlan>.2||lastPlan<0){lastPlan=elapsed;plan(level);}
  for(const r of records){const available=r.ready&&!r.loading,target=r.wanted&&available?1:0,prior=r.weight;const step=Math.min(.08,Math.max(0,dt))/CHUNK_POLICY.fadeSeconds;r.weight=Math.min(1,Math.max(0,r.weight+(target?step:-step)));if(prior!==r.weight)dirty=true;if(prior===0&&r.weight>0)stats.transitions++;
   const highShadow=r.weight>=.5;if(highShadow!==r.highShadow){r.highShadow=highShadow;for(const o of r.high.children)o.castShadow=!!o.userData.originalCast&&highShadow;for(const o of r.low.children)o.castShadow=!!o.userData.originalCast&&!highShadow;renderer.shadowMap.needsUpdate=true;}r.high.visible=r.loading||r.weight>0;r.low.visible=r.weight<1;
   if(!r.wanted&&r.weight===0&&r.raw.length&&r.packed&&!r.packed.unavailable&&!r.loading){disposeObjects(r.raw);r.raw=[];r.ready=false;}
  }
  stats.highChunks=records.filter(r=>r.high.children.length).length;stats.highBytes=records.filter(r=>r.high.children.length).reduce((s,r)=>s+r.bytes,0);packNext();loadNext();
 }
 plan('high');update(0);
 return{update,stats,records,get needsRender(){return busy||dirty||records.some(r=>r.weight>0&&r.weight<1);},async settle(){while(records.some(r=>!r.packed||(r.wanted&&!r.ready))||packing||busy){await packNext();loadNext();await new Promise(r=>setTimeout(r,10));}return stats;},dispose(){alive=false;for(const r of records){r.cancelWarm?.();disposeObjects([...r.high.children,...r.low.children,...r.sources]);r.high.removeFromParent();r.low.removeFromParent();for(const m of [...r.highMaterials.values(),...r.lowMaterials.values()])m.dispose();}records.length=0;}};
}
