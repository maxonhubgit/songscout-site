// Browser-native 3D fallback: the same individual UI layers, without WebGL.
import { UI, layers, drawChrome } from './showcase-ui.js';
import { clamp, layerLift } from './showcase-state.js';
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
  const render = (state, motion) => {
    const { time, lean, pointer, life } = motion;
    const lift = state.lift;
    const n1 = Math.sin(time * 0.53) + 0.5 * Math.sin(time * 1.17 + 1.3);
    const n2 = Math.sin(time * 0.41 + 2.1) + 0.5 * Math.sin(time * 0.97 + 0.4);
    const n3 = Math.sin(time * 0.67 + 4.2) + 0.4 * Math.sin(time * 1.43 + 0.9);
    const path = Math.sin(state.progress * Math.PI * 2);
    const yaw = clamp(-23 * lift + 8 * path + 3 * n1 * life + 8 * pointer.x, -32, 23);
    const pitch = -3.5 * lift + 2 * n2 * life - 4.5 * pointer.y + 11 * lean;
    const roll = 2 * path - 1.2 * n3 * life - 3.4 * lean;
    const dx = 40 * lift + 25 * path, dy = 12 * n2 * life - 14 * lean;
    // Perspective belongs on the rig, never on the sticky scroll container.
    phone.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale}) rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`;
    for (const { face, layer } of faces) {
      const y = layer.y - state.scroll;
      const above = Math.max(0, UI.top - y);
      const below = Math.max(0, y + layer.h - UI.bottom);
      const shown = above + below < layer.h;
      face.style.visibility = shown ? 'visible' : 'hidden';
      if (!shown) continue;
      const s = layer.seed;
      const amount = layerLift(lift, layer.level, s);
      const bob = Math.sin(time * (0.8 + s * 0.7) + s * 6.28) * amount;
      const sway = Math.sin(time * (0.6 + s * 0.5) + s * 3.1) * amount;
      const clip = `inset(${above}px 0 ${below}px 0)`;
      face.style.clipPath = clip;
      face.style.webkitClipPath = clip;
      const dx = amount * layer.depth * (-20 + (s - 0.5) * 48);
      const dy = -state.scroll + amount * layer.depth * (0.45 - s) * 28 - bob * 4;
      const dz = 1 + layer.depth * 0.3 + amount * layer.depth * 185 * (1 + 0.06 * sway);
      face.style.transform = `translate3d(${dx}px, ${dy}px, ${dz}px) rotateX(${amount * (s - 0.5) * 12 + bob * 1.4}deg) rotateY(${amount * (4.5 + (s - 0.5) * 14) + sway * 1.7}deg) rotateZ(${amount * (s - 0.5) * 8}deg)`;
    }
  };
  let stop;
  try { stop = animateShowcase(stage, render, resize, onError); }
  catch (error) { rig.remove(); throw error; }
  return { dispose() { stop(); rig.remove(); } };
}
