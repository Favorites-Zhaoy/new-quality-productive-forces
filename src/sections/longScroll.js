// 1.1 四个时代，一条曲线：钉住后横向推进时间轴（1600—2025），
// 每跨过一个时代，右侧的生产力粒子变形为该时代的工具；最后镜头拉远看清全貌
import * as d3 from 'd3';
import { loadData, color, fmt } from '../core/data.js';
import { attachStatus } from '../core/lazy.js';
import { ScrollTrigger, gsap } from '../core/scroll.js';

const START = 1600;
const ERAS = [
  {
    key: 'hoe', mark: '手', name: '手工劳动', start: START, end: 1760, c: '--c-ochre', years: '— 1760',
    text: '人力与畜力是主要动力，工具是双手的延伸，一代人与下一代人的产出相差无几。',
    tags: ['劳动者：农民与工匠', '劳动资料：锄、犁、纺车', '劳动对象：土地与天然材料'],
  },
  {
    key: 'gear', mark: '机', name: '机械化 · 电气化', start: 1760, end: 1946, c: '--c-teal', years: '1760 — 1945',
    text: '蒸汽机与电力把人从繁重的体力劳动中解放出来，工厂与流水线让分工达到前所未有的规模。',
    tags: ['劳动者：产业工人', '劳动资料：蒸汽机、电动机、流水线', '劳动对象：煤炭、钢铁'],
  },
  {
    key: 'chip', mark: '数', name: '数字化', start: 1946, end: 2012, c: '--c-blue', years: '1946 — 2011',
    text: '计算机与互联网让信息可以被存储、传输和计算，生产管理与协作进入“比特”时代。',
    tags: ['劳动者：知识工作者', '劳动资料：计算机、互联网、软件', '劳动对象：信息'],
  },
  {
    key: 'neural', mark: '智', name: '智能化', start: 2012, end: 2025, c: '--c-red', years: '2012 —',
    text: '深度学习与大模型让机器具备感知、理解与生成能力，工具第一次开始参与“思考”。',
    tags: ['劳动者：人机协同的新型劳动者', '劳动资料：大模型、智能装备', '劳动对象：数据'],
  },
];
const EVENTS = [
  { year: 1769, text: '瓦特改良蒸汽机' },
  { year: 1913, text: '福特流水线' },
  { year: 1946, text: 'ENIAC' },
  { year: 1991, text: '万维网' },
  { year: 2012, text: '深度学习突破' },
];
const PAN_END = 0.82;     // 前 82% 横向推进（四个时代各占四分之一），后 18% 镜头拉远
const SCREENS = 4;        // 时间轴总长度 = 4 个画面宽

