/**
 * complexity.js — 按 AST 结构计算 SQL 复杂度
 * 规则:
 *   high   : 多重 JOIN(≥3) 或 嵌套子查询(≥2 层) 或 窗口函数 或 CTE 或 MERGE 或 PL/SQL
 *   medium : 有 JOIN 或 子查询 或 GROUP BY 或 CASE
 *   low    : 单表 + 无子查询 + 无窗口函数 + 列数 ≤ 5
 */

const SUBQUERY_NODES = new Set(['select', 'union', 'intersect', 'except']);

/** 统计一个语句节点的复杂度指标 */
function metrics(node) {
  const m = {
    joins: 0,
    subqueryDepth: 0,
    hasWindow: false,
    hasCTE: false,
    hasGroupBy: false,
    hasCase: false,
    columns: 0,
    hasSubquery: false,
  };
  if (!node || typeof node !== 'object') return m;

  // JOIN 计数(from 中带 join 属性的条目)
  if (Array.isArray(node.from)) {
    m.joins = node.from.filter((e) => e && e.join).length;
  }
  // CTE
  if (Array.isArray(node.with) && node.with.length) m.hasCTE = true;
  // GROUP BY
  if (node.groupby && node.groupby.columns && node.groupby.columns.length) m.hasGroupBy = true;
  // 列数
  if (Array.isArray(node.columns)) m.columns = node.columns.length;

  // 递归扫描表达式(WeakSet 守卫防止 node-sql-parser 可能的环引用/重复节点)
  let depth = 0;
  const visited = new WeakSet();
  const walk = (n) => {
    if (!n || typeof n !== 'object' || visited.has(n)) return;
    visited.add(n);
    // 窗口函数
    if (n.over) m.hasWindow = true;
    // CASE
    if (n.type === 'case') m.hasCase = true;
    // 子查询:属性 .ast 包装的 select
    if (n.ast && SUBQUERY_NODES.has(n.ast.type)) {
      m.hasSubquery = true;
      depth += 1;
    }
    // 直接作为子节点出现的 select(且不是当前顶层 node)
    if (n.type === 'select' && n !== node) {
      m.hasSubquery = true;
      depth += 1;
    }
    for (const k of Object.keys(n)) {
      if (k === 'ast' || k === 'parent') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((x) => walk(x));
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(node);
  m.subqueryDepth = depth;
  return m;
}

/**
 * @param {object|object[]} ast node-sql-parser AST(单条或数组)
 * @param {string} stmtType 语句类型大写
 * @returns {'low'|'medium'|'high'}
 */
export function computeComplexity(ast, stmtType) {
  // 无法 AST 化的特殊类型直接判 high
  if (stmtType === 'MERGE' || stmtType === 'PL/SQL') return 'high';

  const nodes = Array.isArray(ast) ? ast : [ast];
  const m = nodes.reduce((acc, n) => {
    const x = metrics(n);
    acc.joins = Math.max(acc.joins, x.joins);
    acc.subqueryDepth = Math.max(acc.subqueryDepth, x.subqueryDepth);
    acc.hasWindow = acc.hasWindow || x.hasWindow;
    acc.hasCTE = acc.hasCTE || x.hasCTE;
    acc.hasGroupBy = acc.hasGroupBy || x.hasGroupBy;
    acc.hasCase = acc.hasCase || x.hasCase;
    acc.columns = Math.max(acc.columns, x.columns);
    acc.hasSubquery = acc.hasSubquery || x.hasSubquery;
    return acc;
  }, {
    joins: 0, subqueryDepth: 0, hasWindow: false, hasCTE: false,
    hasGroupBy: false, hasCase: false, columns: 0, hasSubquery: false,
  });

  // high
  if (m.joins >= 3) return 'high';
  if (m.subqueryDepth >= 2) return 'high';
  if (m.hasWindow) return 'high';
  if (m.hasCTE) return 'high';

  // medium
  if (m.joins >= 1) return 'medium';
  if (m.hasSubquery) return 'medium';
  if (m.hasGroupBy) return 'medium';
  if (m.hasCase) return 'medium';

  // low:单表 + 无子查询 + 无窗口 + 列数 ≤ 5
  if (m.columns <= 5) return 'low';
  return 'medium';
}
