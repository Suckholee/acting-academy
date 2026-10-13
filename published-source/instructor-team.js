(() => {
 const section=document.querySelector('.instructor-team');if(!section)return;
 const rail=section.querySelector('.portrait-grid');
 if(!rail.querySelector('.portrait-copy'))[...rail.children].forEach(card=>{const copy=card.cloneNode(true);copy.classList.add('portrait-copy');copy.setAttribute('aria-hidden','true');rail.append(copy)});
 rail.querySelectorAll('.portrait-copy a').forEach(a=>a.tabIndex=-1);
 const button=section.querySelector('[data-team-motion]');
 button.addEventListener('click',()=>{const paused=section.classList.toggle('team-paused');button.setAttribute('aria-pressed',String(paused));button.textContent=paused?'모션 다시 재생 ▷':'모션 일시정지 Ⅱ'});
})();
