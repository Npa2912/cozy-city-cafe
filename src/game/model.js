import { requestClose, withdrawOutside, updateDoorSafety } from "./closing.js";
import { DoorwayController, isOutside } from "./doorway.js";
import { arrivalDelay } from "./traffic-config.js";
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
    this.closing = false;
    this.closeRequested = false;
    this.clock = 0;
    this.spawnClock = 0;
    this.nextArrival = arrivalDelay(random);
    this.trafficVersion = 1;
    this.trafficLegacyOverflow =
      !!saved?.trafficLegacyOverflow || (saved?.customers?.length || 0) > 5;
    this.doorway = new DoorwayController();
    this.settings = { staticHighlight: false, easyChange: true };
    this.revision = 0;
    this.message = "E mở cửa · O mở bán · Đi vòng bên phải vào lối nhân viên.";
    if (saved)
      for (const key of this.saveKeys())
        if (saved[key] !== undefined) this[key] = saved[key];
    if(saved && !this.business) withdrawOutside(this);
    for (const n of this.customers) {
      n.inside ??= !isOutside(n) && n.state !== "WALKING_AWAY";
      if (isOutside(n) && n.outsideSlot === undefined)
        n.outsideSlot = this.customers
          .filter(isOutside)
          .findIndex((o) => o.id === n.id);
    }
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
      "closing",
      "closeRequested",
      "clock",
      "spawnClock",
      "nextArrival",
      "trafficVersion",
      "trafficLegacyOverflow",
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
    if(this.doorOpen) {
      requestClose(this);
      updateDoorSafety(this,clear,clear);
      return true;
    }
    if(!clear)return this.notify("Có người trong vùng cánh cửa, hãy lùi khỏi ngưỡng cửa.");
    this.doorOpen=true;this.closeRequested=false;this.touch();return true;
  }
  updateDoorSafety(closingClear,openingClear=closingClear) { updateDoorSafety(this,closingClear,openingClear); }
  toggleBusiness() {
    this.business=!this.business;
    if(!this.business)requestClose(this);
    else {this.closing=false;this.closeRequested=false;this.touch();}
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
    if (this.customers.length <= 5) this.trafficLegacyOverflow = false;
    advanceCraft(this, dt);
    this.spawnClock += dt;
    if (this.spawnClock >= this.nextArrival) {
      this.spawnClock = 0;
      this.nextArrival = arrivalDelay(this.random);
      this.admit();
    }
    this.doorway.update(this);
    advanceCustomers(this, dt, move, canReach);
  }
  snapshot() {
    const out = {};
    for (const k of this.saveKeys()) out[k] = this[k];
    return structuredClone(out);
  }
}
