(() => {
 const section=document.querySelector('.video-orbit');if(!section)return;
 const track=section.querySelector('.video-orbit-track'),cards=[...track.querySelectorAll('.video-orbit-card')],counter=section.querySelector('.video-orbit-current');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');let current=0,queued=false;
 const paint=()=>{queued=false;const center=track.scrollLeft+track.clientWidth/2;let nearest=0,distance=Infinity;
  cards.forEach((card,i)=>{const delta=(card.offsetLeft+card.offsetWidth/2-center)/card.offsetWidth;const d=Math.abs(delta);if(d<distance){distance=d;nearest=i;}card.style.setProperty('--orbit-turn',Math.max(-1,Math.min(1,delta))*-18+'deg');card.style.setProperty('--orbit-scale',1-Math.min(d,1)*.14);card.style.setProperty('--orbit-opacity',1-Math.min(d,1)*.38);});
  current=nearest;counter.textContent=String(current+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');
 };
 const update=()=>{if(!queued){queued=true;requestAnimationFrame(paint);}};
 const go=index=>{const next=(index+cards.length)%cards.length;track.scrollTo({left:cards[next].offsetLeft+cards[next].offsetWidth/2-track.clientWidth/2,behavior:reduced.matches?'instant':'smooth'});};
 section.querySelector('[data-orbit-prev]').addEventListener('click',()=>go(current-1));section.querySelector('[data-orbit-next]').addEventListener('click',()=>go(current+1));
 track.addEventListener('scroll',update,{passive:true});track.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(current+(e.key==='ArrowRight'?1:-1));}});
 cards.forEach((card,i)=>card.addEventListener('click',()=>go(i)));
 let drag;track.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag={x:e.clientX,left:track.scrollLeft};track.setPointerCapture(e.pointerId);track.classList.add('is-dragging');});
 track.addEventListener('pointermove',e=>{if(drag)track.scrollLeft=drag.left+drag.x-e.clientX;});
 const end=()=>{if(!drag)return;drag=null;track.classList.remove('is-dragging');go(current);};track.addEventListener('pointerup',end);track.addEventListener('pointercancel',end);
 new ResizeObserver(update).observe(track);document.fonts?.ready.then(update);update();
})();
