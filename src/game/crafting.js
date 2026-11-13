import { ACTIONS } from "./data.js";
import { transact } from "./economy.js";
export function prepare(model, action) {
  const a = ACTIONS[action];
  if (!a) return "Thao tác không hợp lệ.";
  if (model.job) return "Máy đang chạy, hãy chờ hoàn tất.";
  if (action === "cup") {
    if (model.craft) return "Bạn đang cầm một ly. Hãy giao hoặc bỏ ly trước.";
  } else if (!model.craft) return "Hãy lấy ly ở khu nguyên liệu trước.";
  if (model.craft?.ready) return "Ly đã đậy nắp. Hãy giao hoặc bỏ ly.";
  if (action === "coffee" && model.craft.steps.includes("tea"))
    return "Máy cà phê không nhận ly đã có trà.";
  if (action === "shake" && !model.craft.steps.includes("tea"))
    return "Máy lắc cần một ly có trà; không thể pha cà phê ở đây.";
  if (!transact(model.account, -a.cost, a.label))
    return "Không đủ tiền nguyên liệu.";
  if (action === "cup") model.craft = { steps: ["cup"], ready: false };
  else if (a.seconds) model.job = { action, left: a.seconds, total: a.seconds };
  else {
    model.craft.steps.push(action);
    if (action === "finish") model.craft.ready = true;
  }
  model.touch();
  return "";
}
export function advanceCraft(model, dt) {
  if (!model.job) return;
  model.job.left -= dt;
  if (model.job.left <= 0) {
    model.craft.steps.push(model.job.action);
    model.job = null;
    model.touch();
  }
}
