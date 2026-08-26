/**
 * templates.js — 按语句类型生成结构化中文叙述(HTML)
 * 依赖 where.js 的 esc/columnName/exprToText/translateWhere/windowSpec。
 * 每个 buildXxx 返回 { sentences:[HTML], notes:[HTML] }。
 */

import {
  esc, columnName, exprToText, translateWhere, windowSpec, functionHtml,
} from './where.js';

/** 子句关键字高亮 */
function clause(word) {
  return `<span class="tl-clause">${esc(word)}</span>`;
}

/** 取 from 条目里的表名(支持子查询/derived table/dual 伪表) */
function tableName(entry) {
  if (!entry) return '';
  if (entry.type === 'dual') return 'dual';
  if (entry.table && typeof entry.table === 'string') return entry.table;
  if (entry.expr) return '子查询';
  if (entry.table && typeof entry.table === 'object') {
    // 子查询作为派生表
    return entry.as ? `子查询(${esc(entry.as)})` : '子查询';
  }
  return entry.table ? esc(String(entry.table)) : '';
}

/** 表名 + 别名 */
function tableLabel(entry) {
  const n = tableName(entry);
  if (!entry) return '';
  const a = entry.as;
  return a ? `${n}(${esc(a)})` : n;
}

/** SELECT 列表简写 */
function summarizeColumns(columns) {
  if (!columns || !columns.length) return '所有字段';
  const labels = columns.slice(0, 6).map((col) => columnLabel(col));
  let s = labels.join('、');
  if (columns.length > 6) s += ` 等共 ${columns.length} 个字段`;
  return s;
}

/** 单列显示名 */
function columnLabel(col) {
  if (!col) return '';
  const expr = col.expr || col;
  const as = col.as;
  const base = exprToText(expr);
  return as ? `${base} AS ${esc(as)}` : base;
}

/** ORDER BY 简写 */
function orderText(orderby) {
  if (!orderby || !orderby.length) return '';
  return orderby.map((o) => {
    const e = exprToText(o.expr ? o.expr : o);
    const dir = o.type && typeof o.type === 'string' ? o.type.toUpperCase() : 'ASC';
    return `${e} ${dir}`;
  }).join('、');
}

/** GROUP BY 简写 */
function groupText(groupby) {
  if (!groupby) return '';
  const cols = groupby.columns || groupby;
  if (!Array.isArray(cols) || !cols.length) return '';
  return cols.map((c) => exprToText(c.expr ? c.expr : c)).join('、');
}

/** LIMIT 简写 */
function limitText(limit) {
  if (!limit) return '';
  const v = Array.isArray(limit.value) ? limit.value : (Array.isArray(limit) ? limit : []);
  if (!v.length) return '';
  return v.map(exprToText).join(', ');
}

/** 窗口函数 → 中文用途 */
const WIN_ROLE = {
  ROW_NUMBER: '行号',
  RANK: '排名',
  DENSE_RANK: '密集排名(并列不跳号)',
  NTILE: '分桶序号',
  LAG: '前导行值',
  LEAD: '后继行值',
  FIRST_VALUE: '首行值',
  LAST_VALUE: '末行值',
  NTH_VALUE: '第 N 行值',
  CUME_DIST: '累积分布',
  PERCENT_RANK: '百分比排名',
  PERCENTILE_CONT: '百分位连续值',
  PERCENTILE_DISC: '百分位离散值',
  STDDEV: '标准差',
  VAR_POP: '总体方差',
  SUM: '累计求和',
  AVG: '累计平均',
  MAX: '累计最大',
  MIN: '累计最小',
  COUNT: '累计计数',
};

/** 取函数节点名(支持 string / {name:[{value}]} / {value},多 token 拼接) */
function nodeFuncName(n) {
  if (!n || !n.name) return '';
  if (typeof n.name === 'string') return n.name;
  if (Array.isArray(n.name.name)) return n.name.name.map((x) => x.value ?? '').join('');
  if (n.name.value !== undefined) return String(n.name.value);
  return '';
}

