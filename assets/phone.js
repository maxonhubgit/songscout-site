// The showcase scene: a character with headphones holds the phone; the camera
// starts behind the head, moves over the shoulder and closes in on the screen,
// where the app layers lift out. Everything is built here from basic shapes.
import * as THREE from './vendor/three.module.min.js';
import { UI, layers, drawChrome } from './showcase-ui.js';
import { clamp, layerOffset } from './showcase-state.js';
import { animateShowcase, panelShift } from './showcase-motion.js';

const SCREEN = { w: 1.36, h: 1.36 * UI.height / UI.width, r: 0.18 };
const PHONE = { w: SCREEN.w + 0.10, h: SCREEN.h + 0.10, d: 0.16, r: 0.23 };
const POINT = SCREEN.w / UI.width;
const PHONE_SCALE = 0.5; // phone units → world units (1 world unit ≈ 10 cm)

const COLORS = {
  skin: 0xe8c3a0,
  hair: 0x3b2c25,
  shirt: 0xf3f3f0,
  ink: 0x16161a,
  cushion: 0x2a2a30,
  ember: 0xff5a36,
  pin: 0xffc533,
  titanium: 0x73737b,
};

// Character layout (world units, the character faces -z; its right hand is +x)
const HEAD = new THREE.Vector3(0, 6.05, 0);
const EYES = new THREE.Vector3(0, 6.0, -0.9);
const SHOULDER_R = new THREE.Vector3(1.15, 4.6, 0.05);
const SHOULDER_L = new THREE.Vector3(-1.15, 4.6, 0.05);
const ARM = { upper: 1.6, lower: 1.5 };
// Phone poses: low at the hip (screen up) → raised in front of the face
const PHONE_LOW = new THREE.Vector3(1.05, 3.1, -1.25);
const PHONE_HIGH = new THREE.Vector3(0.72, 5.2, -2.3);
// Where the close-up camera looks from: above the right shoulder, clear of the head
const OVER_SHOULDER_EYE = new THREE.Vector3(2.75, 6.95, 0.55);

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
const ease = t => t * t * (3 - 2 * t);

