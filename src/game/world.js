import * as THREE from "three";
import {
  group,
  box,
  cylinder,
  sphere,
  rod,
  label,
  mat,
  torus,
} from "../street.js";
import { table, chair, cup } from "../refinement.js";
import { buildDrink } from "./drink-model.js";
import { person, batchRigidParts } from "../life.js";
import { URBAN_PLAN } from "../urban-plan.js";
import { tutorialStep } from "./crafting.js";
import { currentOrder, recipeFor } from "./orders.js";
import { CONFIG, RECIPES, money } from "./data.js";
export function cafeWorld(scene, cafe, camera) {
  cafe.updateMatrixWorld(true);
  const point = (x, z, y = 0.34) => {
    const p = cafe.localToWorld(new THREE.Vector3(x, y, z));
    return { x: p.x, y: p.y, z: p.z };
  };
  const toLocal = (p) =>
    cafe.worldToLocal(new THREE.Vector3(p.x, p.y || 0, p.z));
  const seats = [];
  const obstacles = [];

  for (const [i, [x, z]] of [
    [3.1, -3.4],
    [5.1, -1.4],
  ].entries()) {
    const t = table(cafe, x, 0.34, z, 0.55);
    t.userData.gameSeat = true;
    t.name = `game-table-${i}`;
    const c = chair(cafe, x - 0.85, 0.34, z, Math.PI / 2);
    c.userData.gameSeat = true;
    c.name = `game-chair-${i}`;
    const center = point(x, z),
      approach = point(x - 1.5, z),
      seat = point(x - 0.85, z);
    obstacles.push({
      kind: "circle",
      x: center.x,
      z: center.z,
      radius: 0.83,
      owner: `table${i}`,
    });
    const b = new THREE.Box3().setFromObject(c);
    obstacles.push({
      minX: b.min.x,
      maxX: b.max.x,
      minZ: b.min.z,
      maxZ: b.max.z,
      owner: `chair${i}`,
    });
    seats.push({ center, approach, chair: seat });
  }
  const stations = [
    ["door", "Cửa kính", -0.3, 1.04],
    ["counter", "Order / két tiền", -0.9, -3.15],
    ["ingredients", "Lấy ly", -5.3, -3.2],
    ["milk", "Phần sữa", -5.0, -3.2],
    ["teaBase", "Trà sữa pha sẵn", -2.9, -3.2],
    ["pearls", "Trân châu", -2.05, -3.2],
    ["coffee", "Máy cà phê", -3.7, -3.2],
    ["tea", "Máy lắc trà sữa", -2.4, -3.2],
    ["delivery", "Khay giao đồ", -0.7, -3.2],
  ].map(([id, name, x, z]) => ({ id, name, position: point(x, z, 1.3) }));
  const staffSigns = group(cafe, 0, 0, -5.6, Math.PI);
  for (const [name, x] of [
    ["LY / SỮA", 5.1],
    ["CÀ PHÊ", 3.7],
    ["TRÀ SỮA", 2.7],
    ["ORDER / KÉT", 0.9],
  ])
    label(
      staffSigns,
      name,
      x,
      0.85,
      -2.15,
      0.9,
      0.18,
      "#fff0c9",
      "#527d69",
      "bold 60px sans-serif",
    );
  const entry = label(
    cafe,
    "LỐI NHÂN VIÊN →",
    0.5,
    0.37,
    -2.3,
    1.6,
    0.28,
    "#f5e6bb",
    "#527d69",
  );
  entry.rotation.x = -Math.PI / 2;
  // Just a small stock of usable cups and two ingredient containers.
  for (let i = 0; i < 2; i++)
    cup(cafe, -5.3 + i * 0.16, 1.23, -3.08, "#eee1bf", false);
  cylinder(cafe, -5.0, 1.4, -3.18, 0.08, 0.08, 0.35, "#e6dec6");
  cylinder(
    cafe,
    -2.05,
    1.4,
    -3.18,
    0.075,
    0.075,
    0.34,
    mat("#d6c29d", { transparent: true, opacity: 0.6 }),
  );
  const marker = group(scene);
  marker.userData.dynamic = true;
  marker.name = "guided-station-highlight";
  const ring = torus(
    marker,
    0,
    0,
    0,
    0.29,
    0.027,
    new THREE.MeshBasicMaterial({
      color: "#f4c95f",
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.24, 16),
    new THREE.MeshBasicMaterial({ color: "#ffe39a" }),
  );
  arrow.rotation.z = Math.PI;
  arrow.position.y = 0.55;
  marker.add(arrow);
  marker.visible = false;
  // Support the moved pastry display on a rear shelf.
  box(cafe, 3.4, 2.96, -4.57, 1.05, 0.12, 0.65, "#886b48", 0.04);
  for (const x of [3.1, 3.7])
    rod(cafe, [x, 2.6, -4.79], [x, 2.91, -4.31], 0.035, "#826743");
  const tray = group(cafe, -0.75, 1.19, -2.32);
  box(tray, 0, 0, 0, 0.7, 0.05, 0.55, "#6d8879", 0.08);
  const held = group(camera, 0.35, -0.38, -0.68);
  held.userData.dynamic = true;
  held.name = "player-held-drink";
  const heldCoffee = buildDrink(held, "black"),
    heldTea = buildDrink(held, "pearlTea");
  held.scale.setScalar(1.55);
  held.visible = false;
  const machine = group(cafe, -3.7, 1.5, -3.15);
  machine.userData.dynamic = true;
  const steam = [];
  for (let i = 0; i < 4; i++)
    steam.push(
      sphere(
        machine,
        -0.25 + i * 0.16,
        0.4,
        0.05,
        0.035,
        0.06,
        0.035,
        mat("#fff5db", { transparent: true, opacity: 0.45, depthWrite: false }),
      ),
    );
  const handoff = group(cafe, -0.75, 1.23, -2.32);
  handoff.userData.dynamic = true;
  const handoffCoffee = buildDrink(handoff, "black"),
    handoffTea = buildDrink(handoff, "pearlTea");
  handoff.visible = false;
  const workingCup = group(cafe, -3.45, 1.22, -3.14);
  workingCup.userData.dynamic = true;
  cup(workingCup, 0, 0, 0, "#ead2a6");
  workingCup.visible = false;
  const stream = cylinder(
    machine,
    0.25,
    -0.15,
    0,
    0.012,
    0.012,
    0.24,
    "#80563c",
  );
  stream.visible = false;
  const shaker = group(cafe, -2.4, 1.22, -3.1);
  shaker.userData.dynamic = true;
  cylinder(shaker, 0, 0.23, 0, 0.14, 0.11, 0.44, "#afc1b5");
  sphere(shaker, 0, 0.48, 0, 0.15, 0.07, 0.15, "#e0d8bb");
  shaker.visible = false;
  const door = cafe.userData.door;
  let doorAngle = 0;
  const actorMap = new Map();
  let displayRevision = -1;
  function createActor(n) {
    const a = person(scene, {
      x: n.pos.x,
      z: n.pos.z,
      color: ["#91b8ca", "#dab0bd", "#a6c28e"][n.id % 3],
      skirt: n.id % 2 === 0,
      hat: n.id % 3 === 0,
      hair: ["#61432f", "#3e3337", "#86705b"][n.id % 3],
      scale: 0.93,
    });
    a.g.name = `customer-${n.id}`;
    const bent = group(a.g, 0, 0.64, 0);
    for (const side of [-1, 1]) {
      rod(
        bent,
        [side * 0.105, 0, 0],
        [side * 0.105, -0.07, 0.3],
        0.075,
        "#657b89",
      );
      sphere(bent, side * 0.105, -0.07, 0.3, 0.075, 0.075, 0.075, "#657b89");
      rod(
        bent,
        [side * 0.105, -0.07, 0.3],
        [side * 0.105, -0.53, 0.3],
        0.065,
        "#f3dfc3",
      );
      sphere(bent, side * 0.105, -0.59, 0.36, 0.1, 0.07, 0.16, "#765447");
    }
    bent.visible = false;
    const drink = group(a.limbs[0], 0, -0.4, 0.05);
    buildDrink(drink, n.recipe);
    drink.visible = false;
    const cash = group(a.limbs[2], 0, -0.38, 0.06);
    box(cash, 0, 0, 0, 0.24, 0.12, 0.012, "#9ebd9d", 0.015);
    cash.visible = false;
    batchRigidParts(a.g);
    return { ...a, bent, drink, cash };
  }
  return {
    point,
    toLocal,
    isStaff(p) {
      const l = toLocal(p);
      return l.z < -3.48 && l.z > -4.8 && l.x > -6.0 && l.x < 0.8;
    },
    stations,
    seats,
    obstacles,
    door,
    layout: {
      seats,
      spawn: point(-2.8, 2.0),
      entrance: point(-0.3, 1.85),
      counter: point(-1.8, -1.25),
      queue: [point(-1.8, -1.25), point(-3.2, -1.25), point(-4.6, -1.25)],
      handoff: point(-0.75, -1.65),
      exit: point(-2.8, 2.0),
      departure: { x: -1.05, z: -23 },
    },
    bounds: { minX: -8.45, maxX: -0.8, minZ: -30, maxZ: 3.8 },
    floorAt(p) {
      const a = URBAN_PLAN.annex;
      if (p.x > a.minX && p.x < a.maxX && p.z > a.minZ && p.z < a.maxZ)
        return a.floorY;
      const l = toLocal(p);
      return l.x > -6.2 && l.x < 6.2 && l.z < 1.1 && l.z > -5.1 ? 0.391 : 0.23;
    },
    doorShape() {
      door.updateWorldMatrix(true, true);
      const b = new THREE.Box3().setFromObject(door);
      return {
        minX: b.min.x,
        maxX: b.max.x,
        minZ: b.min.z,
        maxZ: b.max.z,
        owner: "door",
      };
    },
    isDoorClear(player, customers, opening = false) {
      return ![player, ...customers.map((n) => n.pos)].some((p) => {
        const l = toLocal(p);
        return (
          l.x > -1.5 && l.x < 0.9 && l.z > -0.95 && l.z < (opening ? 0.9 : 1.65)
        );
      });
    },
    setDoorInstant(open) {
      doorAngle = open ? 1.52 : 0;
      door.rotation.y = doorAngle;
    },
    update(model, dt, playingGame = true) {
      doorAngle = THREE.MathUtils.damp(
        doorAngle,
        model.doorOpen ? 1.52 : 0,
        6,
        dt,
      );
      door.rotation.y = doorAngle;
      const step = tutorialStep(model),
        focus = step?.station || (!model.doorOpen ? "door" : "counter"),
        target = stations.find((s) => s.id === focus);
      marker.visible = playingGame && !!target;
      if (target) {
        marker.position.set(
          target.position.x,
          target.position.y + 0.12,
          target.position.z,
        );
        const pulse = model.settings.staticHighlight
          ? 1
          : 0.88 + Math.sin(model.clock * 2.5) * 0.12;
        ring.scale.setScalar(pulse);
        arrow.position.y =
          0.55 +
          (model.settings.staticHighlight
            ? 0
            : Math.sin(model.clock * 2.5) * 0.07);
      }
      if (cafe.userData.cashDrawer)
        cafe.userData.cashDrawer.position.z = THREE.MathUtils.damp(
          cafe.userData.cashDrawer.position.z,
          model.register ? -2.68 : -2.3,
          8,
          dt,
        );
      held.visible = playingGame && !!model.craft && !model.job;
      const steps = model.craft?.steps || [],
        isTea = steps.includes("teaBase");
      heldTea.g.visible = isTea;
      heldCoffee.g.visible = !isTea;
      heldTea.pearls.visible = steps.includes("pearls");
      for (const vessel of [heldTea, heldCoffee]) {
        vessel.liquid.visible = steps.length > 1;
        vessel.liquid.scale.y = Math.max(
          0.02,
          Math.min(1, (steps.length - 1) / 3),
        );
        vessel.liquid.material.color.set(
          isTea ? "#c0a17a" : steps.includes("milk") ? "#bb9876" : "#654635",
        );
      }
      const pending = model.customers.find(
          (n) =>
            ["WAITING_FOR_DRINK", "WAITING_FOR_PAYMENT", "PICKING_UP"].includes(
              n.state,
            ) &&
            model.orders.some(
              (o) =>
                o.customer === n.id &&
                ["READY", "WAITING_PAYMENT", "PAID"].includes(o.status),
            ) &&
            !n.pickedUp,
        ),
        teaOrder = pending?.recipe.includes("Tea");
      handoffTea.g.visible = !!teaOrder;
      handoffTea.pearls.visible = pending?.recipe === "pearlTea";
      handoffCoffee.g.visible = !teaOrder;
      if (cafe.userData.posDisplays && displayRevision !== model.revision) {
        displayRevision = model.revision;
        const order = model.orders.find((o) => !o.paid),
          r = RECIPES.find((r) => r.id === order?.recipe),
          n = model.customers.find((n) => n.id === order?.customer);
        for (const texture of Object.values(cafe.userData.posDisplays)) {
          const c = texture.image.getContext("2d"),
            w = texture.image.width,
            h = texture.image.height;
          c.fillStyle = "#416e5d";
          c.fillRect(0, 0, w, h);
          c.fillStyle = "#fff0cd";
          c.font = "bold 40px sans-serif";
          c.fillText("ANTELEO · POS", 24, 64);
          c.font = "25px sans-serif";
          c.fillText(r ? r.name : "Sẵn sàng nhận đơn", 24, 120);
          c.fillText(n ? n.name + " · #" + n.id : "Quầy thanh toán", 24, 164);
          c.font = "bold 32px sans-serif";
          c.fillText(r ? money(r.price) : "0đ", 24, 215);
          c.font = "22px sans-serif";
          c.fillText(
            n?.state === "WAITING_FOR_PAYMENT"
              ? "CHO THANH TOAN"
              : "ORDER / PHUC VU",
            24,
            255,
          );
          texture.needsUpdate = true;
        }
      }
      handoff.visible = model.customers.some(
        (n) =>
          ["WAITING_FOR_DRINK", "WAITING_FOR_PAYMENT", "PICKING_UP"].includes(
            n.state,
          ) &&
          model.orders.some(
            (o) =>
              o.customer === n.id &&
              ["READY", "WAITING_PAYMENT", "PAID"].includes(o.status),
          ) &&
          !n.pickedUp,
      );
      workingCup.visible = model.job?.action === "coffee";
      stream.visible = workingCup.visible;
      shaker.visible = model.job?.action === "shake";
      shaker.rotation.z = Math.sin(model.clock * 25) * 0.15;
      machine.position.y =
        1.5 +
        (model.job?.action === "shake"
          ? Math.sin(model.clock * 32) * 0.025
          : 0);
      steam.forEach((p, i) => {
        p.visible = model.job?.action === "coffee";
        p.position.y = 0.3 + ((model.clock * 0.8 + i * 0.2) % 1) * 0.5;
        p.scale.setScalar(0.8 + ((model.clock + i * 0.2) % 1) * 0.6);
      });
      for (const n of model.customers) {
        if (!actorMap.has(n.id)) actorMap.set(n.id, createActor(n));
        const a = actorMap.get(n.id),
          sitting = n.state === "SITTING_AND_DRINKING";
        const seated = sitting
          ? Math.min(1, n.age / 0.7) *
            (1 - Math.min(1, Math.max(0, n.age - CONFIG.drinkSeconds) / 0.7))
          : 0;
        const local = toLocal(n.pos),
          floor =
            local.x > -6.2 && local.x < 6.2 && local.z < 1.1 && local.z > -5.1
              ? 0.391
              : 0.23;
        a.g.position.set(n.pos.x, floor - 0.13 + seated * 0.135, n.pos.z);
        a.g.visible = true;
        if (
          [
            "WAITING_TO_ORDER",
            "WAITING_FOR_DRINK",
            "WAITING_FOR_PAYMENT",
          ].includes(n.state)
        )
          a.g.rotation.y = -Math.PI / 2;
        else if (sitting) a.g.rotation.y = Math.PI;
        else if (n.heading !== undefined)
          a.g.rotation.y = THREE.MathUtils.damp(
            a.g.rotation.y,
            n.heading,
            7,
            dt,
          );
        a.bent.visible = seated > 0.5;
        for (const i of [1, 3]) a.limbs[i].visible = seated <= 0.5;
        a.cash.visible = n.state === "WAITING_FOR_PAYMENT";
        if (a.cash.visible) a.limbs[2].rotation.x = -1.2;
        const moving = n.moving;
        for (let i = 0; i < 4; i++)
          a.limbs[i].rotation.x = moving
            ? Math.sin(model.clock * 7 + n.id) * 0.35 * [1, -1, -1, 1][i]
            : 0;
        if (a.cash.visible) a.limbs[2].rotation.x = -1.2;
        if (n.rejectedAt !== undefined && model.clock - n.rejectedAt < 1.5) {
          a.g.rotation.y = -Math.PI / 2 + Math.sin(model.clock * 15) * 0.15;
          a.limbs[0].rotation.x = -0.5;
        }
        a.drink.visible =
          n.state === "SITTING_AND_DRINKING" ||
          (n.pickedUp &&
            [
              "PICKING_UP",
              "WALKING_TO_TABLE",
              "LEAVING_SHOP",
              "WALKING_AWAY",
            ].includes(n.state));
        if (a.drink.visible)
          a.limbs[0].rotation.x =
            -0.9 -
            (sitting ? Math.max(0, Math.sin(model.clock * 1.3)) * 0.5 : 0);
      }
      for (const [id, a] of actorMap)
        if (!model.customers.some((n) => n.id === id)) {
          a.g.traverse((o) => {
            if (o.isMesh) o.geometry.dispose();
          });
          a.g.removeFromParent();
          actorMap.delete(id);
        }
    },
    get doorReady() {
      return doorAngle > 1.4;
    },
  };
}
