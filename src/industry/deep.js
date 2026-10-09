// 第三章深度专题：一个专题由若干“幕”组成；每幕左侧叙述分步滚动，右侧图形 sticky 固定并随步骤更新
import * as d3 from 'd3';
import { color, fmt } from '../core/data.js';
import { ScrollTrigger } from '../core/scroll.js';
import { showTip, moveTip, hideTip } from '../core/tooltip.js';
import { VIZ_MORE } from './deepMore.js';
import { VIZ_MFG } from './deepMfg.js';

const esc = (s) => String(s ?? '');
const link = (name, url) => (url ? `<a href="${url}" target="_blank" rel="noopener">${esc(name)}</a>` : esc(name));

/** 生成专题 DOM（同步） */
export function deepHTML(spec) {
  return `<div class="deep">${spec.acts.map((a, k) => `
    <section class="act" data-act="${k}">
      <div class="act__graphic"><div class="act__viz" data-viz="${a.viz}"></div>
        <div class="act__src">来源：${link(a.source, a.url)}${a.note ? `<span class="note">　${a.note}</span>` : ''}</div>
      </div>
      <div class="act__steps">
        <header class="act__head"><span class="act__no">第 ${'一二三四五六七八'[k]} 幕</span><h4>${a.title}</h4></header>
        ${a.steps.map((s, i) => `<div class="act__step" data-step="${i}"><p>${s}</p></div>`).join('')}
      </div>
    </section>`).join('')}</div>`;
}

/** DOM 就绪后挂载图形与步骤触发 */
export function initDeep(root, spec) {
  root.querySelectorAll('.act').forEach((actEl, k) => {
    const act = spec.acts[k];
    const vizEl = actEl.querySelector('.act__viz');
    const fn = VIZ[act.viz] ?? VIZ_MORE[act.viz] ?? VIZ_MFG[act.viz];
    if (!fn) { vizEl.textContent = `未知图形：${act.viz}`; return; }
    let inst = null, cur = 0;
    const stepEls = [...actEl.querySelectorAll('.act__step')];
    const mount = () => {
      inst?.destroy?.();
      vizEl.innerHTML = '';
      inst = fn(vizEl, act.data, act);
      inst.step?.(cur, false);
      stepEls.forEach((el, i) => el.classList.toggle('is-on', i === cur));
    };
    // 进入视口附近才绘制
    ScrollTrigger.create({ trigger: actEl, start: 'top 140%', once: true, onEnter: mount });
    let lastW = 0;
    new ResizeObserver(() => { const w = vizEl.clientWidth; if (inst && Math.abs(w - lastW) > 4) { lastW = w; mount(); } }).observe(vizEl);
    // 当前步骤 = 中心离视口 60% 处最近的那一步（实时测量，不依赖预先计算的触发位置）
    const pick = () => {
      const mid = window.innerHeight * 0.6;
      let best = 0, bd = Infinity;
      stepEls.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bd) { bd = d; best = i; }
      });
      stepEls.forEach((el, i) => el.classList.toggle('is-on', i === best));
      if (best !== cur) { cur = best; inst?.step?.(best, true); }
    };
    ScrollTrigger.create({ trigger: actEl, start: 'top bottom', end: 'bottom top', onUpdate: pick, onToggle: pick });
  });
}

const size = (el) => ({ W: el.clientWidth, H: el.clientHeight });

