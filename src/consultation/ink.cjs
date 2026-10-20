const NS='http://www.w3.org/2000/svg';
function distanceToSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;const t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function attachInk(surface,{enabled=()=>false,mode=()=> 'pen',color=()=> '#C34C3F',width=()=>3,onChange=()=>{}}={}){
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 768 1024');svg.setAttribute('class','ink-layer');svg.setAttribute('aria-label','이 상담방의 페이지 필기');surface.append(svg);
 let paths=[],history=[],active=null,before=null;const touches=new Set();
 const copy=value=>JSON.parse(JSON.stringify(value));
 const point=e=>{const box=surface.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),Math.max(0,Math.min(1,(e.clientY-box.top)/box.height))];};
 function draw(){svg.replaceChildren();for(const stroke of paths){const line=document.createElementNS(NS,'polyline');line.setAttribute('points',stroke.points.map(p=>`${p[0]*768},${p[1]*1024}`).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke',stroke.color);line.setAttribute('stroke-width',stroke.width);line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');svg.append(line);}}
 function erase(p){const px=[p[0]*768,p[1]*1024];paths=paths.filter(stroke=>{const ps=stroke.points.map(v=>[v[0]*768,v[1]*1024]);return !ps.some((v,i)=>distanceToSegment(px,ps[Math.max(0,i-1)],v)<18+stroke.width);});}
 function finish(cancel=false){if(!active)return;if(cancel){paths=before;draw();}else if(JSON.stringify(paths)!==JSON.stringify(before)){history.push(before);if(history.length>25)history.shift();onChange(copy(paths));}active=null;before=null;}
 surface.addEventListener('pointerdown',e=>{
  if(active?.type==='pen'&&e.pointerType==='touch')return;
  touches.add(e.pointerId);if(touches.size>1){finish(true);return;}
  if(!enabled()||(e.button>0&&e.button!==5)||e.isPrimary===false)return;
  e.preventDefault();e.stopPropagation();before=copy(paths);active={id:e.pointerId,type:e.pointerType,eraser:mode()==='eraser'||e.button===5};surface.setPointerCapture(e.pointerId);
  if(active.eraser)erase(point(e));else{if(paths.length>=400){active=null;before=null;return;}paths.push({color:color(),width:width(),points:[point(e),point(e)]});}draw();
 });
 surface.addEventListener('pointermove',e=>{if(!active||e.pointerId!==active.id)return;e.preventDefault();e.stopPropagation();if(active.eraser)erase(point(e));else{const stroke=paths[paths.length-1];for(const sample of (e.getCoalescedEvents?.()||[]).concat(e)){if(stroke.points.length>=2500)break;const p=point(sample),last=stroke.points[stroke.points.length-1];if(Math.hypot(p[0]-last[0],p[1]-last[1])>.0006)stroke.points.push(p);}}draw();});
 surface.addEventListener('pointerup',e=>{touches.delete(e.pointerId);if(active?.id===e.pointerId){e.preventDefault();e.stopPropagation();finish();}});
 surface.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);if(active?.id===e.pointerId)finish(true);});
 surface.addEventListener('lostpointercapture',e=>{touches.delete(e.pointerId);if(active?.id===e.pointerId)finish(true);});
 return {set(value){finish(true);paths=copy(value||[]);history=[];draw();},get(){return copy(paths);},undo(){if(active||!history.length)return;paths=history.pop();draw();onChange(copy(paths));},clear(){if(!paths.length)return;history.push(copy(paths));paths=[];draw();onChange([]);},cancel(){finish(true);}};
}
module.exports={attachInk,distanceToSegment};
