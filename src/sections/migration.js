// 1.3 七十年的人口迁徙：1000 个点代表全部就业人员，随滚动从田间流向工厂、再流向服务业
import * as d3 from 'd3';
import { loadData, color, fmt } from '../core/data.js';
import { attachStatus } from '../core/lazy.js';
import { ScrollTrigger } from '../core/scroll.js';

const N = 1000;
const SECTORS = [
  { key: 'p1', abs: 'primary', name: '第一产业', sub: '田间', c: '--c-green' },
  { key: 'p2', abs: 'secondary', name: '第二产业', sub: '工厂', c: '--c-blue' },
  { key: 'p3', abs: 'tertiary', name: '第三产业', sub: '服务', c: '--c-ochre' },
];
const END_REVEAL = 0.9; // 最后 10% 显出第四个“？”

export function initMigration() {
  const root = document.getElementById('migrate');
  const stage = root.querySelector('.migrate__stage');
  const yearEl = document.getElementById('mg-year');
  const noteEl = document.getElementById('mg-note');
  let api = null, progress = 0;

  ScrollTrigger.create({
    trigger: root,
    pin: root.querySelector('.migrate__pin'),
    start: 'top top',
    end: () => `+=${window.innerHeight * 5}`,
    scrub: true,
    onUpdate: (self) => { progress = self.progress; api?.update(progress); },
    onToggle: (self) => api?.active(self.isActive),
  });

  loadData('china_employment.json').then((payload) => {
    attachStatus(root.querySelector('.migrate__src'), payload.meta);
    api = build(stage, payload.data, { yearEl, noteEl });
    api.update(progress);
  });
}

