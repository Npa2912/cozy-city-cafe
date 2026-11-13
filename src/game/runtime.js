import * as THREE from "three";
import { CafeGame } from "./model.js";
import { cafeWorld } from "./world.js";
import { collectObstacles, createPlayerCollision } from "./world-collision.js";
import { findPath, slide } from "./collision.js";
import { CONFIG, RECIPES } from "./data.js";
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
  const world = cafeWorld(scene, cafe, camera),
    model = new CafeGame(world.layout, loadGame());
  world.setDoorInstant(model.doorOpen);
  const obstacles = [...collectObstacles(scene), ...world.obstacles];
  const navigationObstacles = obstacles.filter((b) =>
    b.kind === "circle"
      ? b.x + b.radius >= world.bounds.minX &&
        b.x - b.radius <= world.bounds.maxX &&
        b.z + b.radius >= world.bounds.minZ &&
        b.z - b.radius <= world.bounds.maxZ
      : b.maxX >= world.bounds.minX &&
        b.minX <= world.bounds.maxX &&
        b.maxZ >= world.bounds.minZ &&
        b.minZ <= world.bounds.maxZ,
  );
  let active = false,
    saveClock = 0,
    nearest = null;
  const paths = new Map();
  const dynamic = () => [
    world.doorShape(),
    ...model.customers.map((n) => ({
      kind: "circle",
      x: n.pos.x,
      z: n.pos.z,
      radius: 0.25,
    })),
  ];
  const collision = createPlayerCollision(obstacles, dynamic, world.floorAt);
  const near = (id) => {
    const s = world.stations.find((s) => s.id === id);
    return (
      s &&
      Math.hypot(
        camera.position.x - s.position.x,
        camera.position.z - s.position.z,
      ) < 2.25
    );
  };
  function persist() {
    if (!saveGame(model.snapshot()))
      model.notify(
        "Trình duyệt không cho lưu dữ liệu. Ca này vẫn chơi được, nhưng có thể mất khi tải lại.",
      );
  }
  function modal(open) {
    pov.unlock();
    orbit.enabled = false;
    if (!open && active) {
      pov.lock();
    }
    onDirty();
  }
  const ui = gameUI(
    model,
    (action, id) => {
      if (action === "business") {
        model.toggleBusiness();
        if (model.business) model.spawnClock = CONFIG.spawnSeconds;
      } else if (action === "accept" && near("counter")) {
        if (model.accept(Number(id))) sound("beep");
      } else if (action === "pay" && near("counter")) {
        if (model.pay(Number(id))) sound("pay");
      } else if (action === "craft") {
        const station =
          id === "coffee" ? "coffee" : id === "shake" ? "tea" : "ingredients";
        if (!near(station)) model.notify("Hãy đến đúng khu vực để thao tác.");
        else if (model.action(id)) {
          sound(id === "coffee" || id === "shake" ? "machine" : "beep");
        }
      } else if (action === "discard" && near("ingredients")) model.discard();
      else if (action === "claim") {
        if (model.claim(id)) sound("pay");
      } else if (action === "save") {
        persist();
        model.notify("Đã lưu ca hiện tại trên trình duyệt.");
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
  const startButton = document.createElement("button");
  startButton.id = "game-start";
  startButton.textContent = "Chơi quán · E tương tác";
  startButton.addEventListener("click", start);
  document.querySelector("nav").prepend(startButton);
  canvas.addEventListener("click", () => {
    if (active && !ui.panel && !pov.isLocked) pov.lock();
  });
  function interact() {
    if (!nearest) return;
    if (nearest.id === "door") {
      // Refuse either sweep if someone occupies the inner portal; the player can
      // operate the handle safely from both sides of the door.
      if (!world.isDoorClear(camera.position, model.customers, !model.doorOpen))
        model.notify(
          "Có người trong vùng cửa. Lùi khỏi ngưỡng cửa trước khi mở/đóng.",
        );
      else {
        model.doorOpen = !model.doorOpen;
        paths.clear();
        model.message = `Cửa ${model.doorOpen ? "OPEN" : "CLOSED"} · Trạng thái kinh doanh được điều khiển riêng.`;
        model.touch();
        sound("beep");
      }
    } else if (nearest.id.startsWith("clean")) {
      model.clean(Number(nearest.id.slice(5)));
    } else if (nearest.id === "delivery") {
      if (model.serve()) sound("beep");
    } else if (nearest.id === "counter") {
      ui.open(
        model.customers.some((n) => n.state === "WAITING_FOR_PAYMENT")
          ? "pos"
          : "counter",
        "counter",
      );
    } else ui.open(nearest.id, nearest.id);
    persist();
    onDirty();
  }
  window.addEventListener("keydown", (e) => {
    if (!active || e.repeat) return;
    if (e.target.matches("input,select,textarea")) return;
    if (e.code === "Escape") {
      if (ui.panel) {
        e.preventDefault();
        ui.close();
      }
      return;
    }
    if (e.code === "KeyH" || e.code === "KeyJ") {
      e.preventDefault();
      const panel = e.code === "KeyH" ? "recipes" : "quests";
      if (ui.panel === panel) ui.close();
      else ui.open(panel);
    }
    if (e.code === "KeyE" && !ui.panel) {
      e.preventDefault();
      interact();
    }
    if (e.code === "KeyO") {
      model.toggleBusiness();
      if (model.business) model.spawnClock = CONFIG.spawnSeconds;
      persist();
      ui.render();
    }
    if (e.code === "KeyB")
      model.notify(
        "Edit Mode thuộc Mốc 3, chưa được triển khai trong bản chơi này.",
      );
  });
  window.addEventListener("pagehide", persist);
  function move(n, target, dt) {
    n.moving = false;
    const dist = Math.hypot(target.x - n.pos.x, target.z - n.pos.z);
    if (dist < 0.075) return true;
    let route = paths.get(n.id);
    const signature = `${n.state}/${target.x}/${target.z}/${model.doorOpen}`;
    if (!route || route.signature !== signature || route.retry <= model.clock) {
      const shapes = [...navigationObstacles, world.doorShape()];
      const path = findPath(n.pos, target, shapes, world.bounds, 0.23);
      route = { signature, path, retry: model.clock + (path ? 3 : 1) };
      paths.set(n.id, route);
    }
    if (!route.path?.length) return false;
    let budget = CONFIG.walkSpeed * dt;
    while (budget > 0 && route.path.length) {
      const p = route.path[0],
        dx = p.x - n.pos.x,
        dz = p.z - n.pos.z,
        l = Math.hypot(dx, dz);
      if (l < 0.04) {
        route.path.shift();
        continue;
      }
      const step = Math.min(0.06, budget, l),
        ob = [
          ...navigationObstacles,
          world.doorShape(),
          ...model.customers
            .filter((o) => o !== n)
            .map((o) => ({
              kind: "circle",
              x: o.pos.x,
              z: o.pos.z,
              radius: 0.25,
            })),
        ];
      if (active && pov.isLocked)
        ob.push({
          kind: "circle",
          x: camera.position.x,
          z: camera.position.z,
          radius: 0.28,
        });
      const next = slide(n.pos, (dx / l) * step, (dz / l) * step, 0.23, ob);
      const moved = Math.hypot(next.x - n.pos.x, next.z - n.pos.z);
      if (moved < step * 0.3) {
        route.retry = Math.min(route.retry, model.clock + 0.5);
        break;
      }
      n.pos = next;
      n.heading = Math.atan2(dx, dz);
      n.moving = true;
      budget -= step;
    }
    return Math.hypot(target.x - n.pos.x, target.z - n.pos.z) < 0.08;
  }
  return {
    model,
    obstacles,
    world,
    collision,
    ui,
    start,
    stop,
    get active() {
      return active;
    },
    get modal() {
      return !!ui.panel;
    },
    update(dt) {
      if (active && dt > 0) onDirty();
      if (active) {
        if (
          model.cleaning &&
          Math.hypot(
            camera.position.x - model.seats[model.cleaning.id].center.x,
            camera.position.z - model.seats[model.cleaning.id].center.z,
          ) > 2.4
        ) {
          model.cleaning = null;
          model.notify("Đã dừng dọn bàn vì bạn đi quá xa.");
        }
        model.update(Math.min(dt, 1), move);
        saveClock += dt;
        if (saveClock > 2) {
          saveClock = 0;
          persist();
        }
      }
      world.update(model, Math.min(dt, 0.1), active);
      if (active) {
        const direction = camera.getWorldDirection(new THREE.Vector3());
        let best = Infinity;
        nearest = null;
        const candidates = [
          ...world.stations,
          ...model.seats
            .filter((s) => s.status === "NEEDS_CLEANING")
            .map((s) => ({
              id: `clean${s.id}`,
              name: "Dọn bàn",
              position: s.center,
            })),
        ];
        for (const s of candidates) {
          const delta = new THREE.Vector3(
              s.position.x - camera.position.x,
              0,
              s.position.z - camera.position.z,
            ),
            distance = delta.length();
          const dot = delta
            .normalize()
            .dot(new THREE.Vector3(direction.x, 0, direction.z).normalize());
          const score = distance + (1 - dot) * 5;
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
                : "H · Công thức   J · Nhiệm vụ"
              : "Nhấp cảnh để tiếp tục nhìn / WASD",
        );
      }
    },
    movePlayer(dx, dz) {
      collision.move(camera, dx, dz);
    },
    persist,
  };
}
