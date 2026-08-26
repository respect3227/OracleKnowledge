/**
 * 种子数据加载器(sql.js 兼容版)
 */
import data from './seed-data.js';

const { sections, items, func_categories, functions } = data;

export function seed(db) {
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
    db.prepare('DELETE FROM functions').run();
    db.prepare('DELETE FROM func_categories').run();
    db.prepare('DELETE FROM items').run();
    db.prepare('DELETE FROM sections').run();

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
