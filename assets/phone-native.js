// Browser-native 3D fallback: the same individual UI layers, without WebGL.
import { UI, layers, drawChrome } from './showcase-ui.js';
import { layerLift } from './showcase-state.js';
import { animateShowcase } from './showcase-motion.js';

export function start(stage, onError) {
  const viewport = stage.querySelector('.scene-viewport');
  const rig = document.createElement('div');
  rig.className = 'native-rig';
  rig.setAttribute('aria-hidden', 'true');
  const phone = document.createElement('div');
  phone.className = 'native-phone';
  const back = document.createElement('div');
  back.className = 'native-back';
  phone.append(back);
  function makeCanvas(w, h, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = w * 2; canvas.height = h * 2;
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas preview is unavailable');
    ctx.scale(2, 2); draw(ctx, w, h);
    return canvas;
  }
  const screen = makeCanvas(UI.width, UI.height, ctx => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, UI.width, UI.height);
  });
  screen.className = 'native-screen'; phone.append(screen);
  const faces = layers.map(layer => {
    const face = makeCanvas(layer.w, layer.h, layer.draw);
    face.className = 'native-layer';
    face.style.left = `${layer.x + 10}px`;
    face.style.top = `${layer.y + 10}px`;
    phone.append(face);
    return { face, layer };
  });
  const chrome = makeCanvas(UI.width, UI.height, drawChrome);
  chrome.className = 'native-chrome'; phone.append(chrome);
  rig.append(phone); viewport.append(rig);
  let scale = 1;
  const resize = () => {
    scale = Math.min((viewport.clientHeight - 30) / 864, (viewport.clientWidth - 32) / 560, 1);
    scale = Math.max(0.1, scale);
  };
  const render = state => {
    const lift = state.lift;
    // Perspective belongs on the rig, never on the sticky scroll container.
    phone.style.transform = `translate(-50%, -50%) scale(${scale}) rotateX(${-6 * lift}deg) rotateY(${-29 * lift}deg) rotateZ(${2 * lift}deg)`;
    for (const { face, layer } of faces) {
      const y = layer.y - state.scroll;
      const above = Math.max(0, UI.top - y);
      const below = Math.max(0, y + layer.h - UI.bottom);
      const shown = above + below < layer.h;
      face.style.visibility = shown ? 'visible' : 'hidden';
      if (!shown) continue;
      const amount = layerLift(lift, layer.level);
      const clip = `inset(${above}px 0 ${below}px 0)`;
      face.style.clipPath = clip;
      face.style.webkitClipPath = clip;
      face.style.transform = `translate3d(${-20 * amount * layer.depth}px, ${-state.scroll}px, ${1 + layer.depth * 0.3 + amount * layer.depth * 185}px)`;
    }
  };
  let stop;
  try { stop = animateShowcase(stage, render, resize, onError); }
  catch (error) { rig.remove(); throw error; }
  return { dispose() { stop(); rig.remove(); } };
}
