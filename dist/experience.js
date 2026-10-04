/* Supplemental experience: native scrolling, no scroll interception. */
const experienceReduced = matchMedia('(prefers-reduced-motion: reduce)');
const experienceVideo = document.querySelector('.hero-video');
const videoControl = document.querySelector('.video-toggle');
let videoRequested = !experienceReduced.matches;

function syncVideo() {
  if (!experienceVideo || !videoControl) return;
  const allowed = videoRequested && !experienceReduced.matches && !document.body.classList.contains('motion-paused') && !document.hidden;
  const hero = document.querySelector('.hero');
  if (allowed && hero && hero.getBoundingClientRect().bottom > 0) {
    experienceVideo.play().then(() => {
      experienceVideo.classList.add('playing');
      videoControl.textContent = '영상 일시정지 Ⅱ';
      videoControl.setAttribute('aria-pressed', 'true');
    }).catch(() => {
      videoControl.textContent = '영상 재생 ▷';
      videoControl.setAttribute('aria-pressed', 'false');
    });
  } else {
    experienceVideo.pause();
    videoControl.textContent = '영상 재생 ▷';
    videoControl.setAttribute('aria-pressed', 'false');
  }
}

if (videoControl && experienceVideo) {
  videoControl.addEventListener('click', () => {
    videoRequested = !videoRequested;
    syncVideo();
  });
  experienceVideo.addEventListener('error', () => {
    experienceVideo.classList.remove('playing');
    videoControl.hidden = true;
  });
  const source = experienceVideo.querySelector('source');
  if (source) {
    source.addEventListener('error', () => {
      experienceVideo.classList.remove('playing');
      videoControl.hidden = true;
    });
  }
  const heroEl = document.querySelector('.hero');
  if (heroEl) new IntersectionObserver(syncVideo, { threshold: 0 }).observe(heroEl);
  document.addEventListener('visibilitychange', syncVideo);
  experienceReduced.addEventListener('change', syncVideo);
  document.querySelector('.motion-toggle')?.addEventListener('click', syncVideo);
  syncVideo();
}

/* Journey section tabs & scroll tracking */
const journey = document.querySelector('.journey');
const journeyButtons = [...document.querySelectorAll('[data-journey]')];
const journeyPanels = [...document.querySelectorAll('.journey-panel')];
let journeyCurrent = -1, journeyFrame = false;

function selectJourney(index) {
  if (index === journeyCurrent) return;
  journeyCurrent = index;
  journeyButtons.forEach((b, i) => {
    b.classList.toggle('active', i === index);
    b.setAttribute('aria-pressed', i === index ? 'true' : 'false');
  });
  journeyPanels.forEach((p, i) => {
    p.classList.toggle('active', i === index);
    p.setAttribute('aria-hidden', i !== index ? 'true' : 'false');
  });
  const countEl = document.querySelector('.journey-count');
  if (countEl) countEl.textContent = `0${index + 1} / 03`;
}

function paintJourney() {
  journeyFrame = false;
  if (!journey) return;
  const r = journey.getBoundingClientRect();
  const staticMode = experienceReduced.matches || document.body.classList.contains('motion-paused');
  if (!staticMode && r.top < innerHeight && r.bottom > 0) {
    const travel = Math.max(1, journey.offsetHeight - innerHeight);
    const t = Math.max(0, Math.min(1, -r.top / travel));
    selectJourney(Math.min(2, Math.floor(t * 3)));
    const lineEl = document.querySelector('.journey-line i');
    if (lineEl) lineEl.style.transform = `scaleX(${t})`;
  }
  const backTop = document.querySelector('.back-top');
  if (backTop) backTop.classList.toggle('shown', scrollY > 500);
}

function queueJourney() {
  if (!journeyFrame) {
    journeyFrame = true;
    requestAnimationFrame(paintJourney);
  }
}

