// Distances are meters; this controller is independent of rendering and testable.
// Two road lanes are connected by turning circles at the ends of the block.
export const ROUTE = { near: 24, far: -62, radius: 2.25, centerX: 4.25 };
const straight = ROUTE.near - ROUTE.far;
const bend = Math.PI * ROUTE.radius;
export const routeLength = 2 * (straight + bend);
export function routePose(distance) {
  const s = ((distance % routeLength) + routeLength) % routeLength;
  const { near, far, radius: r, centerX: x } = ROUTE;
  if (s < straight) return { x: x - r, z: far + s, heading: 0 };
  if (s < straight + bend) {
    const a = (s - straight) / r;
    return { x: x - r * Math.cos(a), z: near + r * Math.sin(a), heading: a };
  }
  if (s < 2 * straight + bend)
    return { x: x + r, z: near - (s - straight - bend), heading: Math.PI };
  const a = (s - 2 * straight - bend) / r;
  return {
    x: x + r * Math.cos(a),
    z: far - r * Math.sin(a),
    heading: Math.PI + a,
  };
}
export function createTrafficController() {
  const stopAt = 7 - ROUTE.far; // Nose stays before the zebra crossing at z=11.
  let distance = 50,
    speed = 2.7,
    hold = 0,
    served = false;
  return {
    update(dt) {
      dt = Math.min(Math.max(dt, 0), 0.05);
      const wrapped = distance % routeLength;
      const before = stopAt - wrapped;
      if (hold > 0) {
        hold = Math.max(0, hold - dt);
        speed = 0;
      } else {
        const target =
          !served && before >= 0
            ? Math.min(2.7, Math.sqrt(2 * 1.5 * before))
            : 2.7;
        speed += Math.max(-1.5 * dt, Math.min(1.5 * dt, target - speed));
        let advance = speed * dt;
        if (!served && before >= 0 && advance >= before - 0.008) {
          advance = before;
          speed = 0;
          hold = 1.6;
          served = true;
        }
        distance += advance;
        if (distance >= routeLength) {
          distance -= routeLength;
          served = false;
        }
      }
      return {
        ...routePose(distance),
        distance,
        speed,
        stopped: hold > 0,
        holdRemaining: hold,
      };
    },
  };
}
