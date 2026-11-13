export const DENOMINATIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
export function notesFor(amount) {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount % 1000) return null;
  const notes = [];
  for (const bill of [...DENOMINATIONS].reverse())
    while (amount >= bill) {
      notes.push(bill);
      amount -= bill;
    }
  return amount === 0 ? notes : null;
}
export function validTenders(price, cash = Infinity) {
  const list = [
    price,
    20000,
    25000,
    30000,
    35000,
    40000,
    50000,
    100000,
    200000,
  ];
  return [...new Set(list)]
    .filter(
      (n) =>
        n >= price &&
        n <= 200000 &&
        n - price <= cash &&
        notesFor(n) &&
        notesFor(n - price),
    )
    .sort((a, b) => a - b);
}
export function chooseTender(price, cash, random = Math.random) {
  const list = validTenders(price, cash);
  if (!list.length) throw Error("Không có phương án tiền mặt hợp lệ");
  return list[
    Math.min(list.length - 1, Math.floor(Math.max(0, random()) * list.length))
  ];
}
export const selectedTotal = (notes) => notes.reduce((sum, n) => sum + n, 0);
export function selectNote(register, n) {
  if (!DENOMINATIONS.includes(n) || register.notes.length >= 200) return false;
  register.notes.push(n);
  return true;
}
