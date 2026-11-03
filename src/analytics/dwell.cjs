const {SECTIONS}=require('./sections.cjs');
const valid=new Set(SECTIONS.map(section=>section.id));

function createDwellClock({send,now=()=>performance.now()}) {
  const seen=new Set(),elapsed=new Map();let previous=null,eligible=false,last=now();
  function emit(name,section){try{send(name,{section});}catch{}}
  function drain(section,remainder=false){
    let milliseconds=elapsed.get(section)||0;
    for(const seconds of remainder?[10,5,1]:[10])while(milliseconds>=seconds*1000){emit('section_time_'+seconds+'s',section);milliseconds-=seconds*1000;}
    elapsed.set(section,milliseconds);
  }
  return {
    sample(section,active){
      const at=now();
      if(previous&&eligible){elapsed.set(previous,(elapsed.get(previous)||0)+Math.max(0,Math.min(2000,at-last)));drain(previous);}
      if(previous&&(previous!==section||!active))drain(previous,true);
      previous=valid.has(section)?section:null;eligible=Boolean(active&&previous);last=at;
      if(eligible&&!seen.has(previous)){seen.add(previous);emit('section_seen',previous);}
    },
    flush(){for(const section of elapsed.keys())drain(section,true);},
  };
}

function startDwellTracking(send,{doc=document,win=window,now=()=>performance.now()}={}) {
  if(typeof doc.querySelector!=='function'||typeof win.addEventListener!=='function')return()=>{};
  const sections=SECTIONS.filter(section=>!section.overlay&&!section.fallback).map(section=>({...section,node:doc.querySelector(section.selector)})).filter(section=>section.node);
  const fallback=SECTIONS.find(section=>section.fallback),fallbackNode=doc.querySelector(fallback.selector)||doc.body;
  const clock=createDwellClock({send,now});let lastActivity=now();
  const activity=()=>{lastActivity=now();};
  function tick(){
    if(doc.hidden){clock.sample(null,false);clock.flush();return;}
    const overlays=Array.from(doc.querySelectorAll('dialog[open], [aria-modal="true"]'));
    const visibleOverlays=overlays.filter(node=>!node.hidden&&node.getClientRects().length);
    if(visibleOverlays.length){
      // The announcement dialog is created after this tracker starts. Resolve it
      // here and count only that foreground surface, never the page behind it.
      const popup=doc.querySelector('dialog.academy-event-popup[open]');
      const onlyAnnouncement=visibleOverlays.every(node=>node===popup);
      clock.sample(onlyAnnouncement?'event_popup':null,onlyAnnouncement&&now()-lastActivity<60000);return;
    }
    const height=win.innerHeight,header=doc.querySelector('body > header'),top=Math.max(0,Math.min(150,header?.getBoundingClientRect().bottom||0));
    let best=null,maximum=0;
    for(const section of sections){const rect=section.node.getBoundingClientRect();const visible=Math.max(0,Math.min(rect.bottom,height)-Math.max(rect.top,top));if(rect.width>0&&visible>maximum){best=section;maximum=visible;}}
    if(maximum<Math.min(100,(height-top)*.25)&&fallbackNode){
      const rect=fallbackNode.getBoundingClientRect(),visible=Math.max(0,Math.min(rect.bottom,height)-Math.max(rect.top,top));
      if(rect.width>0&&visible>maximum){best={...fallback,node:fallbackNode};maximum=visible;}
    }
    const meaningful=maximum>=Math.min(100,(height-top)*.25);
    const video=best?.id==='intro_video'?best.node.querySelector('video'):null;
    const active=meaningful&&(now()-lastActivity<60000||video&&!video.paused&&!video.ended);
    clock.sample(best?.id||null,active);
  }
  const stop=()=>{clock.sample(null,false);clock.flush();};
  const focus=()=>{activity();tick();};
  const visibility=()=>{if(doc.hidden)stop();else focus();};
  const events=['pointerdown','keydown','touchstart','wheel','scroll'];
  for(const event of events)win.addEventListener(event,activity,{passive:true});
  win.addEventListener('focus',focus);win.addEventListener('pagehide',stop);
  doc.addEventListener('visibilitychange',visibility);
  const timer=win.setInterval(tick,1000);
  return()=>{stop();win.clearInterval(timer);for(const event of events)win.removeEventListener(event,activity);win.removeEventListener('focus',focus);win.removeEventListener('pagehide',stop);doc.removeEventListener('visibilitychange',visibility);};
}
module.exports={createDwellClock,startDwellTracking};
