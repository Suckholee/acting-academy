function attachSwipe(target,{canStart=()=>true,canGo=()=>true,onDrag=()=>{},onSnap=()=>{},onTurn=()=>{},width=()=>target.clientWidth,now=()=>performance.now()}){
 let gesture=null,suppressUntil=0;const pointers=new Set();
 const cancel=()=>{if(gesture?.axis==='x')onSnap(gesture.visual??gesture.dx);gesture=null;};
 const down=event=>{
  pointers.add(event.pointerId);if(pointers.size>1){cancel();return;}
  if(!canStart(event)||event.button>0||event.isPrimary===false)return;
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,time:now(),axis:null,dx:0};
 };
 const move=event=>{
  if(!gesture||gesture.id!==event.pointerId)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(!gesture.axis){if(Math.abs(dx)<12&&Math.abs(dy)<12)return;if(Math.abs(dx)<=Math.abs(dy)*1.3){gesture=null;return;}gesture.axis='x';target.setPointerCapture?.(event.pointerId);}
  gesture.dx=dx;if(event.cancelable)event.preventDefault();gesture.visual=canGo(dx<0?1:-1)?Math.max(-width(),Math.min(width(),dx)):dx*.2;onDrag(gesture.visual);
 };
 const up=event=>{
  pointers.delete(event.pointerId);if(!gesture||gesture.id!==event.pointerId)return;
  const active=gesture;gesture=null;
  if(active.axis!=='x')return;
  suppressUntil=now()+400;
  const distance=Math.abs(active.dx),speed=distance/Math.max(1,now()-active.time),direction=active.dx<0?1:-1;
  if(canGo(direction)&&(distance>=Math.min(120,Math.max(56,width()*.18))||(distance>28&&speed>.55)))onTurn(direction,active.visual??active.dx);else onSnap(active.visual??active.dx);
 };
 const lost=event=>{pointers.delete(event.pointerId);cancel();};
 const click=event=>{if(now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}};
 target.addEventListener('pointerdown',down);target.addEventListener('pointermove',move,{passive:false});target.addEventListener('pointerup',up);target.addEventListener('pointercancel',lost);target.addEventListener('lostpointercapture',lost);target.addEventListener('click',click,true);
 return()=>{cancel();target.removeEventListener('pointerdown',down);target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',up);target.removeEventListener('pointercancel',lost);target.removeEventListener('lostpointercapture',lost);target.removeEventListener('click',click,true);};
}
module.exports={attachSwipe};
