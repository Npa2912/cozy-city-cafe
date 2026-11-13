import { CONFIG, RECIPES } from "./data.js";
import { queueIndex, releaseQueue } from "./queue.js";
import { reserveSeat, releaseSeat } from "./seating.js";
import { createOrder, cancelOrder } from "./orders.js";
import { requestPayment } from "./payments.js";
export function admitCustomer(model) {
  if (
    !model.business ||
    !model.doorOpen ||
    model.queue.length >= CONFIG.queueLimit ||
    model.customers.length >= CONFIG.maxCustomers ||
    model.customers.some(
      (n) =>
        Math.hypot(
          n.pos.x - model.layout.spawn.x,
          n.pos.z - model.layout.spawn.z,
        ) < 0.7,
    )
  )
    return false;
  const id = model.nextId++,
    recipe = RECIPES[(id - 1) % RECIPES.length];
  model.customers.push({
    id,
    name: ["An", "Linh", "Minh", "Vy", "Hà", "Nam"][(id - 1) % 6],
    recipe: recipe.id,
    state: "WALKING_TO_SHOP",
    age: 0,
    waitTime: 0,
    pos: { ...model.layout.spawn },
    seat: null,
    satisfaction: 100,
    queueReady: false,
  });
  model.queue.push(id);
  model.touch();
  return true;
}
export function advanceCustomers(model, dt, move, canReach = () => true) {
  for (const n of model.customers) {
    n.age += dt;
    n.moving = false;
    const index = queueIndex(model, n),
      order = model.orders.find((o) => o.customer === n.id);
    if (index >= 0) {
      n.waitTime += dt;
      if (n.waitTime > CONFIG.patienceSeconds)
        n.satisfaction = Math.max(5, n.satisfaction - dt * 0.12);
    }
    switch (n.state) {
      case "WALKING_TO_SHOP":
        if (move(n, model.layout.entrance, dt))
          model.transition(n, "WAITING_AT_ENTRANCE");
        break;
      case "WAITING_AT_ENTRANCE":
        if (model.doorOpen) model.transition(n, "QUEUING");
        break;
      case "QUEUING":
      case "WAITING_TO_ORDER": {
        const target = model.layout.queue[Math.max(0, index)];
        n.queueReady = false;
        if (target && move(n, target, dt)) {
          n.queueReady = true;
          createOrder(model, n);
          if (n.state !== "WAITING_TO_ORDER")
            model.transition(n, "WAITING_TO_ORDER");
        }
        break;
      }
      case "WAITING_FOR_DRINK":
        if (order?.status === "READY" && model.clock - order.readyAt > 0.6)
          requestPayment(model, order);
        break;
      case "PICKING_UP":
        if (move(n, model.layout.handoff, dt)) {
          n.pickedUp = true;
          const seat = reserveSeat(model, n, canReach);
          model.transition(n, seat ? "WALKING_TO_TABLE" : "LEAVING_SHOP");
        }
        break;
      case "WALKING_TO_TABLE": {
        const seat = model.seats[n.seat];
        if (!seat) {
          n.takeaway = true;
          model.transition(n, "LEAVING_SHOP");
          break;
        }
        if (!canReach(n.pos, seat.approach)) {
          releaseSeat(model, n);
          n.takeaway = true;
          model.transition(n, "LEAVING_SHOP");
          break;
        }
        if (move(n, seat.approach, dt)) {
          seat.status = "OCCUPIED";
          n.sitFrom = { ...n.pos };
          model.transition(n, "SITTING_AND_DRINKING");
        }
        break;
      }
      case "SITTING_AND_DRINKING": {
        const seat = model.seats[n.seat];
        const u = Math.min(1, n.age / 0.7);
        n.pos = {
          x: n.sitFrom.x + (seat.chair.x - n.sitFrom.x) * u,
          z: n.sitFrom.z + (seat.chair.z - n.sitFrom.z) * u,
        };
        if (n.age > CONFIG.drinkSeconds) {
          const v = Math.min(1, (n.age - CONFIG.drinkSeconds) / 0.7);
          n.pos = {
            x: seat.chair.x + (seat.approach.x - seat.chair.x) * v,
            z: seat.chair.z + (seat.approach.z - seat.chair.z) * v,
          };
          if (v === 1) {
            releaseSeat(model, n);
            n.pickedUp = false;
            model.transition(n, "LEAVING_SHOP");
          }
        }
        break;
      }
      case "LEAVING_SHOP":
        if (move(n, model.layout.exit, dt)) {
          if (model.layout.departure) model.transition(n, "WALKING_AWAY");
          else complete(model, n, order);
        }
        break;
      case "WALKING_AWAY":
        if (move(n, model.layout.departure, dt)) complete(model, n, order);
        break;
    }
  }
  model.customers = model.customers.filter((n) => n.state !== "COMPLETED");
}

function complete(model, n, order) {
  if (order?.status === "PAID") order.status = "COMPLETED";
  releaseQueue(model, n.id);
  releaseSeat(model, n);
  model.transition(n, "COMPLETED");
}
