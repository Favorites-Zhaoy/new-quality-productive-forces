// 5.1 AI 接入我的一天：24 小时径向时钟，接入前后弧段补间
import * as d3 from 'd3';
import { color, textOn } from '../core/data.js';
import { onResize } from '../core/lazy.js';
import { showTip, moveTip, hideTip } from '../core/tooltip.js';

export function dayClock(el, { activities, roles }) {
  const rolesEl = document.getElementById('clock-roles');
  const toggle = document.getElementById('clock-toggle');
  const deltaEl = document.getElementById('clock-delta');
  let role = 0, withAI = false, W = 0;

  rolesEl.innerHTML = roles.map((r, i) => `<button class="${i ? '' : 'is-on'}" data-i="${i}">${r.name}</button>`).join('');
  rolesEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    rolesEl.querySelectorAll('button').forEach((o) => o.classList.toggle('is-on', o === b));
    role = +b.dataset.i;
    update();
  }));
  toggle.addEventListener('click', () => {
    withAI = !withAI;
    toggle.textContent = withAI ? '断开 AI' : '接入 AI';
    toggle.classList.toggle('is-on', withAI);
    update();
  });

  const svg = d3.select(el).append('svg');
  const g = svg.append('g');
  const gTicks = g.append('g');
  const gArcs = g.append('g');
  const gLabels = g.append('g');
  const center1 = g.append('text').attr('class', 'sun-center').attr('text-anchor', 'middle').attr('y', -4);
  const center2 = g.append('text').attr('class', 'sun-center-sub').attr('text-anchor', 'middle').attr('y', 20);
  let R = 0, r0 = 0;
  const arc = d3.arc().cornerRadius(3).padAngle(0.006);

  const segments = () => {
    const src = roles[role][withAI ? 'after' : 'before'];
    let acc = 0;
    return activities.map((a) => {
      const h = src[a.key];
      const s = { ...a, hours: h, startAngle: (acc / 24) * Math.PI * 2, endAngle: ((acc + h) / 24) * Math.PI * 2 };
      acc += h;
      return s;
    });
  };

  function layout() {
    svg.attr('viewBox', `0 0 ${W} ${W}`);
    g.attr('transform', `translate(${W / 2},${W / 2})`);
    R = W / 2 - 28; r0 = R * 0.56;
    arc.innerRadius(r0).outerRadius(R);
    gTicks.selectAll('*').remove();
    d3.range(24).forEach((h) => {
      const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
      gTicks.append('line').attr('x1', Math.cos(a) * (R + 4)).attr('y1', Math.sin(a) * (R + 4))
        .attr('x2', Math.cos(a) * (R + (h % 6 ? 8 : 14))).attr('y2', Math.sin(a) * (R + (h % 6 ? 8 : 14)))
        .attr('stroke', color('--rule-strong'));
      if (h % 3 === 0) {
        gTicks.append('text').attr('class', 'clock-hour').attr('text-anchor', 'middle').attr('dy', '0.35em')
          .attr('x', Math.cos(a) * (R + 22)).attr('y', Math.sin(a) * (R + 22)).text(`${h}`);
      }
    });
    gTicks.append('circle').attr('r', r0 - 8).attr('fill', 'none').attr('stroke', color('--rule')).attr('stroke-dasharray', '2 4');
  }

  function update(animate = true) {
    const segs = segments();
    const paths = gArcs.selectAll('path').data(segs, (d) => d.key).join((en) => en.append('path')
      .attr('class', 'clock-arc')
      .attr('fill', (d) => color(d.color))
      .each(function (d) { this._cur = d; })
      .attr('d', arc));
    paths.transition().duration(animate ? 1200 : 0).ease(d3.easeCubicInOut)
      .attrTween('d', function (d) {
        const i = d3.interpolate(this._cur, d);
        this._cur = d;
        return (t) => arc(i(t));
      });
    paths.on('pointerenter', (ev, d) => showTip(`<b>${d.name}</b><div>${d.hours} 小时</div>`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);

    const lab = gLabels.selectAll('text').data(segs, (d) => d.key).join('text')
      .attr('class', 'sun-label').attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('fill', (d) => textOn(color(d.color)));
    lab.transition().duration(animate ? 1200 : 0).ease(d3.easeCubicInOut)
      .attr('transform', (d) => `translate(${arc.centroid(d)})`)
      .attr('opacity', (d) => (d.hours >= 1.5 ? 1 : 0))
      .text((d) => (d.hours >= 1.5 ? `${d.name.split('·')[0].split('/')[0]} ${d.hours}h` : ''));

    center1.text(roles[role].name);
    center2.text(withAI ? '接入 AI 之后' : '接入 AI 之前');

    // 变化说明
    const r = roles[role];
    const diffs = activities.map((a) => ({ ...a, d: r.after[a.key] - r.before[a.key] })).filter((a) => a.d !== 0);
    deltaEl.innerHTML = withAI
      ? `${diffs.map((a) => `<div>${a.name}　<b>${a.d > 0 ? '+' : ''}${a.d}</b> 小时</div>`).join('')}
         <div style="margin-top:8px">被压缩的重复性事务：${r.routineEg}</div>`
      : `<div>点击“接入 AI”，看看${r.name}的一天会发生什么变化。</div>`;
  }

  onResize(el, (w) => { W = w; layout(); update(false); });
}
