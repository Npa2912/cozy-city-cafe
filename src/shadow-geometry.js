import * as THREE from 'three';

// Bound radial deviation of an inscribed sphere tessellation. Both the original
// and proxy lie between this inner radius and the true sphere. Their difference
// is therefore bounded by max(originalError, proxyError), not an assumed size.
export const sphereError = (width, height) =>
  1 - Math.cos(Math.PI / width) * Math.cos(Math.PI / (2 * height));

export function sphereRecipe(geometry) {
  if (geometry.userData.shadowSphere) return geometry.userData.shadowSphere;
  if (geometry.type !== 'SphereGeometry') return null;
  const p = geometry.parameters;
  if (p.phiStart !== 0 || Math.abs(p.phiLength - 2 * Math.PI) > 1e-6 ||
      p.thetaStart !== 0 || Math.abs(p.thetaLength - Math.PI) > 1e-6) return null;
  return [p.radius, p.widthSegments, p.heightSegments];
}

// Gershgorin's bound for the largest eigenvalue of MᵀM also handles
// shear from nested non-uniform transforms; max column length alone does not.
export function linearScaleBound(a, i=0) {
 const xx=a[i]**2+a[i+1]**2+a[i+2]**2, yy=a[i+4]**2+a[i+5]**2+a[i+6]**2, zz=a[i+8]**2+a[i+9]**2+a[i+10]**2;
 const xy=Math.abs(a[i]*a[i+4]+a[i+1]*a[i+5]+a[i+2]*a[i+6]), xz=Math.abs(a[i]*a[i+8]+a[i+1]*a[i+9]+a[i+2]*a[i+10]), yz=Math.abs(a[i+4]*a[i+8]+a[i+5]*a[i+9]+a[i+6]*a[i+10]);
 return Math.sqrt(Math.max(xx+xy+xz,yy+xy+yz,zz+xz+yz));
}

// Color rendering always uses the unchanged original mesh. Only small opaque
// instanced plants may use fewer depth-pass vertices, within half a shadow texel.
export function installShadowGeometryLOD(renderer, sun, scene) {
  const originalRender = renderer.shadowMap.render;
  const proxies = new Map(), scales = new WeakMap();
  const stats = { passes: 0, skippedDarkPasses: 0, objects: 0, originalTriangles: 0, proxyTriangles: 0 };
  function maxScale(object) {
    const version = object.instanceMatrix.version, count = object.count;
    let cached = scales.get(object);
    if (!cached || cached.version !== version || cached.count !== count) {
      const a = object.instanceMatrix.array; let scale = 0;
      for (let i = 0; i < count * 16; i += 16) scale = Math.max(scale,
        linearScaleBound(a,i));
      cached = { version, count, scale }; scales.set(object, cached);
    }
    return cached.scale * linearScaleBound(object.matrixWorld.elements);
  }
  renderer.shadowMap.render = function (...args) {
    if (!this.enabled || (!this.autoUpdate && !this.needsUpdate)) return originalRender.apply(this, args);
    const lights = args[0].filter(light => light.castShadow && light.intensity > 0);
    if (!lights.length) { this.needsUpdate = false; stats.skippedDarkPasses++; return; }
    // Additional shadow-casting lights need their own error metric.
    if (lights.some(light => light !== sun)) return originalRender.apply(this, args);
    const texel = (sun.shadow.camera.right - sun.shadow.camera.left) / sun.shadow.mapSize.x;
    const swaps = [];
    stats.passes++; stats.objects = stats.originalTriangles = stats.proxyTriangles = 0;
    scene.traverseVisible(object => {
      if (!object.isInstancedMesh || !object.castShadow || !object.userData.streamCell ||
          object.customDepthMaterial || object.material.alphaMap || object.material.alphaTest > 0) return;
      const recipe = sphereRecipe(object.geometry); if (!recipe) return;
      const [radius, width, height] = recipe, size = radius * maxScale(object);
      const sourceError = sphereError(width, height);
      for (const [w, h] of [[4, 3], [6, 4], [8, 5], [9, 6], [12, 8], [16, 10]]) {
        if (w >= width || h >= height || Math.max(sourceError, sphereError(w, h)) * size > texel * .5) continue;
        const key = `${radius}:${w}:${h}`;
        if (!proxies.has(key)) proxies.set(key, new THREE.SphereGeometry(radius, w, h));
        const geometry = object.geometry, proxy = proxies.get(key);
        swaps.push([object, geometry]); object.geometry = proxy;
        stats.objects++; stats.originalTriangles += (geometry.index?.count || geometry.attributes.position.count) / 3 * object.count;
        stats.proxyTriangles += proxy.index.count / 3 * object.count;
        break;
      }
    });
    // Three r181 builds color render items before invoking shadowMap.render.
    // Restore before the color pass even if a shadow draw throws.
    try { return originalRender.apply(this, args); }
    finally { for (const [object, geometry] of swaps) object.geometry = geometry; }
  };
  return { stats, dispose() { renderer.shadowMap.render = originalRender; for (const g of proxies.values()) g.dispose(); proxies.clear(); } };
}
