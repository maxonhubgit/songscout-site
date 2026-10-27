// Editable illustration of MainView.swift, SongCard.swift and RichSongView.swift.
// Demo content only. Layout, card faces and individual controls live here;
// the same drawings power the 3D layers and the non-WebGL preview.
export const UI = { width: 390, height: 844, top: 58, bottom: 820 };
export const BRAND = {
  ink: '#0b0b0f', canvas: '#f7f7f5', gray: '#808084', line: '#dedede',
  ember: '#ff5a36', lilac: '#8c7bff', mint: '#22c993',
};
const FONT = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';

export function box(ctx, x, y, w, h, r, fill, stroke) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function text(ctx, value, x, y, size = 15, weight = 400, color = BRAND.ink, align = 'left') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}
function circle(ctx, x, y, r, fill) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
function line(ctx, points, color = BRAND.ink, width = 1.8) {
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
}
function avatar(ctx, x, y, r) {
  circle(ctx, x, y, r, BRAND.ink);
  circle(ctx, x, y - r * 0.25, r * 0.3, '#fff');
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 2, 0, Math.PI * 2); ctx.clip();
  circle(ctx, x, y + r * 0.76, r * 0.59, '#fff'); ctx.restore();
}
// Simple drawn symbols, avoiding emoji glyph substitutions on Safari.
function symbol(ctx, name, x, y, color = BRAND.ink, size = 20) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 20, size / 20);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.8;
  if (name === 'play') {
    ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(7, 0); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill();
  } else if (name === 'stats' || name === 'wave') {
    const heights = name === 'stats' ? [8, 15, 20] : [6, 13, 20, 11, 5];
    heights.forEach((h, i) => box(ctx, i * 4 - heights.length * 2, -h / 2, 2.5, h, 1.2, color));
  } else if (name === 'qr') {
    [[-8, -8], [2, -8], [-8, 2]].forEach(([a, b]) => {
      box(ctx, a, b, 6, 6, 0.5, null, color); box(ctx, a + 2, b + 2, 2, 2, 0, color);
    });
    box(ctx, 2, 2, 3, 3, 0, color); box(ctx, 7, 5, 2, 5, 0, color); box(ctx, 3, 8, 3, 2, 0, color);
  } else if (name === 'members') {
    circle(ctx, -6, -3, 3, color); circle(ctx, 6, -3, 3, color);
    box(ctx, -11, 2, 10, 6, 3, color); box(ctx, 1, 2, 10, 6, 3, color);
    circle(ctx, 0, -5, 3.5, color); box(ctx, -5, 0, 10, 9, 4, color);
  } else if (name === 'settings') {
    for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); box(ctx, -2, -10, 4, 5, 1, color); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.stroke();
  } else if (name === 'glasses') {
    box(ctx, -9, -3, 8, 6, 2, color); box(ctx, 1, -3, 8, 6, 2, color); line(ctx, [[-2, -2], [2, -2]], color);
  } else if (name === 'crown') {
    ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-5, 1); ctx.lineTo(0, -7);
    ctx.lineTo(5, 1); ctx.lineTo(9, -6); ctx.lineTo(7, 7); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill();
  } else if (name === 'heart') {
    ctx.beginPath(); ctx.moveTo(0, 7); ctx.bezierCurveTo(-17, -3, -6, -13, 0, -5);
    ctx.bezierCurveTo(6, -13, 17, -3, 0, 7); ctx.stroke();
  } else if (name === 'comment') {
    box(ctx, -8, -7, 16, 12, 4, null, color); line(ctx, [[-3, 5], [-5, 9], [2, 5]], color);
  } else if (name === 'smile') {
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
    circle(ctx, -3, -2, 1, color); circle(ctx, 3, -2, 1, color);
    ctx.beginPath(); ctx.arc(0, 0, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  } else if (name === 'relay') {
    line(ctx, [[-8, -2], [-8, -5], [7, -5], [3, -9]], color);
    line(ctx, [[8, 2], [8, 5], [-7, 5], [-3, 9]], color);
  } else if (name === 'share') {
    line(ctx, [[-6, -1], [-8, -1], [-8, 9], [8, 9], [8, -1], [6, -1]], color);
    line(ctx, [[0, 3], [0, -10], [-4, -6]], color); line(ctx, [[0, -10], [4, -6]], color);
  } else if (name === 'sparkles') {
    line(ctx, [[0, -8], [0, 8]], color); line(ctx, [[-6, 0], [6, 0]], color);
    line(ctx, [[7, -9], [7, -4]], color, 1.2); line(ctx, [[4.5, -6.5], [9.5, -6.5]], color, 1.2);
  } else if (name === 'more') {
    [-6, 0, 6].forEach(a => circle(ctx, a, 0, 1.4, color));
  } else if (name === 'note') {
    line(ctx, [[3, 5], [3, -9], [9, -6]], color, 2.5); circle(ctx, -1, 6, 4, color);
  } else if (name === 'clipboard') {
    box(ctx, -6, -6, 12, 15, 2, null, color); box(ctx, -3, -9, 6, 4, 1, '#fff', color);
  }
  ctx.restore();
}

