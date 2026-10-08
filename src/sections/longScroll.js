// 1.1 两千年长卷：钉住后横向推进时间轴，读者亲手滚过一千七百年的“直线”，最后镜头拉远看清全貌
import * as d3 from 'd3';
import { loadData, color, fmt } from '../core/data.js';
import { attachStatus } from '../core/lazy.js';
import { ScrollTrigger } from '../core/scroll.js';

const ERAS = [
  { name: '手工劳动', start: 1, end: 1760, c: '--c-ochre' },
  { name: '机械化·电气化', start: 1760, end: 1946, c: '--c-teal' },
  { name: '数字化', start: 1946, end: 2012, c: '--c-blue' },
  { name: '智能化', start: 2012, end: 2025, c: '--c-red' },
];
const EVENTS = [
  { year: 1769, text: '瓦特改良蒸汽机' },
  { year: 1913, text: '福特流水线' },
  { year: 1946, text: 'ENIAC' },
  { year: 1991, text: '万维网' },
  { year: 2012, text: '深度学习突破' },
];
const PAN_END = 0.8;      // 前 80% 横向推进，后 20% 镜头拉远
const SCREENS = 6;        // 时间轴总长度 = 6 个画面宽

export function initLongScroll() {
  const root = document.getElementById('longroll');
  const stage = root.querySelector('.longroll__chart');
  const yearEl = document.getElementById('lr-year');
  const valueEl = document.getElementById('lr-value');
  const capEl = document.getElementById('lr-caption');
  let api = null;
  let progress = 0;

  ScrollTrigger.create({
    trigger: root,
    pin: root.querySelector('.longroll__pin'),
    start: 'top top',
    end: () => `+=${window.innerHeight * 7}`,
    scrub: true,
    onUpdate: (self) => { progress = self.progress; api?.render(progress); },
  });

  loadData('maddison_gdp.json').then((payload) => {
    attachStatus(root.querySelector('.longroll__src'), payload.meta);
    api = build(stage, payload, { yearEl, valueEl, capEl });
    api.render(progress);
    new ResizeObserver(() => { api.resize(); api.render(progress); }).observe(stage);
  });
}

