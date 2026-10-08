// 2.1 生产要素桑基图：传统要素 + 数据 → 人工智能 → 新质生产力三要素 → 全要素生产率
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { color } from '../core/data.js';
import { onResize } from '../core/lazy.js';
import { showTip, moveTip, hideTip } from '../core/tooltip.js';
import { ScrollTrigger } from '../core/scroll.js';

export function factorSankey(el, { nodes, links, columns }) {
  let W = 0, H = 0, shown = false;
  const uid = Math.random().toString(36).slice(2, 7);
  const svg = d3.select(el).append('svg');
  const defs = svg.append('defs');
  const gCols = svg.append('g');
  const gLinks = svg.append('g');
  const gNodes = svg.append('g');

  function render() {
    const narrow = W < 700;
    const m = { top: 40, right: narrow ? 8 : 150, bottom: 12, left: narrow ? 8 : 8 };
    const layout = sankey()
      .nodeId((d) => d.id)
      .nodeAlign((d) => d.col)
      .nodeWidth(narrow ? 12 : 18)
      .nodePadding(narrow ? 14 : 22)
      .extent([[m.left, m.top], [W - m.right, H - m.bottom]]);
    const graph = layout({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    });

    // 列标题
    const colX = d3.rollup(graph.nodes, (v) => v[0].x0, (d) => d.col);
    gCols.selectAll('text').data(narrow ? [] : columns).join('text')
      .attr('class', 'sankey-col-label')
      .attr('x', (d, i) => colX.get(i) ?? 0)
      .attr('y', 16)
      .text((d) => d);

    // 渐变
    defs.selectAll('linearGradient').data(graph.links).join('linearGradient')
      .attr('id', (d, i) => `sg-${uid}-${i}`)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', (d) => d.source.x1).attr('x2', (d) => d.target.x0)
      .call((g) => g.selectAll('stop').data((d) => [d.source, d.target]).join('stop')
        .attr('offset', (d, i) => (i ? '100%' : '0%'))
        .attr('stop-color', (d) => color(d.color)));

    const link = gLinks.selectAll('path').data(graph.links).join('path')
      .attr('class', 'sankey-link')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d, i) => `url(#sg-${uid}-${i})`)
      .attr('stroke-width', (d) => Math.max(1, d.width))
      .attr('stroke-opacity', 0.38);

    const node = gNodes.selectAll('g').data(graph.nodes, (d) => d.id).join((en) => {
      const g = en.append('g').attr('class', 'sankey-node');
      g.append('rect');
      g.append('text');
      return g;
    });
    node.select('rect')
      .attr('x', (d) => d.x0).attr('y', (d) => d.y0)
      .attr('width', (d) => d.x1 - d.x0).attr('height', (d) => Math.max(2, d.y1 - d.y0))
      .attr('rx', 3)
      .attr('fill', (d) => color(d.color));
    node.select('text')
      .attr('x', (d) => (d.col === 3 && narrow ? d.x0 - 6 : d.x1 + 8))
      .attr('y', (d) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => (d.col === 3 && narrow ? 'end' : 'start'))
      .attr('paint-order', 'stroke')
      .attr('stroke', color('--paper'))
      .attr('stroke-width', 4)
      .style('font-size', narrow ? '12px' : null)
      .text((d) => (narrow && d.id === 'ai' ? '人工智能' : d.name));

    // 交互：高亮与节点相关的流
    const related = (d) => new Set([d, ...d.sourceLinks, ...d.targetLinks]);
    node
      .on('pointerenter', (ev, d) => {
        const set = related(d);
        link.attr('stroke-opacity', (l) => (set.has(l) ? 0.7 : 0.08));
        node.select('rect').attr('opacity', (n) => (n === d || d.sourceLinks.some((l) => l.target === n) || d.targetLinks.some((l) => l.source === n) ? 1 : 0.3));
        showTip(`<b>${d.name}</b><div>${d.desc}</div>`, ev);
      })
      .on('pointermove', moveTip)
      .on('pointerleave', () => { link.attr('stroke-opacity', 0.38); node.select('rect').attr('opacity', 1); hideTip(); });
    link
      .on('pointerenter', function (ev, d) {
        d3.select(this).attr('stroke-opacity', 0.75);
        showTip(`<b>${d.source.name} → ${d.target.name}</b>`, ev);
      })
      .on('pointermove', moveTip)
      .on('pointerleave', function () { d3.select(this).attr('stroke-opacity', 0.38); hideTip(); });

    if (!shown) {
      link.each(function () {
        const len = this.getTotalLength();
        d3.select(this).attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len);
      });
      node.attr('opacity', 0);
    }
  }

  onResize(el, (w, h) => { W = w; H = h; svg.attr('viewBox', `0 0 ${W} ${H}`); render(); });

  ScrollTrigger.create({
    trigger: el, start: 'top 70%', once: true,
    onEnter: () => {
      shown = true;
      gNodes.selectAll('g').transition().duration(700).delay((d) => d.col * 380).attr('opacity', 1);
      gLinks.selectAll('path').transition().duration(1400).delay((d) => 300 + d.source.col * 380)
        .ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0)
        .on('end', function () { d3.select(this).attr('stroke-dasharray', null); });
    },
  });
}
