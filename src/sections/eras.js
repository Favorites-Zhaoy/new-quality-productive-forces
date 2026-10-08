// 1.2 四个时代：钉住滚动，粒子依次变形为 锄头 → 齿轮 → 芯片 → 神经网络
import { ScrollTrigger } from '../core/scroll.js';

const ERAS = [
  {
    key: 'hoe', mark: '手', name: '手工劳动', years: '远古 — 1760',
    text: '人力与畜力是主要动力，工具是双手的延伸。生产依赖个人经验，一代人与下一代人的产出相差无几。',
    tags: ['劳动者：农民与工匠', '劳动资料：锄、犁、纺车', '劳动对象：土地与天然材料'],
  },
  {
    key: 'gear', mark: '机', name: '机械化 · 电气化', years: '1760 — 1945',
    text: '蒸汽机与电力把人从繁重的体力劳动中解放出来，工厂制度和流水线让分工达到前所未有的规模。',
    tags: ['劳动者：产业工人', '劳动资料：蒸汽机、电动机、流水线', '劳动对象：煤炭、钢铁'],
  },
  {
    key: 'chip', mark: '数', name: '数字化', years: '1946 — 2011',
    text: '计算机与互联网让信息可以被存储、传输和计算，生产管理与协作进入“比特”时代。',
    tags: ['劳动者：知识工作者', '劳动资料：计算机、互联网、软件', '劳动对象：信息'],
  },
  {
    key: 'neural', mark: '智', name: '智能化', years: '2012 — ',
    text: '深度学习与大模型让机器具备感知、理解与生成能力。工具第一次开始参与“思考”，生产三要素被整体重组。',
    tags: ['劳动者：人机协同的新型劳动者', '劳动资料：大模型、智能装备', '劳动对象：数据'],
  },
];

export function initEras(particles) {
  const list = document.getElementById('eras-list');
  const label = document.getElementById('eras-label');
  const stage = document.querySelector('.eras__stage');
  list.innerHTML = ERAS.map((e) => `
    <li>
      <h4>${e.name}<small>${e.years}</small></h4>
      <div class="era-body">
        <p>${e.text}</p>
        <div class="era-tags">${e.tags.map((t) => `<span>${t}</span>`).join('')}</div>
      </div>
    </li>`).join('');
  const items = list.querySelectorAll('li');

  let active = -1;
  let inView = false;
  const setActive = (i) => {
    if (i === active) return;
    active = i;
    items.forEach((li, k) => li.classList.toggle('is-active', k === i));
    label.textContent = ERAS[i].mark;
    if (inView) particles?.morphTo(ERAS[i].key);
  };

  ScrollTrigger.create({
    trigger: '#eras',
    pin: '.eras__pin',
    start: 'top top',
    end: () => `+=${window.innerHeight * 3}`,
    scrub: true,
    onEnter: () => activate(),
    onEnterBack: () => activate(),
    onLeave: () => { inView = false; particles?.show(false); },
    onLeaveBack: () => { inView = false; particles?.show(false); },
    onUpdate: (self) => setActive(Math.min(ERAS.length - 1, Math.floor(self.progress * ERAS.length))),
  });

  function activate() {
    inView = true;
    if (!particles) return;
    particles.morphTo(ERAS[Math.max(active, 0)].key);
    particles.setSpin(0);
    particles.anchor(stage, 0.82);
    particles.show(true, 0.6);
  }

  setActive(0);
}
