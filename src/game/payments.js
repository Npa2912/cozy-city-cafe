import { RECIPES } from "./data.js";
import { transact } from "./economy.js";
export function pay(model, id) {
  const n = model.customers.find((n) => n.id === id),
    o = model.orders.find((o) => o.customer === id);
  if (
    !n ||
    n.state !== "WAITING_FOR_PAYMENT" ||
    !o ||
    o.status !== "SERVED" ||
    o.paid
  )
    return false;
  const r = RECIPES.find((r) => r.id === o.recipe);
  o.paid = true;
  o.status = "COMPLETED";
  transact(model.account, r.price, `POS #${id} · ${r.name}`);
  model.account.revenue += r.price;
  model.account.xp += r.xp;
  model.transition(n, "LEAVING_SHOP");
  model.touch();
  return true;
}
