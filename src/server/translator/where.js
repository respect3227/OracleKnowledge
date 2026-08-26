/**
 * where.js — WHERE/表达式 AST 递归中文翻译
 * 把 node-sql-parser 的表达式节点(二元/IN/BETWEEN/LIKE/IS NULL/CASE/函数/窗口/子查询等)
 * 递归渲染成结构化中文 HTML 片段,并对所有用户内容做 HTML 转义。
 *
 * 导出的低层原语 esc/columnName/exprToText/windowSpec 也被 templates.js 复用,
 * 用于 SELECT 列表、SET 赋值、CREATE 列定义等场景。
 */

/** HTML 转义(防 XSS) */
export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 运算符 → 中文叙述 */
const OP_TEXT = {
  '=': '等于',
  '<>': '不等于',
  '!=': '不等于',
  '>': '大于',
  '<': '小于',
  '>=': '大于等于',
  '<=': '小于等于',
  AND: '并且',
  OR: '或者',
  IN: '属于',
  'NOT IN': '不属于',
  BETWEEN: '介于',
  LIKE: '匹配',
  IS: '为',
  'IS NOT': '不为',
  '+': '加',
  '-': '减',
  '*': '乘',
  '/': '除',
  '%': '取模',
  '||': '连接',
};

/** 把 column_ref 节点解析成 "table.column" / "column" / "*" */
export function columnName(node) {
  if (!node) return '';
  if (node === '*') return '*';
  if (typeof node === 'string') return node;
  // 普通标识符 { type:'default', value }
  if (node.type === 'default') return node.value ?? '';
  // column_ref
  if (node.type === 'column_ref') {
    let col;
    const c = node.column;
    if (c === '*' || c === undefined || c === null) col = '*';
    else if (typeof c === 'string') col = c;
    else if (c.expr && c.expr.value !== undefined) col = c.expr.value;
    else if (c.value !== undefined) col = c.value;
    else if (c.type === 'default') col = c.value;
    else col = '?';
    const t = node.table;
    return t ? `${t}.${col}` : String(col);
  }
  return '';
}
/** 取函数节点名(支持 string / {name:[{value}]} / {value} 形式) */
function funcNameOf(node) {
  if (!node) return '';
  if (typeof node.name === 'string') return node.name;
  if (node.name && Array.isArray(node.name.name)) {
    return node.name.name.map((n) => n.value ?? '').join('.');
  }
  if (node.name && node.name.value !== undefined) return String(node.name.value);
  return '';
}

/** 渲染函数签名 <span class="tl-func">NAME</span>(args)(不含 OVER,供模板复用) */
export function functionHtml(node) {
  if (!node) return '';
  const nm = funcNameOf(node) || 'FN';
  let argsStr = '';
  if (node.type === 'aggr_func') argsStr = aggArgText(node.args);
  else if (node.args && Array.isArray(node.args.value)) argsStr = node.args.value.map(exprToText).join(', ');
  else if (node.args && Array.isArray(node.args)) argsStr = node.args.map(exprToText).join(', ');
  return `<span class="tl-func">${esc(nm)}</span>(${argsStr})`;
}

/** 把窗口规格 OVER(...) 渲染成中文括注 */
export function windowSpec(over) {
  if (!over) return '';
  let spec = over;
  if (over.as_window_specification) spec = over.as_window_specification;
  if (spec.window_specification) spec = spec.window_specification;
  const parts = [];
  if (Array.isArray(spec.partitionby) && spec.partitionby.length) {
    const p = spec.partitionby
      .map((e) => exprToText(e.expr ? e.expr : e))
      .join(', ');
    parts.push(`按 ${p} 分区`);
  }
  if (Array.isArray(spec.orderby) && spec.orderby.length) {
    const o = spec.orderby
      .map((e) => {
        const ex = exprToText(e.expr ? e.expr : e);
        const dir = e.type && e.type.toUpperCase ? e.type : '';
        return dir ? `${ex} ${dir}` : ex;
      })
      .join(', ');
    parts.push(`按 ${o} 排序`);
  }
  return parts.length ? ` OVER(${parts.join(', ')})` : ' OVER()';
}

