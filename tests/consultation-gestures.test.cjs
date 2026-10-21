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
  send('pointerdown',500,500);send('pointermove',600,600);send('pointercancel',600,600);assert.equal(ink.get().length,2);ink.undo();assert.deepEqual(ink.get(),saved);
  send('pointerdown',500,500);send('pointermove',600,600);send('pointerup',600,600);assert.equal(ink.get().length,2);ink.undo();assert.deepEqual(ink.get(),saved);
  mode='eraser';send('pointerdown',10+width*.4,20+width*4/3*.4);send('pointerup',10+width*.4,20+width*4/3*.4);assert.equal(ink.get().length,0);ink.undo();assert.deepEqual(ink.get(),saved);
 }finally{if(previous===undefined)delete global.document;else global.document=previous;}
});
test('long swipes keep the visible offset within one page and continue the turn from that offset',()=>{
 const target=new Target(),drags=[],turns=[];let time=0;
 attachSwipe(target,{now:()=>time,onDrag:dx=>drags.push(dx),onTurn:(direction,dx)=>turns.push([direction,dx])});
 target.send('pointerdown',900,200);time=400;target.send('pointermove',0,200);target.send('pointerup',0,200);
 assert.equal(drags.at(-1),-600);assert.deepEqual(turns,[[1,-600]]);
});

test('ink coordinates invert the SVG screen transform after scrolling, resizing, zooming and rotation',()=>{
 const {inkPoint}=require('../src/consultation/ink.cjs');
 for(const matrix of [
  {a:.4,b:0,c:0,d:.4,e:17,f:103},
  {a:1.25,b:0,c:0,d:1.25,e:92,f:-615},
  {a:.55,b:0,c:0,d:.7,e:31,f:-190},
  {a:0,b:.75,c:-.75,d:0,e:1000,f:15},
  {a:.8,b:.1,c:.2,d:.9,e:17,f:200}
 ])for(const [x,y]of [[.01,.01],[.5,.5],[.99,.99]]){
  const p={clientX:matrix.a*x*768+matrix.c*y*1024+matrix.e,clientY:matrix.b*x*768+matrix.d*y*1024+matrix.f};
  const actual=inkPoint({getScreenCTM:()=>matrix},null,p);assert.ok(Math.abs(actual[0]-x)<1e-10);assert.ok(Math.abs(actual[1]-y)<1e-10);
 }
 const actual=inkPoint({getBoundingClientRect:()=>({left:24,top:-100,width:300,height:500})},{getBoundingClientRect:()=>({left:0,top:0,width:400,height:600})},{clientX:174,clientY:150});assert.deepEqual(actual,[.5,.5]);
});
test('highlighter opacity and width survive restore; release coordinates finish the line without a move event',()=>{
 const {parseHTML}=require('linkedom'),{attachInk}=require('../src/consultation/ink.cjs');
 const {document,window}=parseHTML('<html><body><div id="surface"></div></body></html>'),previous=global.document;global.document=document;
 try{
  const surface=document.querySelector('#surface');surface.setPointerCapture=()=>{};surface.getBoundingClientRect=()=>({left:20,top:-80,width:384,height:512});
  const ink=attachInk(surface,{enabled:()=>true,tool:()=> 'highlighter',color:()=> '#FFE04A',width:()=>24});
  const send=(type,x,y,id=1,pointerType='pen')=>{const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId:id,pointerType,isPrimary:true,button:0});surface.dispatchEvent(e);};
  send('pointerdown',116,48);send('pointerup',308,304);
  const saved=ink.get();assert.deepEqual(saved[0].points.at(0),[.25,.25]);assert.deepEqual(saved[0].points.at(-1),[.75,.75]);assert.equal(saved[0].tool,'highlighter');
  ink.set(saved);const line=surface.querySelector('polyline');assert.equal(line.getAttribute('stroke-opacity'),'0.3');assert.equal(line.getAttribute('stroke-width'),'24');assert.equal(surface.querySelector('svg').getAttribute('preserveAspectRatio'),'none');
  send('pointerdown',50,50,2,'touch');send('pointerdown',116,48,3,'pen');send('pointermove',308,304,3,'pen');send('pointerup',308,304,3,'pen');assert.equal(ink.get().length,3);assert.deepEqual(ink.get()[2].points.at(0),[.25,.25]);
 }finally{if(previous===undefined)delete global.document;else global.document=previous;}
});

test('interrupted touch strokes remain visible, notify saving once, and allow the next stroke',()=>{
 const {parseHTML}=require('linkedom'),{attachInk}=require('../src/consultation/ink.cjs');
 const {document,window}=parseHTML('<html><body><div id="surface"></div></body></html>'),previous=global.document;global.document=document;
 try{
  const surface=document.querySelector('#surface');surface.setPointerCapture=()=>{};surface.hasPointerCapture=()=>true;surface.getBoundingClientRect=()=>({left:0,top:0,width:768,height:1024});
  const changes=[];const ink=attachInk(surface,{enabled:()=>true,onChange:strokes=>changes.push(strokes)});
  const send=(type,x,y,id=1,primary=true)=>{const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId:id,pointerType:'touch',isPrimary:primary,button:0});surface.dispatchEvent(e);};
  for(const interruption of ['pointercancel','lostpointercapture']){
   const count=ink.get().length,saves=changes.length;send('pointerdown',100,200);send('pointermove',300,400);send(interruption,300,400);send('pointerup',300,400);
   assert.equal(ink.get().length,count+1);assert.equal(surface.querySelectorAll('polyline').length,count+1);assert.equal(changes.length,saves+1);assert.deepEqual(changes.at(-1).at(-1).points.at(-1),[300/768,400/1024]);
  }
  send('pointerdown',100,200);send('pointermove',300,400);send('pointerdown',500,500,2,false);assert.equal(ink.get().length,3);assert.equal(changes.length,3);send('pointerup',300,400);send('pointerup',500,500,2,false);
  send('pointerdown',120,240);send('pointermove',360,480);ink.cancel();assert.equal(ink.get().length,4);assert.equal(changes.length,4);send('pointerup',360,480);assert.equal(changes.length,4);
  surface.hasPointerCapture=()=>false;surface.setPointerCapture=()=>{throw Error('capture unavailable');};send('pointerdown',50,50);send('pointermove',100,100);send('pointerleave',100,100);assert.equal(ink.get().length,5);assert.equal(changes.length,5);
  ink.undo();assert.equal(ink.get().length,4);
 }finally{if(previous===undefined)delete global.document;else global.document=previous;}
});
