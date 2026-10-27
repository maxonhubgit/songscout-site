import { clamp, sceneState } from './showcase-state.js';

const chapters = [
  ['Your group. Every little detail.', 'Group controls, weekly recap and the song composer.'],
  ['From your picks to theirs.', 'The layers settle back into place as the feed scrolls.'],
  ['Discover what makes a pick.', 'The cover, player and reactions lift from their cards.'],
  ['Back together. Ready to listen.', 'Keep discovering, together.'],
];

// Both renderers share the exact same scroll choreography and lifecycle.
export function animateShowcase(stage, render, resize, onError) {
  const viewport = stage.querySelector('.scene-viewport');
  const sticky = stage.querySelector('.sticky');
  let target = 0, progress = 0, raf = 0, previous = 0;
  let visible = true, disposed = false, chapter = -1;
  const title = stage.querySelector('[data-scene-title]');
  const description = stage.querySelector('[data-scene-description]');
  const meter = stage.querySelector('.scene-progress span');

  function paint() {
    const state = sceneState(progress);
    render(state);
    if (state.chapter !== chapter) {
      chapter = state.chapter;
      title.textContent = chapters[chapter][0];
      description.textContent = chapters[chapter][1];
    }
    meter.style.transform = `scaleX(${state.progress})`;
    stage.dataset.chapter = String(chapter);
  }
  function frame(now) {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    const delta = previous ? Math.min(64, now - previous) : 16;
    previous = now;
    progress += (target - progress) * (1 - Math.exp(-delta / 85));
    if (Math.abs(target - progress) < 0.0001) progress = target;
    try { paint(); } catch (error) { onError(error); return; }
    if (progress !== target) wake();
    else previous = 0;
  }
  function wake() {
    if (!disposed && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function readScroll() {
    const rect = stage.getBoundingClientRect();
    const distance = rect.height - sticky.clientHeight;
    target = distance > 0 ? clamp(-rect.top / distance) : 0;
    wake();
  }
  function onResize() {
    try { resize(); readScroll(); wake(); } catch (error) { onError(error); }
  }
  function onVisibility() {
    previous = 0;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else readScroll();
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) { previous = 0; readScroll(); }
    else { cancelAnimationFrame(raf); raf = 0; }
  });
  const sizeObserver = new ResizeObserver(onResize);
  function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    observer.disconnect(); sizeObserver.disconnect();
    window.removeEventListener('scroll', readScroll);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
  }
  try {
    resize(); readScroll(); progress = target; paint();
    observer.observe(stage); sizeObserver.observe(viewport);
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
  } catch (error) { dispose(); throw error; }
  return dispose;
}
