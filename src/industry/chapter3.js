// 第三章：二十个行业。读取 public/data/industries/{code}.json，按“变化—案例—未来”三层渲染
import { loadData, color } from '../core/data.js';
import { attachStatus } from '../core/lazy.js';
import { ScrollTrigger, gsap } from '../core/scroll.js';
import { splitChars } from '../core/reveal.js';
import { KIT } from './kit.js';
import { deepHTML, initDeep } from './deep.js';
import { renderRuler } from './ruler.js';

// 深度专题：第二产业选制造业，第三产业选信息技术服务业
const DEEP = ['C', 'I'];

const SECTOR = {
  1: { name: '第一产业', c: '--c-green' },
  2: { name: '第二产业', c: '--c-blue' },
  3: { name: '第三产业', c: '--c-ochre' },
};
const NUM = ['壹', '贰', '叁'];

const esc = (s) => String(s ?? '');
const link = (name, url) => (url ? `<a href="${url}" target="_blank" rel="noopener">${esc(name)}</a>` : esc(name));

/** 构建第三章 DOM（同步等待数据，保证后续 ScrollTrigger 位置正确） */
export async function buildChapter3() {
  const { data: list } = await loadData('industries.json');
  const results = await Promise.allSettled(list.map((d) => loadData(`industries/${d.code}.json`)));
  const inds = list.map((d, i) => ({ ...d, ...(results[i].status === 'fulfilled' ? results[i].value : {}), ready: results[i].status === 'fulfilled' }));
  const deeps = await Promise.allSettled(DEEP.map((c) => loadData(`deep/${c}.json`)));
  DEEP.forEach((c, k) => { if (deeps[k].status === 'fulfilled') inds.find((d) => d.code === c).deep = deeps[k].value; });

  // 深度专题排在最前，其余门类按代码顺序
  const featured = DEEP.map((c) => inds.find((d) => d.code === c)).filter((d) => d.deep);
  const rest = inds.filter((d) => !d.deep);
  const ruler = await loadData('industry_ruler.json');
  renderRuler(document.getElementById('ind-wall'), ruler, inds);
  attachStatus(document.getElementById('ind-wall'), ruler.meta);
  renderRail([...featured, ...rest]);
  const body = document.getElementById('ind-body');
  body.innerHTML = featured.map(sectionHTML).join('')
    + `<header class="ind-rest-head"><span>其余 ${rest.length} 个门类</span><p>同样采用“最明显的变化 · 最新真实案例 · 未来发展方向”三层结构。</p></header>`
    + rest.map(sectionHTML).join('');
  return inds;
}

