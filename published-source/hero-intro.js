(() => {
  const hero = document.querySelector('.hero--act-audition');
  if (!hero) return;
  let loaded = document.readyState === 'complete';
  let visible = false;
  let started = false;
  const startIntro = () => {
    if (started || !loaded || !visible || document.querySelector('dialog[open]')) return;
    started = true;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !document.body.classList.contains('motion-paused')) {
      hero.classList.add('hero-motion-started');
    }
    document.removeEventListener('close', startIntro, true);
  };
  document.addEventListener('close', startIntro, true);
  window.addEventListener('load', () => { loaded = true; startIntro(); }, {once: true});
  if (!('IntersectionObserver' in window)) {
    document.body.classList.remove('hero-intro-active');
    visible = true;
    startIntro();
    return;
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio > 0.4;
    document.body.classList.toggle('hero-intro-active', visible);
    startIntro();
  }, {threshold: [0, 0.4, 1]}).observe(hero);
})();
