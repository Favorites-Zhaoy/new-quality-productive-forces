// 七个章节共用一个文档，但一次只展示一个章节。
// 保留每章内部的自然滚动，以继续支持长卷、图表和钉住动画。
import { ScrollTrigger, setAnchorHandler } from './scroll.js';

export function initPages(lenis, setCurrent, onPageChange) {
  const sections = [...document.querySelectorAll('main > section[data-page]')];
  const sectionFor = (el) => el?.closest?.('main > section[data-page]') ?? null;
  const sidebar = document.getElementById('chapter-sidebar');
  const menuToggle = document.getElementById('chapter-menu-toggle');
  let current = null;

  const closeMenu = () => {
    sidebar?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  };
  menuToggle?.addEventListener('click', () => {
    const open = sidebar.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  const syncTriggers = () => {
    ScrollTrigger.getAll().forEach((trigger) => {
      const owner = sectionFor(trigger.trigger);
      if (!owner) return;
      if (owner === current) {
        if (!trigger.enabled) trigger.enable(false, false);
      } else if (trigger.enabled) {
        trigger.disable(true);
      }
    });
  };

  const findTarget = () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    return (id && document.getElementById(id)) || sections[0];
  };

  const show = (target, { smooth = false } = {}) => {
    const next = sectionFor(target);
    if (!next) return;
    const changed = next !== current;
    if (changed) {
      const previous = current;
      // 隐藏前还原其他章节的 pin，避免隐藏布局里的 spacer 被错误测量。
      ScrollTrigger.getAll().forEach((trigger) => {
        const owner = sectionFor(trigger.trigger);
        if (owner && owner !== next && trigger.enabled) trigger.disable(true);
      });
      sections.forEach((sec) => {
        sec.hidden = sec !== next;
        sec.classList.toggle('is-current', sec === next);
      });
      current = next;
      document.body.dataset.page = next.id;
      document.getElementById('topbar')?.classList.remove('is-hidden');
      closeMenu();
      window.scrollTo(0, 0);
      lenis.scrollTo(0, { immediate: true, force: true });
      syncTriggers();
      ScrollTrigger.refresh();
      setCurrent(next);
      onPageChange?.(next, previous);
    }
    requestAnimationFrame(() => {
      if (target !== next) {
        lenis.scrollTo(target, { immediate: !smooth, force: true, duration: 1.1 });
      } else if (!changed) {
        lenis.scrollTo(0, { immediate: !smooth, force: true, duration: 1.1 });
      }
    });
  };

  const navigate = (target, hash) => {
    if (window.location.hash !== hash) history.pushState(null, '', hash);
    closeMenu();
    show(target, { smooth: true });
  };

  // 当前章节外的 # 锚点先切章，再在该章内定位。
  setAnchorHandler(navigate);
  const restore = () => show(findTarget());
  window.addEventListener('popstate', restore);
  window.addEventListener('hashchange', restore);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // 所有章的 ScrollTrigger 已在可见布局中建立，此时才折叠非当前章。
  show(findTarget());
  // 异步图表可能追加触发器；每次重算后重新关闭隐藏章的触发器。
  ScrollTrigger.addEventListener('refresh', syncTriggers);
  return { show, refresh: () => { syncTriggers(); ScrollTrigger.refresh(); } };
}
