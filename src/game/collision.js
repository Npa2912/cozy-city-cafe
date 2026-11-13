// Horizontal contacts for a vertical capsule against semantic AABBs/cylinders.
// Travel is subdivided below the capsule radius, then projected along contacts.
export function contact(p, r, b) {
  if (b.kind === "circle") {
    const dx = p.x - b.x,
      dz = p.z - b.z,
      l = Math.hypot(dx, dz),
      depth = r + b.radius - l;
    return depth > 0
      ? { x: (l ? dx / l : 1) * depth, z: (l ? dz / l : 0) * depth }
      : null;
  }
  const x = Math.max(b.minX, Math.min(b.maxX, p.x)),
    z = Math.max(b.minZ, Math.min(b.maxZ, p.z)),
    dx = p.x - x,
    dz = p.z - z,
    l = Math.hypot(dx, dz);
  if (l >= r) return null;
  if (l > 1e-8)
    return { x: (dx / l) * (r - l + 0.00001), z: (dz / l) * (r - l + 0.00001) };
  const sides = [
    { d: p.x - b.minX, x: -1, z: 0 },
    { d: b.maxX - p.x, x: 1, z: 0 },
    { d: p.z - b.minZ, x: 0, z: -1 },
    { d: b.maxZ - p.z, x: 0, z: 1 },
  ].sort((a, b) => a.d - b.d);
  return {
    x: sides[0].x * (sides[0].d + r + 0.00001),
    z: sides[0].z * (sides[0].d + r + 0.00001),
  };
}
export function blocked(p, r, shapes, ignore) {
  return shapes.some(
    (b) => (ignore === undefined || b.owner !== ignore) && contact(p, r, b),
  );
}
export function slide(position, dx, dz, r, shapes) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.07));
  let p = { ...position };
  for (let k = 0; k < steps; k++) {
    p.x += dx / steps;
    p.z += dz / steps;
    for (let i = 0; i < 4; i++)
      for (const b of shapes) {
        const c = contact(p, r, b);
        if (c) {
          p.x += c.x;
          p.z += c.z;
        }
      }
  }
  return p;
}
export function findPath(start, end, shapes, bounds, r = 0.25, step = 0.25) {
  const cell = (p) => ({
      x: Math.round((p.x - bounds.minX) / step),
      z: Math.round((p.z - bounds.minZ) / step),
    }),
    point = (p) => ({
      x: bounds.minX + p.x * step,
      z: bounds.minZ + p.z * step,
    }),
    key = (p) => `${p.x},${p.z}`;
  const a = cell(start),
    b = cell(end),
    valid = (p) => {
      const q = point(p);
      return (
        q.x >= bounds.minX &&
        q.x <= bounds.maxX &&
        q.z >= bounds.minZ &&
        q.z <= bounds.maxZ &&
        !blocked(q, r, shapes)
      );
    };
  if (!valid(b)) return null;
  const open = [a],
    seen = new Map([[key(a), { cost: 0, node: a }]]),
    closed = new Set();
  let count = 0;
  while (open.length && count++ < 15000) {
    open.sort(
      (p, q) =>
        seen.get(key(p)).cost +
        Math.hypot(p.x - b.x, p.z - b.z) -
        seen.get(key(q)).cost -
        Math.hypot(q.x - b.x, q.z - b.z),
    );
    const p = open.shift(),
      pk = key(p);
    if (closed.has(pk)) continue;
    closed.add(pk);
    if (pk === key(b)) {
      const path = [end];
      let cur = seen.get(pk);
      while (cur.parent) {
        path.unshift(point(cur.node));
        cur = seen.get(cur.parent);
      }
      return path;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const n = { x: p.x + dx, z: p.z + dz },
        nk = key(n);
      if (
        closed.has(nk) ||
        !valid(n) ||
        (dx &&
          dz &&
          (!valid({ x: p.x + dx, z: p.z }) || !valid({ x: p.x, z: p.z + dz })))
      )
        continue;
      const cost = seen.get(pk).cost + Math.hypot(dx, dz);
      if (!seen.has(nk) || cost < seen.get(nk).cost) {
        seen.set(nk, { cost, node: n, parent: pk });
        open.push(n);
      }
    }
  }
  return null;
}

// Recover intersecting actors restored by older saves, using bounded walking
// steps. This never disables collision or transports an actor to another point.
export function separateRestoredActor(
  position,
  actors,
  obstacles,
  radius,
  distance,
) {
  const penetration = (p) =>
    actors.reduce(
      (sum, b) =>
        sum +
        Math.max(0, radius + b.radius - Math.hypot(p.x - b.x, p.z - b.z)) ** 2,
      0,
    );
  let score = penetration(position),
    best = position;
  if (score < 1e-12) return null;
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI) / 12,
      p = {
        x: position.x + Math.cos(angle) * distance,
        z: position.z + Math.sin(angle) * distance,
      };
    if (blocked(p, radius, obstacles)) continue;
    const next = penetration(p);
    if (next + 1e-12 < score) {
      score = next;
      best = p;
    }
  }
  return best;
}
