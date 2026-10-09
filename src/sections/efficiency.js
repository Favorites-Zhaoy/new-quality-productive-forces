// 2.2 效率：“时间坍缩”——161 个方块代表对照组的 161 分钟，滚动时 AI 介入，90 个方块脱落并聚成“省下的时间”
import * as d3 from 'd3';
import { loadData, color } from '../core/data.js';
import { attachStatus } from '../core/lazy.js';
import { ScrollTrigger, gsap } from '../core/scroll.js';

const COLS = 14;

export function initEfficiency() {
  const root = document.getElementById('effi');
  const stage = root.querySelector('.effi__stage');
  const ui = {
    clock: document.getElementById('ef-clock'),
    clockLabel: document.getElementById('ef-clock-label'),
    steps: [...root.querySelectorAll('.effi__step')],
  };
  let api = null, progress = 0;

  ScrollTrigger.create({
    trigger: root,
    pin: root.querySelector('.effi__pin'),
    start: 'top top',
    end: () => `+=${window.innerHeight * 4}`,
    scrub: true,
    onUpdate: (self) => { progress = self.progress; api?.render(progress); },
  });

  loadData('efficiency.json').then((payload) => {
    api = buildRace(stage, payload.race, ui);
    api.render(progress);
    new ResizeObserver(() => { api.resize(); api.render(progress); }).observe(stage);
    buildStudies(document.getElementById('effi-studies'), payload.studies);
    buildGap(document.getElementById('effi-gap'), payload.gap);
    attachStatus(document.getElementById('effi-src'), payload.meta);
  });
}

/* ---------------- 时间坍缩 ---------------- */
function buildRace(stage, race, ui) {
  const total = Math.ceil(race.control);          // 161
  const kept = Math.floor(race.treated);          // 71
  const saved = race.control - race.treated;      // 89.72
  const blocks = d3.range(total).map((i) => ({ i, keep: i < kept }));

  const svg = d3.select(stage).append('svg');
  const gGrid = svg.append('g');
  const gLabels = svg.append('g');
  const rects = gGrid.selectAll('rect').data(blocks).join('rect').attr('rx', 2);
  const labA = gLabels.append('g');
  const labB = gLabels.append('g');
  labA.append('text').attr('class', 'ef-lab-num');
  labA.append('text').attr('class', 'ef-lab-sub').attr('dy', 22);
  labB.append('text').attr('class', 'ef-lab-num ef-lab-num--saved');
  labB.append('text').attr('class', 'ef-lab-sub').attr('dy', 22);

  let W = 0, H = 0, L = {};
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    const narrow = W < 640;
    const rows = Math.ceil(total / COLS);
    // 左：原始网格；右：“省下的时间”网格（10 列）
    const savedCols = narrow ? 14 : 8;
    const savedRows = Math.ceil((total - kept) / savedCols);
    const gridW = narrow ? W : W * 0.6;
    const s = narrow
      ? Math.min(W / COLS, (H - 190) / (rows + savedRows))
      : Math.min(gridW / COLS, (H * 0.82) / rows, (W * 0.4 - 28) / savedCols);
    L = {
      s, rows, narrow,
      ax: 0, ay: narrow ? 46 : (H - rows * s) / 2 + 20,
      bx: narrow ? 0 : COLS * s + 28,
      by: narrow ? 46 + rows * s + 100 : (H - rows * s) / 2 + 20,
      savedCols,
    };
  }
  resize();

  const ink = () => color('--c-blue-deep');
  const red = () => color('--c-red');
  const ochre = () => color('--c-ochre');
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = d3.easeCubicInOut;

  function render(p) {
    if (!W) return;
    const { s } = L;
    const appear = clamp(p / 0.22);                 // 0—0.22：方块逐个出现
    const cut = ease(clamp((p - 0.32) / 0.26));     // 0.32—0.58：AI 介入，后 90 块脱落
    const fly = ease(clamp((p - 0.62) / 0.24));     // 0.62—0.86：脱落的方块聚成“省下的时间”
    const gap = Math.max(1, s * 0.12);

    rects.each(function (d) {
      const r = d3.select(this);
      const col = d.i % COLS, row = Math.floor(d.i / COLS);
      const x0 = L.ax + col * s, y0 = L.ay + row * s;
      const shown = d.i < appear * total;
      let x = x0, y = y0, op = shown ? 1 : 0, fill = ink(), stroke = 'none', fillOp = 1;
      if (d.keep) {
        fill = d3.interpolateRgb(ink(), red())(cut);
      } else {
        const k = d.i - kept;
        const bx = L.bx + (k % L.savedCols) * s, by = L.by + Math.floor(k / L.savedCols) * s;
        // 脱落：先下沉变淡，再飞向右侧
        const drop = cut * (6 + (k % 7));
        x = lerp(x0, bx, fly);
        y = lerp(y0 + drop * (1 - fly), by, fly);
        fillOp = lerp(1, 0.18, cut) + fly * 0.82;
        fill = cut < 1 ? ink() : d3.interpolateRgb(ink(), ochre())(fly);
        if (cut > 0 && fly < 1) stroke = ink();
      }
      r.attr('x', x + gap / 2).attr('y', y + gap / 2).attr('width', s - gap).attr('height', s - gap)
        .attr('opacity', op).attr('fill', fill).attr('fill-opacity', fillOp)
        .attr('stroke', stroke).attr('stroke-opacity', 0.35).attr('stroke-dasharray', '2 2');
    });

    // 计时器
    const minutes = cut > 0 ? lerp(race.control, race.treated, cut) : race.control * appear;
    ui.clock.textContent = minutes.toFixed(2);
    ui.clock.style.color = cut > 0.5 ? red() : '';
    ui.clockLabel.textContent = cut > 0.5 ? '用 AI 编程助手' : '不用 AI';

    // 网格标签
    labA.attr('transform', `translate(${L.ax},${L.ay - 30})`).attr('opacity', appear > 0.98 ? 1 : 0);
    labA.select('.ef-lab-num').attr('fill', cut > 0.5 ? red() : ink())
      .text(cut > 0.5 ? `${race.treated} 分钟` : `${race.control} 分钟`);
    labA.select('.ef-lab-sub').attr('y', 0).attr('dy', null).attr('x', 0).attr('transform', `translate(0,${L.rows * s + 52})`)
      .text(cut > 0.5 ? `快 ${race.faster}%` : '每个方块 = 1 分钟');
    labB.attr('transform', `translate(${L.bx},${L.by - 30})`).attr('opacity', fly);
    labB.select('.ef-lab-num').attr('fill', ochre()).text(`省下 ${saved.toFixed(2)} 分钟`);
    labB.select('.ef-lab-sub').attr('y', 0).attr('dy', null)
      .attr('transform', `translate(0,${Math.ceil((total - kept) / L.savedCols) * s + 52})`)
      .text('近一个半小时');

    // 文案步骤
    const step = p < 0.3 ? 0 : p < 0.6 ? 1 : 2;
    ui.steps.forEach((el, k) => el.classList.toggle('is-on', k === step));
  }

  return { render, resize };
}

