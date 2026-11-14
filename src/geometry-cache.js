const cache=new Map();
export function cachedGeometry(key,create){if(!cache.has(key)){const g=create();g.userData.sharedPrimitive=true;cache.set(key,g);}return cache.get(key);}
export function disposeGeometryCache(){for(const g of cache.values())g.dispose();cache.clear();}
