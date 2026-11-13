import { RECIPES } from "./data.js";
import { validateRecipe } from "./recipe-validator.js";
export function acceptOrder(model, id) {
  const n = model.customers.find((n) => n.id === id);
  if (
    !n ||
    n.state !== "WAITING_TO_ORDER" ||
    model.orders.some((o) => o.customer === id)
  )
    return false;
  model.orders.push({
    customer: id,
    recipe: n.recipe,
    status: "WAITING",
    paid: false,
  });
  model.transition(n, "ORDER_PLACED");
  model.message = "Đã nhận đơn. H để xem công thức.";
  return true;
}
export function serveDrink(model) {
  const n = model.customers.find((n) => n.state === "WAITING_FOR_DRINK");
  if (!n || !model.craft?.ready)
    return model.notify("Cần một ly hoàn thành và khách đang chờ đồ.");
  const r = RECIPES.find((r) => r.id === n.recipe),
    check = validateRecipe(r, model.craft.steps);
  model.craft = null;
  if (!check.ok) {
    n.rejectedAt = model.clock;
    model.account.stats.errors++;
    model.account.stats.streak = 0;
    n.satisfaction = Math.max(0, n.satisfaction - 15);
    model.notify(
      `Khách từ chối: ${check.reason} Chi phí nguyên liệu đã được trừ; hãy pha lại.`,
    );
    return false;
  }
  model.orders.find((o) => o.customer === n.id).status = "SERVED";
  model.account.xp += 6;
  model.account.stats.served++;
  if (r.id === "black" || r.id === "milkCoffee") model.account.stats.coffee++;
  model.account.stats.streak++;
  model.account.stats.bestStreak = Math.max(
    model.account.stats.bestStreak,
    model.account.stats.streak,
  );
  n.pickedUp = false;
  model.transition(n, "WALKING_TO_TABLE");
  model.message =
    "Khách nhận ly và đến bàn. Doanh thu chỉ cộng sau thanh toán.";
  return true;
}