/* ---------------- 三项实验对照 ---------------- */
function buildStudies(el, studies) {
  el.innerHTML = studies.map((s) => `
    <article class="effi-card">
      <header><span class="effi-card__field">${s.field}</span><h4>${s.title}</h4><p>${s.who}</p></header>
      <div class="effi-card__metrics">
        ${s.metrics.map((m) => `
          <div class="effi-metric" data-better="${m.better}">
            <div class="effi-metric__head"><span>${m.name}</span><b>${m.label}</b></div>
            <div class="effi-bar"><i class="effi-bar__c" style="--w:${m.control}"></i><span>对照组 100</span></div>
            <div class="effi-bar effi-bar--ai"><i class="effi-bar__t" style="--w:${m.treated}"></i><span>用 AI ${m.treated}</span></div>
          </div>`).join('')}
      </div>
      <blockquote>“${s.quote}”</blockquote>
      <footer><a href="${s.url}" target="_blank" rel="noopener">${s.source} ↗</a></footer>
    </article>`).join('');
  // 横条按 0—130 的统一刻度
  el.querySelectorAll('.effi-bar i').forEach((i) => { i.style.width = '0%'; });
  ScrollTrigger.create({
    trigger: el, start: 'top 75%', once: true,
    onEnter: () => {
      gsap.from(el.querySelectorAll('.effi-card'), { opacity: 0, y: 40, duration: 0.9, ease: 'expo.out', stagger: 0.12 });
      el.querySelectorAll('.effi-bar i').forEach((i, k) => {
        const w = parseFloat(i.style.getPropertyValue('--w'));
        gsap.to(i, { width: `${(w / 130) * 100}%`, duration: 1.2, delay: 0.3 + k * 0.08, ease: 'expo.out' });
      });
    },
  });
}

/* ---------------- 谁受益最多 ---------------- */
function buildGap(el, gap) {
  el.innerHTML = `
    <div class="effi-gap__chart"></div>
    <div class="effi-gap__side">
      <blockquote>“${gap.quote}”<cite><a href="${gap.url}" target="_blank" rel="noopener">${gap.source} ↗</a></cite></blockquote>
      <p class="effi-gap__echo-title">另外两项实验也发现了同样的规律：</p>
      <ul>${gap.echoes.map((e) => `<li>${e.text}<a href="${e.url}" target="_blank" rel="noopener">${e.source} ↗</a></li>`).join('')}</ul>
    </div>`;
  const box = el.querySelector('.effi-gap__chart');
  const W = box.clientWidth || 520, rowH = 64, H = gap.data.length * rowH + 20;
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const labelW = Math.min(150, W * 0.36);
  const x = d3.scaleLinear().domain([0, 40]).range([labelW, W - 60]);
  const g = svg.selectAll('g').data(gap.data).join('g').attr('transform', (d, i) => `translate(0,${10 + i * rowH})`);
  g.append('text').attr('class', 'effi-gap__label').attr('x', labelW - 12).attr('y', rowH / 2 - 4).attr('dy', '0.35em').attr('text-anchor', 'end').text((d) => d.label);
  const bars = g.append('rect').attr('x', labelW).attr('y', rowH / 2 - 18).attr('height', 28).attr('rx', 3)
    .attr('fill', (d, i) => (i === 0 ? color('--c-red') : d.value == null ? 'none' : color('--c-blue')))
    .attr('stroke', (d) => (d.value == null ? color('--rule-strong') : 'none')).attr('stroke-dasharray', '3 3')
    .attr('width', 0);
  const vals = g.append('text').attr('class', 'effi-gap__val').attr('y', rowH / 2 - 4).attr('dy', '0.35em')
    .attr('x', (d) => (d.value == null ? labelW + 8 : x(d.value) + 10))
    .attr('fill', (d, i) => (i === 0 ? color('--c-red') : d.value == null ? color('--ink-3') : color('--c-blue-deep')))
    .text((d) => (d.value == null ? d.text : `+${d.value}%`)).attr('opacity', 0);
  ScrollTrigger.create({
    trigger: el, start: 'top 75%', once: true,
    onEnter: () => {
      bars.transition().duration(1200).delay((d, i) => i * 150).ease(d3.easeCubicOut)
        .attr('width', (d) => (d.value == null ? 6 : x(d.value) - labelW));
      vals.transition().delay((d, i) => 900 + i * 150).duration(500).attr('opacity', 1);
    },
  });
}

