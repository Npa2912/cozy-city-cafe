import * as THREE from "three";
import { CafeGame } from "./model.js";
import { cafeWorld } from "./world.js";
import { collectObstacles, createPlayerCollision } from "./world-collision.js";
import {
  findPath,
  slide,
  blocked,
  separateRestoredActor,
} from "./collision.js";
import { CONFIG } from "./data.js";
import { tutorialStep } from "./crafting.js";
import { currentOrder } from "./orders.js";
import { loadGame, saveGame } from "./save.js";
import { gameUI } from "./ui.js";
import { sound } from "./audio.js";
export function createCafeGame({
  scene,
  cafe,
  camera,
  pov,
  orbit,
  canvas,
  onDirty,
}) {
  const saved = loadGame(),
    world = cafeWorld(scene, cafe, camera),
    model = new CafeGame(world.layout, saved);
  if (!saved)
    model.settings.staticHighlight = matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  world.setDoorInstant(model.doorOpen);
  const obstacles = [...collectObstacles(scene), ...world.obstacles],
    bounds = world.bounds;
  const navigationObstacles = obstacles.filter((b) =>
    b.kind === "circle"
      ? b.x + b.radius >= bounds.minX &&
        b.x - b.radius <= bounds.maxX &&
        b.z + b.radius >= bounds.minZ &&
        b.z - b.radius <= bounds.maxZ
      : b.maxX >= bounds.minX &&
        b.minX <= bounds.maxX &&
        b.maxZ >= bounds.minZ &&
        b.minZ <= bounds.maxZ,
  );
  let paused = false;
  let active = false,
    nearest = null,
    saveClock = 0;
  const paths = new Map(),
    reachCache = new Map();
  const body = (n) => ({
    kind: "circle",
    x: n.pos.x,
    z: n.pos.z,
    radius: CONFIG.radius,
  });
  model.admissionAllowed = (slot) => {
    const shapes = [
      ...navigationObstacles,
      world.doorShape(),
      ...model.customers.map(body),
    ];
    if (active && pov.isLocked)
      shapes.push({
        kind: "circle",
        x: camera.position.x,
        z: camera.position.z,
        radius: 0.28,
      });
    return (
      !blocked(world.layout.spawn, CONFIG.radius, shapes) &&
      !blocked(world.layout.outsideWaiting[slot], CONFIG.radius, shapes)
    );
  };
  const entryChecks = new Map();
  model.entryAllowed = (n) => {
    const cached = entryChecks.get(n.id);
    if (cached && cached.until > model.clock) return cached.ok;
    const target = world.layout.queue[Math.max(0, model.queue.indexOf(n.id))];
    const shapes = [
      ...navigationObstacles,
      world.doorShape(),
      ...model.customers.filter((o) => o !== n).map(body),
    ];
    const ok = !!findPath(
      world.layout.doorInside,
      target,
      shapes,
      bounds,
      CONFIG.radius,
    );
    entryChecks.set(n.id, { ok, until: model.clock + 0.7 });
    return ok;
  };
  const collision = createPlayerCollision(
    obstacles,
    () => [world.doorShape(), ...model.customers.map(body)],
    world.floorAt,
  );
  const near = (id) => {
    const s = world.stations.find((s) => s.id === id);
    return (
      s &&
      (id === "door" || world.isStaff(camera.position)) &&
      Math.hypot(
        camera.position.x - s.position.x,
        camera.position.z - s.position.z,
      ) < 2.2
    );
  };
  const persist = () => {
    if (!saveGame(model.snapshot()))
      model.notify(
        "Trình duyệt chưa cho lưu. Dữ liệu cũ vẫn được giữ; hãy kiểm tra dung lượng lưu trữ.",
      );
  };
  function modal(open) {
    pov.unlock();
    orbit.enabled = false;
    if (!open && active) pov.lock();
    onDirty();
  }
  const ui = gameUI(
    model,
    (action, id) => {
      if (paused) return;
      if (action === "business") {
        model.toggleBusiness();
        if (model.business) model.spawnClock = 0;
      } else if (action === "start" && near("counter")) {
        if (model.startOrder(Number(id))) {
          sound("beep");
          ui.close();
        }
      } else if (action === "cancel" && near("counter"))
        model.cancel(Number(id));
      else if (action === "cash" && near("counter")) {
        if (model.openCash(Number(id))) {
          model.cashHint = false;
          ui.open("cash", "counter");
        }
      } else if (action === "note" && near("counter"))
        model.addNote(Number(id));
      else if (action === "undo" && near("counter")) model.undoNote();
      else if (action === "reset" && near("counter")) model.resetNotes();
      else if (action === "hint" && near("counter")) {
        model.cashHint = true;
        model.touch();
      } else if (action === "confirm" && near("counter")) {
        if (model.pay(Number(id))) {
          sound("pay");
          ui.close();
        }
      } else if (action === "claim") {
        if (model.claim(id)) sound("pay");
      } else if (action === "static") {
        model.settings.staticHighlight = !model.settings.staticHighlight;
        model.touch();
      } else if (action === "easy") {
        model.settings.easyChange = !model.settings.easyChange;
        model.touch();
      } else if (action === "save") {
        persist();
        model.notify("Đã lưu tiến trình và thiết lập.");
      }
      persist();
      ui.render();
      onDirty();
    },
    modal,
  );
  function start() {
    active = true;
    ui.active(true);
    orbit.enabled = false;
    const p = world.point(-0.3, 2.05);
    camera.position.set(p.x, world.floorAt(p) + 1.65, p.z);
    const look = world.point(-0.3, -2, 1.6);
    camera.lookAt(look.x, look.y, look.z);
    pov.lock();
    model.touch();
    onDirty();
  }
  function stop() {
    active = false;
    ui.active(false);
    pov.unlock();
    orbit.enabled = true;
    persist();
  }
  const button = document.createElement("button");
  button.id = "game-start";
  button.textContent = "Chơi quán";
  button.addEventListener("click", start);
  document.querySelector("nav").prepend(button);
  canvas.addEventListener("click", () => {
    if (!active) return;
    if (!ui.panel && !pov.isLocked) pov.lock();
    else if (pov.isLocked && nearest?.id === "counter") interact();
  });
  function interact() {
    if (paused || !nearest) return;
    if (nearest.id === "door") {
      if (
        model.toggleDoor(
          world.isDoorClear(camera.position, model.customers, !model.doorOpen),
        )
      ) {
        paths.clear();
        reachCache.clear();
        sound("beep");
      }
    } else if (!world.isStaff(camera.position))
      model.notify("Đi vòng bên phải quầy vào lối nhân viên để thao tác.");
    else if (nearest.id === "counter") {
      const o = model.orders.find((o) => o.status === "WAITING_PAYMENT");
      if (o && model.openCash(o.customer)) {
        model.cashHint = false;
        ui.open("cash", "counter");
      } else ui.open("orders", "counter");
    } else {
      const hadJob = !!model.job;
      if (model.interact(nearest.id))
        sound(!hadJob && model.job ? "machine" : "beep");
    }
    persist();
    onDirty();
  }
  window.addEventListener("keydown", (e) => {
    if (
      !active ||
      paused ||
      e.repeat ||
      e.target.matches("input,textarea,select")
    )
      return;
    if (e.code === "Escape") {
      if (ui.panel) {
        e.preventDefault();
        ui.close();
      }
      return;
    }
    if (e.code === "KeyE" && !ui.panel) {
      e.preventDefault();
      interact();
    }
    if (e.code === "KeyJ") {
      e.preventDefault();
      ui.panel === "quests" ? ui.close() : ui.open("quests");
    }
    if (e.code === "KeyH") {
      e.preventDefault();
      model.notify(
        "Không cần nhớ công thức: chỉ theo vật thể phát sáng và nhấn E.",
      );
    }
    if (e.code === "KeyO") {
      model.toggleBusiness();
      if (model.business) model.spawnClock = 0;
      ui.render();
      persist();
    }
  });
  window.addEventListener("pagehide", persist);
  function canReach(from, to) {
    const key = `${to.x}/${to.z}/${model.doorOpen}`;
    let c = reachCache.get(key);
    if (!c || c.until < model.clock) {
      c = {
        until: model.clock + 2,
        ok: !!findPath(
          from,
          to,
          [...navigationObstacles, world.doorShape()],
          bounds,
          CONFIG.radius,
        ),
      };
      reachCache.set(key, c);
    }
    return c.ok;
  }
  function move(n, target, dt) {
    n.moving = false;
    if (Math.hypot(target.x - n.pos.x, target.z - n.pos.z) < 0.075) return true;
    if (
      model.doorway.owner !== null &&
      model.doorway.owner !== n.id &&
      ["LEAVING_SHOP", "WALKING_TO_TABLE"].includes(n.state)
    ) {
      n.navigation = { blocked: "doorway-priority", stalled: 0 };
      return false;
    }
    const others = model.customers.filter((o) => o !== n).map(body);
    const recovery = separateRestoredActor(
      n.pos,
      others,
      [...navigationObstacles, world.doorShape()],
      CONFIG.radius,
      Math.min(0.035, CONFIG.walkSpeed * dt),
    );
    if (recovery) {
      n.moving = recovery !== n.pos;
      if (n.moving)
        n.heading = Math.atan2(recovery.x - n.pos.x, recovery.z - n.pos.z);
      n.pos = { ...recovery };
      n.navigation = { blocked: "restored-overlap", stalled: 0 };
      paths.delete(n.id);
      return false;
    }
    let route = paths.get(n.id);
    const signature = `${n.state}/${target.x}/${target.z}/${model.doorOpen}`;
    const doorShape = world.doorShape();
    if (!route || route.signature !== signature || route.retry <= model.clock) {
      n.replans = (n.replans || 0) + 1;
      const idle = model.customers.filter((o) => o !== n).map(body);
      const path = findPath(
        n.pos,
        target,
        [...navigationObstacles, doorShape, ...idle],
        bounds,
        CONFIG.radius,
      );
      route = {
        signature,
        path,
        retry: model.clock + (path ? CONFIG.replanSeconds : 0.7),
      };
      paths.set(n.id, route);
    }
    if (!route.path?.length) {
      n.navigation = {
        blocked: "no-path",
        stalled: (n.navigation?.stalled || 0) + dt,
      };
      return false;
    }
    const before = { ...n.pos };
    let budget = CONFIG.walkSpeed * dt;
    const ob = [
      ...navigationObstacles,
      doorShape,
      ...model.customers.filter((o) => o !== n).map(body),
    ];
    if (active && pov.isLocked)
      ob.push({
        kind: "circle",
        x: camera.position.x,
        z: camera.position.z,
        radius: 0.28,
      });
    while (budget > 0 && route.path.length) {
      const p = route.path[0],
        dx = p.x - n.pos.x,
        dz = p.z - n.pos.z,
        l = Math.hypot(dx, dz);
      if (l < 0.04) {
        route.path.shift();
        continue;
      }
      const distance = Math.min(0.06, budget, l),
        next = slide(
          n.pos,
          (dx / l) * distance,
          (dz / l) * distance,
          CONFIG.radius,
          ob,
        );
      if (Math.hypot(next.x - n.pos.x, next.z - n.pos.z) < distance * 0.3) {
        route.retry = Math.min(route.retry, model.clock + 0.4);
        break;
      }
      n.pos = next;
      n.heading = Math.atan2(dx, dz);
      n.moving = true;
      budget -= distance;
    }
    const progress = Math.hypot(n.pos.x - before.x, n.pos.z - before.z);
    n.navigation = {
      blocked: progress < dt * CONFIG.walkSpeed * 0.15 ? "occupied" : null,
      stalled:
        progress < dt * CONFIG.walkSpeed * 0.15
          ? (n.navigation?.stalled || 0) + dt
          : 0,
    };
    if (n.navigation.stalled > CONFIG.stuckSeconds) {
      route.retry = model.clock;
      n.replans = (n.replans || 0) + 1;
    }
    if (
      n.navigation.stalled > CONFIG.seatFallbackSeconds &&
      n.state === "WALKING_TO_TABLE"
    ) {
      // The model's existing unreachable-seat fallback releases its reservation.
      reachCache.clear();
    }
    return Math.hypot(target.x - n.pos.x, target.z - n.pos.z) < 0.08;
  }
  return {
    model,
    world,
    obstacles,
    collision,
    ui,
    start,
    stop,
    persist,
    canReach,
    get paused() {
      return paused;
    },
    set paused(value) {
      paused = !!value;
    },
    get active() {
      return active;
    },
    get modal() {
      return !!ui.panel;
    },
    update(dt) {
      if (active && !paused) {
        for (const id of paths.keys())
          if (!model.customers.some((n) => n.id === id)) paths.delete(id);
        for (const id of entryChecks.keys())
          if (!model.customers.some((n) => n.id === id)) entryChecks.delete(id);
        if (dt > 0) onDirty();
        model.updateDoorSafety(world.isDoorClear(camera.position, model.customers, false), world.isDoorClear(camera.position, model.customers, true));
        model.update(Math.min(dt, 1), move, canReach);
        saveClock += dt;
        if (saveClock > 2) {
          saveClock = 0;
          persist();
        }
      }
      world.update(model, paused ? 0 : Math.min(dt, 0.1), active);
      if (active && !paused) {
        let best = Infinity;
        nearest = null;
        const direction = camera.getWorldDirection(new THREE.Vector3());
        direction.y = 0;
        direction.normalize();
        const expected = tutorialStep(model)?.station;
        for (const s of world.stations) {
          const delta = new THREE.Vector3(
              s.position.x - camera.position.x,
              0,
              s.position.z - camera.position.z,
            ),
            distance = delta.length(),
            dot = delta.normalize().dot(direction),
            score =
              distance +
              (1 - dot) * 5 -
              (s.id === expected && dot > 0.7 ? 1 : 0);
          if (distance < 2.2 && dot > -0.2 && score < best) {
            best = score;
            nearest = s;
          }
        }
        ui.update(
          ui.panel
            ? ""
            : pov.isLocked
              ? nearest
                ? `E · ${nearest.name}`
                : "Theo dấu chỉ dẫn · J nhiệm vụ"
              : "Nhấp cảnh để nhìn / WASD",
        );
      }
    },
    movePlayer(dx, dz) {
      collision.move(camera, dx, dz);
    },
  };
}
