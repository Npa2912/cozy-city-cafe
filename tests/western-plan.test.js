import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {WEST_BUILDINGS,WEST_TOWERS,westBounds,BRIDGES,bridgeHeight,riverX,riverWaterAt,forbiddenWater,westernFloor} from '../src/western-plan.js';
import {overlaps} from '../src/urban-plan.js';import {createPlayerCollision} from '../src/game/world-collision.js';
test('expanded blocks have at least forty distinct lots and mix tall/mid/low frontages without overlaps',()=>{
 const lots=[...WEST_BUILDINGS,...WEST_TOWERS];assert(lots.length>=40);assert(WEST_TOWERS.length>=8);assert(WEST_BUILDINGS.some(p=>p.floors>=3));assert(new Set(lots.map(p=>p.style)).size>=4);assert(lots.some(p=>p.riverside));
 for(let i=0;i<lots.length;i++)for(let j=i+1;j<lots.length;j++)assert(!overlaps(westBounds(lots[i]),westBounds(lots[j])),`${lots[i].id} overlaps ${lots[j].id}`);
 for(const p of lots){const b=westBounds(p);for(const x of[-124,-101,-47])assert(!overlaps(b,{minX:x-3.7,maxX:x+3.7,minZ:-108,maxZ:50}),p.id+' in road');for(const z of[-100,22,42])assert(!overlaps(b,{minX:-145,maxX:4,minZ:z-3.7,maxZ:z+3.7}),p.id+' in crossroad');}
});
test('curved canal stays outside the protected core and bridges connect both banks with gentle continuous decks',()=>{
 assert(Math.abs(riverX(-75)-riverX(-15))>2);assert(BRIDGES.some(b=>b.type==='pedestrian'));assert(BRIDGES.some(b=>b.type==='road'));
 for(const b of BRIDGES){assert(b.minX<riverX(b.z)-5.4);assert(b.maxX>riverX(b.z)+5.4);assert(!riverWaterAt(riverX(b.z),b.z));const z=b.z+(b.road?5:0);assert(Math.abs(bridgeHeight(b,b.minX,z)-.23)<1e-8);assert(Math.abs(bridgeHeight(b,b.maxX,z)-.23)<1e-8);let last=bridgeHeight(b,b.minX,z);for(let x=b.minX+.1;x<=b.maxX;x+=.1){const y=bridgeHeight(b,x,z);assert(Math.abs(y-last)<.02);last=y;}}
});
test('POV capsule crosses every bridge at walk, run and vehicle-test speeds and cannot leave into river',()=>{
 for(const speed of[5,9,25])for(const b of BRIDGES){const camera=new THREE.PerspectiveCamera(),collision=createPlayerCollision([],()=>[],westernFloor),z=b.z+(b.road?5.2:0);camera.position.set(b.minX-.5,westernFloor({x:b.minX-.5,z})+1.65,z);for(let t=0;t<30/speed;t+=.02)collision.move(camera,speed*.02,0);assert(camera.position.x>b.maxX,b.id+' blocked');assert(Math.abs(camera.position.y-westernFloor(camera.position)-1.65)<1e-6);}
 const camera=new THREE.PerspectiveCamera(),collision=createPlayerCollision([],()=>[],westernFloor),z=-20;camera.position.set(riverX(z)-8,1.88,z);collision.move(camera,15,0);assert(camera.position.x<riverX(z)-5.4);assert(!forbiddenWater(camera.position));
});
test('expanded circulation floors match carriageway, pavement, bridge landing and undeveloped soil',()=>{
 assert.equal(westernFloor({x:-124,z:0}),-.02);
 assert.equal(westernFloor({x:-129.2,z:0}),.23);
 assert.equal(westernFloor({x:-12,z:-100}),-.02);
 assert.equal(westernFloor({x:-12,z:42}),-.02);
 assert.equal(westernFloor({x:-140,z:-80}),-.17);
 const p=BRIDGES.find(b=>!b.road);assert.equal(westernFloor({x:-96,z:p.z}),.23);
 for(const b of BRIDGES)for(const side of [-1,1]){const x=riverX(b.z)-6.5;let last=null;for(let d=0;d<2;d+=.01){const z=b.z+side*(b.width/2+d);if(forbiddenWater({x,z}))continue;const y=westernFloor({x,z});if(last!==null)assert(Math.abs(y-last)<.03,`${b.id} bank/deck discontinuity`);last=y;}}
});
