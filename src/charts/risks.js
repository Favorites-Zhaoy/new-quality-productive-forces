// 4.2 风险卡片：能源消耗柱图、就业暴露华夫图
import * as d3 from 'd3';
import { color } from '../core/data.js';
import { onResize } from '../core/lazy.js';
import { ScrollTrigger } from '../core/scroll.js';

function cardShell(el, title, lede) {
  el.innerHTML = `<h4>${title}</h4><p class="label" style="color:var(--ink-2);margin:0 0 12px;font-size:14px">${lede}</p><div class="risk-controls"></div><div class="risk-viz" style="height:220px"></div>`;
  return { viz: el.querySelector('.risk-viz'), controls: el.querySelector('.risk-controls') };
}

export function riskEnergy(el, { title, lede, data, compare, meta }) {
  const { viz } = cardShell(el, title, lede);
  const svg = d3.select(viz).append('svg');
  let grown = false;

  function render(W) {
    const H = 220, m = { top: 26, bottom: 28, left: 8, right: 8 };
    svg.attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();
    const x = d3.scaleBand().domain(data.map((d) => d.label)).range([m.left, W * 0.62]).padding(0.35);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.value) * 1.12]).range([H - m.bottom, m.top]);
    const fills = [color('--c-ochre'), color('--c-red')];

    const bars = svg.selectAll('rect').data(data).join('rect')
      .attr('x', (d) => x(d.label)).attr('width', x.bandwidth()).attr('rx', 3)
      .attr('fill', (d, i) => fills[i])
      .attr('y', grown ? (d) => y(d.value) : y(0)).attr('height', grown ? (d) => y(0) - y(d.value) : 0);
    const vals = svg.selectAll('text.v').data(data).join('text').attr('class', 'label-strong v')
      .attr('x', (d) => x(d.label) + x.bandwidth() / 2).attr('text-anchor', 'middle')
      .attr('y', (d) => y(d.value) - 8).attr('opacity', grown ? 1 : 0)
      .text((d) => `${d.value} ${meta.unit}`);
    svg.selectAll('text.l').data(data).join('text').attr('class', 'label l')
      .attr('x', (d) => x(d.label) + x.bandwidth() / 2).attr('text-anchor', 'middle').attr('y', H - 8).text((d) => d.label);

    // 对比线
    const cy = y(compare.value);
    svg.append('line').attr('class', 'annot-line').attr('stroke-dasharray', '3 3')
      .attr('x1', x(data.at(-1).label) + x.bandwidth()).attr('x2', W * 0.66).attr('y1', cy).attr('y2', cy);
    svg.append('text').attr('class', 'annot').attr('x', W * 0.67).attr('y', cy).attr('dy', '0.35em')
      .call((t) => {
        const words = compare.label.match(/.{1,7}/g);
        words.forEach((w, i) => t.append('tspan').attr('x', W * 0.67).attr('dy', i ? 16 : 0).text(w));
      });
    const ratio = (data.at(-1).value / data[0].value).toFixed(1);
    svg.append('text').attr('x', W * 0.67).attr('y', y(data[0].value)).attr('fill', color('--c-red'))
      .style('font-family', 'var(--f-serif)').style('font-weight', 900).style('font-size', '30px').text(`×${ratio}`);

    if (!grown) {
      ScrollTrigger.create({
        trigger: el, start: 'top 80%', once: true,
        onEnter: () => {
          grown = true;
          bars.transition().duration(1200).delay((d, i) => i * 250).ease(d3.easeCubicOut)
            .attr('y', (d) => y(d.value)).attr('height', (d) => y(0) - y(d.value));
          vals.transition().delay(900).duration(400).attr('opacity', 1);
        },
      });
    }
  }
  onResize(viz, (w) => render(w));
}

export function riskJobs(el, { title, lede, data }) {
  const { viz, controls } = cardShell(el, title, lede);
  controls.innerHTML = `<div class="seg" style="margin-bottom:10px">${data.map((d, i) =>
    `<button class="${i ? '' : 'is-on'}" data-i="${i}">${d.label}</button>`).join('')}</div>`;
  const svg = d3.select(viz).append('svg');
  let pick = 0, shown = false, cells, big;

  function render(W) {
    const H = 220;
    svg.attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();
    const size = Math.min(20, (H - 10) / 10);
    const gap = 3;
    cells = svg.append('g').selectAll('rect').data(d3.range(100)).join('rect')
      .attr('x', (i) => (i % 10) * (size + gap)).attr('y', (i) => Math.floor(i / 10) * (size + gap))
      .attr('width', size).attr('height', size).attr('rx', 2);
    const gx = 10 * (size + gap) + 24;
    big = svg.append('text').attr('x', gx).attr('y', 70).attr('fill', color('--c-red'))
      .style('font-family', 'var(--f-serif)').style('font-weight', 900).style('font-size', '56px');
    svg.append('text').attr('class', 'label').attr('x', gx).attr('y', 100).text('/ 100 个就业岗位');
    svg.append('text').attr('class', 'annot').attr('x', gx).attr('y', 140)
      .call((t) => ['“暴露”不等于“被替代”', '更多岗位将被改造'].forEach((s, i) => t.append('tspan').attr('x', gx).attr('dy', i ? 18 : 0).text(s)));
    paint(shown ? 0 : null);
  }
  function paint(dur = 600) {
    if (!cells) return;
    const v = data[pick].value;
    big.text(v);
    const sel = dur === null ? cells : cells.transition().duration(dur).delay((i) => i * 6);
    sel.attr('fill', (i) => (dur !== null && i < v ? color('--c-red') : color('--paper-3')));
  }
  controls.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    controls.querySelectorAll('button').forEach((o) => o.classList.toggle('is-on', o === b));
    pick = +b.dataset.i;
    paint();
  }));
  onResize(viz, (w) => render(w));
  ScrollTrigger.create({ trigger: el, start: 'top 80%', once: true, onEnter: () => { shown = true; paint(); } });
}
