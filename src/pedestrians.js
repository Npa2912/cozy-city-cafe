export const WALK_ROUTES = [
  {
    x: -1.05,
    z: 3.9,
    end: -21,
    color: "#7cb9db",
    skirt: false,
    hair: "#3d3735",
    scale: 1.04,
  },
  {
    x: -1.7,
    z: -15,
    end: 8.1,
    color: "#efb9c6",
    skirt: true,
    hair: "#4e3430",
    hat: true,
    scale: 0.95,
  },
  {
    x: 11.55,
    z: -15,
    end: -3.8,
    color: "#c6d1a6",
    skirt: false,
    hair: "#353239",
    scale: 0.98,
  },
  {
    x: 12.4,
    z: -7,
    end: -27,
    color: "#a2c4dc",
    skirt: true,
    hair: "#59483c",
    scale: 0.93,
  },
];
export function sampleWalk(time, route, phase = 0) {
  const duration = Math.abs(route.end - route.z) / 0.65,
    cycle = (time + phase) % (2 * duration + 2);
  const out = cycle < duration,
    back = cycle > duration + 1 && cycle < 2 * duration + 1;
  const t = out
    ? cycle / duration
    : back
      ? (cycle - duration - 1) / duration
      : 0;
  const ease = t * t * (3 - 2 * t);
  const from = out ? route.z : route.end,
    to = out ? route.end : route.z;
  const z =
    out || back
      ? from + (to - from) * ease
      : cycle < duration + 1
        ? route.end
        : route.z;
  return {
    x: route.x,
    z,
    heading: (out ? route.end > route.z : route.z > route.end) ? 0 : Math.PI,
    stride: out || back ? Math.sin(Math.PI * t) : 0,
  };
}
