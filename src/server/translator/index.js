/**
 * index.js — Oracle/达梦 SQL AST 中文翻译器主入口
 *
 * 用 node-sql-parser 把 SQL 解析成 AST,再按节点类型生成结构化中文叙述。
 *
 * 说明:node-sql-parser 5.x 不提供 oracle / plsql 方言(astify 会抛
 * "is not supported currently")。本实现以 postgresql 方言为主降级方言
 * (对 Oracle 常见构造 DUAL/SYSDATE/ROWNUM/NVL/TO_DATE/CTE/窗口/CASE/子查询
 * 均可解析),并辅以 transactsql/mysql 兜底;MERGE、Oracle 类型 CREATE、
 * PL/SQL 块三类无法解析的语句改用结构化正则降级翻译,仍优于纯正则匹配。
 */

import pkg from 'node-sql-parser';
import { format as formatSQL } from 'sql-formatter';
import { fileURLToPath } from 'node:url';

import {
  translateStatement, statementTypeOf, buildMergeFromText, buildPLSQLFromText,
} from './templates.js';
import { detectIdiom } from './idioms.js';
import { extractTokens } from './tokens.js';
import { computeComplexity } from './complexity.js';

const { Parser } = pkg;
const parser = new Parser();

/** 实际可用的解析方言链(oracle/plsql 不受支持,故以最接近的 postgresql 为主) */
const DIALECT_CHAIN = ['postgresql', 'transactsql', 'mysql'];

