/**
 * idioms.js — Oracle/达梦 SQL 惯用法识别
 *
 * 在 AST 解析成功后、通用模板渲染前由 index.js 调用 detectIdiom。
 * 命中已知惯用法时返回 {hit:true, sentences, notes},index.js 直接采用并
 * 跳过通用 buildXxx 模板;未命中返回 null,走通用模板路径。
 *
 * 当前识别:
 *   - SELECT <常量> FROM dual WHERE EXISTS(<子查询>) —— "判断是否存在数据"惯用法
 *     (Oracle/达梦判存在性的标准写法,常用于应用层判断、避免 COUNT(*) 全表扫描)
 *
 * 依赖 where.js 的低层原语,所有用户内容仍经 esc 转义。
 */

import {
  esc, translateWhere, subqueryBrief, subqueryParts,
} from './where.js';

/** 子句关键字高亮 */
function clause(word) {
  return `<span class="tl-clause">${esc(word)}</span>`;
}

/** 函数名高亮 */
function func(name) {
  return `<span class="tl-func">${esc(name)}</span>`;
}

/** <code> 包裹,用于原 SQL 片段示意 */
function code(text) {
  return `<code>${text}</code>`;
}

/** 判断 from 条目是否为 dual 伪表 */
function isDualFrom(entry) {
  if (!entry) return false;
  if (entry.type === 'dual') return true;
  if (entry.table && typeof entry.table === 'string' && entry.table.toUpperCase() === 'DUAL') return true;
  return false;
}

/** 取函数节点名(大写,多 token 拼接,去分隔符,便于匹配 EXISTS/NOT EXISTS) */
function funcNameUpper(node) {
  if (!node || !node.name) return '';
  if (typeof node.name === 'string') return node.name.toUpperCase();
  if (Array.isArray(node.name.name)) {
    return node.name.name.map((n) => (n.value ?? '')).join('').toUpperCase();
  }
  if (node.name.value !== undefined) return String(node.name.value).toUpperCase();
  return '';
}

/** 若该节点是 EXISTS 函数调用,返回其中的子查询 AST;否则 null */
function existsSubqueryOf(fnNode) {
  if (!fnNode || fnNode.type !== 'function') return null;
  const nm = funcNameUpper(fnNode).replace(/[\s.]/g, '');
  if (nm !== 'EXISTS') return null;
  const v = fnNode.args && fnNode.args.value;
  if (v && v[0] && v[0].ast) return v[0].ast;
  if (v && v[0] && v[0].type === 'select') return v[0];
  return null;
}

/** SELECT 列表是否为单个常量字面量(如 SELECT 1 / SELECT 'x' / SELECT NULL) */
function isSingleConstColumns(columns) {
  if (!Array.isArray(columns) || columns.length !== 1) return false;
  const expr = columns[0].expr || columns[0];
  if (!expr || !expr.type) return false;
  return [
    'number', 'bigint', 'numeric', 'string',
    'single_quote_string', 'double_quote_string',
    'null', 'bool', 'boolean',
  ].includes(expr.type);
}

/**
 * 识别 "SELECT 常量 FROM dual WHERE EXISTS(子查询)" 判存在性惯用法
 * @returns {{sentences:string[], notes:string[]} | null}
 */
function detectDualExists(node) {
  if (!node || node.type !== 'select') return null;
  // 排除使语句不再是"判存在性"惯用法的结构:CTE / GROUP BY / HAVING / 多表 JOIN
  if (node.with && node.with.length) return null;
  if (node.groupby || node.having) return null;
  if (Array.isArray(node.from) && node.from.length > 1) return null;
  if (!node.from || !node.from[0] || !isDualFrom(node.from[0])) return null;
  if (!isSingleConstColumns(node.columns)) return null;
  if (!node.where) return null;

  const sub = existsSubqueryOf(node.where);
  if (!sub) return null;

  const brief = subqueryBrief(sub);
  const { table, whereText } = subqueryParts(sub);
  const tableHtml = table ? ` ${esc(table)} 表` : '';
  const subDesc = whereText
    ? `子查询(从${tableHtml}查询,条件 ${whereText})`
    : `子查询(从${tableHtml}查询)`;

  const codeHtml = code(
    `${clause('SELECT')} 1 ${clause('FROM')} dual ${clause('WHERE')} ${func('EXISTS')}(${esc('...')})`,
  );

  const sentences = [
    `这是一段<strong>判断是否存在数据</strong>的惯用写法:${codeHtml} —— 当${subDesc}返回至少一行时,外层 SELECT 1 返回 1(代表“存在”),否则不返回任何行(代表“不存在”)。常用于应用层判断是否存在满足条件的记录,避免 COUNT(*) 的全表扫描开销。`,
  ];

  const notes = [
    `子查询内容:${whereText ? `从${tableHtml}查询,筛选 ${whereText}` : `查询${tableHtml}全部行`}。EXISTS 只要命中首行即可短路返回,无需收集完整结果集。`,
    `dual 是 Oracle/达梦的伪表(单行单列、无实际数据),仅用于满足 SELECT 必须带 FROM 子句的语法要求;SELECT 1 FROM dual WHERE EXISTS(...) 是判存在性的标准写法。`,
  ];

  return { sentences, notes };
}

/**
 * 惯用法识别主入口
 * @param {*} ast node-sql-parser AST 节点(单条)
 * @param {string} sql 原始 SQL 文本
 * @param {'oracle'|'dm'} dialect
 * @returns {{hit:true, sentences:string[], notes:string[]} | null}
 */
export function detectIdiom(ast, sql, dialect) {
  if (!ast) return null;
  const dualExists = detectDualExists(ast);
  if (dualExists) return { hit: true, ...dualExists };
  return null;
}

export default detectIdiom;
