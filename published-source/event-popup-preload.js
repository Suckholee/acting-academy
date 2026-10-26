(() => {
  if (new URLSearchParams(location.search).has('admin') || new URLSearchParams(location.search).get('chat') === '1') return;
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (localStorage.getItem('kjt-respect-for-acting-20261107-final-hidden') === today) return;
  } catch {}
  const link = document.createElement('link');
  link.rel = 'preload'; link.as = 'image'; link.type = 'image/webp';
  link.href = '/assets/events/kim-jung-tae-20261107-final/poster.webp';
  link.fetchPriority = 'high';
  document.head.append(link);
})();
