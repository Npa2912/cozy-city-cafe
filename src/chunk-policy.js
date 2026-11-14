export const CHUNK_POLICY={cell:16,nearRadius:32,bufferCells:2,fadeSeconds:.45,budgetMiB:{low:64,medium:112,high:192},maxRadius:112,maxVelocity:40};
// Select a radius from actual decoded geometry bytes, not a guessed map distance.
export function budgetRadius(records,position,level='high'){
 const budget=CHUNK_POLICY.budgetMiB[level]*1048576,sorted=records.map(r=>({r,d:Math.hypot(r.center.x-position.x,r.center.z-position.z)})).sort((a,b)=>a.d-b.d);let bytes=0,radius=CHUNK_POLICY.nearRadius;
 for(const q of sorted){if(q.d>CHUNK_POLICY.maxRadius)break;if(bytes+q.r.bytes>budget&&q.d>CHUNK_POLICY.nearRadius)break;bytes+=q.r.bytes;radius=Math.max(radius,q.d);}return radius;
}
export function preloadDistance(speed,latencyMs){return Math.min(96,Math.min(CHUNK_POLICY.maxVelocity,Math.max(0,speed))*(Math.max(0,latencyMs)/1000+.8)+CHUNK_POLICY.cell*CHUNK_POLICY.bufferCells);}