/* ================= 面积等比方块：数量级对比 ================= */
// data: { unit, items:[{label, value, color?}] }  每一步多显示一个方块，面积与数值成正比，左下角对齐
function scaleSquares(el, data) {
  const { W, H } = size(el);
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const max = d3.max(data.items, (d) => d.value);
  const side = Math.min(W - 10, H - 60);
  const s = (v) => side * Math.sqrt(v / max);
  const x0 = 4, y0 = H - 30;
  const items = data.items.slice().sort((a, b) => b.value - a.value);
  const g = svg.selectAll('g').data(items).join('g').attr('opacity', 0);
  g.append('rect').attr('x', x0).attr('y', (d) => y0 - s(d.value)).attr('width', (d) => s(d.value)).attr('height', (d) => s(d.value))
    .attr('fill', (d) => color(d.color ?? '--c-red')).attr('fill-opacity', (d, i) => (i === 0 ? 0.88 : 0.75))
    .attr('stroke', color('--paper')).attr('stroke-width', 1.5);
  g.append('text').attr('class', 'deep-lab').attr('x', (d) => x0 + s(d.value) + 8).attr('y', (d) => y0 - s(d.value) + 18)
    .text((d) => d.label);
  g.append('text').attr('class', 'deep-num').attr('x', (d) => x0 + s(d.value) + 8).attr('y', (d) => y0 - s(d.value) + 46)
    .attr('fill', (d) => color(d.color ?? '--c-red')).text((d) => `${fmt.num(d.value, 2)} ${data.unit}`);
  svg.append('text').attr('class', 'deep-note').attr('x', W - 4).attr('y', 14).attr('text-anchor', 'end').text('方块面积与数值成正比');
  // step i：显示数值最小的 i+1 个（按时间顺序）
  const order = data.items.map((d) => d.label);
  return {
    step(i, anim) {
      const vis = new Set(order.slice(0, i + 1));
      (anim ? g.transition().duration(700) : g).attr('opacity', (d) => (vis.has(d.label) ? 1 : 0));
    },
  };
}

/* ================= 实时计数器 + 数量级 ================= */
// data: { perDay, unit, label }
function liveCounter(el, data, act) {
  el.classList.add('deep-counter');
  const perSec = data.perDay / 86400;
  el.innerHTML = `
    <div class="deep-counter__wrap">
      <span class="deep-counter__label">${data.label}</span>
      <b class="deep-counter__num">0</b>
      <span class="deep-counter__unit">${data.unit}</span>
      <p class="deep-counter__note">${data.note}</p>
      <div class="deep-counter__rate">≈ 每秒 <b>${fmt.num(perSec / 1e8, 1)}</b> 亿个</div>
    </div>`;
  const num = el.querySelector('.deep-counter__num');
  const t0 = performance.now();
  const timer = d3.interval(() => {
    const n = ((performance.now() - t0) / 1000) * perSec;
    num.textContent = n >= 1e8 ? `${fmt.num(n / 1e8, 1)} 亿` : fmt.int(n);
  }, 80);
  return { step() {}, destroy: () => timer.stop() };
}

