/**
 * Express 后端入口
 *  - 托管前端静态资源 /public
 *  - 暴露 REST API:/api/...
 */
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import './src/server/db.js';            // 初始化 schema
import './src/server/seed.js';           // 首次启动自动 seed
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

// 静态资源(express.static 找不到文件会自动调 next,无需 existsSync 守卫)
const publicDir = join(__dirname, 'public');
app.use(express.static(publicDir, {
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    if (path.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');
  }
}));

// API 路由
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/functions', funcRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/history', historyRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// SPA 回退:仅对无扩展名的路径回退 index.html(避免静态资源 404 被当成 HTML 返回)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const last = req.path.split('/').pop();
  const hasExt = last.includes('.');
  if (hasExt) return next();  // 静态资源 404 让其正常 404
  const idx = join(publicDir, 'index.html');
  if (existsSync(idx)) return res.sendFile(idx);
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[Oracle/DM Knowledge] 服务已启动: http://localhost:${PORT}`);
});