/** 达梦特有/系统对象,用于 diffNote */
const DM_MARKERS = [
  { re: /\b(SYSOBJECTS|SYSUSERS|SYSCOLUMNS|SYSPARAMS|SYSTABLES|SYSCONS|SYSINDEXES|SYSPACKAGES)\b/i, note: '使用了达梦系统表(SYSOBJECTS/SYSUSERS 等),与 Oracle 的 DBA_/ALL_/USER_ 视图不同,迁移时需替换' },
  { re: /\bDBMS_STATS\b/i, note: 'DBMS_STATS 在达梦中可用但子程序签名/参数与 Oracle 略有差异' },
  { re: /\bSTORAGE\s*\(/i, note: 'STORAGE 子句在达梦 DDL 中常用(簇/盘区/初始/next),与 Oracle 的 STORAGE 语义相近但可选项不同' },
  { re: /\bCLUSTER\b/i, note: '达梦支持 CLUSTER(簇)DDL,与 Oracle 的簇语义不完全一致' },
  { re: /\bRMAN\b/i, note: 'RMAN 为 Oracle 专有备份工具,达梦需用其自带的物理/逻辑备份工具替代' },
];

/** Oracle → 通用类型归一化(仅用于让 astify 解析 CREATE,不改变对外 formatted) */
function normalizeOracleDDL(sql) {
  return sql
    .replace(/\bVARCHAR2\b/gi, 'VARCHAR')
    .replace(/\bNVARCHAR2\b/gi, 'NVARCHAR')
    .replace(/\bLONG\s+RAW\b/gi, 'BYTEA')
    .replace(/\bLONG\b/gi, 'TEXT')
    .replace(/\bNUMBER\b/gi, 'NUMERIC')
    .replace(/\bBINARY_FLOAT\b/gi, 'REAL')
    .replace(/\bBINARY_DOUBLE\b/gi, 'DOUBLE PRECISION')
    .replace(/\bCLOB\b/gi, 'TEXT')
    .replace(/\bNCLOB\b/gi, 'TEXT')
    .replace(/\bBLOB\b/gi, 'BYTEA')
    .replace(/\bRAW\b/gi, 'BYTEA')
    .replace(/\bBFILE\b/gi, 'VARCHAR');
}

/** 按方言链尝试解析,返回首个成功结果 */
function tryParse(sql) {
  for (const db of DIALECT_CHAIN) {
    try {
      const ast = parser.astify(sql, { database: db });
      return { ast, db };
    } catch (_) {
      // 试下一个方言
    }
  }
  return null;
}

/** PL/SQL 块检测 */
function isPLSQLBlock(sql) {
  const t = sql.trim();
  return /^\s*(DECLARE\b|BEGIN\b)/i.test(t) && /\bEND\b/i.test(t);
}

/** MERGE 检测 */
function isMerge(sql) {
  return /^\s*MERGE\s+INTO\b/i.test(sql.trim());
}

/** CREATE 检测(用于失败后归一化重试) */
function isCreate(sql) {
  return /^\s*CREATE\b/i.test(sql.trim());
}

/** 达梦差异提示 */
function detectDiffNote(sql, dialect) {
  if (dialect !== 'dm') return null;
  const hits = [];
  for (const { re, note } of DM_MARKERS) {
    if (re.test(sql)) hits.push(note);
  }
  return hits.length ? hits.join(';') : null;
}

/** 格式化(sql-formatter plsql 方言,对 Oracle/达梦语法友好) */
function safeFormat(sql) {
  try {
    return formatSQL(sql, { language: 'plsql', keywordCase: 'upper' });
  } catch (_) {
    try {
      return formatSQL(sql);
    } catch (__) {
      return sql;
    }
  }
}

/** 降级时按首关键字粗判语句类型(比 UNKNOWN 更有用) */
function detectStatementTypeByRegex(sql) {
  const t = (sql || '').trim().toUpperCase();
  if (/^(WITH|SELECT|\(\s*SELECT)\b/.test(t)) return 'SELECT';
  if (/^INSERT\b/.test(t)) return 'INSERT';
  if (/^UPDATE\b/.test(t)) return 'UPDATE';
  if (/^DELETE\b/.test(t)) return 'DELETE';
  if (/^MERGE\b/.test(t)) return 'MERGE';
  if (/^CREATE\b/.test(t)) return 'CREATE';
  if (/^ALTER\b/.test(t)) return 'ALTER';
  if (/^DROP\b/.test(t)) return 'DROP';
  if (/^TRUNCATE\b/.test(t)) return 'TRUNCATE';
  if (/\b(DECLARE|BEGIN)\b/.test(t) && /\bEND\b/i.test(sql || '')) return 'PL/SQL';
  return 'UNKNOWN';
}

/** 降级结果(解析失败) */
function degraded(sql, dialect, reason) {
  const stmtType = detectStatementTypeByRegex(sql);
  return {
    sentences: [`该 SQL 为 ${dialect === 'dm' ? '达梦' : 'Oracle'} 方言,无法精确解析,请检查语法。${reason ? `(${reason})` : ''}`],
    notes: [],
    tokens: extractTokens(sql, null, stmtType),
    complexity: 'medium',
    statementType: stmtType,
    dialect,
    formatted: safeFormat(sql),
    diffNote: detectDiffNote(sql, dialect),
  };
}

/** 把单条 AST 节点翻译成 sentences/notes */
function renderNode(node) {
  return translateStatement(node);
}

/**
 * 翻译 SQL → 结构化中文叙述
 * @param {string} sql SQL 文本
 * @param {'oracle'|'dm'} dialect 方言(默认 oracle)
 * @returns {{
 *   sentences: string[], notes: string[],
 *   tokens: {raw:string,type:string}[],
 *   complexity: 'low'|'medium'|'high',
 *   statementType: string, dialect: string,
 *   formatted: string, diffNote: string|null
 * }}
 */
export function translateSQL(sql, dialect = 'oracle') {
  const d = dialect === 'dm' ? 'dm' : 'oracle';
  if (!sql || typeof sql !== 'string' || !sql.trim()) {
    return degraded(sql || '', d, 'SQL 为空');
  }

  const diffNote = detectDiffNote(sql, d);
  const formatted = safeFormat(sql);

  // 1) PL/SQL 块(astify 无法解析)
  if (isPLSQLBlock(sql)) {
    const { sentences, notes } = buildPLSQLFromText(sql);
    return {
      sentences,
      notes,
      tokens: extractTokens(sql, null, 'PL/SQL'),
      complexity: computeComplexity(null, 'PL/SQL'),
      statementType: 'PL/SQL',
      dialect: d,
      formatted,
      diffNote,
    };
  }

  // 2) MERGE(astify 无法解析)
  if (isMerge(sql)) {
    const { sentences, notes } = buildMergeFromText(sql);
    return {
      sentences,
      notes,
      tokens: extractTokens(sql, null, 'MERGE'),
      complexity: computeComplexity(null, 'MERGE'),
      statementType: 'MERGE',
      dialect: d,
      formatted,
      diffNote,
    };
  }

  // 3) 常规 AST 解析
  let parsed = tryParse(sql);
  let createNormalized = false;
  if (!parsed && isCreate(sql)) {
    // Oracle 类型归一化后重试
    const norm = normalizeOracleDDL(sql);
    if (norm !== sql) {
      const p2 = tryParse(norm);
      if (p2) {
        parsed = p2;
        createNormalized = true;
      }
    }
  }
  if (!parsed) {
    return degraded(sql, d, '语法无法被解析器识别');
  }

  const { ast } = parsed;
  const nodes = Array.isArray(ast) ? ast : [ast];
  const sentences = [];
  const notes = [];
  let primaryType = nodes[0] ? statementTypeOf(nodes[0]) : 'UNKNOWN';

  // 惯用法前置识别(如 SELECT 1 FROM dual WHERE EXISTS(...) 判存在性):
  // 命中后直接采用其 sentences/notes,跳过通用 buildXxx 模板
  let idiomHit = false;
  if (nodes.length === 1) {
    const idiom = detectIdiom(nodes[0], sql, d);
    if (idiom && idiom.hit) {
      idiomHit = true;
      if (idiom.sentences) sentences.push(...idiom.sentences);
      if (idiom.notes) notes.push(...idiom.notes);
    }
  }

  if (!idiomHit) {
    nodes.forEach((node, i) => {
      const t = statementTypeOf(node);
      if (i === 0) primaryType = t;
      const r = renderNode(node);
      if (r.sentences.length) sentences.push(r.sentences.join(' '));
      if (r.notes.length) notes.push(...r.notes);
    });
  }
  if (!sentences.length) {
    sentences.push(`该 SQL 为 ${d === 'dm' ? '达梦' : 'Oracle'} 方言,解析成功但未识别为可叙述语句类型。`);
  }
  if (createNormalized) {
    notes.push('CREATE 语句含 Oracle 原生类型(VARCHAR2/NUMBER 等),已按归一化类型解析,实际类型以 Oracle/达梦字典为准。');
  }

  // FETCH FIRST/NEXT n ROWS(ONLY/WITH TIES):astify 不解析,正则兜底补充
  if (primaryType === 'SELECT') {
    const fm = sql.match(/\bFETCH\s+(?:FIRST|NEXT)\s+(\d+)\s+ROWS?(?:\s+(ONLY|WITH\s+TIES))?\b/i);
    if (fm && !sentences.join('').includes('限制前')) {
      sentences.push(`<span class="tl-clause">FETCH FIRST</span> 限制前 ${fm[1]} 行${fm[2] ? `(${fm[2].toUpperCase().replace(/\s+/g, ' ')})` : ''}。`);
    }
  }

  return {
    sentences,
    notes,
    tokens: extractTokens(sql, ast, primaryType),
    complexity: computeComplexity(ast, primaryType),
    statementType: primaryType,
    dialect: d,
    formatted,
    diffNote,
  };
}

// ───────────────────────── CLI 自验证 ─────────────────────────
const isMain = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  } catch (_) {
    return false;
  }
})();

