/**
 * 种子数据加载器
 * - 首次启动时若 sections 表为空,自动将 seed-data.js 写入 SQLite
 * - 幂等:已有数据则跳过;支持 SEED_FORCE=1 环境变量强制重灌
 * - 由 server.js 在启动时 import 触发(db.js 已在导入时初始化 schema 与 FTS 触发器)
 */
import data from './seed-data.js';
import { db } from './db.js';

const { sections, items, func_categories, functions } = data;

/** 幂等写入:单事务内清空旧数据后整批插入(FTS 触发器自动同步 items_fts) */
export function seed() {
  const insertSection = db.prepare(`
    INSERT INTO sections (id, title, icon, "desc", seq, scope)
    VALUES (@id, @title, @icon, @desc, @seq, @scope)
  `);
  const insertCategory = db.prepare(`
    INSERT INTO func_categories (id, category, icon, seq, db)
    VALUES (@id, @category, @icon, @seq, @db)
  `);
  const insertItem = db.prepare(`
    INSERT INTO items
      (id, section_id, name, syntax, "desc", example, tips, result, tags, db, diff_note, seq)
    VALUES
      (@id, @section_id, @name, @syntax, @desc, @example, @tips, @result, @tags, @db, @diff_note, @seq)
  `);
  const insertFunction = db.prepare(`
    INSERT INTO functions
      (id, category_id, name, syntax, "desc", example, result, tags, db, diff_note, seq)
    VALUES
      (@id, @category_id, @name, @syntax, @desc, @example, @result, @tags, @db, @diff_note, @seq)
  `);

  const tx = db.transaction(() => {
    // 逆序清空,尊重外键(sections/items、func_categories/functions 均带 ON DELETE CASCADE)
    db.prepare('DELETE FROM functions').run();
    db.prepare('DELETE FROM func_categories').run();
    db.prepare('DELETE FROM items').run();
    db.prepare('DELETE FROM sections').run();

    // 先父表后子表:sections → items;func_categories → functions
    for (const s of sections) insertSection.run(s);
    for (const c of func_categories) insertCategory.run(c);
    for (const it of items) insertItem.run(it);
    for (const f of functions) insertFunction.run(f);
  });

  tx();

  return {
    sections: sections.length,
    func_categories: func_categories.length,
    items: items.length,
    functions: functions.length,
  };
}

// 启动时自动执行:sections 为空,或显式 --reset / SEED_FORCE=1 时灌入
const force = process.env.SEED_FORCE === '1' || process.argv.includes('--reset');
const existing = db.prepare('SELECT COUNT(*) AS n FROM sections').get().n;
if (existing === 0 || force) {
  const stats = seed();
  // eslint-disable-next-line no-console
  console.log('[seed] 种子数据已写入 SQLite:', stats);
} else {
  // eslint-disable-next-line no-console
  console.log(`[seed] 数据库已有 ${existing} 个章节,跳过(源数据 sections=${sections.length}/items=${items.length}/categories=${func_categories.length}/functions=${functions.length})`);
}
