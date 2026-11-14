export const TIME_CONFIG = {
  minutesPerSecond: 1,
  startMinutes: 7 * 60,
  storageKey: "anteleo.world-clock.v1",
  saveIntervalSeconds: 5,
  localLightBudget: 4,
};
// hour, sunlight, ambient, lamps, sky top, horizon, sunlight color, shallow sea, deep sea
export const LIGHT_KEYS = [
  [0, 0, 0.34, 1, "#111e43", "#354868", "#b5caff", "#195368", "#102e52"],
  [5, 0.05, 0.4, 0.85, "#394d7d", "#d9979c", "#f5bfa4", "#3a7e91", "#274b71"],
  [6, 0.8, 0.78, 0.35, "#559bd0", "#ffd4a3", "#ffd0a0", "#50b9bd", "#247fa4"],
  [7, 1.9, 1.12, 0, "#2094d4", "#b2e0ee", "#ffedc9", "#43c6ca", "#188bb2"],
  [9, 2.6, 1.1, 0, "#138cda", "#b9e5f3", "#fff0d3", "#43c6ca", "#188bb2"],
  [12, 4.5, 0.88, 0, "#087bc7", "#a7d9ed", "#fff5e2", "#42d3cf", "#147fae"],
  [14, 3.8, 0.96, 0, "#168bd0", "#b9dfeb", "#ffe5bb", "#42c6c6", "#1a87ac"],
  [16, 2.5, 1.02, 0, "#408fc6", "#d6d9cb", "#ffdaa4", "#55bfc0", "#3286a6"],
  [17, 1.7, 0.92, 0.12, "#638fc0", "#f0c4a6", "#ffd0a0", "#71afb0", "#447c99"],
  [18, 1.2, 1.03, 0.6, "#5b79ac", "#efb09a", "#ffc5a2", "#aba596", "#4a6385"],
  [19, 0, 0.38, 1, "#20345a", "#665a7a", "#b5caff", "#285d78", "#192e50"],
  [22, 0, 0.34, 1, "#111e43", "#354868", "#b5caff", "#195368", "#102e52"],
  [24, 0, 0.34, 1, "#111e43", "#354868", "#b5caff", "#195368", "#102e52"],
];
export function periodAt(minutes) {
  const h = (((minutes % 1440) + 1440) % 1440) / 60;
  return h < 5 || h >= 19
    ? "Ban đêm"
    : h < 7
      ? "Bình minh"
      : h < 11
        ? "Buổi sáng"
        : h < 14
          ? "Buổi trưa"
          : h < 17
            ? "Buổi chiều"
            : "Hoàng hôn";
}
