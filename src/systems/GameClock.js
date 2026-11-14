import { TIME_CONFIG, periodAt } from "./EnvironmentTimeConfig.js";
export class GameClock {
  constructor(saved = null) {
    this.totalMinutes =
      Number.isFinite(saved?.totalMinutes) && saved.totalMinutes >= 0
        ? saved.totalMinutes
        : TIME_CONFIG.startMinutes;
    this.minutesPerSecond =
      Number.isFinite(saved?.minutesPerSecond) &&
      saved.minutesPerSecond > 0 &&
      saved.minutesPerSecond <= 60
        ? saved.minutesPerSecond
        : TIME_CONFIG.minutesPerSecond;
    this.paused = false;
  }
  advance(realSeconds, active = true) {
    if (
      active &&
      !this.paused &&
      Number.isFinite(realSeconds) &&
      realSeconds > 0
    )
      this.totalMinutes += realSeconds * this.minutesPerSecond;
  }
  get minute() {
    return this.totalMinutes % 1440;
  }
  get day() {
    return Math.floor(this.totalMinutes / 1440) + 1;
  }
  get label() {
    const m = Math.floor(this.minute + 1e-7);
    return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }
  get period() {
    return periodAt(this.minute);
  }
  setHour(hour) {
    this.totalMinutes = (this.day - 1) * 1440 + (((hour % 24) + 24) % 24) * 60;
  }
  snapshot() {
    return {
      version: 1,
      totalMinutes: this.totalMinutes,
      minutesPerSecond: this.minutesPerSecond,
    };
  }
  static load(storage) {
    try {
      const s = JSON.parse(storage.getItem(TIME_CONFIG.storageKey));
      return new GameClock(s?.version === 1 ? s : null);
    } catch {
      return new GameClock();
    }
  }
  save(storage) {
    try {
      storage.setItem(TIME_CONFIG.storageKey, JSON.stringify(this.snapshot()));
      return true;
    } catch {
      return false;
    }
  }
}
