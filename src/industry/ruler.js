// 第三章 · 同一把尺子：把各行业的指标统一成百分数，在两个面板里横向比较
//   左：用上了多少（覆盖率 0—100%）　右：改变了多少（变化幅度，负值=下降、正值=提升）
import * as d3 from 'd3';
import { color } from '../core/data.js';
import { showTip, moveTip, hideTip } from '../core/tooltip.js';
import { ScrollTrigger, lenis } from '../core/scroll.js';

export function renderRuler(root, data, inds) {
  const nameOf = Object.fromEntries(inds.map((d) => [d.code, d.short]));
  root.innerHTML = `
    <header class="ruler-head">
      <h3 class="ink-title">二十个行业，同一把尺子</h3>
      <p>各行业的指标不同，但都可以换算成百分数：<b>AI 和数字化用上了多少</b>，以及<b>用上之后改变了多少</b>。点击任一行跳转到对应行业。</p>
    </header>
    <div class="ruler">
      <section class="ruler-panel" data-panel="reach">
        <h4><i>甲</i>用上了多少<small>覆盖率 / 渗透率</small></h4>
        <div class="ruler-legend"><span><i style="background:var(--c-red)"></i>AI 专项指标</span><span><i style="background:var(--c-blue)"></i>数字化指标</span></div>
        <div class="ruler-viz"></div>
      </section>
      <section class="ruler-panel" data-panel="change">
        <h4><i>乙</i>改变了多少<small>变化幅度</small></h4>
        <div class="ruler-legend"><span><i style="background:var(--c-teal)"></i>下降（时间、成本、误差）</span><span><i style="background:var(--c-red)"></i>提升（效率、产出、预见期）</span></div>
        <div class="ruler-viz"></div>
      </section>
    </div>
    <p class="ruler-missing">暂无可比百分数的门类：${data.missing.map((c) => `${c} ${nameOf[c]}`).join('、')}。悬停任一行可查看指标出处；部分为地方、试点或企业公布数据，已在提示中注明。</p>`;

  const go = (code) => { hideTip(); lenis?.scrollTo(`#ind-${code}`, { duration: 1.6 }); };
  const tip = (d) => `<b>${d.code} · ${nameOf[d.code]}</b><div>${d.label}</div><div style="font-size:18px;font-weight:900">${d.value > 0 && d.kind == null ? '+' : ''}${d.value}%</div>${d.note ? `<div style="color:#B9C3CC">${d.note}</div>` : ''}<div style="color:#B9C3CC">来源：${d.source}</div>`;

  const draws = [
    drawReach(root.querySelector('[data-panel="reach"] .ruler-viz'), data.reach.slice().sort((a, b) => b.value - a.value), nameOf, go, tip),
    drawChange(root.querySelector('[data-panel="change"] .ruler-viz'), data.change.slice().sort((a, b) => a.value - b.value), nameOf, go, tip),
  ];
  ScrollTrigger.create({ trigger: root, start: 'top 70%', once: true, onEnter: () => draws.forEach((f) => f()) });
}

const ROW = 46;

function rowsBase(el, items, nameOf, go, tip) {
  const W = el.clientWidth || 560;
  const H = items.length * ROW + 30;
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H);
  const labelW = 100;
  const g = svg.selectAll('g.r').data(items).join('g').attr('class', 'r').attr('transform', (d, i) => `translate(0,${i * ROW})`)
    .style('cursor', 'pointer')
    .on('click', (ev, d) => go(d.code))
    .on('pointerenter', function (ev, d) { d3.select(this).select('.r-bg').attr('opacity', 1); showTip(tip(d), ev); })
    .on('pointermove', moveTip)
    .on('pointerleave', function () { d3.select(this).select('.r-bg').attr('opacity', 0); hideTip(); });
  g.append('rect').attr('class', 'r-bg').attr('x', -6).attr('width', W + 12).attr('height', ROW - 2).attr('rx', 6)
    .attr('fill', color('--paper-2')).attr('opacity', 0);
  g.append('text').attr('class', 'r-code').attr('x', 0).attr('y', 20).text((d) => d.code);
  g.append('text').attr('class', 'r-name').attr('x', 20).attr('y', 20).text((d) => nameOf[d.code]);
  return { svg, g, W, H, labelW };
}

