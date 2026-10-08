// 2.2 五个维度：印章切换 + 每个维度一个可交互演示
import * as d3 from 'd3';
import { color, fmt } from '../core/data.js';
import { onResize } from '../core/lazy.js';
import { showTip, moveTip, hideTip } from '../core/tooltip.js';
import { gsap } from '../core/scroll.js';

const SERIES = ['--c-red', '--c-blue', '--c-teal', '--c-ochre', '--c-violet', '--c-green'];

export function fiveDims(el, { dims }) {
  const tabs = document.getElementById('dims-tabs');
  const copy = document.getElementById('dims-copy');
  let index = 0, current = null;

  tabs.innerHTML = dims.map((d, i) =>
    `<button class="dim-tab" role="tab" data-i="${i}" aria-label="${d.name}"><span>${d.char}</span><small>${d.name}</small></button>`).join('');
  tabs.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => select(+b.dataset.i)));

  function select(i) {
    index = i;
    const d = dims[i];
    tabs.querySelectorAll('button').forEach((b, k) => {
      b.classList.toggle('is-on', k === i);
      b.setAttribute('aria-selected', k === i);
    });
    copy.innerHTML = `
      <h4>${d.title}</h4>
      <div class="dim-en">${d.en}</div>
      <p>${d.text}</p>
      <div class="dim-mech">${d.mech}</div>
      <div class="dim-controls"></div>`;
    gsap.from(copy.children, { opacity: 0, y: 16, duration: 0.7, ease: 'expo.out', stagger: 0.05 });
    build();
  }

  function build() {
    current?.destroy?.();
    el.innerHTML = '';
    const W = el.clientWidth, H = el.clientHeight;
    if (!W) return;
    const d = dims[index];
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    current = DEMOS[d.demo](svg, { W, H }, d.data, copy.querySelector('.dim-controls'));
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.6, overwrite: true });
  }

  select(0);
  onResize(el, () => {
    copy.querySelector('.dim-controls').innerHTML = '';
    build();
  });
}

const stampBtn = (controls, label, onClick) => {
  const b = document.createElement('button');
  b.className = 'btn-stamp';
  b.textContent = label;
  b.addEventListener('click', () => onClick(b));
  controls.appendChild(b);
  return b;
};

/* ---------------- 效率：对照实验条形图 ---------------- */
function efficiency(svg, { W, H }, rows, controls) {
  const m = { top: 10, right: 150, left: 0 };
  const rowH = (H - m.top) / rows.length;
  const barH = Math.min(16, rowH * 0.16);
  let on = false;

  const g = svg.selectAll('g.row').data(rows).join('g').attr('class', 'row')
    .attr('transform', (d, i) => `translate(${m.left},${m.top + i * rowH})`);
  g.append('text').attr('class', 'label-strong').attr('y', 16).text((d) => d.study);
  g.append('text').attr('class', 'label').attr('y', 34).style('font-size', '11.5px').text((d) => `${d.cite} · ${d.metric}`);

  const xs = rows.map((d) => d3.scaleLinear().domain([0, Math.max(d.base, d.ai) * 1.05]).range([0, W - m.left - m.right]));
  g.append('rect').attr('y', 46).attr('height', barH).attr('rx', 2).attr('fill', color('--paper-4'))
    .attr('width', (d, i) => xs[i](d.base));
  g.append('text').attr('class', 'label').attr('y', 46 + barH / 2).attr('dy', '0.35em')
    .attr('x', (d, i) => xs[i](d.base) + 8).text((d) => `对照组 ${d.base}`);
  const aiBar = g.append('rect').attr('y', 50 + barH).attr('height', barH).attr('rx', 2).attr('fill', color('--c-red'))
    .attr('width', (d, i) => xs[i](d.base));
  const aiTxt = g.append('text').attr('class', 'label-strong').attr('y', 50 + barH * 1.5).attr('dy', '0.35em')
    .attr('fill', color('--c-red')).attr('x', (d, i) => xs[i](d.base) + 8).text('');

  const delta = (d) => {
    const pct = ((d.ai - d.base) / d.base) * 100;
    return `AI 辅助 ${d.ai}（${pct > 0 ? '+' : ''}${pct.toFixed(1)}%）`;
  };
  const apply = () => {
    aiBar.transition().duration(1200).delay((d, i) => i * 120).ease(d3.easeCubicInOut)
      .attr('width', (d, i) => xs[i](on ? d.ai : d.base));
    aiTxt.transition().duration(1200).delay((d, i) => i * 120).ease(d3.easeCubicInOut)
      .attr('x', (d, i) => xs[i](on ? d.ai : d.base) + 8);
    aiTxt.text((d) => (on ? delta(d) : ''));
    btn.textContent = on ? '还原对照' : '引入 AI';
    btn.classList.toggle('is-on', on);
  };
  const btn = stampBtn(controls, '引入 AI', () => { on = !on; apply(); });
  const timer = setTimeout(() => { on = true; apply(); }, 700);
  return { destroy: () => clearTimeout(timer) };
}

