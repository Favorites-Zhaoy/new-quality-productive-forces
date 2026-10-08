// 1.3 中国三次产业就业构成：100% 堆叠面积图 + 揭幕动画
import * as d3 from 'd3';
import { color } from '../core/data.js';
import { onResize } from '../core/lazy.js';
import { showTip, moveTip, hideTip, tipRow } from '../core/tooltip.js';
import { ScrollTrigger } from '../core/scroll.js';

export function employStack(el, { data, keys, annotations }) {
  const m = { top: 24, right: 120, bottom: 36, left: 48 };
  let W = 0, H = 0, revealed = false, entered = false;
  const uid = `emp-${Math.random().toString(36).slice(2, 7)}`;
  const svg = d3.select(el).append('svg');
  const clipRect = svg.append('clipPath').attr('id', uid).append('rect');
  const gGrid = svg.append('g').attr('class', 'grid');
  const gLayers = svg.append('g').attr('clip-path', `url(#${uid})`);
  const gX = svg.append('g').attr('class', 'axis');
  const gY = svg.append('g').attr('class', 'axis');
  const gAnn = svg.append('g');
  const gLabels = svg.append('g');
  const focus = svg.append('line').attr('stroke', color('--ink')).attr('stroke-width', 1).style('display', 'none');
  const overlay = svg.append('rect').attr('fill', 'transparent');

  const stack = d3.stack().keys(keys.map((k) => k.key));
  const series = stack(data);
  const x = d3.scaleLinear();
  const y = d3.scaleLinear().domain([0, 100]);

  function render() {
    const narrow = W < 640;
    m.right = narrow ? 16 : 120;
    x.domain(d3.extent(data, (d) => d.year)).range([m.left, W - m.right]);
    y.range([H - m.bottom, m.top]);
    clipRect.attr('x', m.left).attr('y', 0).attr('height', H).attr('width', revealed ? W : 0);

    const areaGen = d3.area().x((d) => x(d.data.year)).y0((d) => y(d[0])).y1((d) => y(d[1])).curve(d3.curveMonotoneX);
    gLayers.selectAll('path').data(series).join('path')
      .attr('d', areaGen)
      .attr('fill', (d, i) => color(keys[i].color))
      .attr('fill-opacity', 0.82)
      .attr('stroke', color('--paper'))
      .attr('stroke-width', 1.5);

    gX.attr('transform', `translate(0,${H - m.bottom})`)
      .call(d3.axisBottom(x).ticks(narrow ? 5 : 10).tickFormat(d3.format('d')).tickSizeOuter(0));
    gY.attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}%`).tickSize(0).tickPadding(8));
    gGrid.attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.left - m.right)).tickFormat(''));

    // 右侧标签（末年数值）
    const last = data.at(-1);
    gLabels.selectAll('g').data(narrow ? [] : series).join((en) => {
      const g = en.append('g');
      g.append('text').attr('class', 'label-strong');
      g.append('text').attr('class', 'label').attr('dy', 16);
      return g;
    })
      .attr('transform', (s) => `translate(${W - m.right + 12},${y((s.at(-1)[0] + s.at(-1)[1]) / 2)})`)
      .call((g) => {
        g.select('.label-strong').text((s, i) => keys[i].name).attr('fill', (s, i) => color(keys[i].color));
        g.select('.label').text((s) => `${last[s.key]}%（${last.year}）`);
      });

    // 年份注释
    const ann = gAnn.selectAll('g').data(annotations).join((en) => {
      const g = en.append('g');
      g.append('line').attr('class', 'annot-line').attr('stroke-dasharray', '2 3').attr('stroke', color('--paper-2'));
      g.append('text').attr('class', 'annot');
      return g;
    });
    ann.select('line').attr('x1', (d) => x(d.year)).attr('x2', (d) => x(d.year)).attr('y1', m.top).attr('y2', H - m.bottom)
      .attr('stroke', color('--paper-2')).attr('opacity', 0.9);
    ann.select('text').attr('x', (d) => x(d.year) + 6).attr('y', (d, i) => m.top + 18 + i * 20)
      .attr('fill', color('--paper-2')).style('font-weight', 700).text((d) => `${d.year} ${d.text}`);

    overlay.attr('x', m.left).attr('y', m.top).attr('width', W - m.left - m.right).attr('height', H - m.top - m.bottom);
  }

  const bis = d3.bisector((d) => d.year).center;
  overlay
    .on('pointermove', (ev) => {
      const [px] = d3.pointer(ev);
      const d = data[bis(data, x.invert(px))];
      focus.style('display', null).attr('x1', x(d.year)).attr('x2', x(d.year)).attr('y1', m.top).attr('y2', H - m.bottom);
      showTip(`<b>${d.year} 年</b>${keys.slice().reverse().map((k) => tipRow(k.name, `${d[k.key]}%`, color(k.color))).join('')}`, ev);
      moveTip(ev);
    })
    .on('pointerleave', () => { focus.style('display', 'none'); hideTip(); });

  const reveal = () => {
    if (revealed || !entered || !W) return;
    revealed = true;
    clipRect.transition().duration(2400).ease(d3.easeCubicInOut).attr('width', W);
  };
  onResize(el, (w, h) => { W = w; H = h; svg.attr('viewBox', `0 0 ${W} ${H}`); render(); reveal(); });

  ScrollTrigger.create({
    trigger: el, start: 'top 70%', once: true,
    onEnter: () => { entered = true; reveal(); },
  });
}
