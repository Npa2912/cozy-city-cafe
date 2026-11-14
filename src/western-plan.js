// World coordinates, not surveyed metres. The approved core/coast are retained.
export const WEST = Object.freeze({minX:-145,maxX:-26,minZ:-108,maxZ:50,riverWidth:10.8});
export function riverX(z){if(z>40){const t=(z-40)/14;return (-76+4*Math.sin(5))+(10.83569709865)*t*t;}return -76+4*Math.sin((z+70)/22);}
export const BRIDGES = [
 {id:'canal-road',z:22,width:13.4,road:7.4,rise:.45,type:'road'},
 {id:'north-link',z:-100,width:13.4,road:7.4,rise:.45,type:'road'},
 {id:'south-quay-link',z:42,width:13.4,road:7.4,rise:.45,type:'road'},
 {id:'garden-walk',z:-40,width:4.4,road:0,rise:1.15,type:'pedestrian'},
].map(b=>({...b,minX:riverX(b.z)-12,maxX:riverX(b.z)+12}));
export function bridgeHeight(b,x,z){const t=Math.max(0,Math.min(1,(x-b.minX)/(b.maxX-b.minX)));return (b.road&&Math.abs(z-b.z)<b.road/2?-.02:.23)+b.rise*Math.sin(Math.PI*t)**2;}
const styles=['gable','corner','terrace','duplex','terrace','gable'];
const colors=['#a8c4ad','#e3bcaa','#9bbcca','#d4acc1','#e6ce92','#a9b0cc'];
const signs=['MORNING BAKERY','BLOOM & PETAL','RIVER BOOKS','LEMON TEA','COZY TOOLS','GARDEN MART','MAISON VERTE','PETIT HOTEL','ATELIER','JARDIN CAFE','BISTRO','RIVERSIDE'];
export const WEST_BUILDINGS=[];
for(let row=0;row<6;row++){
 const z=row===5?32:-87+row*24;
 for(let col=0;col<5;col++){
  const index=row*5+col;
  const spec=[[-131,9,Math.PI/2],[-117,9,-Math.PI/2],[-94.2,4.5,-Math.PI/2],[-54,8,Math.PI/2],[-39.5,5,-Math.PI/2]][col];
  WEST_BUILDINGS.push({id:`west-${row}-${col}`,x:spec[0],z,w:row===5?5.4:10+((row+col)%3)*.7,d:spec[1],rotation:spec[2],floors:1+((row*2+col)%4),style:styles[(row+col)%6],color:colors[(row+col*2)%6],sign:signs[index%signs.length],awning:['#86b5a4','#d7aa73','#c98fa5','#87aabd'][index%4]});
 }
}
// Extra small lots occupy the gaps, while the pedestrian bridge has clear landings.
for(const z of [-75,-51,-27,-3])for(let col=0;col<5;col++) {
 const spec=[[-131,9,Math.PI/2],[-117,9,-Math.PI/2],[-94.2,4.5,-Math.PI/2],[-54,8,Math.PI/2],[-39.5,5,-Math.PI/2]][col];
 WEST_BUILDINGS.push({id:`lane-${z}-${col}`,x:spec[0],z,w:7.6,d:spec[1],rotation:spec[2],floors:1+(col%2),style:styles[(col+2)%6],color:colors[(col+3)%6],sign:signs[(col+4)%signs.length],awning:'#92b7ad'});
}
for(let i=WEST_BUILDINGS.length-1;i>=0;i--)if(['west-2-2','west-2-3','west-2-1','west-5-0','west-5-1','west-5-3','lane--3-0'].includes(WEST_BUILDINGS[i].id))WEST_BUILDINGS.splice(i,1);
for(const p of WEST_BUILDINGS)if(['west-3-2','west-4-2'].includes(p.id)){p.x+=p.d;p.rotation=Math.PI/2;p.riverside=true;}
const towerIds=['west-0-1','west-1-0','west-1-3','west-2-4','west-3-0','west-3-3','west-4-1','west-5-4'];
export const WEST_TOWERS=WEST_BUILDINGS.filter(p=>towerIds.includes(p.id)).map((p,i)=>({...p,height:22+(i%4)*5,variant:i%3}));
for(let i=WEST_BUILDINGS.length-1;i>=0;i--)if(towerIds.includes(WEST_BUILDINGS[i].id))WEST_BUILDINGS.splice(i,1);
export function westBounds(p){return{minX:p.rotation>0?p.x-p.d:p.x,maxX:p.rotation>0?p.x:p.x+p.d,minZ:p.z-p.w/2,maxZ:p.z+p.w/2};}
export function riverWidth(z){return WEST.riverWidth+Math.max(0,z-40)*.9;}
export const FOUNTAINS=[{x:-135,z:-3},{x:-112,z:-39},{x:-59,z:32}];
export function riverWaterAt(x,z,margin=0){return z>=-110&&z<=48&&Math.abs(x-riverX(z))<riverWidth(z)/2+margin&&!BRIDGES.some(b=>x>=b.minX&&x<=b.maxX&&Math.abs(z-b.z)<b.width/2);}
export function forbiddenWater(p,margin=.28){return p.x<-145+margin||p.z<-108+margin||p.z>52-margin||(p.z>=48 && p.x>-88-margin && p.x<-59+margin)||riverWaterAt(p.x,p.z,margin);}
// Match the bank walk to each ramp, with a two-unit approach outside its deck.
export function bankHeight(x,z){
 let y=.23;
 for(const b of BRIDGES){if(x<b.minX||x>b.maxX)continue;const d=Math.max(0,Math.abs(z-b.z)-b.width/2);if(d>=2)continue;const t=1-d/2,w=t*t*(3-2*t);y+=(bridgeHeight(b,x,z)-.23)*w;}
 return y;
}
export function westernFloor(p){
 const {x,z}=p,b=BRIDGES.find(b=>x>=b.minX&&x<=b.maxX&&Math.abs(z-b.z)<=b.width/2);
 if(b)return bridgeHeight(b,x,z);
 if(x>=-117&&x<=-107&&z>=29.3&&z<=34.7)return .59;
 if(FOUNTAINS.some(f=>Math.hypot(x-f.x,z-f.z)<3.4))return .39;
 const cross=[-100,22,42].find(v=>Math.abs(z-v)<3.7&&x>=-145&&x<=(v===22?-27:4));
 if(cross!==undefined||([-124,-101,-47].some(v=>Math.abs(x-v)<3.7)&&z>=-106&&z<=50))return -.02;
 if([-124,-101,-47].some(v=>Math.abs(x-v)<6.7)&&z>=-106&&z<=50)return .23;
 if([-100,22,42].some(v=>Math.abs(z-v)<6.7&&x>=-145&&x<=(v===22?-27:4)))return .23;
 if(z>=-108&&z<=48&&Math.abs(Math.abs(x-riverX(z))-riverWidth(z)/2-1.9)<=1.9)return bankHeight(x,z);
 const ped=BRIDGES.find(b=>!b.road);if(Math.abs(z-ped.z)<=2.2&&x>=-97.3&&x<=-50.7)return .23;
 if(x<=-141||z<=-105.4||z>=47)return .23;
 for(const lot of [...WEST_BUILDINGS,...WEST_TOWERS]){const r=westBounds(lot);if(x>=r.minX-.25&&x<=r.maxX+.25&&z>=r.minZ-.25&&z<=r.maxZ+.25)return .23;}
 if(Math.hypot(x+31.4,z-32)<3.5||x>=-29.5||((Math.abs(x+135)<5||Math.abs(x+112)<5.3)&&Math.abs(z-32)<4.7))return .23;
 return -.17;
}
