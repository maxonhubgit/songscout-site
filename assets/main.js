import { drawPreview } from './showcase-ui.js';

const stage = document.querySelector('.scrolly');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
let current, generation = 0;

async function setup() {
  const run = ++generation;
  current?.dispose(); current = null;
  stage.classList.remove('is-animated', 'is-ready', 'is-native');
  drawPreview(stage.querySelector('.phone-preview canvas'));
  stage.dataset.panel = 'intro';
  // Reduced-motion users retain the full preview without a long empty scroll.
  if (calm.matches) return;
  stage.classList.add('is-animated');
  let fallingBack = false;
  async function useNative(error) {
    if (run !== generation || fallingBack) return;
    fallingBack = true;
    console.warn('SongScout: using the browser-native 3D preview.', error);
    current?.dispose(); current = null;
    stage.classList.remove('is-ready');
    try {
      const { start } = await import('./phone-native.js');
      if (run !== generation) return;
      current = start(stage, () => {
        current?.dispose(); current = null;
        stage.classList.remove('is-animated', 'is-ready', 'is-native');
      });
      stage.classList.add('is-ready', 'is-native');
    } catch (fallbackError) {
      if (run !== generation) return;
      console.warn('SongScout: showing the still preview.', fallbackError);
      stage.classList.remove('is-animated', 'is-ready', 'is-native');
    }
  }
  try {
    const { start } = await import('./phone.js?v=12');
    if (run !== generation) return;
    // A fresh canvas is needed when motion is re-enabled after context disposal.
    const oldCanvas = stage.querySelector('.scene-canvas');
    const canvas = oldCanvas.cloneNode(false); oldCanvas.replaceWith(canvas);
    current = start(stage, canvas, useNative);
    stage.classList.add('is-ready');
  } catch (error) { await useNative(error); }
}

if (stage) {
  setup();
  calm.addEventListener('change', setup);
  window.addEventListener('pagehide', () => { ++generation; current?.dispose(); current = null; });
  // Safari restores pages from back/forward cache without re-running modules.
  window.addEventListener('pageshow', event => { if (event.persisted) setup(); });
}
