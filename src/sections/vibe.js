// 5.0 屏幕的另一面：一只手拿着手机，背对读者；滚动时手机转过来，
// 屏幕上是一场 Vibe Coding 对话——这个网站本身被“聊”出来的过程。随后抛出一个问题。
import { ScrollTrigger, gsap } from '../core/scroll.js';

// 屏幕上的对话：取自本站真实的制作过程
const CHAT = [
  { who: 'me', text: '用 js、d3.js 完成一个网站，用各种可视化的方式，体现人工智能作为新质生产力的作用和意义。' },
  { who: 'ai', text: '好的。先讲生产力的历史，再展开二十个行业，最后回到每一个人。' },
  { who: 'log', text: '✓ 下载 Maddison 数据库（1600—2025）' },
  { who: 'log', text: '✓ 逐条统计 1112 条生成式 AI 备案' },
  { who: 'log', text: '✓ 标注 101 座灯塔工厂' },
  { who: 'me', text: '第一章找不到很好的可视化亮点' },
  { who: 'ai', text: '试试把四百年做成一条可以滚动的长卷？' },
  { who: 'me', text: '算了，还是上一版吧，这一版做得太难看了' },
  { who: 'ai', text: '好的，已恢复上一版。' },
  { who: 'log', text: '✓ 推送到 GitHub · 部署上线' },
  { who: 'typing', text: '重新构造一下第 5 章，有点太呆了' },
];

// 读者答不上来时的几个提示
const CHIPS = ['提出一个好问题', '判断什么是好的', '为结果负责', '说“不，还是上一版吧”', '知道为什么要做'];

const SKIN = '#E6C9AE', SKIN_D = '#CFA889', INK = '#22303C';
const st = `fill="${SKIN}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`;

// 手机机身位于 360×700 画布中的 x 50—310、y 24—584；手的各部分分为“压在机身上”和“藏在机身后”两层
const svg = (inner, over) => `<svg class="vibe__hand${over ? ' vibe__hand--over' : ''}" viewBox="0 0 360 700" aria-hidden="true">${inner}</svg>`;
const crease = (d) => `<path d="${d}" fill="none" stroke="${SKIN_D}" stroke-width="2.2" stroke-linecap="round"/>`;

// 正面：手掌和四个指尖在机身后，拇指压住左侧边框
const FRONT_BEHIND = svg(`
  <path d="M70 700 C58 650 54 600 66 560 C78 520 112 500 160 498 L300 492 C338 498 352 540 346 600 C342 646 326 676 310 700 Z" ${st}/>
  ${[300, 352, 404, 456].map((y, i) => `<rect x="${296 - i * 3}" y="${y}" width="${58 - i * 4}" height="44" rx="22" ${st}/>`).join('')}`);
const FRONT_OVER = svg(`
  <path d="M40 700 C14 640 6 560 28 500 C40 466 60 440 80 436 C98 434 108 448 104 468 C100 490 86 512 82 540 C78 574 92 620 126 660 C140 676 150 690 156 700 Z" ${st}/>
  ${crease('M62 462 C76 454 90 458 94 470')}`, true);

// 背面：拇指藏在机身后（右侧露出），手掌和四指包住机背
const BACK_BEHIND = svg(`
  <path d="M320 700 C346 640 354 560 332 500 C320 466 300 440 280 436 C262 434 252 448 256 468 C260 490 274 512 278 540 C282 574 268 620 234 660 C220 676 210 690 204 700 Z" ${st}/>`);
const BACK_OVER = svg(`
  <path d="M50 700 C40 646 38 596 50 554 C62 514 96 496 142 494 L300 490 C336 496 350 536 344 596 C340 644 324 676 308 700 Z" ${st}/>
  ${[300, 352, 404, 456].map((y, i) => {
    const r = 208 - i * 16;
    return `<path d="M30 ${y + 22} C30 ${y + 6} 40 ${y} 54 ${y} L${r} ${y + 2} C${r + 20} ${y + 3} ${r + 20} ${y + 41} ${r} ${y + 42} L54 ${y + 44} C40 ${y + 44} 30 ${y + 38} 30 ${y + 22} Z" ${st}/>
      ${crease(`M${r - 46} ${y + 10} C${r - 52} ${y + 18} ${r - 52} ${y + 26} ${r - 46} ${y + 34}`)}`;
  }).join('')}`, true);

