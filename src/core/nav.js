// 报头条：日期、版次、章节高亮、当前页面阅读进度

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export function initNav(lenis) {
  const d = new Date();
  document.getElementById('today').textContent =
    `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日　星期${WEEK[d.getDay()]}`;

  const pageNo = document.getElementById('page-no');
  const links = document.querySelectorAll('[data-nav]');
  const progress = document.getElementById('progress-bar');
  const updateProgress = () => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.transform = `scaleX(${max ? Math.min(1, window.scrollY / max) : 0})`;
  };
  const setCurrent = (sec) => {
    pageNo.textContent = sec.dataset.page;
    links.forEach((a) => {
      const current = a.dataset.nav === sec.id;
      a.classList.toggle('is-active', current);
      if (current) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    updateProgress();
  };

  // 向下滚动时收起报头条，向上时展开
  const bar = document.getElementById('topbar');
  lenis.on('scroll', ({ scroll, direction }) => {
    bar.classList.toggle('is-hidden', direction === 1 && scroll > 200);
    updateProgress();
  });
  window.addEventListener('resize', updateProgress);
  return setCurrent;
}