function build(stage, rows, ui) {
  const first = rows[0].year, last = rows.at(-1).year;
  // 关键年份注释（判断均由数据计算）
  const cross = (a, b) => rows.find((r, i) => i > 0 && r[a] > r[b] && rows[i - 1][a] <= rows[i - 1][b])?.year;
  const y32 = cross('p3', 'p2'), y31 = cross('p3', 'p1');
  const NOTES = [
    { year: first, text: `${first} 年，每 10 个劳动者里有 <b>${Math.round(rows[0].p1 / 10)}</b> 个在田间。` },
    { year: 1978, text: '1978 年，改革开放。农村劳动力开始大规模走向工厂。' },
    { year: y32, text: `${y32} 年，第三产业就业人数首次超过第二产业。` },
    { year: y31, text: `${y31} 年，第三产业成为第一大就业部门。` },
    { year: last, text: `${last} 年，${(rows.at(-1).total / 10000).toFixed(2)} 亿就业人员中，<b>${rows.at(-1).p3}%</b> 在服务业，在田间的只剩 <b>${rows.at(-1).p1}%</b>。` },
  ].filter((n) => n.year);

  const svg = d3.select(stage).append('svg');
  const gZones = svg.append('g');
  const gDots = svg.append('g');
  let W = 0, H = 0, centers = [], zoneLabels;

  const dots = d3.range(N).map((i) => ({ i, s: 0, x: 0, y: 0 }));
  const fx = (d) => centers[d.s]?.x ?? 0;
  const fy = (d) => centers[d.s]?.y ?? 0;
  // forceX/forceY 只在设置访问器时计算目标坐标，扇区或布局变化后需重新设置
  const retarget = () => { sim.force('x').x(fx); sim.force('y').y(fy); };
  const sim = d3.forceSimulation(dots)
    .force('x', d3.forceX(fx).strength(0.07))
    .force('y', d3.forceY(fy).strength(0.07))
    .force('collide', d3.forceCollide(4.2).iterations(2))
    .alphaDecay(0.03)
    .velocityDecay(0.35)
    .on('tick', tick)
    .stop();

  const circles = gDots.selectAll('circle').data(dots).join('circle').attr('r', 3.1);

  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    const narrow = W < 700;
    centers = narrow
      ? [{ x: W * 0.27, y: H * 0.36 }, { x: W * 0.73, y: H * 0.36 }, { x: W * 0.27, y: H * 0.85 }, { x: W * 0.73, y: H * 0.85 }]
      : [{ x: W * 0.15, y: H * 0.56 }, { x: W * 0.4, y: H * 0.56 }, { x: W * 0.64, y: H * 0.56 }, { x: W * 0.87, y: H * 0.56 }];
    const r = Math.min(4.2, Math.sqrt((W * H) / N) * 0.16);
    circles.attr('r', r * 0.74);
    sim.force('collide').radius(r);

    gZones.selectAll('*').remove();
    zoneLabels = [...SECTORS, { name: '下一次迁徙', sub: '智能化之后', c: '--ink-3' }].map((s, k) => {
      const g = gZones.append('g').attr('transform', `translate(${centers[k].x},${narrow ? centers[k].y - H * 0.3 : H * 0.12})`);
      g.append('text').attr('class', 'mg-zone').attr('text-anchor', 'middle').attr('fill', color(s.c)).text(s.name);
      g.append('text').attr('class', 'mg-sub').attr('text-anchor', 'middle').attr('y', 18).text(s.sub);
      const pct = g.append('text').attr('class', 'mg-pct').attr('text-anchor', 'middle').attr('y', narrow ? 46 : 62).attr('fill', color(s.c));
      const abs = g.append('text').attr('class', 'mg-abs').attr('text-anchor', 'middle').attr('y', 84).attr('display', narrow ? 'none' : null);
      return { g, pct, abs };
    });
    // 第四区：虚线圆 + 问号
    const q = gZones.append('g').attr('class', 'mg-q').attr('transform', `translate(${centers[3].x},${centers[3].y})`);
    q.append('circle').attr('r', Math.min(W, H) * (narrow ? 0.16 : 0.13)).attr('fill', 'none')
      .attr('stroke', color('--rule-strong')).attr('stroke-dasharray', '4 6');
    q.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('class', 'mg-qmark').text('？');

    dots.forEach((d) => {
      const c = centers[d.s];
      d.x = c.x + (Math.random() - 0.5) * 120; d.y = c.y + (Math.random() - 0.5) * 120;
    });
    retarget();
    sim.alpha(1).restart();
  }

  function tick() {
    circles.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
  }

  let lastRow = null;
  function update(p) {
    if (!W) return;
    const t = Math.min(1, p / END_REVEAL);
    const yr = first + (last - first) * t;
    const row = [...rows].reverse().find((r) => r.year <= yr) ?? rows[0];
    ui.yearEl.textContent = row.year;

    // 第四区淡入
    const qOp = p > END_REVEAL ? (p - END_REVEAL) / (1 - END_REVEAL) : 0;
    gZones.select('.mg-q').attr('opacity', qOp);
    zoneLabels[3].g.attr('opacity', qOp);

    if (row === lastRow) return;
    lastRow = row;
    // 级联分配：前 n1 个点在第一产业，接着 n2 个在第二产业，其余在第三产业
    const n1 = Math.round(row.p1 * 10), n2 = Math.round(row.p2 * 10);
    let changed = 0;
    dots.forEach((d) => {
      const s = d.i < n1 ? 0 : d.i < n1 + n2 ? 1 : 2;
      if (s !== d.s) { d.s = s; changed++; }
    });
    circles.transition().duration(500).attr('fill', (d) => color(SECTORS[d.s].c));
    SECTORS.forEach((s, k) => {
      zoneLabels[k].pct.text(`${row[s.key].toFixed(1)}%`);
      zoneLabels[k].abs.text(`${fmt.int(row[s.abs])} 万人`);
    });
    if (changed) { retarget(); sim.alpha(Math.max(sim.alpha(), 0.35)).restart(); }

    const note = [...NOTES].reverse().find((n) => n.year <= row.year);
    const html = qOp > 0.3 ? '下一次迁徙，会流向哪里？<br/>当 AI 接手越来越多的工作，劳动者将走向<b>人机协同</b>的新岗位。' : note?.text ?? '';
    if (ui.noteEl.dataset.html !== html) {
      ui.noteEl.dataset.html = html;
      ui.noteEl.classList.remove('is-in'); void ui.noteEl.offsetWidth;
      ui.noteEl.innerHTML = html; ui.noteEl.classList.add('is-in');
    }
  }

  layout();
  new ResizeObserver(() => { const w = stage.clientWidth; if (Math.abs(w - W) > 2) { layout(); lastRow = null; } }).observe(stage);
  return {
    update,
    active: (on) => (on ? sim.alphaTarget(0.02).restart() : sim.alphaTarget(0)),
  };
}
