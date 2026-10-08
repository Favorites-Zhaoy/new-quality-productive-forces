// 5.2 未来工作模拟器：可下钻的旭日图（职业 → 任务组 → 任务）
import * as d3 from 'd3';
import { color, textOn } from '../core/data.js';
import { onResize } from '../core/lazy.js';
import { showTip, moveTip, hideTip } from '../core/tooltip.js';

export function jobSunburst(el, { types, jobs }) {
  const select = document.getElementById('job-select');
  const summary = document.getElementById('job-summary');
  let job = 0, W = 0;

  select.innerHTML = jobs.map((j, i) => `<button class="${i ? '' : 'is-on'}" data-i="${i}">${j.name}</button>`).join('');
  select.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    select.querySelectorAll('button').forEach((o) => o.classList.toggle('is-on', o === b));
    job = +b.dataset.i;
    render(true);
  }));

  const svg = d3.select(el).append('svg');
  const typeColor = (t) => color(types[t].color);

  function render(animate) {
    svg.attr('viewBox', `0 0 ${W} ${W}`).selectAll('*').remove();
    const R = W / 2 - 6;
    const g = svg.append('g').attr('transform', `translate(${W / 2},${W / 2})`);
    const root = d3.hierarchy(jobs[job]).sum((d) => d.w ?? 0)
      .sort((a, b) => b.value - a.value);
    d3.partition().size([2 * Math.PI, root.height + 1])(root);
    root.each((d) => { d.current = d; });

    const ringR = R / 3;
    const arc = d3.arc()
      .startAngle((d) => d.x0).endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.006)).padRadius(R / 2)
      .innerRadius((d) => d.y0 * ringR).outerRadius((d) => Math.max(d.y0 * ringR, d.y1 * ringR - 2));

    // 任务组颜色：按组内主导类型的浅色
    const groupMix = (d) => {
      const share = d3.rollup(d.leaves(), (v) => d3.sum(v, (l) => l.value), (l) => l.data.t);
      const top = [...share].sort((a, b) => b[1] - a[1])[0][0];
      return d3.interpolateRgb(typeColor(top), color('--paper-2'))(0.45);
    };
    const fill = (d) => (d.depth === 2 ? typeColor(d.data.t) : groupMix(d));

    const visible = (d) => d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    const labelVisible = (d) => visible(d) && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.1;
    const labelTransform = (d) => {
      const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
      const y = ((d.y0 + d.y1) / 2) * ringR;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    };

    const path = g.append('g').selectAll('path').data(root.descendants().slice(1)).join('path')
      .attr('class', 'sun-arc')
      .attr('fill', fill)
      .attr('d', (d) => arc(d.current));
    path.filter((d) => d.children).style('cursor', 'pointer').on('click', clicked);
    path.on('pointerenter', (ev, d) => {
      const pct = ((d.value / root.value) * 100).toFixed(0);
      const t = d.data.t ? `<div>${types[d.data.t].name} · ${types[d.data.t].desc}</div>` : '';
      showTip(`<b>${d.data.name}</b><div>约占工作时间 ${pct}%</div>${t}`, ev);
    }).on('pointermove', moveTip).on('pointerleave', hideTip);

    const label = g.append('g').attr('pointer-events', 'none').attr('text-anchor', 'middle')
      .selectAll('text').data(root.descendants().slice(1)).join('text')
      .attr('class', 'sun-label').attr('dy', '0.35em')
      .attr('fill', (d) => textOn(fill(d)))
      .attr('fill-opacity', (d) => +labelVisible(d.current))
      .attr('transform', (d) => labelTransform(d.current))
      .text((d) => d.data.name);

    const centerG = g.append('g').style('cursor', 'pointer').on('click', () => clicked(null, root));
    centerG.append('circle').attr('r', ringR - 4).attr('fill', color('--paper-2'));
    const cTitle = centerG.append('text').attr('class', 'sun-center').attr('text-anchor', 'middle').attr('y', -2).text(root.data.name);
    const cSub = centerG.append('text').attr('class', 'sun-center-sub').attr('text-anchor', 'middle').attr('y', 20).text('点击扇区下钻');

    function clicked(ev, p) {
      cTitle.text(p.data.name);
      cSub.text(p === root ? '点击扇区下钻' : '点击中心返回');
      root.each((d) => {
        d.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        };
      });
      const t = svg.transition().duration(800).ease(d3.easeCubicInOut);
      path.transition(t)
        .tween('data', (d) => { const i = d3.interpolate(d.current, d.target); return (tt) => { d.current = i(tt); }; })
        .attrTween('d', (d) => () => arc(d.current))
        .attr('fill-opacity', (d) => (visible(d.target) ? 1 : 0));
      label.transition(t)
        .attr('fill-opacity', (d) => +labelVisible(d.target))
        .attrTween('transform', (d) => () => labelTransform(d.current));
    }

    if (animate) {
      path.attr('fill-opacity', 0).transition().duration(600).delay((d, i) => i * 18).attr('fill-opacity', 1);
    }

    // 汇总
    const share = d3.rollup(root.leaves(), (v) => d3.sum(v, (l) => l.value), (l) => l.data.t);
    summary.innerHTML = Object.entries(types).map(([k, t]) => `
      <div><b style="color:${color(t.color)}">${Math.round(((share.get(k) ?? 0) / root.value) * 100)}%</b><span>${t.name} · ${t.desc}</span></div>`).join('');
  }

  onResize(el, (w) => { W = w; render(true); });
}
