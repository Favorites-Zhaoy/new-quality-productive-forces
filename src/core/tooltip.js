// 全局悬停提示
const el = () => document.getElementById('tooltip');

export function showTip(html, event) {
  const t = el();
  t.innerHTML = html;
  t.classList.add('is-on');
  moveTip(event);
}

export function moveTip(event) {
  const t = el();
  const pad = 12;
  const w = t.offsetWidth;
  let x = event.clientX;
  x = Math.max(w / 2 + pad, Math.min(window.innerWidth - w / 2 - pad, x));
  let y = event.clientY;
  // 太靠近顶部时显示在指针下方
  const below = y - t.offsetHeight - 24 < 0;
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;
  t.style.transform = below ? 'translate(-50%, 18px)' : 'translate(-50%, calc(-100% - 14px))';
}

export function hideTip() {
  el().classList.remove('is-on');
}

/** 生成提示行 */
export const tipRow = (k, v, swatch) =>
  `<div class="tt-row"><span class="tt-k">${swatch ? `<i class="tt-sw" style="background:${swatch}"></i>` : ''}${k}</span><span>${v}</span></div>`;
