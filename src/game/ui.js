import { RECIPES, ACTIONS, QUESTS, money } from "./data.js";
import { levelFor } from "./economy.js";
import { currentOrder, recipeFor } from "./orders.js";
import { tutorialStep } from "./crafting.js";
import { DENOMINATIONS, selectedTotal, notesFor } from "./cash-register.js";
import "./ui.css";
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const statusText = {
  WAITING: "Chờ lượt",
  PREPARING: "Đang pha",
  READY: "Đã pha xong",
  WAITING_PAYMENT: "Chờ thối tiền",
  PAID: "Đã thanh toán",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
};
export function gameUI(model, command, onModal) {
  const root = document.createElement("section");
  root.id = "cafe-game";
  root.hidden = true;
  root.innerHTML =
    '<div class="game-hud"></div><div class="game-notice" role="status"></div><div class="brew-guide"></div><div class="game-crosshair">+</div><div class="game-interact"></div><div class="game-modal" hidden><article></article></div>';
  document.querySelector("#app").append(root);
  let panel = null,
    station = null,
    last = "";
  const modal = root.querySelector(".game-modal");
  const button = (action, label, id = "", disabled = false) =>
    `<button data-action="${action}" data-id="${id}" ${disabled ? "disabled" : ""}>${label}</button>`;
  function open(id, at = null) {
    panel = id;
    station = at;
    modal.hidden = false;
    onModal(true);
    render();
  }
  function close() {
    panel = null;
    modal.hidden = true;
    onModal(false);
  }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const a = b.dataset.action;
    if (a === "close") close();
    else if (a === "panel") open(b.dataset.id);
    else command(a, b.dataset.id);
  });
  function contents() {
    if (panel === "orders" || panel === "counter")
      return `<h2>Đơn hàng <small>${model.queue.length}/3 khách</small></h2><p class="panel-help">Chọn khách đầu hàng. Sau đó làm theo vật thể phát sáng.</p>${
        model.orders
          .filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status))
          .map((o) => {
            const n = model.customers.find((n) => n.id === o.customer),
              r = recipeFor(o),
              head = model.queue[0] === o.customer;
            return `<section class="order-card ${head ? "is-head" : ""}"><div><b>#${o.customer} · ${esc(n?.name || "Khách")}</b><span class="status-pill">${statusText[o.status]}</span></div><h3>${r.name}</h3><p>${money(r.price)} · Chờ ${Math.floor(n?.waitTime || 0)} giây · Hài lòng ${Math.round(n?.satisfaction || 100)}%</p>${o.status === "WAITING" ? button("start", "BẮT ĐẦU PHA CHẾ", o.customer, station !== "counter" || !head || !n?.queueReady || model.activeOrder !== null) : o.status === "WAITING_PAYMENT" ? button("cash", "Mở két tiền", o.customer, station !== "counter") : o.status === "PREPARING" ? `<p>Bước ${Math.min(r.steps.length, o.step + 1)}/${r.steps.length}</p>` : ""}${o.status === "WAITING" ? button("cancel", "Huỷ đơn", o.customer, station !== "counter") : ""}${!head && o.status === "WAITING" ? "<small>Đang chờ khách trước hoàn tất.</small>" : ""}</section>`;
          })
          .join("") || "<p>Khách sẽ tự vào khi cửa mở và quán mở bán.</p>"
      }${station !== "counter" ? "<p>Đứng trong lối nhân viên, nhấn E tại màn hình để bắt đầu.</p>" : ""}`;
    if (panel === "cash") {
      const reg = model.register,
        o = model.orders.find((o) => o.customer === reg?.orderId),
        r = recipeFor(o);
      if (!o || !r)
        return "<h2>Két tiền</h2><p>Chưa có khách cần thanh toán.</p>";
      const due = o.tender - r.price,
        total = selectedTotal(reg.notes),
        hint = notesFor(due);
      return `<h2>Thối tiền cho ${esc(model.customers.find((n) => n.id === o.customer)?.name || "khách")}</h2><div class="cash-summary"><p>${r.name}<b>${money(r.price)}</b></p><p>Khách đưa<b>${money(o.tender)}</b></p>${model.settings.easyChange ? `<p>Cần thối<b>${money(due)}</b></p>` : ""}</div><div class="cash-drawer">${DENOMINATIONS.map((n, i) => `<button class="banknote note-${i}" data-action="note" data-id="${n}"><span>VIỆT NAM</span><b>${money(n)}</b><small>Chọn 1 tờ</small></button>`).join("")}</div><div class="selected-notes">${reg.notes.map((n) => `<span>${money(n)}</span>`).join("") || "Chưa chọn tờ tiền nào"}</div><p class="change-total">Đã chọn <strong>${money(total)}</strong></p><p class="change-diff">${total === due ? "✓ Đã đủ tiền thối" : model.settings.easyChange ? `${total < due ? "Còn thiếu" : "Đang dư"} ${money(Math.abs(total - due))}` : "Số tiền chưa khớp."}</p>${button("undo", "↶ Hoàn tác", "", !reg.notes.length)}${button("reset", "Làm lại", "", !reg.notes.length)}${model.settings.easyChange ? button("hint", "Gợi ý cách thối") : ""}${button("confirm", "XÁC NHẬN THỐI TIỀN", o.customer, total !== due || model.account.cash < due)}${model.cashHint ? `<p class="cash-hint">${due === 0 ? "Khách đưa đúng tiền, không cần thối." : hint.map(money).join(" + ")} · Bạn vẫn cần tự chọn các tờ tiền.</p>` : ""}`;
    }
    if (panel === "quests")
      return `<h2>Nhiệm vụ nhỏ</h2>${QUESTS.map((q) => {
        const value =
            q.stat === "revenue"
              ? model.account.revenue
              : model.account.stats[q.stat],
          done = model.account.claimed.includes(q.id);
        return `<section><b>${q.name}</b><p>${q.description}</p><progress max="${q.target}" value="${value}"></progress><p>${Math.min(value, q.target).toLocaleString("vi-VN")} / ${q.target.toLocaleString("vi-VN")} · ${money(q.cash)} + ${q.xp} EXP</p>${button("claim", done ? "Đã nhận" : "Nhận thưởng", q.id, done || value < q.target)}</section>`;
      }).join("")}`;
    if (panel === "stats")
      return `<h2>Sổ thu chi</h2><p>Doanh thu <b>${money(model.account.revenue)}</b></p><p>Nguyên liệu ${money(model.account.costs)}</p>${model.account.history.map((h) => `<p>${h.amount > 0 ? "+" : ""}${money(h.amount)} · ${esc(h.label)}</p>`).join("")}`;
    if (panel === "settings")
      return `<h2>Chơi thật dễ</h2><p>E tương tác · O mở bán · J nhiệm vụ · Esc thả chuột. Bấm cảnh để nhìn tiếp.</p><p>Đi vòng bên phải quầy vào lối nhân viên. Chọn đơn trên màn hình, rồi làm theo vật thể phát sáng.</p>${button("static", `Highlight: ${model.settings.staticHighlight ? "Tĩnh" : "Chuyển sáng nhẹ"}`)}${button("easy", `Thối tiền dễ: ${model.settings.easyChange ? "Bật" : "Tắt"}`)}${button("save", "Lưu ngay")}<p>Tiến trình được lưu trên trình duyệt. Chế độ Multiplayer, mua nội thất và mở rộng quán chưa có trong bản này.</p>`;
    return "<h2>ANTELEO</h2><p>Chọn đơn ở màn hình, rồi theo dấu chỉ dẫn.</p>";
  }
  function render() {
    modal.classList.toggle("cash-panel", panel === "cash");
    const a = model.account,
      free = model.seats.filter((s) => s.status === "AVAILABLE").length,
      waiting = model.orders.filter((o) =>
        ["WAITING", "PREPARING", "READY", "WAITING_PAYMENT"].includes(o.status),
      ).length,
      tracked = QUESTS.find((q) => !a.claimed.includes(q.id));
    root.querySelector(".game-hud").innerHTML =
      `<div class="hud-title"><b>ANTELEO</b><strong>${money(a.cash)}</strong><span>Cấp ${levelFor(a.xp)}</span><progress max="50" value="${a.xp % 50}"></progress></div><div class="hud-counts">${model.queue.length}/3 xếp hàng · ${waiting} đơn · ${free}/2 ghế trống</div><div>${button("business", model.business ? "O · Đang mở bán" : "O · Ngừng nhận khách")}${button("panel", "Đơn", "orders")}${button("panel", "J · Nhiệm vụ", "quests")}${button("panel", "Thu chi", "stats")}${button("panel", "⚙", "settings")}</div>${tracked ? `<small>${tracked.name} · ${Math.min(tracked.target, tracked.stat === "revenue" ? a.revenue : a.stats[tracked.stat]).toLocaleString("vi-VN")}/${tracked.target.toLocaleString("vi-VN")}</small>` : ""}`;
    const order = currentOrder(model),
      r = recipeFor(order),
      step = tutorialStep(model);
    root.querySelector(".brew-guide").innerHTML = step
      ? `<span class="guide-eyebrow">ĐƠN ĐANG PHA · #${order.customer}</span><h3>${r.name}</h3><div class="guide-step"><span>${step.icon}</span><b>${step.label}</b></div><progress max="${r.steps.length}" value="${order.step + (model.job ? 1 - model.job.left / model.job.total : 0)}"></progress><p>Bước ${order.step + 1}/${r.steps.length} · ${model.job ? `Máy đang chạy ${Math.ceil(model.job.left)}s` : "Đi đến dấu chỉ dẫn và nhấn E"}</p>`
      : order?.status === "WAITING_PAYMENT"
        ? `<b>✓ Đã pha xong ${r.name}</b><p>Khách đưa ${money(order.tender)}. Nhấn E tại POS để thối tiền.</p>`
        : "";
    root.querySelector(".game-notice").textContent = model.message;
    if (panel)
      modal.querySelector("article").innerHTML =
        `<header>${button("close", "Đóng ×")}</header>${contents()}`;
  }
  return {
    root,
    open,
    close,
    get panel() {
      return panel;
    },
    get station() {
      return station;
    },
    active(v) {
      root.hidden = !v;
      document.body.classList.toggle("in-game", v);
      if (!v) {
        panel = null;
        modal.hidden = true;
      }
    },
    render,
    update(prompt) {
      root.querySelector(".game-interact").textContent = prompt;
      const stamp = `${model.revision}/${Math.floor(model.clock)}/${Math.ceil(model.job?.left || 0)}`;
      if (stamp !== last) {
        last = stamp;
        render();
      }
    },
  };
}