/** 聚合函数参数渲染:COUNT(*) / SUM(salary) */
function aggArgText(args) {
  if (!args) return '';
  if (args.expr) {
    if (args.expr.type === 'star') return '*';
    return exprToText(args.expr);
  }
  if (Array.isArray(args.value)) return args.value.map(exprToText).join(', ');
  if (Array.isArray(args)) return args.map(exprToText).join(', ');
  return '';
}

/**
 * 从子查询 AST 取 { table, whereText }:
 *  - table:子查询 from[0] 的表名(dual 伪表识别)
 *  - whereText:子查询 WHERE 的中文翻译(含已转义内容/函数 span)
 * 供 EXISTS 简述、惯用法说明等复用,避免"存在 子查询"这类空泛输出。
 */
export function subqueryParts(ast) {
  if (!ast || ast.type !== 'select') return { table: '', whereText: '' };
  const f = ast.from && ast.from[0];
  let table = '';
  if (f) {
    if (f.type === 'dual') table = 'dual';
    else if (f.table) table = String(f.table);
  }
  const whereText = ast.where ? translateWhere(ast.where) : '';
  return { table, whereText };
}

/**
 * 子查询简述,用于 EXISTS/IN 等谓词后的中文叙述。
 * 有 WHERE 时返回 "满足 X 的记录",否则返回 "表 T 的记录"。
 */
export function subqueryBrief(ast) {
  const { table, whereText } = subqueryParts(ast);
  if (whereText) return `满足 ${whereText} 的记录`;
  return table ? `${table} 表的记录` : '子查询的记录';
}

/** IN 右侧:子查询 vs 值列表 */
function renderInRight(right) {
  if (!right) return '';
  // 子查询: { type:'expr_list', value:[{ ast:{...select} }] }
  if (right.type === 'expr_list') {
    const v = right.value || [];
    if (v.length === 1 && v[0] && v[0].ast) return '子查询结果';
    if (v.length === 1 && v[0] && v[0].type === 'select') return '子查询结果';
    return `(${v.map(exprToText).join(', ')})`;
  }
  return exprToText(right);
}

/** CASE 表达式渲染 */
function caseText(node) {
  const args = node.args || [];
  const parts = [];
  // 简单 CASE:CASE expr WHEN val THEN ...
  if (node.expr) parts.push(`对 ${exprToText(node.expr)}`);
  for (const a of args) {
    if (a.type === 'when') {
      parts.push(`当 ${exprToText(a.cond)} 则 ${exprToText(a.result)}`);
    } else if (a.type === 'else') {
      parts.push(`否则 ${exprToText(a.result)}`);
    }
  }
  return `CASE(${parts.join('; ')})`;
}

/**
 * 表达式 AST 节点 → 中文 HTML 片段(已转义用户内容,函数名包 <span class="tl-func">)
 * @param {*} node node-sql-parser 表达式节点
 * @returns {string} HTML 字符串
 */
