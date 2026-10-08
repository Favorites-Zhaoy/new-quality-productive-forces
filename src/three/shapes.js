// 粒子目标形状：在 2D 画布上绘制图形，再随机采样像素点
// 返回 Float32Array(n * 3)，坐标大致落在 [-1, 1]（宽图形可超出）

function sampleCanvas(draw, n, { w = 512, h = 512, depth = 0.18 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  draw(ctx, w, h);
  const img = ctx.getImageData(0, 0, w, h).data;
  const pts = [];
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (img[(y * w + x) * 4 + 3] > 128) pts.push(x, y);
    }
  }
  const out = new Float32Array(n * 3);
  const half = h / 2;
  const count = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(Math.random() * count) * 2;
    out[i * 3]     = (pts[k] - w / 2 + (Math.random() - 0.5) * 2) / half;
    out[i * 3 + 1] = -(pts[k + 1] - half + (Math.random() - 0.5) * 2) / half;
    out[i * 3 + 2] = (Math.random() - 0.5) * depth;
  }
  return out;
}

/** 序章：松散的球壳 */
function sphere(n) {
  const out = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    const jitter = 1 + (Math.random() - 0.5) * 0.16;
    out[i * 3]     = Math.cos(t) * r * jitter;
    out[i * 3 + 1] = y * jitter;
    out[i * 3 + 2] = Math.sin(t) * r * jitter;
  }
  return out;
}

/** 手工：锄头 + 麦穗 */
function hoe(n) {
  return sampleCanvas((c, w, h) => {
    c.lineCap = 'round';
    // 锄柄
    c.lineWidth = 22;
    c.beginPath(); c.moveTo(w * 0.2, h * 0.86); c.lineTo(w * 0.7, h * 0.2); c.stroke();
    // 锄板
    c.beginPath();
    c.moveTo(w * 0.62, h * 0.2);
    c.lineTo(w * 0.86, h * 0.3);
    c.lineTo(w * 0.84, h * 0.46);
    c.lineTo(w * 0.7, h * 0.4);
    c.closePath(); c.fill();
    // 麦穗
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(w * 0.35, h * 0.92); c.quadraticCurveTo(w * 0.3, h * 0.6, w * 0.18, h * 0.38); c.stroke();
    for (let i = 0; i < 7; i++) {
      const t = i / 7;
      const x = w * (0.2 + 0.08 * t), y = h * (0.4 + 0.25 * t);
      c.beginPath(); c.ellipse(x - 14, y, 14, 7, -0.6, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(x + 10, y - 6, 14, 7, 0.6, 0, Math.PI * 2); c.fill();
    }
  }, n);
}

/** 机械化：齿轮 */
function gear(n) {
  return sampleCanvas((c, w, h) => {
    const cx = w / 2, cy = h / 2;
    const teeth = 14, rOut = w * 0.44, rIn = w * 0.36;
    c.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = (i / (teeth * 2)) * Math.PI * 2;
      const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? rOut : rIn;
      c.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
      c.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    }
    c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(cx, cy, w * 0.24, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.beginPath(); c.arc(cx, cy, w * 0.1, 0, Math.PI * 2); c.fill();
    c.lineWidth = 12;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * w * 0.25, cy + Math.sin(a) * w * 0.25); c.stroke();
    }
  }, n);
}

/** 数字化：芯片 */
function chip(n) {
  return sampleCanvas((c, w, h) => {
    const s = w * 0.5, x0 = (w - s) / 2, y0 = (h - s) / 2;
    c.lineWidth = 10;
    c.strokeRect(x0, y0, s, s);
    // 内核
    c.fillRect(x0 + s * 0.3, y0 + s * 0.3, s * 0.4, s * 0.4);
    // 引脚
    const pins = 7;
    for (let i = 0; i < pins; i++) {
      const t = x0 + s * ((i + 0.5) / pins);
      c.fillRect(t - 5, y0 - 60, 10, 50);
      c.fillRect(t - 5, y0 + s + 10, 10, 50);
      c.fillRect(x0 - 60, t - 5, 50, 10);
      c.fillRect(x0 + s + 10, t - 5, 50, 10);
    }
    // 走线
    c.lineWidth = 3;
    for (let i = 1; i < 5; i++) {
      c.beginPath(); c.moveTo(x0 + s * 0.12, y0 + s * (i / 5)); c.lineTo(x0 + s * 0.3, y0 + s * (i / 5)); c.stroke();
      c.beginPath(); c.moveTo(x0 + s * 0.7, y0 + s * (i / 5)); c.lineTo(x0 + s * 0.88, y0 + s * (i / 5)); c.stroke();
    }
  }, n);
}

/** 智能化：神经网络 */
function neural(n) {
  const layers = [4, 6, 6, 3];
  return sampleCanvas((c, w, h) => {
    const pos = layers.map((k, li) => Array.from({ length: k }, (_, i) => [
      w * (0.14 + li * (0.72 / (layers.length - 1))),
      h * (0.5 + (i - (k - 1) / 2) * 0.13),
    ]));
    c.lineWidth = 1.6;
    for (let l = 0; l < layers.length - 1; l++) {
      for (const a of pos[l]) for (const b of pos[l + 1]) {
        c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      }
    }
    for (const layer of pos) for (const [x, y] of layer) {
      c.beginPath(); c.arc(x, y, 17, 0, Math.PI * 2); c.fill();
    }
  }, n);
}

/** 结尾：“人” + 神经网络交织 */
function together(n) {
  return sampleCanvas((c, w, h) => {
    c.font = `900 ${h * 0.8}px "Noto Serif SC", serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('人', w * 0.36, h * 0.53);
    const nodes = Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * Math.PI * 2;
      return [w * 0.66 + Math.cos(a) * h * 0.22, h * 0.5 + Math.sin(a) * h * 0.3];
    });
    c.lineWidth = 2;
    nodes.forEach((a, i) => nodes.forEach((b, j) => {
      if (j > i && (j - i) % 3 === 1) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    }));
    nodes.forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill(); });
  }, n, { w: 1024, h: 512 });
}

/** 任意汉字（第三章各行业的代表字） */
export function glyph(n, ch) {
  return sampleCanvas((c, w, h) => {
    c.font = `900 ${h * 0.86}px "Noto Serif SC", serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(ch, w / 2, h * 0.54);
  }, n, { depth: 0.25 });
}

export const SHAPE_BUILDERS = { sphere, hoe, gear, chip, neural, together };
