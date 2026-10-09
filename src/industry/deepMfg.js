// 深度专题（制造业）图形：多线逐年揭示、堆叠柱、灯塔地图、成绩单点带
import * as d3 from 'd3';
import { color, fmt } from '../core/data.js';
import { loadChina } from './kit.js';
import { showTip, moveTip, hideTip } from '../core/tooltip.js';

const size = (el) => ({ W: el.clientWidth, H: el.clientHeight });

/* ================= 多线逐年揭示（制造业增加值国际比较） ================= */
// data: { unit, focus, series:[{key, name, color}], rows:[{year, CHN, …}], steps:[{until, mark?:{year, text}}], big:{key, label} }
function multiLines(el, data) {
  const { W, H } = size(el);
  const m = { t: 92, r: 96, b: 34, l: 52 };
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const rows = data.rows;
  const x = d3.scaleLinear().domain(d3.extent(rows, (d) => d.year)).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([0, d3.max(rows, (d) => d3.max(data.series, (s) => d[s.key] ?? 0)) * 1.08]).nice().range([H - m.b, m.t]);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`)
    .call(d3.axisBottom(x).ticks(W < 500 ? 4 : 8).tickFormat(d3.format('d')).tickSizeOuter(0));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`)
    .call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat(d3.format(',')))
    .call((g) => g.selectAll('line').attr('stroke', color('--rule')).attr('stroke-dasharray', '2 4'));
  svg.append('text').attr('class', 'deep-note').attr('x', W).attr('y', 16).attr('text-anchor', 'end').text(data.unit);
  const big = svg.append('text').attr('class', 'deep-big').attr('x', 0).attr('y', 46).attr('fill', color('--c-red'));
  const bigLab = svg.append('text').attr('class', 'deep-lab').attr('x', 0).attr('y', 70);
  const clipId = `ml-${Math.random().toString(36).slice(2, 7)}`;
  const clip = svg.append('clipPath').attr('id', clipId).append('rect').attr('x', 0).attr('y', 0).attr('height', H).attr('width', 0);
  const g = svg.append('g').attr('clip-path', `url(#${clipId})`);
  const lines = data.series.map((s) => {
    const pts = rows.filter((d) => d[s.key] != null);
    g.append('path').attr('d', d3.line().x((d) => x(d.year)).y((d) => y(d[s.key])).curve(d3.curveMonotoneX)(pts))
      .attr('fill', 'none').attr('stroke', color(s.color)).attr('stroke-width', s.key === data.focus ? 3.5 : 2);
    const lab = svg.append('text').attr('class', 'deep-lab').attr('fill', color(s.color)).attr('opacity', 0);
    return { s, pts, lab };
  });
  const mark = svg.append('g').attr('opacity', 0);
  mark.append('circle').attr('r', 8).attr('fill', 'none').attr('stroke', color('--ink')).attr('stroke-width', 2);
  const markT = mark.append('text').attr('class', 'deep-lab').attr('x', -10).attr('y', -16).attr('text-anchor', 'end');
  return {
    step(i, anim) {
      const st = data.steps[Math.min(i, data.steps.length - 1)];
      (anim ? clip.transition().duration(1000).ease(d3.easeCubicInOut) : clip).attr('width', x(st.until) + 4);
      lines.forEach(({ s, pts, lab }) => {
        const p = pts.filter((d) => d.year <= st.until).at(-1);
        if (!p) { lab.attr('opacity', 0); return; }
        lab.text(`${s.name} ${fmt.int(p[s.key])}`);
        (anim ? lab.transition().duration(1000) : lab).attr('opacity', 1).attr('x', x(p.year) + 6).attr('y', y(p[s.key]) + 4);
      });
      if (st.mark) {
        const r = rows.find((d) => d.year === st.mark.year);
        mark.attr('transform', `translate(${x(r.year)},${y(r[data.focus])})`);
        markT.text(st.mark.text);
        (anim ? mark.transition().delay(800).duration(400) : mark).attr('opacity', 1);
      } else mark.attr('opacity', 0);
      const last = rows.filter((d) => d.year <= st.until).at(-1);
      big.text(`${last[data.big.key]}%`);
      bigLab.text(`${last.year} 年 · ${data.big.label}`);
    },
  };
}

