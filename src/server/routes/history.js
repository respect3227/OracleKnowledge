/**
 * SQL 分析历史 API
 *  GET  /api/history
 *  POST /api/history   { sql, dialect }
 *  DELETE /api/history/:id
 *  DELETE /api/history  清空
 */
import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM history ORDER BY id DESC LIMIT 100`).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { sql, dialect = 'oracle' } = req.body || {};
  if (!sql) return res.status(400).json({ error: 'sql required' });
  const info = db.prepare(`INSERT INTO history(sql_text, dialect) VALUES(?,?)`).run(sql.slice(0, 8000), dialect);
  res.json({ id: info.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM history WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

router.delete('/', (_req, res) => {
  db.prepare(`DELETE FROM history`).run();
  res.json({ ok: true });
});

export default router;
