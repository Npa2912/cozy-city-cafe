export function queueCustomers(model) {
  return model.queue
    .map((id) => model.customers.find((n) => n.id === id))
    .filter(Boolean);
}
export function queueIndex(model, n) {
  return model.queue.indexOf(n.id);
}
export function releaseQueue(model, id) {
  model.queue = model.queue.filter((n) => n !== id);
}
export function isHead(model, id) {
  return model.queue[0] === id;
}
