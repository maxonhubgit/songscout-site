import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneState as storyState, screenState as sceneState, layerLift, layerAmount, layerOffset, SCROLL_MAX, STORY } from '../assets/showcase-state.js';
import { UI, layers } from '../assets/showcase-ui.js';
import { animateShowcase } from '../assets/showcase-motion.js';

test('flat at both ends; each card lifts while it passes the focus line', () => {
  for (const layer of layers) {
    assert.equal(layerAmount(layer, sceneState(0)), 0, layer.id);
    assert.equal(layerAmount(layer, sceneState(1)), 0, layer.id);
    assert.equal(layerLift(0, layer.level), 0);
    assert.equal(layerLift(1, layer.level), 1);
  }
  const groups = [...new Set(layers.map(layer => layer.group))];
  const surface = group => layers.find(layer => layer.group === group && layer.level === 0) ?? layers.find(layer => layer.group === group);
  const peak = {};
  for (let i = 0; i <= 1000; i++) {
    const state = sceneState(i / 1000);
    const lifted = groups.filter(group => layerAmount(surface(group), state) > 0.5);
    assert.ok(lifted.length <= 4, `too much at once: ${lifted}`);
    for (const group of groups) peak[group] = Math.max(peak[group] ?? 0, layerAmount(surface(group), state));
  }
  for (const group of ['recap', 'composer-surface', 'song-surface', 'mystery-surface']) assert.ok(peak[group] > 0.75, `${group} lifts`);
});

test('the feed glides forward once and stays inside its range', () => {
  let previousScroll = 0;
  for (let i = 0; i <= 1000; i++) {
    const state = sceneState(i / 1000);
    assert.ok(state.lift >= 0 && state.lift <= 1);
    assert.ok(state.scroll >= previousScroll && state.scroll <= SCROLL_MAX);
    previousScroll = state.scroll;
  }
  assert.equal(previousScroll, SCROLL_MAX);
});

test('a card and its details lift in the same direction', () => {
  for (let i = 0; i <= 100; i++) {
    const state = sceneState(i / 100);
    for (const layer of layers) {
      const card = layers.find(other => other.group === layer.group && other.level === 0);
      if (!card || card === layer) continue;
      assert.ok(layerAmount(layer, state) <= layerAmount(card, state) + 1e-9, layer.id);
      // never behind its card: flat stacking order (depth) plus lift
      const z = l => l.depth * 0.003 + layerOffset(l, state) * 0.72;
      assert.ok(z(layer) >= z(card), `${layer.id} sinks behind its card at ${i}%`);
    }
  }
});

test('the story: head first, then over the shoulder, then the screen', () => {
  const start = storyState(0), end = storyState(1);
  assert.equal(start.turn, 0); assert.equal(start.raise, 0); assert.equal(start.zoom, 0);
  assert.equal(start.screen.progress, 0);
  assert.equal(end.turn, 1); assert.equal(end.raise, 1); assert.equal(end.zoom, 1);
  assert.equal(end.screen.lift, 0, 'cards are flat at the end');
  // the screen only starts once the camera has closed in
  assert.ok(STORY.screen[0] >= STORY.zoom[0] + 0.1);
  for (let i = 0; i <= 100; i++) {
    const state = storyState(i / 100);
    if (state.zoom < 0.5) assert.equal(state.screen.lift, 0, `cards stay flat before the close-up (${i}%)`);
  }
  let chapter = 0;
  for (let i = 0; i <= 100; i++) { const c = storyState(i / 100).chapter; assert.ok(c >= chapter); chapter = c; }
  assert.equal(chapter, 3);
});

test('reverse scroll is deterministic and overscroll is clamped', () => {
  const forward = Array.from({ length: 101 }, (_, i) => sceneState(i / 100));
  for (let i = 100; i >= 0; i--) assert.deepEqual(sceneState(i / 100), forward[i]);
  assert.deepEqual(sceneState(-1), sceneState(0));
  assert.deepEqual(sceneState(2), sceneState(1));
});

test('editable UI faces stay within the phone width and details sit above cards', () => {
  assert.equal(new Set(layers.map(layer => layer.id)).size, layers.length);
  for (const layer of layers) {
    assert.ok(layer.x >= 0 && layer.x + layer.w <= UI.width, layer.id);
    assert.ok(layer.h > 0 && layer.w > 0 && layer.depth > 0, layer.id);
  }
  for (const id of ['song', 'mystery']) {
    const surface = layers.find(layer => layer.id === `${id}-surface`);
    for (const detail of layers.filter(layer => layer.id.startsWith(`${id}-`) && layer !== surface)) {
      assert.ok(detail.depth > surface.depth, detail.id);
    }
  }
  const end = sceneState(1);
  const feed = layers.find(layer => layer.id === 'song-surface');
  assert.ok(feed.y - end.scroll >= UI.top);
  assert.ok(feed.y + feed.h - end.scroll <= UI.bottom);
});

test('idle float rests after a while, pauses offscreen, resumes on scroll, and releases listeners', () => {
  const saved = new Map(['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame', 'IntersectionObserver', 'ResizeObserver'].map(key => [key, globalThis[key]]));
  class Events {
    listeners = new Map();
    addEventListener(name, handler) { this.listeners.set(name, handler); }
    removeEventListener(name) { this.listeners.delete(name); }
  }
  let intersection, nextId = 0, top = 0;
  const frames = new Map();
  globalThis.window = new Events(); globalThis.document = new Events();
  document.hidden = false;
  globalThis.requestAnimationFrame = callback => { frames.set(++nextId, callback); return nextId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  globalThis.IntersectionObserver = class {
    constructor(callback) { intersection = callback; }
    observe() {} disconnect() {}
  };
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  const nodes = {
    '.scene-viewport': {}, '.sticky': { clientHeight: 1000 },
    '[data-scene-title]': {}, '[data-scene-description]': {},
    '.scene-progress span': { style: {} },
  };
  const stage = { dataset: {}, querySelector: key => nodes[key], getBoundingClientRect: () => ({ top, height: 4800 }) };
  let last, renders = 0, time = 0, stop;
  function settle() {
    for (let i = 0; frames.size && i < 4000; i++) {
      const pending = [...frames.values()]; frames.clear(); time += 16;
      pending.forEach(callback => callback(time));
    }
    assert.equal(frames.size, 0, 'idle animation should come to rest');
  }
  try {
    stop = animateShowcase(stage, (state, motion) => { assert.ok(Number.isFinite(motion.time) && Math.abs(motion.lean) <= 1); last = state; renders++; }, () => {}, error => { throw error; });
    settle();
    top = -3800; window.listeners.get('scroll')(); settle();
    assert.equal(last.progress, 1); assert.equal(last.screen.lift, 0);
    top = 0; window.listeners.get('scroll')(); settle();
    assert.equal(last.progress, 0);
    const before = renders;
    intersection([{ isIntersecting: false }]);
    top = -1000; window.listeners.get('scroll')(); settle();
    assert.equal(renders, before);
    intersection([{ isIntersecting: true }]); settle();
    assert.ok(last.turn > 0.5, 'camera is over the shoulder');
    document.hidden = true; document.listeners.get('visibilitychange')();
    top = -3800; window.listeners.get('scroll')(); settle();
    assert.ok(last.progress < 1);
    document.hidden = false; document.listeners.get('visibilitychange')(); settle();
    assert.equal(last.progress, 1);
    stop();
    assert.equal(window.listeners.size, 0); assert.equal(document.listeners.size, 0);
  } finally {
    stop?.();
    for (const [key, value] of saved) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