if (journey) {
  journeyButtons.forEach((b, i) => b.addEventListener('click', () => {
    selectJourney(i);
    const r = journey.getBoundingClientRect();
    const travel = Math.max(1, journey.offsetHeight - innerHeight);
    window.scrollTo({
      top: scrollY + r.top + travel * (i / 2),
      behavior: experienceReduced.matches ? 'instant' : 'smooth'
    });
  }));
  addEventListener('scroll', queueJourney, { passive: true });
  addEventListener('resize', queueJourney);
  selectJourney(0);
  queueJourney();
}

document.querySelector('.back-top')?.addEventListener('click', () => scrollTo({
  top: 0,
  behavior: experienceReduced.matches ? 'instant' : 'smooth'
}));

const carouselControllers = [];
document.querySelectorAll('[data-carousel]').forEach(box => {
  const track = box.querySelector('.carousel-track');
  if (!track) return;
  const cards = [...track.children];
  const counter = box.querySelector('.carousel-counter');
  const play = box.querySelector('[data-play]');
  let index = 0, auto = false, inView = false, hover = false, timer = null;

  function readIndex() {
    index = cards.reduce((best, c, i) => Math.abs(c.offsetLeft - cards[0].offsetLeft - track.scrollLeft) < Math.abs(cards[best].offsetLeft - cards[0].offsetLeft - track.scrollLeft) ? i : best, 0);
    if (counter) counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  }

  function go(delta) {
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    let target = delta > 0 && atEnd ? 0 : delta < 0 && track.scrollLeft < 4 ? cards.length - 1 : Math.max(0, Math.min(cards.length - 1, index + delta));
    track.scrollTo({ left: cards[target].offsetLeft - cards[0].offsetLeft, behavior: experienceReduced.matches ? 'instant' : 'smooth' });
  }

  function sync() {
    clearInterval(timer);
    timer = null;
    const active = auto && inView && !hover && !document.hidden && !experienceReduced.matches;
    if (play) {
      play.textContent = auto ? '일시정지 Ⅱ' : '자동 재생';
      play.setAttribute('aria-pressed', auto ? 'true' : 'false');
    }
    if (active) timer = setInterval(() => go(1), 3500);
  }

  box.querySelector('[data-next]')?.addEventListener('click', () => go(1));
  box.querySelector('[data-prev]')?.addEventListener('click', () => go(-1));
  play?.addEventListener('click', () => { auto = !auto; sync(); });
  track.addEventListener('scroll', readIndex, { passive: true });
  track.addEventListener('pointerenter', () => { hover = true; sync(); });
  track.addEventListener('pointerleave', () => { hover = false; sync(); });
  track.addEventListener('focusin', () => { hover = true; sync(); });
  track.addEventListener('focusout', () => { hover = false; sync(); });
  track.tabIndex = 0;
  track.addEventListener('keydown', e => {
    if (e.target !== track) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      go(e.key === 'ArrowRight' ? 1 : -1);
    }
  });

  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    sync();
  }, { threshold: 0.15 }).observe(box);

  document.addEventListener('visibilitychange', sync);
  experienceReduced.addEventListener('change', sync);
  carouselControllers.push(sync);
});

document.querySelector('.motion-toggle')?.addEventListener('click', () => {
  carouselControllers.forEach(sync => sync());
  queueJourney();
});

const revealObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.journey-copy, .mentors .section-top, .facilities .section-top, .carousel').forEach(el => {
  el.classList.add('reveal');
  revealObserver.observe(el);
});

/* Dialogs & Modals */
const extraDialogs = [...document.querySelectorAll('dialog:not(#course-dialog)')];
const previousFocus = new WeakMap();

function showExtra(modal, trigger) {
  if (!modal) return;
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  previousFocus.set(modal, trigger || document.activeElement);
  modal.showModal();
  document.body.style.overflow = 'hidden';
}

extraDialogs.forEach(modal => {
  modal.querySelector('[data-close]')?.addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) document.body.style.overflow = '';
    previousFocus.get(modal)?.focus();
  });
  modal.addEventListener('click', e => {
    if (e.target !== modal) return;
    const r = modal.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close();
  });
});

