export function reserveSeat(model, n, canReach = () => true) {
  const seat = model.seats.find(
    (s) => s.status === "AVAILABLE" && canReach(n.pos, s.approach),
  );
  if (!seat) {
    n.seat = null;
    n.takeaway = true;
    return null;
  }
  seat.status = "RESERVED";
  seat.customer = n.id;
  n.seat = seat.id;
  n.takeaway = false;
  return seat;
}
export function releaseSeat(model, n) {
  const seat = model.seats.find((s) => s.id === n.seat && s.customer === n.id);
  if (seat) {
    seat.status = "AVAILABLE";
    delete seat.customer;
  }
  n.seat = null;
}