/* ================= 阶梯图 ================= */
// data: { unit, points:[{x:'2024-03', y}], annotations:[{x, text}] }
function staircase(el, data) {
  const { W, H } = size(el);
  const m = { t: 30, r: 70, b: 34, l: 44 };
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const pts = data.points.map((d) => ({ ...d, t: d3.timeParse('%Y-%m')(d.x) }));
  const x = d3.scaleTime().domain([pts[0].t, d3.timeMonth.offset(pts.at(-1).t, 2)]).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([0, d3.max(pts, (d) => d.y) * 1.1]).nice().range([H - m.b, m.t]);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(W < 500 ? 3 : 6).tickFormat(d3.timeFormat('%Y.%m')).tickSizeOuter(0));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat(d3.format('d')))
    .call((g) => g.selectAll('line').attr('stroke', color('--rule')).attr('stroke-dasharray', '2 4'));
  const area = d3.area().x((d) => x(d.t)).y0(y(0)).y1((d) => y(d.y)).curve(d3.curveStepAfter);
  const clipId = `cl-${Math.random().toString(36).slice(2, 7)}`;
  const clip = svg.append('clipPath').attr('id', clipId).append('rect').attr('x', 0).attr('y', 0).attr('height', H).attr('width', 0);
  const g = svg.append('g').attr('clip-path', `url(#${clipId})`);
  const ext = [...pts, { ...pts.at(-1), t: d3.timeMonth.offset(pts.at(-1).t, 2) }];
  g.append('path').attr('d', area(ext)).attr('fill', color('--c-red')).attr('fill-opacity', 0.16);
  g.append('path').attr('d', d3.line().x((d) => x(d.t)).y((d) => y(d.y)).curve(d3.curveStepAfter)(ext))
    .attr('fill', 'none').attr('stroke', color('--c-red')).attr('stroke-width', 2.5);
  const lab = svg.append('g').selectAll('g').data(pts).join('g').attr('opacity', 0);
  lab.append('circle').attr('cx', (d) => x(d.t)).attr('cy', (d) => y(d.y)).attr('r', 4.5).attr('fill', color('--c-red'));
  lab.append('text').attr('class', 'deep-lab').attr('x', (d) => x(d.t) + 6).attr('y', (d) => y(d.y) - 10).text((d) => d.y);
  const ann = svg.append('g').selectAll('g').data(data.annotations ?? []).join('g').attr('opacity', 0);
  ann.append('line').attr('x1', (d) => x(d3.timeParse('%Y-%m')(d.x))).attr('x2', (d) => x(d3.timeParse('%Y-%m')(d.x)))
    .attr('y1', m.t).attr('y2', H - m.b).attr('stroke', color('--ink-3')).attr('stroke-dasharray', '3 3');
  ann.append('text').attr('class', 'deep-note').attr('x', (d) => x(d3.timeParse('%Y-%m')(d.x)) + 5).attr('y', m.t + 12).text((d) => d.text);
  const reveal = data.revealAt ?? pts.map((_, i) => i);   // 每一步揭示到第几个点
  return {
    step(i, anim) {
      const k = reveal[Math.min(i, reveal.length - 1)];
      const xr = k >= pts.length - 1 ? W : x(pts[k + 1].t);
      (anim ? clip.transition().duration(900).ease(d3.easeCubicInOut) : clip).attr('width', xr);
      (anim ? lab.transition().duration(500) : lab).attr('opacity', (d, j) => (j <= k ? 1 : 0));
      (anim ? ann.transition().duration(500) : ann).attr('opacity', (d) => (d3.timeParse('%Y-%m')(d.x) <= pts[k].t ? 1 : 0));
    },
  };
}

/* ================= 百人图：普及率 ================= */
// data: { steps:[{label:'2024.06', value:16.4, text?}] }
function people(el, data) {
  const { W, H } = size(el);
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const cols = 10, rows = 10;
  const top = 90;
  const cell = Math.min((W - 10) / cols, (H - top - 10) / rows);
  const person = 'M0,-7 a3.2,3.2 0 1,0 0.01,0 M-5,8 q0,-9 5,-9 q5,0 5,9 z';
  const head = svg.append('g');
  const big = head.append('text').attr('class', 'deep-big').attr('x', 0).attr('y', 52);
  const sub = head.append('text').attr('class', 'deep-lab').attr('x', 0).attr('y', 76);
  const g = svg.append('g').attr('transform', `translate(0,${top})`);
  const icons = g.selectAll('path').data(d3.range(100)).join('path')
    .attr('d', person)
    .attr('transform', (i) => `translate(${(i % cols) * cell + cell / 2},${Math.floor(i / cols) * cell + cell / 2}) scale(${cell / 22})`)
    .attr('fill', color('--paper-4'));
  return {
    step(i, anim) {
      const s = data.steps[Math.min(i, data.steps.length - 1)];
      const n = Math.round(s.value);
      (anim ? icons.transition().duration(500).delay((j) => j * 4) : icons)
        .attr('fill', (j) => (j < n ? color('--c-red') : color('--paper-4')));
      big.text(s.big ?? `${s.value}%`).attr('fill', color('--c-red'));
      sub.text(s.label);
    },
  };
}

