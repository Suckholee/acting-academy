const courses={"camera":{"title":"카메라 연기 (성인·시니어)","label":"ON CAMERA","intro":"성인·시니어를 위한 카메라 연기 과정입니다.","steps":["세부 커리큘럼과 반별 수업 일정은 추후 안내합니다. 상담 시 관심 있는 반을 말씀해주세요."]},"stage":{"title":"무대 연기 (성인·시니어)","label":"ON STAGE","intro":"성인·시니어를 위한 무대 연기 과정입니다.","steps":["세부 커리큘럼과 반별 수업 일정은 추후 안내합니다. 상담 시 관심 있는 반을 말씀해주세요."]},"speech":{"title":"스피치","label":"SPEECH","intro":"말로 나를 표현하는 스피치 과정입니다.","steps":["세부 커리큘럼과 반별 수업 일정은 추후 안내합니다. 상담 시 관심 있는 반을 말씀해주세요."]},"audition-prep":{"title":"오디션 트레이닝","label":"AUDITION TRAINING","intro":"오디션 준비를 위한 트레이닝 과정입니다.","steps":["세부 커리큘럼과 반별 수업 일정은 추후 안내합니다. 상담 시 관심 있는 반을 말씀해주세요."]},"senior-model":{"title":"시니어 모델 트레이닝","label":"SENIOR MODEL","intro":"시니어를 위한 모델 트레이닝 과정입니다.","steps":["세부 커리큘럼과 반별 수업 일정은 추후 안내합니다. 상담 시 관심 있는 반을 말씀해주세요."]},"hobby":{"title":"취미반 (뮤지컬·연기·보컬)","label":"MUSICAL · ACTING · VOCAL","intro":"뮤지컬·연기·보컬을 취미로 배우는 과정입니다.","steps":["세부 커리큘럼과 반별 수업 일정은 추후 안내합니다. 상담 시 관심 있는 반을 말씀해주세요."]}};
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('nav');menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open);menu.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');menu.textContent=open?'×':'☰'});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','메뉴 열기');menu.textContent='☰'}));
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button)});document.querySelectorAll('.course').forEach(card=>card.hidden=button.dataset.filter!=='all'&&card.dataset.category!==button.dataset.filter)}));
document.querySelectorAll('[data-recommend]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-recommend]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',b===button)});const key=button.dataset.recommend;document.querySelector('#recommend-title').textContent=courses[key].title;document.querySelector('#recommend-copy').textContent=courses[key].intro;document.querySelector('#recommend-button').dataset.course=key}));
const dialog=document.querySelector('dialog');let returnFocus;document.querySelectorAll('[data-course]').forEach(button=>button.addEventListener('click',()=>{const course=courses[button.dataset.course];returnFocus=button;document.querySelector('#dialog-title').textContent=course.title;document.querySelector('#dialog-label').textContent=course.label;document.querySelector('#dialog-intro').textContent=course.intro;document.querySelector('#dialog-curriculum').replaceChildren(...course.steps.map(step=>{const li=document.createElement('li');li.textContent=step;return li}));dialog.showModal();document.body.style.overflow='hidden'}));document.querySelectorAll('.close-dialog,.close-bottom').forEach(b=>b.addEventListener('click',()=>dialog.close()));dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});dialog.addEventListener('close',()=>{document.body.style.overflow='';returnFocus?.focus()});

