// Editable app layers on the existing three.js phone.
import * as THREE from './vendor/three.module.min.js';
import { UI, layers, drawChrome } from './showcase-ui.js';
import { clamp, layerLift } from './showcase-state.js';
import { animateShowcase } from './showcase-motion.js';

const SCREEN = { w: 1.36, h: 1.36 * UI.height / UI.width, r: 0.18 };
const PHONE = { w: SCREEN.w + 0.10, h: SCREEN.h + 0.10, d: 0.16, r: 0.23 };
const POINT = SCREEN.w / UI.width;

function roundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y); shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}
function roundedPlane(w, h, r) {
  const geometry = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 24);
  const uv = geometry.attributes.uv, position = geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (position.getX(i) + w / 2) / w, (position.getY(i) + h / 2) / h);
  }
  return geometry;
}

export function start(stage, canvas, onError) {
  let renderer, stop = () => {}, disposed = false, shaderFailed = false, textureScale = 3;
  const textures = new Set(), geometries = new Set(), materials = new Set();
  const scene = new THREE.Scene();
  function dispose() {
    if (disposed) return;
    disposed = true; stop();
    canvas.removeEventListener('webglcontextlost', lost);
    textures.forEach(value => value.dispose());
    geometries.forEach(value => value.dispose());
    materials.forEach(value => value.dispose());
    renderer?.dispose();
  }
  function lost(event) {
    event.preventDefault();
    onError(new Error('The graphics context was interrupted'));
  }
  function mesh(geometry, material) {
    geometries.add(geometry); materials.add(material);
    return new THREE.Mesh(geometry, material);
  }
  function texture(w, h, draw) {
    // Avoid oversized textures on integrated GPUs and Safari.
    const surface = document.createElement('canvas');
    // Lifted layers come closer to the camera, so draw them well above screen resolution.
    const ratio = Math.min(textureScale, renderer.capabilities.maxTextureSize / Math.max(w, h));
    surface.width = Math.ceil(w * ratio); surface.height = Math.ceil(h * ratio);
    const ctx = surface.getContext('2d');
    if (!ctx) throw new Error('Canvas textures are unavailable');
    ctx.scale(ratio, ratio); draw(ctx, w, h);
    const map = new THREE.CanvasTexture(surface);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    textures.add(map);
    return map;
  }
  try {
    // Do not force the discrete/high-performance GPU on dual-GPU Macs.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    textureScale = Math.min(window.innerWidth, window.innerHeight) < 600 ? 3 : 4;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.localClippingEnabled = true;
    renderer.debug.onShaderError = () => { shaderFailed = true; };
    canvas.addEventListener('webglcontextlost', lost);

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b9b4, 2));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(4, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 2);
    rim.position.set(-5, 1, -3); scene.add(rim);

    const phone = new THREE.Group(); scene.add(phone);
    const bevel = 0.025;
    const bodyGeometry = new THREE.ExtrudeGeometry(roundedRectShape(PHONE.w - 2 * bevel, PHONE.h - 2 * bevel, PHONE.r - bevel), {
      depth: PHONE.d - 2 * bevel, bevelEnabled: true, bevelThickness: bevel,
      bevelSize: bevel, bevelSegments: 5, curveSegments: 24,
    });
    bodyGeometry.center();
    phone.add(mesh(bodyGeometry, new THREE.MeshStandardMaterial({ color: 0x73737b, metalness: 0.7, roughness: 0.3 })));
    const front = PHONE.d / 2;
    const glass = mesh(roundedPlane(PHONE.w - 0.02, PHONE.h - 0.02, PHONE.r - 0.01), new THREE.MeshBasicMaterial({ color: 0x08080a }));
    glass.position.z = front + 0.001; phone.add(glass);
    const screen = mesh(roundedPlane(SCREEN.w, SCREEN.h, SCREEN.r), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    screen.position.z = front + 0.003; phone.add(screen);
    const chrome = mesh(roundedPlane(SCREEN.w, SCREEN.h, SCREEN.r), new THREE.MeshBasicMaterial({
      map: texture(UI.width, UI.height, drawChrome), transparent: true, alphaTest: 0.01, toneMapped: false,
    }));
    chrome.position.z = front + 0.008; phone.add(chrome);
    const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0x73737b, metalness: 0.8, roughness: 0.3 });
    [[-1, 0.78, 0.12], [-1, 0.5, 0.24], [-1, 0.2, 0.24], [1, 0.42, 0.36]].forEach(([side, y, h]) => {
      const button = mesh(new THREE.BoxGeometry(0.025, h, 0.055), buttonMaterial);
      button.position.set(side * (PHONE.w / 2 + 0.006), y, 0); phone.add(button);
    });

    // Keep scroll content inside the screen's safe area, including when rotated.
    const localPlanes = [
      new THREE.Plane(new THREE.Vector3(0, -1, 0), SCREEN.h / 2 - UI.top * POINT),
      new THREE.Plane(new THREE.Vector3(0, 1, 0), UI.bottom * POINT - SCREEN.h / 2),
    ];
    const clippingPlanes = localPlanes.map(plane => plane.clone());
    const faces = layers.map(layer => {
      const face = mesh(new THREE.PlaneGeometry(layer.w * POINT, layer.h * POINT), new THREE.MeshBasicMaterial({
        map: texture(layer.w, layer.h, layer.draw), transparent: true,
        alphaTest: 0.01, toneMapped: false, clippingPlanes,
      }));
      phone.add(face);
      return { face, layer };
    });
    const viewport = stage.querySelector('.scene-viewport');
    let compact = false;
    const resize = () => {
      const w = viewport.clientWidth, h = viewport.clientHeight;
      if (!w || !h) return;
      compact = w < 600;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const worldHeight = Math.max(3.65, 2.35 / camera.aspect);
      camera.position.z = worldHeight / (2 * Math.tan(THREE.MathUtils.degToRad(14))) + 0.45;
      camera.updateProjectionMatrix();
    };
    const render = (state, motion) => {
      const { time, lean, pointer, life } = motion;
      const lift = state.lift;
      // Organic float: layered slow sines that never quite repeat
      const n1 = Math.sin(time * 0.53) + 0.5 * Math.sin(time * 1.17 + 1.3);
      const n2 = Math.sin(time * 0.41 + 2.1) + 0.5 * Math.sin(time * 0.97 + 0.4);
      const n3 = Math.sin(time * 0.67 + 4.2) + 0.4 * Math.sin(time * 1.43 + 0.9);
      // A lazy S-curve along the scroll, so the phone wanders rather than turns on a hinge
      const path = Math.sin(state.progress * Math.PI * 2);
      // Front always faces the viewer: yaw stays within about ±32°
      phone.rotation.y = clamp(-0.4 * lift + 0.14 * path + 0.05 * n1 * life + 0.14 * pointer.x, -0.56, 0.4);
      phone.rotation.x = -0.06 * lift + 0.035 * n2 * life - 0.08 * pointer.y + 0.2 * lean;
      phone.rotation.z = 0.035 * path - 0.02 * n3 * life - 0.06 * lean;
      phone.position.set(0.16 * lift + 0.1 * path, 0.05 * n2 * life - 0.06 * lean, 0);
      phone.updateMatrixWorld(true);
      clippingPlanes.forEach((plane, i) => plane.copy(localPlanes[i]).applyMatrix4(phone.matrixWorld));
      for (const { face, layer } of faces) {
        const y = layer.y - state.scroll;
        face.visible = y + layer.h > UI.top && y < UI.bottom;
        if (!face.visible) continue;
        const s = layer.seed;
        const amount = layerLift(lift, layer.level, s);
        // Each piece drifts its own way and bobs on its own beat while it floats
        const bob = Math.sin(time * (0.8 + s * 0.7) + s * 6.28) * amount;
        const sway = Math.sin(time * (0.6 + s * 0.5) + s * 3.1) * amount;
        face.position.set(
          (layer.x + layer.w / 2 - UI.width / 2) * POINT + amount * layer.depth * (-0.1 + (s - 0.5) * 0.24),
          SCREEN.h / 2 - (y + layer.h / 2) * POINT + amount * layer.depth * (s - 0.45) * 0.14 + bob * 0.018,
          front + 0.012 + layer.depth * 0.003 + amount * layer.depth * (compact ? 0.72 : 0.92) * (1 + 0.06 * sway),
        );
        face.rotation.set(
          amount * (s - 0.5) * 0.22 + bob * 0.025,
          amount * (0.08 + (s - 0.5) * 0.24) + sway * 0.03,
          amount * (s - 0.5) * 0.14,
        );
      }
      renderer.render(scene, camera);
      if (shaderFailed || renderer.getContext().isContextLost()) throw new Error('The 3D renderer is unavailable');
    };
    stop = animateShowcase(stage, render, resize, onError);
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
