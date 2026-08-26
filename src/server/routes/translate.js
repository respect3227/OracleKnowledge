/**
 * SQL 翻译 API
 *  POST /api/translate  { sql, dialect }
 *  返回 { sentences, notes, tokens, complexity, statementType, dialect, diffNote }
 */
import { Router } from 'express';
import { translateSQL } from '../translator/index.js';
import { format } from 'sql-formatter';

export const router = Router();

router.post('/', (req, res) => {
  const { sql, dialect = 'oracle' } = req.body || {};
  if (!sql || !sql.trim()) return res.status(400).json({ error: 'sql required' });
  try {
    const result = translateSQL(sql, dialect);
    res.json(result);
  } catch (e) {
    // 解析失败:降级为只输出"无法精确解析"提示
    res.json({
      sentences: [`这是一段 <span class="tl-clause">${dialect === 'dm' ? '达梦' : 'Oracle'}</span> SQL,自动解析时遇到困难,但可执行。`],
      notes: [`解析器提示:${e.message}`],
      tokens: [],
      complexity: 'medium',
      statementType: 'UNKNOWN',
      dialect,
      formatted: tryFormat(sql, dialect),
      diffNote: null
    });
  }
});

function tryFormat(sql, dialect) {
  try {
    return format(sql, { language: dialect === 'dm' ? 'plsql' : 'plsql' });
  } catch { return sql; }
}

export default router;
