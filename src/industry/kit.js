// 第三章图表组件库：每个行业的数据通过 viz 字段选择组件
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { color } from '../core/data.js';
import { onResize } from '../core/lazy.js';
import { showTip, moveTip, hideTip, tipRow } from '../core/tooltip.js';
import { ScrollTrigger, gsap } from '../core/scroll.js';

const PAL = () => ['--c-red', '--c-blue', '--c-teal', '--c-ochre', '--c-violet', '--c-green'].map(color);
const C = (v, fallback = '--c-blue') => color(v ?? fallback);

export const fmtV = (v) => {
  if (v == null || Number.isNaN(+v)) return '—';
  const a = Math.abs(v);
  if (a >= 1000) return d3.format(',.0f')(v);
  if (a >= 100) return d3.format(',.1~f')(v);
  return d3.format(',.2~f')(v);
};

/** 统一挂载：进入视口后带动画绘制，之后尺寸变化无动画重绘 */
function mount(el, render, { height } = {}) {
  if (height) el.style.height = `${height}px`;
  const svg = d3.select(el).append('svg');
  let W = 0, H = 0, shown = false, drawn = false;
  const draw = (animate) => {
    svg.selectAll('*').interrupt();
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    render(svg, W, H, animate);
    drawn = true;
  };
  onResize(el, (w, h) => {
    W = w; H = h;
    if (shown) draw(!drawn);
  });
  ScrollTrigger.create({
    trigger: el, start: 'top 88%', once: true,
    onEnter: () => { shown = true; if (W) draw(true); },
  });
}

/* ---------- x 轴解析：年份 / 年月 / 文本 ---------- */
function parseX(x) {
  if (typeof x === 'number') return new Date(x, 0, 1);
  const m = String(x).match(/^(\d{4})(?:[-./](\d{1,2}))?(?:[-./](\d{1,2}))?$/);
  if (m) return new Date(+m[1], m[2] ? +m[2] - 1 : 0, m[3] ? +m[3] : 1);
  return null;
}
const isYearly = (xs) => xs.every((x) => typeof x === 'number' || /^\d{4}$/.test(String(x)));
const xLabel = (x) => (typeof x === 'number' ? `${x}` : String(x).replace('-', '.'));

/* ================= 折线 / 面积 ================= */
export function line(el, spec) {
  const series = spec.series ?? [{ name: spec.title, data: spec.data, color: spec.color }];
  const all = series.flatMap((s) => s.data);
  const yearly = isYearly(all.map((d) => d.x));
  mount(el, (svg, W, H, animate) => {
    const m = { top: 28, right: spec.series ? 92 : 56, bottom: 30, left: 52 };
    const x = d3.scaleTime().domain(d3.extent(all, (d) => parseX(d.x))).range([m.left, W - m.right]);
    const yMax = d3.max(all, (d) => +d.y);
    const yMin = spec.yZero === false ? d3.min(all, (d) => +d.y) * 0.9 : 0;
    const y = d3.scaleLinear().domain([yMin, yMax * 1.08]).nice().range([H - m.bottom, m.top]);
    const pal = PAL();

    svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.left - m.right)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.bottom})`)
      .call((yearly
        ? d3.axisBottom(x).tickValues([...new Set(all.map((d) => +parseX(d.x)))].map((t) => new Date(t)).filter((t, i, arr) => arr.length <= Math.max(2, W / 60) || i % Math.ceil(arr.length / (W / 60)) === 0))
        : d3.axisBottom(x).ticks(Math.min(W / 90, 8))).tickFormat(d3.timeFormat(yearly ? '%Y' : '%Y.%m')).tickSizeOuter(0));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(8).tickFormat(d3.format('~s')));
    if (spec.unit) svg.append('text').attr('class', 'label').attr('x', m.left).attr('y', 12).text(spec.unit);

    // 注释
    (spec.annotations ?? []).forEach((a) => {
      const ax = x(parseX(a.x));
      svg.append('line').attr('class', 'annot-line').attr('stroke-dasharray', '2 3')
        .attr('x1', ax).attr('x2', ax).attr('y1', m.top).attr('y2', H - m.bottom);
      svg.append('text').attr('class', 'annot').attr('x', ax + 4).attr('y', m.top + 10).text(a.text);
    });

    series.forEach((s, si) => {
      const col = s.color ? color(s.color) : (spec.series ? pal[si % pal.length] : C(spec.color, '--c-red'));
      const pts = s.data.map((d) => ({ ...d, d: parseX(d.x) })).sort((a, b) => a.d - b.d);
      if (spec.area !== false && !spec.series) {
        const area = d3.area().x((d) => x(d.d)).y0(y(yMin)).y1((d) => y(d.y)).curve(d3.curveMonotoneX);
        const grad = `lg-${Math.random().toString(36).slice(2, 8)}`;
        const lg = svg.append('defs').append('linearGradient').attr('id', grad).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
        lg.append('stop').attr('offset', '0%').attr('stop-color', col).attr('stop-opacity', 0.32);
        lg.append('stop').attr('offset', '100%').attr('stop-color', col).attr('stop-opacity', 0.02);
        const ap = svg.append('path').attr('d', area(pts)).attr('fill', `url(#${grad})`);
        if (animate) ap.attr('opacity', 0).transition().delay(900).duration(900).attr('opacity', 1);
      }
      const path = svg.append('path').attr('fill', 'none').attr('stroke', col).attr('stroke-width', 2.5)
        .attr('d', d3.line().x((d) => x(d.d)).y((d) => y(d.y)).curve(d3.curveMonotoneX)(pts));
      if (animate) {
        const len = path.node().getTotalLength();
        path.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len)
          .transition().duration(1800).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);
      }
      const dots = svg.append('g').selectAll('circle').data(pts).join('circle')
        .attr('cx', (d) => x(d.d)).attr('cy', (d) => y(d.y)).attr('r', pts.length > 24 ? 0 : 3.2)
        .attr('fill', color('--paper-2')).attr('stroke', col).attr('stroke-width', 1.8);
      if (animate) dots.attr('opacity', 0).transition().delay((d, i) => 300 + (i / pts.length) * 1500).attr('opacity', 1);
      const last = pts.at(-1);
      svg.append('circle').attr('cx', x(last.d)).attr('cy', y(last.y)).attr('r', 5).attr('fill', col);
      const lt = svg.append('text').attr('x', x(last.d) + 8).attr('y', y(last.y)).attr('dy', '0.35em')
        .attr('fill', col).style('font-family', 'var(--f-serif)').style('font-weight', 900).style('font-size', '15px')
        .text(spec.series ? `${s.name}` : fmtV(last.y));
      if (animate) lt.attr('opacity', 0).transition().delay(1700).attr('opacity', 1);
    });

    // 悬停
    const focus = svg.append('line').attr('stroke', color('--ink')).attr('stroke-dasharray', '2 3').style('display', 'none');
    svg.append('rect').attr('x', m.left).attr('y', m.top).attr('width', W - m.left - m.right).attr('height', H - m.top - m.bottom)
      .attr('fill', 'transparent')
      .on('pointermove', (ev) => {
        const t = x.invert(d3.pointer(ev)[0]);
        const xs = [...new Set(all.map((d) => +parseX(d.x)))].sort((a, b) => a - b);
        const near = xs[d3.bisector((v) => v).center(xs, +t)];
        focus.style('display', null).attr('x1', x(near)).attr('x2', x(near)).attr('y1', m.top).attr('y2', H - m.bottom);
        const rows = series.map((s, si) => {
          const p = s.data.find((d) => +parseX(d.x) === near);
          return p ? tipRow(s.name ?? spec.title, `${fmtV(p.y)} ${spec.unit ?? ''}`, spec.series ? pal[si % pal.length] : null) : '';
        }).join('');
        const any = all.find((d) => +parseX(d.x) === near);
        showTip(`<b>${xLabel(any.x)}</b>${rows}${any.note ? `<div>${any.note}</div>` : ''}`, ev);
      })
      .on('pointerleave', () => { focus.style('display', 'none'); hideTip(); });
  }, { height: spec.height });
}

