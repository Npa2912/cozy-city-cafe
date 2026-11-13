import { CONFIG, RECIPES } from "./data.js";
export function admitCustomer(model) {
  const seat = model.seats.find((s) => s.status === "AVAILABLE");
  if (
    !model.business ||
    !model.doorOpen ||
    !seat ||
    model.customers.some(
      (n) => !["SITTING_AND_DRINKING", "COMPLETED"].includes(n.state),
    )
  )
    return false;
  const id = model.nextId++;
  seat.status = "RESERVED";
  seat.customer = id;
  const spawn = model.layout.spawn;
  model.customers.push({
    id,
    name: ["An", "Linh", "Minh", "Vy", "Hà", "Nam"][(id - 1) % 6],
    state: "WALKING_TO_SHOP",
    age: 0,
    pos: { ...spawn },
    seat: seat.id,
    recipe: RECIPES[(id - 1) % 4].id,
    satisfaction: 100,
  });
  model.touch();
  return true;
}
export function advanceCustomers(model, dt, move) {
  for (const n of model.customers) {
    n.age += dt;
    const seat = model.seats[n.seat];
    let target;
    switch (n.state) {
      case "WALKING_TO_SHOP":
        target = model.layout.entrance;
        if (move(n, target, dt)) model.transition(n, "WAITING_AT_ENTRANCE");
        break;
      case "WAITING_AT_ENTRANCE":
        if (model.doorOpen) model.transition(n, "WALKING_TO_COUNTER");
        break;
      case "WALKING_TO_COUNTER":
        target = model.layout.counter;
        if (move(n, target, dt)) model.transition(n, "WAITING_TO_ORDER");
        break;
      case "ORDER_PLACED":
        model.transition(n, "WAITING_FOR_DRINK");
        break;
      case "WALKING_TO_TABLE":
        if (!n.pickedUp && model.layout.handoff) {
          if (move(n, model.layout.handoff, dt)) {
            n.pickedUp = true;
            model.touch();
          }
          break;
        }
        if (move(n, seat.approach, dt)) {
          seat.status = "OCCUPIED";
          n.sitFrom = { ...n.pos };
          model.transition(n, "SITTING_AND_DRINKING");
        }
        break;
      case "SITTING_AND_DRINKING": {
        const u = Math.min(1, n.age / 0.7);
        n.pos = {
          x: n.sitFrom.x + (seat.chair.x - n.sitFrom.x) * u,
          z: n.sitFrom.z + (seat.chair.z - n.sitFrom.z) * u,
        };
        if (n.age >= CONFIG.drinkSeconds) {
          const t = Math.min(1, (n.age - CONFIG.drinkSeconds) / 0.7);
          n.pos = {
            x: seat.chair.x + (seat.approach.x - seat.chair.x) * t,
            z: seat.chair.z + (seat.approach.z - seat.chair.z) * t,
          };
          if (t === 1) {
            seat.status = "NEEDS_CLEANING";
            model.transition(n, "WALKING_TO_CASHIER");
          }
        }
        break;
      }
      case "WALKING_TO_CASHIER":
        if (
          !model.customers.some(
            (o) =>
              o !== n &&
              [
                "WAITING_FOR_PAYMENT",
                "WAITING_TO_ORDER",
                "WAITING_FOR_DRINK",
                "WALKING_TO_COUNTER",
                "WALKING_TO_TABLE",
              ].includes(o.state),
          ) &&
          move(n, model.layout.counter, dt)
        )
          model.transition(n, "WAITING_FOR_PAYMENT");
        break;
      case "LEAVING_SHOP":
        if (move(n, model.layout.exit, dt)) {
          model.transition(n, "COMPLETED");
        }
        break;
    }
    if (
      ["WAITING_TO_ORDER", "WAITING_FOR_DRINK", "WAITING_FOR_PAYMENT"].includes(
        n.state,
      ) &&
      n.age > CONFIG.patienceSeconds
    )
      n.satisfaction = Math.max(0, n.satisfaction - dt * 0.12);
  }
  model.customers = model.customers.filter((n) => n.state !== "COMPLETED");
}