// Absolute points in the app's scroll content. depth is the exploded z offset;
// level distinguishes a card's surface, its content and its controls.
export const layers = [];
function add(id, x, y, w, h, depth, level, draw) {
  layers.push({ id, x, y, w, h, depth, level, draw });
}

add('header', 16, 77, 358, 98, 0.2, 0, (ctx) => {
  text(ctx, 'Hello, scout', 0, 13, 14, 400, BRAND.gray);
  line(ctx, [[11, 35], [2, 44], [11, 53]], BRAND.ink, 3);
  text(ctx, 'Action', 20, 60, 44, 700);
  text(ctx, '6 members · All groups', 0, 82, 12, 400, BRAND.gray);
  avatar(ctx, 326, 38, 32);
});
['Stats', 'Invite', 'Members', 'Settings'].forEach((label, i) => {
  add(`group-${label.toLowerCase()}`, 16 + i * 92, 191, 82, 64, 0.38 + i * 0.045, 1, (ctx, w) => {
    box(ctx, 0, 0, w, 64, 14, '#000');
    symbol(ctx, ['stats', 'qr', 'members', 'settings'][i], w / 2, 23, '#fff');
    text(ctx, label, w / 2, 49, 12, 600, '#fff', 'center');
  });
});
add('recap', 16, 275, 358, 76, 0.46, 1, (ctx) => {
  const gradient = ctx.createLinearGradient(0, 0, 358, 76);
  gradient.addColorStop(0, '#242424'); gradient.addColorStop(1, '#000');
  box(ctx, 0, 0, 358, 76, 20, gradient);
  box(ctx, 14, 14, 48, 48, 12, '#efa725'); symbol(ctx, 'crown', 38, 38, '#fff', 24);
  text(ctx, 'Your week in review', 76, 32, 17, 600, '#fff');
  text(ctx, '12 songs shared this week', 76, 53, 14, 400, '#bcbcbc');
  line(ctx, [[335, 33], [340, 38], [335, 43]], '#999');
});
add('composer-surface', 16, 371, 358, 290, 0.25, 0, ctx => box(ctx, 0, 0, 358, 290, 20, '#f7f7f7'));
add('composer-heading', 32, 387, 326, 36, 0.48, 1, ctx => {
  text(ctx, 'Share a song', 0, 25, 22, 700);
  box(ctx, 167, 0, 159, 36, 18, '#e9e9e9'); symbol(ctx, 'wave', 184, 18, BRAND.ink, 15);
  text(ctx, "What's playing?", 198, 23, 14, 600);
});
add('link-field', 32, 435, 326, 46, 0.7, 2, ctx => {
  box(ctx, 0.5, 0.5, 325, 45, 15, '#fff', '#ccc');
  text(ctx, 'Paste Spotify, SoundCloud or Apple…', 14, 29, 14, 400, BRAND.gray);
  symbol(ctx, 'clipboard', 303, 22, BRAND.gray, 17);
});
add('title-field', 32, 493, 326, 46, 0.76, 2, ctx => {
  box(ctx, 0.5, 0.5, 325, 45, 15, '#fff', '#ccc'); text(ctx, 'Song name', 14, 29, 16, 400, BRAND.gray);
});
add('mystery-toggle', 32, 551, 326, 36, 0.9, 3, ctx => {
  symbol(ctx, 'glasses', 12, 18, BRAND.lilac, 22); text(ctx, 'Mystery pick', 32, 24, 15, 600);
  box(ctx, 275, 3, 51, 30, 15, '#e4e4e6'); circle(ctx, 290, 18, 13, '#fff');
});
add('share-button', 32, 599, 326, 46, 1.04, 3, ctx => {
  box(ctx, 0, 0, 326, 46, 15, '#777'); text(ctx, 'Share song', 163, 29, 17, 600, '#fff', 'center');
});
add('feed-title', 16, 681, 358, 38, 0.2, 0, ctx => text(ctx, 'Latest picks', 0, 29, 28, 700));

