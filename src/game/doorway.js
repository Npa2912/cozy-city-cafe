import { TRAFFIC } from "./traffic-config.js";
export const isOutside = (n) =>
  ["WALKING_TO_SHOP", "WAITING_AT_ENTRANCE"].includes(n.state);
export const insideCount = (model) =>
  model.customers.filter((n) => n.inside).length;
export function outsideSlot(model) {
  const used = new Set(
    model.customers.filter(isOutside).map((n) => n.outsideSlot),
  );
  return Array.from({ length: TRAFFIC.maxOutside }, (_, i) => i).find(
    (i) => !used.has(i),
  );
}
// A lease covers the entire passage, not just the glass plane. No timeout can
// transfer it while the previous owner is still physically in the doorway.
export class DoorwayController {
  constructor() {
    this.owner = null;
    this.direction = null;
  }
  release(id) {
    if (this.owner === id) {
      this.owner = null;
      this.direction = null;
    }
  }
  update(model) {
    const transit = model.customers.find((n) =>
      ["ENTERING_DOOR", "EXITING_DOOR"].includes(n.state),
    );
    if (transit) {
      this.owner = transit.id;
      this.direction = transit.state === "EXITING_DOOR" ? "out" : "in";
      return;
    }
    this.owner = null;
    this.direction = null;
    if (!model.doorOpen) return;
    // Even an exiting customer still approaching their hold blocks new entry.
    const exits = model.customers
      .filter((n) => ["LEAVING_SHOP", "WAITING_TO_EXIT"].includes(n.state))
      .sort((a, b) => a.id - b.id);
    let next = exits.find((n) => n.state === "WAITING_TO_EXIT");
    if (exits.length && !next) return;
    if (
      !next &&
      model.customers.some((n) =>
        ["PICKING_UP", "WALKING_TO_TABLE"].includes(n.state),
      )
    )
      return;
    if (!next && model.closing) return;
    if (!next && insideCount(model) < TRAFFIC.maxInside) {
      const arrivals = model.customers
        .filter(isOutside)
        .sort((a, b) => a.id - b.id);
      next = arrivals[0]?.state === "WAITING_AT_ENTRANCE" ? arrivals[0] : null;
    }
    if (
      !next ||
      (next.state === "WAITING_AT_ENTRANCE" &&
        model.entryAllowed &&
        !model.entryAllowed(next))
    )
      return;
    this.owner = next.id;
    this.direction = next.state === "WAITING_TO_EXIT" ? "out" : "in";
    next.doorLeg = 0;
    if (this.direction === "out") delete next.exitHold;
    model.transition(
      next,
      this.direction === "out" ? "EXITING_DOOR" : "ENTERING_DOOR",
    );
  }
}
