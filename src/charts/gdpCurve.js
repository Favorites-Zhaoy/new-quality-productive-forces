// 1.1 两千年人均 GDP 曲线：时代色带 + 三种视图（两千年 / 近三百年 / 对数）
import * as d3 from 'd3';
import { color, fmt } from '../core/data.js';
import { onResize } from '../core/lazy.js';
import { showTip, moveTip, hideTip, tipRow } from '../core/tooltip.js';
import { ScrollTrigger } from '../core/scroll.js';

export function gdpCurve(el, { data, eras, annotations }) {
  const toolbar = el.previousElementSibling?.classList.contains('chart-toolbar') ? el.previousElementSibling : null;
  const m = { top: 40, right: 28, bottom: 36, left: 64 };
  let W = 0, H = 0, mode = 'all', drawn = false;
  const uid = `gdp-${Math.random().toString(36).slice(2, 7)}`;

  const svg = d3.select(el).append('svg');
  const clip = svg.append('clipPath').attr('id', uid).append('rect');
  const gBands = svg.append('g');
  const gGrid = svg.append('g').attr('class', 'grid');
  const gX = svg.append('g').attr('class', 'axis');
  const gY = svg.append('g').attr('class', 'axis');
  const plot = svg.append('g').attr('clip-path', `url(#${uid})`);
  const area = plot.append('path').attr('fill', color('--c-blue-wash')).attr('opacity', 0.75);
  const line = plot.append('path').attr('fill', 'none').attr('stroke', color('--c-blue-deep')).attr('stroke-width', 2.5);
  const gAnn = svg.append('g');
  const gNote = svg.append('g');
  const focus = svg.append('g').style('display', 'none');
  focus.append('line').attr('class', 'annot-line').attr('stroke-dasharray', '3 3');
  focus.append('circle').attr('r', 5).attr('fill', color('--c-red')).attr('stroke', color('--paper-2')).attr('stroke-width', 2);
  const overlay = svg.append('rect').attr('fill', 'transparent');

  const x = d3.scaleLinear();
  let y = d3.scaleLinear();
  const eraOf = (yr) => eras.find((e) => yr >= e.start && yr < e.end) ?? eras.at(-1);
  const valueAt = (yr) => {
    const i = d3.bisector((d) => d.year).left(data, yr);
    const a = data[Math.max(0, i - 1)], b = data[Math.min(data.length - 1, i)];
    return a === b ? a.value : a.value + (b.value - a.value) * ((yr - a.year) / (b.year - a.year));
  };

  function setScales() {
    x.domain([mode === 'modern' ? 1700 : 1, 2022]).range([m.left, W - m.right]);
    y = mode === 'log'
      ? d3.scaleLog().domain([800, 22000])
      : d3.scaleLinear().domain([0, 18000]);
    y.range([H - m.bottom, m.top]);
  }

  function render(animate) {
    setScales();
    const t = svg.transition().duration(animate ? 1100 : 0).ease(d3.easeCubicInOut);
    clip.attr('x', m.left).attr('y', 0).attr('width', W - m.left - m.right).attr('height', H);

    // 时代色带
    const bands = gBands.selectAll('g.band').data(eras, (d) => d.key).join((en) => {
      const g = en.append('g').attr('class', 'band');
      g.append('rect').attr('class', 'era-band');
      g.append('text').attr('class', 'era-band-label');
      g.append('line').attr('stroke', color('--rule-strong'));
      return g;
    });
    const bx0 = (d) => Math.max(m.left, x(d.start));
    const bx1 = (d) => Math.min(W - m.right, x(d.end));
    bands.select('rect').transition(t)
      .attr('x', bx0).attr('width', (d) => Math.max(0, bx1(d) - bx0(d)))
      .attr('y', m.top - 24).attr('height', H - m.bottom - m.top + 24)
      .attr('fill', (d) => color(d.color)).attr('fill-opacity', 0.13);
    // 窄色带的标签堆到右上角
    let stack = 0;
    const labelPos = eras.map((d) => {
      const w = bx1(d) - bx0(d);
      if (w > 76) return { x: (bx0(d) + bx1(d)) / 2, y: m.top - 8, anchor: 'middle', leader: false };
      const pos = { x: W - m.right - 8, y: m.top + 22 + stack * 18, anchor: 'end', leader: true, cx: (bx0(d) + bx1(d)) / 2 };
      stack++;
      return pos;
    });
    bands.select('text').transition(t)
      .attr('x', (d, i) => labelPos[i].x).attr('y', (d, i) => labelPos[i].y)
      .attr('text-anchor', (d, i) => labelPos[i].anchor)
      .attr('fill', (d) => color(d.color))
      .text((d) => d.name);
    bands.select('line').transition(t)
      .attr('opacity', (d, i) => (labelPos[i].leader ? 1 : 0))
      .attr('x1', (d, i) => labelPos[i].cx ?? 0).attr('x2', (d, i) => (labelPos[i].leader ? labelPos[i].x + 4 : 0))
      .attr('y1', m.top - 16).attr('y2', (d, i) => labelPos[i].y - 4);

    // 坐标轴
    gX.attr('transform', `translate(0,${H - m.bottom})`).transition(t)
      .call(d3.axisBottom(x).ticks(W < 600 ? 5 : 10).tickFormat((d) => `${d}`).tickSizeOuter(0));
    const yTicks = mode === 'log' ? [1000, 2000, 5000, 10000, 20000] : y.ticks(6);
    gY.attr('transform', `translate(${m.left},0)`).transition(t)
      .call(d3.axisLeft(y).tickValues(yTicks).tickFormat((d) => fmt.int(d)).tickSize(0).tickPadding(10));
    gGrid.attr('transform', `translate(${m.left},0)`).transition(t)
      .call(d3.axisLeft(y).tickValues(yTicks).tickSize(-(W - m.left - m.right)).tickFormat(''));

    // 曲线
    const lineGen = d3.line().x((d) => x(d.year)).y((d) => y(d.value)).curve(d3.curveMonotoneX);
    const areaGen = d3.area().x((d) => x(d.year)).y0(H - m.bottom).y1((d) => y(d.value)).curve(d3.curveMonotoneX);
    line.transition(t).attr('d', lineGen(data));
    area.transition(t).attr('d', areaGen(data));

    // 注释：两千年视图显示一句总结，其他视图显示事件
    const showEvents = mode !== 'all';
    const ann = gAnn.selectAll('g.ann').data(showEvents ? annotations : [], (d) => d.year).join(
      (en) => {
        const g = en.append('g').attr('class', 'ann').attr('opacity', 0);
        g.append('line').attr('class', 'annot-line').attr('stroke-dasharray', '2 3');
        g.append('circle').attr('r', 3.5).attr('fill', color('--c-red'));
        g.append('text').attr('class', 'annot').attr('text-anchor', 'end');
        return g;
      },
      (up) => up,
      (ex) => ex.transition().duration(300).attr('opacity', 0).remove(),
    );
    ann.each(function (d, i) {
      const g = d3.select(this);
      const cx = x(d.year), cy = y(valueAt(d.year));
      const ly = cy - 46 - (i % 2) * 22;
      g.select('line').attr('x1', cx).attr('x2', cx).attr('y1', cy).attr('y2', ly + 4);
      g.select('circle').attr('cx', cx).attr('cy', cy);
      g.select('text').attr('x', cx - 4).attr('y', ly).text(`${d.year} ${d.text}`);
    });
    ann.transition(t).delay(animate ? 500 : 0).attr('opacity', 1);

    gNote.selectAll('*').remove();
    if (mode === 'all') {
      const nx = x(900), ny = y(1150) - 70;
      gNote.append('text').attr('class', 'annot').attr('x', nx).attr('y', ny).attr('text-anchor', 'middle')
        .call((s) => {
          s.append('tspan').attr('x', nx).attr('dy', 0).text('公元 1 年到 1760 年');
          s.append('tspan').attr('x', nx).attr('dy', 18).text('人均产出几乎没有增长');
        });
      gNote.append('path').attr('class', 'annot-line')
        .attr('d', `M${nx},${ny + 28} L${nx},${y(1100) - 8}`);
      const last = data.at(-1);
      const ratio = last.value / valueAt(1760);
      const ny2 = y(last.value * 0.5);
      gNote.append('text').attr('class', 'annot').attr('x', x(1890) - 12).attr('y', ny2).attr('text-anchor', 'end')
        .call((s) => {
          s.append('tspan').attr('x', x(1890) - 12).attr('dy', 0).text('1760 年以来');
          s.append('tspan').attr('x', x(1890) - 12).attr('dy', 18).text(`增长约 ${Math.round(ratio)} 倍`);
        });
      gNote.append('path').attr('class', 'annot-line')
        .attr('d', `M${x(1890) - 6},${ny2 + 4} L${x(1990) - 10},${ny2 + 4}`);
    }
    gNote.attr('opacity', 0).transition(t).delay(animate ? 600 : 0).attr('opacity', 1);

    overlay.attr('x', m.left).attr('y', m.top).attr('width', W - m.left - m.right).attr('height', H - m.top - m.bottom);
  }

  // 悬停
  overlay
    .on('pointermove', (ev) => {
      const [px] = d3.pointer(ev);
      const yr = Math.round(x.invert(px));
      const v = valueAt(yr);
      focus.style('display', null);
      focus.select('line').attr('x1', x(yr)).attr('x2', x(yr)).attr('y1', y(v)).attr('y2', H - m.bottom);
      focus.select('circle').attr('cx', x(yr)).attr('cy', y(v));
      const era = eraOf(yr);
      showTip(`<b>公元 ${yr} 年</b>${tipRow('人均 GDP', `${fmt.int(v)} 元`)}${tipRow('时代', era.name, color(era.color))}`, ev);
      moveTip(ev);
    })
    .on('pointerleave', () => { focus.style('display', 'none'); hideTip(); });

  // 视图切换
  toolbar?.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    toolbar.querySelectorAll('[data-mode]').forEach((o) => o.classList.toggle('is-on', o === b));
    mode = b.dataset.mode;
    render(true);
  }));

  onResize(el, (w, h) => {
    W = w; H = h;
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    render(false);
    if (!drawn) drawIn();
  });

  // 首次进入视口：描线动画
  function drawIn() {
    drawn = true;
    const len = line.node().getTotalLength();
    line.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len);
    area.attr('opacity', 0);
    ScrollTrigger.create({
      trigger: el, start: 'top 75%', once: true,
      onEnter: () => {
        line.transition().duration(2600).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0)
          .on('end', () => line.attr('stroke-dasharray', null));
        area.transition().delay(1400).duration(1200).attr('opacity', 0.75);
      },
    });
  }
}