/* ================= 柱状 ================= */
export function bar(el, spec) {
  const data = spec.data;
  mount(el, (svg, W, H, animate) => {
    const m = { top: 30, right: 12, bottom: 30, left: 12 };
    const x = d3.scaleBand().domain(data.map((d) => xLabel(d.x))).range([m.left, W - m.right]).padding(0.28);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => +d.y) * 1.12]).range([H - m.bottom, m.top]);
    const base = C(spec.color, '--c-blue');
    const hi = color('--c-red');
    const hiSet = new Set((spec.highlight ?? [data.at(-1).x]).map(xLabel));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.bottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0).tickValues(x.domain().filter((d, i, arr) => arr.length <= 14 || i % Math.ceil(arr.length / 12) === 0)));
    const g = svg.append('g').selectAll('g').data(data).join('g');
    const rect = g.append('rect').attr('x', (d) => x(xLabel(d.x))).attr('width', x.bandwidth()).attr('rx', 2)
      .attr('fill', (d) => (hiSet.has(xLabel(d.x)) ? hi : base))
      .attr('y', animate ? y(0) : (d) => y(d.y)).attr('height', animate ? 0 : (d) => y(0) - y(d.y));
    if (animate) rect.transition().duration(900).delay((d, i) => i * 70).ease(d3.easeCubicOut)
      .attr('y', (d) => y(d.y)).attr('height', (d) => y(0) - y(d.y));
    if (data.length <= 16 && x.bandwidth() > 22) {
      const t = g.append('text').attr('class', 'label').attr('text-anchor', 'middle').style('font-family', 'var(--f-mono)').style('font-size', '11px')
        .attr('x', (d) => x(xLabel(d.x)) + x.bandwidth() / 2).attr('y', (d) => y(d.y) - 6)
        .attr('fill', (d) => (hiSet.has(xLabel(d.x)) ? hi : color('--ink-2')))
        .text((d) => fmtV(d.y));
      if (animate) t.attr('opacity', 0).transition().delay((d, i) => 600 + i * 70).attr('opacity', 1);
    }
    if (spec.unit) svg.append('text').attr('class', 'label').attr('x', m.left).attr('y', 12).text(spec.unit);
    g.on('pointerenter', (ev, d) => showTip(`<b>${xLabel(d.x)}</b>${tipRow(spec.title, `${fmtV(d.y)} ${spec.unit ?? ''}`)}${d.note ? `<div>${d.note}</div>` : ''}`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);
  }, { height: spec.height });
}

