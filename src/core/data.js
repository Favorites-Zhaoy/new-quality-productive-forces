// 数据加载、颜色变量读取、数据状态定义
import { hsl } from 'd3';

const cache = new Map();

/** 全站数据文件清单（“数据与方法”页据此生成） */
export const DATA_FILES = [
  'maddison_gdp.json',
  'china_employment.json',
  'policy_timeline.json',
  'factors_sankey.json',
  'efficiency.json',
  'industries.json',
  'impact_stats.json',
  'impact_matrix.json',
  'risk_energy.json',
  'risk_jobs.json',
  'day_clock.json',
  'job_tasks.json',
  'deep/C.json',
  'deep/I.json',
  ...'ABCDEFGHIJKLMNOPQRST'.split('').map((c) => `industries/${c}.json`),
];

export function loadData(file) {
  if (!cache.has(file)) {
    const url = `${import.meta.env.BASE_URL}data/${file}`;
    cache.set(file, fetch(url).then((r) => {
      if (!r.ok) throw new Error(`数据加载失败：${file}（${r.status}）`);
      return r.json();
    }));
  }
  return cache.get(file);
}

const rootStyle = () => getComputedStyle(document.documentElement);

/** 读取 CSS 变量：color('--c-red') → '#BF5A45'；非变量原样返回 */
export function color(v) {
  if (typeof v === 'string' && v.startsWith('--')) return rootStyle().getPropertyValue(v).trim();
  return v;
}

/** 根据底色明度选择文字颜色 */
export function textOn(fill) {
  return hsl(fill).l > 0.66 ? color('--ink') : color('--paper-2');
}

export const STATUS = {
  ok:    { label: '已核对',   cls: 'badge--ok' },
  src:   { label: '已附原始出处', cls: 'badge--ok' },
  check: { label: '待核对',   cls: 'badge--check' },
  demo:  { label: '示意数据', cls: 'badge--demo' },
};

export const fmt = {
  int: (n) => Math.round(n).toLocaleString('zh-CN'),
  num: (n, d = 1) => Number(n).toLocaleString('zh-CN', { maximumFractionDigits: d }),
};