function build(stage, { series }, ui) {
  const S = Object.fromEntries(series.map((s) => [s.key, s.data.slice().sort((a, b) => a.x - b.x)]));
  const LAST = d3.max(series, (s) => d3.max(s.data, (d) => d.x));       // 2025
  const MPD_END = d3.max(S.world.filter((d) => !d.ext), (d) => d.x);  // 2022
  // 某年及以前、所有序列的最大值，用于自适应纵轴
  const maxUpTo = (yr) => d3.max(series, (s) => d3.max(S[s.key].filter((d) => d.x <= yr), (d) => d.y) ?? 0);
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
  const growth1700 = Math.round((w(1700) / w(1) - 1) * 100);
  const ukX1900 = (valueAt('uk', 1900) / w(1900)).toFixed(1);
  const since1760 = Math.round(w(LAST) / w(1760));
  const CAPTIONS = [
    { from: 1, to: 400, text: `公元 1 年，罗马与汉朝并立。世界人均 GDP 约 <b>${fmt.int(w(1))}</b> 国际元。` },
    { from: 400, to: 900, text: '继续往下滚。<br/>几百年过去，曲线纹丝不动。' },
    { from: 900, to: 1250, text: `公元 1000 年，宋代中国人均约 <b>${fmt.int(valueAt('china', 1000))}</b> 国际元，领先世界；<br/>可世界平均只有 <b>${fmt.int(w(1000))}</b>。` },
    { from: 1250, to: 1550, text: '1252 年起，英国有了逐年记录（黄线）。<br/>丰年歉年，起起落落，始终在原地。' },
    { from: 1550, to: 1755, text: `到 1700 年，世界人均 GDP 只比公元 1 年高出约 <b>${growth1700}%</b>。<br/>一千七百年，几乎是一条直线。` },
    { from: 1755, to: 1860, text: '1769 年，瓦特改良蒸汽机。<br/>曲线第一次抬起了头。' },
    { from: 1860, to: 1950, text: `英国率先起飞：1900 年，英国人均 GDP 已是世界平均的 <b>${ukX1900}</b> 倍。` },
    { from: 1950, to: 2023, text: '二战之后，整个世界一起加速。' },
    { from: 2023, to: 9999, text: `${MPD_END + 1}—${LAST} 年（虚线）按世界银行增长率延伸。<br/>${LAST} 年，中国人均 GDP 约 <b>${fmt.int(valueAt('china', LAST))}</b> 国际元，已超过世界平均。` },
  ];
  const before1760 = Math.round((w(1760) / w(1) - 1) * 100);
  const FINAL = `今天的世界人均 GDP，是 1760 年的约 <b>${since1760}</b> 倍；<br/>而此前的一千七百多年，只增长了约 <b>${before1760}%</b>。`;

  const svg = d3.select(stage).append('svg');
  const defs = svg.append('defs');
  const clipId = `lr-clip-${Math.random().toString(36).slice(2, 7)}`;
  const clip = defs.append('clipPath').attr('id', clipId).append('rect');
  const view = svg.append('g');               // 平移层
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
    // 2023 年后的延伸段（世界银行增长率外推）
    ext: gLines.append('path').attr('fill', 'none').attr('stroke', color(s.color))
      .attr('stroke-width', s.key === 'world' ? 3 : 1.6).attr('stroke-dasharray', '3 4'),
  }));
  series.forEach((s, i) => {
    const g = legend.append('g').attr('transform', `translate(${i * 86},0)`);
    g.append('rect').attr('width', 18).attr('height', s.key === 'world' ? 4 : 2).attr('y', -2).attr('fill', color(s.color));
    g.append('text').attr('class', 'label').attr('x', 24).attr('dy', '0.35em').text(s.name);
  });

  let W = 0, H = 0;
  const m = { top: 24, bottom: 34, left: 56, right: 24 };
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    legend.attr('transform', `translate(${m.left},${10})`);
  }
  resize();

  const ease = d3.easeCubicInOut;
  const lineGen = (x, y) => d3.line().x((d) => x(d.x)).y((d) => y(d.y)).curve(d3.curveMonotoneX);

  function render(p) {
    if (!W) return;
    const pan = Math.min(1, p / PAN_END);
    const zoom = p <= PAN_END ? 0 : ease((p - PAN_END) / (1 - PAN_END));
    const year = Math.round(1 + pan * (LAST - 1));

    // x：长卷宽度插值到单屏宽度
    const longW = (W - m.left - m.right) * SCREENS;
    const fitW = W - m.left - m.right;
    const rangeW = longW + (fitW - longW) * zoom;
    const x = d3.scaleLinear().domain([1, LAST]).range([m.left, m.left + rangeW]);
    // 平移：推进时当前年份停在画面 72% 处；拉远时让曲线末端从 72% 平滑移到右边缘，最新的一段始终在画面里
    const anchor = zoom > 0 ? W * 0.72 + (m.left + fitW - W * 0.72) * zoom : W * 0.72;
    const tx = Math.min(0, anchor - x(zoom > 0 ? LAST : year));
    view.attr('transform', `translate(${tx},0)`);

    // y：至少 0—20000（让前一千七百年保持“平直”）；数值超过后纵轴随之扩展，拉远时容纳全部序列
    const need = Math.max(20000, maxUpTo(year) * 1.08);
    const all = Math.max(20000, maxUpTo(LAST) * 1.08);
    const yMax = need + (all - need) * zoom;
    const y = d3.scaleLinear().domain([0, yMax]).range([H - m.bottom, m.top]);

    // 时代色带
    gBands.selectAll('rect').data(ERAS).join('rect')
      .attr('x', (d) => x(d.start)).attr('width', (d) => x(d.end) - x(d.start))
      .attr('y', m.top).attr('height', H - m.top - m.bottom)
      .attr('fill', (d) => color(d.c)).attr('fill-opacity', 0.1);
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
    const step = zoom > 0.5 ? 250 : 100;
    gAxis.attr('transform', `translate(0,${H - m.bottom})`)
      .call(d3.axisBottom(x).tickValues(d3.range(100, 2001, step).concat([1])).tickFormat((d) => (d === 1 ? '公元 1 年' : `${d}`)).tickSizeOuter(0));
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

    // 曲线：推进阶段只画到当前年份
    // 裁剪：横向只画到当前年份，纵向限制在绘图区内
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

    // 当前位置光点
    const wy = w(year);
    head.attr('transform', `translate(${x(year)},${y(wy)})`).attr('opacity', 1 - zoom);

    // 大字年份与数值
    ui.yearEl.textContent = zoom > 0.98 ? `1—${LAST}` : year;
    ui.valueEl.textContent = fmt.int(zoom > 0 ? w(LAST) : wy);

    // 字幕
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
