import { RECIPES, ACTIONS, QUESTS } from "./data.js";
import { levelFor } from "./economy.js";
import "./ui.css";
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function gameUI(model, command, onModal) {
  const root = document.createElement("section");
  root.id = "cafe-game";
  root.hidden = true;
  root.innerHTML =
    '<div class="game-hud"></div><div class="game-notice" role="status"></div><div class="game-crosshair">+</div><div class="game-interact"></div><div class="game-modal" hidden><article></article></div>';
  document.querySelector("#app").append(root);
  let panel = null,
    station = null,
    last = "";
  const modal = root.querySelector(".game-modal");
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
  root.addEventListener("click", (event) => {
    const b = event.target.closest("button");
    if (!b) return;
    const action = b.dataset.action;
    if (action === "close") close();
    else if (action === "panel") open(b.dataset.id);
    else command(action, b.dataset.id);
  });
  const button = (action, label, id = "", disabled = false) =>
    `<button data-action="${action}" data-id="${id}" ${disabled ? "disabled" : ""}>${label}</button>`;
  function contents() {
    const waiting = model.customers.find((n) => n.state === "WAITING_TO_ORDER");
    const r = RECIPES.find((r) => r.id === waiting?.recipe);
    if (panel === "welcome")
      return `<h2>Ca đầu tiên tại ANTELEO</h2><p>Mở cửa kính bằng E, sau đó bật Mở bán. Đến quầy nhận đơn, lấy ly và pha theo sổ tay H. Giao ly ở khay bên phải; khách uống 18 giây rồi quay lại POS.</p><p>WASD · Chuột nhìn · E tương tác · H công thức · J nhiệm vụ · Esc thả chuột.</p>${button("close", "Vào quán")}`;
    if (panel === "recipes")
      return `<h2>Sổ tay công thức</h2>${RECIPES.map((r) => `<section><strong>${r.name} <small>${r.price} xu</small></strong><ol>${r.steps.map((s) => `<li>${ACTIONS[s].label}</li>`).join("")}</ol></section>`).join("")}<p>Máy cà phê và máy lắc là hai điểm tương tác riêng. Nguyên liệu được tính phí khi dùng.</p>`;
    if (panel === "orders" || panel === "counter")
      return `<h2>Quầy nhận đơn</h2>${waiting ? `<p>${waiting.name} muốn <b>${r.name}</b> · ${r.price} xu</p>${station === "counter" ? button("accept", "Nhận đơn", waiting.id) : "<p>Đến quầy và nhấn E để nhận.</p>"}` : "<p>Chưa có khách chờ gọi món.</p>"}${model.orders
        .filter((o) => o.status !== "COMPLETED")
        .map((o) => {
          const n = model.customers.find((n) => n.id === o.customer),
            r = RECIPES.find((r) => r.id === o.recipe);
          return `<section>#${o.customer} · ${esc(n?.name || "Khách")}<br><b>${r.name}</b> · ${o.status === "SERVED" ? "Đã phục vụ" : "Đang pha"}<br>Hài lòng ${Math.round(n?.satisfaction || 0)}%</section>`;
        })
        .join("")}`;
    if (panel === "pos")
      return `<h2>ANTELEO · POS</h2>${
        model.orders
          .filter((o) => !o.paid)
          .map((o) => {
            const n = model.customers.find((n) => n.id === o.customer),
              r = RECIPES.find((r) => r.id === o.recipe);
            return `<section><b>${esc(n?.name || "Khách")} · #${o.customer}</b><p>${r.name} · ${r.price} xu</p><p>${n?.state === "WAITING_FOR_PAYMENT" ? "Đã uống xong, đang chờ thanh toán" : "Chưa đủ điều kiện thanh toán"}</p>${button("pay", "Xác nhận thanh toán", o.customer, n?.state !== "WAITING_FOR_PAYMENT" || station !== "counter")}</section>`;
          })
          .join("") || "<p>Không có đơn chờ thanh toán.</p>"
      }`;
    if (panel === "ingredients")
      return `<h2>Khu nguyên liệu</h2><p>Chọn từng nguyên liệu; thứ tự thao tác sẽ được kiểm tra khi giao.</p>${["cup", "tea", "milk", "sugar", "pearls", "finish"].map((k) => button("craft", `${ACTIONS[k].label} · ${ACTIONS[k].cost} xu`, k)).join("")}${button("discard", "Bỏ ly đang cầm")}<p>Ly hiện tại: ${model.craft?.steps.map((s) => ACTIONS[s].label).join(" → ") || "Chưa có ly"}</p>`;
    if (panel === "coffee" || panel === "tea") {
      const k = panel === "coffee" ? "coffee" : "shake";
      return `<h2>${panel === "coffee" ? "Máy pha cà phê" : "Máy lắc trà sữa"}</h2><p>Đặt ly đang cầm, vận hành máy và đợi 3 giây. Máy có âm thanh và hiệu ứng tại vị trí thiết bị.</p>${button("craft", ACTIONS[k].label, k, !!model.job || !model.craft)}<p>${model.job ? `Đang chạy · ${Math.ceil(model.job.left)} giây` : "Máy sẵn sàng"}</p>${model.job ? `<progress max="${model.job.total}" value="${model.job.total - model.job.left}"></progress>` : ""}`;
    }
    if (panel === "quests")
      return `<h2>Nhiệm vụ</h2>${QUESTS.map((q) => {
        const value =
            q.stat === "revenue"
              ? model.account.revenue
              : model.account.stats[q.stat],
          claimed = model.account.claimed.includes(q.id);
        return `<section><strong>${q.name}</strong><p>${q.description}</p><progress max="${q.target}" value="${value}"></progress><p>${Math.min(value, q.target)} / ${q.target} · ${q.cash} xu + ${q.xp} EXP</p>${button("claim", claimed ? "Đã nhận" : "Nhận thưởng", q.id, claimed || value < q.target)}</section>`;
      }).join("")}`;
    if (panel === "stats")
      return `<h2>Sổ thu chi</h2><p>Doanh thu ${model.account.revenue} xu · Nguyên liệu ${model.account.costs} xu</p>${model.account.history.map((h) => `<p>${h.amount > 0 ? "+" : ""}${h.amount} · ${esc(h.label)}</p>`).join("") || "<p>Chưa có giao dịch.</p>"}`;
    if (panel === "settings")
      return `<h2>Điều khiển & lưu game</h2><p>WASD: di chuyển · E: tương tác · H: công thức · J: nhiệm vụ. Esc đóng bảng hoặc thả chuột. Nhấp cảnh để nhìn tiếp.</p><p>Lưu tự động trên trình duyệt; ca đang phục vụ cũng được lưu. Tiền này chỉ thuộc bản chơi đơn.</p><p>Mua nội thất, Edit Mode và mở rộng theo cấp thuộc Mốc 3, chưa có trong bản chơi này.</p>${button("save", "Lưu ngay")}`;
    return "<p>Đến đúng thiết bị để tương tác bằng E.</p>";
  }
  function render() {
    const a = model.account,
      level = levelFor(a.xp),
      free = model.seats.filter((s) => s.status === "AVAILABLE").length;
    const tracked = QUESTS.find((q) => !a.claimed.includes(q.id));
    root.querySelector(".game-hud").innerHTML =
      `<div><b>ANTELEO</b> <span>${a.cash.toFixed(1)} xu</span> · Cấp ${level}<progress max="50" value="${a.xp % 50}"></progress></div><div>${button("business", model.business ? "O · Đang mở bán" : "O · Ngừng nhận khách")}<span>${model.customers.length} khách · ${free}/2 chỗ trống · Cửa ${model.doorOpen ? "OPEN" : "CLOSED"}</span></div><div>${button("panel", "Đơn hàng", "orders")}${button("panel", "H · Công thức", "recipes")}${button("panel", "J · Nhiệm vụ", "quests")}${button("panel", "Thu chi", "stats")}${button("panel", "Cài đặt", "settings")}</div>${tracked ? `<small>Đang theo dõi: ${tracked.name} · ${Math.min(tracked.target, tracked.stat === "revenue" ? a.revenue : a.stats[tracked.stat])}/${tracked.target}</small>` : "<small>Đã hoàn thành các nhiệm vụ khởi đầu</small>"}`;
    root.querySelector(".game-notice").textContent = model.job
      ? `${ACTIONS[model.job.action].label} · ${Math.ceil(model.job.left)}s`
      : model.cleaning
        ? `Đang dọn bàn · ${Math.ceil(model.cleaning.left)}s`
        : model.message;
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
    active(value) {
      root.hidden = !value;
      document.body.classList.toggle("in-game", value);
      if (!value) {
        panel = null;
        modal.hidden = true;
      }
    },
    update(prompt) {
      root.querySelector(".game-interact").textContent = prompt;
      const stamp = `${Math.floor(model.clock)}/${model.revision}/${Math.ceil(model.job?.left || 0)}/${Math.ceil(model.cleaning?.left || 0)}`;
      if (stamp !== last) {
        last = stamp;
        render();
      }
    },
    render,
  };
}
