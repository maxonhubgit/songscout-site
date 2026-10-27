// Browser-native 3D fallback: the same individual UI layers, without WebGL.
import { UI, layers, drawChrome } from './showcase-ui.js';
import { clamp, layerOffset } from './showcase-state.js';
import { panelShift } from './showcase-motion.js';
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
    canvas.width = w * 3; canvas.height = h * 3;
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas preview is unavailable');
    ctx.scale(3, 3); draw(ctx, w, h);
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
    scale = Math.min((viewport.clientHeight - 90) / 864, (viewport.clientWidth - 48) / 560, 1);
    scale = Math.max(0.1, scale);
  };
  const render = (story, motion) => {
    // No character without WebGL: the phone alone, centred (moved up only above a bottom sheet)
    const state = story.screen;
    const shift = panelShift(stage);
    rig.style.transform = `translateY(${-shift.y * story.explain}px)`;
    const { time, lean, pointer, life } = motion;
    const lift = state.lift;
    const n1 = Math.sin(time * 0.5) + 0.4 * Math.sin(time * 1.1 + 1.3);
    const n2 = Math.sin(time * 0.4 + 2.1) + 0.4 * Math.sin(time * 0.9 + 0.4);
    const yaw = clamp(-21 * lift + 1.7 * n1 * life + 6 * pointer.x, -29, 17);
    const pitch = -3 * lift + 1.2 * n2 * life - 3.5 * pointer.y + 9 * lean;
    const roll = 1.2 * lift - 2.3 * lean;
    const dx = 36 * lift, dy = 9 * n2 * life - 12 * lean;
    // Perspective belongs on the rig, never on the sticky scroll container.
    phone.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale}) rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`;
    for (const { face, layer } of faces) {
      const y = layer.y - state.scroll;
      const above = Math.max(0, UI.top - y);
      const below = Math.max(0, y + layer.h - UI.bottom);
      const shown = above + below < layer.h;
      face.style.visibility = shown ? 'visible' : 'hidden';
      if (!shown) continue;
      const offset = layerOffset(layer, state);
      const clip = `inset(${above}px 0 ${below}px 0)`;
      face.style.clipPath = clip;
      face.style.webkitClipPath = clip;
      face.style.transform = `translate3d(${-20 * offset}px, ${-state.scroll}px, ${1 + layer.depth * 0.3 + offset * 185}px)`;
    }
  };
  let stop;
  try { stop = animateShowcase(stage, render, resize, onError); }
  catch (error) { rig.remove(); throw error; }
  return { dispose() { stop(); rig.remove(); } };
}
