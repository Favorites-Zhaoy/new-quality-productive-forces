// 1.4 大事记：中轴左右交错的时间轴；中轴随滚动“生长”，每个节点链接原文
import { gsap } from '../core/scroll.js';

const MONTH = (d) => {
  const [y, m, day] = d.split('-');
  return { y, md: `${+m} 月${day ? ` ${+day} 日` : ''}` };
};

export function timeline(el, { types, data }) {
  const base = import.meta.env.BASE_URL;
  el.innerHTML = `
    <div class="tl__legend">${Object.values(types).map((t) =>
      `<span><i style="background:var(${t.color})"></i>${t.name}</span>`).join('')}</div>
    <div class="tl__track">
      <div class="tl__spine"><div class="tl__fill"></div></div>
      ${data.map((d, i) => {
        const t = types[d.type];
        const { y, md } = MONTH(d.date);
        const side = i % 2 ? 'right' : 'left';
        return `
        <div class="tl__item tl__item--${side}${d.featured ? ' is-featured' : ''}" style="--tc:var(${t.color})">
          <div class="tl__date"><b>${y}</b><span>${md}</span></div>
          <div class="tl__node"><i></i></div>
          <a class="tl__card" href="${d.url}" target="_blank" rel="noopener">
            <span class="tl__type">${t.name}</span>
            <h4>${d.title}</h4>
            <blockquote>${d.quote}</blockquote>
            <p>${d.text}</p>
            <footer>
              ${d.logo ? `<img src="${base}${d.logo}" alt="${d.publisher}" />` : `<span class="tl__pub">${d.publisher}</span>`}
              <span class="tl__more">阅读原文 ↗</span>
            </footer>
          </a>
        </div>`;
      }).join('')}
    </div>`;

  // 中轴随滚动生长
  gsap.fromTo(el.querySelector('.tl__fill'), { scaleY: 0 }, {
    scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: el.querySelector('.tl__track'), start: 'top 65%', end: 'bottom 65%', scrub: 0.4 },
  });
  // 每个节点依次出现
  el.querySelectorAll('.tl__item').forEach((item) => {
    const left = item.classList.contains('tl__item--left');
    const tl = gsap.timeline({ scrollTrigger: { trigger: item, start: 'top 78%' } });
    tl.from(item.querySelector('.tl__node'), { scale: 0, duration: 0.5, ease: 'back.out(3)' })
      .from(item.querySelector('.tl__card'), { opacity: 0, x: left ? -50 : 50, duration: 0.9, ease: 'expo.out' }, '-=0.25')
      .from(item.querySelector('.tl__date'), { opacity: 0, y: 16, duration: 0.7, ease: 'expo.out' }, '-=0.7');
  });
}
