import { QUESTS } from "./data.js";
import { transact } from "./economy.js";
export function claimQuest(account, id) {
  const q = QUESTS.find((q) => q.id === id);
  if (
    !q ||
    account.claimed.includes(id) ||
    (q.stat === "revenue" ? account.revenue : account.stats[q.stat]) < q.target
  )
    return false;
  account.claimed.push(id);
  transact(account, q.cash, `Nhiệm vụ: ${q.name}`);
  account.xp += q.xp;
  return true;
}
