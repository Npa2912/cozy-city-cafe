import { chooseTender, selectedTotal } from "./cash-register.js";
import { recipeFor } from "./orders.js";
import { releaseQueue, isHead } from "./queue.js";
import { transact } from "./economy.js";
export function requestPayment(model, order) {
  if (order.status !== "READY") return false;
  const n = model.customers.find((n) => n.id === order.customer);
  if (!n) return false;
  order.tender ??= chooseTender(
    recipeFor(order).price,
    model.account.cash,
    model.random,
  );
  order.status = "WAITING_PAYMENT";
  model.transition(n, "WAITING_FOR_PAYMENT");
  return true;
}
export function openRegister(model, id) {
  const o = model.orders.find((o) => o.customer === id),
    n = model.customers.find((n) => n.id === id);
  if (
    !o ||
    !n ||
    !isHead(model, id) ||
    o.status !== "WAITING_PAYMENT" ||
    o.paid ||
    n.state !== "WAITING_FOR_PAYMENT"
  )
    return false;
  if (model.register?.orderId !== id)
    model.register = { orderId: id, notes: [], attempts: 0 };
  model.touch();
  return true;
}
export function confirmPayment(model, id) {
  const o = model.orders.find((o) => o.customer === id),
    n = model.customers.find((n) => n.id === id),
    register = model.register;
  if (
    !o ||
    !n ||
    o.status !== "WAITING_PAYMENT" ||
    o.paid ||
    !isHead(model, id) ||
    !register ||
    register.orderId !== id ||
    n.state !== "WAITING_FOR_PAYMENT"
  )
    return model.notify("Đơn chưa sẵn sàng hoặc đã thanh toán.");
  const recipe = recipeFor(o),
    change = o.tender - recipe.price,
    selected = selectedTotal(register.notes);
  if (selected !== change) {
    register.attempts++;
    if (register.attempts % 3 === 0)
      n.satisfaction = Math.max(0, n.satisfaction - 2);
    return model.notify(
      `Tiền thối ${selected < change ? "còn thiếu" : "dư"} ${new Intl.NumberFormat("vi-VN").format(Math.abs(change - selected))}đ. Bạn có thể sửa lại.`,
    );
  }
  if (model.account.cash < change)
    return model.notify("Quỹ tiền thối chưa đủ cho giao dịch này.");
  o.paid = true;
  o.status = "PAID";
  o.changeNotes = [...register.notes];
  transact(model.account, recipe.price, `Bán ${recipe.name} · #${id}`, {
    tender: o.tender,
    change,
  });
  model.account.revenue += recipe.price;
  model.account.xp += recipe.xp;
  model.account.stats.served++;
  model.account.stats.changeCorrect++;
  model.account.stats.streak++;
  model.account.stats.bestStreak = Math.max(
    model.account.stats.bestStreak,
    model.account.stats.streak,
  );
  model.register = null;
  model.activeOrder = null;
  releaseQueue(model, id);
  n.pickedUp = false;
  model.transition(n, "PICKING_UP");
  model.message =
    "Thối tiền chính xác! Khách nhận đồ uống, chọn ghế hoặc mang đi.";
  model.touch();
  return true;
}
