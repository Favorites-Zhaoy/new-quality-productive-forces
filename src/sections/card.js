// 5.3 人机协同宣言：在 canvas 上绘制报纸版面卡片，可下载 PNG
const WORDS = ['终身学习', '创造力', '好奇心', '批判性思维', '同理心', '跨界融合', '协作', '责任感', '审美', '动手能力'];

const LINES = {
  终身学习: '把每一次与 AI 的对话，都当作一次学习',
  创造力: '把重复交给机器，把想象留给自己',
  好奇心: '永远追问“为什么”，而不只是“怎么做”',
  批判性思维: '不盲信答案，学会验证、比较与追问',
  同理心: '机器擅长计算，而我选择理解人',
  跨界融合: '用 AI 打通学科之间的墙',
  协作: '与人协作，也与智能体协作',
  责任感: '为每一个由 AI 参与的决定负责',
  审美: '在海量生成中，保有分辨好坏的眼光',
  动手能力: '让想法离开屏幕，落到真实世界',
};

const C = {
  paper: '#ECEAE4', ink: '#22303C', ink2: '#4B5865', red: '#BF5A45', blue: '#2F5573', blueSoft: '#BFD3E3', rule: 'rgba(34,48,60,.35)',
};

export async function initCard() {
  const form = document.getElementById('card-form');
  const field = document.getElementById('card-words');
  const canvas = document.getElementById('card-canvas');
  const dl = document.getElementById('card-download');
  field.insertAdjacentHTML('beforeend', WORDS.map((w, i) =>
    `<label class="word-chip"><input type="checkbox" name="w" value="${w}" ${i < 3 ? 'checked' : ''}/><span>${w}</span></label>`).join(''));

  // 最多选三个
  field.addEventListener('change', (e) => {
    const checked = field.querySelectorAll('input:checked');
    if (checked.length > 3) e.target.checked = false;
  });

  try {
    await Promise.all([
      document.fonts.load('48px "Ma Shan Zheng"', '智能跃迁'),
      document.fonts.load('900 48px "Noto Serif SC"', '人机协同宣言'),
      document.fonts.load('20px "Cinzel"', 'A'),
    ]);
  } catch { /* 字体失败时使用回退字体 */ }

  const draw = () => {
    const name = (form.elements.name.value || '我').trim();
    const words = [...field.querySelectorAll('input:checked')].map((i) => i.value);
    render(canvas, name, words.length ? words : WORDS.slice(0, 3));
    dl.disabled = false;
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); draw(); });
  dl.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = '人机协同宣言.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
  draw();
}

function render(cv, name, words) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;

  // 纸张 + 噪点
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(34,48,60,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // 报头
  ctx.fillStyle = C.red;
  ctx.font = '150px "Ma Shan Zheng", cursive';
  ctx.fillText('智能跃迁', W / 2, 200);
  ctx.fillStyle = C.blue;
  ctx.font = '26px "Cinzel", serif';
  ctx.fillText('N E W   Q U A L I T Y   P R O D U C T I V E   F O R C E S', W / 2, 252);

  const now = new Date();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  line(ctx, 60, 286, W - 60, 286);
  ctx.lineWidth = 1;
  line(ctx, 60, 294, W - 60, 294);
  ctx.font = '20px "Noto Serif SC", serif';
  ctx.fillStyle = C.ink2;
  ctx.textAlign = 'left';
  ctx.fillText(`${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`, 64, 326);
  ctx.textAlign = 'right';
  ctx.fillText('人机协同 · 特刊', W - 64, 326);
  line(ctx, 60, 346, W - 60, 346);

  // 标题
  ctx.textAlign = 'center';
  ctx.fillStyle = C.blue;
  ctx.font = '900 74px "Noto Serif SC", serif';
  ctx.fillText(`${name}的`, W / 2, 450);
  ctx.fillText('人机协同宣言', W / 2, 540);

  // 三枚印章
  const sx = [W / 2 - 250, W / 2, W / 2 + 250];
  words.slice(0, 3).forEach((w, i) => {
    const x = sx[i], y = 680;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((i - 1) * -0.06);
    ctx.strokeStyle = C.red; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 82, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.red;
    const size = w.length > 3 ? 32 : 44;
    ctx.font = `900 ${size}px "Noto Serif SC", serif`;
    ctx.textBaseline = 'middle';
    if (w.length > 3) {
      ctx.fillText(w.slice(0, 2), 0, -20);
      ctx.fillText(w.slice(2), 0, 22);
    } else ctx.fillText(w, 0, 2);
    ctx.restore();
  });
  ctx.textBaseline = 'alphabetic';

  // 正文
  ctx.fillStyle = C.ink;
  ctx.font = '28px "Noto Serif SC", serif';
  ctx.textAlign = 'left';
  let y = 850;
  words.slice(0, 3).forEach((w, i) => {
    ctx.fillStyle = C.red;
    ctx.fillText(`${'一二三'[i]}、`, 90, y);
    ctx.fillStyle = C.ink;
    ctx.fillText(LINES[w], 150, y);
    y += 56;
  });

  // 页脚
  ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
  line(ctx, 60, H - 110, W - 60, H - 110);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.blue;
  ctx.font = '700 22px "Noto Sans SC", sans-serif';
  ctx.fillText('历史跃迁  |  驱动机制  |  行业重塑  |  人机协同', W / 2, H - 64);
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
