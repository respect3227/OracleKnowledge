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

// 全文搜索
router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  // 兼容 q 不含通配;FTS5 默认分词
  const escaped = q.replace(/"/g, '""');
  const rows = db.prepare(`
    SELECT i.id, i.section_id, i.name, i.syntax, i."desc", i.example, i.tips, i.result, i.tags, i.db, i.diff_note,
           bm25(items_fts) AS score
    FROM items_fts JOIN items i ON items_fts.rowid = i.rowid
    WHERE items_fts MATCH ?
    ORDER BY score
    LIMIT 50
  `).all(escaped);
  res.json(rows);
});

// 单条详情
router.get('/item/:id', (req, res) => {
  const row = db.prepare(`SELECT * FROM items WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

export default router;
