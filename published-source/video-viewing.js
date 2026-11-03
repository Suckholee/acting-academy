// Play the main film while it is visible, and pause when leaving it.
(() => {
  const frame = document.querySelector('#instructor-video .video-slot-frame');
  if (!frame || !('IntersectionObserver' in window)) return;
  let visible = false;
  let player;
  const watching = () => document.body.classList.toggle('kjt-video-watching', Boolean(visible && !document.hidden && player && !player.paused && !player.ended));
  const sync = () => {
    const next = frame.querySelector('video');
    if (next !== player) {
      player?.pause();
      player = next;
      if (player) { player.muted = true; player.playsInline = true; }
    }
    if (!player) { watching(); return; }
    if (visible && !document.hidden && !document.body.classList.contains('kjt-admin-active')) {
      if (player.paused && !player.ended) player.play().then(() => {
        if (!visible || document.hidden) player.pause();
        watching();
      }).catch(() => watching());
    } else if (!document.fullscreenElement && !player.webkitDisplayingFullscreen) player.pause();
    watching();
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= .25;
    sync();
  }, { threshold: [0, .25, .5, 1] }).observe(frame);
  new MutationObserver(sync).observe(frame, { childList: true });
  for (const type of ['play', 'pause', 'ended', 'error']) document.addEventListener(type, event => {
    if (event.target === player) watching();
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) player?.pause();
    sync();
  });
  window.addEventListener('pagehide', () => { player?.pause(); });
  sync();
})();
