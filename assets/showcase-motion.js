import { clamp, sceneState } from './showcase-state.js';

const chapters = [
  ['Headphones on.', 'Your friends are already sharing.'],
  ['Your people, in your pocket.', 'Small private groups for the songs you love.'],
  ['Every pick has a story.', 'Play it, react to it, keep it.'],
  ['Ready to listen.', 'Keep discovering, together.'],
];

// Idle floating runs this long after the last scroll or pointer movement, then rests.
const IDLE_MS = 20000;

// Both renderers share the same choreography and lifecycle. render(state, motion) gets
// motion = { time, lean, pointer: {x, y}, life }: seconds, a springy response to scroll
// speed (-1..1), the smoothed pointer (-1..1) and how alive the idle float is (0..1).
export function animateShowcase(stage, render, resize, onError) {
  const viewport = stage.querySelector('.scene-viewport');
  const sticky = stage.querySelector('.sticky');
  let target = 0, progress = 0, raf = 0, previous = 0, clock = 0, lastInput = 0;
  let visible = true, disposed = false, chapter = -1;
  let lean = 0, leanSpeed = 0, life = 1;
  const pointer = { x: 0, y: 0 }, pointerTarget = { x: 0, y: 0 };
  const title = stage.querySelector('[data-scene-title]');
  const description = stage.querySelector('[data-scene-description]');
  const meter = stage.querySelector('.scene-progress span');

  function paint() {
    const state = sceneState(progress);
    render(state, { time: clock / 1000, lean, pointer, life });
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
    clock += delta;
    if (!lastInput) lastInput = now;
    const before = progress;
    progress += (target - progress) * (1 - Math.exp(-delta / 110));
    if (Math.abs(target - progress) < 0.0001) progress = target;

    // Lean follows scroll speed through a soft spring, so it overshoots a little and settles.
    const speed = clamp(((progress - before) / delta) * 1000 * 2.4, -1, 1);
    const dt = delta / 1000;
    leanSpeed += ((speed - lean) * 60 - leanSpeed * 9) * dt; // damping ratio ~0.6
    lean = clamp(lean + leanSpeed * dt, -1, 1);
    const ease = 1 - Math.exp(-delta / 260);
    pointer.x += (pointerTarget.x - pointer.x) * ease;
    pointer.y += (pointerTarget.y - pointer.y) * ease;

    const idleFor = now - lastInput;
    life += ((idleFor < IDLE_MS ? 1 : 0) - life) * (1 - Math.exp(-delta / 900));
    try { paint(); } catch (error) { onError(error); return; }
    const moving = progress !== target || Math.abs(lean) > 0.002 || Math.abs(leanSpeed) > 0.002
      || Math.abs(pointerTarget.x - pointer.x) > 0.002 || Math.abs(pointerTarget.y - pointer.y) > 0.002;
    if (moving || life > 0.01) wake();
    else { previous = 0; life = 0; }
  }
  function wake() {
    if (!disposed && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function touched() {
    lastInput = 0;
    wake();
  }
  function readScroll() {
    const rect = stage.getBoundingClientRect();
    const distance = rect.height - sticky.clientHeight;
    target = distance > 0 ? clamp(-rect.top / distance) : 0;
    touched();
  }
  function onPointer(event) {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    pointerTarget.x = clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
    pointerTarget.y = clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1);
    touched();
  }
  function onResize() {
    try { resize(); readScroll(); } catch (error) { onError(error); }
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
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('visibilitychange', onVisibility);
  }
  try {
    resize(); readScroll(); progress = target; paint();
    observer.observe(stage); sizeObserver.observe(viewport);
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
  } catch (error) { dispose(); throw error; }
  return dispose;
}
