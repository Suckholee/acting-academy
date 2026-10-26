(() => {
  const key = 'kjt-respect-for-acting-20261107-final-hidden';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  try { if (localStorage.getItem(key) === today()) return; } catch {}
  if (new URLSearchParams(location.search).has('admin') || new URLSearchParams(location.search).get('chat') === '1') return;
  const base = '/assets/events/kim-jung-tae-20261107-final/';
  const posters = [
    { file: 'poster.webp', label: '특강 포스터 1', width: 941, height: 1672, sourceHeight: 1672, offset: 0, alt: 'The Road to Actor 김정태 연기 무료특강. 연기자로서의 삶, 배우가 되는 길, 오디션과 캐스팅. 2026년 11월 7일 토요일 오후 2시, 60분. 선착순 40명. 마곡역 로뎀타워 306호. 문의 02-2666-4528.' },
    { file: 'poster-capture.png', label: '특강 포스터 2', width: 960, height: 1330, sourceHeight: 2079, offset: 375, alt: '두 얼굴! 하나의 배우. The Road to Actor 김정태 연기 무료특강. 2026년 11월 7일 토요일 오후 2시, 60분. 선착순 40명.' }
  ];
  const dialog = document.createElement('dialog');
  dialog.className = 'academy-event-popup';
  dialog.setAttribute('aria-label', '김정태 원장 무료특강, 선착순 40명 안내');
  dialog.innerHTML = `<div class="event-popup-header"><span>김정태 원장 무료특강 · 선착순 40명</span><button type="button" data-close aria-label="팝업 닫기">✕</button></div><div class="event-popup-tabs" aria-label="특강 이미지 선택">${posters.map((p, i) => `<button type="button" data-poster="${i}" aria-pressed="${i === 0}">${p.label}</button>`).join('')}</div><div class="event-popup-image"><div class="event-poster-frame"><img fetchpriority="high" decoding="async" width="941" height="1672" src="${base + posters[0].file}" alt="${posters[0].alt}"></div></div><div class="event-popup-apply"><a href="/events/kim-jung-tae-20261107">무료특강 신청하기 <span aria-hidden="true">→</span></a></div><div class="event-popup-footer"><button type="button" data-hide>오늘 하루 보지 않기</button><button type="button" data-close>닫기</button></div>`;
  document.body.append(dialog);
  // Fetch the other poster after the first has finished, so switching is instant.
  dialog.querySelector('img').addEventListener('load', () => {
    const next = new Image();
    next.decoding = 'async';
    next.fetchPriority = 'low';
    next.src = base + posters[1].file;
  }, { once: true });
  // Use the visible viewport as well as CSS sizing (mobile zoom and browser bars).
  const viewport = window.visualViewport;
  let currentPoster = posters[0];
  const fitPoster = () => {
    const area = dialog.querySelector('.event-popup-image');
    const frame = dialog.querySelector('.event-poster-frame');
    const img = frame.querySelector('img');
    const width = Math.min(area.clientWidth, area.clientHeight * currentPoster.width / currentPoster.height);
    frame.style.width = width + 'px';
    frame.style.height = width * currentPoster.height / currentPoster.width + 'px';
    img.style.height = (currentPoster.sourceHeight / currentPoster.height * 100) + '%';
    img.style.top = (-currentPoster.offset / currentPoster.height * 100) + '%';
  };
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
    fitPoster();
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
    img.width = poster.width;
    img.height = poster.sourceHeight;
    currentPoster = poster;
    fitPoster();
    dialog.querySelectorAll('[data-poster]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    dialog.querySelector('.event-popup-image').scrollTop = 0;
  }));
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { window.removeEventListener('resize', fitViewport); viewport?.removeEventListener('resize', fitViewport); viewport?.removeEventListener('scroll', fitViewport); document.body.style.overflow = oldOverflow; priorFocus?.focus(); dialog.remove(); });
  dialog.showModal();
  fitPoster();
  document.body.style.overflow = 'hidden';
})();