function songCard(id, y, mystery = false) {
  const extra = mystery ? 101 : 0;
  add(`${id}-surface`, 16, y, 358, 298 + extra, 0.28, 0, ctx => box(ctx, 0, 0, 358, 298 + extra, 15, '#f2f2f2'));
  add(`${id}-identity`, 32, y + 16, 326, 40, 0.5, 1, ctx => {
    if (mystery) {
      circle(ctx, 20, 20, 20, BRAND.lilac); circle(ctx, 20, 20, 17, BRAND.ink);
      symbol(ctx, 'glasses', 20, 20, '#fff', 23);
      text(ctx, 'Mystery pick', 50, 17, 17, 600); text(ctx, 'Someone in your group', 50, 36, 12, 400, BRAND.gray);
    } else {
      avatar(ctx, 20, 20, 20); text(ctx, 'lena', 50, 17, 17, 600);
      text(ctx, 'Today, 09:41', 50, 36, 12, 400, BRAND.gray); symbol(ctx, 'more', 310, 14, BRAND.gray);
    }
  });
  if (mystery) add(`${id}-guess`, 32, y + 66, 326, 91, 0.85, 2, ctx => {
    box(ctx, 0.5, 0.5, 325, 90, 18, '#eeebfa', '#dcd5fa');
    text(ctx, "Who's behind the shades?", 14, 26, 17, 600);
    text(ctx, 'Reveals in 8 h · One guess each.', 14, 46, 12, 500, BRAND.lilac);
    ['lena', 'max', 'anna'].forEach((name, i) => {
      box(ctx, 14 + i * 94, 56, 84, 26, 13, '#fff', '#ddd5f8');
      circle(ctx, 28 + i * 94, 69, 10, BRAND.lilac);
      text(ctx, name[0].toUpperCase(), 28 + i * 94, 73, 11, 700, '#fff', 'center');
      text(ctx, name, 44 + i * 94, 74, 12, 600);
    });
  });
  const top = y + 66 + extra;
  add(`${id}-cover`, 32, top, 76, 76, 0.76, 2, ctx => {
    // The native SongCover placeholder; no invented artwork or external requests.
    box(ctx, 0, 0, 76, 76, 14, '#dedee0'); symbol(ctx, 'note', 38, 38, '#88888c', 28);
  });
  add(`${id}-track`, 122, top + 5, 172, 66, 0.57, 1, ctx => {
    text(ctx, mystery ? 'Night Drive' : 'Midnight City', 0, 17, 17, 600);
    text(ctx, mystery ? 'Chromatics' : 'M83', 0, 38, 15, 400, BRAND.gray);
    text(ctx, mystery ? 'Night Drive · 2007' : "Hurry Up… · 2011", 0, 57, 12, 400, BRAND.gray);
  });
  add(`${id}-play`, 310, top + 14, 48, 48, 1.08, 3, ctx => {
    circle(ctx, 24, 24, 24, BRAND.ink); symbol(ctx, 'play', 25, 24, '#fff', 19);
  });
  add(`${id}-scrubber`, 32, top + 88, 326, 32, 0.66, 2, ctx => {
    box(ctx, 0, 5, 326, 4, 2, '#d9d9d9'); box(ctx, 0, 5, 4, 4, 2, BRAND.ink);
    text(ctx, '0:00', 0, 28, 11, 400, BRAND.gray); text(ctx, '0:30', 326, 28, 11, 400, BRAND.gray, 'right');
  });
  add(`${id}-listen`, 32, top + 132, 180, 38, 0.92, 3, ctx => {
    box(ctx, 0, 0, 180, 38, 19, BRAND.ink);
    line(ctx, [[15, 24], [24, 15], [17, 15]], '#fff', 1.7); line(ctx, [[24, 15], [24, 22]], '#fff', 1.7);
    text(ctx, 'Open in Spotify', 34, 24, 15, 600, '#fff');
  });
  add(`${id}-secondary`, 245, top + 130, 112, 42, 0.68, 2, ctx => {
    symbol(ctx, 'share', 26, 12, BRAND.ink, 17); text(ctx, 'Share', 26, 38, 10, 600, BRAND.ink, 'center');
    ctx.beginPath(); ctx.arc(86, 12, 9, 0, Math.PI * 2); ctx.strokeStyle = BRAND.ink; ctx.lineWidth = 1.5; ctx.stroke();
    symbol(ctx, 'more', 86, 12, BRAND.ink, 13); text(ctx, 'More', 86, 38, 10, 600, BRAND.ink, 'center');
  });
  add(`${id}-reactions`, 32, top + 188, 214, 28, 0.67, 2, ctx => {
    symbol(ctx, 'heart', 10, 14, BRAND.gray, 18); text(ctx, '8', 26, 19, 15);
    symbol(ctx, 'comment', 60, 14, BRAND.gray, 18); text(ctx, '3', 76, 19, 15);
    symbol(ctx, 'smile', 110, 14, BRAND.gray, 18); symbol(ctx, 'relay', 146, 14, BRAND.gray, 18);
  });
  add(`${id}-discovery`, 248, top + 185, 110, 32, 1.12, 4, ctx => {
    box(ctx, 0, 0, 110, 32, 16, '#fce0d9'); symbol(ctx, 'sparkles', 16, 16, BRAND.ember, 16);
    text(ctx, 'New to me', 30, 21, 12, 600, BRAND.ember);
  });
}
songCard('song', 734);
songCard('mystery', 1047, true);

