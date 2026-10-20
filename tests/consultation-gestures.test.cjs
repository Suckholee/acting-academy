const {test}=require('node:test'),assert=require('node:assert/strict');
const {attachSwipe}=require('../src/consultation/gestures.cjs');
const {distanceToSegment}=require('../src/consultation/ink.cjs');
class Target extends EventTarget {clientWidth=600;setPointerCapture(){}send(type,x,y,id=1){const e=new Event(type,{cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId:id,button:0,isPrimary:true});this.dispatchEvent(e);return e;}}
test('horizontal swipes turn one page; vertical scroll, short drags, multitouch and writing do not',()=>{
 const target=new Target(),turns=[],snaps=[];let time=0,writing=false,boundary=false;attachSwipe(target,{now:()=>time,canStart:()=>!writing,canGo:()=>!boundary,onTurn:d=>turns.push(d),onSnap:dx=>snaps.push(dx)});
 target.send('pointerdown',450,200);time=300;target.send('pointermove',200,215);target.send('pointerup',200,215);assert.deepEqual(turns,[1]);
 target.send('pointerdown',200,200);time+=300;target.send('pointermove',400,200);target.send('pointerup',400,200);assert.deepEqual(turns,[1,-1]);
 target.send('pointerdown',200,200);time+=300;target.send('pointermove',225,202);target.send('pointerup',225,202);assert.equal(turns.length,2);assert.equal(snaps.at(-1),25);
 target.send('pointerdown',200,200);target.send('pointermove',210,400);target.send('pointerup',210,400);assert.equal(turns.length,2);
 target.send('pointerdown',450,200);target.send('pointermove',300,200);target.send('pointerdown',350,250,2);target.send('pointerup',100,200);target.send('pointerup',350,250,2);assert.equal(turns.length,2);
 writing=true;target.send('pointerdown',450,200);target.send('pointermove',100,200);target.send('pointerup',100,200);assert.equal(turns.length,2);
 writing=false;boundary=true;target.send('pointerdown',450,200);time+=300;target.send('pointermove',100,200);target.send('pointerup',100,200);assert.equal(turns.length,2);assert.equal(snaps.at(-1),-70);
});
test('quick flicks navigate; swipe clicks are suppressed so a dragged footer cannot open a link',()=>{
 let time=0,turns=0;const target=new Target();attachSwipe(target,{now:()=>time,onTurn:()=>turns++});target.send('pointerdown',200,200);time=40;target.send('pointermove',155,201);target.send('pointerup',155,201);assert.equal(turns,1);assert.equal(target.send('click',155,201).defaultPrevented,true);time=600;assert.equal(target.send('click',155,201).defaultPrevented,false);
});
test('eraser hits stroke segments, including a one-point ink dot',()=>{assert.equal(distanceToSegment([5,2],[0,0],[10,0]),2);assert.equal(distanceToSegment([3,4],[0,0],[0,0]),5);});
test('pen ink uses page coordinates across tablet sizes, survives restore, ignores a palm and supports undo',()=>{
 const {parseHTML}=require('linkedom'),{attachInk}=require('../src/consultation/ink.cjs');
 const {document,window}=parseHTML('<html><body><div id="surface"></div></body></html>'),previous=global.document;global.document=document;
 try{
  const surface=document.querySelector('#surface');surface.setPointerCapture=()=>{};let width=384;
  surface.getBoundingClientRect=()=>({left:10,top:20,width,height:width*4/3});
  let changes=[],mode='pen';const ink=attachInk(surface,{enabled:()=>true,mode:()=>mode,onChange:value=>changes.push(value)});
  const send=(type,x,y,id=1,pointerType='pen')=>{const event=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{clientX:x,clientY:y,pointerId:id,pointerType,isPrimary:true,button:0});surface.dispatchEvent(event);};
  send('pointerdown',106,148);send('pointerdown',30,30,2,'touch');send('pointermove',202,276);send('pointerup',202,276);send('pointerup',30,30,2,'touch');
  assert.equal(changes.length,1);assert.deepEqual(changes[0][0].points.at(0),[.25,.25]);assert.deepEqual(changes[0][0].points.at(-1),[.5,.5]);
  const saved=ink.get();width=768;ink.set(saved);assert.match(surface.querySelector('polyline').getAttribute('points'),/192,256/);
  send('pointerdown',500,500);send('pointermove',600,600);send('pointercancel',600,600);assert.deepEqual(ink.get(),saved);
  send('pointerdown',500,500);send('pointermove',600,600);send('pointerup',600,600);assert.equal(ink.get().length,2);ink.undo();assert.deepEqual(ink.get(),saved);
  mode='eraser';send('pointerdown',10+width*.4,20+width*4/3*.4);send('pointerup',10+width*.4,20+width*4/3*.4);assert.equal(ink.get().length,0);ink.undo();assert.deepEqual(ink.get(),saved);
 }finally{if(previous===undefined)delete global.document;else global.document=previous;}
});
