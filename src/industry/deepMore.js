// 深度专题的扩展图形：价格断崖、分省地图逐批生长
import * as d3 from 'd3';
import { color, fmt } from '../core/data.js';
import { loadChina } from './kit.js';
import { showTip, moveTip, hideTip } from '../core/tooltip.js';

const size = (el) => ({ W: el.clientWidth, H: el.clientHeight });

/* ================= 价格断崖：对数纵轴 + “1 元能买多少词元” ================= */
// data: { unit, series:[{name, color, points:[{date:'2024-04', price, note?}]}], dots:[{date, price, name}], steps:[{until:'2024-04', buy:{price, label}}] }
function priceCliff(el, data) {
  const { W, H } = size(el);
  const m = { t: 96, r: 120, b: 34, l: 50 };
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const parse = d3.timeParse('%Y-%m');
  const all = [...data.series.flatMap((s) => s.points), ...data.dots];
  const x = d3.scaleTime().domain([parse(data.from), parse(data.to)]).range([m.l, W - m.r]);
  const y = d3.scaleLog().domain([0.5, 200]).range([H - m.b, m.t]);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`)
    .call(d3.axisBottom(x).ticks(W < 500 ? 3 : 6).tickFormat(d3.timeFormat('%Y.%m')).tickSizeOuter(0));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`)
    .call(d3.axisLeft(y).tickValues([0.5, 1, 2, 5, 10, 20, 50, 100, 200]).tickFormat((d) => `¥${d}`).tickSize(-(W - m.l - m.r)))
    .call((g) => g.selectAll('line').attr('stroke', color('--rule')).attr('stroke-dasharray', '2 4'));
  svg.append('text').attr('class', 'deep-note').attr('x', W).attr('y', 16).attr('text-anchor', 'end').text(data.unit);

  // 顶部：“1 元能买多少词元”
  const buy = svg.append('g');
  buy.append('text').attr('class', 'deep-note').attr('x', 0).attr('y', 16).text('1 元能买的输入词元');
  const buyNum = buy.append('text').attr('class', 'deep-big').attr('x', 0).attr('y', 62).attr('fill', color('--c-red'));
  const buyLab = buy.append('text').attr('class', 'deep-lab').attr('x', 0).attr('y', 82);

  const line = d3.line().x((d) => x(parse(d.date))).y((d) => y(d.price)).curve(d3.curveStepAfter);
  const groups = data.series.map((s) => {
    const g = svg.append('g');
    const pts = s.points;
    const ext = [...pts, { ...pts.at(-1), date: data.to }];
    const path = g.append('path').attr('d', line(ext)).attr('fill', 'none').attr('stroke', color(s.color)).attr('stroke-width', 3);
    const len = path.node().getTotalLength();
    path.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len);
    const dots = g.selectAll('circle').data(pts).join('circle').attr('cx', (d) => x(parse(d.date))).attr('cy', (d) => y(d.price))
      .attr('r', 5).attr('fill', color(s.color)).attr('opacity', 0);
    const labs = g.selectAll('text').data(pts).join('text').attr('class', 'deep-lab').attr('x', (d) => x(parse(d.date)) + 7).attr('y', (d) => y(d.price) - 8)
      .attr('fill', color(s.color)).text((d) => `¥${d.price}`).attr('opacity', 0);
    const name = g.append('text').attr('class', 'deep-lab').attr('x', W - m.r + 8).attr('y', y(pts.at(-1).price)).attr('dy', '0.35em')
      .attr('fill', color(s.color)).text(s.name).attr('opacity', 0);
    dots.on('pointerenter', (ev, d) => showTip(`<b>${s.name}</b><div>${d.date}：输入 ¥${d.price} / 百万词元</div>${d.note ? `<div>${d.note}</div>` : ''}`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);
    return { s, path, len, dots, labs, name };
  });
  const dg = svg.append('g').selectAll('g').data(data.dots).join('g').attr('opacity', 0);
  dg.append('circle').attr('cx', (d) => x(parse(d.date))).attr('cy', (d) => y(d.price)).attr('r', 6)
    .attr('fill', 'none').attr('stroke', color('--c-teal')).attr('stroke-width', 2.5);
  dg.append('text').attr('class', 'deep-lab').attr('x', (d) => x(parse(d.date)) + 9).attr('y', (d) => y(d.price) + 16)
    .attr('fill', color('--c-teal')).text((d) => `${d.name} ¥${d.price}`);

  return {
    step(i, anim) {
      const st = data.steps[Math.min(i, data.steps.length - 1)];
      const until = parse(st.until);
      groups.forEach(({ path, dots, labs, name, s }) => {
        const vis = s.points.filter((p) => parse(p.date) <= until);
        // 线画到当前截点
        const xr = x(until);
        const frac = vis.length ? Math.min(1, (xr - x(parse(s.points[0].date))) / (x(parse(data.to)) - x(parse(s.points[0].date)))) : 0;
        const target = (1 - (st.full ? 1 : frac * 0.98)) * path.node().getTotalLength();
        (anim ? path.transition().duration(900) : path).attr('stroke-dashoffset', vis.length ? Math.max(0, target) : path.node().getTotalLength());
        (anim ? dots.transition().duration(500) : dots).attr('opacity', (d) => (parse(d.date) <= until ? 1 : 0));
        (anim ? labs.transition().duration(500) : labs).attr('opacity', (d) => (parse(d.date) <= until ? 1 : 0));
        name.attr('opacity', st.full ? 1 : 0);
      });
      (anim ? dg.transition().duration(500) : dg).attr('opacity', (d) => (parse(d.date) <= until ? 1 : 0));
      buyNum.text(fmt.int(1e6 / st.buy.price));
      buyLab.text(st.buy.label);
    },
  };
}