export function exprToText(node) {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return esc(node);
  if (typeof node === 'number') return esc(String(node));

  switch (node.type) {
    case 'column_ref':
      return esc(columnName(node));
    case 'star':
      return '*';
    case 'number':
    case 'bigint':
    case 'numeric':
      return esc(String(node.value));
    case 'single_quote_string':
    case 'double_quote_string':
    case 'string':
      return `'${esc(node.value)}'`;
    case 'null':
      return '空值';
    case 'bool':
    case 'boolean':
      return node.value ? '真' : '假';
    case 'expr_list': {
      const v = node.value || [];
      // 子查询包装
      if (v.length === 1 && v[0] && v[0].ast) return '子查询结果';
      return v.map(exprToText).join(', ');
    }
    case 'binary_expr':
    case 'binary':
    case 'unary': {
      const op = (node.operator || '').toUpperCase();
      const left = exprToText(node.left);
      const right = exprToText(node.right);
      // 逻辑运算优先级:OR 嵌在 AND 里加括号
      const wrapOr = (childNode, childText) =>
        childNode && (childNode.operator === 'OR')
          ? `(${childText})`
          : childText;

      if (op === 'AND') {
        return `${wrapOr(node.left, left)} ${OP_TEXT.AND} ${wrapOr(node.right, right)}`;
      }
      if (op === 'OR') {
        return `${left} ${OP_TEXT.OR} ${right}`;
      }
      if (op === 'IN' || op === 'NOT IN') {
        return `${left} ${OP_TEXT[op]} ${renderInRight(node.right)}`;
      }
      if (op === 'BETWEEN') {
        let lo = '';
        let hi = '';
        if (node.right && node.right.type === 'expr_list' && Array.isArray(node.right.value)) {
          [lo, hi] = node.right.value;
        }
        return `${left} 介于 ${exprToText(lo)} 与 ${exprToText(hi)} 之间`;
      }
      if (op === 'IS') {
        return `${left} 为空`;
      }
      if (op === 'IS NOT') {
        return `${left} 不为空`;
      }
      if (op === 'LIKE' || op === 'NOT LIKE') {
        const t = op === 'NOT LIKE' ? '不匹配' : '匹配';
        return `${left} ${t} ${right}`;
      }
      const txt = OP_TEXT[op] || node.operator || op;
      return `${left} ${txt} ${right}`;
    }
    case 'unary_expr': {
      // node-sql-parser 把 NOT EXISTS(subquery) 解析为 unary_expr,operator='NOT EXISTS'
      const op = (node.operator || '').toUpperCase();
      if (op === 'NOT EXISTS') {
        const arg = node.expr;
        const sub = arg && arg.ast ? arg.ast : (arg && arg.type === 'select' ? arg : null);
        const brief = sub ? subqueryBrief(sub) : '子查询结果';
        return `不存在${brief}`;
      }
      if (op === 'NOT') {
        return `非 (${exprToText(node.expr)})`;
      }
      const inner = exprToText(node.expr);
      const t = OP_TEXT[op] || node.operator || op;
      return inner ? `${t} ${inner}` : t;
    }
    case 'function': {
      const nm = funcNameOf(node);
      const upper = nm.toUpperCase();
      const argArr =
        node.args && node.args.value ? node.args.value
          : node.args && Array.isArray(node.args) ? node.args
          : [];
      const args = argArr.map(exprToText).join(', ');
      if (upper === 'NOT') return `非 (${args})`;
      if (upper === 'EXISTS' || upper === 'NOT EXISTS') {
        const neg = upper === 'NOT EXISTS';
        // EXISTS 的参数是子查询,取其 AST 简述,避免"存在 子查询"这类空泛输出
        const arg = argArr[0];
        const sub = arg && arg.ast ? arg.ast : (arg && arg.type === 'select' ? arg : null);
        const brief = sub ? subqueryBrief(sub) : '子查询结果';
        return `${neg ? '不存在' : '存在'}${brief}`;
      }
      let html = functionHtml(node);
      if (node.over) html += windowSpec(node.over);
      return html;
    }
    case 'aggr_func': {
      let html = functionHtml(node);
      if (node.over) html += windowSpec(node.over);
      return html;
    }
    case 'window_func': {
      let html = functionHtml(node);
      if (node.over) html += windowSpec(node.over);
      return html;
    }
    case 'case':
      return caseText(node);
    case 'select':
      // 表达式里直接出现子查询
      return '(子查询)';
    case 'parentheses':
    case 'paren':
      return node.value ? `(${exprToText(node.value)})` : '()';
    case 'cast':
      return `转换(${exprToText(node.expr || node.value)})`;
    case 'interval':
      return `间隔(${esc(String(node.expr ? node.expr.value : node.value ?? ''))})`;
    default:
      return '';
  }
}

/** WHERE 子句翻译(对外主入口) */
export function translateWhere(where) {
  if (!where) return '';
  return exprToText(where);
}