/* ================= 堆叠柱逐年揭示（国产 vs 外资机器人） ================= */
// data: { unit, keys:[{key, name, color}], rows:[{year, …}], steps:[{until}], share:{key, total, label} }
function stackBars(el, data) {
  const { W, H } = size(el);
  const m = { t: 92, r: 10, b: 34, l: 44 };
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const x = d3.scaleBand().domain(data.rows.map((d) => d.year)).range([m.l, W - m.r]).padding(0.22);
  const y = d3.scaleLinear().domain([0, d3.max(data.rows, (d) => d3.sum(data.keys, (k) => d[k.key])) * 1.08]).range([H - m.b, m.t]);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`)
    .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => W > 500 || i % 2 === 0)).tickSizeOuter(0));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(6));
  svg.append('text').attr('class', 'deep-note').attr('x', W).attr('y', 16).attr('text-anchor', 'end').text(data.unit);
  const lg = svg.append('g').attr('transform', `translate(${W},38)`);
  data.keys.forEach((k, i) => {
    const g = lg.append('g').attr('transform', `translate(0,${i * 18})`);
    g.append('rect').attr('x', -10).attr('y', -9).attr('width', 10).attr('height', 10).attr('fill', color(k.color));
    g.append('text').attr('class', 'deep-note').attr('x', -16).attr('text-anchor', 'end').text(k.name);
  });
  const big = svg.append('text').attr('class', 'deep-big').attr('x', 0).attr('y', 46).attr('fill', color('--c-red'));
  const bigLab = svg.append('text').attr('class', 'deep-lab').attr('x', 0).attr('y', 70);
  const stack = d3.stack().keys(data.keys.map((k) => k.key))(data.rows);
  const layers = svg.append('g').selectAll('g').data(stack).join('g').attr('fill', (d, i) => color(data.keys[i].color));
  const rects = layers.selectAll('rect').data((d) => d).join('rect').attr('x', (d) => x(d.data.year)).attr('width', x.bandwidth()).attr('rx', 1.5)
    .attr('y', y(0)).attr('height', 0);
  rects.on('pointerenter', (ev, d) => showTip(`<b>${d.data.year}</b>${data.keys.map((k) => `<div>${k.name}：${d.data[k.key]} ${data.unitShort ?? ''}</div>`).join('')}`, ev))
    .on('pointermove', moveTip).on('pointerleave', hideTip);
  return {
    step(i, anim) {
      const st = data.steps[Math.min(i, data.steps.length - 1)];
      (anim ? rects.transition().duration(700).delay((d, j) => j * 30) : rects)
        .attr('y', (d) => (d.data.year <= st.until ? y(d[1]) : y(0)))
        .attr('height', (d) => (d.data.year <= st.until ? y(d[0]) - y(d[1]) : 0));
      const r = data.rows.find((d) => d.year === st.until);
      const ov = data.share.override?.[String(r.year)];
      big.text(`${ov ?? Math.round((r[data.share.key] / r[data.share.total]) * 100)}%`);
      bigLab.text(`${r.year} 年 · ${data.share.label}`);
    },
  };
}

/* ================= 灯塔地图：名单逐批点亮 ================= */
// data: { points:[{name, city, lon, lat, batch, industry}], steps:[{until:'2018-09', label}] }
function lighthouseMap(el, data) {
  const { W, H } = size(el);
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const big = svg.append('text').attr('class', 'deep-big').attr('y', 46).attr('fill', color('--c-red'));
  const bigLab = svg.append('text').attr('class', 'deep-lab').attr('y', 70);
  const gMap = svg.append('g');
  const gPts = svg.append('g');
  let pts = null, cur = 0;
  const ready = loadChina().then((geo) => {
    const proj = d3.geoMercator().fitExtent([[0, 84], [W, H - 10]], geo);
    gMap.selectAll('path').data(geo.features).join('path').attr('d', d3.geoPath(proj))
      .attr('fill', (f) => (f.properties.name ? color('--paper-3') : 'none')).attr('stroke', color('--paper')).attr('stroke-width', 0.8);
    // 同城多家：在城市坐标周围按螺旋错开
    const seen = new Map();
    const list = data.points.map((p) => {
      const [x0, y0] = proj([p.lon, p.lat]);
      const k = seen.get(p.city) ?? 0;
      seen.set(p.city, k + 1);
      const a = k * 2.4, r = k ? 4 + 4.4 * Math.sqrt(k) : 0;
      return { ...p, x: x0 + Math.cos(a) * r, y: y0 + Math.sin(a) * r };
    });
    const g = gPts.selectAll('g').data(list).join('g').attr('transform', (d) => `translate(${d.x},${d.y})`).attr('opacity', 0);
    g.append('circle').attr('r', 9).attr('fill', color('--c-ochre')).attr('opacity', 0.28);
    g.append('circle').attr('r', 4.2).attr('fill', color('--c-red')).attr('stroke', color('--paper-2')).attr('stroke-width', 1.2);
    g.on('pointerenter', (ev, d) => showTip(`<b>${d.name}</b><div>${d.city} · ${d.industry}</div><div>入选批次：${d.batch}</div>`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);
    pts = g;
  });
  return {
    step(i, anim) {
      cur = i;
      ready.then(() => {
        const st = data.steps[Math.min(cur, data.steps.length - 1)];
        const on = (d) => d.batch.slice(0, 7) <= st.until;
        const n = data.points.filter(on).length;
        (anim ? pts.transition().duration(500).delay((d, j) => (on(d) ? (j % 40) * 15 : 0)) : pts)
          .attr('opacity', (d) => (on(d) ? 1 : 0));
        big.text(`${n} 家`);
        bigLab.text(st.label);
      });
    },
  };
}

/* ================= 成绩单：多个工厂的改造成效点带 ================= */
// data: { strips:[{name, dir:'up'|'down', items:[{name, label, value}]}] }
function dotStrips(el, data) {
  const { W, H } = size(el);
  const m = { t: 30, r: 30, l: 10 };
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const rowH = (H - m.t - 24) / data.strips.length;
  const x = d3.scaleLinear().domain([0, d3.max(data.strips, (s) => d3.max(s.items, (d) => Math.abs(d.value)))]).nice().range([m.l, W - m.r]);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - 22})`).call(d3.axisBottom(x).ticks(6).tickFormat((d) => `${d}%`).tickSizeOuter(0));
  const rows = svg.selectAll('g.strip').data(data.strips).join('g').attr('class', 'strip').attr('transform', (d, i) => `translate(0,${m.t + i * rowH})`);
  rows.append('text').attr('class', 'deep-lab').attr('x', m.l).attr('y', 0).text((d) => `${d.name}（${d.dir === 'up' ? '提升' : '下降'}幅度，${d.items.length} 家）`);
  rows.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', rowH / 2).attr('y2', rowH / 2).attr('stroke', color('--rule'));
  const medOf = (d) => d3.median(d.items, (v) => Math.abs(v.value));
  rows.append('line').attr('x1', (d) => x(medOf(d))).attr('x2', (d) => x(medOf(d))).attr('y1', 14).attr('y2', rowH - 10)
    .attr('stroke', color('--ink')).attr('stroke-dasharray', '3 3');
  rows.append('text').attr('class', 'deep-note').attr('x', (d) => x(medOf(d)) + 4).attr('y', 24).text((d) => `中位数 ${medOf(d)}%`);
  rows.each(function (s) {
    // 蜂群布局避免重叠
    const nodes = s.items.map((d) => ({ ...d, x: x(Math.abs(d.value)), y: rowH / 2 }));
    const sim = d3.forceSimulation(nodes).force('x', d3.forceX((d) => x(Math.abs(d.value))).strength(1))
      .force('y', d3.forceY(rowH / 2).strength(0.08)).force('c', d3.forceCollide(8)).stop();
    for (let k = 0; k < 120; k++) sim.tick();
    d3.select(this).selectAll('circle.pt').data(nodes).join('circle').attr('class', 'pt')
      .attr('cx', (d) => d.x).attr('cy', (d) => Math.max(16, Math.min(rowH - 8, d.y))).attr('r', 7)
      .attr('fill', s.dir === 'up' ? color('--c-red') : color('--c-blue')).attr('fill-opacity', 0.8).attr('stroke', color('--paper-2'))
      .on('pointerenter', (ev, d) => showTip(`<b>${d.name}</b><div>${d.label}：${d.value > 0 ? '+' : ''}${d.value}%</div>`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);
  });
  return {
    step(i, anim) {
      (anim ? rows.transition().duration(500) : rows).attr('opacity', (d, j) => (j <= i ? 1 : 0.08));
    },
  };
}

export const VIZ_MFG = { multiLines, stackBars, lighthouseMap, dotStrips };
