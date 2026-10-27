// Scroll choreography is separate from the artwork and the renderer.
// The story: the back of a head with earphones, then the camera moves over the
// shoulder while the phone is raised, then it closes in on the screen, where the
// feed scrolls once over a "ramp": layers float highest in the middle of the
// screen and lower toward its top and bottom edges.
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function smooth(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export const SCROLL_MAX = 640;
export const CENTER = 439;    // screen y (points) of the ramp's peak: middle of the visible area
export const HALF = 470;      // distance from the peak to where the ramp would reach its base
export const BASE = 0.18;     // height at the top and bottom edges, relative to the peak

/** The phone screen on its own: progress 0..1 of the screen part */
export function screenState(progress) {
  const p = clamp(progress);
  const envelope = smooth(0, 0.1, p) * (1 - smooth(0.9, 1, p));
  return {
    progress: p,
    envelope,
    lift: envelope,
    scroll: SCROLL_MAX * smooth(0.04, 0.96, p),
    // The content y the side panel explains: starts near the top of the screen so the
    // header and recap get their turn, then glides to the middle
    reading: SCROLL_MAX * smooth(0.04, 0.96, p) + 120 + (CENTER - 120) * smooth(0, 0.4, p),
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
  // Side panel: the intro shows at the very top, the explanations once the camera has locked on
  const intro = 1 - smooth(0, 0.035, p);
  const explain = smooth(STORY.zoom[1] - 0.025, STORY.zoom[1] + 0.01, p);
  const screen = screenState((p - STORY.screen[0]) / (STORY.screen[1] - STORY.screen[0]));
  return {
    progress: p,
    raise: smooth(...STORY.raise, p),
    turn: smooth(...STORY.turn, p),
    zoom: smooth(...STORY.zoom, p),
    screen,
    intro,
    explain,
    panel: intro > 0.5 ? 'intro' : explain > 0.5 ? 'explain' : 'hidden',
  };
}

/** Ramp height (0..1) at a screen y: a smooth hill, highest in the middle */
export function ramp(screenY) {
  const t = clamp(Math.abs(screenY - CENTER) / HALF);
  return BASE + (1 - BASE) * 0.5 * (1 + Math.cos(Math.PI * t));
}

export function layerLift(lift, order) {
  // Details sit a step above their card; the step grows with the lift.
  return smooth(Math.min(order, 4) * 0.05, 1, lift);
}

/** How high a layer floats, 0..1: the ramp at its centre, scaled by the envelope */
export function layerAmount(layer, state) {
  const own = ramp(layer.y + layer.h / 2 - state.scroll);
  return state.envelope * own;
}

/** Lift in depth units. Cards follow the ramp; details ride on their card and add their own step,
 *  so they can never sink behind it. */
export function layerOffset(layer, state) {
  const cardDepth = layer.cardDepth ?? layer.depth;
  const card = layer.card ?? layer;
  const cardHeight = state.envelope * ramp(card.y + card.h / 2 - state.scroll);
  const own = state.envelope * ramp(layer.y + layer.h / 2 - state.scroll);
  const base = Math.max(cardHeight, own) * cardDepth * 1.6;
  return base + layerLift(Math.max(cardHeight, own), layer.level) * Math.max(0, layer.depth - cardDepth);
}
