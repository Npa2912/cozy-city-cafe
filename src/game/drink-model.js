import { group, cylinder, sphere, torus, mat } from "../street.js";
export function buildDrink(parent, recipe = "black") {
  const g = group(parent),
    tea = recipe === "milkTea" || recipe === "pearlTea";
  cylinder(
    g,
    0,
    0.1,
    0,
    0.09,
    0.065,
    0.2,
    tea
      ? mat("#dfe4d5", { transparent: true, opacity: 0.3, roughness: 0.2 })
      : "#f1e2be",
    24,
  );
  const liquid = cylinder(
    g,
    0,
    0.105,
    0,
    0.078,
    0.056,
    0.15,
    recipe === "black" ? "#654635" : "#c5a27a",
    24,
  );
  liquid.material = liquid.material.clone();
  const rim = torus(g, 0, 0.21, 0, 0.09, 0.012, "#e9dbc0");
  rim.rotation.x = Math.PI / 2;
  if (tea) {
    cylinder(g, 0, 0.218, 0, 0.093, 0.093, 0.018, "#ddd7bb", 24);
    cylinder(g, 0.025, 0.34, 0, 0.012, 0.012, 0.29, "#ab8d9f", 12);
  } else {
    const handle = torus(g, 0.105, 0.12, 0, 0.048, 0.014, "#efe1c5");
    handle.rotation.y = Math.PI / 2;
  }
  const pearls = group(g);
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4;
    sphere(
      pearls,
      Math.cos(a) * 0.043,
      0.035,
      Math.sin(a) * 0.043,
      0.017,
      0.017,
      0.017,
      "#513d32",
    );
  }
  pearls.visible = recipe === "pearlTea";
  return { g, liquid, pearls };
}
