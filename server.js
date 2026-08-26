/**
 * Express 后端入口(sql.js 兼容版)
 *  - 托管前端静态资源 /public
 *  - 暴露 REST API:/api/...
 */
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { getDb } from './src/server/db.js';
import { seed } from './src/server/seed.js';
import knowledgeRoutes from './src/server/routes/knowledge.js';
import funcRoutes from './src/server/routes/functions.js';
import translateRoutes from './src/server/routes/translate.js';
import favoritesRoutes from './src/server/routes/favorites.js';
import historyRoutes from './src/server/routes/history.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const publicDir = join(__dirname, 'public');
app.use(express.static(publicDir, {
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    if (path.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');
  }
}));

app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/functions', funcRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/history', historyRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const last = req.path.split('/').pop();
  const hasExt = last.includes('.');
  if (hasExt) return next();
  const idx = join(publicDir, 'index.html');
  if (existsSync(idx)) return res.sendFile(idx);
  res.status(404).send('Not Found');
});

async function start() {
  const db = await getDb();

  const force = process.env.SEED_FORCE === '1';
  const existing = db.prepare('SELECT COUNT(*) AS n FROM sections').get()?.n || 0;
  if (existing === 0 || force) {
    const stats = seed(db);
    console.log('[seed] 种子数据已写入 SQLite:', stats);
  } else {
    console.log(`[seed] 数据库已有 ${existing} 个章节,跳过`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Oracle/DM Knowledge] 服务已启动: http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('[start] 启动失败:', err);
  process.exit(1);
});