if (isMain) {
  const demo = `SELECT e.emp_id, e.emp_name AS name, d.dept_name,
       COUNT(*) AS cnt, SUM(e.salary) AS total_sal,
       ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rn
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id
WHERE e.salary > 5000 AND d.dept_name IS NOT NULL
GROUP BY e.emp_id, e.emp_name, d.dept_name
HAVING COUNT(*) > 1
ORDER BY cnt DESC, total_sal DESC
FETCH FIRST 10 ROWS ONLY`;

  const r = translateSQL(demo, 'oracle');
  console.log('=== 翻译器自验证(示例 SQL)===');
  console.log('statementType:', r.statementType, '| complexity:', r.complexity, '| dialect:', r.dialect);
  console.log('\n--- sentences ---');
  r.sentences.forEach((s, i) => console.log(`[${i}] ${s}`));
  console.log('\n--- notes ---');
  r.notes.forEach((s, i) => console.log(`[${i}] ${s}`));
  console.log('\n--- tokens (前 30) ---');
  r.tokens.slice(0, 30).forEach((t) => console.log(`  ${t.type.padEnd(11)} ${t.raw}`));
  console.log(`\n(共 ${r.tokens.length} 个 token)`);
  console.log('\n--- diffNote ---', r.diffNote);
  console.log('\n--- formatted (前 200 字符) ---');
  console.log(r.formatted.slice(0, 200));
}

export default translateSQL;
