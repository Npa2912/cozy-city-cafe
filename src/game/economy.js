import { CONFIG } from "./data.js";
export function newAccount() {
  return {
    cash: CONFIG.startCash,
    xp: 0,
    revenue: 0,
    costs: 0,
    history: [],
    claimed: [],
    stats: {
      coffee: 0,
      served: 0,
      cleaned: 0,
      errors: 0,
      streak: 0,
      bestStreak: 0,
    },
  };
}
export function transact(account, amount, label) {
  if (amount < 0 && account.cash + amount < 0) return false;
  account.cash = Math.round((account.cash + amount) * 100) / 100;
  if (amount < 0) account.costs -= amount;
  account.history.unshift({ amount, label });
  account.history.length = Math.min(account.history.length, 40);
  return true;
}
export const levelFor = (xp) => 1 + Math.floor(xp / 50);
