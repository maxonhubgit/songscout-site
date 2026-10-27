// SongScout website: scroll-driven 3D iPhone whose UI lifts out of the screen.
// Everything here is drawn in code (geometry, screen mock, UI cards); the only
// library is three.js, served from this site (assets/vendor).
import * as THREE from "./vendor/three.module.min.js";

const BRAND = {
  ink: "#0b0b0f",
  canvas: "#f7f7f5",
  ember: "#ff5a36",
  amber: "#ffb020",
  rose: "#ff2d6f",
  mint: "#22c993",
  sky: "#2f7bff",
  lilac: "#8c7bff",
  gray: "#8e8e93",
  line: "#e6e6e3",
};
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

// Phone proportions (iPhone-like, scaled to world units)
const PHONE = { w: 1.46, h: 3.0, d: 0.17, r: 0.24, bezel: 0.055 };
const SCREEN = { w: PHONE.w - 2 * PHONE.bezel, h: PHONE.h - 2 * PHONE.bezel, r: PHONE.r - PHONE.bezel };
// Screen mock canvas, in CSS-like points
const UI_W = 390;
const UI_H = Math.round((UI_W * SCREEN.h) / SCREEN.w);

// ---------- drawing helpers ----------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, weight = 400, color = BRAND.ink, align = "left") {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(str, x, y);
}

function sunrise(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, BRAND.amber);
  g.addColorStop(0.5, BRAND.ember);
  g.addColorStop(1, BRAND.rose);
  return g;
}

function heart(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s / 16, s / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-8, -1, -6, -9, 0, -4);
  ctx.bezierCurveTo(6, -9, 8, -1, 0, 5);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function playIcon(ctx, cx, cy, s, color) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.55, cy);
  ctx.lineTo(cx - s * 0.35, cy + s * 0.5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function noteIcon(ctx, cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.14;
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.18, cy + s * 0.32, s * 0.2, s * 0.15, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.3);
  ctx.lineTo(cx, cy - s * 0.45);
  ctx.lineTo(cx + s * 0.32, cy - s * 0.3);
  ctx.stroke();
}

/** Canvas sized in points, drawn at 3x for sharp text */
function makeCanvas(w, h, draw) {
  const scale = 3;
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext("2d");
  ctx.scale(scale, scale);
  draw(ctx, w, h);
  return c;
}

