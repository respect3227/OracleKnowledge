/**
 * 知识点 API
 *  GET /api/knowledge/sections            列出全部章节
 *  GET /api/knowledge/items?section=     按章节列出条目(可 ?db=oracle|dm 过滤)
 *  GET /api/knowledge/search?q=          全文检索条目(走 FTS5)
 *  GET /api/knowledge/item/:id           单条详情
 */
import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

// 章节列表(附带每个章节的条目计数)
router.get('/sections', (req, res) => {
  const filterDb = req.query.db; // oracle | dm | undefined(both 始终返回)
  const rows = db.prepare(`
    SELECT s.id, s.title, s.icon, s.desc, s.seq, s.scope,
      (SELECT COUNT(*) FROM items i WHERE i.section_id = s.id
        AND (? IS NULL OR i.db = 'both' OR i.db = ?)) AS item_count
    FROM sections s
    ORDER BY s.seq ASC
  `).all(filterDb ?? null, filterDb ?? null);
  res.json(rows);
});

// 某章节下的条目
router.get('/items', (req, res) => {
  const { section, db: filterDb } = req.query;
  if (!section) return res.status(400).json({ error: 'section required' });
  const rows = db.prepare(`
    SELECT * FROM items
    WHERE section_id = ?
      AND (? IS NULL OR db = 'both' OR db = ?)
    ORDER BY seq ASC
  `).all(section, filterDb ?? null, filterDb ?? null);
  res.json(rows);
});

// 全文搜索(LIKE 实现,兼容 sql.js)
router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  const like = `%${q}%`;
  const rows = db.prepare(`
    SELECT id, section_id, name, syntax, "desc", example, tips, result, tags, db, diff_note,
      (CASE WHEN name LIKE ? THEN 3 ELSE 0 END +
       CASE WHEN syntax LIKE ? THEN 2 ELSE 0 END +
       CASE WHEN "desc" LIKE ? THEN 1 ELSE 0 END +
       CASE WHEN example LIKE ? THEN 1 ELSE 0 END +
       CASE WHEN tags LIKE ? THEN 1 ELSE 0 END) AS score
    FROM items
    WHERE name LIKE ? OR syntax LIKE ? OR "desc" LIKE ? OR example LIKE ? OR tags LIKE ?
    ORDER BY score DESC
    LIMIT 50
  `).all(like, like, like, like, like, like, like, like, like, like);
  res.json(rows);
});

// 单条详情
router.get('/item/:id', (req, res) => {
  const row = db.prepare(`SELECT * FROM items WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

export default router;
