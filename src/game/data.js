export const CONFIG = {
  spawnSeconds: 8,
  drinkSeconds: 18,
  cleanSeconds: 2.5,
  walkSpeed: 1.15,
  queueLimit: 1,
  patienceSeconds: 65,
  startCash: 100,
};
export const RECIPES = [
  {
    id: "black",
    name: "Cà phê đen",
    price: 25,
    xp: 10,
    steps: ["cup", "coffee", "finish"],
  },
  {
    id: "milkCoffee",
    name: "Cà phê sữa",
    price: 35,
    xp: 12,
    steps: ["cup", "coffee", "milk", "finish"],
  },
  {
    id: "milkTea",
    name: "Trà sữa truyền thống",
    price: 40,
    xp: 14,
    steps: ["cup", "tea", "milk", "sugar", "shake", "finish"],
  },
  {
    id: "pearlTea",
    name: "Trà sữa trân châu",
    price: 50,
    xp: 16,
    steps: ["cup", "tea", "milk", "sugar", "shake", "pearls", "finish"],
  },
];
export const ACTIONS = {
  cup: { label: "Lấy ly", cost: 1 },
  coffee: { label: "Chiết xuất 30 ml cà phê", cost: 2, seconds: 3 },
  tea: { label: "Rót 150 ml trà", cost: 1 },
  milk: { label: "Thêm 20 ml sữa", cost: 1 },
  sugar: { label: "Thêm 15 g đường", cost: 0.5 },
  shake: { label: "Lắc trà sữa", cost: 0, seconds: 3 },
  pearls: { label: "Thêm 30 g trân châu", cost: 1.5 },
  finish: { label: "Đậy nắp / hoàn thành", cost: 0 },
};
export const QUESTS = [
  {
    id: "coffee3",
    name: "Barista đầu tiên",
    description: "Pha đúng 3 ly cà phê.",
    stat: "coffee",
    target: 3,
    cash: 40,
    xp: 15,
  },
  {
    id: "serve5",
    name: "Khách quen",
    description: "Phục vụ 5 khách.",
    stat: "served",
    target: 5,
    cash: 60,
    xp: 20,
  },
  {
    id: "revenue500",
    name: "Một ngày tốt lành",
    description: "Thu 500 xu tại POS.",
    stat: "revenue",
    target: 500,
    cash: 100,
    xp: 30,
  },
  {
    id: "clean3",
    name: "Quán luôn sạch",
    description: "Dọn sạch 3 bàn.",
    stat: "cleaned",
    target: 3,
    cash: 30,
    xp: 10,
  },
  {
    id: "streak5",
    name: "Bàn tay khéo",
    description: "Pha đúng 5 đơn liên tiếp.",
    stat: "bestStreak",
    target: 5,
    cash: 70,
    xp: 20,
  },
];
export const STATES = [
  "WALKING_TO_SHOP",
  "WAITING_AT_ENTRANCE",
  "WALKING_TO_COUNTER",
  "WAITING_TO_ORDER",
  "ORDER_PLACED",
  "WAITING_FOR_DRINK",
  "WALKING_TO_TABLE",
  "SITTING_AND_DRINKING",
  "WALKING_TO_CASHIER",
  "WAITING_FOR_PAYMENT",
  "LEAVING_SHOP",
  "COMPLETED",
];

// Every interaction dispenses one measured portion; repeated portions are
// recorded as repeated steps and rejected by the ordered recipe validator.
export const PORTIONS = {
  cup: 1,
  coffee: 30,
  tea: 150,
  milk: 20,
  sugar: 15,
  pearls: 30,
};
for (const r of RECIPES) {
  r.ingredients = Object.fromEntries(
    r.steps.filter((s) => s in PORTIONS).map((s) => [s, PORTIONS[s]]),
  );
  r.machine = r.steps.includes("coffee") ? "coffee" : "shake";
  r.seconds = 3;
}