function texture(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// ---------- UI mock: the pieces that lift out ----------
// Each layer: slot on the screen (points) and how to draw it.

const LAYERS = [
  {
    // Weekly recap banner
    x: 18, y: 146, w: 354, h: 62, depth: 0.62,
    draw(ctx, w, h) {
      roundRect(ctx, 0, 0, w, h, 16);
      ctx.fillStyle = BRAND.ink;
      ctx.fill();
      roundRect(ctx, 12, 11, 40, 40, 10);
      ctx.fillStyle = sunrise(ctx, 12, 11, 40, 40);
      ctx.fill();
      text(ctx, "Your week in review", 64, 28, 15, 600, "#fff");
      text(ctx, "12 songs shared this week", 64, 47, 12, 400, "rgba(255,255,255,0.65)");
    },
  },
  {
    // Main song card with cover, player and actions
    x: 18, y: 224, w: 354, h: 268, depth: 0.95,
    draw(ctx, w, h) {
      roundRect(ctx, 0, 0, w, h, 20);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(30, 32, 16, 0, Math.PI * 2);
      ctx.fillStyle = BRAND.sky;
      ctx.fill();
      text(ctx, "lena", 54, 30, 14, 600);
      text(ctx, "2 min ago", 54, 46, 11, 400, BRAND.gray);
      roundRect(ctx, 16, 64, 112, 112, 14);
      ctx.fillStyle = sunrise(ctx, 16, 64, 112, 112);
      ctx.fill();
      noteIcon(ctx, 72, 120, 40, "rgba(255,255,255,0.9)");
      text(ctx, "Midnight Drive", 142, 96, 17, 700);
      text(ctx, "Neon Coast", 142, 118, 13, 400, BRAND.gray);
      text(ctx, "Night Swim · 2025", 142, 136, 11, 400, BRAND.gray);
      ctx.beginPath();
      ctx.arc(w - 36, 150, 20, 0, Math.PI * 2);
      ctx.fillStyle = BRAND.ink;
      ctx.fill();
      playIcon(ctx, w - 35, 150, 14, "#fff");
      roundRect(ctx, 16, 192, w - 32, 4, 2);
      ctx.fillStyle = BRAND.line;
      ctx.fill();
      roundRect(ctx, 16, 192, (w - 32) * 0.38, 4, 2);
      ctx.fillStyle = BRAND.ink;
      ctx.fill();
      roundRect(ctx, 16, 212, 138, 34, 17);
      ctx.fillStyle = BRAND.ink;
      ctx.fill();
      text(ctx, "Open in Spotify", 85, 234, 13, 600, "#fff", "center");
      heart(ctx, w - 118, 230, 18, BRAND.rose);
      text(ctx, "8", w - 102, 235, 14, 600);
    },
  },
  {
    // "New to me" pill, floats furthest
    x: 214, y: 434, w: 142, h: 36, depth: 1.45,
    draw(ctx, w, h) {
      roundRect(ctx, 0, 0, w, h, h / 2);
      ctx.fillStyle = "#fff0eb";
      ctx.fill();
      text(ctx, "+  New to me", w / 2, 23, 13, 700, BRAND.ember, "center");
    },
  },
  {
    // Mystery pick (lilac)
    x: 18, y: 508, w: 354, h: 112, depth: 0.78,
    draw(ctx, w, h) {
      roundRect(ctx, 0, 0, w, h, 20);
      ctx.fillStyle = "#f0edff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(34, 36, 18, 0, Math.PI * 2);
      ctx.fillStyle = BRAND.ink;
      ctx.fill();
      roundRect(ctx, 21, 31, 26, 8, 4);
      ctx.fillStyle = BRAND.lilac;
      ctx.fill();
      text(ctx, "Mystery pick", 62, 32, 15, 700);
      text(ctx, "Someone in your group", 62, 49, 11, 400, BRAND.gray);
      text(ctx, "Who's behind the shades?", 18, 86, 15, 600, BRAND.lilac);
    },
  },
  {
    // Song Map card (mint)
    x: 18, y: 636, w: 354, h: 92, depth: 1.15,
    draw(ctx, w, h) {
      roundRect(ctx, 0, 0, w, h, 20);
      ctx.fillStyle = "#fff";
      ctx.fill();
      roundRect(ctx, 14, 14, 64, 64, 14);
      ctx.fillStyle = "#e3f8f0";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(46, 40, 11, 0, Math.PI * 2);
      ctx.fillStyle = BRAND.mint;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(38, 46);
      ctx.lineTo(46, 62);
      ctx.lineTo(54, 46);
      ctx.fill();
      text(ctx, "Pinned here", 92, 38, 15, 700);
      text(ctx, "Bench on the summit · 40 m", 92, 58, 12, 400, BRAND.gray);
    },
  },
];

/** The screen underneath: background, status bar, faint slots where layers sit */
function drawScreen(ctx, w, h) {
  ctx.fillStyle = BRAND.canvas;
  ctx.fillRect(0, 0, w, h);
  text(ctx, "9:41", 34, 30, 15, 600);
  // Header stays on the glass
  text(ctx, "Hello, scout", 20, 76, 13, 500, BRAND.gray);
  text(ctx, "Action", 18, 116, 36, 800);
  ctx.beginPath();
  ctx.arc(w - 44, 94, 24, 0, Math.PI * 2);
  ctx.fillStyle = BRAND.ink;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w - 44, 88, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w - 44, 110, 14, Math.PI, 0);
  ctx.fill();
  for (const l of LAYERS) {
    roundRect(ctx, l.x, l.y, l.w, l.h, Math.min(20, l.h / 2));
    ctx.fillStyle = "rgba(11,11,15,0.045)";
    ctx.fill();
  }
  // Composer at the bottom stays on the glass
  roundRect(ctx, 18, h - 118, w - 36, 72, 20);
  ctx.fillStyle = "#fff";
  ctx.fill();
  text(ctx, "Share a song", 34, h - 86, 16, 700);
  roundRect(ctx, 34, h - 74, w - 68, 18, 9);
  ctx.fillStyle = "#f1f1ef";
  ctx.fill();
  roundRect(ctx, w / 2 - 67, h - 16, 134, 5, 3);
  ctx.fillStyle = BRAND.ink;
  ctx.fill();
}

// ---------- geometry ----------

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Flat rounded rectangle with UVs normalized to 0..1 (for screen textures) */
function roundedPlane(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 24);
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  }
  return g;
}

