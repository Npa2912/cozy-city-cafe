// Small-café capacity and navigation policy. Expansion can adjust these values.
export const TRAFFIC = {
  maxInside: 3,
  maxOutside: 2,
  maxCustomers: 5,
  queueLimit: 3,
  arrivalMinSeconds: 20,
  arrivalMaxSeconds: 35,
  radius: 0.32,
  spawnClearance: 1.1,
  replanSeconds: 1.5,
  stuckSeconds: 2,
  seatFallbackSeconds: 12,
};
export const arrivalDelay = (random = Math.random) =>
  TRAFFIC.arrivalMinSeconds +
  Math.max(0, Math.min(1, random())) *
    (TRAFFIC.arrivalMaxSeconds - TRAFFIC.arrivalMinSeconds);