/* ---------------- 知识：力导向知识图谱 ---------------- */
function knowledge(svg, { W, H }, data, controls) {
  const nodes = data.nodes.map((d) => ({ ...d }));
  const base = data.links.map(([s, t]) => ({ source: s, target: t, ai: false }));
  const extra = data.aiLinks.map(([s, t]) => ({ source: s, target: t, ai: true }));
  let links = base.slice();
  const R = Math.min(W, H) * 0.3;
  const anchors = data.groups.map((_, i) => {
    const a = (i / data.groups.length) * Math.PI * 2 - Math.PI / 2;
    return [W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R];
  });

  const gLink = svg.append('g');
  const gNode = svg.append('g');
  const gGroup = svg.append('g');
  const counter = svg.append('text').attr('class', 'annot').attr('x', 0).attr('y', H - 6);

  gGroup.selectAll('text').data(data.groups).join('text')
    .attr('class', 'label').attr('text-anchor', 'middle').style('font-weight', 700)
    .attr('fill', (d, i) => color(SERIES[i]))
    .attr('x', (d, i) => anchors[i][0]).attr('y', (d, i) => anchors[i][1] - R * 0.42)
    .text((d) => d);

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d) => d.id).distance(46).strength(0.6))
    .force('charge', d3.forceManyBody().strength(-120))
    .force('collide', d3.forceCollide(20))
    .force('x', d3.forceX((d) => anchors[d.g][0]).strength(0.12))
    .force('y', d3.forceY((d) => anchors[d.g][1]).strength(0.12))
    .on('tick', tick);

  let linkSel, nodeSel;
  function draw() {
    linkSel = gLink.selectAll('line').data(links, (d) => `${d.source.id ?? d.source}-${d.target.id ?? d.target}`).join(
      (en) => en.append('line')
        .attr('stroke', (d) => (d.ai ? color('--c-red') : color('--rule-strong')))
        .attr('stroke-width', (d) => (d.ai ? 2 : 1.2))
        .attr('stroke-dasharray', (d) => (d.ai ? '5 4' : null))
        .attr('opacity', 0).call((s) => s.transition().duration(800).attr('opacity', 1)),
    );
    nodeSel = gNode.selectAll('g').data(nodes, (d) => d.id).join((en) => {
      const g = en.append('g').style('cursor', 'grab');
      g.append('circle').attr('r', 8).attr('fill', (d) => color(SERIES[d.g])).attr('stroke', color('--paper-2')).attr('stroke-width', 2);
      g.append('text').attr('class', 'label').attr('x', 11).attr('dy', '0.35em').style('font-size', '11.5px').text((d) => d.id)
        .attr('paint-order', 'stroke').attr('stroke', color('--paper-2')).attr('stroke-width', 3);
      return g;
    });
    nodeSel.call(d3.drag()
      .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on('end', (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
    counter.text(`知识孤岛数量：${components()}`);
  }
  function tick() {
    const clampX = (v) => Math.max(10, Math.min(W - 60, v));
    const clampY = (v) => Math.max(10, Math.min(H - 20, v));
    nodes.forEach((d) => { d.x = clampX(d.x); d.y = clampY(d.y); });
    linkSel.attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y).attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
    nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
  }
  function components() {
    const parent = new Map(nodes.map((d) => [d.id, d.id]));
    const find = (a) => (parent.get(a) === a ? a : find(parent.get(a)));
    links.forEach((l) => parent.set(find(l.source.id ?? l.source), find(l.target.id ?? l.target)));
    return new Set(nodes.map((d) => find(d.id))).size;
  }
  draw();

  let on = false;
  stampBtn(controls, '接入 AI', (b) => {
    on = !on;
    links = on ? base.concat(extra) : base.slice();
    sim.force('link').links(links);
    sim.force('x').strength(on ? 0.02 : 0.12);
    sim.force('y').strength(on ? 0.02 : 0.12);
    gGroup.transition().duration(600).attr('opacity', on ? 0.25 : 1);
    draw();
    sim.alpha(0.9).restart();
    b.textContent = on ? '断开 AI' : '接入 AI';
    b.classList.toggle('is-on', on);
  });
  return { destroy: () => sim.stop() };
}

/* ---------------- 创新：点阵对比 ---------------- */
function innovation(svg, { W, H }, data, controls) {
  const unit = data.unit;
  const nP = data.pdb.value / unit;
  const nA = Math.round(data.alphafold.value / unit);
  const top = 64, bottom = 30;
  const cell = Math.max(5, Math.floor(Math.sqrt((W * (H - top - bottom)) / (nA + 40))));
  const cols = Math.floor(W / cell);
  const r = cell * 0.36;
  const pos = (i) => [(i % cols) * cell + cell / 2, top + Math.floor(i / cols) * cell + cell / 2];

  const head = svg.append('g');
  const lineP = head.append('text').attr('class', 'label-strong').attr('y', 16).attr('fill', color('--c-blue-deep'));
  lineP.text(`${data.pdb.name}：约 ${fmt.num(data.pdb.value / 1e4, 0)} 万`);
  const lineA = head.append('text').attr('class', 'label-strong').attr('y', 40).attr('fill', color('--c-red')).text('');
  svg.append('text').attr('class', 'annot').attr('y', H - 6).text(`每个点 = ${fmt.int(unit / 1e4)} 万个蛋白质结构`);

  const pdb = d3.range(Math.ceil(nP)).map((i) => ({ i, a: Math.min(1, nP - i) }));
  svg.append('g').selectAll('circle').data(pdb).join('circle')
    .attr('cx', (d) => pos(d.i)[0]).attr('cy', (d) => pos(d.i)[1]).attr('r', r * 1.15)
    .attr('fill', color('--c-blue-deep')).attr('opacity', (d) => 0.25 + 0.75 * d.a);

  const gA = svg.append('g');
  let on = false;
  const play = () => {
    on = true;
    btn.disabled = true;
    const offset = Math.ceil(nP);
    gA.selectAll('circle').data(d3.range(nA)).join('circle')
      .attr('cx', (i) => pos(i + offset)[0]).attr('cy', (i) => pos(i + offset)[1])
      .attr('r', 0).attr('fill', color('--c-red')).attr('opacity', 0.85)
      .transition().delay((i) => i * 1.1).duration(300).attr('r', r);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: data.alphafold.value, duration: (nA * 1.1) / 1000 + 0.3, ease: 'none',
      onUpdate: () => lineA.text(`${data.alphafold.name}：${fmt.num(obj.v / 1e8, 2)} 亿`),
    });
  };
  const btn = stampBtn(controls, 'AI 预测', () => !on && play());
  const timer = setTimeout(() => !on && play(), 900);
  return { destroy: () => { clearTimeout(timer); gA.selectAll('circle').interrupt(); } };
}

