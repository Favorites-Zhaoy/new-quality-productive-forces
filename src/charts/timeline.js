// 1.4 大事记：仿报纸的蓝色日期标签时间轴
import { gsap } from '../core/scroll.js';

export function timeline(el, { data }) {
  el.innerHTML = data.map((d) => `
    <li>
      <time>${d.date.replace(/-/g, ' · ')}</time>
      <p>${d.text}</p>
    </li>`).join('');
  gsap.from(el.children, {
    opacity: 0, x: -24, duration: 0.9, ease: 'expo.out', stagger: 0.12,
    scrollTrigger: { trigger: el, start: 'top 80%' },
  });
}
