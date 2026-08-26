/**
 * 函数库 API
 *  GET /api/functions/categories?db=
 *  GET /api/functions/list?category=&db=&q=
 *  GET /api/functions/:id
 */
import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/categories', (req, res) => {
  const filterDb = req.query.db;
  const rows = db.prepare(`
    SELECT c.id, c.category, c.icon, c.seq, c.db,
      (SELECT COUNT(*) FROM functions f WHERE f.category_id = c.id
        AND (? IS NULL OR f.db = 'both' OR f.db = ?)) AS func_count
    FROM func_categories c
    ORDER BY c.seq ASC
  `).all(filterDb ?? null, filterDb ?? null);
  res.json(rows);
});

router.get('/list', (req, res) => {
  const { category, db: filterDb, q } = req.query;
  let sql = `SELECT * FROM functions WHERE 1=1`;
  const params = [];
  if (category && category !== 'all') { sql += ` AND category_id = ?`; params.push(category); }
  if (filterDb) { sql += ` AND (db = 'both' OR db = ?)`; params.push(filterDb); }
  if (q) {
    sql += ` AND (name LIKE ? OR "desc" LIKE ? OR tags LIKE ? OR syntax LIKE ?)`;
    const kw = `%${q}%`;
    params.push(kw, kw, kw, kw);
  }
  sql += ` ORDER BY seq ASC LIMIT 200`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`SELECT * FROM functions WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

export default router;
