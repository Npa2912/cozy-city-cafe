import { isOutside } from './doorway.js';
import { releaseQueue } from './queue.js';
export function withdrawOutside(model) {
 for(const n of model.customers) {
  if(!isOutside(n)) continue;
  releaseQueue(model,n.id);
  const order=model.orders.find(o=>o.customer===n.id);
  if(order&&!order.paid) order.status='CANCELLED';
  n.inside=false;delete n.outsideSlot;
  model.transition(n,'WALKING_AWAY');
 }
}
export function requestClose(model) {
 model.business=false;model.closing=true;model.closeRequested=true;
 withdrawOutside(model);
 model.notify('Đã ngừng bán. Khách chờ ngoài rời đi; cửa tự đóng khi vùng cửa an toàn.');
}
export function updateDoorSafety(model, closingClear, openingClear=closingClear) {
 const exits=model.customers.some(n=>['LEAVING_SHOP','WAITING_TO_EXIT','EXITING_DOOR'].includes(n.state));
 if(!model.closeRequested){if(exits&&!model.doorOpen&&openingClear){model.doorOpen=true;model.touch();}return;}
 const transit=model.customers.some(n=>['ENTERING_DOOR','EXITING_DOOR'].includes(n.state));
 const open=exits ? (model.doorOpen||openingClear) : (!transit&&closingClear ? false:model.doorOpen);
 if(open!==model.doorOpen){model.doorOpen=open;model.touch();}
}
