(() => {
  const key = 'kjt-respect-for-acting-20261024-hidden';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  try { if (localStorage.getItem(key) === today()) return; } catch {}
  if (new URLSearchParams(location.search).has('admin')) return;
  const base = '/assets/events/respect-for-acting-20261024/';
  const posters = [
    { file: 'poster.png', label: '특강 포스터', alt: 'RESPECT FOR ACTING 김정태 원장 특강. 10월 24일 오후 1시, 마곡역 4번 출구 로뎀타워 306호. 문의 02-2666-4528.' },
    { file: 'announcement.png', label: '특별강연 안내', alt: '연기를 향한 존중, 배우로 살아간다는 것. 김정태 배우아카데미 원장 특별강연 안내.' }
  ];
  const dialog = document.createElement('dialog');
  dialog.className = 'academy-event-popup';
  dialog.setAttribute('aria-label', '김정태 원장 특별강연 안내');
  dialog.innerHTML = `<div class="event-popup-header"><span>김정태 원장 특별강연</span><button type="button" data-close aria-label="팝업 닫기">✕</button></div><div class="event-popup-tabs" aria-label="특강 이미지 선택">${posters.map((p, i) => `<button type="button" data-poster="${i}" aria-pressed="${i === 0}">${p.label}</button>`).join('')}</div><div class="event-popup-image"><img width="941" height="1672" src="${base + posters[0].file}" alt="${posters[0].alt}"></div><div class="event-popup-footer"><button type="button" data-hide>오늘 하루 보지 않기</button><button type="button" data-close>닫기</button></div>`;
  document.body.append(dialog);
  // Use the visible viewport as well as CSS sizing (mobile zoom and browser bars).
  const viewport = window.visualViewport;
  const fitViewport = () => {
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const gap = width <= 600 ? 8 : 12;
    const popupWidth = Math.min(760, Math.max(0, width - gap * 2));
    const popupHeight = Math.min(920, Math.max(0, height - gap * 2));
    Object.assign(dialog.style, {
      width: popupWidth + 'px', height: popupHeight + 'px',
      maxWidth: popupWidth + 'px', maxHeight: popupHeight + 'px',
      left: ((viewport?.offsetLeft || 0) + (width - popupWidth) / 2) + 'px',
      top: ((viewport?.offsetTop || 0) + (height - popupHeight) / 2) + 'px',
      right: 'auto', bottom: 'auto', margin: '0'
    });
  };
  fitViewport();
  window.addEventListener('resize', fitViewport);
  viewport?.addEventListener('resize', fitViewport);
  viewport?.addEventListener('scroll', fitViewport);
  const priorFocus = document.activeElement;
  const oldOverflow = document.body.style.overflow;
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.querySelector('[data-hide]').addEventListener('click', () => {
    try { localStorage.setItem(key, today()); } catch {}
    dialog.close();
  });
  dialog.querySelectorAll('[data-poster]').forEach(button => button.addEventListener('click', () => {
    const poster = posters[Number(button.dataset.poster)];
    const img = dialog.querySelector('img');
    img.src = base + poster.file; img.alt = poster.alt;
    img.width = poster.file === 'poster.png' ? 941 : 1278;
    img.height = poster.file === 'poster.png' ? 1672 : 1230;
    dialog.querySelectorAll('[data-poster]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    dialog.querySelector('.event-popup-image').scrollTop = 0;
  }));
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { window.removeEventListener('resize', fitViewport); viewport?.removeEventListener('resize', fitViewport); viewport?.removeEventListener('scroll', fitViewport); document.body.style.overflow = oldOverflow; priorFocus?.focus(); dialog.remove(); });
  dialog.showModal();
  document.body.style.overflow = 'hidden';
})();
