import { RECIPES } from "./data.js";
import { isHead, releaseQueue } from "./queue.js";
import { releaseSeat } from "./seating.js";
export function createOrder(model, n) {
  if (model.orders.some((o) => o.customer === n.id)) return false;
  model.orders.push({
    customer: n.id,
    recipe: n.recipe,
    status: "WAITING",
    paid: false,
    createdAt: model.clock,
    step: 0,
    completedSteps: [],
  });
  model.touch();
  return true;
}
export function startOrder(model, id) {
  const o = model.orders.find((o) => o.customer === id),
    n = model.customers.find((n) => n.id === id);
  if (
    !o ||
    o.status !== "WAITING" ||
    !n ||
    !isHead(model, id) ||
    !n.queueReady ||
    model.activeOrder !== null
  )
    return model.notify(
      "Chọn khách đầu hàng đã tới quầy; mỗi lần chỉ pha một đơn.",
    );
  model.activeOrder = id;
  o.status = "PREPARING";
  model.transition(n, "WAITING_FOR_DRINK");
  model.message = "Làm theo vật thể phát sáng. Nhấn E một lần ở mỗi bước.";
  model.touch();
  return true;
}
export function cancelOrder(model, id) {
  const o = model.orders.find((o) => o.customer === id),
    n = model.customers.find((n) => n.id === id);
  if (
    !o ||
    !n ||
    !["WAITING", "PREPARING", "READY", "WAITING_PAYMENT"].includes(o.status) ||
    o.paid
  )
    return false;
  o.status = "CANCELLED";
  if (model.activeOrder === id) {
    model.activeOrder = null;
    model.craft = null;
    model.job = null;
  }
  if (model.register?.orderId === id) model.register = null;
  releaseQueue(model, id);
  releaseSeat(model, n);
  model.account.stats.cancelled++;
  model.account.stats.streak = 0;
  model.transition(n, "LEAVING_SHOP");
  model.touch();
  return true;
}
export function currentOrder(model) {
  return model.orders.find((o) => o.customer === model.activeOrder) || null;
}
export function recipeFor(order) {
  return RECIPES.find((r) => r.id === order?.recipe);
}
