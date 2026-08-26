/**
 * 收藏夹 API
 *  GET    /api/favorites           列表
 *  POST   /api/favorites           { kind, target_id, title, note }
 *  DELETE /api/favorites/:id
 */
import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM favorites ORDER BY id DESC`).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { kind, target_id, title, note } = req.body || {};
  if (!kind || !target_id || !title) return res.status(400).json({ error: 'kind/target_id/title required' });
  const info = db.prepare(`INSERT INTO favorites(kind, target_id, title, note) VALUES(?,?,?,?)`)
    .run(kind, target_id, title, note ?? null);
  res.json({ id: info.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM favorites WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

export default router;
