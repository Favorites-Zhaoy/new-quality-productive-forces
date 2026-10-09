// 第一章：按页面顺序创建钉住区段（顺序决定 ScrollTrigger 的间距计算，不能打乱）
import { initLongScroll } from './longScroll.js';
import { initMigration } from './migration.js';

export function initChapter1(particles) {
  initLongScroll(particles); // 1.1 四个时代，一条曲线
  initMigration();           // 1.2 七十年的人口迁徙
}