/** 从 OVER 规格提取 "按 P 分组、按 O 排序" 中文串(供窗口用途叙述) */
function windowPartitionOrder(over) {
  let spec = over;
  if (over && over.as_window_specification) spec = over.as_window_specification;
  if (spec && spec.window_specification) spec = spec.window_specification;
  const parts = [];
  if (Array.isArray(spec.partitionby) && spec.partitionby.length) {
    parts.push(`按 ${spec.partitionby.map((e) => exprToText(e.expr || e)).join(', ')} 分组`);
  }
  if (Array.isArray(spec.orderby) && spec.orderby.length) {
    parts.push(`按 ${spec.orderby.map((e) => {
      const ex = exprToText(e.expr || e);
      const dir = e.type && e.type.toUpperCase ? e.type : '';
      return dir ? `${ex} ${dir}` : ex;
    }).join(', ')} 排序`);
  }
  return parts.join('、');
}

/** 扫描列表达式/CTE/where/having,收集所有窗口函数(显示名 + 用途 + 窗口范围,供 notes) */
function collectWindows(node) {
  const out = [];
  const visited = new WeakSet();
  const walk = (n) => {
    if (!n || typeof n !== 'object' || visited.has(n)) return;
    visited.add(n);
    if (n.over) {
      out.push({
        display: `${functionHtml(n)}${windowSpec(n.over)}`,
        role: WIN_ROLE[nodeFuncName(n).toUpperCase()] || '窗口计算',
        scope: windowPartitionOrder(n.over),
      });
    }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    }
  };
  if (!node) return out;
  (node.columns || []).forEach((c) => walk(c.expr || c));
  if (Array.isArray(node.with)) node.with.forEach((c) => c && c.stmt && walk(c.stmt));
  if (node.where) walk(node.where);
  if (node.having) walk(node.having);
  return out;
}

