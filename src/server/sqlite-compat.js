/**
 * sql.js 兼容层:模拟 better-sqlite3 的同步 API
 * 因为 sql.js 是异步初始化的,所有方法在 ready 后自动可用
 */
import initSqlJs from 'sql.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

let SQL = null;

/** 把 @name 命名参数 SQL 转成 ? 占位符 + 提取值数组 */
function normalizeSql(sql, params) {
  if (params === undefined || params === null) return { sql, values: [] };
  if (Array.isArray(params)) return { sql, values: params };
  const values = [];
  const normalized = sql.replace(/@(\w+)/g, (_, name) => {
    values.push(params[name] ?? null);
    return '?';
  });
  return { sql: normalized, values };
}

/** 单行查询结果转成对象 */
function rowToObj(row, columns) {
  const obj = {};
  columns.forEach((c, i) => { obj[c] = row[i]; });
  return obj;
}

/** 包装 PreparedStatement(使用 sql.js 原生 prepare API) */
class Statement {
  constructor(db, sql) {
    this._db = db;
    this._sql = sql;
    this._bound = null;
  }

  bind(params) {
    this._bound = params;
    return this;
  }

  _resolveArgs(args) {
    if (this._bound !== null) {
      const p = this._bound;
      this._bound = null;
      if (Array.isArray(p)) return { sql: this._sql, values: p };
      if (p !== null && typeof p === 'object') {
        const { sql, values } = normalizeSql(this._sql, p);
        return { sql, values };
      }
      return { sql: this._sql, values: [p] };
    }
    if (args.length === 0) return { sql: this._sql, values: [] };
    if (args.length === 1) {
      const p = args[0];
      if (p === null || p === undefined) return { sql: this._sql, values: [p] };
      if (Array.isArray(p)) return { sql: this._sql, values: p };
      if (typeof p === 'object') {
        const { sql, values } = normalizeSql(this._sql, p);
        return { sql, values };
      }
      return { sql: this._sql, values: [p] };
    }
    return { sql: this._sql, values: args };
  }

  run(...args) {
    const { sql, values } = this._resolveArgs(args);
    if (values.length > 0) {
      this._db._sqlDb.run(sql, values);
    } else {
      this._db._sqlDb.run(sql);
    }
    const rowidRes = this._db._sqlDb.exec('SELECT last_insert_rowid()');
    const rowid = rowidRes[0]?.values?.[0]?.[0] ?? 0;
    const changesRes = this._db._sqlDb.exec('SELECT changes()');
    const changes = changesRes[0]?.values?.[0]?.[0] ?? 0;
    this._db._save();
    return { lastInsertRowid: rowid, changes };
  }

  get(...args) {
    const { sql, values } = this._resolveArgs(args);
    const stmt = this._db._sqlDb.prepare(sql);
    try {
      if (values.length > 0) stmt.bind(values);
      if (!stmt.step()) return undefined;
      return stmt.getAsObject();
    } finally {
      stmt.free();
    }
  }

  all(...args) {
    const { sql, values } = this._resolveArgs(args);
    const stmt = this._db._sqlDb.prepare(sql);
    try {
      if (values.length > 0) stmt.bind(values);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      return results;
    } finally {
      stmt.free();
    }
  }
}

/** 包装 Database */
class DatabaseCompat {
  constructor(path) {
    this._path = path;
    this._sqlDb = null;
  }

  async init() {
    if (this._sqlDb) return;
    if (!SQL) SQL = await initSqlJs();
    if (existsSync(this._path)) {
      const buf = readFileSync(this._path);
      this._sqlDb = new SQL.Database(buf);
    } else {
      this._sqlDb = new SQL.Database();
    }
  }

  _save() {
    const data = this._sqlDb.export();
    writeFileSync(this._path, Buffer.from(data));
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  pragma(str) {
    this._sqlDb.run(str);
    this._save();
  }

  exec(sql) {
    this._sqlDb.exec(sql);
    this._save();
  }

  transaction(fn) {
    return (...args) => {
      const result = fn(...args);
      this._save();
      return result;
    };
  }

  close() {
    this._save();
    this._sqlDb.close();
  }
}

/** 创建数据库(异步工厂,因为 sql.js 需要 WASM 初始化) */
export async function createDatabase(path) {
  const db = new DatabaseCompat(path);
  await db.init();
  return db;
}