// Card groups lift together: a card's details stay square to it.
const inside = (a, b) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
for (const layer of layers) {
  // The card it sits on, otherwise its name family (e.g. the four group buttons)
  const card = layers.find(other => other.level === 0 && inside(layer, other));
  layer.group = card ? card.id : layer.id.split('-')[0];
  layer.cardDepth = card ? card.depth : layer.depth;
}
for (const layer of layers) {
  const members = layers.filter(other => other.group === layer.group);
  layer.groupTop = Math.min(...members.map(m => m.y));
  layer.groupBottom = Math.max(...members.map(m => m.y + m.h));
}

export function drawChrome(ctx) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, UI.width, UI.top); ctx.fillRect(0, UI.bottom, UI.width, UI.height - UI.bottom);
  text(ctx, '9:41', 33, 34, 15, 600);
  [4, 7, 10, 13].forEach((h, i) => box(ctx, 300 + i * 4, 34 - h, 2.5, h, 1, BRAND.ink));
  ctx.strokeStyle = BRAND.ink; ctx.lineWidth = 2;
  [8, 5].forEach(r => { ctx.beginPath(); ctx.arc(329, 31, r, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); });
  circle(ctx, 329, 32, 1.5, BRAND.ink);
  box(ctx, 343, 23, 23, 11, 3, null, '#888'); box(ctx, 345, 25, 18, 7, 1.5, BRAND.ink); box(ctx, 367, 26, 2, 5, 1, '#aaa');
  box(ctx, 138, 15, 114, 31, 16, '#000');
  box(ctx, 128, 832, 134, 5, 3, BRAND.ink);
}

export function drawPreview(canvas, scroll = 0) {
  canvas.width = UI.width * 2; canvas.height = UI.height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.scale(2, 2); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, UI.width, UI.height);
  ctx.save(); ctx.beginPath(); ctx.rect(0, UI.top, UI.width, UI.bottom - UI.top); ctx.clip();
  for (const layer of layers) {
    if (layer.y + layer.h - scroll < UI.top || layer.y - scroll > UI.bottom) continue;
    ctx.save(); ctx.translate(layer.x, layer.y - scroll); layer.draw(ctx, layer.w, layer.h); ctx.restore();
  }
  ctx.restore(); drawChrome(ctx);
  return true;
}
