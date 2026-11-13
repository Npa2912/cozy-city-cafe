import { TRAFFIC } from "./traffic-config.js";
export const CONFIG = {
  ...TRAFFIC,
  drinkSeconds: 18,
  walkSpeed: 1.15,
  patienceSeconds: 180,
  startCash: 100000,
};
export const ACTIONS = {
  cup: {
    label: "Lấy một chiếc ly",
    station: "ingredients",
    icon: "◯",
    cost: 1000,
  },
  coffee: {
    label: "Chiết xuất cà phê",
    station: "coffee",
    icon: "☕",
    cost: 2000,
    seconds: 3,
  },
  milk: { label: "Thêm phần sữa", station: "milk", icon: "▣", cost: 1000 },
  teaBase: {
    label: "Rót hỗn hợp trà, sữa và đường",
    station: "teaBase",
    icon: "♧",
    cost: 3000,
  },
  shake: {
    label: "Lắc trà sữa",
    station: "tea",
    icon: "↔",
    cost: 0,
    seconds: 3,
  },
  pearls: { label: "Thêm trân châu", station: "pearls", icon: "●", cost: 2000 },
  delivery: {
    label: "Đặt ly lên khay giao hàng",
    station: "delivery",
    icon: "✓",
    cost: 0,
  },
};
export const RECIPES = [
  {
    id: "black",
    name: "Cà phê đen",
    price: 20000,
    xp: 12,
    steps: ["cup", "coffee", "delivery"],
  },
  {
    id: "milkCoffee",
    name: "Cà phê sữa",
    price: 25000,
    xp: 14,
    steps: ["cup", "coffee", "milk", "delivery"],
  },
  {
    id: "milkTea",
    name: "Trà sữa truyền thống",
    price: 30000,
    xp: 16,
    steps: ["cup", "teaBase", "shake", "delivery"],
  },
  {
    id: "pearlTea",
    name: "Trà sữa trân châu",
    price: 35000,
    xp: 18,
    steps: ["cup", "teaBase", "shake", "pearls", "delivery"],
  },
];
export const QUESTS = [
  {
    id: "v2serve3",
    name: "Ba vị khách đầu tiên",
    description: "Phục vụ và thối tiền đúng cho 3 khách.",
    stat: "served",
    target: 3,
    cash: 15000,
    xp: 15,
  },
  {
    id: "v2brew5",
    name: "Pha chế thật dễ",
    description: "Hoàn thành 5 ly theo chỉ dẫn.",
    stat: "prepared",
    target: 5,
    cash: 20000,
    xp: 20,
  },
  {
    id: "v2change3",
    name: "Thu ngân khéo léo",
    description: "Thối tiền chính xác 3 lần.",
    stat: "changeCorrect",
    target: 3,
    cash: 15000,
    xp: 15,
  },
  {
    id: "v2revenue",
    name: "Một ca vui vẻ",
    description: "Đạt 200.000đ doanh thu.",
    stat: "revenue",
    target: 200000,
    cash: 30000,
    xp: 25,
  },
  {
    id: "v2streak5",
    name: "Năm đơn liên tiếp",
    description: "Hoàn thành 5 đơn liên tiếp không huỷ.",
    stat: "bestStreak",
    target: 5,
    cash: 25000,
    xp: 20,
  },
];
export const ORDER_STATES = [
  "WAITING",
  "PREPARING",
  "READY",
  "WAITING_PAYMENT",
  "PAID",
  "COMPLETED",
  "CANCELLED",
];
export const STATES = [
  "WALKING_TO_SHOP",
  "WAITING_AT_ENTRANCE",
  "ENTERING_DOOR",
  "WAITING_TO_EXIT",
  "EXITING_DOOR",
  "QUEUING",
  "WAITING_TO_ORDER",
  "WAITING_FOR_DRINK",
  "WAITING_FOR_PAYMENT",
  "PICKING_UP",
  "WALKING_TO_TABLE",
  "SITTING_AND_DRINKING",
  "LEAVING_SHOP",
  "WALKING_AWAY",
  "COMPLETED",
];
export const money = (n) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n) + "đ";
