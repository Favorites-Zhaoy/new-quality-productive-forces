// 第三章 · 二十个行业，同一把尺子：沿用 5×4 数字网格，每张卡片用统一的百分数（覆盖率 / 变化幅度）
// 卡片内的迷你条使用同一刻度，可跨卡片直接比较
import { gsap } from '../core/scroll.js';
import { showTip, moveTip, hideTip } from '../core/tooltip.js';

const SECTOR = { 1: '--c-green', 2: '--c-blue', 3: '--c-ochre' };
const CAP = 100; // 变化幅度迷你条的满格（±100%），超出画箭头

export function renderRuler(root, data, inds) {
  const reach = Object.fromEntries(data.reach.map((d) => [d.code, d]));
  const change = Object.fromEntries(data.change.map((d) => [d.code, d]));
  const sign = (v) => (v > 0 ? `+${v}` : `${v}`);

  const row = (kind, d) => {
    if (!d) return '';
    if (kind === 'reach') {
      return `<div class="wm-row" data-kind="reach" data-code="${d.code}">
        <span class="wm-tag">用上</span><b class="wm-num ${d.kind === 'digital' ? 'is-digital' : ''}">${d.value}<small>%</small></b>
        <i class="wm-bar"><em class="${d.kind === 'digital' ? 'is-digital' : ''}" data-w="${d.value}"></em></i>
        <span class="wm-label">${d.label}</span></div>`;
    }
    const w = Math.min(Math.abs(d.value), CAP) / CAP * 50;
    return `<div class="wm-row" data-kind="change" data-code="${d.code}">
      <span class="wm-tag">改变</span><b class="wm-num ${d.value < 0 ? 'is-down' : 'is-up'}">${sign(d.value)}<small>%</small></b>
      <i class="wm-bar wm-bar--div"><em class="${d.value < 0 ? 'is-down' : 'is-up'}" data-w="${w}" data-dir="${d.value < 0 ? 'l' : 'r'}"></em>${Math.abs(d.value) > CAP ? '<s>»</s>' : ''}</i>
      <span class="wm-label">${d.label}</span></div>`;
  };

  root.innerHTML = `
    <header class="wall-head">
      <h3 class="ink-title">二十个行业，同一把尺子</h3>
      <p>每个门类挑出可以换算成百分数的指标：<b>用上</b>＝AI 或数字化的覆盖率，<b>改变</b>＝用上之后的变化幅度（负值为时间、成本、误差的下降）。卡片内的小条刻度一致，可直接横向比较。点击卡片进入对应行业，悬停数字查看出处。</p>
    </header>
    <div class="wall-legend">
      <span><i class="lg-ai"></i>AI 专项覆盖率</span><span><i class="lg-digital"></i>数字化覆盖率</span>
      <span><i class="lg-down"></i>下降</span><span><i class="lg-up"></i>提升</span>
      <span class="lg-note">变化条满格为 ±100%，超出以 » 表示</span>
    </div>
    <div class="wall-grid">
      ${inds.map((d) => `
        <a class="wall-card" href="#ind-${d.code}" style="--sec:var(${SECTOR[d.sector]})">
          <span class="wall-code">${d.code}</span>
          <span class="wall-name">${d.short}</span>
          ${reach[d.code] || change[d.code]
            ? `<div class="wm">${row('reach', reach[d.code])}${row('change', change[d.code])}</div>`
            : '<span class="wall-empty">暂无可比百分数</span>'}
        </a>`).join('')}
    </div>`;

  // 悬停：显示指标与出处
  const byKind = { reach, change };
  root.querySelectorAll('.wm-row').forEach((el) => {
    const d = byKind[el.dataset.kind][el.dataset.code];
    const name = inds.find((x) => x.code === d.code).short;
    const html = `<b>${d.code} · ${name}</b><div>${d.label}</div>
      <div style="font-size:18px;font-weight:900">${el.dataset.kind === 'change' ? sign(d.value) : d.value}%</div>
      ${d.note ? `<div style="color:#B9C3CC">${d.note}</div>` : ''}<div style="color:#B9C3CC">来源：${d.source}</div>`;
    el.addEventListener('pointerenter', (ev) => showTip(html, ev));
    el.addEventListener('pointermove', moveTip);
    el.addEventListener('pointerleave', hideTip);
  });

  // 入场：卡片依次浮现，小条生长
  const bars = [...root.querySelectorAll('.wm-bar em')];
  bars.forEach((b) => {
    if (b.dataset.dir === 'l') { b.style.right = '50%'; b.style.left = 'auto'; }
    if (b.dataset.dir === 'r') { b.style.left = '50%'; }
    b.style.width = '0%';
  });
  gsap.from(root.querySelectorAll('.wall-card'), {
    opacity: 0, y: 30, duration: 0.9, ease: 'expo.out', stagger: { each: 0.04, grid: 'auto', from: 'start' },
    scrollTrigger: { trigger: root, start: 'top 75%' },
  });
  gsap.to(bars, {
    width: (i, el) => `${el.dataset.w}%`, duration: 1.1, ease: 'power3.out', stagger: 0.025, delay: 0.3,
    scrollTrigger: { trigger: root, start: 'top 75%' },
  });
}
