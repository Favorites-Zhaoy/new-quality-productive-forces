# 智能跃迁 · 人工智能与新质生产力

可视化导论课程作业。用 D3.js、three.js、GSAP 讲述“历史上的生产力跃迁 → AI 成为新质生产力的重要技术力量 → 20 大行业真实变化 → 未来的人机协同”。

## 运行

```bash
npm install
npm run dev      # 本地开发 http://localhost:5173
npm run build    # 打包到 dist/，可直接部署到 GitHub Pages / Vercel
```

## 目录

```
index.html                 页面结构（序章 + 五章 + 数据与方法）
public/data/*.json         全部数据，每个文件带 meta（来源、链接、核对状态）
src/
  main.js                  入口：加载层、平滑滚动、粒子、懒加载图表
  core/                    滚动(Lenis+ScrollTrigger)、数据、提示框、懒加载、入场动画、报头导航
  three/                   “生产力粒子”：shapes.js 画形状 → particles.js 着色器变形
  sections/                四个时代（钉住滚动）、宣言卡片、数据与方法表
  charts/                  每个 D3 图表一个文件
  styles/                  tokens.css（配色/字体变量）→ base → layout → components → charts
```

## 图表清单

| 位置 | 图表 | 文件 |
|---|---|---|
| 1.1 | 两千年人均 GDP 曲线（时代色带、三种视图） | `charts/gdpCurve.js` |
| 1.2 | 粒子变形：锄头 → 齿轮 → 芯片 → 神经网络 | `sections/eras.js` |
| 1.3 | 三次产业就业构成堆叠面积图 | `charts/employStack.js` |
| 1.4 | 政策大事记 | `charts/timeline.js` |
| 2.1 | 生产要素桑基图 | `charts/factorSankey.js` |
| 2.2 | 五维度：对照条形图 / 力导向图谱 / 点阵 / 多智能体网络 / 闭环 | `charts/fiveDims.js` |
| 3 | 20 门类行业罗盘（占位） | `charts/industryCompass.js` |
| 4 | 数据版块、影响热力矩阵、能耗柱图、就业华夫图 | `charts/impactPanel.js` 等 |
| 5 | 24 小时径向时钟、职业旭日图、宣言卡片 | `charts/dayClock.js` 等 |

## 新增一个图表

1. 在 `public/data/` 放数据文件，写好 `meta`（`status`: `ok` 已核对 / `check` 待核对 / `demo` 示意）。
2. 在 `src/charts/` 写 `export function myChart(el, payload) {}`。
3. 在 `src/main.js` 的 `CHARTS` 中注册。
4. 在 HTML 中放 `<div class="chart" data-chart="myChart" data-src="my.json"></div>`。

图表会在接近视口时自动加载，下方自动附上来源与状态标签；把文件名加进 `core/data.js` 的 `DATA_FILES`，它就会出现在“数据与方法”表里。

## 待办

- [ ] 第三章：20 个行业数据（每个行业：最明显的变化 / 最新案例 / 未来方向）
- [ ] 将 `maddison_gdp.json` 替换为 MPD 2023 原表数据
- [ ] 逐条核对标为“待核对”的数据，改为 `ok`
- [ ] 第三章完成后按评分规则重算 `impact_matrix.json`
