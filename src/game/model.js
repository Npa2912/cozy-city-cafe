import { acceptOrder, serveDrink } from "./orders.js";
import { admitCustomer, advanceCustomers } from "./customers.js";
import { claimQuest } from "./quests.js";
import { ACTIONS, CONFIG } from "./data.js";
import { newAccount } from "./economy.js";
import { prepare, advanceCraft } from "./crafting.js";
import { pay } from "./payments.js";
export class CafeGame {
  constructor(layout, saved = null) {
    this.layout = layout;
    this.account = saved?.account || newAccount();
    this.seats = layout.seats.map((s, i) => ({
      ...s,
      id: i,
      status: "AVAILABLE",
    }));
    this.customers = [];
    this.orders = [];
    this.nextId = 1;
    this.business = false;
    this.doorOpen = false;
    this.craft = null;
    this.job = null;
    this.clock = 0;
    this.spawnClock = 0;
    this.cleaning = null;
    this.revision = 0;
    this.message = "Mở cửa bằng E, rồi chọn Mở bán.";
    if (saved) {
      for (const key of [
        "seats",
        "customers",
        "orders",
        "nextId",
        "business",
        "doorOpen",
        "craft",
        "job",
        "clock",
        "spawnClock",
        "cleaning",
      ])
        if (saved[key] !== undefined) this[key] = saved[key];
    }
  }
  touch() {
    this.revision++;
  }
  transition(n, state) {
    n.state = state;
    n.age = 0;
    this.touch();
  }
  notify(message) {
    this.message = message;
    this.touch();
    return false;
  }
  toggleBusiness() {
    this.business = !this.business;
    this.touch();
  }
  admit() {
    return admitCustomer(this);
  }
  accept(id) {
    return acceptOrder(this, id);
  }
  action(action) {
    const reason = prepare(this, action);
    if (reason) return this.notify(reason);
    this.message =
      action === "finish"
        ? "Ly đã đậy nắp. Mang đến khu giao đồ."
        : `Đang chuẩn bị: ${ACTIONS[action].label}`;
    return true;
  }
  discard() {
    if (this.job) return this.notify("Chờ máy hoàn tất trước khi bỏ ly.");
    this.craft = null;
    this.touch();
  }
  serve() {
    return serveDrink(this);
  }
  pay(id) {
    const ok = pay(this, id);
    if (!ok)
      this.notify(
        "Khách phải uống xong và đứng tại POS; đơn chỉ được thanh toán một lần.",
      );
    else this.message = "Đã thanh toán. Khách đang ra cửa.";
    return ok;
  }
  claim(id) {
    const ok = claimQuest(this.account, id);
    if (ok) this.touch();
    return ok;
  }
  clean(id) {
    const s = this.seats.find((s) => s.id === id);
    if (!s || s.status !== "NEEDS_CLEANING" || this.cleaning) return false;
    this.cleaning = { id, left: CONFIG.cleanSeconds };
    this.touch();
    return true;
  }
  update(dt, move) {
    this.clock += dt;
    advanceCraft(this, dt);
    if (this.cleaning) {
      this.cleaning.left -= dt;
      if (this.cleaning.left <= 0) {
        const s = this.seats[this.cleaning.id];
        s.status = "AVAILABLE";
        delete s.customer;
        this.cleaning = null;
        this.account.stats.cleaned++;
        this.account.xp += 2;
        this.touch();
      }
    }
    this.spawnClock += dt;
    if (this.spawnClock >= CONFIG.spawnSeconds) {
      this.spawnClock = 0;
      this.admit();
    }
    advanceCustomers(this, dt, move);
  }

  snapshot() {
    const out = {};
    for (const k of [
      "account",
      "seats",
      "customers",
      "orders",
      "nextId",
      "business",
      "doorOpen",
      "craft",
      "job",
      "clock",
      "spawnClock",
      "cleaning",
    ])
      out[k] = this[k];
    return structuredClone(out);
  }
}
