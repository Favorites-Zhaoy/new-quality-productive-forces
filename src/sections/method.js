// 数据与方法：根据每个数据文件的 meta 自动生成来源表
import { DATA_FILES, loadData } from '../core/data.js';

export async function initMethod() {
  const box = document.getElementById('method-table');
  const metas = await Promise.all(DATA_FILES.map((f) => loadData(f).then((d) => ({ file: f, ...d.meta })).catch(() => null)));
  const rows = metas.filter(Boolean).map((m) => {
    const src = m.url ? `<a href="${m.url}" target="_blank" rel="noopener">${m.source}</a>` : m.source;
    return `<tr>
      <td>${m.file}</td>
      <td><b>${m.title}</b><br/><span style="color:var(--ink-3)">${m.usedIn ?? ''}</span></td>
      <td>${src}</td>
      <td>${m.note ?? ''}</td>
    </tr>`;
  }).join('');
  box.innerHTML = `<table>
    <thead><tr><th>文件</th><th>内容 / 位置</th><th>来源</th><th>说明</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}
