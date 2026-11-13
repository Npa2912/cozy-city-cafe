export const SHOALS = [
  { x: 71.5, z: 19, radius: 2.3 },
  { x: 71, z: -2, radius: 2.0 },
  { x: 70, z: -24, radius: 2.4 },
];
export function sampleFish(time, index) {
  const shoal = SHOALS[Math.floor(index / 6) % SHOALS.length],
    phase = (index % 6) * 0.74;
  const a = time * 0.21 + phase,
    r = shoal.radius * (0.57 + (index % 3) * 0.16);
  const x = shoal.x + Math.cos(a) * r,
    z = shoal.z + Math.sin(a) * r * 0.65;
  const vx = -Math.sin(a) * r,
    vz = Math.cos(a) * r * 0.65;
  return {
    x,
    y: -1.18 + Math.sin(time * 0.8 + index) * 0.09,
    z,
    heading: Math.atan2(-vz, vx),
    tail: Math.sin(time * 7 + phase) * 0.4,
  };
}
export function sampleJump(time, index = 0) {
  const cycle = 15,
    offset = index * 7.5,
    t = (((time + offset) % cycle) + cycle) % cycle;
  const duration = 1.45,
    u = t / duration,
    active = t < duration;
  return {
    active,
    x: 72.3 + (active ? u : 0) * 1.8,
    y: -0.87 + (active ? Math.sin(u * Math.PI) * 1.42 : 0),
    z: index ? -0.5 : 18.8,
    pitch: active ? Math.atan2(1.42 * Math.PI * Math.cos(u * Math.PI), 1.8) : 0,
    splash: t >= duration && t < duration + 0.85,
    splashAge: Math.max(0, t - duration),
  };
}
