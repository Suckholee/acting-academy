(() => {
  if (new URLSearchParams(location.search).has('admin')) return;
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (localStorage.getItem('kjt-respect-for-acting-20261024-hidden') === today) return;
  } catch {}
  const link = document.createElement('link');
  link.rel = 'preload'; link.as = 'image'; link.type = 'image/webp';
  link.href = '/assets/events/respect-for-acting-20261024/poster.webp';
  link.fetchPriority = 'high';
  document.head.append(link);
})();