/** DOM 就绪后再挂动画、图表与粒子 */
export function initChapter3(inds, particles) {

  inds.forEach((ind) => {
    const sec = document.getElementById(`ind-${ind.code}`);
    if (!sec) return;
    if (ind.meta) attachStatus(sec.querySelector('.ind-src-anchor'), ind.meta);
    if (ind.deep) initDeep(sec.querySelector('.deep'), ind.deep);

    // 头部入场
    const head = sec.querySelector('.ind-head');
    const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 75%' } });
    tl.from(head.querySelector('.ind-letter'), { xPercent: -30, opacity: 0, duration: 1.2, ease: 'expo.out' })
      .from(splitChars(head.querySelector('h3')), { opacity: 0, y: 30, duration: 0.8, ease: 'expo.out', stagger: 0.03 }, '-=0.9')
      .from(head.querySelectorAll('.ind-sector, .ind-lede, .ind-headline'), { opacity: 0, y: 20, duration: 0.8, ease: 'expo.out', stagger: 0.1 }, '-=0.6');
    gsap.fromTo(head.querySelector('.ind-letter'), { yPercent: 20 }, {
      yPercent: -35, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    const hn = head.querySelector('.ind-headline [data-count]');
    if (hn) countUp(hn, head);

    // 粒子组成行业代表字
    if (particles && ind.glyph) {
      const slot = head.querySelector('.ind-glyph');
      const on = () => {
        particles.setSpin(0);
        particles.morphTo(`glyph:${ind.glyph}`, 1.6);
        particles.anchor(slot, 0.95);
        particles.show(true, 0.8, 0.85, `ind-${ind.code}`);
      };
      ScrollTrigger.create({
        trigger: head, start: 'top 60%', end: 'bottom 25%',
        onEnter: on, onEnterBack: on,
        onLeave: () => particles.show(false, 0.5, 1, `ind-${ind.code}`), onLeaveBack: () => particles.show(false, 0.5, 1, `ind-${ind.code}`),
      });
    }

    // 案例、未来方向入场
    if (!ind.ready) return;
    if (sec.querySelector('.ind-cases')) gsap.from(sec.querySelectorAll('.case'), {
      opacity: 0, y: 50, rotate: (i) => (i % 2 ? 2 : -2), duration: 1, ease: 'expo.out', stagger: 0.12,
      scrollTrigger: { trigger: sec.querySelector('.ind-cases'), start: 'top 85%' },
    });
    if (sec.querySelector('.ind-future')) gsap.from(sec.querySelectorAll('.ind-future li'), {
      opacity: 0, x: -30, duration: 0.9, ease: 'expo.out', stagger: 0.1,
      scrollTrigger: { trigger: sec.querySelector('.ind-future'), start: 'top 85%' },
    });
    gsap.from(sec.querySelectorAll('.ind-layer-title'), {
      opacity: 0, x: -20, duration: 0.8, ease: 'expo.out',
      scrollTrigger: { trigger: sec.querySelector('.ind-layer'), start: 'top 85%' },
    });
  });

  // 图表懒加载
  const specs = new Map();
  inds.forEach((ind) => (ind.change?.charts ?? []).forEach((c, i) => specs.set(`${ind.code}-${i}`, c)));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const spec = specs.get(e.target.dataset.spec);
      const fn = KIT[spec?.viz];
      if (fn) {
        try { fn(e.target, spec); } catch (err) { console.error(err); e.target.textContent = `图表加载失败：${err.message}`; }
      }
    });
  }, { rootMargin: '400px 0px' });
  document.querySelectorAll('.ind-viz[data-spec]').forEach((el) => io.observe(el));

  initRail(inds);
}

/* ---------------- 侧边导轨 ---------------- */
function renderRail(inds) {
  document.getElementById('ind-rail').innerHTML = inds.map((d) =>
    `<a href="#ind-${d.code}" data-code="${d.code}" style="--sec:var(${SECTOR[d.sector].c})"><i>${d.code}</i><span>${d.short}</span></a>`).join('');
}

function initRail(inds) {
  const rail = document.getElementById('ind-rail');
  ScrollTrigger.create({
    trigger: '#ind-body', start: 'top 50%', end: 'bottom 50%',
    onToggle: (self) => rail.classList.toggle('is-on', self.isActive),
  });
  inds.forEach((d) => {
    ScrollTrigger.create({
      trigger: `#ind-${d.code}`, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => {
        if (!self.isActive) return;
        rail.querySelectorAll('a').forEach((a) => a.classList.toggle('is-active', a.dataset.code === d.code));
      },
    });
  });
}

