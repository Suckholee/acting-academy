const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const cards=[...document.querySelectorAll('.faculty-card')];
const filters=[...document.querySelectorAll('[data-filter]')];
function filterFaculty(category,updateHistory=false){
 const selected=filters.some(b=>b.dataset.filter===category)?category:'all';
 filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===selected)));
 let visible=0;cards.forEach(card=>{card.hidden=selected!=='all'&&card.dataset.category!==selected;card.classList.remove('is-entering');if(!card.hidden){card.style.setProperty('--card-delay',`${visible*90}ms`);visible++;}});
 requestAnimationFrame(()=>cards.filter(c=>!c.hidden).forEach(c=>c.classList.add('is-entering')));
 document.querySelector('.faculty-count').textContent=`${String(visible).padStart(2,'0')} ${visible===1?'COACH':'COACHES'}`;
 if(updateHistory){const url=new URL(location.href);if(selected==='all')url.searchParams.delete('category');else url.searchParams.set('category',selected);history.pushState(null,'',url);}
}
if(filters.length){filters.forEach(b=>b.addEventListener('click',()=>filterFaculty(b.dataset.filter,true)));const restore=()=>filterFaculty(new URLSearchParams(location.search).get('category')||'all');addEventListener('popstate',restore);restore();}
if('IntersectionObserver' in window){document.body.classList.add('faculty-motion');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.08});document.querySelectorAll('.faculty-reveal').forEach(el=>observer.observe(el));}
// Profile thumbnails switch preloaded images so rapid selections stay in order.
document.querySelectorAll('[data-profile-gallery]').forEach(gallery=>{
 const slides=[...gallery.querySelectorAll('.profile-photo-slide')];
 const buttons=[...gallery.querySelectorAll('[data-photo-index]')];
 let current=0;
 let timer;
 let hovered=false;
 let visible=false;
 const select=index=>{
  current=index;
  slides.forEach((slide,i)=>{slide.classList.toggle('is-active',i===index);slide.setAttribute('aria-hidden',String(i!==index));});
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
 };
 buttons.forEach((button,index)=>{
  button.addEventListener('click',()=>{select(index);restart();});
  button.addEventListener('keydown',event=>{
   let next;
   if(event.key==='ArrowRight')next=(index+1)%buttons.length;
   if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;
   if(event.key==='Home')next=0;
   if(event.key==='End')next=buttons.length-1;
   if(next!==undefined){event.preventDefault();select(next);buttons[next].focus();}
  });
 });
 const stop=()=>clearInterval(timer);
 const restart=()=>{
  stop();
  if(slides.length<2||hovered||!visible||document.hidden||reducedMotion.matches||gallery.contains(document.activeElement))return;
  timer=setInterval(()=>select((current+1)%slides.length),3000);
 };
 gallery.addEventListener('mouseenter',()=>{hovered=true;stop();});
 gallery.addEventListener('mouseleave',()=>{hovered=false;restart();});
 gallery.addEventListener('focusin',stop);
 gallery.addEventListener('focusout',()=>setTimeout(restart,0));
 document.addEventListener('visibilitychange',restart);
 reducedMotion.addEventListener('change',restart);
 if('IntersectionObserver' in window){
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;restart();},{threshold:.3}).observe(gallery);
 }else{visible=true;restart();}
});
// Switch work categories within the same profile panel.
document.querySelectorAll('[data-work-browser]').forEach(browser=>{
 const tabs=[...browser.querySelectorAll('[role="tab"]')];
 const panels=[...browser.querySelectorAll('.work-panel')];
 const dialog=document.createElement('dialog');
 dialog.className='work-full-dialog';
 dialog.setAttribute('aria-label','전체 작품활동');
 dialog.innerHTML='<div class="work-dialog-heading"><h2>전체 작품활동</h2><button type="button" aria-label="전체 작품활동 닫기">닫기 ×</button></div><div class="work-dialog-content"></div>';
 document.body.append(dialog);
 dialog.querySelector('button').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>restart());
 const measure=()=>panels.forEach(panel=>{
  if(panel.hidden)return;
  const viewport=panel.querySelector('.work-panel-viewport');
  const more=panel.querySelector('.work-more');
  if(!viewport||!more)return;
  more.hidden=viewport.scrollHeight<=viewport.clientHeight+2;
 });
 panels.forEach(panel=>{
  const more=panel.querySelector('.work-more');
  more?.addEventListener('click',()=>{
   stop();
   dialog.querySelector('h2').textContent=tabs.find(t=>t.getAttribute('aria-controls')===panel.id).textContent+' · 전체 작품활동';
   dialog.querySelector('.work-dialog-content').replaceChildren(panel.querySelector('.work-panel-content').cloneNode(true));
   dialog.showModal();
  });
 });
 new ResizeObserver(measure).observe(browser);

 let current=0;
 let rotation;
 let visible=false;
 const select=index=>{
  current=index;
  tabs.forEach((tab,i)=>{
   tab.setAttribute('aria-selected',String(i===index));
   tab.tabIndex=i===index?0:-1;
   document.getElementById(tab.getAttribute('aria-controls')).hidden=i!==index;
  });
  requestAnimationFrame(measure);
 };
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>{select(index);restart();});
  tab.addEventListener('keydown',event=>{
   let next;
   if(event.key==='ArrowRight')next=(index+1)%tabs.length;
   if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
   if(event.key==='Home')next=0;
   if(event.key==='End')next=tabs.length-1;
   if(next!==undefined){event.preventDefault();select(next);tabs[next].focus();}
  });
 });
 const stop=()=>clearInterval(rotation);
 const restart=()=>{
  stop();
  if(!visible||document.hidden||dialog.open||reducedMotion.matches||browser.querySelector(':focus-visible'))return;
  rotation=setInterval(()=>select((current+1)%tabs.length),3000);
 };
 browser.addEventListener('focusin',restart);
 browser.addEventListener('focusout',()=>setTimeout(restart,0));
 document.addEventListener('visibilitychange',restart);
 reducedMotion.addEventListener('change',restart);
 if('IntersectionObserver' in window){
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;restart();},{threshold:0}).observe(browser.querySelector('.work-category-tabs'));
 }else{visible=true;restart();}
});
document.querySelectorAll('.career-more').forEach(button=>{
 const preview=button.parentElement.querySelector('.career-full-source');
 const dialog=document.createElement('dialog');
 dialog.className='work-full-dialog';dialog.setAttribute('aria-label','전체 학력 및 경력');
 dialog.innerHTML='<div class="work-dialog-heading"><h2>학력 · 경력</h2><button type="button" aria-label="전체 학력 및 경력 닫기">닫기 ×</button></div><div class="work-dialog-content"></div>';
 dialog.querySelector('.work-dialog-content').append(preview.cloneNode(true));
 const full=dialog.querySelector('.career-full-source');
 full.hidden=false;full.classList.remove('career-full-source');
 document.body.append(dialog);
 dialog.querySelector('button').addEventListener('click',()=>dialog.close());
 button.addEventListener('click',()=>dialog.showModal());
});
