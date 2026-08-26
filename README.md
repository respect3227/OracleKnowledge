# Oracle / 达梦双语种数据库速查

Oracle 与达梦数据库双语种知识库 + AST SQL 翻译器,从 0 到精通。
覆盖完整开发流程:`SELECT 1` 判存在、`EXISTS` vs `IN`、`MERGE`、绑定变量、`FORALL` / `BULK COLLECT`、`EXCEPTION`、`RMAN`、`Data Pump`、`AWR`、`VPD`、`RAC` 等。

## 技术栈

- **后端**:Node.js + Express + SQLite(better-sqlite3)
- **翻译器**:node-sql-parser AST 解析 + 模板 + 惯用法识别(`SELECT 1 FROM dual WHERE EXISTS` 等)
- **格式化**:sql-formatter
- **前端**:Tailwind CSS + shadcn 设计语言(CSS 变量) + Alpine.js + CodeMirror 5 + highlight.js
- **特性**:FTS5 全文搜索、暗色模式、收藏夹、SQL 分析历史、双库对比(Oracle / 达梦 / 通用徽章 + 差异说明)

## 启动

```bash
npm install           # 安装 4 个核心依赖
npm start             # 启动,默认 http://localhost:3000
# 首次启动自动 seed 数据库(14 章节 / 97 条目 / 9 函数分类 / 143 函数)
```

重置数据库:
```bash
npm run init-db       # 清空并重新灌入种子数据
```

## 项目结构

```
/workspace
├── server.js                     # Express 入口
├── package.json
├── data/knowledge.db             # SQLite 数据文件(自动生成)
├── public/                       # 前端静态资源
│   ├── index.html                # 单页应用(Tailwind + Alpine)
│   ├── css/main.css              # shadcn 设计语言 CSS 变量
│   └── js/app.js                 # Alpine 主应用
├── src/server/
│   ├── db.js                     # SQLite schema + FTS5
│   ├── seed.js                   # 数据初始化
│   ├── seed-data.js              # 知识点种子数据(14 章 / 97 条 / 143 函数)
│   ├── routes/                   # REST API(5 个路由)
│   │   ├── knowledge.js          # /api/knowledge/sections|items|search|item
│   │   ├── functions.js          # /api/functions/categories|list|:id
│   │   ├── translate.js           # /api/translate (AST 翻译)
│   │   ├── favorites.js          # /api/favorites CRUD
│   │   └── history.js            # /api/history CRUD
│   └── translator/               # AST 翻译器
│       ├── index.js              # 主入口 translateSQL(sql, dialect)
│       ├── idioms.js              # 惯用法识别(SELECT 1 EXISTS 等)
│       ├── templates.js          # 各语句中文模板
│       ├── where.js              # WHERE 递归翻译
│       ├── tokens.js             # 词法 token 提取
│       └── complexity.js         # 复杂度评级
└── legacy/                       # 旧版纯静态项目(归档参考)
```

## 主要 API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/knowledge/sections?db=oracle\|dm` | 章节列表(带条目数) |
| GET | `/api/knowledge/items?section=&db=` | 章节下条目 |
| GET | `/api/knowledge/search?q=` | FTS5 全文检索 |
| GET | `/api/functions/categories?db=` | 函数分类 |
| GET | `/api/functions/list?category=&db=&q=` | 函数列表 |
| POST | `/api/translate` | AST 翻译 `{sql, dialect}` |
| GET/POST/DELETE | `/api/favorites` | 收藏夹 CRUD |
| GET/POST/DELETE | `/api/history` | SQL 历史 CRUD |

## 知识点覆盖(14 章节)

1. Oracle/达梦体系结构基础
2. SELECT 查询基础
3. 多表连接与集合运算
4. 分组与聚合
5. DDL 数据定义
6. DML 数据操作与事务
7. DCL 权限与用户
8. 高级查询
9. PL/SQL 程序设计
10. PL/SQL 进阶(包/触发器/调度/动态 SQL/自治事务)
11. 应用开发惯用法(SELECT 1 / EXISTS vs IN / ROWNUM 分页 / MERGE / 绑定变量 / FORALL / EXCEPTION)
12. DBA 运维(RMAN / Data Pump / AWR / 闪回 / 统计信息)
13. 安全与高可用(VPD / 审计 / RAC / Data Guard / DRCP)
14. 高级特性与运维

## 快捷键

- `Ctrl/Cmd + K`:聚焦全局搜索
- `Ctrl/Cmd + /`:打开 SQL 翻译器
- `Ctrl/Cmd + Enter`(编辑器内):执行翻译
- `Ctrl/Cmd + Space`(编辑器内):SQL 关键字自动补全
