// 第一章：按页面顺序创建钉住区段（顺序决定 ScrollTrigger 的间距计算，不能打乱）
import { initLongScroll } from './longScroll.js';
import { initInterlude } from './interlude.js';
import { initEras } from './eras.js';
import { initMigration } from './migration.js';

export function initChapter1(particles) {
  initLongScroll();                                        // 1.1 两千年长卷
  initInterlude(document.getElementById('interlude-1'));  // 过场：新的工具
  initEras(particles);                                     // 1.2 四个时代
  initMigration();                                         // 1.3 七十年的人口迁徙
  initInterlude(document.getElementById('interlude-2'));  // 过场：工具开始思考
}