/* ---------------- 协同：多智能体消息流 ---------------- */
function collab(svg, { W, H }, data, controls) {
  const cx = W / 2, cy = H / 2 - 10;
  const R = Math.min(W, H) * 0.36;
  const agents = data.agents.map((name, i) => {
    const a = (i / data.agents.length) * Math.PI * 2 - Math.PI / 2;
    return { name, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
  });
  const human = { name: '人', x: cx, y: cy };

  const gL = svg.append('g');
  agents.forEach((a, i) => {
    const b = agents[(i + 1) % agents.length];
    gL.append('line').attr('x1', a.x).attr('y1', a.y).attr('x2', b.x).attr('y2', b.y).attr('stroke', color('--c-blue-soft')).attr('stroke-width', 2);
    gL.append('line').attr('x1', cx).attr('y1', cy).attr('x2', a.x).attr('y2', a.y)
      .attr('stroke', color('--rule-strong')).attr('stroke-dasharray', '3 5');
  });
  const gN = svg.append('g');
  const nodeSel = gN.selectAll('g').data(agents).join('g').attr('transform', (d) => `translate(${d.x},${d.y})`);
  nodeSel.append('circle').attr('r', 28).attr('fill', color('--paper-2')).attr('stroke', color('--c-blue')).attr('stroke-width', 2);
  nodeSel.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('class', 'label-strong').text((d) => d.name);
  const hg = gN.append('g').attr('transform', `translate(${cx},${cy})`);
  hg.append('circle').attr('r', 36).attr('fill', color('--c-blue-deep'));
  hg.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('fill', color('--paper-2'))
    .style('font-family', 'var(--f-serif)').style('font-weight', 900).style('font-size', '26px').text('人');
  svg.append('text').attr('class', 'annot').attr('text-anchor', 'middle').attr('x', cx).attr('y', H - 8).text(data.human);

  const gP = svg.append('g');
  let parallel = false;
  // 串行：人 → 各智能体依次 → 人；并行：人同时分派给所有智能体
  const route = () => (parallel
    ? agents.map((a) => [human, a, human])
    : [[human, ...agents, human]]);
  const pulse = (path, delay = 0) => {
    const dot = gP.append('circle').attr('r', 6).attr('fill', color('--c-red')).attr('cx', path[0].x).attr('cy', path[0].y);
    let t = dot.transition().delay(delay);
    path.slice(1).forEach((p) => {
      t = t.transition().duration(parallel ? 900 : 650).ease(d3.easeCubicInOut).attr('cx', p.x).attr('cy', p.y)
        .on('end', () => {
          const n = nodeSel.filter((d) => d === p);
          n.select('circle').interrupt().attr('fill', color('--c-red-soft')).transition().duration(600).attr('fill', color('--paper-2'));
        });
    });
    t.on('end', () => dot.remove());
  };
  const cycle = () => route().forEach((p, i) => pulse(p, i * 60));
  cycle();
  const interval = setInterval(cycle, parallel ? 2200 : 5200);
  let iv = interval;

  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.innerHTML = '<button class="is-on" data-m="0">串行流水线</button><button data-m="1">并行协同</button>';
  seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    seg.querySelectorAll('button').forEach((o) => o.classList.toggle('is-on', o === b));
    parallel = b.dataset.m === '1';
    clearInterval(iv);
    gP.selectAll('circle').interrupt().remove();
    cycle();
    iv = setInterval(cycle, parallel ? 2200 : 5200);
  }));
  controls.appendChild(seg);
  return { destroy: () => { clearInterval(iv); gP.selectAll('circle').interrupt(); } };
}

