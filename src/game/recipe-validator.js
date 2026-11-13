import { ACTIONS } from "./data.js";
export function validateRecipe(recipe, steps) {
  const expected = recipe.steps;
  for (let i = 0; i < Math.max(expected.length, steps.length); i++)
    if (expected[i] !== steps[i])
      return {
        ok: false,
        reason: `Bước ${i + 1}: cần ${ACTIONS[expected[i]]?.label || "kết thúc"}, nhận ${ACTIONS[steps[i]]?.label || "thiếu bước"}.`,
      };
  return { ok: true };
}
