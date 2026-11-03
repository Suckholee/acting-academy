function openAnnouncement() {
  const key = 'kjt-free-lecture-20261104-hidden';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const requestedPopup = location.hash === '#announcement';
  const home = ['/', '/index', '/index.html'].includes(location.pathname);
  if ((!requestedPopup && (!home || location.hash)) || document.querySelector('#announcement')) return;
  try { if (!requestedPopup && localStorage.getItem(key) === today()) return; } catch {}
  if (new URLSearchParams(location.search).has('admin') || new URLSearchParams(location.search).get('chat') === '1') return;
  const base = '/assets/events/kim-jung-tae-20261107-final/';
  const posters = [
    { src: base + 'free-lecture-20261104.png', label: '특강 포스터 3', title: '김정태 원장 무료특강', href: '/events/kim-jung-tae-20261107', action: '무료특강 신청하기', width: 1080, height: 1080, sourceHeight: 1080, offset: 0, alt: '김정태 연기 무료특강 안내 포스터' },
    { src: '/assets/events/november-2026/meta-poster-3.webp', label: '11월 개강', title: '11월 첫 개강 · 1기 수강생 모집', href: '/apply', action: '수강 · 상담 신청하기', width: 1600, height: 2215, sourceHeight: 2215, offset: 0, alt: '김정태배우아카데미 11월 첫 개강, 1기 수강생 모집. 2026년 11월 9일 월요일 개강. 11월 1기 특별 등록 혜택: 첫 시작 수강료 40만 원에서 35만 원, 3개월 수강 시 30만 원 상당의 프로필 촬영 증정. 카메라·무대연기 기초반과 심화반, 프리미엄반, 오디션 트레이닝반, 취미반. 문의 02-2666-4528, 010-9942-4528. 서울시 강서구 마곡동 799-1 로뎀타워 306·307호, 마곡역 4번 출구 도보 1분.' },
    { src: base + 'poster.webp', label: '특강 포스터 1', title: '김정태 원장 무료특강 · 선착순 40명', href: '/events/kim-jung-tae-20261107', action: '무료특강 신청하기', width: 941, height: 1672, sourceHeight: 1672, offset: 0, alt: 'The Road to Actor 김정태 연기 무료특강. 연기자로서의 삶, 배우가 되는 길, 오디션과 캐스팅. 2026년 11월 7일 토요일 오후 2시, 60분. 선착순 40명. 마곡역 로뎀타워 306호. 문의 02-2666-4528.' },
    { src: base + 'poster-capture.png', label: '특강 포스터 2', title: '김정태 원장 무료특강 · 선착순 40명', href: '/events/kim-jung-tae-20261107', action: '무료특강 신청하기', width: 960, height: 1330, sourceHeight: 2079, offset: 375, alt: '두 얼굴! 하나의 배우. The Road to Actor 김정태 연기 무료특강. 2026년 11월 7일 토요일 오후 2시, 60분. 선착순 40명.' }
  ];
  const dialog = document.createElement('dialog');
  dialog.id = 'announcement';
  dialog.className = 'academy-event-popup';
  dialog.setAttribute('aria-label', posters[0].title);
  dialog.innerHTML = `<div class="event-popup-header"><span>${posters[0].title}</span><button type="button" data-close aria-label="팝업 닫기">✕</button></div><div class="event-popup-tabs" aria-label="안내 포스터 선택">${posters.map((p, i) => `<button type="button" data-poster="${i}" aria-pressed="${i === 0}">${p.label}</button>`).join('')}</div><div class="event-popup-image"><div class="event-poster-frame"><img fetchpriority="high" decoding="async" width="${posters[0].width}" height="${posters[0].sourceHeight}" src="${posters[0].src}" alt="${posters[0].alt}"></div></div><div class="event-popup-apply"><a href="${posters[0].href}">${posters[0].action} <span aria-hidden="true">→</span></a></div><div class="event-popup-footer"><button type="button" data-hide>오늘 하루 보지 않기</button><button type="button" data-close>닫기</button></div>`;
  document.body.append(dialog);
  // Fetch the other poster after the first has finished, so switching is instant.
  dialog.querySelector('img').addEventListener('load', () => {
    for (const poster of posters.slice(1)) {
      const next = new Image();
      next.decoding = 'async';
      next.fetchPriority = 'low';
      next.src = poster.src;
    }
  }, { once: true });
  // Use the visible viewport as well as CSS sizing (mobile zoom and browser bars).
  const viewport = window.visualViewport;
  let currentPoster = posters[0];
  const posterFrame = dialog.querySelector('.event-poster-frame');
  posterFrame.tabIndex = 0;
  posterFrame.setAttribute('role', 'button');
  posterFrame.setAttribute('aria-label', '포스터 확대해서 보기');
  posterFrame.title = '누르면 확대해서 볼 수 있습니다';
  let imageViewer;
  const enlargePoster = () => {
    if (imageViewer) return;
    const viewer = document.createElement('dialog');
    imageViewer = viewer;
    viewer.className = 'event-image-viewer';
    viewer.setAttribute('aria-label', currentPoster.title + ' 확대 보기');
    viewer.innerHTML = '<div class="event-image-toolbar"><span>스크롤하여 자세히 보세요</span><button type="button" aria-label="확대 보기 닫기">닫기 ✕</button></div><div class="event-image-scroll"><img></div>';
    const image = viewer.querySelector('img');
    image.src = currentPoster.src;
    image.alt = currentPoster.alt;
    image.style.width = Math.max(1080, currentPoster.width) + 'px';
    document.body.append(viewer);
    viewer.querySelector('button').addEventListener('click', () => viewer.close());
    viewer.addEventListener('close', () => { viewer.remove(); imageViewer = null; posterFrame.focus(); });
    viewer.showModal();
  };
  posterFrame.addEventListener('click', enlargePoster);
  posterFrame.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); enlargePoster(); }
  });
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
    img.src = poster.src; img.alt = poster.alt;
    img.width = poster.width;
    img.height = poster.sourceHeight;
    currentPoster = poster;
    dialog.setAttribute('aria-label', poster.title);
    dialog.querySelector('.event-popup-header span').textContent = poster.title;
    const applyLink = dialog.querySelector('.event-popup-apply a');
    applyLink.href = poster.href;
    applyLink.innerHTML = `${poster.action} <span aria-hidden="true">→</span>`;
    fitPoster();
    dialog.querySelectorAll('[data-poster]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    dialog.querySelector('.event-popup-image').scrollTop = 0;
  }));
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { imageViewer?.close(); window.removeEventListener('resize', fitViewport); viewport?.removeEventListener('resize', fitViewport); viewport?.removeEventListener('scroll', fitViewport); document.body.style.overflow = oldOverflow; priorFocus?.focus(); dialog.remove(); if (location.hash === '#announcement') history.replaceState(null, '', location.pathname + location.search); });
  dialog.showModal();
  fitPoster();
  document.body.style.overflow = 'hidden';
}
window.addEventListener('hashchange', openAnnouncement);
openAnnouncement();
