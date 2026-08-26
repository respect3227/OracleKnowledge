/**
 * tokens.js — 词法 token 提取
 * 混合策略:用正则 lexer 切分 SQL,再用 AST 检测的函数名/表名做精准分类。
 * type ∈ keyword|function|operator|clause|join|object|literal|identifier|number|punctuation
 */

const CLAUSE_WORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET',
  'DISTINCT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'ALTER', 'DROP', 'TRUNCATE', 'MERGE', 'USING',
  'ON', 'WHEN', 'MATCHED', 'WITH', 'AS', 'OVER', 'PARTITION', 'ASC', 'DESC',
  'UNION', 'INTERSECT', 'EXCEPT', 'RETURNING', 'DECLARE', 'BEGIN', 'END',
  'EXCEPTION', 'DEFAULT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE',
  'CONSTRAINT', 'CHECK', 'VIEW', 'INDEX', 'REPLACE',
]);

const JOIN_WORDS = new Set([
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'NATURAL', 'SEMI', 'ANTI',
]);

const KEYWORD_WORDS = new Set([
  'AND', 'OR', 'NOT', 'IN', 'IS', 'LIKE', 'BETWEEN', 'EXISTS', 'ANY', 'ALL', 'SOME',
  'NULL', 'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'UNKNOWN',
  'SYSDATE', 'SYSTIMESTAMP', 'USER', 'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'ROWNUM',
  'ROWID', 'LEVEL', 'NEXTVAL', 'CURRVAL', 'DUAL',
]);

/** 收集 AST 中所有函数名(大写) */
function collectFunctionNames(ast) {
  const set = new Set();
  const visited = new WeakSet();
  const walk = (n) => {
    if (!n || typeof n !== 'object' || visited.has(n)) return;
    visited.add(n);
    if (n.type === 'function' && n.name) {
      const nm = Array.isArray(n.name.name) ? n.name.name.map((x) => x.value).join('.')
        : (n.name.value !== undefined ? n.name.value : '');
      if (nm) set.add(nm.toUpperCase());
    }
    if (n.type === 'aggr_func' && n.name) set.add(String(n.name).toUpperCase());
    if (n.type === 'window_func' && n.name) {
      const nm = Array.isArray(n.name.name) ? n.name.name.map((x) => x.value).join('.')
        : (typeof n.name === 'string' ? n.name : '');
      if (nm) set.add(nm.toUpperCase());
    }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(ast);
  return set;
}

/** 收集 AST 中所有表名/对象名(原始大小写) */
function collectObjectNames(ast) {
  const set = new Set();
  const push = (s) => { if (typeof s === 'string' && s && !set.has(s.toUpperCase())) set.add(s); };
  const visited = new WeakSet();
  const walk = (n) => {
    if (!n || typeof n !== 'object' || visited.has(n)) return;
    visited.add(n);
    // from 条目
    if (Array.isArray(n.from)) n.from.forEach((e) => e && typeof e.table === 'string' && push(e.table));
    // table 数组(insert/update/delete/create/alter)
    if (Array.isArray(n.table)) n.table.forEach((e) => e && typeof e.table === 'string' && push(e.table));
    // drop/truncate name
    if (Array.isArray(n.name)) n.name.forEach((e) => e && typeof e.table === 'string' && push(e.table));
    if (n.type === 'merge') { // 不会出现(astify 不支持 merge),保留
      if (n.target && n.target.table) push(n.target.table);
      if (n.source && n.source.table) push(n.source.table);
    }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(ast);
  return set;
}

/** 用正则兜底检测函数调用 IDENT( ;排除保留字(如 OVER/IN)避免误判 */
function collectFunctionNamesByRegex(sql) {
  const reserved = new Set([...CLAUSE_WORDS, ...JOIN_WORDS, ...KEYWORD_WORDS]);
  const set = new Set();
  const re = /\b([A-Za-z_][A-Za-z0-9_#$]*)\s*\(/g;
  let mm;
  while ((mm = re.exec(sql)) !== null) {
    const up = mm[1].toUpperCase();
    if (!reserved.has(up)) set.add(up);
  }
  return set;
}

const LEXER = /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^']|'')*'|"(?:[^"]|"")*")|(\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)|(\b[A-Za-z_][A-Za-z0-9_#$]*(?:\.[A-Za-z_][A-Za-z0-9_#$]*)*\b)|(<=|>=|<>|!=|\|\||=>|::|=|<|>|\+|\-|\*|\/|%|\(|\)|,|;|\.)/g;

const SYMBOL_OPERATOR = new Set(['=', '<', '>', '<=', '>=', '<>', '!=', '||', '+', '-', '*', '/', '%', '=>', '::']);
const SYMBOL_PUNCTUATION = new Set(['(', ')', ',', ';', '.']);

/**
 * @param {string} sql 原始 SQL
 * @param {object|object[]} ast node-sql-parser AST(可为 null)
 * @param {string} stmtType 语句类型
 * @returns {Array<{raw:string,type:string}>}
 */
export function extractTokens(sql, ast, stmtType) {
  const text = sql || '';
  const funcSet = new Set();
  const objSet = new Set();
  if (ast) {
    collectFunctionNames(ast).forEach((f) => funcSet.add(f));
    collectObjectNames(ast).forEach((o) => objSet.add(o));
  }
  // 正则兜底函数名(对 MERGE/PL/SQL 等无 AST 场景尤其重要)
  collectFunctionNamesByRegex(text).forEach((f) => funcSet.add(f));

  const out = [];
  const seen = new Set();
  let m;
  LEXER.lastIndex = 0;
  while ((m = LEXER.exec(text)) !== null) {
    if (m[1]) continue; // 注释
    let raw; let type;
    if (m[2] !== undefined) { raw = m[2]; type = 'literal'; }
    else if (m[3] !== undefined) { raw = m[3]; type = 'number'; }
    else if (m[4] !== undefined) {
      raw = m[4];
      const head = raw.split('.')[0].toUpperCase();
      if (funcSet.has(head)) type = 'function';
      else if (CLAUSE_WORDS.has(head)) type = 'clause';
      else if (JOIN_WORDS.has(head)) type = 'join';
      else if (KEYWORD_WORDS.has(head)) type = 'keyword';
      else if (objSet.has(raw)) type = 'object';
      else type = 'identifier';
    } else if (m[5] !== undefined) {
      raw = m[5];
      type = SYMBOL_PUNCTUATION.has(raw) ? 'punctuation' : 'operator';
    }
    if (raw === undefined) continue;
    const key = raw + '|' + type;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ raw, type });
  }
  return out;
}
