// Scroll choreography is separate from the artwork and the renderer.
// The story: the back of a head with headphones, then the camera moves over the
// shoulder while the phone is raised, then it closes in on the screen, where the
// feed scrolls once and whatever passes the middle lifts out and sinks back.
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function smooth(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export const SCROLL_MAX = 640;
export const FOCUS = 400;   // screen y (points) where content lifts, around the middle
export const RANGE = 190;   // how far above/below the focus the lift fades out

/** The phone screen on its own: progress 0..1 of the screen part */
export function screenState(progress) {
  const p = clamp(progress);
  const envelope = smooth(0, 0.1, p) * (1 - smooth(0.9, 1, p));
  return {
    progress: p,
    envelope,
    lift: envelope,
    scroll: SCROLL_MAX * smooth(0.04, 0.96, p),
  };
}

// Story beats along the whole section (0..1)
export const STORY = {
  raise: [0.05, 0.34],   // the hand brings the phone up
  turn: [0.08, 0.36],    // camera: behind the head → over the shoulder
  zoom: [0.3, 0.48],     // camera: over the shoulder → close on the screen
  screen: [0.44, 0.98],  // the feed scrolls and cards lift
};

export function sceneState(progress) {
  const p = clamp(progress);
  const screen = screenState((p - STORY.screen[0]) / (STORY.screen[1] - STORY.screen[0]));
  return {
    progress: p,
    raise: smooth(...STORY.raise, p),
    turn: smooth(...STORY.turn, p),
    zoom: smooth(...STORY.zoom, p),
    screen,
    chapter: p < 0.14 ? 0 : p < 0.42 ? 1 : p < 0.8 ? 2 : 3,
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
