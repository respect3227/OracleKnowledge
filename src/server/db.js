/**
 * SQLite 数据库连接与 Schema 定义(sql.js 兼容版)
 * 表结构支持 Oracle 与达梦双语种知识库 + 收藏夹 + 历史 + 笔记
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDatabase } from './sqlite-compat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const DB_PATH = join(DATA_DIR, 'knowledge.db');

/** 单例 db 句柄(异步初始化) */
let _db = null;
let _initPromise = null;

export async function getDb() {
  if (_db) return _db;
  if (!_initPromise) {
    _initPromise = (async () => {
      _db = await createDatabase(DB_PATH);
      await _initSchema();
      return _db;
    })();
  }
  return _initPromise;
}

export const db = new Proxy({}, {
  get(_target, prop) {
    if (!_db) throw new Error('Database not initialized. Call getDb() first.');
    return Reflect.get(_db, prop);
  }
});

async function _initSchema() {
  _db.exec(`
    CREATE TABLE IF NOT EXISTS sections (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      icon        TEXT NOT NULL,
      "desc"      TEXT NOT NULL,
      seq         INTEGER NOT NULL DEFAULT 0,
      scope       TEXT NOT NULL DEFAULT 'both'
    );

    CREATE TABLE IF NOT EXISTS items (
      id          TEXT PRIMARY KEY,
      section_id  TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      syntax      TEXT NOT NULL,
      "desc"      TEXT NOT NULL,
      example     TEXT NOT NULL,
      tips        TEXT,
      result      TEXT,
      tags        TEXT,
      db          TEXT NOT NULL DEFAULT 'both',
      diff_note   TEXT,
      seq         INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_items_section ON items(section_id);
    CREATE INDEX IF NOT EXISTS idx_items_db ON items(db);

    CREATE TABLE IF NOT EXISTS func_categories (
      id          TEXT PRIMARY KEY,
      category    TEXT NOT NULL,
      icon        TEXT NOT NULL,
      seq         INTEGER NOT NULL DEFAULT 0,
      db          TEXT NOT NULL DEFAULT 'both'
    );

    CREATE TABLE IF NOT EXISTS functions (
      id          TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES func_categories(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      syntax      TEXT NOT NULL,
      "desc"      TEXT NOT NULL,
      example     TEXT NOT NULL,
      result      TEXT,
      tags        TEXT,
      db          TEXT NOT NULL DEFAULT 'both',
      diff_note   TEXT,
      seq         INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_func_cat ON functions(category_id);
    CREATE INDEX IF NOT EXISTS idx_func_db ON functions(db);

    CREATE TABLE IF NOT EXISTS favorites (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      kind        TEXT NOT NULL,
      target_id   TEXT NOT NULL,
      title       TEXT NOT NULL,
      note        TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_fav_kind ON favorites(kind);

    CREATE TABLE IF NOT EXISTS history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sql_text    TEXT NOT NULL,
      dialect     TEXT NOT NULL DEFAULT 'oracle',
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

  `);
}