/* ================= 柱 + 目标线 ================= */
// data: { unit, bars:[{x, y, note?}], target:{x, y, label} }
function barsToTarget(el, data) {
  const { W, H } = size(el);
  const m = { t: 30, r: 16, b: 34, l: 50 };
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const all = [...data.bars, data.target];
  const x = d3.scaleBand().domain(all.map((d) => d.x)).range([m.l, W - m.r]).padding(0.28);
  const y = d3.scaleLinear().domain([0, data.target.y * 1.08]).range([H - m.b, m.t]);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickSizeOuter(0));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(6));
  svg.append('text').attr('class', 'deep-note').attr('x', m.l).attr('y', 14).text(data.unit);
  const bars = svg.append('g').selectAll('g').data(data.bars).join('g');
  bars.append('rect').attr('x', (d) => x(d.x)).attr('width', x.bandwidth()).attr('rx', 2).attr('y', y(0)).attr('height', 0)
    .attr('fill', (d, i) => (i === data.bars.length - 1 ? color('--c-red') : color('--c-blue')));
  bars.append('text').attr('class', 'deep-lab').attr('text-anchor', 'middle').attr('x', (d) => x(d.x) + x.bandwidth() / 2)
    .attr('y', (d) => y(d.y) - 8).text((d) => fmt.int(d.y)).attr('opacity', 0);
  const t = svg.append('g').attr('opacity', 0);
  t.append('rect').attr('x', x(data.target.x)).attr('width', x.bandwidth()).attr('y', y(data.target.y)).attr('height', y(0) - y(data.target.y))
    .attr('fill', 'none').attr('stroke', color('--c-red')).attr('stroke-dasharray', '5 4').attr('stroke-width', 2);
  t.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(data.target.y)).attr('y2', y(data.target.y))
    .attr('stroke', color('--c-red')).attr('stroke-dasharray', '2 4');
  t.append('text').attr('class', 'deep-num').attr('fill', color('--c-red')).attr('text-anchor', 'end')
    .attr('x', x(data.target.x) + x.bandwidth()).attr('y', y(data.target.y) - 10).text(`${fmt.int(data.target.y)}`);
  t.append('text').attr('class', 'deep-lab').attr('text-anchor', 'end')
    .attr('x', x(data.target.x) + x.bandwidth()).attr('y', y(data.target.y) + 20).text(data.target.label);
  const nBars = data.bars.length;
  return {
    step(i, anim) {
      const k = Math.min(nBars, (i + 1) * Math.ceil(nBars / Math.max(1, (data.stepsToTarget ?? 2) - 1)));
      const sel = anim ? bars.transition().duration(800).delay((d, j) => j * 80) : bars;
      sel.select('rect').attr('y', (d, j) => (j < k ? y(d.y) : y(0))).attr('height', (d, j) => (j < k ? y(0) - y(d.y) : 0));
      sel.select('text').attr('opacity', (d, j) => (j < k ? 1 : 0));
      (anim ? t.transition().duration(600) : t).attr('opacity', i >= (data.stepsToTarget ?? 2) - 1 ? 1 : 0);
    },
  };
}