function buildPhone(renderer) {
  const phone = new THREE.Group();
  const bevel = 0.035;

  // Titanium frame + back
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRectShape(PHONE.w - 2 * bevel, PHONE.h - 2 * bevel, PHONE.r - bevel), {
      depth: PHONE.d - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 6, curveSegments: 32,
    }),
    new THREE.MeshStandardMaterial({ color: 0x55555c, metalness: 0.7, roughness: 0.28 }),
  );
  body.geometry.center();
  phone.add(body);

  const front = PHONE.d / 2;

  // Black glass (bezel)
  const glass = new THREE.Mesh(
    roundedPlane(PHONE.w - 0.02, PHONE.h - 0.02, PHONE.r - 0.01),
    new THREE.MeshStandardMaterial({ color: 0x050506, metalness: 0.2, roughness: 0.15 }),
  );
  glass.position.z = front + 0.001;
  phone.add(glass);

  // Screen
  const screenTex = texture(makeCanvas(UI_W, UI_H, drawScreen), renderer);
  const screen = new THREE.Mesh(
    roundedPlane(SCREEN.w, SCREEN.h, SCREEN.r),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }),
  );
  screen.position.z = front + 0.002;
  phone.add(screen);

  // Dynamic Island
  const island = new THREE.Mesh(
    roundedPlane(0.4, 0.115, 0.0575),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  island.position.set(0, SCREEN.h / 2 - 0.13, front + 0.004);
  phone.add(island);

  // Side buttons
  const buttonMat = new THREE.MeshStandardMaterial({ color: 0x606067, metalness: 0.8, roughness: 0.3 });
  const addButton = (x, y, h) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.06), buttonMat);
    b.position.set(x, y, 0);
    phone.add(b);
  };
  addButton(-PHONE.w / 2 - 0.01, 0.78, 0.12);
  addButton(-PHONE.w / 2 - 0.01, 0.5, 0.24);
  addButton(-PHONE.w / 2 - 0.01, 0.2, 0.24);
  addButton(PHONE.w / 2 + 0.01, 0.42, 0.36);

  // Floating UI layers, each with a soft shadow that stays on the glass
  const shadowTex = texture(makeCanvas(120, 120, (ctx) => {
    const g = ctx.createRadialGradient(60, 60, 10, 60, 60, 60);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 120, 120);
  }), renderer);

  const toWorld = (px, py) => [(-SCREEN.w / 2) + (px / UI_W) * SCREEN.w, (SCREEN.h / 2) - (py / UI_H) * SCREEN.h];
  const layers = LAYERS.map((l, i) => {
    const w = (l.w / UI_W) * SCREEN.w;
    const h = (l.h / UI_H) * SCREEN.h;
    const [cx, cy] = toWorld(l.x + l.w / 2, l.y + l.h / 2);

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: texture(makeCanvas(l.w, l.h, l.draw), renderer), transparent: true, toneMapped: false }),
    );
    mesh.position.set(cx, cy, front + 0.004 + i * 0.0005);
    mesh.renderOrder = 10 + i;

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.15, h * 1.3),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    );
    shadow.position.set(cx, cy, front + 0.003);
    shadow.renderOrder = 5;

    phone.add(shadow, mesh);
    return { mesh, shadow, base: new THREE.Vector3(cx, cy, mesh.position.z), depth: l.depth, index: i };
  });

  return { phone, layers };
}

// ---------- scene + scroll ----------

const smooth = (a, b, t) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, t) => a + (b - a) * t;

export function start(stage, canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 8.6);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8d4, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4);
  rim.position.set(-5, 1, -3);
  scene.add(rim);

  const { phone, layers } = buildPhone(renderer);
  scene.add(phone);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Scroll progress through the tall section, smoothed per frame
  let target = 0, progress = 0, visible = true, running = false;
  const startLoop = () => {
    if (running || !visible) return;
    running = true;
    requestAnimationFrame(frame);
  };
  const readScroll = () => {
    const rect = stage.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    target = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
  };
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", readScroll);
  readScroll();
  progress = target;

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    startLoop();
  }).observe(stage);

  const clock = new THREE.Clock();
  function frame() {
    if (!visible) {
      running = false;
      return;
    }
    const time = clock.getElapsedTime();
    progress += (target - progress) * 0.085;
    const p = progress;

    // Phone: turns to show depth, drifts right, never more than ~26° so the front stays in view
    const turn = smooth(0.0, 0.35, p) - 0.55 * smooth(0.75, 1.0, p);
    phone.rotation.y = lerp(0.12, -0.46, turn) + Math.sin(time * 0.6) * 0.015;
    phone.rotation.x = lerp(0.06, -0.12, smooth(0.0, 0.5, p)) + Math.sin(time * 0.8) * 0.01;
    phone.rotation.z = lerp(0.0, 0.04, smooth(0.2, 0.6, p));
    phone.position.x = lerp(0, 0.45, smooth(0.05, 0.55, p));
    phone.position.y = lerp(-0.1, 0.05, smooth(0, 1, p)) + Math.sin(time * 0.9) * 0.02;

    // Layers lift out one after another, float, and hold
    for (const l of layers) {
      const start = 0.1 + l.index * 0.08;
      const lift = smooth(start, start + 0.3, p);
      const bob = Math.sin(time * 1.1 + l.index * 1.3) * 0.025 * lift;
      l.mesh.position.set(
        l.base.x - lift * 0.18 * l.depth,
        l.base.y + bob + lift * 0.04 * (l.index - 2.5) * 0.3,
        l.base.z + lift * l.depth,
      );
      l.mesh.scale.setScalar(1 + lift * 0.06);
      l.shadow.material.opacity = 0.32 * lift;
      l.shadow.position.x = l.base.x + lift * 0.08 * l.depth;
      l.shadow.position.y = l.base.y - lift * 0.06 * l.depth;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  startLoop();
  stage.classList.add("is-ready");
  return true;
}
