// 5.0 屏幕的另一面：手机背对读者；滚动时手机转过来，
// 屏幕上是一场 Vibe Coding 对话——这个网站本身被“聊”出来的过程。章末留给读者一个问题。
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

export function initVibe() {
  const root = document.getElementById('vibe');
  if (!root) return;
  const stage = root.querySelector('.vibe__stage');
  const scaler = root.querySelector('.vibe__scaler');
  const phone = root.querySelector('.vibe__phone');
  const chat = root.querySelector('.vibe__chat');
  const caps = [...root.querySelectorAll('.vibe__cap')];
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

  initQuestionReveal();
}

/* ---------------- 章末留白：问题逐字浮现 ---------------- */
function initQuestionReveal() {
  const box = document.getElementById('vibe-q');
  const text = box.querySelector('.vibe-q__text');

  // 问题逐字浮现
  text.innerHTML = [...text.textContent.trim()]
    .map((c) => (c === '\n' ? '<br/>' : `<span class="qc">${c}</span>`)).join('');
  gsap.from(text.querySelectorAll('.qc'), {
    opacity: 0, y: 24, duration: 0.7, ease: 'expo.out', stagger: 0.04,
    scrollTrigger: { trigger: box, start: 'top 72%' },
  });
}