/* ================= 单位象形：每个图标代表若干单位，按年份成列 ================= */
// data: { unitValue, unitLabel, cols:[{x:2019, y:17.7}] }
function unitColumns(el, data) {
  const { W, H } = size(el);
  const m = { t: 40, b: 34, l: 6, r: 6 };
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const counts = data.cols.map((d) => Math.round(d.y / data.unitValue));
  const maxN = d3.max(counts);
  const per = data.perCol ?? 4;                      // 每列横向排几个
  const x = d3.scaleBand().domain(data.cols.map((d) => d.x)).range([m.l, W - m.r]).padding(0.18);
  const cell = Math.min(x.bandwidth() / per, (H - m.t - m.b) / Math.ceil(maxN / per));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickSizeOuter(0));
  svg.append('text').attr('class', 'deep-note').attr('x', m.l).attr('y', 16).text(`每个方块 = ${data.unitLabel}`);
  const cols = svg.append('g').selectAll('g').data(data.cols).join('g');
  cols.each(function (d, ci) {
    const n = counts[ci];
    d3.select(this).selectAll('rect').data(d3.range(n)).join('rect')
      .attr('x', (j) => x(d.x) + (x.bandwidth() - per * cell) / 2 + (j % per) * cell + 1)
      .attr('y', (j) => H - m.b - (Math.floor(j / per) + 1) * cell + 1)
      .attr('width', cell - 2).attr('height', cell - 2).attr('rx', 1.5)
      .attr('fill', ci === data.cols.length - 1 ? color('--c-red') : color('--c-blue')).attr('opacity', 0);
  });
  const vals = cols.append('text').attr('class', 'deep-lab').attr('text-anchor', 'middle')
    .attr('x', (d) => x(d.x) + x.bandwidth() / 2)
    .attr('y', (d, ci) => H - m.b - Math.ceil(counts[ci] / per) * cell - 8).text((d) => `${d.y}`).attr('opacity', 0);
  const reveal = data.revealAt ?? data.cols.map((_, i) => i);
  return {
    step(i, anim) {
      const k = reveal[Math.min(i, reveal.length - 1)];
      cols.each(function (d, ci) {
        const r = d3.select(this).selectAll('rect');
        (anim ? r.transition().duration(300).delay((j) => j * 6) : r).attr('opacity', ci <= k ? 1 : 0);
      });
      (anim ? vals.transition().duration(400) : vals).attr('opacity', (d, ci) => (ci <= k ? 1 : 0));
    },
  };
}

/* ================= 单位格：整体中的份额（如灯塔工厂：全球 vs 中国） ================= */
// data: { steps:[{label, total, part}], partName, restName }
function shareGrid(el, data) {
  const { W, H } = size(el);
  const maxT = d3.max(data.steps, (d) => d.total);
  const top = 96;
  const cols = Math.ceil(Math.sqrt((maxT * (W - 10)) / (H - top - 10)));
  const cell = Math.min((W - 10) / cols, (H - top - 10) / Math.ceil(maxT / cols));
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const big = svg.append('text').attr('class', 'deep-big').attr('y', 50).attr('fill', color('--c-red'));
  const sub = svg.append('text').attr('class', 'deep-lab').attr('y', 76);
  const cells = svg.append('g').attr('transform', `translate(0,${top})`).selectAll('circle').data(d3.range(maxT)).join('circle')
    .attr('cx', (i) => (i % cols) * cell + cell / 2).attr('cy', (i) => Math.floor(i / cols) * cell + cell / 2)
    .attr('r', cell * 0.38).attr('fill', color('--paper-3'));
  return {
    step(i, anim) {
      const s = data.steps[Math.min(i, data.steps.length - 1)];
      (anim ? cells.transition().duration(500).delay((j) => j * 2) : cells)
        .attr('fill', (j) => (j < (s.part ?? 0) ? color('--c-red') : j < s.total ? color('--c-blue-soft') : color('--paper-3')));
      big.text(s.part != null ? `${s.part} / ${s.total}` : `${s.total}`);
      sub.text(`${s.label}　红色：${data.partName}　浅蓝：${data.restName}`);
    },
  };
}

