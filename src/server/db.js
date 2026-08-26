/**
 * SQLite 数据库连接与 Schema 定义
 * 表结构支持 Oracle 与达梦双语种知识库 + 收藏夹 + 历史 + 笔记
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = join(DATA_DIR, 'knowledge.db');

/** 单例 db 句柄(WAL 模式,并发友好) */
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/** 初始化全部表 */
export function initSchema() {
  db.exec(`
    -- 知识章节(如:SELECT 基础 / DDL / PL-SQL / DBA 运维...)
    CREATE TABLE IF NOT EXISTS sections (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      icon        TEXT NOT NULL,         -- FontAwesome 图标类名
      desc        TEXT NOT NULL,
      seq         INTEGER NOT NULL DEFAULT 0,
      scope       TEXT NOT NULL DEFAULT 'both'  -- both | oracle | dm:章节适用范围
    );

    -- 知识条目(每个语法点)
    CREATE TABLE IF NOT EXISTS items (
      id          TEXT PRIMARY KEY,       -- 形如 select.basic / dml.merge
      section_id  TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      syntax      TEXT NOT NULL,           -- 语法签名(单行)
      "desc"      TEXT NOT NULL,           -- 描述
      example     TEXT NOT NULL,           -- SQL 示例代码
      tips        TEXT,                    -- 提示/坑点
      result      TEXT,                    -- 执行结果样例
      tags        TEXT,                     -- 逗号分隔标签
      db          TEXT NOT NULL DEFAULT 'both',  -- both | oracle | dm:此条目数据库归属
      diff_note   TEXT,                    -- Oracle/达梦差异说明(若 both 时存在差异)
      seq         INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_items_section ON items(section_id);
    CREATE INDEX IF NOT EXISTS idx_items_db ON items(db);

    -- 函数库分类
    CREATE TABLE IF NOT EXISTS func_categories (
      id          TEXT PRIMARY KEY,
      category    TEXT NOT NULL,
      icon        TEXT NOT NULL,
      seq         INTEGER NOT NULL DEFAULT 0,
      db          TEXT NOT NULL DEFAULT 'both'
    );

    -- 函数库条目
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

    -- 收藏夹(用户收藏的知识点/函数)
    CREATE TABLE IF NOT EXISTS favorites (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      kind        TEXT NOT NULL,           -- item | function | sql
      target_id   TEXT NOT NULL,
      title       TEXT NOT NULL,
      note        TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_fav_kind ON favorites(kind);

    -- SQL 分析历史(用户在分析器里粘贴过的 SQL)
    CREATE TABLE IF NOT EXISTS history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sql_text    TEXT NOT NULL,
      dialect     TEXT NOT NULL DEFAULT 'oracle',  -- oracle | dm
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 全文搜索虚拟表(对 items 的 name/desc/example/tags 建索引)
    CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
      id, name, "desc", example, tags, content='items', content_rowid=rowid
    );
  `);
}

/** FTS 触发器:items 增删时同步到 items_fts */
export function ensureFtsTriggers() {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, id, name, "desc", example, tags)
      VALUES (new.rowid, new.id, new.name, new."desc", new.example, new.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, id, name, "desc", example, tags)
      VALUES ('delete', old.rowid, old.id, old.name, old."desc", old.example, old.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, id, name, "desc", example, tags)
      VALUES ('delete', old.rowid, old.id, old.name, old."desc", old.example, old.tags);
      INSERT INTO items_fts(rowid, id, name, "desc", example, tags)
      VALUES (new.rowid, new.id, new.name, new."desc", new.example, new.tags);
    END;
  `);
}

initSchema();
ensureFtsTriggers();