/* ================= 分省地图逐批生长 + 枢纽叠加 ================= */
// data: { snapshots:[{label, total, by:{北京:51,…}}], unit, points:[{name, lon, lat, hub}], pointsFrom: 步骤序号 }
function chinaRace(el, data) {
  const { W, H } = size(el);
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const head = svg.append('g');
  const big = head.append('text').attr('class', 'deep-big').attr('y', 46).attr('fill', color('--c-red'));
  const sub = head.append('text').attr('class', 'deep-lab').attr('y', 70);
  const gMap = svg.append('g');
  const gPts = svg.append('g');
  const max = d3.max(data.snapshots.at(-1) ? Object.values(data.snapshots.at(-1).by) : [1]);
  const ramp = d3.scaleSequentialSqrt(d3.interpolateRgb(color('--paper-3'), color('--c-red'))).domain([0, max]);
  let prov = null, proj = null, cur = 0, ready = null;

  ready = loadChina().then((geo) => {
    proj = d3.geoMercator().fitExtent([[0, 84], [W, H - 36]], geo);
    const path = d3.geoPath(proj);
    prov = gMap.selectAll('path').data(geo.features).join('path').attr('d', path)
      .attr('stroke', color('--paper')).attr('stroke-width', 0.8).attr('fill', color('--paper-3'))
      .attr('fill-opacity', (f) => (f.properties.name ? 1 : 0)).attr('stroke-opacity', (f) => (f.properties.name ? 1 : 0.6));
    prov.on('pointerenter', (ev, f) => {
      if (!f.properties.name) return;
      const s = data.snapshots[Math.min(cur, data.snapshots.length - 1)];
      showTip(`<b>${f.properties.name}</b><div>${s.label}：${valueOf(s, f) ?? 0} ${data.unit}</div>`, ev);
    }).on('pointermove', moveTip).on('pointerleave', hideTip);
    const pts = data.points.map((p) => ({ ...p, xy: proj([p.lon, p.lat]) }));
    const pg = gPts.selectAll('g').data(pts).join('g').attr('transform', (d) => `translate(${d.xy})`).attr('opacity', 0);
    pg.append('rect').attr('x', -6).attr('y', -6).attr('width', 12).attr('height', 12).attr('transform', 'rotate(45)')
      .attr('fill', color('--c-blue-deep')).attr('stroke', color('--paper-2')).attr('stroke-width', 1.5);
    pg.append('text').attr('class', 'deep-note').attr('x', 10).attr('dy', '0.35em').attr('paint-order', 'stroke')
      .attr('stroke', color('--paper')).attr('stroke-width', 3).style('font-weight', 700).style('fill', color('--c-blue-deep')).text((d) => d.name);
    pg.on('pointerenter', (ev, d) => showTip(`<b>${d.name}</b><div>国家算力枢纽：${d.hub}</div>`, ev)).on('pointermove', moveTip).on('pointerleave', hideTip);
    // 图例
    const lg = svg.append('g').attr('transform', `translate(0,${H - 22})`);
    const gid = `rg-${Math.random().toString(36).slice(2, 7)}`;
    const grad = svg.append('defs').append('linearGradient').attr('id', gid);
    d3.range(0, 1.01, 0.25).forEach((t) => grad.append('stop').attr('offset', `${t * 100}%`).attr('stop-color', ramp(t * t * max)));
    lg.append('rect').attr('width', 140).attr('height', 8).attr('rx', 2).attr('fill', `url(#${gid})`);
    lg.append('text').attr('class', 'deep-note').attr('x', 146).attr('y', 8).text(`0—${max} ${data.unit}`);
    const pl = lg.append('g').attr('transform', 'translate(250,4)').attr('class', 'race-pt-legend').attr('opacity', 0);
    pl.append('rect').attr('x', -5).attr('y', -5).attr('width', 10).attr('height', 10).attr('transform', 'rotate(45)').attr('fill', color('--c-blue-deep'));
    pl.append('text').attr('class', 'deep-note').attr('x', 12).attr('dy', '0.35em').text('国家数据中心集群（“东数西算”）');
  });

  const valueOf = (s, f) => {
    const n = f.properties.name;
    for (const [k, v] of Object.entries(s.by)) if (n.startsWith(k)) return v;
    return null;
  };

  return {
    step(i, anim) {
      cur = i;
      ready.then(() => {
        const s = data.snapshots[Math.min(i, data.snapshots.length - 1)];
        (anim ? prov.transition().duration(800) : prov).attr('fill', (f) => (f.properties.name ? ramp(valueOf(s, f) ?? 0) : 'none'));
        big.text(`${fmt.int(s.total)} ${data.unit}`);
        sub.text(s.label);
        const showPts = i >= data.pointsFrom;
        (anim ? gPts.selectAll('g').transition().duration(500).delay((d, k) => k * 60) : gPts.selectAll('g')).attr('opacity', showPts ? 1 : 0);
        svg.select('.race-pt-legend').attr('opacity', showPts ? 1 : 0);
      });
    },
  };
}

export const VIZ_MORE = { priceCliff, chinaRace };
