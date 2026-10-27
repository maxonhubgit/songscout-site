// Scroll choreography is separate from the screen artwork and the renderer.
// Two soft "breaths" instead of strict phases: the UI drifts apart, gathers
// a little, drifts apart again and is fully back together at both ends.
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function smooth(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

/** 0 → 1 → 0 over [start, end], round at the top like a breath */
function breath(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t <= 0 || t >= 1 ? 0 : Math.pow(Math.sin(Math.PI * t), 1.4);
}

export function sceneState(progress) {
  const p = clamp(progress);
  const lift = clamp(0.9 * breath(0.03, 0.55, p) + breath(0.42, 0.98, p));
  return {
    progress: p,
    lift,
    // The feed keeps gliding while the layers float; matches “Latest picks” in showcase-ui.js.
    scroll: 548 * smooth(0.22, 0.86, p),
    chapter: p < 0.36 ? 0 : p < 0.72 ? 1 : 2,
  };
}

/** Stable 0..1 number per layer, so every piece moves a little differently */
export function seedFor(id) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** A small overshoot, so pieces pop out and settle instead of sliding */
function springy(t) {
  const c1 = 1.25, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function layerLift(lift, order, seed = 0) {
  // Details leave their card a little later; each piece has its own timing.
  const start = Math.min(order, 4) * 0.05 + seed * 0.12;
  const t = smooth(start, 1, lift);
  return t <= 0 ? 0 : t >= 1 ? 1 : springy(t);
}
