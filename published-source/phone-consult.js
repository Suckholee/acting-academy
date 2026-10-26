(() => {
 // Preserve old shared consultation URLs and buttons on cached pages.
 document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-consult],a[href*="?consult="]');
  if (!trigger) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  location.assign('/apply');
 }, true);
 if (new URLSearchParams(location.search).has('consult')) location.replace('/apply');
})();