/** Two-bone IK: elbow position for a shoulder, a hand target and a bend direction */
function solveElbow(shoulder, hand, pole, upper, lower) {
  const toHand = hand.clone().sub(shoulder);
  const d = clamp(toHand.length(), 0.01, upper + lower - 0.001);
  const dir = toHand.normalize();
  const a = (upper * upper - lower * lower + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, upper * upper - a * a));
  const bend = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  return shoulder.clone().add(dir.multiplyScalar(a)).add(bend.multiplyScalar(h));
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
    geometries.add(geometry); if (material) materials.add(material);
    return new THREE.Mesh(geometry, material);
  }
  const clay = (color, roughness = 0.6) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    materials.add(material);
    return material;
  };
  function texture(w, h, draw) {
    const surface = document.createElement('canvas');
    // Lifted layers come close to the camera, so draw them well above screen resolution.
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

    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfcfca, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(4, 9, 7); scene.add(key);          // from behind-right, lights what we see
    const fill = new THREE.DirectionalLight(0xfff1e8, 1.1);
    fill.position.set(-5, 4, -6); scene.add(fill);      // warm, from the front-left
    const rim = new THREE.DirectionalLight(0xffffff, 1.2);
    rim.position.set(-6, 7, 5); scene.add(rim);

    // ---------- the phone (same design, now held in the hand) ----------
    const holder = new THREE.Group(); scene.add(holder);       // position/orientation in the hand
    const phone = new THREE.Group(); phone.scale.setScalar(PHONE_SCALE); holder.add(phone);
    const bevel = 0.025;
    const bodyGeometry = new THREE.ExtrudeGeometry(roundedRectShape(PHONE.w - 2 * bevel, PHONE.h - 2 * bevel, PHONE.r - bevel), {
      depth: PHONE.d - 2 * bevel, bevelEnabled: true, bevelThickness: bevel,
      bevelSize: bevel, bevelSegments: 5, curveSegments: 24,
    });
    bodyGeometry.center();
    phone.add(mesh(bodyGeometry, new THREE.MeshStandardMaterial({ color: COLORS.titanium, metalness: 0.7, roughness: 0.3 })));
    const front = PHONE.d / 2;
    const glass = mesh(roundedPlane(PHONE.w - 0.02, PHONE.h - 0.02, PHONE.r - 0.01), new THREE.MeshBasicMaterial({ color: 0x08080a }));
    glass.position.z = front + 0.001; phone.add(glass);
    const screenMesh = mesh(roundedPlane(SCREEN.w, SCREEN.h, SCREEN.r), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    screenMesh.position.z = front + 0.003; phone.add(screenMesh);
    const chrome = mesh(roundedPlane(SCREEN.w, SCREEN.h, SCREEN.r), new THREE.MeshBasicMaterial({
      map: texture(UI.width, UI.height, drawChrome), transparent: true, alphaTest: 0.01, toneMapped: false,
    }));
    chrome.position.z = front + 0.008; phone.add(chrome);
    const buttonMaterial = new THREE.MeshStandardMaterial({ color: COLORS.titanium, metalness: 0.8, roughness: 0.3 });
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

    // ---------- the hand, part of the phone so it always holds it ----------
    const skin = clay(COLORS.skin, 0.55);
    const hand = new THREE.Group(); phone.add(hand);
    const palm = mesh(new THREE.SphereGeometry(1, 24, 16), skin);
    palm.scale.set(0.62, 0.72, 0.26); palm.position.set(0.12, -0.72, -0.34); hand.add(palm);
    // Fingers wrap around the left edge and just grip the frame
    [-0.3, -0.66, -1.02].forEach((y, i) => {
      const finger = mesh(new THREE.CapsuleGeometry(0.105, 0.24 - i * 0.03, 6, 12), skin);
      finger.rotation.x = Math.PI / 2;
      finger.position.set(-PHONE.w / 2 - 0.07, y, -0.02); hand.add(finger);
      const tip = mesh(new THREE.SphereGeometry(0.1, 12, 10), skin);
      tip.scale.set(0.9, 1, 0.7);
      tip.position.set(-PHONE.w / 2 + 0.01, y, front + 0.03); hand.add(tip);
    });
    // Thumb along the right edge
    const thumb = mesh(new THREE.CapsuleGeometry(0.12, 0.46, 6, 12), skin);
    thumb.rotation.z = -0.2; thumb.position.set(PHONE.w / 2 + 0.08, -0.7, 0.02); hand.add(thumb);
    const wristLocal = new THREE.Vector3(0.42, -1.45, -0.38);

    // ---------- the character ----------
    const person = new THREE.Group(); scene.add(person);
    const shirt = clay(COLORS.shirt, 0.75);
    const torso = mesh(new THREE.CapsuleGeometry(1.15, 1.7, 8, 24), shirt);
    torso.scale.set(1.18, 1, 0.72); torso.position.set(0, 3.45, 0.05); person.add(torso);
    const collar = mesh(new THREE.TorusGeometry(0.46, 0.07, 10, 28), shirt);
    collar.rotation.x = Math.PI / 2; collar.position.set(0, 5.05, 0.05); person.add(collar);
    const pin = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), clay(COLORS.pin, 0.4));
    pin.rotation.x = Math.PI / 2; pin.position.set(0.48, 4.35, -0.8); person.add(pin);
    const neck = mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.75, 20), skin);
    neck.position.set(0, 5.1, 0.02); person.add(neck);

    const headGroup = new THREE.Group(); headGroup.position.copy(HEAD); person.add(headGroup);
    const head = mesh(new THREE.SphereGeometry(0.95, 40, 32), skin);
    head.scale.set(0.96, 1.05, 1); headGroup.add(head);
    // Hair: a cap over the top and back of the head
    const hair = mesh(new THREE.SphereGeometry(1.0, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.6), clay(COLORS.hair, 0.85));
    hair.scale.set(0.98, 1.07, 1.03); hair.rotation.x = 0.35; hair.position.set(0, 0.04, 0.03); headGroup.add(hair);
    [-1, 1].forEach(side => {
      const ear = mesh(new THREE.SphereGeometry(0.2, 16, 12), skin);
      ear.scale.set(0.5, 1, 0.8); ear.position.set(side * 0.92, -0.05, 0.02); headGroup.add(ear);
    });
    // Headphones: band over the head, cups with an ember ring
    const ink = clay(COLORS.ink, 0.35);
    const band = mesh(new THREE.TorusGeometry(1.1, 0.085, 14, 64, Math.PI), ink);
    band.position.y = 0.06; headGroup.add(band);
    const bandPad = mesh(new THREE.TorusGeometry(1.03, 0.06, 10, 48, Math.PI * 0.5), clay(COLORS.cushion, 0.9));
    bandPad.rotation.z = Math.PI * 0.25; bandPad.position.y = 0.06; headGroup.add(bandPad);
    [-1, 1].forEach(side => {
      const cup = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 32), ink);
      cup.rotation.z = Math.PI / 2; cup.position.set(side * 1.1, -0.06, 0.02); headGroup.add(cup);
      const cushion = mesh(new THREE.TorusGeometry(0.33, 0.1, 12, 28), clay(COLORS.cushion, 0.9));
      cushion.rotation.y = Math.PI / 2; cushion.position.set(side * 0.94, -0.06, 0.02); headGroup.add(cushion);
      const ring = mesh(new THREE.TorusGeometry(0.36, 0.035, 10, 32), clay(COLORS.ember, 0.4));
      ring.rotation.y = Math.PI / 2; ring.position.set(side * 1.26, -0.06, 0.02); headGroup.add(ring);
      const yoke = mesh(new THREE.BoxGeometry(0.08, 0.26, 0.16), ink);
      yoke.position.set(side * 1.1, 0.24, 0.02); headGroup.add(yoke);
    });

    // Arms: sleeves (shirt) from the shoulder, skin from the elbow; joints are spheres
    function makeArm(upperRadius, lowerRadius) {
      const upper = mesh(new THREE.CylinderGeometry(upperRadius, upperRadius, 1, 20), shirt);
      const lower = mesh(new THREE.CylinderGeometry(lowerRadius, lowerRadius, 1, 20), skin);
      const shoulderBall = mesh(new THREE.SphereGeometry(upperRadius * 1.05, 20, 14), shirt);
      const elbowBall = mesh(new THREE.SphereGeometry(lowerRadius * 1.08, 20, 14), skin);
      const wristBall = mesh(new THREE.SphereGeometry(lowerRadius * 0.95, 16, 12), skin);
      scene.add(upper, lower, shoulderBall, elbowBall, wristBall);
      return { upper, lower, shoulderBall, elbowBall, wristBall };
    }
    const up = new THREE.Vector3(0, 1, 0);
    function placeSegment(segment, a, b) {
      const dir = b.clone().sub(a);
      segment.position.copy(a).add(b).multiplyScalar(0.5);
      segment.scale.set(1, dir.length(), 1);
      segment.quaternion.setFromUnitVectors(up, dir.normalize());
    }
    function poseArm(arm, shoulder, wristPoint, pole) {
      const elbow = solveElbow(shoulder, wristPoint, pole, ARM.upper, ARM.lower);
      placeSegment(arm.upper, shoulder, elbow);
      placeSegment(arm.lower, elbow, wristPoint);
      arm.shoulderBall.position.copy(shoulder);
      arm.elbowBall.position.copy(elbow);
      arm.wristBall.position.copy(wristPoint);
    }
    const rightArm = makeArm(0.3, 0.22);
    const leftArm = makeArm(0.3, 0.22);
    const leftHand = mesh(new THREE.SphereGeometry(0.28, 16, 12), skin);
    leftHand.scale.set(0.8, 1.1, 0.7); scene.add(leftHand);

    // ---------- phone poses ----------
    const lowQuat = new THREE.Quaternion(), highQuat = new THREE.Quaternion();
    const probe = new THREE.Object3D();
    probe.position.copy(PHONE_LOW); probe.lookAt(PHONE_LOW.clone().add(new THREE.Vector3(-0.3, 1, 0.5)));
    lowQuat.copy(probe.quaternion);
    // The screen faces the eyes, turned slightly toward the shoulder camera
    probe.position.copy(PHONE_HIGH); probe.lookAt(EYES.clone().add(new THREE.Vector3(0.55, 0.15, 0.2)));
    highQuat.copy(probe.quaternion);
    // In the close-up the hand turns the screen toward the camera, upright
    const facingQuat = new THREE.Quaternion();
    probe.position.copy(PHONE_HIGH); probe.up.set(0, 1, 0); probe.lookAt(OVER_SHOULDER_EYE);
    facingQuat.copy(probe.quaternion);

    // ---------- camera path ----------
    const viewport = stage.querySelector('.scene-viewport');
    let compact = false;
    const view = { w: 1, h: 1, shiftX: 0, shiftY: 0 };
    const resize = () => {
      const w = viewport.clientWidth, h = viewport.clientHeight;
      if (!w || !h) return;
      compact = w < 600;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      view.w = w; view.h = h;
      const shift = panelShift(stage);
      view.shiftX = shift.x; view.shiftY = shift.y;
    };
    const behindHead = new THREE.Vector3(0.45, 6.75, 6.6), behindLook = new THREE.Vector3(0, 5.6, 0);
    const overShoulder = new THREE.Vector3(2.7, 7.1, 3.4), shoulderLook = new THREE.Vector3(0.5, 5.4, -1.6);
    const lookAt = new THREE.Vector3(), camPos = new THREE.Vector3(), center = new THREE.Vector3();
    const phoneNormal = new THREE.Vector3(), phoneRight = new THREE.Vector3(), phoneUp = new THREE.Vector3();
    const wrist = new THREE.Vector3(), shoulderPoint = new THREE.Vector3(), close = new THREE.Vector3();
    const rightPole = new THREE.Vector3(0.6, -1, 0.5), leftPole = new THREE.Vector3(-0.4, -0.2, 1);
    const leftWrist = new THREE.Vector3(), wide = new THREE.Vector3(), wide2 = new THREE.Vector3();

    const render = (state, motion) => {
      const { time, lean, pointer, life } = motion;
      const screen = state.screen;
      const lift = screen.lift;

      // Character: nods to the music, breathes, sways a little
      const beat = Math.sin(time * 4.6);
      headGroup.rotation.set(0.05 + 0.035 * beat * life, 0.06 * Math.sin(time * 0.7) * life, 0.02 * Math.sin(time * 0.9));
      person.position.y = 0.025 * Math.sin(time * 1.3) * life;
      person.rotation.y = 0.03 * Math.sin(time * 0.5) * life;
      person.updateMatrixWorld(true);

      // Phone: from the hip into view, with a small hand sway and a lean into scrolling
      const raise = ease(state.raise);
      holder.position.lerpVectors(PHONE_LOW, PHONE_HIGH, raise);
      holder.position.y += Math.sin(raise * Math.PI) * 0.35 + 0.02 * Math.sin(time * 1.1) * life;
      holder.quaternion.slerpQuaternions(lowQuat, highQuat, raise);
      // Most of the way toward the camera while it closes in; a slight angle keeps the depth visible
      holder.quaternion.slerp(facingQuat, ease(state.zoom) * 0.8);
      phone.rotation.set(0.06 * lean, -0.06 * lift + 0.04 * pointer.x, 0.01 * Math.sin(time * 0.8) * life);
      holder.updateMatrixWorld(true);

      // Right arm reaches the wrist under the phone; left arm hangs relaxed
      wrist.copy(wristLocal).applyMatrix4(phone.matrixWorld);
      poseArm(rightArm, shoulderPoint.copy(SHOULDER_R).applyMatrix4(person.matrixWorld), wrist, rightPole);
      leftWrist.set(-1.5, 2.35 + 0.03 * Math.sin(time * 1.3), -0.25).applyMatrix4(person.matrixWorld);
      poseArm(leftArm, shoulderPoint.copy(SHOULDER_L).applyMatrix4(person.matrixWorld), leftWrist, leftPole);
      leftHand.position.copy(leftWrist).y -= 0.22;

      // Camera: behind the head → over the shoulder → in front of the screen, at an angle
      center.setFromMatrixPosition(phone.matrixWorld);
      phoneNormal.set(0, 0, 1).applyQuaternion(holder.quaternion).normalize();
      phoneRight.set(1, 0, 0).applyQuaternion(holder.quaternion).normalize();
      phoneUp.set(0, 1, 0).applyQuaternion(holder.quaternion).normalize();
      // The phone stays centred; only a bottom sheet (phones) moves the picture up above it
      const freeH = view.h - 2 * view.shiftY * state.explain;
      const fit = (PHONE.h * PHONE_SCALE * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (view.h / freeH);
      const fitWide = fit / Math.min(1, (view.w / freeH) / 0.62);
      const distance = Math.max(fit, fitWide) * (compact ? 1.4 : 1.42);
      // Close-up: from above the right shoulder toward the screen, near enough to fill the frame
      close.copy(OVER_SHOULDER_EYE).sub(center).normalize().multiplyScalar(distance).add(center);
      close.x = Math.max(close.x, 1.95); // never into the head or the headphones
      const turn = ease(state.turn), zoom = ease(state.zoom);
      // Tall screens see less to the sides: step back so the head and headphones fit
      const narrow = Math.max(1, 0.95 / camera.aspect);
      wide.copy(behindHead).sub(behindLook).multiplyScalar(narrow).add(behindLook);
      wide2.copy(overShoulder).sub(shoulderLook).multiplyScalar(Math.sqrt(narrow)).add(shoulderLook);
      camPos.lerpVectors(wide, wide2, turn);
      camPos.y += Math.sin(turn * Math.PI) * 0.45;                // a small arc up
      camPos.lerp(close, zoom);
      lookAt.lerpVectors(behindLook, shoulderLook, turn).lerp(center, zoom);
      // Handheld feel + scroll lean + a hint of mouse parallax
      camPos.x += 0.04 * Math.sin(time * 0.7) * life + 0.12 * pointer.x * (0.4 + 0.6 * zoom);
      camPos.y += 0.03 * Math.sin(time * 0.9 + 1) * life - 0.08 * pointer.y - 0.1 * lean;
      camera.position.copy(camPos);
      // Closing in, the camera rolls with the phone so the screen reads upright
      camera.up.set(0, 1, 0).lerp(phoneUp, zoom).normalize();
      camera.lookAt(lookAt);

      // Screen layers, as before (in phone units)
      clippingPlanes.forEach((plane, i) => plane.copy(localPlanes[i]).applyMatrix4(phone.matrixWorld));
      for (const { face, layer } of faces) {
        const y = layer.y - screen.scroll;
        face.visible = y + layer.h > UI.top && y < UI.bottom;
        if (!face.visible) continue;
        const offset = layerOffset(layer, screen);
        face.position.set(
          (layer.x + layer.w / 2 - UI.width / 2) * POINT - offset * 0.1,
          SCREEN.h / 2 - (y + layer.h / 2) * POINT,
          front + 0.012 + layer.depth * 0.003 + offset * (compact ? 0.72 : 0.92),
        );
      }
      camera.setViewOffset(view.w, view.h, 0, view.shiftY * state.explain, view.w, view.h);
      renderer.render(scene, camera);
      if (shaderFailed || renderer.getContext().isContextLost()) throw new Error('The 3D renderer is unavailable');
    };
    stop = animateShowcase(stage, render, resize, onError);
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
