import * as THREE from 'three';
import {box,mesh,mat,group,cylinder,sphere,rod,torus,label,arch,archedWindow,tiledRoof,tower,bench,lamp,foliage,vine} from './street.js';
import {withFlowers,flowerBox,tree,table,chair,lantern} from './refinement.js';
import {districtBuilding} from './neighborhood-buildings.js';
import {matchingRoad} from './civic-spaces.js';
import {WEST,WEST_BUILDINGS,WEST_TOWERS,BRIDGES,riverX,riverWidth,bridgeHeight,bankHeight,FOUNTAINS} from './western-plan.js';
import {person,batchRigidParts} from './life.js';
function ribbon(points,width,y,material,segments=160,height=null,clipZ=null){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),v=[],uv=[],idx=[];
 for(let i=0;i<=segments;i++){const t=i/segments,p=curve.getPoint(t),d=curve.getTangent(t),n=new THREE.Vector3(-d.z,0,d.x).normalize();for(const s of [-1,1]){const x=p.x+s*n.x*(typeof width==='function'?width(p.z):width)/2,rawZ=p.z+s*n.z*(typeof width==='function'?width(p.z):width)/2,z=clipZ?THREE.MathUtils.clamp(rawZ,clipZ[0],clipZ[1]):rawZ;v.push(x,height?height(x,z):y,z);uv.push((s+1)/2,t*20)}if(i<segments){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();const o=new THREE.Mesh(geo,material);o.receiveShadow=true;return o;
}
function bridge(scene,b,roadMaterial,tiles){
 const deckmat=b.road?tiles:mat('#dbc4a3',{side:THREE.DoubleSide});
 const points=[[b.minX,0,b.z],[b.maxX,0,b.z]];
 if(b.road){for(const side of [-1,1]){const z=b.z+side*(b.road/2+(b.width-b.road)/4);const deck=ribbon([[b.minX,0,z],[b.maxX,0,z]],(b.width-b.road)/2,.23,deckmat,40,(x,z)=>bridgeHeight(b,x,z));deck.name=b.id;scene.add(deck);}}
 else {const deck=ribbon(points,b.width,.23,deckmat,40,(x,z)=>bridgeHeight(b,x,z));deck.name=b.id;scene.add(deck);}
 if(b.road){const asphalt=ribbon(points,b.road,-.02,roadMaterial,40,(x,z)=>bridgeHeight(b,x,z)+.008);const uv=asphalt.geometry.attributes.uv;for(let i=0;i<uv.count;i++){uv.setX(i,uv.getX(i)*b.road/9);uv.setY(i,uv.getY(i)/20*(b.maxX-b.minX)/135);}scene.add(asphalt);for(let x=b.minX+.8;x<b.maxX;x+=3.3)box(scene,x,bridgeHeight(b,x,b.z)+.03,b.z,1.8,.016,.13,'#f1e7d3',.006);}
 for(const side of [-1,1]){
  const z=b.z+side*(b.width/2-.12);
  const upper=[],lower=[];
  for(let i=0;i<=24;i++){const x=b.minX+i,yy=bridgeHeight(b,x,z);upper.push(new THREE.Vector3(x,yy+1.05,z));lower.push(new THREE.Vector3(x,yy+.4,z));if(i%2===0){rod(scene,[x,yy,z],[x,yy+1.08,z],.045,'#7ca6a0');sphere(scene,x,yy+1.13,z,.09,.09,.09,'#dcbf88');}}
  for(const ps of [upper,lower])mesh(scene,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ps),48,.045,6,false),'#799e98');
  for(const x of [b.minX+1,b.maxX-1]){const y=bridgeHeight(b,x,z);const g=group(scene,x,y,z);lantern(g,0,2.1,0,.9);rod(g,[0,0,0],[0,2.7,0],.045,'#536d64');}
 }
 for(const x of [b.minX+2,b.maxX-2])for(const side of [-1,1])flowerBox(scene,x,bridgeHeight(b,x,b.z+side*(b.width/2-.55)),b.z+side*(b.width/2-.55),1.2,.6,true);
 // Structural arch below the continuous ramp; its edges are decorative, not a stair.
 for(const side of [-1,1]){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(b.minX,-.55,b.z+side*b.width/2),new THREE.Vector3((b.minX+b.maxX)/2,-2.8,b.z+side*b.width/2),new THREE.Vector3(b.maxX,-.55,b.z+side*b.width/2));mesh(scene,new THREE.TubeGeometry(curve,32,.25,8,false),'#e7d7bc');}
}
function civicHall(scene){
 const g=group(scene,-135,.23,32,Math.PI/2);
 box(g,0,3,-3,5.4,6,7,'#e6c5aa',.28);for(const x of [-1.7,0,1.7])archedWindow(g,x,.4,.55,1.2,3.8);
 tiledRoof(g,0,6.2,-3.3,6.2,8);
 const t=group(g,0,6.2,-3.4);box(t,0,3.2,0,4,6.4,4,'#e8cda6',.3);archedWindow(t,0,.4,2.05,1.4,2.4);
 const face=new THREE.Mesh(new THREE.CircleGeometry(1.1,48),mat('#fff5d5'));face.position.set(0,4.7,2.04);t.add(face);for(let i=0;i<12;i++){const a=i*Math.PI/6;box(t,Math.sin(a)*.88,4.7+Math.cos(a)*.88,2.07,.065,.14,.03,'#75877f',.01)}rod(t,[0,4.7,2.1],[0,5.4,2.1],.045,'#536a66');rod(t,[0,4.7,2.1],[.55,4.5,2.1],.045,'#536a66');cylinder(t,0,7,0,.1,2.8,2,'#ce8a76',48);sphere(t,0,8.1,0,.16,.22,.16,'#ddc28b');
 for(const x of [-2.2,2.2])flowerBox(g,x,.25,1.4,1.4,.75,true);label(g,'RIVERSIDE TOWN HALL',0,4.8,.57,4.8,.65,'#fff1cf','#71998e');
}
function conservatory(scene){
 const g=group(scene,-112,.23,32);
 box(g,0,.18,0,10,.36,5.4,'#e4d0b7',.25);
 const glass=mat('#b6d9cf',{transparent:true,opacity:.30,roughness:.17,metalness:.15});
 for(const x of [-4.4,4.4])for(let z=-2.7;z<=2.7;z+=1.35)rod(g,[x,.3,z],[x,4.5,z],.055,'#d7c19b');
 for(let z=-2.7;z<=2.7;z+=1.35){const c=new THREE.CatmullRomCurve3(Array.from({length:13},(_,i)=>new THREE.Vector3(-4.4*Math.cos(i*Math.PI/12),4.5+4.4*Math.sin(i*Math.PI/12),z)));mesh(g,new THREE.TubeGeometry(c,24,.055,6,false),'#d7c19b');}
 for(const x of [-4.4,4.4])box(g,x,2.4,0,.035,4.1,5.4,glass,.01);
 const roof=new THREE.Mesh(new THREE.CylinderGeometry(4.4,4.4,5.4,32,1,true,Math.PI/2,Math.PI),glass);roof.rotation.x=Math.PI/2;roof.position.y=4.5;g.add(roof);
 for(const x of [-3,3])for(const z of [-2,1.5])flowerBox(g,x,.35,z,1.8,1.2,true);
 table(g,0,.35,0,.7);for(const x of [-1.1,1.1])chair(g,x,.35,0,x<0?Math.PI/2:-Math.PI/2);
 label(g,'BOTANICAL CONSERVATORY',0,3.9,2.75,8,.6,'#f7e5c3','#648e81');
}
export function buildWesternDistrict(scene,district){
 const water=scene.getObjectByName('coastal-water');
 const wet=water.material.clone();wet.uniforms=water.material.uniforms;
 wet.vertexShader=wet.vertexShader.replace('varying vec3 vWorld;','varying vec3 vWorld;varying vec2 vWaterUv;').replace('void main(){','void main(){vWaterUv=uv;');
 wet.fragmentShader=wet.fragmentShader.replace('varying vec3 vWorld;','varying vec3 vWorld;varying vec2 vWaterUv;').replace(/float shore=clamp\([^;]+;/,'float shore=pow(1.-abs(vWaterUv.x*2.-1.),.75)*.8;').replace(/float foam=\([^;]+;/,'float foam=(1.-smoothstep(.01,.10,min(vWaterUv.x,1.-vWaterUv.x)))*(.5+.5*sin(vWorld.z*1.5+uTime));');
 const riverPoints=[];for(let z=-112;z<=44;z+=4)riverPoints.push([riverX(z),-.7,z]);riverPoints.push([-69,-.7,54]);
 const river=ribbon(riverPoints,riverWidth,-.7,wet,200);river.name='western-canal';river.userData.dynamic=true;river.castShadow=false;scene.add(river);
 // L-shaped ocean continuation joins the existing eastern sea at x=66.
 for(const [x,z,w,d]of[[-39.5,558,211,1020],[-420,-21,550,2178],[-39.5,-610,211,1004]]){
  const geo=new THREE.PlaneGeometry(w,d,1,1);geo.rotateX(-Math.PI/2);const sea=new THREE.Mesh(geo,water.material);sea.position.set(x,-.7,z);sea.name='sea-continuation';sea.userData.dynamic=true;scene.add(sea);
 }
 const tilemat=district.pavementMaterial.clone();
 tilemat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv=(modelMatrix*vec4(position,1.)).xz*vec2(6./21.,23./134.);');};tilemat.customProgramCacheKey=()=> 'world-paving-v1';
 withFlowers(scene,()=>{
  // Split ground at the sampled channel instead of putting a ground box under water.
  for(let z=-108;z<48;z+=2){const left=riverX(z)-riverWidth(z)/2,right=riverX(z)+riverWidth(z)/2;box(scene,(WEST.minX+left)/2,-.29,z+1,left-WEST.minX,.24,2.05,'#b4a895',.01);if(right<-65)box(scene,(right-65)/2,-.29,z+1,-65-right,.24,2.05,'#b4a895',.01);}
  // Asphalt and paving palette are shared with the retained core.
  for(const x of [-124,-101,-47]){
   matchingRoad(scene,x,-28,7.4,156,district.roadMaterial);
   for(const side of [-1,1])for(const[a,b]of[[-106,-103.7],[-96.3,18.3],[25.7,38.3],[45.7,50]])box(scene,x+side*5.2,.08,(a+b)/2,3,.3,b-a,tilemat,.03);
   for(let z=-103;z<47;z+=6){if(Math.abs(z-22)<6||Math.abs(z+100)<6||Math.abs(z-42)<6)continue;box(scene,x,-.009,z,.13,.012,2.7,'#f0e3c7',.005)}
  }
  for(const z of [-100,22,42]){
   for(const [a,b]of[[WEST.minX,riverX(z)-12],[riverX(z)+12,z===22?-27:4]]){matchingRoad(scene,(a+b)/2,z,b-a,7.4,district.roadMaterial);for(const dz of [-5.2,5.2]){let cursor=a;for(const x of[-124,-101,-47,4]){const half=x===4?4.5:3.7;if(x+half<=a||x-half>=b)continue;if(x-half>cursor)box(scene,(cursor+x-half)/2,.08,z+dz,x-half-cursor,.3,3,tilemat,.03);cursor=Math.max(cursor,x+half);}if(cursor<b)box(scene,(cursor+b)/2,.08,z+dz,b-cursor,.3,3,tilemat,.03);}}
  }
  BRIDGES.forEach(b=>bridge(scene,b,district.roadMaterial,tilemat));
  const ped=BRIDGES.find(b=>!b.road);
  for(const[a,b]of[[-97.3,ped.minX],[ped.maxX,-50.7]])box(scene,(a+b)/2,.08,ped.z,b-a,.3,4.4,tilemat,.03);
  for(const side of [-1,1]){
   // End each bank walk at the bridge's outside edge. A continuous ribbon
   // interpolated across raised curbs otherwise puts triangular paving in lanes.
   let from=-108;
   const gaps=[...BRIDGES].sort((a,b)=>a.z-b.z).map(b=>[b.z-b.width/2,b.z+b.width/2]);
   for(const [to,next]of [...gaps,[48,48]]){
    if(to>from){const points=[];for(let z=from;z<to;z+=2)points.push([riverX(z)+side*(riverWidth(z)/2+1.9),.23,z]);points.push([riverX(to)+side*(riverWidth(to)/2+1.9),.23,to]);scene.add(ribbon(points,3.6,.23,tilemat,Math.max(2,Math.ceil((to-from)*2)),bankHeight,[from,to]));}
    from=next;
   }
   const edgePoints=riverPoints.map(p=>new THREE.Vector3(p[0]+side*(riverWidth(p[2])/2+.08),-.25,p[2]));
   mesh(scene,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePoints),180,.32,6,false),'#c2b8a4');
   for(let z=-92;z<42;z+=12){if(BRIDGES.some(b=>Math.abs(b.z-z)<b.width/2+3)||Math.abs(z-42)<9)continue;const x=riverX(z)+side*(WEST.riverWidth/2+3.6);tree(scene,x,z,4.7+(Math.abs(z)%3),1.3);flowerBox(scene,x,.23,z+2.7,1.6,.7,true);bench(scene,x-side*.9,z+5,side*Math.PI/2);lamp(scene,x,z+7,4.6);}
  }
  for(const p of WEST_BUILDINGS){const bounds={minX:p.rotation>0?p.x-p.d:p.x,maxX:p.rotation>0?p.x:p.x+p.d};box(scene,(bounds.minX+bounds.maxX)/2,.03,p.z,p.d+.5,.4,p.w+.5,tilemat,.05);districtBuilding(scene,p);if(p.riverside){table(scene,p.x+1.5,.23,p.z,.55);chair(scene,p.x+1.5,.23,p.z-.9,0);chair(scene,p.x+1.5,.23,p.z+.9,Math.PI);}}

  for(const [i,p]of WEST_TOWERS.entries()){
   box(scene,p.rotation>0?p.x-p.d/2:p.x+p.d/2,.03,p.z,p.d+.5,.4,p.w+.5,tilemat,.05);
   const base=districtBuilding(scene,{...p,floors:1,style:i%2?'duplex':'terrace'});
   const block=group(base,0,4.2,-.5);const t=tower(block,0,0,p.w*.75,p.height,p.color,p.variant);t.scale.z=Math.min(1,p.d/(p.w*.75*.8));
   for(const xx of [-p.w*.24,0,p.w*.24])flowerBox(base,xx,p.height+4.4,-1.5,1.3,.6,true);
  }
  // Narrow extra frontage belts complete the original west edge without moving its old cottages.
  for(const z of [-80,-56,-32,-8,16]){
   for(const x of [-141,-109,-64,-35]){if(x===-35&&z===16)continue;flowerBox(scene,x,.23,z,1.1,.8,true);tree(scene,x,z+3,5.5,1.2)}
  }
  civicHall(scene);conservatory(scene);
  for(const {x,z}of FOUNTAINS){
   cylinder(scene,x,.3,z,3.4,3.4,.18,'#e0c7ab',48);cylinder(scene,x,.52,z,1.7,1.9,.35,'#ddcbb1',40);cylinder(scene,x,.74,z,1.55,1.55,.05,'#72c2ca',40);cylinder(scene,x,1.4,z,.16,.28,1.4,'#e6d9bb',24);cylinder(scene,x,2.1,z,.78,.5,.18,'#e5d5b7',40);for(const dx of [-3,3]){bench(scene,x+dx,z,dx<0?Math.PI/2:-Math.PI/2);flowerBox(scene,x+dx,.23,z+2,1.8,.7,true)}
  }
  box(scene,-143,.08,-28,4,.3,156,tilemat,.03);
  box(scene,-39.5,.08,-106.7,211,.3,2.6,tilemat,.03);
  for(let z=-96;z<46;z+=12){if([22,42,-100].some(v=>Math.abs(v-z)<7))continue;tree(scene,-143,z,5,1.25);flowerBox(scene,-143,.23,z+3,1.5,.65,true);lamp(scene,-143,z+6,4.6);}
  for(let x=-138;x<63;x+=14){if(Math.abs(x-riverX(-107))<9)continue;flowerBox(scene,x,.23,-106.6,2,.65,true);}
  // Complete the waterfront, outer streets and intersections with continuous walks.
  for(const[a,b]of[[-145,-88],[-59,66]]){box(scene,(a+b)/2,-.28,49.5,b-a,.24,5,'#b4a895',.03);box(scene,(a+b)/2,.08,49.5,b-a,.3,5,tilemat,.03);}
  for(let x=-140;x<63;x+=12){if(Math.abs(x-riverX(49))<12)continue;lamp(scene,x,49.8,4.6);flowerBox(scene,x,.23,48.1,2,.7,true)}
  for(const x of [-124,-101,-47])for(const z of [-94,16,36])for(let i=0;i<8;i++)box(scene,x,-.006,z+i*.31,6.4,.013,.17,'#f2e7d1',.004);
 });
 const pedestrians=BRIDGES.filter(b=>!b.road).flatMap(b=>[-1,1].map((side,i)=>{const actor=person(scene,{x:b.minX,z:b.z+side*1.05,scale:.82,color:i?'#d2a7b3':'#9ebba4'});batchRigidParts(actor.g);return{...actor,bridge:b,side}}));
 return {update(time){for(const p of pedestrians){const b=p.bridge,t=(Math.sin(time*.08+p.side)+1)/2,x=b.minX+1+t*(b.maxX-b.minX-2),z=b.z+p.side*1.05;p.g.position.set(x,bridgeHeight(b,x,z)-.13,z);p.g.rotation.y=Math.cos(time*.08+p.side)>0?Math.PI/2:-Math.PI/2;for(let i=0;i<p.limbs.length;i++)p.limbs[i].rotation.x=Math.sin(time*5+i*Math.PI)*.25;}},river};
}
