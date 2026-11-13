// Core origin and original shop fronts are deliberately unchanged. Expansion
// occupies the unused eastern edge and a surveyed pocket behind the café.
export const URBAN_PLAN = Object.freeze({
  shoreX: 66,
  waterY: -0.7,
  promenade: { minX: 54, maxX: 66, minZ: -68, maxZ: 40 },
  connector: { minX: 4, maxX: 54, minZ: 27.5, maxZ: 34.5 },
  connectorWalkZ: 25.5,
  pier: { minX: 65, maxX: 88, minZ: 9, maxZ: 15, deckY: 0.25 },
  annex: { minX: -17.1, maxX: -8.65, minZ: -8.2, maxZ: -1.5, floorY: 0.39 },
  rearDoor: { localX: 1.4, width: 1.2, minZ: -8, maxZ: -6.2 },
  coastWalk: { x: 62, z: -34, end: 24 },
  pos: { x: -1.8, y: 1.22, z: -2.32 },
});
export const PROTECTED_REAR_NEIGHBORS = [
  { name: "original tower", minX: -17.5, maxX: -10.5, minZ: -16, maxZ: -9 },
  {
    name: "existing alley stairs",
    minX: -13.5,
    maxX: -10.5,
    minZ: -0.32,
    maxZ: 5.2,
  },
  {
    name: "existing alley shop",
    minX: -25.5,
    maxX: -20,
    minZ: -11.5,
    maxZ: -4.5,
  },
];
export function overlaps(a, b, margin = 0) {
  return (
    a.minX < b.maxX + margin &&
    a.maxX > b.minX - margin &&
    a.minZ < b.maxZ + margin &&
    a.maxZ > b.minZ - margin
  );
}
