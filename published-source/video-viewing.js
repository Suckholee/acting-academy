// Keep the main film clear of fixed navigation and consultation controls.
(() => {
  const frame = document.querySelector('#instructor-video .video-slot-frame');
  if (!frame) return;
  let player = null;
  let pendingFrame;
  const update = () => {
    const rect = frame.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
    const watching = player?.isConnected && !player.paused && !player.ended && visibleHeight > rect.height / 4;
    document.body.classList.toggle('kjt-video-watching', Boolean(watching));
  };
  const align = () => {
    if (!player?.isConnected || document.fullscreenElement || player.webkitDisplayingFullscreen) return;
    const rect = frame.getBoundingClientRect();
    window.scrollBy({ top: rect.top - (innerHeight - rect.height) / 2, behavior: 'instant' });
  };
  const center = () => {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(() => {
      if (!player?.isConnected || player.paused || document.fullscreenElement || player.webkitDisplayingFullscreen) return;
      align();
      update();
    });
  };
  const stop = () => {
    cancelAnimationFrame(pendingFrame);
    if (document.body.classList.contains('kjt-video-watching')) align();
    player = null;
    document.body.classList.remove('kjt-video-watching');
  };
  // Capture media events so CMS replacements use the same viewing behavior.
  document.addEventListener('play', event => {
    if (!frame.contains(event.target) || event.target.tagName !== 'VIDEO' || document.body.classList.contains('kjt-admin-active')) return;
    player = event.target;
    update();
    center();
  }, true);
  for (const type of ['pause', 'ended', 'error', 'emptied']) {
    document.addEventListener(type, event => { if (event.target === player) stop(); }, true);
  }
  new IntersectionObserver(update, { threshold: [0, .25, .5, 1] }).observe(frame);
  new MutationObserver(update).observe(frame, { childList: true });
  window.addEventListener('resize', () => { if (player && !player.paused) center(); });
})();
