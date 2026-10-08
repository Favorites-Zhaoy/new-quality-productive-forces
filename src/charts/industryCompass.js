// 第三章：20 个门类的“行业罗盘”（导航占位，数据待补充）
import * as d3 from 'd3';
import { color } from '../core/data.js';
import { onResize } from '../core/lazy.js';
import { showTip, moveTip, hideTip } from '../core/tooltip.js';
import { ScrollTrigger, lenis } from '../core/scroll.js';

const SECTOR = { 1: { name: '第一产业', c: '--c-green' }, 2: { name: '第二产业', c: '--c-blue' }, 3: { name: '第三产业', c: '--c-ochre' } };

export function industryCompass(el, { data }) {
  const svg = d3.select(el).append('svg');
  let shown = false, armed = false;

  function render(W) {
    const H = W;
    svg.attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();
    const R = W / 2 - (W < 500 ? 24 : 70);
    const r0 = R * 0.42;
    const g = svg.append('g').attr('transform', `translate(${W / 2},${H / 2})`);
    const pie = d3.pie().value(1).sort(null).padAngle(0.012);
    const arcs = pie(data);
    const arc = d3.arc().innerRadius(r0).outerRadius(R).cornerRadius(4);
    const arcHover = d3.arc().innerRadius(r0).outerRadius(R + 12).cornerRadius(4);

    // 同一产业内用明度微差区分
    const shade = (d, i) => {
      const base = d3.hsl(color(SECTOR[d.data.sector].c));
      base.l += ((i % 3) - 1) * 0.05;
      return base.formatHex();
    };

    const wedge = g.selectAll('path').data(arcs).join('path')
      .attr('class', 'compass-wedge')
      .attr('fill', shade)
      .attr('d', arc);

    g.selectAll('text.compass-code').data(arcs).join('text')
      .attr('class', 'compass-code')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('transform', (d) => `translate(${d3.arc().innerRadius(R * 0.82).outerRadius(R * 0.82).centroid(d)})`)
      .text((d) => d.data.code);

    if (W >= 500) {
      g.selectAll('text.compass-name').data(arcs).join('text')
        .attr('class', 'compass-name')
        .attr('dy', '0.35em')
        .attr('transform', (d) => {
          const a = (d.startAngle + d.endAngle) / 2 - Math.PI / 2;
          const x = Math.cos(a) * (R + 10), y = Math.sin(a) * (R + 10);
          let deg = (a * 180) / Math.PI;
          if (deg > 90) deg -= 180;
          return `translate(${x},${y}) rotate(${deg})`;
        })
        .attr('text-anchor', (d) => ((d.startAngle + d.endAngle) / 2 > Math.PI ? 'end' : 'start'))
        .text((d) => d.data.short);
    }

    // 中心
    g.append('circle').attr('r', r0 - 10).attr('fill', 'none').attr('stroke', color('--rule-strong')).attr('stroke-dasharray', '2 4');
    g.append('text').attr('text-anchor', 'middle').attr('y', -8)
      .style('font-family', 'var(--f-serif)').style('font-weight', 900).style('font-size', `${Math.max(22, r0 * 0.36)}px`)
      .attr('fill', color('--c-blue-deep')).text('20 个门类');
    g.append('text').attr('text-anchor', 'middle').attr('y', r0 * 0.28).attr('class', 'label').text('GB/T 4754—2017');

    wedge
      .on('pointerenter', function (ev, d) {
        d3.select(this).transition().duration(250).attr('d', arcHover);
        wedge.filter((o) => o !== d).attr('opacity', 0.55);
        showTip(`<b>${d.data.code} · ${d.data.name}</b><div>${SECTOR[d.data.sector].name}</div><div style="color:#B9C3CC">点击查看</div>`, ev);
      })
      .on('pointermove', moveTip)
      .on('click', (ev, d) => { hideTip(); lenis?.scrollTo(`#ind-${d.data.code}`, { duration: 1.8 }); })
      .on('pointerleave', function () {
        d3.select(this).transition().duration(250).attr('d', arc);
        wedge.attr('opacity', 1);
        hideTip();
      });

    if (!shown) {
      wedge.attr('opacity', 0).attr('transform', 'scale(0.85)');
      if (armed) return;
      armed = true;
      ScrollTrigger.create({
        trigger: el, start: 'top 75%', once: true,
        onEnter: () => {
          shown = true;
          svg.selectAll('.compass-wedge').transition().delay((d, i) => i * 45).duration(700).ease(d3.easeBackOut)
            .attr('opacity', 1).attr('transform', 'scale(1)');
        },
      });
    }
  }

  onResize(el, (w) => render(w));
}
