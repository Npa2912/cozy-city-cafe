import { CONFIG } from "./data.js";
import { newAccount } from "./economy.js";
import { admitCustomer, advanceCustomers } from "./customers.js";
import { startOrder, cancelOrder } from "./orders.js";
import { performStep, advanceCraft } from "./crafting.js";
import { openRegister, confirmPayment } from "./payments.js";
import { selectNote } from "./cash-register.js";
import { claimQuest } from "./quests.js";
export class CafeGame {
  constructor(layout, saved = null, random = Math.random) {
    this.layout = layout;
    this.random = random;
    this.account = saved?.account || newAccount();
    this.seats = layout.seats.map((s, id) => ({
      ...s,
      id,
      status: "AVAILABLE",
    }));
    this.customers = [];
    this.queue = [];
    this.orders = [];
    this.activeOrder = null;
    this.register = null;
    this.craft = null;
    this.job = null;
    this.nextId = 1;
    this.business = false;
    this.doorOpen = false;
    this.clock = 0;
    this.spawnClock = 0;
    this.settings = { staticHighlight: false, easyChange: true };
    this.revision = 0;
    this.message = "E mở cửa · O mở bán · Đi vòng bên phải vào lối nhân viên.";
    if (saved)
      for (const key of this.saveKeys())
        if (saved[key] !== undefined) this[key] = saved[key];
  }
  saveKeys() {
    return [
      "account",
      "seats",
      "customers",
      "queue",
      "orders",
      "activeOrder",
      "register",
      "craft",
      "job",
      "nextId",
      "business",
      "doorOpen",
      "clock",
      "spawnClock",
      "settings",
    ];
  }
  touch() {
    this.revision++;
  }
  notify(message) {
    this.message = message;
    this.touch();
    return false;
  }
  transition(n, state) {
    n.state = state;
    n.age = 0;
    this.touch();
  }
  toggleDoor(clear = true) {
    if (!clear)
      return this.notify("Có người trong vùng cửa, hãy lùi khỏi ngưỡng cửa.");
    if (
      this.doorOpen &&
      this.customers.some(
        (n) =>
          ![
            "WALKING_TO_SHOP",
            "WAITING_AT_ENTRANCE",
            "WALKING_AWAY",
            "COMPLETED",
          ].includes(n.state),
      )
    )
      return this.notify(
        "Còn khách bên trong: giữ cửa mở để khách ra. Nhấn O để ngừng nhận khách mới.",
      );
    this.doorOpen = !this.doorOpen;
    this.touch();
    return true;
  }
  toggleBusiness() {
    this.business = !this.business;
    this.touch();
  }
  admit() {
    return admitCustomer(this);
  }
  startOrder(id) {
    return startOrder(this, id);
  }
  cancel(id) {
    return cancelOrder(this, id);
  }
  interact(station) {
    return performStep(this, station);
  }
  openCash(id) {
    return openRegister(this, id);
  }
  addNote(note) {
    if (!this.register) return false;
    const ok = selectNote(this.register, note);
    if (ok) this.touch();
    return ok;
  }
  undoNote() {
    if (this.register) {
      this.register.notes.pop();
      this.touch();
    }
  }
  resetNotes() {
    if (this.register) {
      this.register.notes = [];
      this.touch();
    }
  }
  pay(id) {
    return confirmPayment(this, id);
  }
  claim(id) {
    const ok = claimQuest(this.account, id);
    if (ok) this.touch();
    return ok;
  }
  update(dt, move, canReach) {
    this.clock += dt;
    advanceCraft(this, dt);
    this.spawnClock += dt;
    if (this.spawnClock >= CONFIG.spawnSeconds) {
      this.spawnClock = 0;
      this.admit();
    }
    advanceCustomers(this, dt, move, canReach);
  }
  snapshot() {
    const out = {};
    for (const k of this.saveKeys()) out[k] = this[k];
    return structuredClone(out);
  }
}
