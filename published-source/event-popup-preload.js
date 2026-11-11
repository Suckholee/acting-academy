(() => {
  const requestedPopup = location.hash === '#announcement';
  const home = ['/', '/index', '/index.html'].includes(location.pathname);
  if (!requestedPopup && (!home || location.hash)) return;
  if (new URLSearchParams(location.search).has('admin') || new URLSearchParams(location.search).get('chat') === '1') return;
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (!requestedPopup && localStorage.getItem('kjt-audition-20261112-hidden') === today) return;
  } catch {}
  const link = document.createElement('link');
  link.rel = 'preload'; link.as = 'image'; link.type = 'image/png';
  link.href = '/assets/audition-evil-method-poster-20261112-v2.png';
  link.fetchPriority = 'high';
  document.head.append(link);
})();