/* ---------------- 执行：感知—行动闭环 ---------------- */
function execute(svg, { W, H }, data) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.36;
  const steps = data.steps.map((s, i) => {
    const a = (i / data.steps.length) * Math.PI * 2 - Math.PI / 2;
    return { ...s, a, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
  });
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', 'none')
    .attr('stroke', color('--c-blue-soft')).attr('stroke-width', 3);
  // 方向箭头
  steps.forEach((s, i) => {
    const a = s.a + Math.PI / data.steps.length;
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    svg.append('path').attr('d', 'M-6,-5 L4,0 L-6,5').attr('fill', color('--c-blue'))
      .attr('transform', `translate(${x},${y}) rotate(${(a * 180) / Math.PI + 90})`);
  });
  const nodeSel = svg.selectAll('g.step').data(steps).join('g').attr('class', 'step')
    .attr('transform', (d) => `translate(${d.x},${d.y})`);
  nodeSel.append('circle').attr('r', 30).attr('fill', color('--paper-2')).attr('stroke', color('--c-blue-deep')).attr('stroke-width', 2);
  nodeSel.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('class', 'label-strong').text((d) => d.name);

  const title = svg.append('text').attr('x', cx).attr('y', cy - 6).attr('text-anchor', 'middle')
    .style('font-family', 'var(--f-serif)').style('font-weight', 900).style('font-size', '30px').attr('fill', color('--c-red'));
  const eg = svg.append('text').attr('x', cx).attr('y', cy + 24).attr('text-anchor', 'middle').attr('class', 'label');
  const dot = svg.append('circle').attr('r', 8).attr('fill', color('--c-red'));

  let last = -1;
  const period = 7000;
  const timer = d3.timer((elapsed) => {
    const t = (elapsed % period) / period;
    const a = t * Math.PI * 2 - Math.PI / 2;
    dot.attr('cx', cx + Math.cos(a) * R).attr('cy', cy + Math.sin(a) * R);
    const k = Math.floor(((t + 0.5 / steps.length) % 1) * steps.length);
    if (k !== last) {
      last = k;
      nodeSel.select('circle').attr('fill', (d, i) => (i === k ? color('--c-red') : color('--paper-2')))
        .attr('stroke', (d, i) => (i === k ? color('--c-red') : color('--c-blue-deep')));
      nodeSel.select('text').attr('fill', (d, i) => (i === k ? color('--paper-2') : color('--ink')));
      title.text(steps[k].name);
      eg.text(steps[k].eg);
    }
  });
  nodeSel.on('pointerenter', (ev, d) => showTip(`<b>${d.name}</b><div>${d.eg}</div>`, ev))
    .on('pointermove', moveTip).on('pointerleave', hideTip);
  return { destroy: () => timer.stop() };
}

const DEMOS = { efficiency, knowledge, innovation, collab, execute };
