import { ACTIONS } from "./data.js";
import { currentOrder, recipeFor } from "./orders.js";
import { transact } from "./economy.js";
export function tutorialStep(model) {
  const order = currentOrder(model),
    recipe = recipeFor(order);
  return order?.status === "PREPARING"
    ? ACTIONS[recipe.steps[order.step]]
    : null;
}
export function performStep(model, station) {
  const order = currentOrder(model),
    recipe = recipeFor(order),
    step = tutorialStep(model);
  if (!order || !step)
    return model.notify(
      "Đến màn hình order, chọn khách đầu hàng và Bắt đầu pha chế.",
    );
  if (model.job) return model.notify("Máy đang chạy. Chờ một chút nhé.");
  if (station !== step.station)
    return model.notify(
      `Bước này: ${step.label}. Hãy tới vật thể được chỉ dẫn.`,
    );
  if (!transact(model.account, -step.cost, step.label))
    return model.notify("Không đủ tiền nguyên liệu.");
  const action = recipe.steps[order.step];
  if (action === "cup") model.craft = { steps: ["cup"], ready: false };
  if (step.seconds) {
    model.job = {
      action,
      orderId: order.customer,
      left: step.seconds,
      total: step.seconds,
    };
    model.touch();
    return true;
  }
  finishStep(model, action);
  return true;
}
function finishStep(model, action) {
  const order = currentOrder(model);
  if (!order || order.status !== "PREPARING") return;
  order.completedSteps.push(action);
  order.step++;
  if (action !== "cup" && action !== "delivery") model.craft.steps.push(action);
  if (action === "delivery") {
    order.status = "READY";
    order.readyAt = model.clock;
    model.craft = null;
    model.account.stats.prepared++;
    model.message =
      "Pha chế thành công! Khách đang đưa tiền. Đến POS để mở két.";
  } else model.message = tutorialStep(model)?.label || "Đã hoàn thành bước";
  model.touch();
}
export function advanceCraft(model, dt) {
  if (!model.job) return;
  model.job.left -= dt;
  if (model.job.left <= 0) {
    const action = model.job.action;
    model.job = null;
    finishStep(model, action);
  }
}