document.querySelectorAll('[data-course]').forEach(b => b.addEventListener('click', () => {
  const link = document.querySelector('#course-page-link');
  if (link) link.href = `/courses/${b.dataset.course}`;
}));

document.querySelectorAll('[data-consult]').forEach(b => b.addEventListener('click', () => {
  showExtra(document.querySelector('#consult-dialog'), b);
}));

document.querySelectorAll('[data-image]').forEach(b => b.addEventListener('click', () => {
  const modal = document.querySelector('#gallery-dialog');
  if (!modal) return;
  const img = modal.querySelector('img');
  const p = modal.querySelector('p');
  if (img) {
    img.src = b.dataset.image;
    img.alt = b.dataset.caption + ' 참고 이미지';
  }
  if (p) p.textContent = b.dataset.caption + ' · 시설 참고 이미지';
  showExtra(modal, b);
}));

const mentorPoints = [
  ['호흡·발성 습관 관찰', '감각과 신체 이완', '즉흥 표현과 짧은 장면'],
  ['카메라 시선과 동선', '파트너와 대사 호흡', '촬영본 리뷰와 재연'],
  ['개인에게 맞는 독백 선택', '자기소개와 모의 오디션', '셀프테이프 점검'],
  ['상황과 관계 분석', '인물의 목적과 장애물', '행동을 통한 감정 표현']
];

document.querySelectorAll('[data-mentor]').forEach(b => b.addEventListener('click', () => {
  const card = b.closest('article');
  const modal = document.querySelector('#mentor-dialog');
  if (!modal || !card) return;
  modal.querySelector('h2').textContent = card.querySelector('h3').textContent;
  modal.querySelector('#mentor-description').textContent = card.querySelector('h3+p').textContent;
  modal.querySelector('ul').replaceChildren(...mentorPoints[Number(b.dataset.mentor)].map(text => {
    const li = document.createElement('li');
    li.textContent = text;
    return li;
  }));
  showExtra(modal, b);
}));

const consultForm = document.querySelector('#consult-form');
let consultSending = false;

if (consultForm) {
  consultForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (consultSending) return;
    const data = new FormData(consultForm);
    const result = consultForm.querySelector('.form-result');
    const payload = {
      name: data.get('name'),
      phone: data.get('phone'),
      purposes: data.getAll('purposes'),
      courses: data.getAll('courses'),
      consent: data.has('consent'),
      website: data.get('website')
    };
    if (!payload.purposes.length || !payload.courses.length) {
      if (result) result.textContent = '교육목적과 희망과목을 각각 선택해주세요.';
      return;
    }
    consultSending = true;
    const button = consultForm.querySelector('[type=submit]');
    if (button) {
      button.disabled = true;
      button.textContent = '접수 확인 중…';
    }
    if (result) result.textContent = '';
    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000)
      });
      let body;
      try { body = await response.json(); }
      catch { throw new Error('온라인 접수 연결 준비 중입니다. 신청은 전송되지 않았습니다.'); }
      if (!response.ok) throw new Error(body.error || '접수를 확인하지 못했습니다.');
      if (result) result.textContent = body.message;
      consultForm.reset();
    } catch (error) {
      if (result) result.textContent = error.name === 'TimeoutError' ? '접수 완료를 확인하지 못했습니다. 잠시 후 다시 확인해주세요.' : error.message;
    } finally {
      consultSending = false;
      if (button) {
        button.disabled = false;
        button.textContent = '상담 신청하기';
      }
    }
  });
}

const requestedCourse = new URLSearchParams(location.search).get('consult');
if (['basic', 'camera', 'audition'].includes(requestedCourse) && consultForm) {
  const courseTitles = { basic: '연기 베이직', camera: '카메라 연기', audition: '입시·오디션' };
  const checkbox = [...consultForm.querySelectorAll('[name=courses]')].find(input => input.value === courseTitles[requestedCourse]);
  if (checkbox) checkbox.checked = true;
  showExtra(document.querySelector('#consult-dialog'), document.querySelector('[data-consult]'));
}