export function initLongScroll(particles) {
  const root = document.getElementById('longroll');
  const chart = root.querySelector('.longroll__chart');
  const stage = root.querySelector('.longroll__stage');
  const ui = {
    yearEl: document.getElementById('lr-year'),
    valueEl: document.getElementById('lr-value'),
    capEl: document.getElementById('lr-caption'),
    markEl: document.getElementById('lr-mark'),
    eraEl: document.getElementById('lr-era'),
    stepsEl: document.getElementById('lr-steps'),
  };

  // 底部四段进度条：随滚动连续填充，时代切换不再跳变
  ui.stepsEl.innerHTML = ERAS.map((e) => `<li style="--ec:var(${e.c})"><i><b></b></i><span>${e.name}</span></li>`).join('');
  const steps = [...ui.stepsEl.querySelectorAll('li')];
  const fills = steps.map((li) => li.querySelector('b'));
  ui.progress = (pan) => fills.forEach((b, k) => { b.style.transform = `scaleX(${Math.min(1, Math.max(0, pan * ERAS.length - k))})`; });

  // 当前时代卡片：切换时交叉淡入
  const eraHTML = (e, i) => `
    <span class="longroll__era-no" style="color:var(${e.c})">${String(i + 1).padStart(2, '0')} / ${String(ERAS.length).padStart(2, '0')}</span>
    <h4 style="color:var(${e.c})">${e.name}<small>${e.years}</small></h4>
    <p>${e.text}</p>
    <div class="era-tags">${e.tags.map((t) => `<span>${t}</span>`).join('')}</div>`;

  let api = null, progress = 0, era = -1, inView = false;
  const stageVisible = () => stage.offsetWidth > 0 && stage.offsetHeight > 0;
  const setEra = (i) => {
    if (i === era) return;
    const first = era < 0;
    era = i;
    steps.forEach((li, k) => li.classList.toggle('is-active', k === i));
    ui.markEl.textContent = ERAS[i].mark;
    ui.markEl.style.color = `var(${ERAS[i].c})`;
    if (first) ui.eraEl.innerHTML = eraHTML(ERAS[i], i);
    else {
      gsap.killTweensOf(ui.eraEl);
      gsap.to(ui.eraEl, {
        opacity: 0, y: -10, duration: 0.25, ease: 'power2.in',
        onComplete: () => {
          ui.eraEl.innerHTML = eraHTML(ERAS[i], i);
          gsap.fromTo(ui.eraEl, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
        },
      });
      gsap.fromTo(ui.markEl, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out' });
    }
    if (inView && particles && stageVisible()) particles.morphTo(ERAS[i].key);
  };
  const activate = () => {
    inView = true;
    if (!particles || !stageVisible()) return;
    particles.setSpin(0);
    particles.morphTo(ERAS[Math.max(era, 0)].key);
    particles.anchor(stage, 0.95);
    particles.show(true, 0.6, 1, 'longroll');
  };
  const deactivate = () => { inView = false; particles?.show(false, 0.6, 1, 'longroll'); };

  ScrollTrigger.create({
    trigger: root,
    pin: root.querySelector('.longroll__pin'),
    start: 'top top',
    end: () => `+=${window.innerHeight * 7}`,
    scrub: true,
    onEnter: activate, onEnterBack: activate, onLeave: deactivate, onLeaveBack: deactivate,
    onUpdate: (self) => { progress = self.progress; api?.render(progress); },
  });
  setEra(0);

  loadData('maddison_gdp.json').then((payload) => {
    attachStatus(root.querySelector('.longroll__src'), payload.meta);
    api = build(chart, payload, ui, setEra);
    api.render(progress);
    new ResizeObserver(() => { api.resize(); api.render(progress); }).observe(chart);
  });
}

function build(stage, { series }, ui, setEra) {
  const S = Object.fromEntries(series.map((s) => [s.key, s.data.filter((d) => d.x >= START).sort((a, b) => a.x - b.x)]));
  const LAST = d3.max(Object.values(S), (d) => d.at(-1).x);             // 2025
  const MPD_END = d3.max(S.world.filter((d) => !d.ext), (d) => d.x);  // 2022
  const maxUpTo = (yr) => d3.max(Object.values(S), (d) => d3.max(d.filter((p) => p.x <= yr), (p) => p.y) ?? 0);
  const valueAt = (key, yr) => {
    const d = S[key];
    if (yr < d[0].x || yr > d.at(-1).x) return null;
    const i = d3.bisector((p) => p.x).left(d, yr);
    if (d[i]?.x === yr) return d[i].y;
    const a = d[i - 1], b = d[i];
    return a.y + (b.y - a.y) * ((yr - a.x) / (b.x - a.x));
  };

  // 文案中的数字全部由数据计算
  const w = (yr) => valueAt('world', yr);
  const g1700 = Math.round((w(1700) / w(START) - 1) * 100);
  const ukX1900 = (valueAt('uk', 1900) / w(1900)).toFixed(1);
  const since1760 = Math.round(w(LAST) / w(1760));
  const before1760 = Math.round((w(1760) / w(START) - 1) * 100);
  const CAPTIONS = [
    { from: START, to: 1700, text: `${START} 年，明代中国人均 GDP 约 <b>${fmt.int(valueAt('china', START))}</b> 国际元，英国约 <b>${fmt.int(valueAt('uk', START))}</b>，世界平均约 <b>${fmt.int(w(START))}</b>。` },
    { from: 1700, to: 1760, text: `从 ${START} 年到 1700 年，世界人均 GDP 只增长了约 <b>${g1700}%</b>。<br/>工具没有变，产出也几乎没有变。` },
    { from: 1760, to: 1860, text: '1769 年，瓦特改良蒸汽机。<br/>曲线第一次抬起了头。' },
    { from: 1860, to: 1946, text: `英国率先起飞：1900 年，英国人均 GDP 已是世界平均的 <b>${ukX1900}</b> 倍。` },
    { from: 1946, to: 2012, text: '1946 年，电子计算机 ENIAC 问世。<br/>二战之后，整个世界一起加速。' },
    { from: 2012, to: MPD_END + 1, text: '2012 年，深度学习在图像识别上取得突破，<br/>人工智能进入快速发展期。' },
    { from: MPD_END + 1, to: 9999, text: `${MPD_END + 1}—${LAST} 年（细虚线）按世界银行增长率延伸。<br/>${LAST} 年，中国人均 GDP 约 <b>${fmt.int(valueAt('china', LAST))}</b> 国际元，已超过世界平均。` },
  ];
  const FINAL = `今天的世界人均 GDP，是 1760 年的约 <b>${since1760}</b> 倍；<br/>而 ${START} 年到 1760 年的一个半世纪，只增长了约 <b>${before1760}%</b>。`;

  // 滚动进度 → 年份：四个时代各占四分之一的滚动距离（横轴仍按真实年份等比例）
  const BOUNDS = [...ERAS.map((e) => e.start), LAST];
  const yearAt = (pan) => {
    const k = Math.min(ERAS.length - 1, Math.floor(pan * ERAS.length));
    const t = pan * ERAS.length - k;
    return BOUNDS[k] + (BOUNDS[k + 1] - BOUNDS[k]) * t;
  };

  const svg = d3.select(stage).append('svg');
  const defs = svg.append('defs');
  const clipId = `lr-clip-${Math.random().toString(36).slice(2, 7)}`;
  const clip = defs.append('clipPath').attr('id', clipId).append('rect');
  const view = svg.append('g');
  const gBands = view.append('g');
  const gGrid = view.append('g');
  const gAxis = view.append('g').attr('class', 'axis');
  const gEvents = view.append('g');
  const gLines = view.append('g').attr('clip-path', `url(#${clipId})`);
  const head = view.append('g');
  head.append('circle').attr('r', 16).attr('fill', color('--c-red')).attr('opacity', 0.18).attr('class', 'lr-pulse');
  head.append('circle').attr('r', 6).attr('fill', color('--c-red')).attr('stroke', color('--paper')).attr('stroke-width', 2);
  const yAxis = svg.append('g').attr('class', 'axis');
  const legend = svg.append('g');

  const paths = series.map((s) => ({
    key: s.key,
    solid: gLines.append('path').attr('fill', 'none').attr('stroke', color(s.color))
      .attr('stroke-width', s.key === 'world' ? 3.5 : 1.6).attr('opacity', s.key === 'world' ? 1 : 0.85),
    dashed: s.key === 'world'
      ? gLines.append('path').attr('fill', 'none').attr('stroke', color(s.color)).attr('stroke-width', 3).attr('stroke-dasharray', '6 6')
      : null,
    ext: gLines.append('path').attr('fill', 'none').attr('stroke', color(s.color))
      .attr('stroke-width', s.key === 'world' ? 3 : 1.6).attr('stroke-dasharray', '3 4'),
  }));
  series.forEach((s, i) => {
    const g = legend.append('g').attr('transform', `translate(${i * 86},0)`);
    g.append('rect').attr('width', 18).attr('height', s.key === 'world' ? 4 : 2).attr('y', -2).attr('fill', color(s.color));
    g.append('text').attr('class', 'label').attr('x', 24).attr('dy', '0.35em').text(s.name);
  });

  let W = 0, H = 0;
  const m = { top: 28, bottom: 34, left: 48, right: 16 };
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    legend.attr('transform', `translate(${m.left},10)`);
  }
  resize();

  const ease = d3.easeCubicInOut;
  const lineGen = (x, y) => d3.line().x((d) => x(d.x)).y((d) => y(d.y)).curve(d3.curveMonotoneX);

  function render(p) {
    if (!W) return;
    const pan = Math.min(1, p / PAN_END);
    const zoom = p <= PAN_END ? 0 : ease((p - PAN_END) / (1 - PAN_END));
    const year = Math.round(yearAt(pan));
    setEra(ERAS.findIndex((e, i) => year < e.end || i === ERAS.length - 1));
    ui.progress(pan);

    const longW = (W - m.left - m.right) * SCREENS;
    const fitW = W - m.left - m.right;
    const rangeW = longW + (fitW - longW) * zoom;
    const x = d3.scaleLinear().domain([START, LAST]).range([m.left, m.left + rangeW]);
    const anchor = zoom > 0 ? W * 0.72 + (m.left + fitW - W * 0.72) * zoom : W * 0.72;
    const tx = Math.min(0, anchor - x(zoom > 0 ? LAST : year));
    view.attr('transform', `translate(${tx},0)`);

    // y：至少 0—20000（让工业革命前保持“平直”）；数值超过后纵轴随之扩展
    const need = Math.max(20000, maxUpTo(year) * 1.08);
    const all = Math.max(20000, maxUpTo(LAST) * 1.08);
    const y = d3.scaleLinear().domain([0, need + (all - need) * zoom]).range([H - m.bottom, m.top]);

    // 时代色带
    gBands.selectAll('rect').data(ERAS).join('rect')
      .attr('x', (d) => x(d.start)).attr('width', (d) => x(d.end) - x(d.start))
      .attr('y', m.top).attr('height', H - m.top - m.bottom)
      .attr('fill', (d) => color(d.c)).attr('fill-opacity', (d, i) => (ERAS[i] && year >= d.start ? 0.13 : 0.05));
    gBands.selectAll('text').data(ERAS).join('text')
      .attr('class', 'lr-era').attr('x', (d) => Math.max(x(d.start), -tx + m.left) + 10).attr('y', m.top + 22)
      .attr('fill', (d) => color(d.c))
      .attr('opacity', (d) => (x(d.end) - x(d.start) > 90 ? 1 : 0))
      .text((d) => d.name);

    // 网格与坐标轴
    const yTicks = y.ticks(5);
    gGrid.selectAll('line').data(yTicks).join('line')
      .attr('x1', -tx).attr('x2', -tx + W).attr('y1', (d) => y(d)).attr('y2', (d) => y(d))
      .attr('stroke', color('--rule')).attr('stroke-dasharray', '2 4');
    yAxis.attr('transform', `translate(${m.left - 8},0)`)
      .call(d3.axisLeft(y).tickValues(yTicks).tickSize(0).tickFormat((d) => (d ? `${d / 1000}k` : '0')));
    yAxis.select('.domain').remove();
    const step = zoom > 0.5 ? 50 : 20;
    gAxis.attr('transform', `translate(0,${H - m.bottom})`)
      .call(d3.axisBottom(x).tickValues(d3.range(START, LAST + 1, step)).tickFormat(d3.format('d')).tickSizeOuter(0));
    gAxis.select('.domain').remove();

    // 事件标记
    const ev = gEvents.selectAll('g').data(EVENTS).join((en) => {
      const g = en.append('g');
      g.append('line').attr('stroke', color('--ink-3')).attr('stroke-dasharray', '2 3');
      g.append('text').attr('class', 'annot').attr('text-anchor', 'middle');
      return g;
    });
    ev.attr('opacity', (d) => (d.year <= year || zoom > 0 ? 1 : 0));
    ev.select('line').attr('x1', (d) => x(d.year)).attr('x2', (d) => x(d.year)).attr('y1', m.top + 36).attr('y2', H - m.bottom);
    ev.select('text').attr('x', (d) => x(d.year)).attr('y', (d, i) => m.top + 50 + (i % 2) * 16)
      .attr('opacity', 1 - Math.min(1, zoom * 3)).text((d) => `${d.year} ${d.text}`);

    // 曲线：横向只画到当前年份，纵向限制在绘图区内
    clip.attr('x', -1e5).attr('y', m.top - 6).attr('height', H - m.top - m.bottom + 12)
      .attr('width', 1e5 + (zoom > 0 ? x(LAST) + 10 : x(year)));
    paths.forEach(({ key, solid, dashed, ext }) => {
      const d = S[key];
      const gen = lineGen(x, y);
      const core = d.filter((pt) => !pt.ext);
      if (dashed) {
        dashed.attr('d', gen(core.filter((pt) => pt.x <= 1820)));
        solid.attr('d', gen(core.filter((pt) => pt.x >= 1820)));
      } else solid.attr('d', gen(core));
      ext.attr('d', gen(d.filter((pt) => pt.x >= MPD_END)));
    });

    const wy = w(year);
    head.attr('transform', `translate(${x(year)},${y(wy)})`).attr('opacity', 1 - zoom);

    ui.yearEl.textContent = zoom > 0.98 ? `${START}—${LAST}` : year;
    ui.valueEl.textContent = fmt.int(zoom > 0 ? w(LAST) : wy);

    const cap = zoom > 0.15 ? FINAL : (CAPTIONS.find((c) => year >= c.from && year < c.to) ?? CAPTIONS.at(-1)).text;
    if (ui.capEl.dataset.text !== cap) {
      ui.capEl.dataset.text = cap;
      ui.capEl.classList.remove('is-in');
      void ui.capEl.offsetWidth;
      ui.capEl.innerHTML = cap;
      ui.capEl.classList.add('is-in');
    }
  }

  return { render, resize };
}
