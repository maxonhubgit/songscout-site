// Scroll choreography is separate from the screen artwork and the renderer.
// The feed scrolls once, steadily. Whatever is passing the focus line in the
// upper part of the screen lifts out, then sinks back as it scrolls on.
// Everything is flat at the start and the end.
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function smooth(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export const SCROLL_MAX = 640;
export const FOCUS = 400;   // screen y (points) where content lifts, around the middle
export const RANGE = 190;   // how far above/below the focus the lift fades out

export function sceneState(progress) {
  const p = clamp(progress);
  const envelope = smooth(0, 0.1, p) * (1 - smooth(0.9, 1, p));
  return {
    progress: p,
    envelope,
    lift: envelope,
    scroll: SCROLL_MAX * smooth(0.04, 0.96, p),
    chapter: p < 0.36 ? 0 : p < 0.72 ? 1 : 2,
  };
}

/** 0..1 for a span of content [top, bottom] (content points) at the current scroll */
export function focusLift(top, bottom, scroll) {
  const a = top - scroll, b = bottom - scroll;
  const distance = Math.max(0, a - FOCUS, FOCUS - b);
  return distance >= RANGE ? 0 : 0.5 * (1 + Math.cos((Math.PI * distance) / RANGE));
}

export function layerLift(lift, order) {
  // Details follow their card a moment later, in the same direction.
  return smooth(Math.min(order, 4) * 0.05, 1, lift);
}

/** How far a layer is lifted: its whole card group lifts together */
export function layerAmount(layer, state) {
  const group = state.envelope * focusLift(layer.groupTop, layer.groupBottom, state.scroll);
  return layerLift(group, layer.level);
}

/** Lift in depth units. Details ride on their card and add their own lift on top,
 *  so they can never sink behind it while it moves. */
export function layerOffset(layer, state) {
  const group = state.envelope * focusLift(layer.groupTop, layer.groupBottom, state.scroll);
  const card = layer.cardDepth ?? layer.depth;
  return group * card + layerLift(group, layer.level) * Math.max(0, layer.depth - card);
}
