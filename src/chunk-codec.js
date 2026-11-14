import * as THREE from 'three';
const TYPES={Float32Array,Uint8Array,Uint16Array,Uint32Array,Int16Array,Int32Array};
export async function encodeChunk(objects){
 const blocks=[],items=[],arrays=new WeakMap();let offset=0;
 function add(array){if(arrays.has(array))return arrays.get(array);offset=Math.ceil(offset/4)*4;const item={offset,type:array.constructor.name,length:array.length};blocks.push({offset,bytes:new Uint8Array(array.buffer,array.byteOffset,array.byteLength)});offset+=array.byteLength;arrays.set(array,item);return item;}
 for(const [i,o]of objects.entries()){if(i>0&&i%32===0)await new Promise(resolve=>setTimeout(resolve,0));const g=o.geometry;if(!g.boundingSphere)g.computeBoundingSphere();const attrs={};for(const[name,a]of Object.entries(g.attributes))attrs[name]={...add(a.array),size:a.itemSize,normalized:a.normalized};
  items.push({geometryId:g.uuid,attrs,index:g.index?add(g.index.array):null,matrix:o.matrix.toArray(),sphere:[...g.boundingSphere.center.toArray(),g.boundingSphere.radius],cast:o.castShadow,receive:o.receiveShadow,instances:o.isInstancedMesh?{count:o.count,matrix:add(o.instanceMatrix.array),color:o.instanceColor?add(o.instanceColor.array):null,sphere:o.boundingSphere?[...o.boundingSphere.center.toArray(),o.boundingSphere.radius]:null}:null});
 }
 const json=new TextEncoder().encode(JSON.stringify(items)),headerLength=Math.ceil((json.length+4)/4)*4,buffer=new ArrayBuffer(headerLength+offset),view=new DataView(buffer);view.setUint32(0,json.length,true);new Uint8Array(buffer,4,json.length).set(json);for(const[i,b]of blocks.entries()){new Uint8Array(buffer,headerLength+b.offset,b.bytes.length).set(b.bytes);if(i>0&&i%16===0)await new Promise(resolve=>setTimeout(resolve,0));}
 const blob=new Blob([buffer]);
 if(typeof CompressionStream==='undefined')return{blob,compressed:false,rawBytes:buffer.byteLength};
 return{blob:await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob(),compressed:true,rawBytes:buffer.byteLength};
}
export async function decodeChunk(record){
 const buffer=await new Response(record.compressed?record.blob.stream().pipeThrough(new DecompressionStream('gzip')):record.blob.stream()).arrayBuffer();
 const length=new DataView(buffer).getUint32(0,true),start=Math.ceil((length+4)/4)*4,items=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,length)));
 const array=d=>new TYPES[d.type](buffer,start+d.offset,d.length);
 const objects=[],geometries=new Map();
 for(const [i,d] of items.entries()){
  if(i>0&&i%32===0)await new Promise(resolve=>setTimeout(resolve,0));
  let g=geometries.get(d.geometryId);if(!g){g=new THREE.BufferGeometry();for(const[name,a]of Object.entries(d.attrs))g.setAttribute(name,new THREE.BufferAttribute(array(a),a.size,a.normalized));if(d.index)g.setIndex(new THREE.BufferAttribute(array(d.index),1));g.boundingSphere=new THREE.Sphere(new THREE.Vector3(...d.sphere.slice(0,3)),d.sphere[3]);geometries.set(d.geometryId,g);}
  let o;if(d.instances){o=new THREE.InstancedMesh(g,null,d.instances.count);o.instanceMatrix=new THREE.InstancedBufferAttribute(array(d.instances.matrix),16);if(d.instances.color)o.instanceColor=new THREE.InstancedBufferAttribute(array(d.instances.color),3);if(d.instances.sphere)o.boundingSphere=new THREE.Sphere(new THREE.Vector3(...d.instances.sphere.slice(0,3)),d.instances.sphere[3]);}else o=new THREE.Mesh(g,null);
  o.matrixAutoUpdate=false;o.matrix.fromArray(d.matrix);o.castShadow=d.cast;o.receiveShadow=d.receive;objects.push(o);
 }
 return objects;
}