/* ================= 柱 + 折线（双轴：年度值 + 累计/比率） ================= */
export function barline(el, spec) {
  const data = spec.data;
  mount(el, (svg, W, H, animate) => {
    const m = { top: 40, right: 48, bottom: 30, left: 44 };
    const x = d3.scaleBand().domain(data.map((d) => xLabel(d.x))).range([m.left, W - m.right]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.y) * 1.15]).range([H - m.bottom, m.top]);
    const y2v = data.map((d) => d.y2);
    const y2 = d3.scaleLinear().domain([spec.y2Zero === false ? d3.min(y2v) * 0.92 : 0, d3.max(y2v) * 1.08]).range([H - m.bottom, m.top]);
    const cb = C(spec.color, '--c-blue'), cl = color('--c-red');
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.bottom})`).call(d3.axisBottom(x).tickSizeOuter(0));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(6).tickFormat(d3.format('~s')));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${W - m.right},0)`).call(d3.axisRight(y2).ticks(5).tickSize(0).tickPadding(6).tickFormat(d3.format('~s')));
    // 图例
    const lg = svg.append('g').attr('transform', `translate(${m.left},12)`);
    lg.append('rect').attr('width', 10).attr('height', 10).attr('y', -5).attr('fill', cb);
    lg.append('text').attr('class', 'label').attr('x', 15).attr('dy', '0.35em').text(spec.yName);
    lg.append('circle').attr('cx', 140).attr('r', 4).attr('fill', cl);
    lg.append('text').attr('class', 'label').attr('x', 150).attr('dy', '0.35em').text(spec.y2Name);
    const r = svg.append('g').selectAll('rect').data(data).join('rect')
      .attr('x', (d) => x(xLabel(d.x))).attr('width', x.bandwidth()).attr('rx', 2).attr('fill', cb).attr('opacity', 0.85)
      .attr('y', animate ? y(0) : (d) => y(d.y)).attr('height', animate ? 0 : (d) => y(0) - y(d.y));
    if (animate) r.transition().duration(800).delay((d, i) => i * 80).attr('y', (d) => y(d.y)).attr('height', (d) => y(0) - y(d.y));
    if (x.bandwidth() > 24) {
      svg.append('g').selectAll('text').data(data).join('text').attr('class', 'label').attr('text-anchor', 'middle')
        .style('font-family', 'var(--f-mono)').style('font-size', '11px').attr('fill', color('--paper-2'))
        .attr('x', (d) => x(xLabel(d.x)) + x.bandwidth() / 2).attr('y', (d) => y(d.y) + 14)
        .text((d) => (y(0) - y(d.y) > 20 ? fmtV(d.y) : ''));
    }
    const cx = (d) => x(xLabel(d.x)) + x.bandwidth() / 2;
    const p = svg.append('path').attr('fill', 'none').attr('stroke', cl).attr('stroke-width', 2.5)
      .attr('d', d3.line().x(cx).y((d) => y2(d.y2)).curve(d3.curveMonotoneX)(data));
    if (animate) {
      const len = p.node().getTotalLength();
      p.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len).transition().delay(500).duration(1500).attr('stroke-dashoffset', 0);
    }
    svg.append('g').selectAll('circle').data(data).join('circle').attr('cx', cx).attr('cy', (d) => y2(d.y2)).attr('r', 4)
      .attr('fill', color('--paper-2')).attr('stroke', cl).attr('stroke-width', 2);
    const last = data.at(-1);
    svg.append('text').attr('x', cx(last)).attr('y', y2(last.y2) - 12).attr('text-anchor', 'middle').attr('fill', cl)
      .style('font-family', 'var(--f-serif)').style('font-weight', 900).style('font-size', '15px').text(`${fmtV(last.y2)}${spec.y2Unit ?? ''}`);
    svg.append('g').selectAll('rect').data(data).join('rect').attr('x', (d) => x(xLabel(d.x))).attr('width', x.bandwidth())
      .attr('y', m.top).attr('height', H - m.top - m.bottom).attr('fill', 'transparent')
      .on('pointerenter', (ev, d) => showTip(`<b>${xLabel(d.x)}</b>${tipRow(spec.yName, `${fmtV(d.y)} ${spec.unit ?? ''}`, cb)}${tipRow(spec.y2Name, `${fmtV(d.y2)}${spec.y2Unit ?? ''}`, cl)}`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);
  }, { height: spec.height });
}

