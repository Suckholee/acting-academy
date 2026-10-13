// Let filtered lists resize smoothly instead of snapping or leaving a large empty space.
(() => {
 const pairs=[['.filters','.course-grid'],['.faculty-filters','.faculty-grid'],['.reviews-filters','.reviews-grid'],['.works-filters','.works-grid']];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 for(const [controlsSelector,gridSelector] of pairs){
  const controls=document.querySelector(controlsSelector),grid=document.querySelector(gridSelector);
  if(!controls||!grid)continue;
  let animation,frame;
  controls.addEventListener('click',()=>{
   const before=grid.getBoundingClientRect().height;
   animation?.cancel();cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    const after=grid.getBoundingClientRect().height;
    if(reduced.matches||Math.abs(before-after)<1)return;
    animation=grid.animate([{height:before+'px',overflow:'hidden'},{height:after+'px',overflow:'hidden'}],{duration:240,easing:'cubic-bezier(.22,1,.36,1)'});
   });
  },true);
 }
})();
