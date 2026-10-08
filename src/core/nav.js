// 报头条：日期、版次、章节高亮、阅读进度
import { gsap, ScrollTrigger } from './scroll.js';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export function initNav(lenis) {
  const d = new Date();
  document.getElementById('today').textContent =
    `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日　星期${WEEK[d.getDay()]}`;

  // 阅读进度条
  gsap.to('#progress-bar', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
  });

  // 章节高亮 + 版次
  const pageNo = document.getElementById('page-no');
  const links = document.querySelectorAll('[data-nav]');
  document.querySelectorAll('[data-page]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => {
        if (!self.isActive) return;
        pageNo.textContent = sec.dataset.page;
        links.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === sec.id));
      },
    });
  });

  // 向下滚动时收起报头条，向上时展开
  const bar = document.getElementById('topbar');
  lenis.on('scroll', ({ scroll, direction }) => {
    bar.classList.toggle('is-hidden', direction === 1 && scroll > 200);
  });
}