function drawReach(el, items, nameOf, go, tip) {
  const { svg, g, W, H, labelW } = rowsBase(el, items, nameOf, go, tip);
  const x = d3.scaleLinear().domain([0, 100]).range([labelW, W - 54]);
  [25, 50, 75, 100].forEach((v) => {
    svg.insert('line', 'g').attr('x1', x(v)).attr('x2', x(v)).attr('y1', 0).attr('y2', H - 24)
      .attr('stroke', color('--rule')).attr('stroke-dasharray', v === 50 ? '4 3' : '2 4');
    svg.append('text').attr('class', 'r-axis').attr('x', x(v)).attr('y', H - 8).attr('text-anchor', 'middle').text(`${v}%`);
  });
  g.append('rect').attr('x', labelW).attr('y', 9).attr('height', 14).attr('rx', 2).attr('width', x(100) - labelW).attr('fill', color('--paper-3'));
  const bar = g.append('rect').attr('class', 'r-bar').attr('x', labelW).attr('y', 9).attr('height', 14).attr('rx', 2).attr('width', 0)
    .attr('fill', (d) => (d.kind === 'digital' ? color('--c-blue') : color('--c-red')));
  const val = g.append('text').attr('class', 'r-val').attr('x', (d) => x(d.value) + 6).attr('y', 21)
    .attr('fill', (d) => (d.kind === 'digital' ? color('--c-blue-deep') : color('--c-red'))).text((d) => `${d.value}%`).attr('opacity', 0);
  g.append('text').attr('class', 'r-desc').attr('x', labelW).attr('y', 38).text((d) => d.label + (d.note ? `（${d.note}）` : ''));
  return () => {
    bar.transition().duration(1100).delay((d, i) => i * 60).ease(d3.easeCubicOut).attr('width', (d) => x(d.value) - labelW);
    val.transition().delay((d, i) => 700 + i * 60).duration(400).attr('opacity', 1);
  };
}

function drawChange(el, items, nameOf, go, tip) {
  const { svg, g, W, H, labelW } = rowsBase(el, items, nameOf, go, tip);
  const MAX = 120;
  const x = d3.scaleLinear().domain([-100, MAX]).range([labelW, W - 60]);
  [-100, -50, 0, 50, 100].forEach((v) => {
    svg.insert('line', 'g').attr('x1', x(v)).attr('x2', x(v)).attr('y1', 0).attr('y2', H - 24)
      .attr('stroke', v === 0 ? color('--ink-2') : color('--rule')).attr('stroke-dasharray', v === 0 ? null : '2 4');
    svg.append('text').attr('class', 'r-axis').attr('x', x(v)).attr('y', H - 8).attr('text-anchor', 'middle').text(`${v > 0 ? '+' : ''}${v}%`);
  });
  const shown = (d) => Math.min(d.value, MAX);
  const bar = g.append('rect').attr('class', 'r-bar').attr('y', 9).attr('height', 14).attr('rx', 2)
    .attr('x', x(0)).attr('width', 0)
    .attr('fill', (d) => (d.value < 0 ? color('--c-teal') : color('--c-red')));
  // 超出刻度的条（洪水预见期 +233%）画断口
  const brk = g.filter((d) => d.value > MAX).append('g').attr('opacity', 0);
  brk.append('path').attr('d', (d) => `M${x(MAX) - 10},6 l6,20 M${x(MAX) - 4},6 l6,20`).attr('stroke', color('--paper')).attr('stroke-width', 3);
  const val = g.append('text').attr('class', 'r-val').attr('y', 21)
    .attr('x', (d) => (d.value < 0 ? x(d.value) + 5 : x(shown(d)) + 6))
    .attr('text-anchor', 'start')
    .attr('fill', (d) => (d.value < 0 ? color('--paper-2') : color('--c-red')))
    .text((d) => `${d.value > 0 ? '+' : ''}${d.value}%`).attr('opacity', 0);
  g.append('text').attr('class', 'r-desc').attr('x', labelW).attr('y', 38).text((d) => d.label);
  return () => {
    bar.transition().duration(1100).delay((d, i) => i * 60).ease(d3.easeCubicOut)
      .attr('x', (d) => (d.value < 0 ? x(d.value) : x(0))).attr('width', (d) => Math.abs(x(shown(d)) - x(0)));
    val.transition().delay((d, i) => 700 + i * 60).duration(400).attr('opacity', 1);
    brk.transition().delay(1200).attr('opacity', 1);
  };
}
