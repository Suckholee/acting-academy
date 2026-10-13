(() => {
 const header=document.querySelector('body>header');
 const nav=header?.querySelector('nav');
 if(!header||!nav)return;
 const consultation=document.createElement('a');
 consultation.href='/?consult=basic';consultation.textContent='상담 신청 ↗';consultation.className='mobile-menu-consult';nav.append(consultation);
 const button=document.createElement('button');
 button.type='button';button.className='mobile-menu-button';
 button.textContent='☰';button.setAttribute('aria-label','메뉴 열기');button.setAttribute('aria-expanded','false');
 if(!nav.id)nav.id='mobile-navigation';
 button.setAttribute('aria-controls',nav.id);header.append(button);
 const close=()=>{header.classList.remove('mobile-menu-open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','메뉴 열기');button.textContent='☰';};
 button.addEventListener('click',()=>{
  const open=header.classList.toggle('mobile-menu-open');
  button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');button.textContent=open?'×':'☰';
 });
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('mobile-menu-open')){close();button.focus();}});
 document.addEventListener('click',event=>{if(!header.contains(event.target))close();});
 matchMedia('(max-width:850px)').addEventListener('change',close);
})();
