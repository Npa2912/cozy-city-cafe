import { STATES, ORDER_STATES, RECIPES, CONFIG } from "./data.js";
import { newAccount } from "./economy.js";
export const SAVE_KEY = "anteleo.game.v2",
  LEGACY_KEY = "anteleo.game.v1",
  BACKUP_KEY = "anteleo.game.v1.backup";
export function migrateV1(text) {
  try {
    const old = JSON.parse(text);
    if (old.version !== 1 || !old.data?.account) return null;
    const v = old.data,
      a = v.account;
    for (const key of ["cash", "revenue", "costs", "xp"])
      if (!Number.isFinite(a[key]) || a[key] < 0) return null;
    const account = newAccount();
    for (const key of ["cash", "revenue", "costs"])
      account[key] = Math.round(a[key] * 1000);
    account.xp = a.xp;
    account.claimed = Array.isArray(a.claimed) ? [...a.claimed] : [];
    account.stats = {
      ...account.stats,
      served: a.stats?.served || 0,
      prepared: a.stats?.served || 0,
      streak: a.stats?.streak || 0,
      bestStreak: a.stats?.bestStreak || 0,
    };
    account.history = (a.history || []).map((h) => ({
      ...h,
      amount: Math.round(h.amount * 1000),
      label: `[Ca cũ] ${h.label}`,
    }));
    const cost = {
      cup: 1,
      coffee: 2,
      tea: 1,
      milk: 1,
      sugar: 0.5,
      shake: 0,
      pearls: 1.5,
      finish: 0,
    };
    let refund =
      (v.craft?.steps || []).reduce((s, k) => s + (cost[k] || 0), 0) +
      (cost[v.job?.action] || 0);
    for (const order of v.orders || [])
      if (order.status === "SERVED" && !order.paid) {
        const prices = { black: 3, milkCoffee: 4, milkTea: 3.5, pearlTea: 5 };
        refund += prices[order.recipe] || 0;
      }
    if (refund) {
      account.cash += Math.round(refund * 1000);
      account.history.unshift({
        amount: Math.round(refund * 1000),
        label: "Chuyển save: hoàn nguyên liệu ca chưa thanh toán",
      });
    }
    return {
      account,
      nextId: v.nextId || 1,
      doorOpen: !!v.doorOpen,
      business: false,
      settings: { staticHighlight: false, easyChange: true },
    };
  } catch {
    return null;
  }
}
export function decodeSave(text) {
  try {
    const wrapper = JSON.parse(text);
    if (wrapper.version !== 2) return null;
    const d = wrapper.data,
      a = d?.account;
    if (!a) return null;
    for (const k of ["cash", "xp", "revenue", "costs"])
      if (!Number.isSafeInteger(a[k]) || a[k] < 0 || a[k] > 1e12) return null;
    if (
      !Array.isArray(a.claimed) ||
      !Array.isArray(a.history) ||
      !a.stats ||
      !Array.isArray(d.customers) ||
      d.customers.length > CONFIG.maxCustomers ||
      !Array.isArray(d.queue) ||
      d.queue.length > CONFIG.queueLimit ||
      d.seats?.length !== 2 ||
      !Array.isArray(d.orders)
    )
      return null;
    for (const seat of d.seats)
      if (!["AVAILABLE", "RESERVED", "OCCUPIED"].includes(seat.status))
        return null;
    for (const n of d.customers)
      if (
        !STATES.includes(n.state) ||
        !Number.isFinite(n.pos?.x) ||
        !Number.isFinite(n.pos?.z) ||
        Math.abs(n.pos.x) > 100 ||
        Math.abs(n.pos.z) > 100 ||
        !RECIPES.some((r) => r.id === n.recipe)
      )
        return null;
    for (const o of d.orders)
      if (
        !ORDER_STATES.includes(o.status) ||
        !RECIPES.some((r) => r.id === o.recipe) ||
        o.step < 0 ||
        o.step > 5
      )
        return null;
    return d;
  } catch {
    return null;
  }
}
export function loadGame(storage = localStorage) {
  try {
    const current = storage.getItem(SAVE_KEY);
    if (current) {
      const data = decodeSave(current);
      if (data) return data;
      storage.setItem(SAVE_KEY + ".invalid-backup", current);
      return null;
    }
    const old = storage.getItem(LEGACY_KEY);
    if (!old) return null;
    try {
      if (!storage.getItem(BACKUP_KEY)) storage.setItem(BACKUP_KEY, old);
    } catch {
      /* Original v1 key is retained even when backup storage is full. */
    }
    return migrateV1(old);
  } catch {
    return null;
  }
}
export function saveGame(data, storage = localStorage) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 2, data }));
    return true;
  } catch {
    return false;
  }
}
