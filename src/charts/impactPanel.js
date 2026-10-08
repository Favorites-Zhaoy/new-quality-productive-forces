// 第四章：蓝色数据版块（仿报纸“工程效益”栏），数字滚动入场
import { gsap } from '../core/scroll.js';
import { STATUS } from '../core/data.js';

export function impactPanel(el, { title, groups }) {
  el.innerHTML = `
    <h3 class="panel-blue__title">${title}</h3>
    <div class="panel-blue__grid">
      ${groups.map((g) => `
        <div class="panel-blue__item">
          <h4>${g.name}</h4>
          ${g.stats.map((s) => `
            <div class="stat" title="${STATUS[s.status]?.label ?? ''}">
              <div class="stat__num"><span data-count="${s.num}">${s.num}</span><small>${s.unit}</small></div>
              <div class="stat__label">${s.label}</div>
            </div>`).join('')}
        </div>`).join('')}
    </div>`;

  el.querySelectorAll('[data-count]').forEach((n) => {
    const target = parseFloat(n.dataset.count);
    const decimals = (n.dataset.count.split('.')[1] ?? '').length;
    const isYear = target > 1900 && target < 2100 && decimals === 0;
    if (isYear) return;
    const obj = { v: 0 };
    n.textContent = (0).toFixed(decimals);
    gsap.to(obj, {
      v: target, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 75%' },
      onUpdate: () => { n.textContent = obj.v.toFixed(decimals); },
    });
  });
  gsap.from(el.querySelectorAll('.panel-blue__item'), {
    opacity: 0, y: 30, duration: 1, ease: 'expo.out', stagger: 0.12,
    scrollTrigger: { trigger: el, start: 'top 75%' },
  });
}
