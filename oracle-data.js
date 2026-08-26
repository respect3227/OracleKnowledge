/**
 * Oracle 数据库知识点数据集
 * 数据驱动渲染：syntax = 语法分类与示例；functions = 函数库（可搜索）
 */
window.ORACLE_DATA = {
  /* ============================ 语法部分 ============================ */
  syntax: [
    {
      id: "intro",
      title: "Oracle 基础与体系结构",
      icon: "fa-server",
      desc: "了解 Oracle 数据库的架构、数据类型、连接方式与核心概念，是入门第一步。",
      items: [
        {
          name: "Oracle 体系结构概览",
          syntax: "实例(Instance) = SGA + 后台进程 ; 数据库(Database) = 物理文件集合",
          desc: "Oracle 由「实例」和「数据库」两部分组成。实例是内存结构(SGA/PGA)与后台进程的集合；数据库是磁盘上的物理文件。一个实例挂载一个数据库(RAC 除外)。",
          example: "-- 查看当前实例名与数据库名\nSELECT instance_name, status FROM v$instance;\nSELECT name, log_mode FROM v$database;",
          tips: "SGA(系统全局区) 包含共享池、数据缓冲区、重做日志缓冲区；核心后台进程有 DBWn、LGWR、SMON、PMON、CKPT、ARCn。",
          tags: ["架构", "入门"]
        },
        {
          name: "表空间与数据文件",
          syntax: "表空间(Tablespace) → 段(Segment) → 区(Extent) → 数据块(Block)",
          desc: "Oracle 逻辑存储结构层级。表空间是最大的逻辑单位，由一个或多个数据文件组成；段是表中数据占用的空间；区是连续数据块的集合；数据块是最小 I/O 单位。",
          example: "-- 查看所有表空间\nSELECT tablespace_name, status FROM dba_tablespaces;\n-- 查看数据文件\nSELECT file_name, tablespace_name, bytes/1024/1024 MB FROM dba_data_files;",
          tips: "默认表空间：SYSTEM(系统数据)、SYSAUX(辅助系统)、USERS(用户数据)、UNDOTBS1(回滚)、TEMP(临时)。",
          tags: ["架构", "存储"]
        },
        {
          name: "常用数据类型",
          syntax: "NUMBER(p,s) | VARCHAR2(n) | CHAR(n) | DATE | TIMESTAMP | CLOB | BLOB | ROWID",
          desc: "NUMBER(p,s)：数值，p 精度 1~38，s 小数位；VARCHAR2(n)：变长字符串；CHAR(n)：定长字符串；DATE：日期时间；TIMESTAMP：带微秒时间戳；CLOB/BLOB：大文本/二进制大对象；ROWID：行物理地址。",
          example: "CREATE TABLE t_type (\n  id        NUMBER(10)     PRIMARY KEY,\n  name      VARCHAR2(50)   NOT NULL,\n  salary    NUMBER(10,2)  DEFAULT 0,\n  hire_date DATE           DEFAULT SYSDATE,\n  bio       CLOB,\n  photo     BLOB\n);",
          tips: "推荐用 VARCHAR2 而非 VARCHAR；NUMBER 不指定精度可存任意数值；TIMESTAMP(6) 精度到微秒。",
          tags: ["数据类型", "基础"]
        },
        {
          name: "连接数据库 - SQL*Plus",
          syntax: "sqlplus 用户名/密码@主机:端口/服务名 [AS SYSDBA|AS SYSOPER]",
          desc: "SQL*Plus 是 Oracle 自带的命令行工具，用于连接数据库、执行 SQL 与 PL/SQL、格式化输出。",
          example: "-- 普通用户连接\nsqlplus scott/tiger@192.168.1.10:1521/orcl\n-- 以 DBA 身份连接\nsqlplus / as sysdba\n-- 查看当前用户\nSHOW USER;",
          tips: "本地操作系统认证：sqlplus / as sysdba 直接以 SYS 登录，无需密码；CONN 命令可在会话内切换用户。",
          tags: ["连接", "工具"]
        },
        {
          name: "dual 伪表",
          syntax: "SELECT <表达式/函数> FROM dual;",
          desc: "dual 是 Oracle 提供的一行一列伪表，用于在不涉及具体表时执行函数、运算或获取系统变量。",
          example: "SELECT 1+1 AS result FROM dual;\nSELECT SYSDATE, USER FROM dual;\nSELECT TO_CHAR(SYSDATE,'YYYY-MM-DD HH24:MI:SS') now FROM dual;",
          tips: "dual 只有 1 行 1 列(dummy VARCHAR2(1))，常用于 SELECT 函数运算。",
          tags: ["基础", "伪表"]
        },
        {
          name: "查看表结构",
          syntax: "DESC 表名;  -- 或 SELECT * FROM user_tab_columns WHERE table_name='表名';",
          desc: "查看表的列、数据类型、是否可空等信息。DESC 是 SQL*Plus 命令；user_tab_columns 是数据字典视图。",
          example: "DESC emp;\n-- 数据字典方式\nSELECT column_name, data_type, nullable \n  FROM user_tab_columns \n WHERE table_name = 'EMP' \n ORDER BY column_id;",
          tips: "相关字典：user_tables(自己的表)、all_tables(可访问的表)、dba_tables(数据库所有表，需 DBA 权限)。",
          tags: ["基础", "数据字典"]
        }
      ]
    },
    {
      id: "select",
      title: "SELECT 查询基础",
      icon: "fa-search",
      desc: "掌握 SELECT 语法族：投影、筛选、排序、去重、行限制，是 SQL 的根基。",
      items: [
        {
          name: "基本查询 SELECT",
          syntax: "SELECT [DISTINCT] 列1, 列2, ... FROM 表名;",
          desc: "从表中查询指定列(投影)。* 表示所有列；DISTINCT 去除重复行。可对列做算术运算和起别名。",
          example: "-- 查询所有列\nSELECT * FROM emp;\n-- 查询指定列并起别名\nSELECT empno AS 工号, ename 姓名, sal*12 年薪 FROM emp;\n-- 去重\nSELECT DISTINCT deptno FROM emp;\n-- 字符串拼接(推荐 || 或 CONCAT)\nSELECT ename || '(' || job || ')' AS 员工信息 FROM emp;",
          tips: "别名含空格或特殊字符需用双引号：SELECT sal AS \"月薪\" FROM emp; 算术运算中 NULL 参与结果为 NULL。",
          tags: ["SELECT", "投影", "基础"]
        },
        {
          name: "条件查询 WHERE",
          syntax: "SELECT ... FROM 表名 WHERE 条件表达式;",
          desc: "按条件筛选行。支持比较运算符(=, <>, >, <, >=, <=)、逻辑运算符(AND, OR, NOT)、BETWEEN、IN、LIKE、IS NULL 等。",
          example: "-- 多条件\nSELECT * FROM emp \n WHERE deptno = 10 \n   AND sal >= 2000 \n   AND job IN ('MANAGER','CLERK');\n-- 范围与模糊\nSELECT * FROM emp \n WHERE sal BETWEEN 1500 AND 3000 \n   AND ename LIKE 'S%';\n-- NULL 判断\nSELECT * FROM emp WHERE comm IS NULL;",
          tips: "NULL 不能用 = 比较，必须用 IS NULL / IS NOT NULL；LIKE 中 % 匹配任意多个字符，_ 匹配单个字符。",
          tags: ["WHERE", "筛选", "基础"]
        },
        {
          name: "排序 ORDER BY",
          syntax: "SELECT ... FROM 表名 [WHERE ...] ORDER BY 列1 [ASC|DESC], 列2 [ASC|DESC];",
          desc: "对结果集排序。ASC 升序(默认)，DESC 降序。可按列名、列别名、列位置(数字)或表达式排序。NULL 默认排在最大值位置。",
          example: "-- 按薪资降序，薪资相同按姓名升序\nSELECT empno, ename, sal FROM emp \n ORDER BY sal DESC, ename ASC;\n-- 按列位置\nSELECT empno, sal FROM emp ORDER BY 2 DESC;\n-- NULLS 控制\nSELECT ename, comm FROM emp ORDER BY comm DESC NULLS LAST;",
          tips: "Oracle 默认 ASC 升序时 NULL 在后，DESC 时 NULL 在前；用 NULLS FIRST/LAST 显式控制。",
          tags: ["ORDER BY", "排序"]
        },
        {
          name: "行限制 FETCH / ROWNUM",
          syntax: "-- 12c+ 推荐：FETCH FIRST n ROWS ONLY\n-- 11g 及以前：ROWNUM",
          desc: "限制返回行数。Oracle 12c 引入标准 SQL 的 FETCH FIRST 语法；早期版本用 ROWNUM 伪列，但 ROWNUM 是先编号再排序，需用子查询包裹。",
          example: "-- 12c+ 取前 5 行\nSELECT empno, sal FROM emp ORDER BY sal DESC\n FETCH FIRST 5 ROWS ONLY;\n-- 跳过 5 行取 5 行(分页)\nSELECT empno, sal FROM emp ORDER BY sal DESC\n OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY;\n-- 11g 分页写法\nSELECT * FROM (\n  SELECT t.*, ROWNUM rn FROM (\n    SELECT empno, sal FROM emp ORDER BY sal DESC\n  ) t WHERE ROWNUM <= 10\n) WHERE rn > 5;",
          tips: "FETCH 还支持 PERCENT(百分比) 和 WITH TIES(包含并列)；ROWNUM=1 可用，ROWNUM>n 必须用子查询。",
          tags: ["分页", "ROWNUM", "FETCH"]
        },
        {
          name: "查询运算符全集",
          syntax: "= <> > < >= <= | AND OR NOT | BETWEEN x AND y | IN (...) | LIKE | IS NULL | EXISTS",
          desc: "WHERE 支持的全部运算符。比较、逻辑、范围、集合、模糊、存在性判断。",
          example: "-- IN 子查询\nSELECT * FROM emp \n WHERE deptno IN (SELECT deptno FROM dept WHERE loc='NEW YORK');\n-- ANY / ALL\nSELECT * FROM emp \n WHERE sal > ALL (SELECT sal FROM emp WHERE deptno=30);\n-- EXISTS\nSELECT d.* FROM dept d \n WHERE EXISTS (SELECT 1 FROM emp e WHERE e.deptno=d.deptno);",
          tips: "=ANY 等价 IN；<>ALL 等价 NOT IN；NOT IN 遇 NULL 会返回空集，需用 NVL 或 NOT EXISTS。",
          tags: ["运算符", "WHERE"]
        }
      ]
    },
    {
      id: "join",
      title: "多表连接查询",
      icon: "fa-link",
      desc: "JOIN 系列、集合运算符与子查询，实现跨表数据关联。",
      items: [
        {
          name: "内连接 INNER JOIN",
          syntax: "SELECT ... FROM 表1 [INNER] JOIN 表2 ON 连接条件;",
          desc: "返回两表中满足连接条件的行。INNER 可省略，等价于在 FROM 多表 + WHERE 写连接条件。",
          example: "-- ANSI 写法\nSELECT e.empno, e.ename, d.dname\n  FROM emp e INNER JOIN dept d ON e.deptno = d.deptno;\n-- Oracle 传统写法\nSELECT e.empno, d.dname \n  FROM emp e, dept d \n WHERE e.deptno = d.deptno;",
          tips: "多表用逗号连接时笛卡尔积，必须用 WHERE 过滤；推荐 ANSI JOIN 写法更清晰。",
          tags: ["JOIN", "内连接"]
        },
        {
          name: "外连接 OUTER JOIN",
          syntax: "LEFT|RIGHT|FULL [OUTER] JOIN ... ON ...",
          desc: "LEFT JOIN 返回左表全部行(右表无匹配补 NULL)；RIGHT JOIN 反之；FULL JOIN 返回两表全部行，无匹配处补 NULL。",
          example: "-- 左连接：所有员工，无部门也列出\nSELECT e.ename, d.dname\n  FROM emp e LEFT JOIN dept d ON e.deptno = d.deptno;\n-- 全外连接\nSELECT e.ename, d.dname\n  FROM emp e FULL JOIN dept d ON e.deptno = d.deptno;",
          tips: "Oracle 传统外连接用 (+)：emp e, dept d WHERE e.deptno=d.deptno(+) 表示左连接，(+) 放在可能为 NULL 的一侧。",
          tags: ["JOIN", "外连接"]
        },
        {
          name: "自连接与自然连接",
          syntax: "-- 自连接：同一表起不同别名连接\n-- NATURAL JOIN：自动按同名列连接",
          desc: "自连接用于层级关系(如员工-上级)；NATURAL JOIN 自动用两表所有同名列做等值连接，USING(列) 指定单列。",
          example: "-- 自连接：查员工及其上级\nSELECT e.ename 员工, m.ename 上级\n  FROM emp e LEFT JOIN emp m ON e.mgr = m.empno;\n-- NATURAL JOIN(自动匹配 deptno)\nSELECT empno, ename, dname FROM emp NATURAL JOIN dept;\n-- USING 指定列\nSELECT * FROM emp JOIN dept USING(deptno);",
          tips: "NATURAL JOIN 风险高(列名相同时会意外连接)，生产环境建议显式 ON；USING 列不能加表前缀。",
          tags: ["JOIN", "自连接", "NATURAL"]
        },
        {
          name: "集合运算 UNION / INTERSECT / MINUS",
          syntax: "SELECT ... UNION|UNION ALL|INTERSECT|MINUS SELECT ...",
          desc: "UNION 合并去重；UNION ALL 合并不去重(更快)；INTERSECT 交集；MINUS 差集(第一个有第二个无)。列数与类型需一致。",
          example: "-- 合并两个查询(去重)\nSELECT job FROM emp WHERE deptno=10\n UNION\nSELECT job FROM emp WHERE deptno=20;\n-- 差集：10 部门有而 20 部门没有的岗位\nSELECT job FROM emp WHERE deptno=10\n MINUS\nSELECT job FROM emp WHERE deptno=20;",
          tips: "集合运算默认去重并排序，性能不如 UNION ALL；ORDER BY 只能放最后一条查询末尾。",
          tags: ["集合", "UNION", "MINUS"]
        },
        {
          name: "子查询",
          syntax: "-- 标量子查询(返回单值) / 行子查询(返回一行) / 表子查询(返回多行多列)\n-- 用在 WHERE / HAVING / FROM / SELECT 中",
          desc: "子查询是嵌套在 SELECT 中的查询。可出现在 WHERE(条件)、FROM(临时表/内联视图)、SELECT(列) 中。配合 =、IN、ANY、ALL、EXISTS 使用。",
          example: "-- 查薪资高于部门平均的员工\nSELECT e.ename, e.sal, e.deptno\n  FROM emp e\n WHERE sal > (SELECT AVG(sal) FROM emp WHERE deptno = e.deptno);\n-- FROM 子查询(内联视图)\nSELECT deptno, avg_sal FROM (SELECT deptno, AVG(sal) avg_sal FROM emp GROUP BY deptno) WHERE avg_sal > 2000;\n-- EXISTS 半连接\nSELECT d.* FROM dept d WHERE EXISTS (SELECT 1 FROM emp e WHERE e.deptno=d.deptno);",
          tips: "相关子查询(引用外层表)逐行执行；非相关子查询执行一次。相关子查询用 EXISTS 通常比 IN 高效(尤其内表大时)。",
          tags: ["子查询", "EXISTS", "IN"]
        },
        {
          name: "WITH 子句 (CTE 公用表表达式)",
          syntax: "WITH 别名 AS (SELECT ...), 别名2 AS (SELECT ...) SELECT ...",
          desc: "WITH 定义临时结果集(CTE)，可被主查询多次引用，提升可读性与性能(只需计算一次)。支持递归 CTE(11gR2+)。",
          example: "-- 每部门平均薪资，再筛 >2000\nWITH dept_avg AS (\n  SELECT deptno, AVG(sal) avg_sal FROM emp GROUP BY deptno\n)\nSELECT d.dname, a.avg_sal\n  FROM dept_avg a JOIN dept d ON a.deptno = d.deptno\n WHERE a.avg_sal > 2000;",
          tips: "复杂查询用 CTE 替代嵌套子查询可读性更好；递归 CTE 用 WITH 名称(列) AS (锚点 UNION ALL 递归) 实现层级遍历。",
          tags: ["WITH", "CTE", "递归"]
        }
      ]
    },
    {
      id: "group",
      title: "分组与聚合",
      icon: "fa-layer-group",
      desc: "GROUP BY、HAVING 与 ROLLUP/CUBE/GROUPING SETS 实现多维统计汇总。",
      items: [
        {
          name: "GROUP BY 分组",
          syntax: "SELECT 分组列, 聚合函数(...) FROM 表 [WHERE ...] GROUP BY 分组列 [HAVING ...];",
          desc: "按分组列分组后聚合。SELECT 中非聚合列必须出现在 GROUP BY 中。WHERE 在分组前过滤，HAVING 在分组后过滤。",
          example: "-- 每部门每岗位的人数与平均薪资\nSELECT deptno, job, COUNT(*) 人数, AVG(sal) 平均薪资\n  FROM emp\n GROUP BY deptno, job\n ORDER BY deptno, 平均薪资 DESC;\n-- HAVING 过滤分组\nSELECT deptno, AVG(sal) FROM emp\n GROUP BY deptno HAVING AVG(sal) > 2000;",
          tips: "执行顺序：FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY。HAVING 只能过滤聚合结果或分组列。",
          tags: ["GROUP BY", "聚合", "HAVING"]
        },
        {
          name: "ROLLUP 小计与总计",
          syntax: "GROUP BY ROLLUP(列1, 列2, ...)",
          desc: "生成分组的小计与总计行。ROLLUP(a,b) 等价 GROUP BY (a,b),(a),() 三种分组并 UNION。",
          example: "SELECT deptno, job, SUM(sal) 薪资合计\n  FROM emp\n GROUP BY ROLLUP(deptno, job)\n ORDER BY deptno NULLS LAST, job NULLS LAST;",
          result: "每个部门每岗位合计 + 每部门小计 + 全表总计",
          tips: "用 GROUPING(列) 函数判断当前行是否为汇总行(1=是,0=否)，配合 DECODE 显示友好标题。",
          tags: ["ROLLUP", "小计", "汇总"]
        },
        {
          name: "CUBE 多维交叉汇总",
          syntax: "GROUP BY CUBE(列1, 列2, ...)",
          desc: "生成分组列所有维度的组合汇总。CUBE(a,b) 产生 (a,b),(a),(b),() 四种分组，比 ROLLUP 更全。",
          example: "SELECT deptno, job, SUM(sal)\n  FROM emp GROUP BY CUBE(deptno, job);",
          result: "部门×岗位、部门、岗位、总计 四种汇总",
          tips: "CUBE 列数多时组合爆炸(n 列产生 2^n 分组)，慎用。",
          tags: ["CUBE", "交叉", "汇总"]
        },
        {
          name: "GROUPING SETS 指定分组",
          syntax: "GROUP BY GROUPING SETS ((列1,列2), (列1), ())",
          desc: "精确指定要生成的分组组合，比 CUBE/ROLLUP 更灵活可控。",
          example: "SELECT deptno, job, SUM(sal)\n  FROM emp\n GROUP BY GROUPING SETS ((deptno, job), (deptno), ());",
          result: "部门×岗位 + 部门 + 总计 三种",
          tips: "等价于把多个 GROUP BY 用 UNION ALL 合并，但性能更好(只扫一次表)。",
          tags: ["GROUPING SETS", "分组"]
        }
      ]
    },
    {
      id: "ddl",
      title: "DDL 数据定义",
      icon: "fa-table",
      desc: "CREATE/ALTER/DROP/TRUNCATE 操作表、约束、索引、视图、序列、同义词等对象。",
      items: [
        {
          name: "CREATE TABLE 建表",
          syntax: "CREATE TABLE 表名 (列名 类型 [约束], ... [, 表级约束]);",
          desc: "创建表，可定义列约束(列级)或表级约束。支持 DEFAULT 默认值、AS SELECT 从查询建表(CTAS)。",
          example: "CREATE TABLE employee (\n  emp_id     NUMBER(6)    PRIMARY KEY,\n  emp_name   VARCHAR2(50) NOT NULL,\n  email      VARCHAR2(100) UNIQUE,\n  dept_no    NUMBER(4),\n  salary     NUMBER(10,2) DEFAULT 0 CHECK (salary >= 0),\n  hire_date  DATE         DEFAULT SYSDATE,\n  CONSTRAINT fk_emp_dept FOREIGN KEY (dept_no) REFERENCES dept(deptno)\n);\n-- CTAS 从查询建表\nCREATE TABLE emp_bak AS SELECT * FROM emp WHERE 1=2;",
          tips: "CTAS 不复制约束；WHERE 1=2 只复制表结构不复制数据。表名默认大写，用双引号可保持大小写。",
          tags: ["DDL", "CREATE", "建表"]
        },
        {
          name: "ALTER TABLE 修改表",
          syntax: "ALTER TABLE 表名 ADD|MODIFY|DROP (列定义|约束);",
          desc: "增加列、修改列类型/默认值、删除列、重命名列、增删约束、启用禁用约束。",
          example: "-- 增加列\nALTER TABLE emp ADD (phone VARCHAR2(20));\n-- 修改列\nALTER TABLE emp MODIFY (ename VARCHAR2(100) NOT NULL);\n-- 删除列\nALTER TABLE emp DROP COLUMN phone;\n-- 重命名列(9i+)\nALTER TABLE emp RENAME COLUMN ename TO emp_name;\n-- 增删约束\nALTER TABLE emp ADD CONSTRAINT ck_sal CHECK (sal > 0);\nALTER TABLE emp DROP CONSTRAINT ck_sal;\n-- 禁用/启用约束\nALTER TABLE emp DISABLE CONSTRAINT ck_sal;\nALTER TABLE emp ENABLE CONSTRAINT ck_sal;",
          tips: "含数据的列改类型受限；列改 NOT NULL 需表中无 NULL 值；在线重定义 DBMS_REDEFINITION 可减少锁表。",
          tags: ["DDL", "ALTER", "修改表"]
        },
        {
          name: "TRUNCATE vs DELETE vs DROP",
          syntax: "TRUNCATE TABLE 表名;  /  DELETE FROM 表名 [WHERE ...];  /  DROP TABLE 表名;",
          desc: "TRUNCATE：清空全表数据，DDL 不可回滚，速度快释放空间；DELETE：DML 可回滚，可加条件，不释放空间；DROP：删除表结构与数据。",
          example: "-- 清空表(不可回滚)\nTRUNCATE TABLE emp_bak;\n-- 按条件删除(可回滚)\nDELETE FROM emp WHERE deptno = 99;\nCOMMIT;\n-- 删除表\nDROP TABLE emp_bak;\n-- 闪回删除(回收站恢复)\nFLASHBACK TABLE emp_bak TO BEFORE DROP;",
          tips: "TRUNCATE 触发器不触发、高水位线(HWM)重置；DROP 表进入回收站，可用 FLASHBACK 恢复(10g+)。",
          tags: ["DDL", "TRUNCATE", "DELETE", "DROP"]
        },
        {
          name: "约束 Constraints",
          syntax: "NOT NULL | UNIQUE | PRIMARY KEY | FOREIGN KEY | CHECK | DEFAULT",
          desc: "保证数据完整性。主键=唯一+非空；外键引用父表主键/唯一键；CHECK 自定义条件；UNIQUE 允许多个 NULL。",
          example: "-- 建表时定义\nCREATE TABLE t (\n  id   NUMBER PRIMARY KEY,\n  name VARCHAR2(30) NOT NULL,\n  code VARCHAR2(10) UNIQUE,\n  age  NUMBER CHECK (age BETWEEN 18 AND 65),\n  pid  NUMBER REFERENCES parent(id) ON DELETE CASCADE\n);\n-- ON DELETE 选项：CASCADE 级联删除 / SET NULL 置空",
          tips: "外键不加 ON DELETE 默认 RESTRICT(禁止删除被引用行)；约束有名称才好管理，建议 CONSTRAINT 命名。",
          tags: ["约束", "主键", "外键", "CHECK"]
        },
        {
          name: "索引 Index",
          syntax: "CREATE [UNIQUE] INDEX 索引名 ON 表名(列1 [ASC|DESC], ...);",
          desc: "加速查询但降低 DML 速度。B-Tree 默认索引适合高基数列；位图索引适合低基数(性别/状态)；函数索引基于表达式。",
          example: "-- 普通索引\nCREATE INDEX idx_emp_ename ON emp(ename);\n-- 复合索引\nCREATE INDEX idx_emp_dept_sal ON emp(deptno, sal DESC);\n-- 唯一索引\nCREATE UNIQUE INDEX idx_emp_email ON emp(email);\n-- 函数索引\nCREATE INDEX idx_emp_upper_name ON emp(UPPER(ename));\n-- 位图索引(低基数列)\nCREATE BITMAP INDEX idx_emp_sex ON emp(sex);\n-- 删除\nDROP INDEX idx_emp_ename;",
          tips: "WHERE 用到索引列且不经过函数；复合索引遵循最左前缀；函数索引需查询时用相同表达式：WHERE UPPER(ename)='SMITH'。",
          tags: ["索引", "B-Tree", "位图", "函数索引"]
        },
        {
          name: "视图 View",
          syntax: "CREATE [OR REPLACE] [FORCE|NOFORCE] VIEW 视图名 AS SELECT ... [WITH CHECK OPTION|READ ONLY];",
          desc: "视图是逻辑表(存储 SQL)。简化查询、隐藏列、控制权限。简单视图可更新(键保留表)，复杂视图不可更新。",
          example: "CREATE OR REPLACE VIEW v_emp_dept AS\n  SELECT e.empno, e.ename, e.sal, d.dname\n    FROM emp e JOIN dept d ON e.deptno = d.deptno\n   WHERE e.sal > 1000\n   WITH CHECK OPTION;  -- 通过视图更新时必须满足 WHERE 条件\n-- 只读视图\nCREATE VIEW v_dept_stat AS SELECT deptno, COUNT(*) cnt FROM emp GROUP BY deptno WITH READ ONLY;",
          tips: "WITH CHECK OPTION 防止通过视图修改后让数据脱离视图可见范围；物化视图(MATERIALIZED VIEW) 真实存储数据，需刷新。",
          tags: ["视图", "VIEW", "权限"]
        },
        {
          name: "序列 Sequence",
          syntax: "CREATE SEQUENCE 序列名 [START WITH n] [INCREMENT BY n] [MAXVALUE n|NOMAXVALUE] [CYCLE|NOCYCLE] [CACHE n|NOCACHE];",
          desc: "生成自增数字，常用于主键。NEXTVAL 取下一个值，CURRVAL 取当前值(必须先 NEXTVAL)。",
          example: "CREATE SEQUENCE seq_emp_id\n  START WITH 1000 INCREMENT BY 1\n  MAXVALUE 999999 NOCYCLE CACHE 20;\n-- 使用\nINSERT INTO emp(empno, ename) VALUES (seq_emp_id.NEXTVAL, 'TOM');\n-- 查看当前值\nSELECT seq_emp_id.CURRVAL FROM dual;\n-- 12c+ 标识列(更简单)\nCREATE TABLE t (id NUMBER GENERATED AS IDENTITY PRIMARY KEY, name VARCHAR2(30));",
          tips: "CACHE 提升性能但实例崩溃会跳号；RAC 环境用 NOORDER(默认) 避免锁竞争；12c 推荐用 IDENTITY 列。",
          tags: ["序列", "Sequence", "自增"]
        },
        {
          name: "同义词 Synonym",
          syntax: "CREATE [PUBLIC] SYNONYM 同义词名 FOR 对象名 [@DBLink];",
          desc: "对象的别名，简化跨用户/跨库访问。PUBLIC 公共同义词所有用户可用(需权限)。",
          example: "-- 私有同义词：把 scott.emp 简称为 emp\nCREATE SYNONYM emp FOR scott.emp;\n-- 公共同义词\nCREATE PUBLIC SYNONYM dept FOR scott.dept;\n-- 通过同义词访问\nSELECT * FROM emp;\n-- 删除\nDROP SYNONYM emp;",
          tips: "同义词不存储数据，仅是名称映射；常配合 DBLink 使用简化远程表访问。",
          tags: ["同义词", "Synonym"]
        },
        {
          name: "数据库链接 DBLink",
          syntax: "CREATE [PUBLIC] DATABASE LINK 链接名 CONNECT TO 用户 IDENTIFIED BY 密码 USING '服务名';",
          desc: "访问远程数据库对象的通道。建好后用 表名@链接名 访问远程表。",
          example: "-- 创建私有 DBLink\nCREATE DATABASE LINK link_remote\n  CONNECT TO scott IDENTIFIED BY tiger\n  USING 'ORCL_REMOTE';\n-- 访问远程表\nSELECT * FROM emp@link_remote;\n-- 跨库 JOIN\nSELECT e.ename, d.dname\n  FROM emp@link_remote e, dept d\n WHERE e.deptno = d.deptno;",
          tips: "需 tnsnames.ora 配置服务名(或用 EZCONNECT: '//host:1521/sid')；PUBLIC DBLink 需 DBA 权限。",
          tags: ["DBLink", "分布式"]
        }
      ]
    },
    {
      id: "dml",
      title: "DML 数据操作与事务",
      icon: "fa-pen",
      desc: "INSERT/UPDATE/DELETE/MERGE 与事务控制 COMMIT/ROLLBACK/SAVEPOINT。",
      items: [
        {
          name: "INSERT 插入",
          syntax: "INSERT INTO 表名(列1,...) VALUES(值1,...);  / INSERT INTO 表 SELECT ...;",
          desc: "单行插入用 VALUES；批量插入用子查询；INSERT ALL 可一次插入多表。",
          example: "-- 单行\nINSERT INTO emp(empno, ename, sal, deptno) VALUES(8001, 'JACK', 3000, 10);\n-- 从查询插入(批量)\nINSERT INTO emp_bak SELECT * FROM emp WHERE deptno=10;\n-- 多表插入\nINSERT ALL\n  INTO emp_sale(empno, ename) VALUES(empno, ename)\n  INTO emp_mgr(empno, mgr) VALUES(empno, mgr)\nSELECT empno, ename, mgr FROM emp WHERE deptno=10;\n-- 条件多表插入\nINSERT FIRST\n  WHEN sal >= 3000 THEN INTO high_sal VALUES(empno, sal)\n  WHEN sal >= 1500 THEN INTO mid_sal VALUES(empno, sal)\n  ELSE INTO low_sal VALUES(empno, sal)\nSELECT empno, sal FROM emp;",
          tips: "INSERT ALL 中 WHEN 条件对所有行求值；INSERT FIRST 命中即跳过后续；用 APPEND 提示直接写高水位之上提升批量速度。",
          tags: ["DML", "INSERT", "批量"]
        },
        {
          name: "UPDATE 更新",
          syntax: "UPDATE 表名 SET 列=值[,...] [WHERE 条件];",
          desc: "修改满足条件的行。可基于子查询更新，可用 MERGE 替代复杂更新。漏写 WHERE 会更新全表。",
          example: "-- 简单更新\nUPDATE emp SET sal = sal * 1.1, comm = 500 WHERE deptno = 10;\n-- 基于子查询更新(相关子查询)\nUPDATE emp e\n   SET sal = (SELECT AVG(sal) FROM emp WHERE deptno = e.deptno)\n WHERE job = 'CLERK';\n-- 用 MERGE 更稳妥(避免子查询返回多行报错)\nMERGE INTO emp e USING (SELECT deptno, AVG(sal) avg_sal FROM emp GROUP BY deptno) s\nON (e.deptno = s.deptno)\nWHEN MATCHED THEN UPDATE SET e.sal = s.avg_sal;",
          tips: "相关子查询更新效率低，可用 MERGE 优化；大表更新分批提交避免锁等待与 UNDO 撑爆。",
          tags: ["DML", "UPDATE"]
        },
        {
          name: "DELETE 删除",
          syntax: "DELETE FROM 表名 [WHERE 条件];",
          desc: "删除满足条件的行，DML 可回滚。不释放空间，不重置高水位。漏写 WHERE 删全表。",
          example: "-- 按条件删除\nDELETE FROM emp WHERE deptno = 99 AND comm IS NULL;\n-- 删除全表(慢、可回滚、保留空间)\nDELETE FROM emp_bak;\n-- 清空全表优先用 TRUNCATE(快、不可回滚、释放空间)\nTRUNCATE TABLE emp_bak;",
          tips: "删除大表用 TRUNCATE；删除部分行后空间不释放(HWM 不降)，需 ALTER TABLE SHRINK SPACE 在线收缩。",
          tags: ["DML", "DELETE"]
        },
        {
          name: "MERGE 合并(upsert)",
          syntax: "MERGE INTO 目标表 USING 源 ON(条件) WHEN MATCHED THEN UPDATE/DELETE WHEN NOT MATCHED THEN INSERT;",
          desc: "根据连接条件匹配：匹配则更新/删除，不匹配则插入。实现 upsert(存在则更新，不存在则插入)。",
          example: "MERGE INTO emp_target t\n  USING (SELECT empno, ename, sal FROM emp_source) s\n  ON (t.empno = s.empno)\nWHEN MATCHED THEN\n  UPDATE SET t.sal = s.sal, t.ename = s.ename\n  WHERE t.sal <> s.sal\n  DELETE WHERE t.sal > 5000\nWHEN NOT MATCHED THEN\n  INSERT (empno, ename, sal) VALUES (s.empno, s.ename, s.sal);",
          tips: "UPDATE 子句可加 WHERE 仅更新差异行、可加 DELETE 删除满足条件行；MERGE 单条 SQL 完成同步，比循环 PL/SQL 快得多。",
          tags: ["DML", "MERGE", "upsert"]
        },
        {
          name: "事务控制 TCL",
          syntax: "COMMIT; | ROLLBACK [TO 保存点]; | SAVEPOINT 保存点名;",
          desc: "事务是操作的逻辑单元，要么全成功要么全回滚。COMMIT 提交、ROLLBACK 回滚、SAVEPOINT 设置保存点可部分回滚。",
          example: "SAVEPOINT sp1;\nINSERT INTO emp VALUES(9001,'A',3000);\nSAVEPOINT sp2;\nUPDATE emp SET sal=sal+500 WHERE empno=9001;\nROLLBACK TO sp2;  -- 回滚到 sp2，保留 INSERT，撤销 UPDATE\nCOMMIT;           -- 提交 INSERT\n-- 设置只读事务\nSET TRANSACTION READ ONLY;\n-- 设置隔离级别\nSET TRANSACTION ISOLATION LEVEL SERIALIZABLE;",
          tips: "DDL(CREATE/ALTER/DROP/TRUNCATE) 会自动 COMMIT；隔离级别：READ COMMITTED(默认)、SERIALIZABLE、READ ONLY。",
          tags: ["TCL", "事务", "COMMIT", "ROLLBACK"]
        },
        {
          name: "锁 LOCK",
          syntax: "LOCK TABLE 表名 IN 锁模式 MODE [NOWAIT];",
          desc: "锁模式：ROW SHARE/ROW EXCLUSIVE/SHARE/SHARE ROW EXCLUSIVE/EXCLUSIVE。SELECT ... FOR UPDATE 锁定查询行。",
          example: "-- 行级锁(悲观锁，常用于修改前锁定)\nSELECT * FROM emp WHERE empno=7369 FOR UPDATE;\n-- 等待 3 秒获取不到锁则报错\nSELECT * FROM emp WHERE empno=7369 FOR UPDATE WAIT 3;\n-- 不等待，锁不到立即报 ORA-00054\nSELECT * FROM emp WHERE empno=7369 FOR UPDATE NOWAIT;\n-- 跳过被锁行\nSELECT * FROM emp FOR UPDATE SKIP LOCKED;",
          tips: "FOR UPDATE NOWAIT/SKIP LOCKED 常用于并发任务避免阻塞；FOR UPDATE 锁在 COMMIT/ROLLBACK 后释放。",
          tags: ["TCL", "锁", "FOR UPDATE"]
        }
      ]
    },
    {
      id: "dcl",
      title: "DCL 权限与用户",
      icon: "fa-user-shield",
      desc: "用户、角色、权限管理：CREATE USER / GRANT / REVOKE / 角色管理。",
      items: [
        {
          name: "用户管理",
          syntax: "CREATE USER 用户名 IDENTIFIED BY 密码 [DEFAULT TABLESPACE 表空间] [QUOTA n ON 表空间];",
          desc: "创建用户必须配密码与表空间配额。新建用户无任何权限，需 GRANT CREATE SESSION 才能登录。",
          example: "CREATE USER app_user IDENTIFIED BY \"Passw0rd!\"\n  DEFAULT TABLESPACE users\n  TEMPORARY TABLESPACE temp\n  QUOTA 100M ON users;\n-- 修改密码\nALTER USER app_user IDENTIFIED BY \"NewPwd123\";\n-- 锁定/解锁\nALTER USER app_user ACCOUNT LOCK;\nALTER USER app_user ACCOUNT UNLOCK;\n-- 密码过期\nALTER USER app_user PASSWORD EXPIRE;\n-- 删除用户\nDROP USER app_user CASCADE;",
          tips: "DROP USER CASCADE 会删除用户所有对象；12c+ 可创建公共用户(以 C## 开头)用于 CDB。",
          tags: ["DCL", "用户", "CREATE USER"]
        },
        {
          name: "GRANT 授权",
          syntax: "GRANT 权限|角色 [(列,...)] ON 对象 TO 用户|角色 [WITH GRANT OPTION] [WITH ADMIN OPTION];",
          desc: "系统权限(CREATE SESSION/CREATE TABLE 等)和对象权限(SELECT/INSERT/UPDATE/EXECUTE 等)。WITH GRANT OPTION 允许转授对象权限。",
          example: "-- 系统权限\nGRANT CREATE SESSION, CREATE TABLE, CREATE VIEW TO app_user;\n-- 对象权限\nGRANT SELECT, INSERT ON scott.emp TO app_user;\n-- 列级权限\nGRANT UPDATE(sal, comm) ON scott.emp TO app_user;\n-- 存储过程执行权\nGRANT EXECUTE ON scott.pkg_emp TO app_user;\n-- 转授权(慎用)\nGRANT SELECT ON scott.emp TO app_user WITH GRANT OPTION;\n-- 角色\nGRANT connect, resource TO app_user;",
          tips: "WITH GRANT OPTION 转授后回收会级联；connect/resource 是预定义角色；生产环境推荐按角色授权而非直接给用户。",
          tags: ["DCL", "GRANT", "权限"]
        },
        {
          name: "REVOKE 回收权限",
          syntax: "REVOKE 权限|角色 ON 对象 FROM 用户|角色;",
          desc: "回收已授予权限。系统权限回收不级联；对象权限回收会级联(若用户曾转授)。",
          example: "-- 回收对象权限\nREVOKE SELECT, INSERT ON scott.emp FROM app_user;\n-- 回收系统权限\nREVOKE CREATE TABLE FROM app_user;\n-- 回收角色\nREVOKE resource FROM app_user;",
          tips: "回收对象权限时，WITH GRANT OPTION 转授出去的权限会被一并回收(级联)。",
          tags: ["DCL", "REVOKE", "权限"]
        },
        {
          name: "角色 Role",
          syntax: "CREATE ROLE 角色名;  / GRANT 权限 TO 角色名;  / GRANT 角色名 TO 用户;",
          desc: "角色是权限的集合，便于批量授权管理。预定义角色：CONNECT、RESOURCE、DBA、SELECT_CATALOG_ROLE 等。",
          example: "-- 创建角色\nCREATE ROLE r_emp_mgr;\n-- 给角色授权\nGRANT SELECT, INSERT, UPDATE ON scott.emp TO r_emp_mgr;\nGRANT EXECUTE ON scott.pkg_emp TO r_emp_mgr;\n-- 把角色授给用户\nGRANT r_emp_mgr TO app_user;\n-- 启用/禁用角色(会话级)\nSET ROLE r_emp_mgr;\nSET ROLE NONE;  -- 禁用所有角色\n-- 删除角色\nDROP ROLE r_emp_mgr;",
          tips: "角色可带密码验证；角色可启用/禁用实现动态权限控制；公共用户/角色在 CDB 需 C## 前缀。",
          tags: ["DCL", "角色", "Role"]
        }
      ]
    },
    {
      id: "advanced",
      title: "高级查询",
      icon: "fa-bolt",
      desc: "层次查询、PIVOT、分析函数、模型查询等进阶 SQL 技巧。",
      items: [
        {
          name: "层次查询 CONNECT BY",
          syntax: "SELECT ... FROM 表 START WITH 起始条件 CONNECT BY PRIOR 子=父 [NOCYCLE] [ORDER SIBLINGS BY ...];",
          desc: "遍历树形/层级数据(组织架构、菜单)。START WITH 指定根；CONNECT BY 定义父子关系；PRIOR 标识父行；LEVEL 伪列表示层级深度。",
          example: "-- 员工上下级树\nSELECT LPAD(' ', 2*(LEVEL-1)) || ename AS 员工层级, empno, mgr\n  FROM emp\n START WITH mgr IS NULL\n CONNECT BY PRIOR empno = mgr\n ORDER SIBLINGS BY ename;\n-- 防止循环(NOCYCLE)，显示是否循环\nSELECT ename, CONNECT_BY_ISCYCLE AS is_cycle\n  FROM emp START WITH mgr IS NULL\n CONNECT BY NOCYCLE PRIOR empno = mgr;\n-- 从根到当前路径\nSELECT SYS_CONNECT_BY_PATH(ename, '/') AS 路径\n  FROM emp WHERE LEVEL=3\n START WITH mgr IS NULL CONNECT BY PRIOR empno=mgr;",
          tips: "PRIOR 放哪边决定方向：PRIOR empno=mgr 自顶向下；PRIOR mgr=empno 自底向上；LEVEL 配合 LPAD 实现缩进树形展示。",
          tags: ["层次查询", "CONNECT BY", "树形"]
        },
        {
          name: "PIVOT / UNPIVOT 行列转换",
          syntax: "SELECT ... FROM (源查询) PIVOT (聚合函数 FOR 列 IN (值1,值2,...));",
          desc: "PIVOT 把行转列(交叉表)；UNPIVOT 把列转行。常用于报表统计。",
          example: "-- 行转列：每部门各岗位薪资合计\nSELECT * FROM (\n  SELECT deptno, job, sal FROM emp\n)\nPIVOT (\n  SUM(sal) FOR job IN ('CLERK' AS CLERK, 'SALESMAN' AS SALESMAN, 'MANAGER' AS MANAGER, 'ANALYST' AS ANALYST)\n)\nORDER BY deptno;\n-- 列转行\nSELECT deptno, job, sal FROM (\n  SELECT deptno, 'CLERK' AS job, clerk_sal AS sal FROM dept_sal\n  UNION ALL SELECT deptno, 'SALESMAN', salesman_sal FROM dept_sal\n);",
          tips: "PIVOT 的 IN 列表需写死值(11g+)；动态行列转需用 XML 或 PL/SQL 拼接；12c 可用 PIVOT 配合 XML。",
          tags: ["PIVOT", "行列转换", "报表"]
        },
        {
          name: "CASE 表达式",
          syntax: "-- 简单 CASE\nCASE 列 WHEN 值1 THEN 结果1 [WHEN ...] [ELSE 默认] END\n-- 搜索 CASE\nCASE WHEN 条件1 THEN 结果1 [WHEN ...] [ELSE 默认] END",
          desc: "条件表达式，可嵌入 SELECT、WHERE、ORDER BY、UPDATE SET、PL/SQL 中。ELSE 缺省返回 NULL。",
          example: "-- 薪资分级\nSELECT ename, sal,\n  CASE \n    WHEN sal >= 3000 THEN '高'\n    WHEN sal >= 1500 THEN '中'\n    ELSE '低'\n  END AS 等级\nFROM emp;\n-- 简单 CASE\nSELECT ename, \n  CASE deptno WHEN 10 THEN '财务' WHEN 20 THEN '研发' ELSE '其他' END AS 部门\nFROM emp;\n-- 用于 ORDER BY 自定义排序\nSELECT * FROM emp ORDER BY CASE job WHEN 'PRESIDENT' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END;",
          tips: "CASE 是表达式必须返回值；DECODE(列, 值1, 结果1, 默认) 是 Oracle 特有的简写，搜索 CASE 比 DECODE 更标准可读。",
          tags: ["CASE", "条件", "DECODE"]
        },
        {
          name: "分析函数(窗口函数)概览",
          syntax: "函数名() OVER ([PARTITION BY 分组列] [ORDER BY 排序列 [ROWS|RANGE 窗口]])",
          desc: "对每行返回聚合/排名/偏移结果，不聚合行数。PARTITION BY 分区；ORDER BY+窗口定义计算范围。是 Oracle 强项。",
          example: "-- 部门内按薪资排名\nSELECT ename, deptno, sal,\n  RANK() OVER (PARTITION BY deptno ORDER BY sal DESC) 部门排名,\n  ROW_NUMBER() OVER (PARTITION BY deptno ORDER BY sal DESC) 行号,\n  SUM(sal) OVER (PARTITION BY deptno) 部门总薪资,\n  LAG(sal) OVER (ORDER BY sal) 前一行薪资\nFROM emp;",
          tips: "区别聚合函数：聚合函数配 GROUP BY 会合并行；分析函数 OVER 保留原行。详见函数库「分析函数」分类。",
          tags: ["分析函数", "窗口", "OVER"]
        },
        {
          name: "MODEL 子句(电子表格式)",
          syntax: "SELECT ... FROM 表 MODEL [PARTITION BY ...] DIMENSION BY (...) MEASURES (...) RULES (...);",
          desc: "把结果集当多维数组，用类似 Excel 单元格引用做计算。复杂且少用，适合财务建模。",
          example: "SELECT deptno, year, sal\n  FROM sales\n MODEL PARTITION BY (deptno)\n       DIMENSION BY (year)\n       MEASURES (sal)\n       RULES (sal[2005] = sal[2004] * 1.1,  -- 2005 = 2004*1.1\n              sal[2006] = sal[2005] + sal[2004]);",
          tips: "用 UPSERT|UPDATE 控制规则模式；POSITION pv 可循环；多数场景用分析函数或 PL/SQL 更易读。",
          tags: ["MODEL", "电子表格", "高级"]
        },
        {
          name: "正则表达式查询",
          syntax: "WHERE REGEXP_LIKE(列, '模式', '匹配选项')",
          desc: "支持 POSIX 正则。匹配选项：i 不区分大小写、c 区分大小写、n 允许 . 匹配换行、m 多行模式。",
          example: "-- 邮箱校验\nSELECT * FROM users \n WHERE REGEXP_LIKE(email, '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');\n-- 手机号(11 位 1 开头)\nSELECT * FROM users WHERE REGEXP_LIKE(phone, '^1[3-9][0-9]{9}$');\n-- 提取所有数字\nSELECT REGEXP_REPLACE('a1b2c3','[^0-9]','') FROM dual;",
          tips: "Oracle 正则语法为 POSIX，部分元字符与 PCRE 不同；提取用 REGEXP_SUBSTR，替换用 REGEXP_REPLACE。",
          tags: ["正则", "REGEXP"]
        }
      ]
    },
    {
      id: "plsql",
      title: "PL/SQL 程序设计",
      icon: "fa-code",
      desc: "块结构、变量、控制流、游标、异常、过程/函数/触发器/包、动态 SQL。",
      items: [
        {
          name: "PL/SQL 块结构",
          syntax: "[DECLARE 声明区] BEGIN 执行区 [EXCEPTION 异常区] END;",
          desc: "PL/SQL 基本结构。DECLARE 声明变量；BEGIN 必须有，写可执行语句；EXCEPTION 处理异常；END 结束。每条语句以分号结尾。",
          example: "DECLARE\n  v_sal NUMBER := 3000;\n  v_name emp.ename%TYPE := 'SMITH';\nBEGIN\n  SELECT sal INTO v_sal FROM emp WHERE ename = v_name;\n  DBMS_OUTPUT.PUT_LINE(v_name || ' 薪资: ' || v_sal);\nEXCEPTION\n  WHEN NO_DATA_FOUND THEN\n    DBMS_OUTPUT.PUT_LINE('未找到员工');\n  WHEN OTHERS THEN\n    DBMS_OUTPUT.PUT_LINE('错误: ' || SQLERRM);\nEND;\n/",
          tips: "需 SET SERVEROUTPUT ON 才能看到 PUT_LINE 输出；SQLERRM 返回错误信息，SQLCODE 返回错误码；END 后加分号和 / 执行。",
          tags: ["PL/SQL", "块", "基础"]
        },
        {
          name: "变量与类型",
          syntax: "变量名 类型 [:= 默认值 | DEFAULT 默认值];  / %TYPE / %ROWTYPE",
          desc: "%TYPE 引用列类型；%ROWTYPE 引用整行类型(记录)；常量用 CONSTANT；NOT NULL 强制初始化。",
          example: "DECLARE\n  v_empno NUMBER(6) NOT NULL := 1001;\n  v_ename emp.ename%TYPE;          -- 引用列类型\n  v_row   emp%ROWTYPE;             -- 引用整行\n  c_PI    CONSTANT NUMBER := 3.14; -- 常量\n  v_today DATE DEFAULT SYSDATE;\nBEGIN\n  SELECT * INTO v_row FROM emp WHERE empno = v_empno;\n  DBMS_OUTPUT.PUT_LINE(v_row.ename);\nEND;",
          tips: "用 %TYPE/%ROWTYPE 跟随表结构变化，避免硬编码；SELECT INTO 必须返回且仅返回一行，否则抛 NO_DATA_FOUND 或 TOO_MANY_ROWS。",
          tags: ["PL/SQL", "变量", "%TYPE"]
        },
        {
          name: "控制结构 IF / CASE",
          syntax: "IF 条件 THEN ... [ELSIF 条件 THEN ...] [ELSE ...] END IF;\nCASE WHEN 条件 THEN ... [ELSE ...] END CASE;",
          desc: "条件分支。IF 是基础分支；CASE 表达式与 CASE 语句(带 END CASE)不同；LOOP/WHILE/FOR 用于循环。",
          example: "IF v_sal > 3000 THEN\n  DBMS_OUTPUT.PUT_LINE('高薪');\nELSIF v_sal > 1500 THEN\n  DBMS_OUTPUT.PUT_LINE('中薪');\nELSE\n  DBMS_OUTPUT.PUT_LINE('低薪');\nEND IF;\n-- CASE 语句\nCASE \n  WHEN v_sal > 3000 THEN v_level := '高';\n  WHEN v_sal > 1500 THEN v_level := '中';\n  ELSE v_level := '低';\nEND CASE;",
          tips: "IF 是 ELSIF(无 E)；CASE 语句必须覆盖所有可能或加 ELSE，否则抛 CASE_NOT_FOUND 异常。",
          tags: ["PL/SQL", "IF", "CASE", "控制流"]
        },
        {
          name: "循环 LOOP / WHILE / FOR",
          syntax: "LOOP ... EXIT WHEN 条件; END LOOP;\nWHILE 条件 LOOP ... END LOOP;\nFOR 变量 IN [REVERSE] 起始..结束 LOOP ... END LOOP;",
          desc: "LOOP 无限循环配 EXIT；WHILE 条件循环；FOR 数值循环。CONTINUE 跳过本次(11g+)。",
          example: "-- 基本循环\nDECLARE i NUMBER := 0; BEGIN\n  LOOP\n    i := i + 1; EXIT WHEN i > 5;\n    DBMS_OUTPUT.PUT_LINE(i);\n  END LOOP;\nEND;\n-- FOR 循环(含 1 到 5)\nBEGIN\n  FOR i IN 1..5 LOOP DBMS_OUTPUT.PUT_LINE(i); END LOOP;\n  FOR i IN REVERSE 1..5 LOOP DBMS_OUTPUT.PUT_LINE(i); END LOOP;\nEND;\n-- WHILE\nDECLARE i NUMBER := 1; BEGIN\n  WHILE i <= 5 LOOP i := i+1; END LOOP;\nEND;",
          tips: "FOR 变量无需声明；EXIT 立即退出循环，CONTINUE 跳到下次循环；游标 FOR 循环自动打开关闭游标。",
          tags: ["PL/SQL", "循环", "LOOP", "FOR"]
        },
        {
          name: "游标 Cursor",
          syntax: "DECLARE CURSOR 游标名 [(参数)] IS SELECT ...;  / 隐式游标 SQL%FOUND, SQL%ROWCOUNT",
          desc: "游标是处理多行查询结果的机制。显式游标需 OPEN/FETCH/CLOSE；游标 FOR 循环自动管理；隐式游标 SQL% 反映最近一条 DML 状态。",
          example: "-- 显式游标\nDECLARE\n  CURSOR c_emp IS SELECT empno, ename FROM emp WHERE deptno=10;\n  v_row c_emp%ROWTYPE;\nBEGIN\n  OPEN c_emp;\n  LOOP\n    FETCH c_emp INTO v_row;\n    EXIT WHEN c_emp%NOTFOUND;\n    DBMS_OUTPUT.PUT_LINE(v_row.ename);\n  END LOOP;\n  CLOSE c_emp;\nEND;\n-- 游标 FOR 循环(最简洁)\nBEGIN\n  FOR r IN (SELECT empno, ename FROM emp WHERE deptno=10) LOOP\n    DBMS_OUTPUT.PUT_LINE(r.ename);\n  END LOOP;\nEND;\n-- REF 游标(动态)\nDECLARE TYPE t_cur IS REF CURSOR; c t_cur; v_ename VARCHAR2(30);\nBEGIN OPEN c FOR 'SELECT ename FROM emp WHERE deptno=:1' USING 10; LOOP FETCH c INTO v_ename; EXIT WHEN c%NOTFOUND; END LOOP; CLOSE c; END;",
          tips: "游标属性：%ISOPEN/%FOUND/%NOTFOUND/%ROWCOUNT；REF CURSOR 是动态游标可运行时绑定 SQL；SYS_REFCURSOR 是系统预定义 REF 游标类型。",
          tags: ["PL/SQL", "游标", "Cursor", "REF"]
        },
        {
          name: "异常处理 EXCEPTION",
          syntax: "EXCEPTION WHEN 异常名 [OR 异常名] THEN ... [WHEN OTHERS THEN ...]",
          desc: "捕获并处理运行时错误。预定义异常(NO_DATA_FOUND、TOO_MANY_ROWS、ZERO_DIVIDE 等)；自定义异常用 RAISE 抛出；RAISE_APPLICATION_ERROR 返回用户错误。",
          example: "DECLARE\n  e_low_sal EXCEPTION;            -- 自定义异常\n  v_sal NUMBER;\nBEGIN\n  SELECT sal INTO v_sal FROM emp WHERE empno=7369;\n  IF v_sal < 1000 THEN RAISE e_low_sal; END IF;\nEXCEPTION\n  WHEN NO_DATA_FOUND THEN DBMS_OUTPUT.PUT_LINE('无数据');\n  WHEN TOO_MANY_ROWS THEN DBMS_OUTPUT.PUT_LINE('多行');\n  WHEN e_low_sal THEN DBMS_OUTPUT.PUT_LINE('薪资过低');\n  WHEN OTHERS THEN\n    DBMS_OUTPUT.PUT_LINE('错误码:'||SQLCODE||' 信息:'||SQLERRM);\n    RAISE;  -- 重新抛出\nEND;\n-- 用户自定义错误\nRAISE_APPLICATION_ERROR(-20001, '自定义错误信息');",
          tips: "OTHERS 必须放最后；RAISE 单独使用重新抛出当前异常；错误码 -20000~-20999 供用户使用；关联错误用 EXCEPTION_INIT 把错误码绑到异常名。",
          tags: ["PL/SQL", "异常", "EXCEPTION", "RAISE"]
        },
        {
          name: "存储过程 PROCEDURE",
          syntax: "CREATE [OR REPLACE] PROCEDURE 过程名 [(参数 [IN|OUT|IN OUT] 类型)] IS|AS [声明] BEGIN ... END;",
          desc: "命名 PL/SQL 块，可被反复调用。参数模式：IN 输入(默认)、OUT 输出、IN OUT 输入输出。无返回值(用 OUT 参数模拟)。",
          example: "CREATE OR REPLACE PROCEDURE upd_sal(\n  p_empno IN NUMBER,\n  p_raise IN NUMBER DEFAULT 0.1,\n  p_newsal OUT NUMBER\n) IS\nBEGIN\n  UPDATE emp SET sal = sal * (1 + p_raise) WHERE empno = p_empno;\n  SELECT sal INTO p_newsal FROM emp WHERE empno = p_empno;\n  COMMIT;\nEXCEPTION\n  WHEN NO_DATA_FOUND THEN \n    RAISE_APPLICATION_ERROR(-20001, '员工不存在');\nEND;\n/\n-- 调用\nDECLARE v_new NUMBER; BEGIN\n  upd_sal(p_empno=>7369, p_newsal=>v_new);\n  DBMS_OUTPUT.PUT_LINE('新薪资:'||v_new);\nEND;",
          tips: "调用用 CALL 或 PL/SQL 块；参数可用 => 命名传参；过程内 COMMIT/ROLLBACK 需谨慎(影响调用方事务)。",
          tags: ["PL/SQL", "存储过程", "PROCEDURE"]
        },
        {
          name: "函数 FUNCTION",
          syntax: "CREATE [OR REPLACE] FUNCTION 函数名 [(参数 类型)] RETURN 类型 IS|AS [声明] BEGIN ... RETURN 值; END;",
          desc: "与过程类似但必须有 RETURN 返回值。可在 SQL 中直接调用(不像过程)。函数内不能执行 DDL/事务控制(在 SQL 中调用时)。",
          example: "CREATE OR REPLACE FUNCTION get_annual_sal(p_empno NUMBER) \nRETURN NUMBER \nIS\n  v_sal NUMBER;\nBEGIN\n  SELECT sal*12 + NVL(comm,0) INTO v_sal FROM emp WHERE empno=p_empno;\n  RETURN v_sal;\nEXCEPTION\n  WHEN NO_DATA_FOUND THEN RETURN NULL;\nEND;\n/\n-- 在 SQL 中调用\nSELECT ename, get_annual_sal(empno) AS 年薪 FROM emp;",
          tips: "函数必须 RETURN；纯函数(不读表)叫 PIPELINED 可用于 TABLE() 当表用；函数内不能 COMMIT(在 SQL 中调用时)。",
          tags: ["PL/SQL", "函数", "FUNCTION"]
        },
        {
          name: "触发器 TRIGGER",
          syntax: "CREATE [OR REPLACE] TRIGGER 触发器名 {BEFORE|AFTER|INSTEAD OF} {INSERT|UPDATE|DELETE} ON 表 [FOR EACH ROW] [WHEN (条件)] DECLARE ... BEGIN ... END;",
          desc: "在事件发生时自动执行。语句级(默认)或行级(FOR EACH ROW)；BEFORE/AFTER DML；INSTEAD OF 用于复杂视图；:NEW/:OLD 引用新旧值。",
          example: "CREATE OR REPLACE TRIGGER trg_audit_sal\nBEFORE UPDATE OF sal ON emp\nFOR EACH ROW\nWHEN (NEW.sal <> OLD.sal)\nBEGIN\n  INSERT INTO sal_audit(empno, old_sal, new_sal, chg_time, user)\n  VALUES (:OLD.empno, :OLD.sal, :NEW.sal, SYSDATE, USER);\n  -- 校验：薪资不能降超过 50%\n  IF :NEW.sal < :OLD.sal * 0.5 THEN\n    RAISE_APPLICATION_ERROR(-20002, '薪资降幅过大');\n  END IF;\nEND;\n/\n-- 启用/禁用/删除\nALTER TRIGGER trg_audit_sal DISABLE;\nALTER TRIGGER trg_audit_sal ENABLE;\nDROP TRIGGER trg_audit_sal;",
          tips: ":NEW 在 INSERT/UPDATE 可改；:OLD 只读；触发器递归会引发 ORA-00036；禁用用 ALTER TRIGGER DISABLE。",
          tags: ["PL/SQL", "触发器", "TRIGGER", "审计"]
        },
        {
          name: "包 PACKAGE",
          syntax: "CREATE [OR REPLACE] PACKAGE 包名 IS|AS ... END;  -- 规范\nCREATE [OR REPLACE] PACKAGE BODY 包名 IS|AS ... END; -- 主体",
          desc: "包=规范(声明接口)+主体(实现)。封装相关过程/函数/类型/变量/游标，私有实现隐藏，首次调用时加载到内存提升性能。",
          example: "-- 规范\nCREATE OR REPLACE PACKAGE pkg_emp IS\n  -- 公有常量与类型\n  c_raise CONSTANT NUMBER := 0.1;\n  TYPE emp_cur IS REF CURSOR;\n  -- 公有过程/函数声明\n  PROCEDURE raise_sal(p_empno NUMBER);\n  FUNCTION  get_sal(p_empno NUMBER) RETURN NUMBER;\nEND pkg_emp;\n/\n-- 主体\nCREATE OR REPLACE PACKAGE BODY pkg_emp IS\n  -- 私有过程(不在规范中)\n  PROCEDURE log_change(p_empno NUMBER, p_old NUMBER, p_new NUMBER) IS\n  BEGIN INSERT INTO sal_log VALUES(p_empno, p_old, p_new, SYSDATE); END;\n  PROCEDURE raise_sal(p_empno NUMBER) IS\n    v_old NUMBER; BEGIN\n      SELECT sal INTO v_old FROM emp WHERE empno=p_empno;\n      UPDATE emp SET sal = sal*(1+c_raise) WHERE empno=p_empno;\n      log_change(p_empno, v_old, v_old*(1+c_raise));\n    END;\n  FUNCTION get_sal(p_empno NUMBER) RETURN NUMBER IS v NUMBER; BEGIN\n    SELECT sal INTO v FROM emp WHERE empno=p_empno; RETURN v;\n  END;\nEND pkg_emp;\n/\n-- 调用\nEXEC pkg_emp.raise_sal(7369);",
          tips: "规范与主体名必须一致；主体中过程/函数签名必须与规范完全一致；包级变量在会话内持久；用 DBMS_OUTPUT/UTL_FILE 等系统包。",
          tags: ["PL/SQL", "包", "PACKAGE", "封装"]
        },
        {
          name: "动态 SQL",
          syntax: "-- EXECUTE IMMEDIATE：单条\nEXECUTE IMMEDIATE sql_str [INTO 变量] [USING 绑定变量];\n-- DBMS_SQL：复杂(游标、批量)",
          desc: "运行时拼接并执行 SQL。EXECUTE IMMEDIATE 用于简单动态 SQL；DBMS_SQL 用于复杂场景(动态列数、结果集未知)。",
          example: "DECLARE\n  v_sql VARCHAR2(200);\n  v_cnt NUMBER;\nBEGIN\n  -- 带绑定变量(防注入)\n  v_sql := 'SELECT COUNT(*) FROM emp WHERE deptno = :d';\n  EXECUTE IMMEDIATE v_sql INTO v_cnt USING 10;\n  DBMS_OUTPUT.PUT_LINE('人数:'||v_cnt);\n  \n  -- DDL 也可动态执行\n  EXECUTE IMMEDIATE 'CREATE TABLE t_tmp(id NUMBER)';\n  \n  -- 批量绑定(BULK COLLECT)\n  EXECUTE IMMEDIATE 'SELECT ename FROM emp' \n    BULK COLLECT INTO v_names;  -- v_names 为集合类型\nEND;",
          tips: "动态 SQL 用绑定变量(:1, :d)防止 SQL 注入并提升性能；BULK COLLECT + FORALL 批量操作大幅减少上下文切换。",
          tags: ["PL/SQL", "动态SQL", "EXECUTE IMMEDIATE"]
        },
        {
          name: "批量绑定 BULK COLLECT / FORALL",
          syntax: "SELECT ... BULK COLLECT INTO 集合;  / FORALL i IN 集合.FIRST..集合.LAST INSERT/UPDATE/DELETE ...",
          desc: "批量操作减少 SQL/PL-SQL 引擎切换开销，是大数据量处理的性能关键。BULK COLLECT 批量取，FORALL 批量改。",
          example: "DECLARE\n  TYPE t_id   IS TABLE OF emp.empno%TYPE;\n  TYPE t_name IS TABLE OF emp.ename%TYPE;\n  v_ids t_id; v_names t_name;\nBEGIN\n  -- 批量取\n  SELECT empno, ename BULK COLLECT INTO v_ids, v_names FROM emp;\n  \n  -- 批量插(FORALL)\n  FORALL i IN 1..v_ids.COUNT SAVE EXCEPTIONS\n    INSERT INTO emp_bak(empno, ename) VALUES (v_ids(i), v_names(i));\nEXCEPTION\n  WHEN OTHERS THEN\n    -- 收集错误\n    FOR i IN 1..SQL%BULK_EXCEPTIONS.COUNT LOOP\n      DBMS_OUTPUT.PUT_LINE('错误行:'||SQL%BULK_EXCEPTIONS(i).ERROR_INDEX);\n    END LOOP;\nEND;",
          tips: "BULK COLLECT 一次性取所有可能撑爆内存，用 LIMIT 子句分批：FETCH c BULK COLLECT INTO v LIMIT 100；FORALL SAVE EXCEPTIONS 允许部分失败继续。",
          tags: ["PL/SQL", "批量", "BULK", "性能"]
        }
      ]
    },
    {
      id: "adv-features",
      title: "高级特性与运维",
      icon: "fa-cogs",
      desc: "分区表、物化视图、闪回、定时任务、性能优化等企业级能力。",
      items: [
        {
          name: "分区表 Partitioning",
          syntax: "CREATE TABLE 表名(...) PARTITION BY RANGE(列)(PARTITION p1 VALUES LESS THAN(v), ...);",
          desc: "把大表物理分割为多个分区，提升查询与维护性能。常见：范围分区、列表分区、哈希分区、组合分区。",
          example: "-- 范围分区(按日期)\nCREATE TABLE sales (\n  id NUMBER, sale_date DATE, amount NUMBER\n) PARTITION BY RANGE(sale_date)(\n  PARTITION p_2023 VALUES LESS THAN(TO_DATE('2024-01-01','YYYY-MM-DD')),\n  PARTITION p_2024 VALUES LESS THAN(TO_DATE('2025-01-01','YYYY-MM-DD')),\n  PARTITION p_max VALUES LESS THAN(MAXVALUE)\n);\n-- 列表分区(按地区)\nPARTITION BY LIST(region)(\n  PARTITION p_east VALUES('BJ','SH'),\n  PARTITION p_west VALUES('XJ','XZ')\n);\n-- 间隔分区(自动建分区,11g+)\nPARTITION BY RANGE(sale_date) INTERVAL(NUMTOYMINTERVAL(1,'MONTH'))(\n  PARTITION p_init VALUES LESS THAN(TO_DATE('2024-01-01','YYYY-MM-DD'))\n);\n-- 查询分区数据\nSELECT * FROM sales PARTITION(p_2024);\n-- 交换/移动/拆分分区\nALTER TABLE sales EXCHANGE PARTITION p_2024 WITH TABLE sales_tmp;\nALTER TABLE sales SPLIT PARTITION p_max AT(TO_DATE('2026-01-01','YYYY-MM-DD')) INTO (PARTITION p_2025, PARTITION p_max);",
          tips: "分区裁剪：WHERE 含分区键时只扫相关分区；分区索引分本地(LOCAL)与全局(GLOBAL)；超大历史表强烈推荐分区。",
          tags: ["分区", "Partition", "大表"]
        },
        {
          name: "物化视图 MATERIALIZED VIEW",
          syntax: "CREATE MATERIALIZED VIEW 物化视图名 [BUILD IMMEDIATE|DEFERRED] [REFRESH COMPLETE|FAST|FORCE ON COMMIT|ON DEMAND] AS SELECT ...;",
          desc: "实际存储查询结果，常用于汇总报表加速。FAST 刷新需物化视图日志；ON COMMIT 提交即刷新。",
          example: "-- 物化视图日志(支持 FAST 刷新)\nCREATE MATERIALIZED VIEW LOG ON emp WITH ROWID, (sal, deptno) INCLUDING NEW VALUES;\n-- 物化视图\nCREATE MATERIALIZED VIEW mv_dept_sal\n  BUILD IMMEDIATE\n  REFRESH FAST ON COMMIT\n  AS SELECT deptno, SUM(sal) sum_sal, COUNT(*) cnt FROM emp GROUP BY deptno;\n-- 手动刷新\nEXEC DBMS_MVIEW.REFRESH('mv_dept_sal','C');  -- C 完全刷新\n-- 删除\nDROP MATERIALIZED VIEW mv_dept_sal;",
          tips: "查询重写 QUERY REWRITE 让普通查询自动用物化视图；ON DEMAND 按需刷新；汇总表首选物化视图而非普通表。",
          tags: ["物化视图", "汇总", "性能"]
        },
        {
          name: "闪回 FLASHBACK",
          syntax: "FLASHBACK TABLE 表名 TO TIMESTAMP|SCN ...;  / SELECT ... FROM 表名 AS OF TIMESTAMP ...;",
          desc: "快速恢复误删/误改数据。闪回查询(AS OF)、闪回表、闪回删除(TO BEFORE DROP)、闪回数据库。",
          example: "-- 闪回查询：5 分钟前的数据\nSELECT * FROM emp AS OF TIMESTAMP(SYSTIMESTAMP - INTERVAL '5' MINUTE) WHERE empno=7369;\n-- 闪回表到指定时间\nALTER TABLE emp ENABLE ROW MOVEMENT;  -- 必须先启用\nFLASHBACK TABLE emp TO TIMESTAMP(SYSTIMESTAMP - INTERVAL '10' MINUTE);\n-- 闪回删除(回收站)\nFLASHBACK TABLE emp_bak TO BEFORE DROP RENAME TO emp_restored;\n-- 查看回收站\nSELECT * FROM RECYCLEBIN;\n-- 闪回数据库(需 ARCHIVELOG 模式 + 闪回日志)\nSHUTDOWN IMMEDIATE; STARTUP MOUNT EXCLUSIVE;\nFLASHBACK DATABASE TO TIMESTAMP(SYSTIMESTAMP - INTERVAL '1' HOUR);\nALTER DATABASE OPEN RESETLOGS;",
          tips: "闪回依赖 UNDO 段，受 UNDO_RETENTION 影响；闪回删除依赖回收站(10g+)；闪回数据库需开启 FLASHBACK ON。",
          tags: ["闪回", "FLASHBACK", "恢复"]
        },
        {
          name: "定时任务 DBMS_SCHEDULER",
          syntax: "DBMS_SCHEDULER.CREATE_JOB(job_name, job_type, job_action, start_date, repeat_interval, enabled);",
          desc: "企业级任务调度(替代旧版 DBMS_JOB)。支持 PL/SQL 块、存储过程、外部程序、脚本。",
          example: "BEGIN\n  DBMS_SCHEDULER.CREATE_JOB(\n    job_name        => 'JOB_NIGHTLY_BACKUP',\n    job_type        => 'STORED_PROCEDURE',\n    job_action      => 'PKG_BACKUP.DO_BACKUP',\n    start_date      => SYSTIMESTAMP,\n    repeat_interval => 'FREQ=DAILY; BYHOUR=2; BYMINUTE=0',  -- 每天凌晨 2 点\n    enabled         => TRUE,\n    comments        => '每日备份'\n  );\nEND;\n/\n-- 查看任务\nSELECT job_name, state, last_run_duration FROM user_scheduler_jobs;\n-- 手动运行\nEXEC DBMS_SCHEDULER.RUN_JOB('JOB_NIGHTLY_BACKUP');\n-- 禁用/启用/删除\nEXEC DBMS_SCHEDULER.DISABLE('JOB_NIGHTLY_BACKUP');\nEXEC DBMS_SCHEDULER.DROP_JOB('JOB_NIGHTLY_BACKUP');",
          tips: "repeat_interval 用日历语法：FREQ=HOURLY/DAILY/WEEKLY/MONTHLY/YEARLY；BYHOUR/BYMINUTE/BYDAY 指定时刻；旧版 DBMS_JOB.SUBMIT 仍可用。",
          tags: ["调度", "JOB", "DBMS_SCHEDULER"]
        },
        {
          name: "执行计划与优化",
          syntax: "EXPLAIN PLAN FOR <SQL>;  / SET AUTOTRACE ON;  / SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY());",
          desc: "查看 SQL 执行计划与统计。重点看：是否走索引、表连接方式、代价 COST、行数估算。",
          example: "-- 生成执行计划\nEXPLAIN PLAN FOR\n  SELECT * FROM emp WHERE deptno = 10;\n-- 查看\nSELECT * FROM TABLE(DBMS_XPLAN.DISPLAY());\n-- SQL*Plus 自动跟踪\nSET AUTOTRACE ON EXPLAIN;\nSET AUTOTRACE ON STATISTICS;\n-- 真实执行统计\nSELECT sql_id, child_number, executions, buffer_gets, elapsed_time\n  FROM v$sql WHERE sql_text LIKE '%emp%';\n-- 收集统计信息(影响 CBO 代价估算)\nEXEC DBMS_STATS.GATHER_TABLE_STATS('SCOTT','EMP');\nEXEC DBMS_STATS.GATHER_SCHEMA_STATS('SCOTT');\n-- 加 Hint 引导优化器\nSELECT /*+ INDEX(emp idx_emp_dept) */ * FROM emp WHERE deptno=10;",
          tips: "CBO(基于代价)依赖统计信息，统计陈旧导致执行计划差，需定期 GATHER_STATS；Hint 写在 /*+ */ 中紧跟 SELECT 后第一个关键字。",
          tags: ["优化", "执行计划", "EXPLAIN", "CBO"]
        },
        {
          name: "常用数据字典视图",
          syntax: "user_* (自己) / all_* (可访问) / dba_* (全库, 需 DBA) / v$ (动态性能)",
          desc: "查询元数据与运行状态。user_ 看自己对象；all_ 看可访问对象；dba_ 看全库对象；v$ 看实例动态信息。",
          example: "-- 查看表\nSELECT table_name FROM user_tables;\nSELECT owner, table_name FROM all_tables;\nSELECT owner, table_name, num_rows FROM dba_tables;\n-- 查看列\nSELECT column_name, data_type FROM user_tab_columns WHERE table_name='EMP';\n-- 查看索引\nSELECT index_name, column_name FROM user_ind_columns WHERE table_name='EMP';\n-- 查看约束\nSELECT constraint_name, constraint_type FROM user_constraints WHERE table_name='EMP';\n-- 查看会话\nSELECT sid, serial#, username, status FROM v$session;\n-- 查看锁\nSELECT sid, type, lmode, request FROM v$lock WHERE block=1;\n-- 查看表空间使用\nSELECT tablespace_name, ROUND(SUM(bytes)/1024/1024) mb FROM dba_data_files GROUP BY tablespace_name;",
          tips: "dba_* 与 v$ 视图需 DBA 角色；v$session/v$sql/v$lock 是排障三大视图；表名/列名在字典中为大写。",
          tags: ["数据字典", "user_", "v$", "运维"]
        }
      ]
    }
  ],

  /* ============================ 函数库部分 ============================ */
  functions: [
    {
      category: "字符函数 Character",
      icon: "fa-font",
      items: [
        { name: "UPPER", syntax: "UPPER(str)", desc: "将字符串转换为大写", example: "SELECT UPPER('hello world') FROM dual;", result: "'HELLO WORLD'", tags: ["字符","大小写"] },
        { name: "LOWER", syntax: "LOWER(str)", desc: "将字符串转换为小写", example: "SELECT LOWER('HELLO WORLD') FROM dual;", result: "'hello world'", tags: ["字符","大小写"] },
        { name: "INITCAP", syntax: "INITCAP(str)", desc: "将每个单词首字母大写，其余小写", example: "SELECT INITCAP('hello world') FROM dual;", result: "'Hello World'", tags: ["字符","大小写"] },
        { name: "LENGTH", syntax: "LENGTH(str)", desc: "返回字符串字符数(LENGTHB 返回字节数)", example: "SELECT LENGTH('Oracle') FROM dual;", result: "6", tags: ["字符","长度"] },
        { name: "LENGTHB", syntax: "LENGTHB(str)", desc: "返回字符串字节数(中文占多个字节)", example: "SELECT LENGTHB('数据库') FROM dual;", result: "6 (AL32UTF8)", tags: ["字符","长度"] },
        { name: "SUBSTR", syntax: "SUBSTR(str, start [, length])", desc: "截取子串。start 为负则从末尾倒数；省略 length 截到末尾", example: "SELECT SUBSTR('Hello Oracle',7,6) FROM dual;", result: "'Oracle'", tags: ["字符","截取"] },
        { name: "INSTR", syntax: "INSTR(str, sub [, start [, occurrence]])", desc: "返回子串在原串中出现的位置，找不到返回 0", example: "SELECT INSTR('Hello Oracle','o',1,2) FROM dual;", result: "8", tags: ["字符","查找"] },
        { name: "CONCAT", syntax: "CONCAT(str1, str2)", desc: "连接两个字符串(只支持两个，多个用 ||)", example: "SELECT CONCAT('Hello ','Oracle') FROM dual;", result: "'Hello Oracle'", tags: ["字符","连接"] },
        { name: "REPLACE", syntax: "REPLACE(str, search [, replace])", desc: "将 str 中的 search 替换为 replace；省略 replace 则删除", example: "SELECT REPLACE('JACK and JUE','J','BL') FROM dual;", result: "'BLACK and BLUE'", tags: ["字符","替换"] },
        { name: "TRANSLATE", syntax: "TRANSLATE(str, from, to)", desc: "按字符逐个替换(非字符串替换)，from 与 to 按位置对应", example: "SELECT TRANSLATE('123abc','abc','XYZ') FROM dual;", result: "'123XYZ'", tags: ["字符","替换"] },
        { name: "LPAD", syntax: "LPAD(str, length [, pad])", desc: "左填充 pad 到指定长度，默认空格", example: "SELECT LPAD('5',4,'0') FROM dual;", result: "'0005'", tags: ["字符","填充"] },
        { name: "RPAD", syntax: "RPAD(str, length [, pad])", desc: "右填充 pad 到指定长度", example: "SELECT RPAD('Hello',10,'*') FROM dual;", result: "'Hello*****'", tags: ["字符","填充"] },
        { name: "TRIM", syntax: "TRIM([LEADING|TRAILING|BOTH] [trim_char] FROM str)", desc: "去除两端(默认)指定字符，默认去空格", example: "SELECT TRIM(BOTH 'x' FROM 'xxHelloxx') FROM dual;", result: "'Hello'", tags: ["字符","裁剪"] },
        { name: "LTRIM", syntax: "LTRIM(str [, trim_char])", desc: "去除左侧指定字符(默认空格)", example: "SELECT LTRIM('   Hello') FROM dual;", result: "'Hello'", tags: ["字符","裁剪"] },
        { name: "RTRIM", syntax: "RTRIM(str [, trim_char])", desc: "去除右侧指定字符(默认空格)", example: "SELECT RTRIM('Hello   ') FROM dual;", result: "'Hello'", tags: ["字符","裁剪"] },
        { name: "CHR", syntax: "CHR(n)", desc: "返回 ASCII 码 n 对应的字符", example: "SELECT CHR(65)||CHR(66)||CHR(67) FROM dual;", result: "'ABC'", tags: ["字符","ASCII"] },
        { name: "ASCII", syntax: "ASCII(str)", desc: "返回字符串首字符的 ASCII 码", example: "SELECT ASCII('A') FROM dual;", result: "65", tags: ["字符","ASCII"] },
        { name: "REGEXP_REPLACE", syntax: "REGEXP_REPLACE(str, pattern [, replace [, pos [, occ [, match]]]])", desc: "正则表达式替换", example: "SELECT REGEXP_REPLACE('a1b2c3','[0-9]','') FROM dual;", result: "'abc'", tags: ["字符","正则"] },
        { name: "REGEXP_SUBSTR", syntax: "REGEXP_SUBSTR(str, pattern [, pos [, occ [, match [, subexpr]]]])", desc: "正则表达式提取子串", example: "SELECT REGEXP_SUBSTR('Tel:138-1234-5678','[0-9-]+$') FROM dual;", result: "'138-1234-5678'", tags: ["字符","正则"] },
        { name: "REGEXP_INSTR", syntax: "REGEXP_INSTR(str, pattern [, pos [, occ [, return_opt [, match [, subexpr]]]]])", desc: "返回正则匹配的起始位置", example: "SELECT REGEXP_INSTR('abc123def','[0-9]+') FROM dual;", result: "4", tags: ["字符","正则"] },
        { name: "REGEXP_LIKE", syntax: "REGEXP_LIKE(str, pattern [, match])", desc: "正则匹配，用于 WHERE 条件", example: "SELECT * FROM emp WHERE REGEXP_LIKE(ename,'^S[a-z]+$');", result: "匹配以 S 开头全小写字母的姓名", tags: ["字符","正则"] },
        { name: "REGEXP_COUNT", syntax: "REGEXP_COUNT(str, pattern [, pos [, match]])", desc: "返回正则匹配次数", example: "SELECT REGEXP_COUNT('a1b2c3','[0-9]') FROM dual;", result: "3", tags: ["字符","正则"] },
        { name: "SOUNDEX", syntax: "SOUNDEX(str)", desc: "返回字符串的语音表示，用于模糊发音匹配", example: "SELECT SOUNDEX('Smith'), SOUNDEX('Smythe') FROM dual;", result: "两者相近", tags: ["字符","语音"] }
      ]
    },
    {
      category: "数值函数 Numeric",
      icon: "fa-calculator",
      items: [
        { name: "ROUND", syntax: "ROUND(n [, d])", desc: "四舍五入到 d 位小数；d 缺省为 0；d 为负则舍入到十/百位", example: "SELECT ROUND(45.926, 2) FROM dual;", result: "45.93", tags: ["数值","舍入"] },
        { name: "TRUNC", syntax: "TRUNC(n [, d])", desc: "截断到 d 位小数(不四舍五入)；d 缺省 0", example: "SELECT TRUNC(45.926, 1) FROM dual;", result: "45.9", tags: ["数值","截断"] },
        { name: "CEIL", syntax: "CEIL(n)", desc: "向上取整(返回大于等于 n 的最小整数)", example: "SELECT CEIL(45.1) FROM dual;", result: "46", tags: ["数值","取整"] },
        { name: "FLOOR", syntax: "FLOOR(n)", desc: "向下取整(返回小于等于 n 的最大整数)", example: "SELECT FLOOR(45.9) FROM dual;", result: "45", tags: ["数值","取整"] },
        { name: "MOD", syntax: "MOD(n, m)", desc: "返回 n 除以 m 的余数；m 为 0 返回 n", example: "SELECT MOD(10, 3) FROM dual;", result: "1", tags: ["数值","取余"] },
        { name: "ABS", syntax: "ABS(n)", desc: "返回绝对值", example: "SELECT ABS(-15) FROM dual;", result: "15", tags: ["数值","绝对值"] },
        { name: "POWER", syntax: "POWER(n, m)", desc: "返回 n 的 m 次幂", example: "SELECT POWER(2, 10) FROM dual;", result: "1024", tags: ["数值","幂"] },
        { name: "SQRT", syntax: "SQRT(n)", desc: "返回平方根(要求 n>=0)", example: "SELECT SQRT(16) FROM dual;", result: "4", tags: ["数值","平方根"] },
        { name: "EXP", syntax: "EXP(n)", desc: "返回 e 的 n 次幂", example: "SELECT EXP(1) FROM dual;", result: "2.71828183", tags: ["数值","指数"] },
        { name: "LN", syntax: "LN(n)", desc: "返回以 e 为底的自然对数", example: "SELECT LN(EXP(1)) FROM dual;", result: "1", tags: ["数值","对数"] },
        { name: "LOG", syntax: "LOG(m, n)", desc: "返回以 m 为底 n 的对数", example: "SELECT LOG(10, 100) FROM dual;", result: "2", tags: ["数值","对数"] },
        { name: "SIGN", syntax: "SIGN(n)", desc: "返回符号：n>0 返回 1；n=0 返回 0；n<0 返回 -1", example: "SELECT SIGN(-5), SIGN(0), SIGN(5) FROM dual;", result: "-1, 0, 1", tags: ["数值","符号"] },
        { name: "SIN / COS / TAN", syntax: "SIN(n) / COS(n) / TAN(n)", desc: "三角函数(弧度制)", example: "SELECT ROUND(SIN(0),4), ROUND(COS(0),4) FROM dual;", result: "0, 1", tags: ["数值","三角"] },
        { name: "ASIN / ACOS / ATAN", syntax: "ASIN(n) / ACOS(n) / ATAN(n)", desc: "反三角函数，返回弧度", example: "SELECT ROUND(ASIN(1),4) FROM dual;", result: "1.5708 (π/2)", tags: ["数值","三角"] },
        { name: "ATAN2", syntax: "ATAN2(y, x)", desc: "返回点 (x,y) 的方位角弧度(atan(y/x) 但能处理 x=0)", example: "SELECT ROUND(ATAN2(1,1),4) FROM dual;", result: "0.7854 (π/4)", tags: ["数值","三角"] },
        { name: "BITAND", syntax: "BITAND(n, m)", desc: "按位与运算，返回整数", example: "SELECT BITAND(6, 3) FROM dual;", result: "2", tags: ["数值","位运算"] },
        { name: "NANVL", syntax: "NANVL(n, replace)", desc: "若 n 为 NaN(BINARY_FLOAT/DOUBLE) 返回 replace，否则返回 n", example: "SELECT NANVL(to_binary_float('NaN'), 0) FROM dual;", result: "0", tags: ["数值","NaN"] },
        { name: "REMAINDER", syntax: "REMAINDER(n, m)", desc: "返回 n/m 的余数(用 ROUND 而非 TRUNC，与 MOD 不同)", example: "SELECT REMAINDER(10, 3), MOD(10,3) FROM dual;", result: "1, 1", tags: ["数值","取余"] }
      ]
    },
    {
      category: "日期函数 Date",
      icon: "fa-calendar-alt",
      items: [
        { name: "SYSDATE", syntax: "SYSDATE", desc: "返回当前日期时间(数据库服务器时区，秒级精度)", example: "SELECT SYSDATE FROM dual;", result: "当前时间", tags: ["日期","系统"] },
        { name: "SYSTIMESTAMP", syntax: "SYSTIMESTAMP", desc: "返回带时区的当前时间戳(微秒精度)", example: "SELECT SYSTIMESTAMP FROM dual;", result: "时间戳", tags: ["日期","系统"] },
        { name: "CURRENT_DATE", syntax: "CURRENT_DATE", desc: "返回会话时区的当前日期", example: "SELECT CURRENT_DATE FROM dual;", result: "会话当前日期", tags: ["日期","会话"] },
        { name: "CURRENT_TIMESTAMP", syntax: "CURRENT_TIMESTAMP", desc: "返回会话时区的当前时间戳(带时区)", example: "SELECT CURRENT_TIMESTAMP FROM dual;", result: "时间戳", tags: ["日期","会话"] },
        { name: "ADD_MONTHS", syntax: "ADD_MONTHS(d, n)", desc: "日期 d 加 n 个月(可为负)", example: "SELECT ADD_MONTHS(SYSDATE, 6) FROM dual;", result: "6 个月后", tags: ["日期","加减"] },
        { name: "MONTHS_BETWEEN", syntax: "MONTHS_BETWEEN(d1, d2)", desc: "返回 d1 与 d2 之间月数(可为小数)", example: "SELECT MONTHS_BETWEEN(DATE'2024-12-31', DATE'2024-01-01') FROM dual;", result: "11.9677419", tags: ["日期","差值"] },
        { name: "LAST_DAY", syntax: "LAST_DAY(d)", desc: "返回 d 所在月最后一天", example: "SELECT LAST_DAY(SYSDATE) FROM dual;", result: "本月末日", tags: ["日期","月末"] },
        { name: "NEXT_DAY", syntax: "NEXT_DAY(d, 星期)", desc: "返回 d 之后第一个指定星期几的日期(星期可用字符串或数字)", example: "SELECT NEXT_DAY(SYSDATE, 'FRIDAY') FROM dual;", result: "下个周五", tags: ["日期","周"] },
        { name: "EXTRACT", syntax: "EXTRACT(字段 FROM 日期)", desc: "提取年/月/日/时/分/秒等字段", example: "SELECT EXTRACT(YEAR FROM SYSDATE), EXTRACT(MONTH FROM SYSDATE) FROM dual;", result: "年, 月", tags: ["日期","提取"] },
        { name: "TRUNC (日期)", syntax: "TRUNC(d [, fmt])", desc: "按 fmt 截断日期(默认截到当天 0 点)；fmt: 'YYYY'截到年初、'MM'截到月初、'DD'截到天、'HH'/'MI'截到时/分", example: "SELECT TRUNC(SYSDATE,'MM') 本月初, TRUNC(SYSDATE,'YYYY') 年初 FROM dual;", result: "月初/年初", tags: ["日期","截断"] },
        { name: "ROUND (日期)", syntax: "ROUND(d [, fmt])", desc: "按 fmt 四舍五入日期(默认到天，过中午则进一天)", example: "SELECT ROUND(SYSDATE,'YYYY') FROM dual;", result: "年初或年末", tags: ["日期","舍入"] },
        { name: "TO_TIMESTAMP", syntax: "TO_TIMESTAMP(s [, fmt])", desc: "字符串转时间戳类型", example: "SELECT TO_TIMESTAMP('2024-01-01 12:30:00','YYYY-MM-DD HH24:MI:SS') FROM dual;", result: "TIMESTAMP", tags: ["日期","转换"] },
        { name: "NUMTODSINTERVAL", syntax: "NUMTODSINTERVAL(n, unit)", desc: "把数字转为 INTERVAL DAY TO SECOND，unit: DAY/HOUR/MINUTE/SECOND", example: "SELECT SYSDATE + NUMTODSINTERVAL(2,'HOUR') FROM dual;", result: "2 小时后", tags: ["日期","间隔"] },
        { name: "NUMTOYMINTERVAL", syntax: "NUMTOYMINTERVAL(n, unit)", desc: "把数字转为 INTERVAL YEAR TO MONTH，unit: YEAR/MONTH", example: "SELECT SYSDATE + NUMTOYMINTERVAL(1,'YEAR') FROM dual;", result: "1 年后", tags: ["日期","间隔"] },
        { name: "EXTRACT (间隔)", syntax: "EXTRACT(字段 FROM INTERVAL表达式)", desc: "从 INTERVAL 提取年/月/日/时/分", example: "SELECT EXTRACT(DAY FROM NUMTODSINTERVAL(50,'HOUR')) FROM dual;", result: "2", tags: ["日期","间隔"] },
        { name: "SESSIONTIMEZONE", syntax: "SESSIONTIMEZONE", desc: "返回当前会话时区", example: "SELECT SESSIONTIMEZONE FROM dual;", result: "+08:00", tags: ["日期","时区"] },
        { name: "DBTIMEZONE", syntax: "DBTIMEZONE", desc: "返回数据库时区", example: "SELECT DBTIMEZONE FROM dual;", result: "+00:00", tags: ["日期","时区"] },
        { name: "NEW_TIME", syntax: "NEW_TIME(d, tz1, tz2)", desc: "把日期 d 从 tz1 时区转换为 tz2 时区", example: "SELECT NEW_TIME(SYSDATE, 'EST', 'PST') FROM dual;", result: "时区转换", tags: ["日期","时区"] },
        { name: "FROM_TZ", syntax: "FROM_TZ(ts, tz)", desc: "把 TIMESTAMP 与时区字符串合成 TIMESTAMP WITH TIME ZONE", example: "SELECT FROM_TZ(TIMESTAMP '2024-01-01 00:00:00', '+08:00') FROM dual;", result: "带时区时间戳", tags: ["日期","时区"] },
        { name: "SYS_EXTRACT_UTC", syntax: "SYS_EXTRACT_UTC(ts)", desc: "把带时区时间戳转换为 UTC 时间", example: "SELECT SYS_EXTRACT_UTC(SYSTIMESTAMP) FROM dual;", result: "UTC 时间", tags: ["日期","时区"] }
      ]
    },
    {
      category: "转换函数 Conversion",
      icon: "fa-exchange-alt",
      items: [
        { name: "TO_CHAR (日期)", syntax: "TO_CHAR(d [, fmt [, 'nlsparams']])", desc: "日期转字符串，用格式化模型 YYYY/MM/DD/HH24/MI/SS/DAY 等", example: "SELECT TO_CHAR(SYSDATE,'YYYY\"年\"MM\"月\"DD\"日\" HH24:MI:SS DAY') FROM dual;", result: "2024年01月01日 12:30:00 MONDAY", tags: ["转换","格式化"] },
        { name: "TO_CHAR (数字)", syntax: "TO_CHAR(n [, fmt [, 'nlsparams']])", desc: "数字转字符串，格式 9/0/.$/L/, 等", example: "SELECT TO_CHAR(1234567.89,'L999,999,990.00') FROM dual;", result: "¥1,234,567.89", tags: ["转换","格式化"] },
        { name: "TO_DATE", syntax: "TO_DATE(s [, fmt [, 'nlsparams']])", desc: "字符串转 DATE 类型", example: "SELECT TO_DATE('2024-12-31 23:59:59','YYYY-MM-DD HH24:MI:SS') FROM dual;", result: "DATE", tags: ["转换","日期"] },
        { name: "TO_NUMBER", syntax: "TO_NUMBER(s [, fmt [, 'nlsparams']])", desc: "字符串转数字", example: "SELECT TO_NUMBER('1,234.56','999,999.99') FROM dual;", result: "1234.56", tags: ["转换","数字"] },
        { name: "TO_TIMESTAMP", syntax: "TO_TIMESTAMP(s [, fmt])", desc: "字符串转 TIMESTAMP", example: "SELECT TO_TIMESTAMP('2024-01-01','YYYY-MM-DD') FROM dual;", result: "TIMESTAMP", tags: ["转换","时间戳"] },
        { name: "TO_TIMESTAMP_TZ", syntax: "TO_TIMESTAMP_TZ(s [, fmt])", desc: "字符串转带时区的 TIMESTAMP", example: "SELECT TO_TIMESTAMP_TZ('2024-01-01 +08:00','YYYY-MM-DD TZH:TZM') FROM dual;", result: "TIMESTAMP WITH TZ", tags: ["转换","时区"] },
        { name: "TO_YMINTERVAL", syntax: "TO_YMINTERVAL('Y-M')", desc: "字符串转年月间隔", example: "SELECT SYSDATE + TO_YMINTERVAL('1-6') FROM dual;", result: "1 年 6 月后", tags: ["转换","间隔"] },
        { name: "TO_DSINTERVAL", syntax: "TO_DSINTERVAL('D HH:MI:SS')", desc: "字符串转天秒间隔", example: "SELECT SYSDATE + TO_DSINTERVAL('1 02:30:00') FROM dual;", result: "1 天 2.5 小时后", tags: ["转换","间隔"] },
        { name: "CAST", syntax: "CAST(expr AS 类型)", desc: "通用类型转换", example: "SELECT CAST('123' AS NUMBER), CAST(SYSDATE AS TIMESTAMP) FROM dual;", result: "123, 时间戳", tags: ["转换","通用"] },
        { name: "CONVERT", syntax: "CONVERT(s, dest_charset [, src_charset])", desc: "字符集转换", example: "SELECT CONVERT('数据库','UTF8','ZHS16GBK') FROM dual;", result: "UTF8 字节", tags: ["转换","字符集"] },
        { name: "CHARTOROWID", syntax: "CHARTOROWID(s)", desc: "字符串转 ROWID", example: "SELECT * FROM emp WHERE ROWID = CHARTOROWID('AAAR3sAAEAAAACXAAA');", result: "定位行", tags: ["转换","ROWID"] },
        { name: "ROWIDTOCHAR", syntax: "ROWIDTOCHAR(rowid)", desc: "ROWID 转字符串", example: "SELECT ROWIDTOCHAR(ROWID) FROM emp WHERE ROWNUM=1;", result: "ROWID 字符串", tags: ["转换","ROWID"] },
        { name: "UNISTR", syntax: "UNISTR(s)", desc: "返回 Unicode 字符串(\\xxxx 转义)", example: "SELECT UNISTR('\\0041\\0042\\0043') FROM dual;", result: "'ABC'", tags: ["转换","Unicode"] },
        { name: "ASCIISTR", syntax: "ASCIISTR(s)", desc: "把任意字符集字符串转为 ASCII(非 ASCII 用 \\xxxx)", example: "SELECT ASCIISTR('数据库') FROM dual;", result: "\\6570\\636E\\5E93", tags: ["转换","Unicode"] }
      ]
    },
    {
      category: "NULL 函数 NULL Handling",
      icon: "fa-question-circle",
      items: [
        { name: "NVL", syntax: "NVL(expr, replace)", desc: "expr 为 NULL 返回 replace，否则返回 expr", example: "SELECT NVL(comm, 0) FROM emp;", result: "NULL 替换为 0", tags: ["NULL","替换"] },
        { name: "NVL2", syntax: "NVL2(expr, val_notnull, val_null)", desc: "expr 非 NULL 返回 val_notnull，否则返回 val_null", example: "SELECT NVL2(comm, '有提成', '无提成') FROM emp;", result: "有提成/无提成", tags: ["NULL","替换"] },
        { name: "COALESCE", syntax: "COALESCE(expr1, expr2, ...)", desc: "返回第一个非 NULL 的表达式(可多个参数)", example: "SELECT COALESCE(comm, sal*0.1, 100) FROM emp;", result: "优先 comm，其次 sal*0.1，最后 100", tags: ["NULL","替换"] },
        { name: "NULLIF", syntax: "NULLIF(expr1, expr2)", desc: "两表达式相等返回 NULL，否则返回 expr1", example: "SELECT NULLIF(job, 'CLERK') FROM emp;", result: "CLERK 显示 NULL", tags: ["NULL","比较"] },
        { name: "DECODE", syntax: "DECODE(expr, s1, r1 [, s2, r2, ...] [, default])", desc: "条件表达式：expr=s1 返回 r1，依次匹配，无匹配返回 default(或 NULL)", example: "SELECT DECODE(deptno, 10, '财务', 20, '研发', '其他') FROM emp;", result: "部门中文", tags: ["NULL","DECODE","条件"] },
        { name: "LNNVL", syntax: "LNNVL(condition)", desc: "条件为假或 NULL 返回 TRUE，常用于过滤 NULL 行(WHERE 中)", example: "SELECT * FROM emp WHERE LNNVL(comm > 500);", result: "comm<=500 或 comm IS NULL 的行", tags: ["NULL","条件"] },
        { name: "NANVL", syntax: "NANVL(n, replace)", desc: "n 为 NaN 返回 replace", example: "SELECT NANVL(BINARY_FLOAT_NAN, 0) FROM dual;", result: "0", tags: ["NULL","NaN"] }
      ]
    },
    {
      category: "聚合函数 Aggregate",
      icon: "fa-chart-bar",
      items: [
        { name: "COUNT", syntax: "COUNT(expr) / COUNT(*) / COUNT(DISTINCT expr)", desc: "计数；* 含 NULL 行数；expr 忽略 NULL；DISTINCT 去重计数", example: "SELECT COUNT(*), COUNT(comm), COUNT(DISTINCT job) FROM emp;", result: "总行数/非空 comm 数/岗位数", tags: ["聚合","计数"] },
        { name: "SUM", syntax: "SUM(expr)", desc: "求和(忽略 NULL)", example: "SELECT SUM(sal) FROM emp;", result: "薪资总和", tags: ["聚合","求和"] },
        { name: "AVG", syntax: "AVG(expr)", desc: "求平均值(忽略 NULL，不是除以总行数)", example: "SELECT AVG(sal), AVG(comm) FROM emp;", result: "平均薪资/平均提成(忽略 NULL)", tags: ["聚合","平均"] },
        { name: "MAX", syntax: "MAX(expr)", desc: "求最大值(数值/日期/字符均可)", example: "SELECT MAX(sal), MAX(hiredate) FROM emp;", result: "最高薪资/最晚入职", tags: ["聚合","最大"] },
        { name: "MIN", syntax: "MIN(expr)", desc: "求最小值", example: "SELECT MIN(sal) FROM emp;", result: "最低薪资", tags: ["聚合","最小"] },
        { name: "MEDIAN", syntax: "MEDIAN(expr)", desc: "求中位数(连续模型插值)", example: "SELECT MEDIAN(sal) FROM emp;", result: "薪资中位数", tags: ["聚合","中位数"] },
        { name: "STDDEV", syntax: "STDDEV(expr)", desc: "标准差(样本)", example: "SELECT STDDEV(sal) FROM emp;", result: "薪资标准差", tags: ["聚合","统计"] },
        { name: "VARIANCE", syntax: "VARIANCE(expr)", desc: "方差(样本)", example: "SELECT VARIANCE(sal) FROM emp;", result: "薪资方差", tags: ["聚合","统计"] },
        { name: "STATS_MODE", syntax: "STATS_MODE(expr)", desc: "返回众数(出现最多的值)", example: "SELECT STATS_MODE(job) FROM emp;", result: "最常见岗位", tags: ["聚合","众数"] },
        { name: "GROUPING", syntax: "GROUPING(列)", desc: "判断当前行是否为 ROLLUP/CUBE 产生的汇总行：1=是,0=否", example: "SELECT deptno, GROUPING(deptno) g, SUM(sal) FROM emp GROUP BY ROLLUP(deptno);", result: "汇总行 g=1", tags: ["聚合","分组"] },
        { name: "GROUPING_ID", syntax: "GROUPING_ID(列1, 列2, ...)", desc: "返回分组列的二进制掩码(GROUPING 组合)", example: "SELECT GROUPING_ID(deptno, job) FROM emp GROUP BY CUBE(deptno, job);", result: "0-3 掩码", tags: ["聚合","分组"] },
        { name: "LISTAGG", syntax: "LISTAGG(expr, '分隔符') WITHIN GROUP (ORDER BY ...)", desc: "字符串聚合(行转字符串)", example: "SELECT deptno, LISTAGG(ename,',') WITHIN GROUP(ORDER BY ename) 员工列表 FROM emp GROUP BY deptno;", result: "部门员工姓名列表", tags: ["聚合","字符串","行转列"] },
        { name: "WM_CONCAT", syntax: "WM_CONCAT(expr)", desc: "旧版字符串聚合(逗号分隔，不推荐)", example: "SELECT deptno, WM_CONCAT(ename) FROM emp GROUP BY deptno;", result: "逗号分隔名单", tags: ["聚合","字符串","已废弃"] },
        { name: "RANK (聚合)", syntax: "RANK(expr) WITHIN GROUP (ORDER BY ...)", desc: "计算某值在排序中的排名(聚合形式)", example: "SELECT RANK(3000) WITHIN GROUP(ORDER BY sal DESC) FROM emp;", result: "3000 在薪资降序中的名次", tags: ["聚合","排名"] },
        { name: "PERCENT_RANK (聚合)", syntax: "PERCENT_RANK(expr) WITHIN GROUP(ORDER BY ...)", desc: "百分位排名(0~1)", example: "SELECT PERCENT_RANK(2000) WITHIN GROUP(ORDER BY sal) FROM emp;", result: "0-1 之间", tags: ["聚合","百分位"] },
        { name: "PERCENTILE_CONT", syntax: "PERCENTILE_CONT(p) WITHIN GROUP(ORDER BY ...)", desc: "连续百分位数(插值计算)", example: "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP(ORDER BY sal) FROM emp;", result: "中位数", tags: ["聚合","百分位"] },
        { name: "PERCENTILE_DISC", syntax: "PERCENTILE_DISC(p) WITHIN GROUP(ORDER BY ...)", desc: "离散百分位数(取实际值)", example: "SELECT PERCENTILE_DISC(0.5) WITHIN GROUP(ORDER BY sal) FROM emp;", result: "中位数(实际值)", tags: ["聚合","百分位"] },
        { name: "FIRST / LAST", syntax: "聚合函数 KEEP (DENSE_RANK FIRST|LAST ORDER BY ...)", desc: "取排序后首/末行的聚合值", example: "SELECT MIN(sal) KEEP(DENSE_RANK FIRST ORDER BY hiredate) 首位员工薪资 FROM emp;", result: "最早入职者薪资", tags: ["聚合","首末"] },
        { name: "DENSE_RANK (聚合)", syntax: "DENSE_RANK(expr) WITHIN GROUP(ORDER BY ...)", desc: "密集排名的聚合形式", example: "SELECT DENSE_RANK(3000) WITHIN GROUP(ORDER BY sal DESC) FROM emp;", result: "密集名次", tags: ["聚合","排名"] },
        { name: "CORR", syntax: "CORR(expr1, expr2)", desc: "皮尔逊相关系数(-1~1)", example: "SELECT CORR(sal, comm) FROM emp;", result: "相关系数", tags: ["聚合","统计"] },
        { name: "COVAR_POP / COVAR_SAMP", syntax: "COVAR_POP(x, y) / COVAR_SAMP(x, y)", desc: "总体/样本协方差", example: "SELECT COVAR_SAMP(sal, comm) FROM emp;", result: "协方差", tags: ["聚合","统计"] },
        { name: "REGR_SLOPE 等", syntax: "REGR_SLOPE(y, x) / REGR_INTERCEPT / REGR_R2 ...", desc: "线性回归函数族", example: "SELECT REGR_SLOPE(sal, comm) FROM emp;", result: "回归斜率", tags: ["聚合","回归"] }
      ]
    },
    {
      category: "分析函数 Analytic (窗口函数)",
      icon: "fa-chart-line",
      items: [
        { name: "ROW_NUMBER", syntax: "ROW_NUMBER() OVER([PARTITION BY ...] ORDER BY ...)", desc: "为每行分配唯一连续序号(无并列)", example: "SELECT ename, sal, ROW_NUMBER() OVER(ORDER BY sal DESC) rn FROM emp;", result: "按薪资降序编号", tags: ["分析","序号"] },
        { name: "RANK", syntax: "RANK() OVER([PARTITION BY ...] ORDER BY ...)", desc: "排名，并列后跳号(1,2,2,4)", example: "SELECT ename, sal, RANK() OVER(ORDER BY sal DESC) r FROM emp;", result: "并列跳号", tags: ["分析","排名"] },
        { name: "DENSE_RANK", syntax: "DENSE_RANK() OVER([PARTITION BY ...] ORDER BY ...)", desc: "密集排名，并列不跳号(1,2,2,3)", example: "SELECT ename, sal, DENSE_RANK() OVER(ORDER BY sal DESC) r FROM emp;", result: "并列不跳号", tags: ["分析","排名"] },
        { name: "NTILE", syntax: "NTILE(n) OVER([PARTITION BY ...] ORDER BY ...)", desc: "把数据分为 n 桶，返回桶号(分位数分析)", example: "SELECT ename, sal, NTILE(4) OVER(ORDER BY sal DESC) 桶 FROM emp;", result: "1-4 分桶", tags: ["分析","分桶"] },
        { name: "LAG", syntax: "LAG(expr [, offset [, default]]) OVER([PARTITION BY ...] ORDER BY ...)", desc: "取当前行之前第 offset 行的值(默认 offset=1)", example: "SELECT ename, sal, LAG(sal) OVER(ORDER BY hiredate) 前一人薪资 FROM emp;", result: "按入职序前一行薪资", tags: ["分析","偏移"] },
        { name: "LEAD", syntax: "LEAD(expr [, offset [, default]]) OVER([PARTITION BY ...] ORDER BY ...)", desc: "取当前行之后第 offset 行的值", example: "SELECT ename, sal, LEAD(sal) OVER(ORDER BY hiredate) 后一人薪资 FROM emp;", result: "按入职序后一行薪资", tags: ["分析","偏移"] },
        { name: "FIRST_VALUE", syntax: "FIRST_VALUE(expr) OVER([PARTITION BY ...] ORDER BY ... [窗口])", desc: "取窗口内第一个值", example: "SELECT ename, sal, FIRST_VALUE(ename) OVER(PARTITION BY deptno ORDER BY sal DESC) 部门最高薪 FROM emp;", result: "部门最高薪者", tags: ["分析","首值"] },
        { name: "LAST_VALUE", syntax: "LAST_VALUE(expr) OVER([PARTITION BY ...] ORDER BY ... [窗口])", desc: "取窗口内最后一个值(注意默认窗口范围！)", example: "SELECT ename, sal, LAST_VALUE(ename) OVER(PARTITION BY deptno ORDER BY sal DESC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) FROM emp;", result: "窗口内末值", tags: ["分析","末值"] },
        { name: "NTH_VALUE", syntax: "NTH_VALUE(expr, n) OVER([PARTITION BY ...] ORDER BY ... [窗口])", desc: "取窗口内第 n 个值(11gR2+)", example: "SELECT ename, sal, NTH_VALUE(ename, 2) OVER(PARTITION BY deptno ORDER BY sal DESC) FROM emp;", result: "第 2 名", tags: ["分析","第N值"] },
        { name: "SUM (分析)", syntax: "SUM(expr) OVER([PARTITION BY ...] [ORDER BY ... [窗口]])", desc: "累计求和(配 ORDER BY 与窗口)", example: "SELECT ename, sal, SUM(sal) OVER(ORDER BY hiredate) 累计薪资 FROM emp;", result: "累计求和", tags: ["分析","累计"] },
        { name: "AVG (分析)", syntax: "AVG(expr) OVER([PARTITION BY ...] ORDER BY ... ROWS n PRECEDING)", desc: "移动平均", example: "SELECT ename, sal, ROUND(AVG(sal) OVER(ORDER BY hiredate ROWS 2 PRECEDING),2) 近3人平均 FROM emp;", result: "近 3 行移动平均", tags: ["分析","移动平均"] },
        { name: "RATIO_TO_REPORT", syntax: "RATIO_TO_REPORT(expr) OVER([PARTITION BY ...])", desc: "当前行值占分区内总和的比例", example: "SELECT ename, sal, ROUND(RATIO_TO_REPORT(sal) OVER(),4) 占比 FROM emp;", result: "占总薪资比", tags: ["分析","占比"] },
        { name: "PERCENT_RANK (分析)", syntax: "PERCENT_RANK() OVER([PARTITION BY ...] ORDER BY ...)", desc: "当前行在分区内的百分位(0~1)", example: "SELECT ename, sal, PERCENT_RANK() OVER(ORDER BY sal) FROM emp;", result: "0-1", tags: ["分析","百分位"] },
        { name: "CUME_DIST", syntax: "CUME_DIST() OVER([PARTITION BY ...] ORDER BY ...)", desc: "累积分布(小于等于当前值的行数占比)", example: "SELECT ename, sal, CUME_DIST() OVER(ORDER BY sal) FROM emp;", result: "0-1", tags: ["分析","分布"] },
        { name: "KEEP FIRST/LAST (分析)", syntax: "聚合 KEEP(DENSE_RANK FIRST|LAST ORDER BY ...) OVER([PARTITION BY ...])", desc: "分区内按排序取首/末行的聚合值", example: "SELECT deptno, MIN(sal) KEEP(DENSE_RANK FIRST ORDER BY hiredate) 最早入职薪资 FROM emp GROUP BY deptno;", result: "部门最早入职者薪资", tags: ["分析","首末"] },
        { name: "窗口子句 ROWS/RANGE", syntax: "ROWS BETWEEN {UNBOUNDED PRECEDING|n PRECEDING|CURRENT ROW|n FOLLOWING|UNBOUNDED FOLLOWING} ...", desc: "定义分析函数计算窗口范围", example: "SELECT sal, SUM(sal) OVER(ORDER BY sal ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) FROM emp;", result: "前后各 1 行求和(3 行窗口)", tags: ["分析","窗口"] }
      ]
    },
    {
      category: "其他/环境函数 Misc",
      icon: "fa-toolbox",
      items: [
        { name: "USER", syntax: "USER", desc: "返回当前会话用户名", example: "SELECT USER FROM dual;", result: "'SCOTT'", tags: ["环境","用户"] },
        { name: "UID", syntax: "UID", desc: "返回当前用户 ID", example: "SELECT UID FROM dual;", result: "数字 ID", tags: ["环境","用户"] },
        { name: "USERENV", syntax: "USERENV('参数')", desc: "返回会话信息(LANGUAGE/TERMINAL/OS_USER 等)", example: "SELECT USERENV('LANGUAGE'), USERENV('OS_USER') FROM dual;", result: "语言/操作系统用户", tags: ["环境","会话"] },
        { name: "SYS_CONTEXT", syntax: "SYS_CONTEXT('namespace', 'param' [, len])", desc: "返回命名空间上下文属性(推荐替代 USERENV)", example: "SELECT SYS_CONTEXT('USERENV','SESSION_USER'), SYS_CONTEXT('USERENV','IP_ADDRESS') FROM dual;", result: "会话用户/IP", tags: ["环境","上下文"] },
        { name: "DUMP", syntax: "DUMP(expr [, fmt [, start [, length]]])", desc: "返回表达式内部存储(类型码、长度、字节值)", example: "SELECT DUMP('ABC'), DUMP(123) FROM dual;", result: "Typ=96 Len=3: 65,66,67", tags: ["环境","调试"] },
        { name: "VSIZE", syntax: "VSIZE(expr)", desc: "返回表达式内部存储字节数", example: "SELECT VSIZE('Oracle'), VSIZE(123) FROM dual;", result: "6, ?, 取决类型", tags: ["环境","长度"] },
        { name: "GREATEST", syntax: "GREATEST(expr1, expr2, ...)", desc: "返回表达式列表中最大值(忽略 NULL？不，遇 NULL 返回 NULL)", example: "SELECT GREATEST(10, 20, 5) FROM dual;", result: "20", tags: ["其他","最大"] },
        { name: "LEAST", syntax: "LEAST(expr1, expr2, ...)", desc: "返回表达式列表中最小值", example: "SELECT LEAST(10, 20, 5) FROM dual;", result: "5", tags: ["其他","最小"] },
        { name: "COALESCE", syntax: "COALESCE(expr1, ...)", desc: "返回第一个非 NULL 表达式(也归 NULL 类)", example: "SELECT COALESCE(NULL, NULL, 'c', 'd') FROM dual;", result: "'c'", tags: ["其他","NULL"] },
        { name: "SYS_GUID", syntax: "SYS_GUID()", desc: "生成 16 字节全局唯一标识(32 位十六进制 RAW)", example: "SELECT SYS_GUID() FROM dual;", result: "全局唯一 ID", tags: ["其他","GUID"] },
        { name: "UID/USER", syntax: "USER / UID", desc: "返回当前用户名/ID(已列在上方)", example: "SELECT USER, UID FROM dual;", result: "用户名/ID", tags: ["环境","用户"] },
        { name: "DBMS_RANDOM.VALUE", syntax: "DBMS_RANDOM.VALUE([min, max])", desc: "生成随机数(无参 0~1；带参 [min,max))", example: "SELECT DBMS_RANDOM.VALUE(1, 100) FROM dual;", result: "1-100 随机数", tags: ["其他","随机"] },
        { name: "DBMS_RANDOM.STRING", syntax: "DBMS_RANDOM.STRING(opt, len)", desc: "生成随机字符串(opt: U 大写/L 小写/A 混合/P 可打印)", example: "SELECT DBMS_RANDOM.STRING('A', 10) FROM dual;", result: "10 位随机字符串", tags: ["其他","随机"] },
        { name: "ORA_HASH", syntax: "ORA_HASH(expr [, max_bucket [, seed]])", desc: "对表达式计算哈希值(0~max_bucket)", example: "SELECT ORA_HASH(ename) FROM emp;", result: "哈希值", tags: ["其他","哈希"] },
        { name: "STANDARD.HASH", syntax: "STANDARD.HASH(expr [, algo])", desc: "计算 MD4/MD5/SH1/SH256 等哈希(12c+)", example: "SELECT STANDARD.HASH('abc','SHA256') FROM dual;", result: "SHA256 摘要", tags: ["其他","哈希"] },
        { name: "UTL_RAW.CAST_TO_RAW", syntax: "UTL_RAW.CAST_TO_RAW(s)", desc: "字符串转 RAW", example: "SELECT UTL_RAW.CAST_TO_RAW('ABC') FROM dual;", result: "414243", tags: ["其他","RAW"] },
        { name: "UTL_RAW.CAST_TO_VARCHAR2", syntax: "UTL_RAW.CAST_TO_VARCHAR2(r)", desc: "RAW 转字符串", example: "SELECT UTL_RAW.CAST_TO_VARCHAR2('414243') FROM dual;", result: "'ABC'", tags: ["其他","RAW"] },
        { name: "UTL_INADDR.GET_HOST_NAME", syntax: "UTL_INADDR.GET_HOST_NAME(ip)", desc: "IP 反查主机名", example: "SELECT UTL_INADDR.GET_HOST_NAME('127.0.0.1') FROM dual;", result: "主机名", tags: ["其他","网络"] },
        { name: "UTL_INADDR.GET_HOST_ADDRESS", syntax: "UTL_INADDR.GET_HOST_ADDRESS(host)", desc: "主机名查 IP", example: "SELECT UTL_INADDR.GET_HOST_ADDRESS('localhost') FROM dual;", result: "127.0.0.1", tags: ["其他","网络"] },
        { name: "DBMS_UTILITY.GET_TIME", syntax: "DBMS_UTILITY.GET_TIME", desc: "返回当前时间(厘秒，用于计时)", example: "SELECT DBMS_UTILITY.GET_TIME FROM dual;", result: "厘秒数", tags: ["其他","计时"] }
      ]
    }
  ]
};
