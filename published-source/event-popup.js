function openAnnouncement() {
  const key = 'kjt-audition-20261112-hidden';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const requestedPopup = location.hash === '#announcement';
  const home = ['/', '/index', '/index.html'].includes(location.pathname);
  if ((!requestedPopup && (!home || location.hash)) || document.querySelector('#announcement')) return;
  try { if (!requestedPopup && localStorage.getItem(key) === today()) return; } catch {}
  if (new URLSearchParams(location.search).has('admin') || new URLSearchParams(location.search).get('chat') === '1') return;
  const auditionUrl = '/auditions/ffc75f4b-4ef8-45fd-b966-e8a4e16bfb32#application';
  const posters = [
    { src: '/assets/audition-evil-method-poster-20261112.png', label: '오디션 모집 안내', title: '《악인의 방식》 공개 오디션', href: auditionUrl, action: '오디션 지원하기', width: 1024, height: 1536, sourceHeight: 1536, offset: 0, alt: '숏폼드라마 악인의 방식 공개 오디션 최종 포스터. 접수 시작일은 포스터의 11월 13일에서 11월 12일로 변경되었습니다.' },
    { src: '/assets/audition-next-lead-banner-20261112.png', label: '다음 주인공은 당신', title: '《악인의 방식》 공개 오디션', href: auditionUrl, action: '오디션 지원하기', width: 1672, height: 941, sourceHeight: 941, offset: 0, alt: '김정태 배우아카데미 × 스토리나인. 다음 주인공은 당신입니다.' }
  ];
  const dialog = document.createElement('dialog');
  dialog.id = 'announcement';
  dialog.className = 'academy-event-popup';
  dialog.setAttribute('aria-label', posters[0].title);
  dialog.innerHTML = `<div class="event-popup-header"><span>${posters[0].title}</span><button type="button" data-close aria-label="팝업 닫기">✕</button></div><div class="event-popup-tabs" aria-label="안내 포스터 선택">${posters.map((p, i) => `<button type="button" data-poster="${i}" aria-pressed="${i === 0}">${p.label}</button>`).join('')}</div><div class="event-popup-schedule"><strong>접수 11.12(목)–11.20(금)</strong><span>1차 오디션 11.28(토)–12.2(수)</span><small>접수 시작일 변경: 포스터의 11/13보다 하루 앞선 11/12부터 지원 가능합니다.</small></div><div class="event-popup-image"><div class="event-poster-frame"><img fetchpriority="high" decoding="async" width="${posters[0].width}" height="${posters[0].sourceHeight}" src="${posters[0].src}" alt="${posters[0].alt}"></div></div><div class="event-popup-apply"><a href="${posters[0].href}">${posters[0].action} <span aria-hidden="true">→</span></a></div><div class="event-popup-footer"><button type="button" data-hide>오늘 하루 보지 않기</button><button type="button" data-close>닫기</button></div>`;
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
