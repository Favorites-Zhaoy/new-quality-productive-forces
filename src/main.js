// 入口：加载 → 平滑滚动 → 粒子 → 章节 → 懒加载图表
import { initScroll, gsap, ScrollTrigger } from './core/scroll.js';
import { initNav } from './core/nav.js';
import { heroIntro, initReveals } from './core/reveal.js';
import { lazyCharts } from './core/lazy.js';
import { ParticleField } from './three/particles.js';
import { initEras } from './sections/eras.js';
import { initCard } from './sections/card.js';
import { initMethod } from './sections/method.js';
import { buildChapter3, initChapter3 } from './industry/chapter3.js';

import { gdpCurve } from './charts/gdpCurve.js';
import { employStack } from './charts/employStack.js';
import { timeline } from './charts/timeline.js';
import { factorSankey } from './charts/factorSankey.js';
import { fiveDims } from './charts/fiveDims.js';
import { industryCompass } from './charts/industryCompass.js';
import { impactPanel } from './charts/impactPanel.js';
import { impactHeatmap } from './charts/impactHeatmap.js';
import { riskEnergy, riskJobs } from './charts/risks.js';
import { dayClock } from './charts/dayClock.js';
import { jobSunburst } from './charts/jobSunburst.js';

// data-chart 名称 → 绘制函数
const CHARTS = {
  gdpCurve, employStack, timeline, factorSankey, fiveDims, industryCompass,
  impactPanel, impactHeatmap, riskEnergy, riskJobs, dayClock, jobSunburst,
};

async function boot() {
  const lenis = initScroll();
  lenis.stop();
  window.scrollTo(0, 0);

  const bar = document.querySelector('.loader__bar span');
  gsap.to(bar, { width: '70%', duration: 1.2, ease: 'power2.out' });
  await Promise.race([
    Promise.all([
      document.fonts.ready,
      document.fonts.load('900 64px "Noto Serif SC"', '人'),
    ]),
    new Promise((r) => setTimeout(r, 3000)),
  ]);

  // 第三章 DOM 必须在创建任何 ScrollTrigger 之前生成，否则其后的触发位置会错位
  const inds = await buildChapter3().catch((err) => { console.error(err); return []; });

  // 粒子（WebGL 不可用时自动跳过）
  let particles = null;
  try {
    particles = new ParticleField(document.getElementById('particles'), {
      count: window.innerWidth < 768 ? 7000 : 14000,
    });
    particles.set('sphere');
    particles.anchor(null, 1.15, false);
    particles.setSpin(0.06);
  } catch (err) {
    console.warn('WebGL 不可用，跳过粒子效果', err);
  }

  initEras(particles); // 钉住区段需先于其后的触发器创建
  initChapter3(inds, particles);
  initNav(lenis);
  initCard();
  initMethod();
  lazyCharts(CHARTS);

  if (particles) {
    const hero = () => {
      particles.morphTo('sphere');
      particles.anchor(null, 1.15);
      particles.setSpin(0.06);
      particles.show(true, 1, 0.55);
    };
    ScrollTrigger.create({
      trigger: '#hero', start: 'top top', end: 'bottom 35%',
      onEnterBack: hero,
      onLeave: () => particles.show(false, 0.6),
    });
    const finale = () => {
      particles.setSpin(0);
      particles.morphTo('together', 2.4);
      particles.anchor(null, 0.95);
      particles.show(true, 1.2, 0.3);
    };
    ScrollTrigger.create({
      trigger: '#finale', start: 'top 50%', end: 'bottom 40%',
      onEnter: finale, onEnterBack: finale,
      onLeave: () => particles.show(false), onLeaveBack: () => particles.show(false),
    });
  }

  // 收起加载层
  gsap.to(bar, { width: '100%', duration: 0.4 });
  gsap.to('#loader', {
    opacity: 0, duration: 0.8, delay: 0.45, ease: 'power2.inOut',
    onComplete: () => document.getElementById('loader').remove(),
  });
  gsap.delayedCall(0.6, () => {
    heroIntro();
    particles?.show(true, 2.4, 0.55);
    initReveals();
    lenis.start();
  });
}

boot();
