// The four established core views are preserved exactly; new views are additive.
export const CAMERA_VIEWS = {
  expanded: { position: [95, 32, 30], target: [28, 5, -12], fov: 38 },
  overview: { position: [13.8, 11.8, 19.5], target: [-4, 4.8, -10], fov: 57 },
  flowers: { position: [12, 3.2, 14.5], target: [-4, 4.6, -8], fov: 60 },
  street: { position: [10.8, 1.9, 5.8], target: [-3.8, 3.2, -8], fov: 65 },
  counter: { position: [-4.2, 2.2, -6.5], target: [-7.3, 2.25, 0], fov: 65 },
  annex: { position: [-10.1, 2.55, -7.3], target: [-14.5, 1.6, -3.5], fov: 65 },
  pos: { position: [-4.8, 2.3, -3.6], target: [-6.2, 1.9, -1.8], fov: 58 },
  coast: { position: [82, 15, 35], target: [80, 2, -24], fov: 58 },
  fishing: { position: [94, 8, 25], target: [77, 1.5, 11], fov: 56 },
};

export const WALK_STARTS = {
  expanded: { position: [11.6, 1.9, 20], target: [-3.8, 2, -4] },
  coast: { position: [62, 1.9, 22], target: [66, 1.9, -10] },
  fishing: { position: [76, 1.9, 12], target: [83, 1.8, 14.3] },
};
