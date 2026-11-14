import * as THREE from 'three';
export const QUALITY={low:{pixelRatio:.85,shadow:1024,shadowInterval:.75,foliage:0.65},medium:{pixelRatio:1.25,shadow:1536,shadowInterval:.35,foliage:.85},high:{pixelRatio:2,shadow:2048,shadowInterval:.12,foliage:1}};
export function renderQuality(renderer,sun,scene){
 let level='high';try{const saved=localStorage.getItem('anteleo.graphics');if(QUALITY[saved])level=saved}catch{}
 const label=document.createElement('label');label.id='graphics-quality';label.innerHTML='Đồ họa <select aria-label="Chất lượng đồ họa"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>';document.querySelector('#app').append(label);const select=label.querySelector('select');select.value=level;
 function set(value){if(!QUALITY[value])return;level=value;select.value=value;const q=QUALITY[level];renderer.setPixelRatio(Math.min(devicePixelRatio,q.pixelRatio));sun.shadow.mapSize.set(q.shadow,q.shadow);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}renderer.shadowMap.needsUpdate=true;try{localStorage.setItem('anteleo.graphics',level)}catch{}window.dispatchEvent(new Event('resize'));}
 select.addEventListener('change',()=>set(select.value));set(level);
 const info={frames:[],cpu:{environmentMs:0,npcMs:0,submitMs:0},level};
 const panel=new URLSearchParams(location.search).get('perf')==='1'?document.createElement('pre'):null;if(panel){panel.id='performance-panel';document.querySelector('#app').append(panel)}let since=0;
 return{get level(){return level},get settings(){return QUALITY[level]},set,info,
 update(camera){
  const wide=camera.position.y>34,span=wide?155:32;
  const target=wide?new THREE.Vector3(-35,0,-22):camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(22).add(camera.position);target.y=0;const texel=span*2/sun.shadow.mapSize.x;target.x=Math.round(target.x/texel)*texel;target.z=Math.round(target.z/texel)*texel;
  if(sun.target.position.distanceToSquared(target)>4||sun.shadow.camera.right!==span){sun.target.position.copy(target);Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,far:460});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;}
 },
 sample(elapsed,cpu){info.level=level;info.cpu=cpu;if(elapsed>0)info.frames.push(elapsed*1000);if(info.frames.length>120)info.frames.shift();since+=elapsed;if(panel&&since>1){since=0;const a=info.frames,mean=a.reduce((s,x)=>s+x,0)/(a.length||1),sorted=[...a].sort((a,b)=>a-b);panel.textContent=`${level} · FPS ${(1000/mean).toFixed(1)} · p95 ${(sorted[Math.floor(sorted.length*.95)]||0).toFixed(1)} ms\nDraw ${renderer.info.render.calls} · Tri ${renderer.info.render.triangles.toLocaleString()}\nGeo ${renderer.info.memory.geometries} · Tex ${renderer.info.memory.textures}\nCPU NPC ${cpu.npcMs.toFixed(2)} · Ánh sáng ${cpu.environmentMs.toFixed(2)} ms\nHeap ${performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576)+' MiB':'không có API'} · GPU RAM: không có API`;}}
 };
}
