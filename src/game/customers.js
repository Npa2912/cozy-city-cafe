import { outsideSlot } from "./doorway.js";
import { CONFIG, RECIPES } from "./data.js";
import { queueIndex, releaseQueue } from "./queue.js";
import { reserveSeat, releaseSeat } from "./seating.js";
import { createOrder, cancelOrder } from "./orders.js";
import { requestPayment } from "./payments.js";
export function admitCustomer(model) {
  if (
    !model.business ||
    !model.doorOpen ||
    outsideSlot(model) === undefined ||
    (model.admissionAllowed && !model.admissionAllowed(outsideSlot(model))) ||
    model.queue.length >= CONFIG.queueLimit ||
    model.customers.length >= CONFIG.maxCustomers ||
    model.customers.some(
      (n) =>
        Math.hypot(
          n.pos.x - model.layout.spawn.x,
          n.pos.z - model.layout.spawn.z,
        ) < CONFIG.spawnClearance,
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
    inside: false,
    outsideSlot: outsideSlot(model),
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
    if (
      order?.paid &&
      !["WAITING_FOR_PAYMENT", "PICKING_UP"].includes(n.state) &&
      Math.hypot(
        n.pos.x - model.layout.handoff.x,
        n.pos.z - model.layout.handoff.z,
      ) > 0.9
    )
      releaseQueue(model, n.id);
    if (index >= 0) {
      n.waitTime += dt;
      if (n.waitTime > CONFIG.patienceSeconds)
        n.satisfaction = Math.max(5, n.satisfaction - dt * 0.12);
    }
    switch (n.state) {
      case "WALKING_TO_SHOP":
        if (
          move(
            n,
            model.layout.outsideWaiting?.[n.outsideSlot] ||
              model.layout.entrance,
            dt,
          )
        )
          model.transition(n, "WAITING_AT_ENTRANCE");
        break;
      case "WAITING_AT_ENTRANCE":
      case "WAITING_TO_EXIT":
        break;
      case "ENTERING_DOOR": {
        const legs = [
          model.layout.entrance,
          model.layout.doorInside || model.layout.queue[0],
          model.layout.queue[Math.max(0, queueIndex(model, n))],
        ];
        if (move(n, legs[n.doorLeg], dt)) {
          if (++n.doorLeg === 2) n.inside = true;
          if (n.doorLeg === legs.length) {
            n.inside = true;
            delete n.outsideSlot;
            model.doorway.release(n.id);
            model.transition(n, "QUEUING");
          }
        }
        break;
      }
      case "EXITING_DOOR": {
        const legs = [
          model.layout.doorInside || model.layout.entrance,
          model.layout.doorOutside || model.layout.exit,
        ];
        if (move(n, legs[n.doorLeg], dt)) {
          if (++n.doorLeg === legs.length) {
            n.inside = false;
            model.doorway.release(n.id);
            model.transition(n, "WALKING_AWAY");
          }
        }
        break;
      }
      case "QUEUING":
      case "WAITING_TO_ORDER": {
        const target = model.layout.queue[Math.max(0, index)];
        n.queueReady = false;
        if (target && move(n, target, dt)) {
          if (
            model.customers.some(
              (o) =>
                o.id !== n.id &&
                Math.hypot(o.pos.x - n.pos.x, o.pos.z - n.pos.z) <
                  CONFIG.radius * 2,
            )
          )
            break;
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
        if (
          !canReach(n.pos, seat.approach) ||
          n.navigation?.stalled > CONFIG.seatFallbackSeconds
        ) {
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
      case "LEAVING_SHOP": {
        const exits = model.customers
          .filter((o) => ["LEAVING_SHOP", "WAITING_TO_EXIT"].includes(o.state))
          .sort((a, b) => a.id - b.id);
        if (n.exitHold === undefined) {
          const used = new Set(
            exits.filter((o) => o !== n).map((o) => o.exitHold),
          );
          n.exitHold = [0, 1, 2].find((i) => !used.has(i)) ?? 0;
        }
        const hold =
          model.layout.insideWaiting?.[n.exitHold] ||
          model.layout.doorInside ||
          model.layout.exit;
        if (move(n, hold, dt)) model.transition(n, "WAITING_TO_EXIT");
        break;
      }
      case "WALKING_AWAY":
        if (move(n, model.layout.departure || model.layout.exit, dt))
          complete(model, n, order);
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
