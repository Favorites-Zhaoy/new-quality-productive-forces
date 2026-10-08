// 4.1 行业 × 维度热力矩阵：可排序，右侧附合计条
import * as d3 from 'd3';
import { color, loadData } from '../core/data.js';
import { onResize } from '../core/lazy.js';
import { showTip, moveTip, hideTip, tipRow } from '../core/tooltip.js';
import { ScrollTrigger } from '../core/scroll.js';

export async function impactHeatmap(el, { dims, data }) {
  const { data: industries } = await loadData('industries.json');
  const rows = industries.map((d) => ({ ...d, v: data[d.code], sum: d3.sum(data[d.code]) }));
  const rowH = 26, headH = 46;
  el.style.height = `${headH + rows.length * rowH + 12}px`;

  const svg = d3.select(el).append('svg');
  let sortKey = 'code', shown = false, W = 0;
  const ramp = d3.scaleSequential(d3.interpolateRgbBasis([
    color('--paper-3'), color('--c-blue-soft'), color('--c-blue'), color('--c-blue-deep'),
  ])).domain([0, 5]);

  function order() {
    const sorted = rows.slice().sort((a, b) => {
      if (sortKey === 'code') return a.code.localeCompare(b.code);
      if (sortKey === 'sum') return b.sum - a.sum;
      return b.v[sortKey] - a.v[sortKey] || b.sum - a.sum;
    });
    return new Map(sorted.map((d, i) => [d.code, i]));
  }

  function render() {
    svg.attr('viewBox', `0 0 ${W} ${headH + rows.length * rowH + 12}`).selectAll('*').remove();
    const narrow = W < 600;
    const left = narrow ? 92 : 150, right = narrow ? 56 : 120;
    const cw = (W - left - right) / dims.length;
    const sumX = d3.scaleLinear().domain([0, 25]).range([0, right - 34]);
    const idx = order();

    // 列标题
    const heads = [...dims.map((d, i) => ({ key: i, label: d, x: left + cw * i + cw / 2 })),
      { key: 'sum', label: '合计', x: W - right + 10, anchor: 'start' }];
    svg.append('text').attr('class', `hm-col${sortKey === 'code' ? ' is-sorted' : ''}`)
      .attr('x', 0).attr('y', headH - 16).text(narrow ? '门类' : '门类 ↕')
      .on('click', () => { sortKey = 'code'; update(); });
    svg.selectAll('text.hm-head').data(heads).join('text')
      .attr('class', (d) => `hm-col hm-head${sortKey === d.key ? ' is-sorted' : ''}`)
      .attr('x', (d) => d.x).attr('y', headH - 16)
      .attr('text-anchor', (d) => d.anchor ?? 'middle')
      .text((d) => (narrow ? d.label : `${d.label} ↓`))
      .on('click', (ev, d) => { sortKey = d.key; update(); });

    const row = svg.selectAll('g.hm-r').data(rows, (d) => d.code).join('g').attr('class', 'hm-r')
      .attr('transform', (d) => `translate(0,${headH + idx.get(d.code) * rowH})`);
    row.append('text').attr('class', 'hm-row-code').attr('y', rowH / 2).attr('dy', '0.35em').text((d) => d.code);
    row.append('text').attr('class', 'hm-row').attr('x', 18).attr('y', rowH / 2).attr('dy', '0.35em').text((d) => d.short);

    const cell = row.selectAll('g.c').data((d) => d.v.map((v, i) => ({ v, i, r: d }))).join('g').attr('class', 'c')
      .attr('transform', (d) => `translate(${left + d.i * cw},0)`);
    cell.append('rect').attr('class', 'hm-cell').attr('width', cw).attr('height', rowH).attr('rx', 3)
      .attr('fill', (d) => ramp(d.v));
    cell.append('text').attr('x', cw / 2).attr('y', rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'middle')
      .style('font-family', 'var(--f-mono)').style('font-size', '11.5px').style('pointer-events', 'none')
      .attr('fill', (d) => (d.v >= 3 ? color('--paper-2') : color('--ink-2'))).text((d) => d.v);

    row.append('rect').attr('x', W - right + 10).attr('y', 7).attr('height', rowH - 14).attr('rx', 2)
      .attr('fill', color('--c-red')).attr('width', (d) => sumX(d.sum));
    row.append('text').attr('class', 'label').attr('x', (d) => W - right + 14 + sumX(d.sum)).attr('y', rowH / 2).attr('dy', '0.35em')
      .style('font-family', 'var(--f-mono)').style('font-size', '11px').text((d) => d.sum);

    cell.on('pointerenter', (ev, d) => {
      cell.attr('opacity', (o) => (o.r === d.r || o.i === d.i ? 1 : 0.35));
      showTip(`<b>${d.r.code} · ${d.r.name}</b>${tipRow(dims[d.i], `${d.v} / 5`)}${tipRow('合计', `${d.r.sum} / 25`)}`, ev);
    }).on('pointermove', moveTip).on('pointerleave', () => { cell.attr('opacity', 1); hideTip(); });

    if (!shown) {
      cell.attr('opacity', 0);
      ScrollTrigger.create({
        trigger: el, start: 'top 75%', once: true,
        onEnter: () => {
          shown = true;
          svg.selectAll('g.c').transition().duration(500)
            .delay((d) => (idx.get(d.r.code) + d.i) * 28).attr('opacity', 1);
        },
      });
    }

    function update() {
      const ni = order();
      svg.selectAll('g.hm-r').transition().duration(800).ease(d3.easeCubicInOut)
        .attr('transform', (d) => `translate(0,${headH + ni.get(d.code) * rowH})`);
      svg.selectAll('.hm-col').classed('is-sorted', false);
      svg.selectAll('text.hm-head').classed('is-sorted', (d) => d.key === sortKey);
      if (sortKey === 'code') svg.select('text.hm-col:not(.hm-head)').classed('is-sorted', true);
    }
  }

  onResize(el, (w) => { W = w; render(); });
}