// Motion progressively enhances visible HTML; system reduced-motion always wins.
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const rail=document.querySelector('.portrait-grid');
[...(rail?.children || [])].forEach(card=>{const copy=card.cloneNode(true);copy.classList.add('portrait-copy');copy.setAttribute('aria-hidden','true');rail.append(copy)});
const reveals=document.querySelectorAll('.section h2,.section .eyebrow,.intro-copy,.about-photo,.course,.method-image,.method-content,.step,.actors-heading,.finder-box,.faq-list,.closing');
const homeRevealObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');homeRevealObserver.unobserve(entry.target)}})},{threshold:.12,rootMargin:'0px 0px -24px 0px'});
reveals.forEach(el=>{el.classList.add('reveal');if(el.classList.contains('course')||el.classList.contains('step'))el.style.setProperty('--reveal-delay',`${[...el.parentElement.children].indexOf(el)*100}ms`);homeRevealObserver.observe(el)});
document.body.classList.add('motion-ready');
const actorSection=document.querySelector('.actors-section'),dock=document.querySelector('.sticky-inquiry'),finder=document.querySelector('#find');
if(actorSection)new IntersectionObserver(entries=>{entries.forEach(entry=>entry.target.classList.toggle('in-view',entry.isIntersecting))},{threshold:0}).observe(actorSection);
if(dock&&finder)new IntersectionObserver(entries=>{dock.classList.toggle('near-finder',entries[0].isIntersecting)},{threshold:.1}).observe(finder);
let manualPause=false,frameQueued=false;
const motionButton=document.querySelector('.motion-toggle');
function updateMotionPreference(){document.body.classList.toggle('motion-paused',manualPause||reducedMotion.matches);if(motionButton){motionButton.setAttribute('aria-pressed',String(manualPause));motionButton.textContent=manualPause?'모션 다시 재생 ▷':'모션 일시정지 Ⅱ';}scheduleFrame()}
motionButton?.addEventListener('click',()=>{manualPause=!manualPause;updateMotionPreference()});reducedMotion.addEventListener('change',updateMotionPreference);
const progress=document.querySelector('.reading-progress'),hero=document.querySelector('.hero'),heroPhoto=document.querySelector('.hero-img');
const scrollPhotos=[...document.querySelectorAll('.about-photo,.method-image')];
function renderScroll(){frameQueued=false;const y=scrollY,h=innerHeight,max=document.documentElement.scrollHeight-h;if(progress)progress.style.transform=`scaleX(${max>0?y/max:0})`;if(reducedMotion.matches||manualPause)return;const hr=hero?.getBoundingClientRect();if(hr&&heroPhoto&&hr.bottom>0&&hr.top<h)heroPhoto.style.transform=`translate3d(0,${Math.min(y*.16,95)}px,0) scale(1.06)`;scrollPhotos.forEach(box=>{const r=box.getBoundingClientRect();if(r.top<h&&r.bottom>0){const phase=(h/2-(r.top+r.height/2))/(h+r.height);box.querySelector('img').style.transform=`translate3d(0,${-5+phase*12}%,0)`}});const ar=actorSection?.getBoundingClientRect();const actorWord=document.querySelector('.actors-word');if(actorWord&&ar&&ar.top<h&&ar.bottom>0)actorWord.style.transform=`translate3d(${(h/2-ar.top)*-.055}px,0,0)`}
function scheduleFrame(){if(!frameQueued){frameQueued=true;requestAnimationFrame(renderScroll)}}
addEventListener('scroll',scheduleFrame,{passive:true});addEventListener('resize',scheduleFrame,{passive:true});addEventListener('load',scheduleFrame);updateMotionPreference();
// Reserve the tallest option at the current width so selection never moves the CTA.
const recommendTitle=document.querySelector('#recommend-title'),recommendCopy=document.querySelector('#recommend-copy'),recommendResult=document.querySelector('.recommend');
function sizeRecommendation(){
 if(!recommendResult)return;
 for(const [node,field] of [[recommendTitle,'title'],[recommendCopy,'intro']]){
  const probe=node.cloneNode(false);probe.removeAttribute('id');probe.removeAttribute('aria-live');probe.setAttribute('aria-hidden','true');
  Object.assign(probe.style,{position:'absolute',visibility:'hidden',pointerEvents:'none',width:node.getBoundingClientRect().width+'px',minHeight:'0',height:'auto',animation:'none'});
  node.parentNode.append(probe);let height=0;
  for(const course of Object.values(courses)){probe.textContent=course[field];height=Math.max(height,probe.getBoundingClientRect().height);}
  probe.remove();node.style.minHeight=Math.ceil(height)+'px';
 }
}
if(recommendResult){
 sizeRecommendation();document.fonts?.ready.then(sizeRecommendation);
 let lastWidth=0;new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(Math.abs(width-lastWidth)>.5){lastWidth=width;sizeRecommendation();}}).observe(recommendResult);
 document.querySelectorAll('[data-recommend]').forEach(button=>button.addEventListener('click',()=>{
  if(reducedMotion.matches)return;
  for(const node of [recommendTitle,recommendCopy]){node.getAnimations().forEach(animation=>animation.cancel());node.animate([{opacity:.35},{opacity:1}],{duration:180,easing:'ease-out'});}
 }));
}
heroPhoto?.addEventListener('animationend',event=>{if(event.animationName==='hero-focus'){heroPhoto.style.animation='none';scheduleFrame()}});
