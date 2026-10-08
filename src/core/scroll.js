// Lenis 平滑滚动 + GSAP ScrollTrigger 同步
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export let lenis = null;

export function initScroll() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  lenis = new Lenis({ lerp: reduce ? 1 : 0.09, smoothWheel: !reduce });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  if (import.meta.env.DEV) window.__lenis = lenis; // 便于自动化截图测试

  // 站内锚点交给 Lenis
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: 0, duration: 1.6 });
  });
  return lenis;
}

export { gsap, ScrollTrigger };
