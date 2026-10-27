// Scroll choreography is separate from the screen artwork and the renderer.
// Each lift returns to zero before the screen scrolls or the section ends.
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function smooth(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export function sceneState(progress) {
  const p = clamp(progress);
  const firstLift = smooth(0.08, 0.25, p) * (1 - smooth(0.31, 0.43, p));
  const secondLift = smooth(0.62, 0.78, p) * (1 - smooth(0.84, 0.97, p));
  return {
    progress: p,
    lift: firstLift + secondLift,
    // Matches the position of “Latest picks” in showcase-ui.js.
    scroll: 548 * smooth(0.45, 0.59, p),
    chapter: p < 0.43 ? 0 : p < 0.62 ? 1 : p < 0.9 ? 2 : 3,
  };
}

export function layerLift(lift, order) {
  // Child details leave their parent a little later, and return a little sooner.
  return smooth(Math.min(order, 4) * 0.045, 1, lift);
}