export function initVibe() {
  const root = document.getElementById('vibe');
  if (!root) return;
  const stage = root.querySelector('.vibe__stage');
  const scaler = root.querySelector('.vibe__scaler');
  const phone = root.querySelector('.vibe__phone');
  const chat = root.querySelector('.vibe__chat');
  const caps = [...root.querySelectorAll('.vibe__cap')];
  const front = root.querySelector('.vibe__face--front');
  const back = root.querySelector('.vibe__face--back');

  front.insertAdjacentHTML('afterbegin', FRONT_BEHIND);
  front.insertAdjacentHTML('beforeend', FRONT_OVER);
  back.insertAdjacentHTML('afterbegin', BACK_BEHIND);
  back.insertAdjacentHTML('beforeend', BACK_OVER);

  chat.innerHTML = CHAT.map((m) => (m.who === 'typing'
    ? `<div class="vb vb--me vb--typing">${m.text}<span class="vb__dots"><i></i><i></i><i></i></span></div>`
    : `<div class="vb vb--${m.who}">${m.text}</div>`)).join('');
  const bubbles = [...chat.children];
  gsap.set(bubbles, { opacity: 0, y: 14 });

  // 手机按舞台大小等比缩放
  const fit = () => {
    const k = Math.min(stage.clientHeight * 0.96 / 700, stage.clientWidth * 0.98 / 360);
    scaler.style.setProperty('--k', Math.max(0.3, k).toFixed(3));
  };
  fit();
  window.addEventListener('resize', fit);

  const ROT = [0.1, 0.4];      // 旋转区间
  const CHAT_AT = [0.42, 0.84]; // 对话逐条出现
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = gsap.parseEase('power2.inOut');

  let shown = 0;
  const render = (p) => {
    const r = ease(clamp((p - ROT[0]) / (ROT[1] - ROT[0])));
    const sway = Math.sin(p * Math.PI * 4) * 1.5;
    phone.style.transform = `rotateX(${6 - r * 4 + sway}deg) rotateY(${180 - r * 180}deg) rotateZ(${-8 + r * 8}deg)`;
    root.style.setProperty('--glow', clamp((r - 0.7) / 0.3).toFixed(3));

    const n = Math.round(clamp((p - CHAT_AT[0]) / (CHAT_AT[1] - CHAT_AT[0])) * bubbles.length);
    if (n !== shown) {
      bubbles.forEach((b, i) => {
        if (i < n && i >= shown) gsap.to(b, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out', overwrite: true });
        if (i >= n && i < shown) gsap.to(b, { opacity: 0, y: 14, duration: 0.2, overwrite: true });
      });
      shown = n;
      // 屏幕始终停在最新一条消息
      const last = bubbles[Math.max(0, n - 1)];
      const over = n ? last.offsetTop + last.offsetHeight - chat.clientHeight + 12 : 0;
      gsap.to(chat, { scrollTop: Math.max(0, over), duration: 0.5, ease: 'power2.out', overwrite: true });
    }

    const k = p < ROT[0] + 0.06 ? 0 : p < CHAT_AT[0] + 0.04 ? 1 : p < 0.88 ? 2 : 3;
    if (root.dataset.k !== String(k)) {
      root.dataset.k = k;
      caps.forEach((c, i) => c.classList.toggle('is-on', i === k));
    }
  };

  ScrollTrigger.create({
    trigger: root, pin: root.querySelector('.vibe__pin'),
    start: 'top top', end: () => `+=${window.innerHeight * 5}`, scrub: true,
    onUpdate: (self) => render(self.progress),
    onRefresh: fit,
  });
  render(0);

  initQuestion();
}

/* ---------------- 一个问题：写下答案，写进宣言卡片 ---------------- */
function initQuestion() {
  const box = document.getElementById('vibe-q');
  const form = document.getElementById('vibe-form');
  const ok = document.getElementById('vibe-ok');
  const chips = document.getElementById('vibe-chips');
  const text = box.querySelector('.vibe-q__text');

  // 问题逐字浮现
  text.innerHTML = [...text.textContent.trim()]
    .map((c) => (c === '\n' ? '<br/>' : `<span class="qc">${c}</span>`)).join('');
  gsap.from(text.querySelectorAll('.qc'), {
    opacity: 0, y: 24, duration: 0.7, ease: 'expo.out', stagger: 0.04,
    scrollTrigger: { trigger: box, start: 'top 72%' },
  });

  chips.innerHTML = `<span>没想好？借一个：</span>${CHIPS.map((c) => `<button type="button">${c}</button>`).join('')}`;
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    form.elements.answer.value = b.textContent;
    form.elements.answer.focus();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = form.elements.answer.value.trim();
    if (!v) { ok.textContent = '先写下一句话吧。'; return; }
    document.dispatchEvent(new CustomEvent('vibe-answer', { detail: v }));
    ok.innerHTML = '已写进你的宣言卡片 → <a href="#block-card">5.3</a>';
  });
}