/** 在 WHERE 树中查找 NOT IN 子查询(binary_expr 'NOT IN' 且右侧为子查询) */
function findNotInSubquery(n) {
  let found = null;
  const visited = new WeakSet();
  const walk = (x) => {
    if (found || !x || typeof x !== 'object' || visited.has(x)) return;
    visited.add(x);
    if (x.type === 'binary_expr' && (x.operator || '').toUpperCase() === 'NOT IN') {
      const r = x.right;
      if (r && r.type === 'expr_list' && Array.isArray(r.value) && r.value[0]
        && (r.value[0].ast || r.value[0].type === 'select')) {
        found = x;
        return;
      }
    }
    for (const k of Object.keys(x)) {
      const v = x[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(n);
  return found;
}

/** JOIN 简写 */
function joinText(from) {
  if (!from || from.length < 2) return '';
  const parts = [];
  for (let i = 1; i < from.length; i += 1) {
    const e = from[i];
    const jt = e.join || 'JOIN';
    const t = tableLabel(e);
    const on = e.on ? translateWhere(e.on) : '';
    let seg = `通过 ${clause(jt)} 连接 ${t}`;
    if (e.using && Array.isArray(e.using)) seg += `(USING ${e.using.map((u) => columnName(u)).join(', ')})`;
    else if (on) seg += `(ON ${on})`;
    parts.push(seg);
  }
  return parts.join('; ');
}

// ───────────────────────── 各语句模板 ─────────────────────────

function buildSelect(node) {
  const sentences = [];
  const notes = [];
  const parts = [];

  // CTE
  if (Array.isArray(node.with) && node.with.length) {
    const names = node.with.map((c) => {
      const n = c.name && c.name.value !== undefined ? c.name.value : (c.name && c.name.name ? c.name.name.map((x) => x.value).join('') : 'cte');
      return esc(String(n));
    });
    parts.push(`定义 ${clause('WITH')} 公用表表达式 ${names.join('、')}`);
    notes.push(`包含 ${node.with.length} 个 CTE(${names.join('、')}):公用表表达式(CTE)是临时结果集,仅在本语句内可见,可在主查询中多次引用,提升可读性并避免重复子查询。`);
  }

  // 基表(dual 识别为伪表,修复" 表"空表名问题)
  const from = node.from || [];
  const firstFrom = from[0];
  const isDual = !!(firstFrom && (firstFrom.type === 'dual'
    || (firstFrom.table && String(firstFrom.table).toUpperCase() === 'DUAL')));
  const base = isDual ? '伪表 dual' : (firstFrom ? tableLabel(firstFrom) : '(无 FROM)');
  parts.push(isDual ? `从 ${base} 查询数据` : `从 ${base} 表查询数据`);

  // 列
  const cols = summarizeColumns(node.columns);
  if (node.distinct && node.distinct.type) {
    parts.push(`选择${clause('DISTINCT')}去重后的字段 ${cols}`);
  } else {
    parts.push(`选择字段 ${cols}`);
  }

  // JOIN
  const jt = joinText(from);
  if (jt) parts.push(jt);

  // WHERE
  if (node.where) {
    parts.push(`${clause('WHERE')} 过滤条件 ${translateWhere(node.where)}`);
  }

  // GROUP BY
  const gt = groupText(node.groupby);
  if (gt) parts.push(`${clause('GROUP BY')} 按 ${gt} 分组`);

  // HAVING
  if (node.having) {
    parts.push(`${clause('HAVING')} 分组后过滤 ${translateWhere(node.having)}`);
  }

  // ORDER BY
  const ot = orderText(node.orderby);
  if (ot) parts.push(`${clause('ORDER BY')} 按 ${ot} 排序`);

  // LIMIT
  const lt = limitText(node.limit);
  if (lt) parts.push(`${clause('LIMIT')} 限制前 ${lt} 行`);

  sentences.push(parts.join('; ') + '。');

  // 窗口函数 notes:给出"在按 x 分组、按 y 排序的窗口内计算 行号/排名"的惯用叙述
  const wins = collectWindows(node);
  if (wins.length) {
    const lines = wins.map((w) => `${w.display} → 在${w.scope ? `${w.scope}的` : ''}窗口内计算${w.role}`);
    notes.push(`使用窗口函数:${lines.join('; ')}。窗口函数在行级计算但不聚合行数,PARTITION BY 指定分组、ORDER BY 指定组内排序。`);
  }

  // NOT IN 子查询 NULL 陷阱
  const nin = findNotInSubquery(node.where);
  if (nin) {
    const col = exprToText(nin.left);
    notes.push(`${clause('NOT IN')} 子查询 NULL 陷阱:${col ? `判断 ${col} ` : ''}若子查询返回 NULL,整个 NOT IN 会判定为未知并返回空集(无任何行)。建议改用 ${clause('NOT EXISTS')},或对子查询列做 NVL(${col || '列'}, -1) 过滤 NULL。`);
  }

  // 子查询检测
  if (containsSubquery(node)) {
    notes.push('语句中包含子查询;嵌套子查询会影响可读性与执行计划,关注谓词推进与连接顺序。');
  }

  return { sentences, notes };
}

/** 递归判断 select 内是否含子查询(表达式或 FROM 中) */
function containsSubquery(node) {
  let found = false;
  const visited = new WeakSet();
  const walk = (n) => {
    if (found || !n || typeof n !== 'object' || visited.has(n)) return;
    visited.add(n);
    if (n.ast && n.type !== 'select') { found = true; return; }
    if (n.type === 'select' && n !== node) { found = true; return; }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(node);
  return found;
}

function buildInsert(node) {
  const sentences = [];
  const notes = [];
  const tInfo = (node.table && node.table[0]) || {};
  const tName = tableName(tInfo);
  const cols = (node.columns || []).map((c) => esc(c.value ?? '')).join('、');

  // INSERT...SELECT:values 本身是 select/union 节点,或存在 select/query 字段
  const isInsertSelect = node.select
    || node.query || node.query_expr
    || (node.values && typeof node.values === 'object'
      && ['select', 'union', 'intersect', 'except'].includes(node.values.type));
  if (isInsertSelect) {
    sentences.push(`向 ${tName} 表插入数据,数据来源为子查询${cols ? `(${clause('INTO')} 字段 ${cols})` : ''}。`);
    notes.push('INSERT...SELECT 从查询结果批量插入,需保证列与源列顺序/类型对应。');
    return { sentences, notes };
  }

  let rows = [];
  if (node.values && Array.isArray(node.values.values)) rows = node.values.values;
  else if (node.values && Array.isArray(node.values)) rows = node.values;
  const n = rows.length;
  const sample = n ? (rows[0].value || rows[0]) : [];
  const sampleStr = Array.isArray(sample) ? sample.map(exprToText).join('、') : '';
  sentences.push(`向 ${tName} 表插入 ${n} 行数据${cols ? `,字段为 ${cols}` : ''}${sampleStr ? `,样例值 ${sampleStr}` : ''}。`);
  if (cols && Array.isArray(sample) && sample.length && cols.split('、').length !== sample.length) {
    notes.push('插入列数与值数不一致,请核对字段与值的对应关系。');
  }
  return { sentences, notes };
}

function buildUpdate(node) {
  const sentences = [];
  const notes = [];
  const tInfo = (node.table && node.table[0]) || {};
  const tName = tableName(tInfo);
  const sets = (node.set || []).map((s) => {
    const col = columnName(s);
    const val = exprToText(s.value);
    return `${col}=${val}`;
  });
  const parts = [`更新 ${tName} 表,${clause('SET')} 设置 ${sets.join('、') || '(空)'}`];
  if (node.where) parts.push(`条件 ${clause('WHERE')} ${translateWhere(node.where)}`);
  sentences.push(parts.join('; ') + '。');
  if (!node.where) notes.push('UPDATE 缺少 WHERE,将更新全表所有行,生产环境慎用。');
  return { sentences, notes };
}

function buildDelete(node) {
  const sentences = [];
  const notes = [];
  let tName = '';
  if (node.from && node.from[0]) tName = tableLabel(node.from[0]);
  else if (node.table && node.table[0]) tName = tableName(node.table[0]);
  if (node.where) {
    sentences.push(`从 ${tName} 表删除满足 ${clause('WHERE')} ${translateWhere(node.where)} 的行。`);
  } else {
    sentences.push(`从 ${tName} 表删除所有行(无 WHERE 条件)。`);
    notes.push('DELETE 缺少 WHERE,将清空全表,生产环境慎用(必要时用 TRUNCATE 更快)。');
  }
  return { sentences, notes };
}

function buildCreate(node) {
  const sentences = [];
  const notes = [];
  const tInfo = (node.table && node.table[0]) || {};
  const tName = tableName(tInfo);

  // CREATE TABLE AS SELECT
  if (node.as || node.query_expr) {
    sentences.push(`以子查询结果 ${clause('CREATE TABLE')} 创建表 ${tName}。`);
    notes.push('CTAS(建表并插入):目标表结构与数据均来自子查询。');
    return { sentences, notes };
  }

  const defs = node.create_definitions || [];
  const cols = [];
  for (const d of defs) {
    if (d.resource === 'column' && d.column) {
      const cname = columnName(d.column);
      const dt = d.definition && d.definition.dataType ? d.definition.dataType : '';
      let suffix = '';
      if (d.primary_key) suffix += ' 主键';
      if (d.unique) suffix += ' 唯一';
      if (d.not_null) suffix += ' 非空';
      if (d.null) suffix += ' 可空';
      const def = d.definition && Array.isArray(d.definition.suffix) && d.definition.suffix.length
        ? `(${d.definition.suffix.map((s) => s.value || '').join(',')})` : '';
      cols.push(`${cname} ${dt}${def}${suffix}`.trim());
    } else if (d.resource === 'constraint') {
      cols.push(`约束(${esc(d.constraint_type || d.keyword || '')})`);
    }
  }
  sentences.push(`${clause('CREATE TABLE')} 创建表 ${tName}${cols.length ? `,包含列 ${cols.map((c) => esc(c)).join('、')}` : ''}。`);
  if (defs.some((d) => d.primary_key)) notes.push('含主键约束,主键列非空且唯一。');
  return { sentences, notes };
}

function buildAlter(node) {
  const sentences = [];
  const notes = [];
  const tInfo = (node.table && node.table[0]) || {};
  const tName = tableName(tInfo);
  const actions = (node.expr || []).map((e) => {
    const act = e.action || e.keyword || '';
    const cname = e.column ? columnName(e.column) : '';
    const dt = e.definition && e.definition.dataType ? e.definition.dataType : '';
    return `${esc(act)} ${cname} ${dt}`.trim();
  });
  sentences.push(`${clause('ALTER TABLE')} 修改表 ${tName}:${actions.join('、') || '结构调整'}。`);
  return { sentences, notes };
}

function buildTruncate(node) {
  const sentences = [];
  const names = (node.name || []).map((n) => esc(n.table || '')).filter(Boolean).join('、');
  sentences.push(`${clause('TRUNCATE')} 清空表 ${names || '(未指明)'} 的全部数据(快速、不可回滚)。`);
  return { sentences, notes: [] };
}

function buildDrop(node) {
  const sentences = [];
  const names = (node.name || []).map((n) => esc(n.table || '')).filter(Boolean).join('、');
  const kind = node.keyword === 'table' ? '表' : '对象';
  sentences.push(`${clause('DROP')} 删除${kind} ${names || '(未指明)'}(结构+数据一并删除)。`);
  return { sentences, notes: [] };
}

/** MERGE 的正则降级翻译(astify 无法解析 MERGE) */
export function buildMergeFromText(sql) {
  const sentences = [];
  const notes = [];
  const m = sql.match(/\bMERGE\s+INTO\s+([\w.]+)\s+(?:([\w]+)\s+)?USING\s+([\w.]+)\s+ON\s*\(([^]+?)\)\s*(WHEN.*)/is);
  if (!m) {
    sentences.push(`${clause('MERGE INTO')} 合并写入目标表(无法精确解析 ON/WHEN 子句)。`);
    notes.push('MERGE 是 upsert 语义:按 ON 条件匹配则 UPDATE、不匹配则 INSERT,常用于增量同步。');
    return { sentences, notes };
  }
  let [, target, targetAlias, source, onCond, rest] = m;
  // targetAlias 可能误匹配到 USING,过滤掉
  if (targetAlias && /^(USING|SOURCE|ON)$/i.test(targetAlias)) targetAlias = '';
  const hasMatched = /WHEN\s+MATCHED\s+THEN\s+UPDATE\s+SET\s+([^;]+?)(?=WHEN|$)/is.exec(rest);
  const hasNotMatched = /WHEN\s+NOT\s+MATCHED\s+THEN\s+INSERT\s*(\(([^)]*)\))?\s*VALUES\s*\(([^)]*)\)/is.exec(rest);
  const parts = [`${clause('MERGE INTO')} upsert 合并写入:目标表 ${esc(target)}${targetAlias ? `(别名 ${esc(targetAlias)})` : ''}`];
  parts.push(`源表 ${esc(source)}`);
  parts.push(`${clause('ON')} 匹配条件 ${esc(onCond.trim())}`);
  if (hasMatched) parts.push(`${clause('WHEN MATCHED')} 匹配时 ${clause('UPDATE SET')} 更新字段 ${esc(hasMatched[1].trim())}`);
  if (hasNotMatched) parts.push(`${clause('WHEN NOT MATCHED')} 不匹配时 ${clause('INSERT')} ${hasNotMatched[2] ? `字段(${esc(hasNotMatched[2])}) ` : ''}取值(${esc(hasNotMatched[3])})`);
  sentences.push(parts.join('; ') + '。');
  notes.push('MERGE 是 upsert 语义:按 ON 条件逐行匹配,匹配则 UPDATE、不匹配则 INSERT,常用于增量同步/幂等写入。Oracle 与达梦语法基本一致,达梦对 WHEN 子句顺序有要求。');
  return { sentences, notes };
}

/** 从 DECLARE 段粗略抽取声明的变量/游标/类型名(astify 无法解析 PL/SQL) */
function extractPLSQLDeclarations(sql) {
  const m = sql.match(/\bDECLARE\b([\s\S]*?)\bBEGIN\b/i);
  if (!m) return [];
  const declBlock = m[1];
  const names = [];
  declBlock.split(';').forEach((stmt) => {
    const s = stmt.trim();
    if (!s) return;
    const head = s.match(/^(\w+)\b/);
    if (!head) return;
    const kw = head[1].toUpperCase();
    if (kw === 'CURSOR' || kw === 'TYPE' || kw === 'SUBTYPE' || kw === 'EXCEPTION') {
      const m2 = s.match(/^(?:CURSOR|TYPE|SUBTYPE|EXCEPTION)\s+(\w+)/i);
      if (m2) names.push(`${kw} ${m2[1]}`);
    } else if (!/^(PROCEDURE|FUNCTION|PRAGMA|BEGIN)$/i.test(kw)) {
      names.push(head[1]);
    }
  });
  return names;
}

/** 抽取 EXCEPTION 段的 WHEN 异常处理名 */
function extractPLSQLExceptions(sql) {
  const m = sql.match(/\bEXCEPTION\b([\s\S]*?)\bEND\b/i);
  if (!m) return [];
  const out = [];
  const re = /\bWHEN\s+([^;]+?)\s+THEN\b/gi;
  let mm;
  while ((mm = re.exec(m[1])) !== null) {
    out.push(mm[1].trim());
  }
  return out;
}

/** PL/SQL 块降级翻译(astify 无法解析 DECLARE/BEGIN) */
export function buildPLSQLFromText(sql) {
  const sentences = [];
  const notes = [];
  const hasDeclare = /\bDECLARE\b/i.test(sql);
  const hasException = /\bEXCEPTION\b/i.test(sql);
  const declNames = hasDeclare ? extractPLSQLDeclarations(sql) : [];
  const exHandlers = hasException ? extractPLSQLExceptions(sql) : [];
  const parts = [`这是一段 ${clause('PL/SQL')} 匿名块`];
  if (hasDeclare) {
    parts.push(`${clause('DECLARE')} 声明${declNames.length ? `变量/对象 ${declNames.map(esc).join('、')}` : '局部变量/类型/游标'}`);
  }
  parts.push(`${clause('BEGIN')} 执行可执行体`);
  if (hasException) {
    parts.push(`${clause('EXCEPTION')} 异常处理${exHandlers.length ? `(${exHandlers.map(esc).join('、')})` : ''}`);
  }
  parts.push('于数据库服务端运行');
  sentences.push(parts.join(', ') + '。');
  if (hasDeclare) notes.push('DECLARE 段定义局部变量/类型/游标/异常;BEGIN..END 为可执行体,顺序执行其中语句。');
  if (hasException) notes.push('EXCEPTION 段处理运行时异常(如 NO_DATA_FOUND、DUP_VAL_ON_INDEX、OTHERS),按 WHEN 分支捕获。');
  notes.push('PL/SQL 在数据库服务端执行,Oracle 与达梦(DMSQL)高度兼容,个别内置包/系统视图名有差异。');
  return { sentences, notes };
}

/** 主分发 */
export function translateStatement(node) {
  if (!node || typeof node !== 'object') return { sentences: [], notes: [] };
  switch (node.type) {
    case 'select': return buildSelect(node);
    case 'insert': return buildInsert(node);
    case 'update': return buildUpdate(node);
    case 'delete': return buildDelete(node);
    case 'create': return buildCreate(node);
    case 'alter': return buildAlter(node);
    case 'truncate': return buildTruncate(node);
    case 'drop': return buildDrop(node);
    default: return { sentences: [], notes: [] };
  }
}

/** 从 AST 节点推断 statementType(大写) */
export function statementTypeOf(node) {
  if (!node || !node.type) return 'UNKNOWN';
  const t = String(node.type).toUpperCase();
  if (t === 'SELECT') return 'SELECT';
  if (t === 'INSERT') return 'INSERT';
  if (t === 'UPDATE') return 'UPDATE';
  if (t === 'DELETE') return 'DELETE';
  if (t === 'CREATE') return 'CREATE';
  if (t === 'ALTER') return 'ALTER';
  if (t === 'DROP') return 'DROP';
  if (t === 'TRUNCATE') return 'TRUNCATE';
  return 'UNKNOWN';
}
