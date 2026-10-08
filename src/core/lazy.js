// 图表懒加载：进入视口附近才加载数据并绘制
import { loadData, STATUS } from './data.js';
import { ScrollTrigger } from './scroll.js';

// 图表挂载可能改变页面高度，合并刷新 ScrollTrigger
let refreshTimer = 0;
const scheduleRefresh = () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
};

/** 图表下方的“来源 + 状态”说明 */
export function attachStatus(el, meta) {
  if (!meta) return;
  const s = STATUS[meta.status] ?? STATUS.check;
  const src = document.createElement('div');
  src.className = 'chart-source';
  const link = meta.url ? ` <a href="${meta.url}" target="_blank" rel="noopener">链接</a>` : '';
  src.innerHTML = `<span class="badge ${s.cls}">${s.label}</span>　来源：${meta.source}${link}`;
  // 卡片类容器放在内部，其余放在图表后面
  const target = el.dataset.statusIn ? document.querySelector(el.dataset.statusIn) : null;
  if (target) target.appendChild(src);
  else if (el.matches('.risk-card, .panel-blue')) el.appendChild(src);
  else el.insertAdjacentElement('afterend', src);
}

export function lazyCharts(registry) {
  const mount = async (el) => {
    const fn = registry[el.dataset.chart];
    if (!fn) return console.warn('未注册的图表：', el.dataset.chart);
    try {
      const payload = el.dataset.src ? await loadData(el.dataset.src) : null;
      await fn(el, payload);
      if (!el.hasAttribute('data-nostatus')) attachStatus(el, payload?.meta);
      scheduleRefresh();
    } catch (err) {
      console.error(err);
      el.innerHTML = `<p class="chart-source">图表加载失败：${err.message}</p>`;
    }
  };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      mount(e.target);
    }
  }, { rootMargin: '300px 0px' });

  document.querySelectorAll('[data-chart]').forEach((el) => io.observe(el));
}

/** 监听容器尺寸变化，宽度变化时重绘 */
export function onResize(el, draw) {
  let lastW = 0;
  let raf = 0;
  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (Math.abs(width - lastW) < 2) return;
    lastW = width;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => draw(width, height));
  });
  ro.observe(el);
  return () => ro.disconnect();
}