/* ================= 矩形树图 ================= */
export function treemap(el, spec) {
  mount(el, (svg, W, H, animate) => {
    const groups = [...new Set(spec.data.map((d) => d.group))];
    const pal = PAL();
    const root = d3.hierarchy({ children: groups.map((g) => ({ name: g, children: spec.data.filter((d) => d.group === g) })) })
      .sum((d) => d.value ?? 0).sort((a, b) => b.value - a.value);
    d3.treemap().size([W, H]).paddingInner(3).paddingTop(22).paddingOuter(2).round(true)(root);
    const gc = new Map(groups.map((g, i) => [g, pal[i % pal.length]]));
    svg.append('g').selectAll('text').data(root.children).join('text').attr('class', 'label-strong')
      .attr('x', (d) => d.x0 + 4).attr('y', (d) => d.y0 + 15).attr('fill', (d) => gc.get(d.data.name))
      .text((d) => `${d.data.name} · ${d.value}`);
    const leaf = svg.append('g').selectAll('g').data(root.leaves()).join('g').attr('transform', (d) => `translate(${d.x0},${d.y0})`);
    const rc = leaf.append('rect').attr('width', (d) => d.x1 - d.x0).attr('height', (d) => d.y1 - d.y0).attr('rx', 3)
      .attr('fill', (d) => gc.get(d.data.group)).attr('fill-opacity', (d, i) => 0.55 + (i % 3) * 0.15);
    if (animate) rc.attr('opacity', 0).transition().delay((d, i) => i * 50).duration(500).attr('opacity', 1);
    leaf.append('text').attr('x', 6).attr('y', 18).attr('fill', color('--paper-2')).style('font-size', '12px').style('font-weight', 700)
      .text((d) => ((d.x1 - d.x0) > 56 && (d.y1 - d.y0) > 24 ? d.data.label : ''));
    leaf.append('text').attr('x', 6).attr('y', 36).attr('fill', color('--paper-2')).style('font-family', 'var(--f-mono)').style('font-size', '11px')
      .text((d) => ((d.x1 - d.x0) > 30 && (d.y1 - d.y0) > 42 ? d.data.value : ''));
    leaf.on('pointerenter', (ev, d) => showTip(`<b>${d.data.label}</b>${tipRow(d.data.group, `${d.data.value} ${spec.unit ?? ''}`)}`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);
  }, { height: spec.height ?? 360 });
}

/* ================= 横向排名 ================= */
export function rank(el, spec) {
  const data = spec.data.slice().sort((a, b) => (spec.sort === false ? 0 : b.value - a.value));
  const rowH = spec.rowH ?? 30;
  mount(el, (svg, W, H, animate) => {
    const labelW = Math.min(150, W * 0.3);
    const m = { top: 8, right: 80, left: labelW };
    const x = d3.scaleLinear().domain([0, d3.max(data, (d) => d.value)]).range([0, W - m.left - m.right]);
    const hiSet = new Set(spec.highlight ?? []);
    const g = svg.selectAll('g').data(data).join('g').attr('transform', (d, i) => `translate(0,${m.top + i * rowH})`);
    g.append('text').attr('class', 'label').attr('x', labelW - 10).attr('y', rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
      .style('font-weight', (d) => (hiSet.has(d.label) ? 700 : 400))
      .attr('fill', (d) => (hiSet.has(d.label) ? color('--c-red') : color('--ink-2'))).text((d) => d.label);
    const r = g.append('rect').attr('x', labelW).attr('y', 5).attr('height', rowH - 10).attr('rx', 2)
      .attr('fill', (d) => (hiSet.has(d.label) ? color('--c-red') : C(spec.color, '--c-blue')))
      .attr('width', animate ? 0 : (d) => x(d.value));
    const v = g.append('text').attr('class', 'label').attr('y', rowH / 2).attr('dy', '0.35em').style('font-family', 'var(--f-mono)').style('font-size', '11.5px')
      .attr('x', (d) => labelW + x(d.value) + 6).text((d) => `${fmtV(d.value)}${spec.unitShort ?? ''}`);
    if (animate) {
      r.transition().duration(1000).delay((d, i) => i * 60).ease(d3.easeCubicOut).attr('width', (d) => x(d.value));
      v.attr('opacity', 0).transition().delay((d, i) => 700 + i * 60).attr('opacity', 1);
    }
    g.on('pointerenter', (ev, d) => showTip(`<b>${d.label}</b>${tipRow(spec.title, `${fmtV(d.value)} ${spec.unit ?? ''}`)}${d.note ? `<div>${d.note}</div>` : ''}`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);
  }, { height: spec.height ?? data.length * rowH + 16 });
}

/* ================= 中国地图 ================= */
let chinaGeo = null;
// DataV 的多边形为逆时针，d3 球面几何需要顺时针：面积超过半球的环需要翻转
function rewind(geo) {
  geo.features.forEach((f) => {
    const g = f.geometry;
    if (!g) return;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    polys.forEach((rings) => {
      if (d3.geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI) rings.forEach((r) => r.reverse());
    });
  });
  return geo;
}
export const loadChina = () => (chinaGeo ??= d3.json(`${import.meta.env.BASE_URL}geo/china.json`).then(rewind));

export function china(el, spec) {
  loadChina().then((geo) => mount(el, (svg, W, H, animate) => {
    const provinces = geo.features.filter((f) => f.properties.name);
    const others = geo.features.filter((f) => !f.properties.name);
    const proj = d3.geoMercator().fitExtent([[10, 10], [W - 10, H - 40]], geo);
    const path = d3.geoPath(proj);
    const byName = new Map((spec.data ?? []).map((d) => [d.name, d]));
    const find = (f) => {
      for (const [k, v] of byName) if (f.properties.name.startsWith(k)) return v;
      return null;
    };
    const vals = (spec.data ?? []).map((d) => d.value);
    const ramp = d3.scaleSequential(d3.interpolateRgb(color('--paper-3'), C(spec.color, '--c-red')))
      .domain([0, d3.max(vals) || 1]);
    const g = svg.append('g');
    const prov = g.selectAll('path.p').data(provinces).join('path').attr('class', 'p')
      .attr('d', path).attr('stroke', color('--paper')).attr('stroke-width', 0.8)
      .attr('fill', (f) => { const d = find(f); return d ? ramp(d.value) : color('--paper-3'); });
    g.selectAll('path.o').data(others).join('path').attr('d', path)
      .attr('fill', 'none').attr('stroke', color('--ink-3')).attr('stroke-width', 1);
    if (animate) {
      prov.attr('opacity', 0).transition().duration(700)
        .delay((f) => { const d = find(f); return d ? 300 + (1 - d.value / (d3.max(vals) || 1)) * 900 : 0; })
        .attr('opacity', 1);
    }
    prov.on('pointerenter', function (ev, f) {
      d3.select(this).attr('stroke', color('--ink')).attr('stroke-width', 1.6).raise();
      const d = find(f);
      showTip(`<b>${f.properties.name}</b>${d ? tipRow(spec.title, `${fmtV(d.value)} ${spec.unit ?? ''}`) : '<div>—</div>'}${d?.note ? `<div>${d.note}</div>` : ''}`, ev);
    }).on('pointermove', moveTip).on('pointerleave', function () {
      d3.select(this).attr('stroke', color('--paper')).attr('stroke-width', 0.8); hideTip();
    });

    // 城市/项目标注点（带脉冲）
    const pts = (spec.points ?? []).map((p) => ({ ...p, xy: proj([p.lon, p.lat]) }));
    const pg = svg.append('g').selectAll('g').data(pts).join('g').attr('transform', (d) => `translate(${d.xy})`);
    pg.append('circle').attr('r', 4).attr('fill', color('--c-red')).attr('stroke', color('--paper-2')).attr('stroke-width', 1.5);
    pg.append('circle').attr('r', 4).attr('fill', 'none').attr('stroke', color('--c-red'))
      .each(function pulse(d, i) {
        d3.select(this).attr('r', 4).attr('opacity', 0.9)
          .transition().delay(i * 120).duration(1800).ease(d3.easeCubicOut).attr('r', 18).attr('opacity', 0)
          .on('end', pulse);
      });
    if (pts.length <= 30) {
      pg.append('text').attr('class', 'label').attr('x', 7).attr('dy', '0.35em').style('font-size', '11px')
        .attr('paint-order', 'stroke').attr('stroke', color('--paper')).attr('stroke-width', 3).text((d) => d.label ?? d.name);
    }
    pg.on('pointerenter', (ev, d) => showTip(`<b>${d.name}</b>${d.note ? `<div>${d.note}</div>` : ''}`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);

    // 图例
    if (vals.length) {
      const lw = Math.min(180, W * 0.4), lx = 12, ly = H - 22;
      const gid = `cg-${Math.random().toString(36).slice(2, 7)}`;
      const lg = svg.append('defs').append('linearGradient').attr('id', gid);
      lg.append('stop').attr('offset', '0%').attr('stop-color', ramp(0));
      lg.append('stop').attr('offset', '100%').attr('stop-color', ramp(d3.max(vals)));
      svg.append('rect').attr('x', lx).attr('y', ly).attr('width', lw).attr('height', 8).attr('rx', 2).attr('fill', `url(#${gid})`);
      svg.append('text').attr('class', 'label').attr('x', lx).attr('y', ly + 20).style('font-size', '10.5px').text('0');
      svg.append('text').attr('class', 'label').attr('x', lx + lw).attr('y', ly + 20).attr('text-anchor', 'end').style('font-size', '10.5px')
        .text(`${fmtV(d3.max(vals))} ${spec.unit ?? ''}`);
    }
  }, { height: spec.height ?? 460 }));
}

/* ================= 世界气泡图 ================= */
const ZH_EN = {
  中国: 'China', 美国: 'United States of America', 日本: 'Japan', 德国: 'Germany', 韩国: 'South Korea', 英国: 'United Kingdom',
  法国: 'France', 印度: 'India', 加拿大: 'Canada', 意大利: 'Italy', 西班牙: 'Spain', 新加坡: 'Singapore', 以色列: 'Israel',
  瑞士: 'Switzerland', 瑞典: 'Sweden', 荷兰: 'Netherlands', 澳大利亚: 'Australia', 巴西: 'Brazil', 俄罗斯: 'Russia',
  墨西哥: 'Mexico', 沙特阿拉伯: 'Saudi Arabia', 阿联酋: 'United Arab Emirates', 阿拉伯联合酋长国: 'United Arab Emirates',
  土耳其: 'Turkey', 越南: 'Vietnam', 泰国: 'Thailand', 马来西亚: 'Malaysia', 印度尼西亚: 'Indonesia', 芬兰: 'Finland',
  丹麦: 'Denmark', 挪威: 'Norway', 奥地利: 'Austria', 比利时: 'Belgium', 爱尔兰: 'Ireland', 波兰: 'Poland', 捷克: 'Czechia',
  葡萄牙: 'Portugal', 匈牙利: 'Hungary', 南非: 'South Africa', 埃及: 'Egypt', 阿根廷: 'Argentina', 智利: 'Chile',
  新西兰: 'New Zealand', 卡塔尔: 'Qatar', 摩洛哥: 'Morocco', 斯洛伐克: 'Slovakia', 罗马尼亚: 'Romania', 哥伦比亚: 'Colombia',
  巴基斯坦: 'Pakistan', 孟加拉国: 'Bangladesh', 菲律宾: 'Philippines', 尼日利亚: 'Nigeria', 肯尼亚: 'Kenya', 卢旺达: 'Rwanda',
  爱沙尼亚: 'Estonia', 立陶宛: 'Lithuania', 希腊: 'Greece', 乌克兰: 'Ukraine', 哈萨克斯坦: 'Kazakhstan', 伊朗: 'Iran',
};
let worldGeo = null;
const loadWorld = () => (worldGeo ??= d3.json(`${import.meta.env.BASE_URL}geo/world-110m.json`)
  .then((t) => topojson.feature(t, t.objects.countries)));

export function world(el, spec) {
  loadWorld().then((geo) => mount(el, (svg, W, H, animate) => {
    const proj = d3.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' });
    const path = d3.geoPath(proj);
    const feats = new Map(geo.features.map((f) => [f.properties.name, f]));
    const data = (spec.data ?? []).map((d) => {
      const f = feats.get(ZH_EN[d.name] ?? d.name);
      const xy = d.lon != null ? proj([d.lon, d.lat]) : f ? path.centroid(f) : null;
      return { ...d, f, xy };
    }).filter((d) => d.xy && !Number.isNaN(d.xy[0]));
    const fillOf = new Map(data.filter((d) => d.f).map((d) => [d.f, d]));
    svg.append('path').attr('d', path({ type: 'Sphere' })).attr('fill', 'none').attr('stroke', color('--rule'));
    svg.append('g').selectAll('path').data(geo.features).join('path').attr('d', path)
      .attr('fill', (f) => (fillOf.has(f) && spec.choropleth ? color('--c-blue-soft') : color('--paper-3')))
      .attr('stroke', color('--paper')).attr('stroke-width', 0.5);
    const r = d3.scaleSqrt().domain([0, d3.max(data, (d) => d.value) || 1]).range([0, spec.maxR ?? Math.min(46, W / 16)]);
    const hiSet = new Set(spec.highlight ?? ['中国']);
    const b = svg.append('g').selectAll('circle').data(data.sort((a, b) => b.value - a.value)).join('circle')
      .attr('cx', (d) => d.xy[0]).attr('cy', (d) => d.xy[1])
      .attr('fill', (d) => (hiSet.has(d.name) ? color('--c-red') : C(spec.color, '--c-blue')))
      .attr('fill-opacity', 0.72).attr('stroke', color('--paper-2')).attr('stroke-width', 1)
      .attr('r', animate ? 0 : (d) => r(d.value));
    if (animate) b.transition().duration(1000).delay((d, i) => i * 50).ease(d3.easeBackOut).attr('r', (d) => r(d.value));
    const top = data.slice(0, spec.labels ?? 6);
    svg.append('g').selectAll('text').data(top).join('text').attr('class', 'label-strong')
      .attr('x', (d) => d.xy[0]).attr('y', (d) => d.xy[1] - r(d.value) - 5).attr('text-anchor', 'middle').style('font-size', '11.5px')
      .attr('paint-order', 'stroke').attr('stroke', color('--paper')).attr('stroke-width', 3)
      .text((d) => `${d.name} ${fmtV(d.value)}`)
      .each(function () {
        // 简单避让：与已放置标签重叠则隐藏
        const box = this.getBBox();
        const placed = (svg.node().__placed ??= []);
        if (placed.some((p) => box.x < p.x + p.width && box.x + box.width > p.x && box.y < p.y + p.height && box.y + box.height > p.y)) this.remove();
        else placed.push(box);
      });
    svg.node().__placed = null;
    b.on('pointerenter', (ev, d) => showTip(`<b>${d.name}</b>${tipRow(spec.title, `${fmtV(d.value)} ${spec.unit ?? ''}`)}${d.note ? `<div>${d.note}</div>` : ''}`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);
  }, { height: spec.height ?? 420 }));
}

/* ================= 环形 ================= */
export function donut(el, spec) {
  mount(el, (svg, W, H, animate) => {
    const R = Math.min(W * 0.5, H) / 2 - 8;
    const cx = Math.min(W * 0.28, R + 10), cy = H / 2;
    const pal = spec.colors ? spec.colors.map(color) : PAL();
    const pie = d3.pie().value((d) => d.value).sort(null).padAngle(0.012);
    const arc = d3.arc().innerRadius(R * 0.6).outerRadius(R).cornerRadius(3);
    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);
    const arcs = pie(spec.data);
    const p = g.selectAll('path').data(arcs).join('path').attr('fill', (d, i) => pal[i % pal.length]);
    if (animate) {
      p.transition().duration(1100).delay((d, i) => i * 120).attrTween('d', (d) => {
        const i = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
        return (t) => arc(i(t));
      });
    } else p.attr('d', arc);
    const total = d3.sum(spec.data, (d) => d.value);
    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.1em').style('font-family', 'var(--f-serif)').style('font-weight', 900)
      .style('font-size', `${Math.max(18, R * 0.3)}px`).attr('fill', color('--ink')).text(spec.center ?? fmtV(total));
    g.append('text').attr('text-anchor', 'middle').attr('dy', '1.6em').attr('class', 'label').text(spec.centerLabel ?? spec.unit ?? '');
    const lx = cx + R + 28;
    const lg = svg.append('g').selectAll('g').data(spec.data).join('g')
      .attr('transform', (d, i) => `translate(${lx},${cy - (spec.data.length * 26) / 2 + i * 26 + 13})`);
    lg.append('rect').attr('width', 11).attr('height', 11).attr('y', -6).attr('rx', 2).attr('fill', (d, i) => pal[i % pal.length]);
    lg.append('text').attr('class', 'label').attr('x', 18).attr('dy', '0.35em')
      .text((d) => `${d.label}　${fmtV(d.value)}${spec.unitShort ?? ''}（${((d.value / total) * 100).toFixed(1)}%）`);
    p.on('pointerenter', (ev, d) => showTip(`<b>${d.data.label}</b>${tipRow('数值', `${fmtV(d.data.value)} ${spec.unit ?? ''}`)}${tipRow('占比', `${((d.data.value / total) * 100).toFixed(1)}%`)}`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);
  }, { height: spec.height ?? 300 });
}

/* ================= 华夫格 ================= */
export function waffle(el, spec) {
  mount(el, (svg, W, H, animate) => {
    const total = spec.total ?? 100;
    const cols = 10, rows = Math.ceil(total / cols);
    const size = Math.min((H - 10) / rows, (W * 0.5) / cols) - 3;
    const cells = svg.append('g').selectAll('rect').data(d3.range(total)).join('rect')
      .attr('x', (i) => (i % cols) * (size + 3)).attr('y', (i) => Math.floor(i / cols) * (size + 3))
      .attr('width', size).attr('height', size).attr('rx', 2).attr('fill', color('--paper-3'));
    const on = (i) => i < Math.round(spec.value);
    (animate ? cells.transition().duration(400).delay((i) => i * 12) : cells).attr('fill', (i) => (on(i) ? C(spec.color, '--c-red') : color('--paper-3')));
    const gx = cols * (size + 3) + 24;
    svg.append('text').attr('x', gx).attr('y', H * 0.38).attr('fill', C(spec.color, '--c-red'))
      .style('font-family', 'var(--f-serif)').style('font-weight', 900).style('font-size', '52px').text(`${fmtV(spec.value)}${spec.unitShort ?? ''}`);
    svg.append('text').attr('class', 'label').attr('x', gx).attr('y', H * 0.38 + 28).text(spec.label ?? '');
  }, { height: spec.height ?? 240 });
}

/* ================= 前后对比 ================= */
export function compare(el, spec) {
  const data = spec.data;
  const rowH = spec.rowH ?? 86;
  mount(el, (svg, W, H, animate) => {
    const maxW = W - 240;
    data.forEach((d, i) => {
      const g = svg.append('g').attr('transform', `translate(0,${i * rowH + 6})`);
      const x = d3.scaleLinear().domain([0, Math.max(d.before, d.after)]).range([0, maxW]);
      g.append('text').attr('class', 'label-strong').attr('y', 12).text(d.label);
      g.append('rect').attr('y', 22).attr('height', 16).attr('rx', 2).attr('fill', color('--paper-4')).attr('width', x(d.before));
      g.append('text').attr('class', 'label').attr('x', x(d.before) + 8).attr('y', 30).attr('dy', '0.35em')
        .text(`${d.beforeLabel ?? '之前'} ${fmtV(d.before)} ${d.unit ?? ''}`);
      const r = g.append('rect').attr('y', 44).attr('height', 16).attr('rx', 2).attr('fill', color('--c-red'))
        .attr('width', animate ? x(d.before) : x(d.after));
      if (animate) r.transition().delay(400 + i * 200).duration(1300).ease(d3.easeCubicInOut).attr('width', x(d.after));
      g.append('text').attr('class', 'label-strong').attr('fill', color('--c-red')).attr('x', x(d.after) + 8).attr('y', 52).attr('dy', '0.35em')
        .text(`${d.afterLabel ?? '之后'} ${fmtV(d.after)} ${d.unit ?? ''}`);
      const ratio = d.after / d.before;
      const txt = d.delta ?? (ratio >= 1 ? `×${fmtV(ratio)}` : `−${((1 - ratio) * 100).toFixed(0)}%`);
      g.append('text').attr('x', W).attr('y', 50).attr('text-anchor', 'end').attr('fill', color('--c-red'))
        .style('font-family', 'var(--f-serif)').style('font-weight', 900).style('font-size', txt.length > 6 ? '18px' : '28px').text(txt);
    });
  }, { height: spec.height ?? data.length * rowH + 8 });
}

/* ================= 哑铃图（同一刻度上的两期对比） ================= */
export function dumbbell(el, spec) {
  const data = spec.data;
  const rowH = spec.rowH ?? 40;
  mount(el, (svg, W, H, animate) => {
    const labelW = Math.min(110, W * 0.26);
    const m = { top: 30, right: 70, left: labelW };
    const max = d3.max(data, (d) => Math.max(d.a, d.b));
    const min = spec.zero === false ? d3.min(data, (d) => Math.min(d.a, d.b)) * 0.9 : 0;
    const x = d3.scaleLinear().domain([min, max * 1.04]).range([m.left, W - m.right]);
    const ca = color('--ink-3'), cb = color('--c-red');
    [[spec.aLabel, ca], [spec.bLabel, cb]].forEach(([t, c], i) => {
      const g = svg.append('g').attr('transform', `translate(${m.left + i * 90},10)`);
      g.append('circle').attr('r', 5).attr('cy', 0).attr('fill', c);
      g.append('text').attr('class', 'label').attr('x', 10).attr('dy', '0.35em').text(t);
    });
    const g = svg.selectAll('g.row').data(data).join('g').attr('class', 'row').attr('transform', (d, i) => `translate(0,${m.top + i * rowH + rowH / 2})`);
    g.append('text').attr('class', 'label').attr('x', labelW - 10).attr('dy', '0.35em').attr('text-anchor', 'end').text((d) => d.label);
    g.append('line').attr('x1', m.left).attr('x2', W - m.right).attr('stroke', color('--rule')).attr('stroke-dasharray', '2 4');
    const ln = g.append('line').attr('stroke', color('--c-red-soft')).attr('stroke-width', 4)
      .attr('x1', (d) => x(d.a)).attr('x2', (d) => x(animate ? d.a : d.b));
    g.append('circle').attr('r', 6).attr('cx', (d) => x(d.a)).attr('fill', ca);
    const cbS = g.append('circle').attr('r', 7).attr('fill', cb).attr('cx', (d) => x(animate ? d.a : d.b));
    const t = g.append('text').attr('class', 'label-strong').attr('dy', '0.35em').style('font-size', '12px')
      .attr('x', (d) => Math.max(x(d.a), x(d.b)) + 12)
      .text((d) => `${fmtV(d.b)}${d.b >= d.a ? ' ↑' : ' ↓'}`)
      .attr('fill', (d) => (d.b >= d.a ? cb : color('--ink-2')));
    if (animate) {
      ln.transition().delay((d, i) => 300 + i * 90).duration(900).ease(d3.easeCubicInOut).attr('x2', (d) => x(d.b));
      cbS.transition().delay((d, i) => 300 + i * 90).duration(900).ease(d3.easeCubicInOut).attr('cx', (d) => x(d.b));
      t.attr('opacity', 0).transition().delay((d, i) => 1100 + i * 90).attr('opacity', 1);
    }
    g.on('pointerenter', (ev, d) => showTip(`<b>${d.label}</b>${tipRow(spec.aLabel, `${fmtV(d.a)} ${spec.unit ?? ''}`, ca)}${tipRow(spec.bLabel, `${fmtV(d.b)} ${spec.unit ?? ''}`, cb)}`, ev))
      .on('pointermove', moveTip).on('pointerleave', hideTip);
  }, { height: spec.height ?? data.length * rowH + 40 });
}

/* ================= 点阵（单位图） ================= */
export function dots(el, spec) {
  mount(el, (svg, W, H, animate) => {
    const unit = spec.unit_per_dot;
    const groups = spec.data.map((d, i) => ({ ...d, n: Math.max(1, Math.round(d.value / unit)), col: d.color ? color(d.color) : PAL()[i % 6] }));
    const total = d3.sum(groups, (g) => g.n);
    const top = 26 * groups.length + 8;
    const cell = Math.max(4, Math.floor(Math.sqrt((W * (H - top - 20)) / (total * 1.1))));
    const cols = Math.floor(W / cell);
    let k = 0;
    groups.forEach((g, gi) => {
      svg.append('text').attr('class', 'label-strong').attr('y', 16 + gi * 26).attr('fill', g.col)
        .text(`● ${g.label}：${fmtV(g.value)} ${spec.unit ?? ''}`);
      const start = k;
      const c = svg.append('g').selectAll('circle').data(d3.range(g.n)).join('circle')
        .attr('cx', (i) => ((start + i) % cols) * cell + cell / 2)
        .attr('cy', (i) => top + Math.floor((start + i) / cols) * cell + cell / 2)
        .attr('fill', g.col).attr('r', animate ? 0 : cell * 0.36);
      if (animate) c.transition().delay((i) => (start + i) * Math.min(4, 2500 / total)).duration(260).attr('r', cell * 0.36);
      k += g.n;
    });
    svg.append('text').attr('class', 'annot').attr('y', H - 4).text(`每个点 = ${fmtV(unit)} ${spec.unit ?? ''}`);
  }, { height: spec.height ?? 360 });
}

/* ================= 堆叠柱 ================= */
export function stack(el, spec) {
  mount(el, (svg, W, H, animate) => {
    const m = { top: 34, right: 12, bottom: 30, left: 44 };
    const keys = spec.keys.map((k) => k.key);
    const series = d3.stack().keys(keys)(spec.data);
    const pal = spec.keys.map((k, i) => (k.color ? color(k.color) : PAL()[i % 6]));
    const x = d3.scaleBand().domain(spec.data.map((d) => xLabel(d.x))).range([m.left, W - m.right]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(series.at(-1), (d) => d[1]) * 1.05]).range([H - m.bottom, m.top]);
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.bottom})`).call(d3.axisBottom(x).tickSizeOuter(0));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(6).tickFormat(d3.format('~s')));
    series.forEach((s, si) => {
      const r = svg.append('g').selectAll('rect').data(s).join('rect')
        .attr('x', (d) => x(xLabel(d.data.x))).attr('width', x.bandwidth()).attr('fill', pal[si])
        .attr('y', (d) => y(d[1])).attr('height', (d) => y(d[0]) - y(d[1]));
      if (animate) r.attr('transform-origin', `0 ${H - m.bottom}`).attr('opacity', 0).transition().delay((d, i) => i * 60 + si * 200).duration(500).attr('opacity', 1);
      r.on('pointerenter', (ev, d) => showTip(`<b>${xLabel(d.data.x)}</b>${spec.keys.map((k, ki) => tipRow(k.name, `${fmtV(d.data[k.key])} ${spec.unit ?? ''}`, pal[ki])).join('')}`, ev))
        .on('pointermove', moveTip).on('pointerleave', hideTip);
    });
    let lx = m.left;
    spec.keys.forEach((k, i) => {
      const g = svg.append('g').attr('transform', `translate(${lx},10)`);
      g.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', pal[i]);
      const t = g.append('text').attr('class', 'label').attr('x', 15).attr('y', 9).text(k.name);
      lx += 15 + t.node().getComputedTextLength() + 22;
    });
  }, { height: spec.height });
}

/* ================= HTML 组件：大数字、事件时间线 ================= */
export function stats(el, spec) {
  el.classList.add('kit-stats');
  el.innerHTML = spec.data.map((d) => `
    <div class="kit-stat">
      <b data-count="${d.value}">${d.value}</b><small>${d.unit ?? ''}</small>
      <span>${d.label}</span>
    </div>`).join('');
  el.querySelectorAll('[data-count]').forEach((n) => {
    const raw = n.dataset.count;
    const target = parseFloat(raw);
    if (!Number.isFinite(target) || /[^\d.]/.test(raw)) return;
    const dec = (raw.split('.')[1] ?? '').length;
    const o = { v: 0 };
    n.textContent = (0).toFixed(dec);
    gsap.to(o, { v: target, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' }, onUpdate: () => { n.textContent = o.v.toFixed(dec); } });
  });
}

export function events(el, spec) {
  el.classList.add('kit-events');
  el.innerHTML = spec.data.map((d) => `<li><time>${d.date}</time><p>${d.text}</p></li>`).join('');
  gsap.from(el.children, { opacity: 0, y: 20, duration: 0.8, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 85%' } });
}

export const KIT = { line, area: line, bar, barline, treemap, rank, china, world, donut, waffle, compare, dumbbell, dots, stack, stats, events };
