// 入场动画：逐字拆分、段落浮现
import { gsap, ScrollTrigger } from './scroll.js';

/** 把元素文字拆成逐字 span（保留内部已有的 span 结构） */
export function splitChars(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        [...child.textContent].forEach((ch) => {
          const s = document.createElement('span');
          s.className = 'char';
          s.style.display = 'inline-block';
          s.textContent = ch;
          frag.appendChild(s);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(el);
  return el.querySelectorAll('.char');
}

export function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  const mast = splitChars(document.querySelector('.masthead'));
  const q2 = splitChars(document.querySelector('.hero__q2'));
  tl.from(mast, { yPercent: 60, opacity: 0, rotate: -8, duration: 1.4, stagger: 0.09 })
    .from('.mast-en', { opacity: 0, letterSpacing: '1em', duration: 1.6 }, '-=1.1')
    .from('.hero__q1', { opacity: 0, y: 30, duration: 1 }, '-=1.2')
    .from(q2, { opacity: 0, y: 40, duration: 1, stagger: 0.06 }, '-=0.8')
    .from('.hero__sub', { opacity: 0, y: 16, duration: 1 }, '-=0.6')
    .from('.hero__foot li', { opacity: 0, y: 10, duration: 0.8, stagger: 0.06 }, '-=0.8')
    .from('.scroll-hint', { opacity: 0, duration: 1 }, '-=0.6');
  return tl;
}

export function initReveals() {
  // 章节竖排大标题：逐字落下
  document.querySelectorAll('.vtitle').forEach((t) => {
    const chars = splitChars(t);
    gsap.from(chars, {
      opacity: 0, yPercent: -40, duration: 1.1, ease: 'expo.out', stagger: 0.05,
      scrollTrigger: { trigger: t, start: 'top 80%' },
    });
  });

  document.querySelectorAll('.chapter-no, .vsub').forEach((t) => {
    gsap.from(t, { opacity: 0, y: -20, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 85%' } });
  });

  // 小节标题
  document.querySelectorAll('.block-head').forEach((h) => {
    gsap.from(h.children, {
      opacity: 0, y: 28, duration: 1, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: h, start: 'top 85%' },
    });
  });

  // 普通段落/卡片
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: 40, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // 结尾逐行浮现
  const lines = document.querySelectorAll('.finale__line');
  gsap.from(lines, {
    opacity: 0, y: 30, duration: 1.2, ease: 'expo.out', stagger: 0.35,
    scrollTrigger: { trigger: '#finale', start: 'top 60%' },
  });

  ScrollTrigger.refresh();
}
