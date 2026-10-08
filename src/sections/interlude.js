// 逐词巨字过场：一屏一个词，随滚动依次砸下（参考 sleep-well-creatives 的排版节奏）
import { gsap } from '../core/scroll.js';

export function initInterlude(root) {
  const words = root.dataset.words.split('|');
  const hi = new Set((root.dataset.hi ?? '').split('|'));
  const pin = root.querySelector('.interlude__pin');
  const stack = root.querySelector('.interlude__words');
  const counter = root.querySelector('.interlude__count');
  const tail = root.querySelector('.interlude__tail');

  stack.innerHTML = words.map((w) => `<span class="interlude__word${hi.has(w) ? ' is-hi' : ''}">${w}</span>`).join('');
  const els = stack.querySelectorAll('.interlude__word');
  gsap.set(els, { opacity: 0, yPercent: 60, scale: 1.12, filter: 'blur(10px)' });
  if (tail) gsap.set(tail, { opacity: 0, y: 20 });

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: {
      trigger: root, pin, start: 'top top',
      end: () => `+=${window.innerHeight * (words.length * 0.7 + 0.6)}`,
      scrub: 0.6,
      onUpdate: (self) => {
        const k = Math.min(words.length, Math.floor(self.progress * (words.length + 0.6)) + 1);
        counter.textContent = `${String(k).padStart(2, '0')} / ${String(words.length).padStart(2, '0')}`;
      },
    },
  });
  els.forEach((el, i) => {
    tl.to(el, { opacity: 1, yPercent: 0, scale: 1, filter: 'blur(0px)', duration: 1 });
    if (i < els.length - 1) tl.to(el, { opacity: 0, yPercent: -50, scale: 0.92, filter: 'blur(6px)', duration: 0.8 }, '+=0.35');
  });
  if (tail) tl.to(tail, { opacity: 1, y: 0, duration: 0.8 }, '+=0.2');
  tl.to({}, { duration: 0.4 });
}