/* ---------------- 单个行业 ---------------- */
function sectionHTML(d) {
  const sec = SECTOR[d.sector];
  if (!d.ready) {
    return `<section class="ind" id="ind-${d.code}" style="--sec:var(${sec.c})">
      <header class="ind-head"><div class="ind-letter">${d.code}</div>
        <div class="ind-title"><span class="ind-sector">${sec.name}</span><h3>${d.name}</h3><p class="ind-lede">数据整理中</p></div>
        <div class="ind-glyph"></div></header><div class="ind-src-anchor"></div></section>`;
  }
  const h = d.headline;
  const charts = (d.change?.charts ?? []).map((c, i) => `
    <figure class="ind-chart${c.span === 2 ? ' span-2' : ''}">
      <figcaption><h5>${esc(c.title)}</h5>${c.sub ? `<p>${c.sub}</p>` : ''}</figcaption>
      <div class="ind-viz" data-spec="${d.code}-${i}" style="${c.height ? `height:${c.height}px` : ''}"></div>
      <div class="chart-source">来源：${link(c.source, c.url)}${c.note ? `　<span class="note">${c.note}</span>` : ''}</div>
    </figure>`).join('');
  const cases = (d.cases ?? []).map((c) => `
    <article class="case">
      <header><time>${esc(c.date)}</time><span>${esc(c.entity)}</span></header>
      <h5>${esc(c.title)}</h5>
      <p>${esc(c.summary)}</p>
      ${c.figures?.length ? `<dl>${c.figures.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>` : ''}
      <footer>${link(c.source, c.url)}</footer>
    </article>`).join('');
  const future = (d.future ?? []).map((f, i) => `
    <li><span class="fn">${String(i + 1).padStart(2, '0')}</span>
      <div><p>${esc(f.text)}</p><cite>${link(f.source, f.url)}</cite></div></li>`).join('');

  return `
  <section class="ind${d.deep ? ' ind--deep' : ''}" id="ind-${d.code}" style="--sec:var(${sec.c})">
    <div class="ind-folio"><span>第三章 · 行业重塑${d.deep ? ' · <b>深度专题</b>' : ''}</span><span>${d.code} 版</span><span>${d.short}</span></div>
    <header class="ind-head">
      <div class="ind-letter" aria-hidden="true">${d.code}</div>
      <div class="ind-title">
        <span class="ind-sector">${d.code} · ${sec.name}</span>
        <h3>${d.name}</h3>
        <p class="ind-lede">${esc(d.lede)}</p>
        ${h ? `<div class="ind-headline">
          <b><span data-count="${esc(h.value)}">${esc(h.value)}</span><small>${esc(h.unit)}</small></b>
          <p>${esc(h.label)}</p>
          <cite>${link(h.source, h.url)}</cite>
        </div>` : ''}
      </div>
      <div class="ind-glyph" aria-hidden="true"><span>${d.glyph ?? ''}</span></div>
    </header>

    <div class="ind-layer">
      <h4 class="ind-layer-title"><i>${NUM[0]}</i>${d.deep ? `深度专题 · ${d.deep.title}` : '最明显的变化'}</h4>
      ${d.change?.text ? `<p class="ind-layer-text">${d.change.text}</p>` : ''}
      ${d.deep ? deepHTML(d.deep) : `<div class="ind-charts">${charts}</div>`}
    </div>

    ${cases ? `<div class="ind-layer">
      <h4 class="ind-layer-title"><i>${NUM[1]}</i>最新真实案例</h4>
      <div class="ind-cases">${cases}</div>
    </div>` : ''}

    ${future ? `<div class="ind-layer">
      <h4 class="ind-layer-title"><i>${NUM[2]}</i>未来发展方向</h4>
      <ol class="ind-future">${future}</ol>
    </div>` : ''}
    <div class="ind-src-anchor"></div>
  </section>`;
}

/* ---------------- 数字滚动 ---------------- */
function countUp(n, trigger) {
  const raw = n.dataset.count;
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return;
  const target = parseFloat(raw);
  const dec = (raw.split('.')[1] ?? '').length;
  const useComma = Math.abs(target) >= 10000;
  const fmt = (v) => (useComma ? Math.round(v).toLocaleString('zh-CN') : v.toFixed(dec));
  const o = { v: 0 };
  n.textContent = fmt(0);
  gsap.to(o, {
    v: target, duration: 1.8, ease: 'power3.out',
    scrollTrigger: { trigger, start: 'top 80%' },
    onUpdate: () => { n.textContent = fmt(o.v); },
  });
}

