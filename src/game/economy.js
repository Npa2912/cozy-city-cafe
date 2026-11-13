import { CONFIG } from "./data.js";
export function newAccount() {
  return {
    cash: CONFIG.startCash,
    xp: 0,
    revenue: 0,
    costs: 0,
    history: [],
    claimed: [],
    unlocks: ["black", "milkCoffee", "milkTea", "pearlTea"],
    stats: {
      prepared: 0,
      served: 0,
      changeCorrect: 0,
      streak: 0,
      bestStreak: 0,
      cancelled: 0,
    },
  };
}
export function transact(account, amount, label, details = {}) {
  if (!Number.isSafeInteger(amount) || account.cash + amount < 0) return false;
  if (amount === 0) return true;
  account.cash += amount;
  if (amount < 0) account.costs -= amount;
  account.history.unshift({ amount, label, ...details });
  account.history.length = Math.min(80, account.history.length);
  return true;
}
export const levelFor = (xp) => 1 + Math.floor(xp / 50);
