(() => {
 const panel = document.querySelector('.page-sharing');
 if (!panel) return;
 const status = panel.querySelector('[role="status"]');
 const fallback = panel.querySelector('.page-sharing-fallback');
 const pageUrl = pathname => new URL(pathname, location.origin).href;
 async function copy(url) {
  fallback.hidden = true;
  try {
   await navigator.clipboard.writeText(url);
   status.textContent = '링크를 복사했습니다. 카카오톡 대화에 붙여 넣어 주세요.';
  } catch {
   status.textContent = '주소를 직접 복사해 주세요.';
   fallback.hidden = false;
   const input = fallback.querySelector('input');
   input.value = url;
   input.focus();
   input.select();
  }
 }
 panel.querySelectorAll('[data-copy-page]').forEach(button => button.addEventListener('click', () => copy(pageUrl(button.dataset.copyPage))));
 panel.querySelector('[data-share-current]')?.addEventListener('click', async () => {
  const url = pageUrl(location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/');
  if (!navigator.share) { await copy(url); return; }
  try {
   await navigator.share({ title: document.title, url });
   status.textContent = '공유 창을 열었습니다.';
  } catch (error) {
   if (error.name !== 'AbortError') await copy(url);
  }
 });
})();
