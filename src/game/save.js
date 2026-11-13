import { STATES } from "./data.js";
const KEY = "anteleo.game.v1";
export function decodeSave(text) {
  try {
    const s = JSON.parse(text);
    if (s.version !== 1 || !s.data?.account) return null;
    const d = s.data,
      a = d.account;
    for (const k of ["cash", "xp", "costs", "revenue"])
      if (!Number.isFinite(a[k]) || a[k] < 0 || a[k] > 1e9) return null;
    if (
      !Array.isArray(a.claimed) ||
      !a.stats ||
      !Array.isArray(d.customers) ||
      d.customers.length > 3 ||
      d.seats?.length !== 2 ||
      !Array.isArray(d.orders) ||
      d.orders.length > 10000
    )
      return null;
    for (const n of d.customers)
      if (
        !STATES.includes(n.state) ||
        !Number.isFinite(n.pos?.x) ||
        !Number.isFinite(n.pos?.z) ||
        Math.abs(n.pos.x) > 100 ||
        Math.abs(n.pos.z) > 100 ||
        !d.seats[n.seat]
      )
        return null;
    return d;
  } catch {
    return null;
  }
}
export function loadGame(storage = localStorage) {
  try {
    return decodeSave(storage.getItem(KEY));
  } catch {
    return null;
  }
}
export function saveGame(data, storage = localStorage) {
  try {
    storage.setItem(KEY, JSON.stringify({ version: 1, data }));
    return true;
  } catch {
    return false;
  }
}
