(() => {
  const hero = document.querySelector('.hero--act-audition');
  if (!hero) return;
  if (!('IntersectionObserver' in window)) {
    document.body.classList.remove('hero-intro-active');
    return;
  }
  new IntersectionObserver(([entry]) => {
    document.body.classList.toggle('hero-intro-active', entry.isIntersecting && entry.intersectionRatio > 0.4);
  }, {threshold: [0, 0.4, 1]}).observe(hero);
})();