/* ================= 对数金字塔（梯度培育） ================= */
// data: { levels:[{name, value, label}] } 自上而下：最少 → 最多
function pyramid(el, data) {
  const { W, H } = size(el);
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const n = data.levels.length;
  const lh = (H - 40) / n;
  const w = d3.scaleLog().domain([d3.min(data.levels, (d) => d.value), d3.max(data.levels, (d) => d.value)]).range([W * 0.22, W * 0.92]);
  const cx = W / 2;
  const fills = ['--c-red', '--c-ochre', '--c-blue'];
  const g = svg.selectAll('g').data(data.levels).join('g').attr('opacity', 0);
  g.append('path').attr('d', (d, i) => {
    const top = i === 0 ? w(d.value) * 0.35 : w(data.levels[i - 1].value);
    const bot = w(d.value), y0 = 10 + i * lh, y1 = y0 + lh - 6;
    return `M${cx - top / 2},${y0} L${cx + top / 2},${y0} L${cx + bot / 2},${y1} L${cx - bot / 2},${y1} Z`;
  }).attr('fill', (d, i) => color(fills[i % 3])).attr('fill-opacity', 0.85);
  g.append('text').attr('class', 'deep-num').attr('fill', color('--paper-2')).attr('text-anchor', 'middle')
    .attr('x', cx).attr('y', (d, i) => 10 + i * lh + lh / 2 - 4).text((d) => d.label);
  g.append('text').attr('class', 'deep-lab').attr('fill', color('--paper-2')).attr('text-anchor', 'middle')
    .attr('x', cx).attr('y', (d, i) => 10 + i * lh + lh / 2 + 18).text((d) => d.name);
  svg.append('text').attr('class', 'deep-note').attr('x', 0).attr('y', H - 6).text('宽度按对数刻度');
  return {
    step(i, anim) {
      // 自下而上逐层出现
      (anim ? g.transition().duration(600) : g).attr('opacity', (d, j) => (n - 1 - j <= i ? 1 : 0));
    },
  };
}

/* ================= 排名条（高亮一项） ================= */
// data: { unit, items:[{label, value}], highlight:[...], ref?:{label, value} }
function rankBars(el, data) {
  const { W, H } = size(el);
  const items = data.items.slice().sort((a, b) => b.value - a.value);
  const rowH = Math.min(34, (H - 20) / items.length);
  const labelW = Math.min(110, W * 0.26);
  const x = d3.scaleLinear().domain([0, d3.max(items, (d) => d.value)]).range([0, W - labelW - 70]);
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const hi = new Set(data.highlight ?? []);
  const g = svg.selectAll('g').data(items).join('g').attr('transform', (d, i) => `translate(0,${10 + i * rowH})`);
  g.append('text').attr('class', 'deep-lab').attr('x', labelW - 8).attr('y', rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
    .attr('fill', (d) => (hi.has(d.label) ? color('--c-red') : null)).style('font-weight', (d) => (hi.has(d.label) ? 900 : null)).text((d) => d.label);
  const bars = g.append('rect').attr('x', labelW).attr('y', 4).attr('height', rowH - 8).attr('rx', 2)
    .attr('fill', (d) => (hi.has(d.label) ? color('--c-red') : color('--c-blue-soft'))).attr('width', 0);
  const vals = g.append('text').attr('class', 'deep-lab').attr('y', rowH / 2).attr('dy', '0.35em')
    .attr('x', (d) => labelW + x(d.value) + 6).text((d) => fmt.int(d.value)).attr('opacity', 0);
  if (data.ref) {
    const rx = labelW + x(data.ref.value);
    svg.append('line').attr('x1', rx).attr('x2', rx).attr('y1', 4).attr('y2', 10 + items.length * rowH).attr('stroke', color('--ink-2')).attr('stroke-dasharray', '3 3');
    svg.append('text').attr('class', 'deep-note').attr('x', rx + 4).attr('y', 10 + items.length * rowH + 14).text(`${data.ref.label} ${data.ref.value}`);
  }
  g.on('pointerenter', (ev, d) => showTip(`<b>${d.label}</b><div>${fmt.int(d.value)} ${data.unit}</div>`, ev)).on('pointermove', moveTip).on('pointerleave', hideTip);
  return {
    step(i, anim) {
      const on = i >= (data.showAt ?? 0);
      (anim ? bars.transition().duration(900).delay((d, j) => j * 50) : bars).attr('width', (d) => (on ? x(d.value) : 0));
      (anim ? vals.transition().delay(600) : vals).attr('opacity', on ? 1 : 0);
    },
  };
}

export const VIZ = { scaleSquares, liveCounter, staircase, people, barsToTarget, unitColumns, shareGrid, pyramid, rankBars };
