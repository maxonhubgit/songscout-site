import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneState, layerLift } from '../assets/showcase-state.js';
import { UI, layers } from '../assets/showcase-ui.js';
import { animateShowcase } from '../assets/showcase-motion.js';

test('the UI is together at both ends and drifts apart twice, softly', () => {
  assert.equal(sceneState(0).lift, 0);
  assert.equal(sceneState(1).lift, 0);
  const lifts = Array.from({ length: 1001 }, (_, i) => sceneState(i / 1000).lift);
  const firstPeak = Math.max(...lifts.slice(50, 450));
  const secondPeak = Math.max(...lifts.slice(550, 970));
  const valley = Math.min(...lifts.slice(400, 650));
  assert.ok(firstPeak > 0.8 && secondPeak > 0.8, 'both breaths open up');
  assert.ok(valley < firstPeak - 0.3 && valley < secondPeak - 0.3, 'the layers gather in between');
  for (let i = 1; i < lifts.length; i++) assert.ok(Math.abs(lifts[i] - lifts[i - 1]) < 0.02, 'no jumps');
  for (const layer of layers) {
    assert.equal(layerLift(0, layer.level, layer.seed), 0);
    assert.equal(layerLift(1, layer.level, layer.seed), 1);
    assert.ok(layer.seed >= 0 && layer.seed < 1, layer.id);
  }
});

test('the feed glides forward and stays inside its range', () => {
  let previousScroll = 0;
  for (let i = 0; i <= 1000; i++) {
    const state = sceneState(i / 1000);
    assert.ok(state.lift >= 0 && state.lift <= 1);
    assert.ok(state.scroll >= previousScroll && state.scroll <= 548);
    previousScroll = state.scroll;
  }
  assert.equal(previousScroll, 548);
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
    assert.equal(last.progress, 1); assert.equal(last.lift, 0);
    top = 0; window.listeners.get('scroll')(); settle();
    assert.equal(last.progress, 0);
    const before = renders;
    intersection([{ isIntersecting: false }]);
    top = -1000; window.listeners.get('scroll')(); settle();
    assert.equal(renders, before);
    intersection([{ isIntersecting: true }]); settle();
    assert.ok(last.lift > 0.8);
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
