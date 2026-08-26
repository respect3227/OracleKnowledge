/* Oracle / 达梦双语种速查 — Alpine 主应用
 * 调用后端 API:/api/knowledge /api/functions /api/translate /api/favorites /api/history
 */
function oracleApp() {
  return {
    // 状态
    dark: false,
    sidebarOpen: false,
    scrollTop: 0,
    dbFilter: 'both',               // both | oracle | dm
    sections: [],
    itemsCache: {},                 // section_id -> items[]
    activeSection: null,
    stats: [],
    funcCategories: [],
    allFuncs: [],
    filteredFuncs: [],
    activeCat: 'all',
    funcQuery: '',
    // 全局搜索
    globalQuery: '',
    globalResults: [],
    globalFocus: false,
    // 收藏
    favorites: [],
    favoritesOpen: false,
    // 翻译器
    analyzerOpen: false,
    analyzing: false,
    sqlInput: '',
    analyzerDialect: 'oracle',
    result: null,
    resultHtml: '',
    editor: null,
    // toast
    toast: { show: false, msg: '', type: 'info' },

    examples: [
      { label: 'JOIN + 分页', sql: "SELECT e.ename, d.dname, e.sal\nFROM emp e LEFT JOIN dept d ON e.deptno = d.deptno\nWHERE e.sal > 1000\nORDER BY e.sal DESC\nFETCH FIRST 5 ROWS ONLY;" },
      { label: 'MERGE upsert', sql: "MERGE INTO employees t\nUSING (SELECT 1 AS empno FROM dual) s\nON (t.empno = s.empno)\nWHEN MATCHED THEN UPDATE SET t.salary = t.salary + 500\nWHEN NOT MATCHED THEN INSERT (empno, salary) VALUES (s.empno, 5000);" },
      { label: 'EXISTS 判存在', sql: "SELECT 1 FROM dual WHERE EXISTS (\n  SELECT 1 FROM emp WHERE deptno = 10\n);" },
      { label: '窗口函数', sql: "SELECT ename, deptno, sal,\n  RANK() OVER (PARTITION BY deptno ORDER BY sal DESC) AS rnk,\n  SUM(sal) OVER (PARTITION BY deptno) AS dept_total\nFROM emp;" },
      { label: 'CTE 递归', sql: "WITH dept_count AS (\n  SELECT deptno, COUNT(*) AS cnt FROM emp GROUP BY deptno\n)\nSELECT d.dname, dc.cnt\nFROM dept d JOIN dept_count dc ON d.deptno = dc.deptno\nWHERE dc.cnt > 3;" },
      { label: 'PL/SQL 块', sql: "DECLARE\n  v_cnt NUMBER;\nBEGIN\n  SELECT COUNT(*) INTO v_cnt FROM emp WHERE deptno = 10;\n  DBMS_OUTPUT.PUT_LINE('部门 10 有 ' || v_cnt || ' 人');\nEXCEPTION\n  WHEN NO_DATA_FOUND THEN\n    DBMS_OUTPUT.PUT_LINE('无数据');\nEND;" }
    ],

    async init() {
      // 暗色模式
      this.dark = localStorage.getItem('od-dark') === '1';
      this.applyDarkClass();
      window.addEventListener('scroll', () => this.scrollTop = window.scrollY, { passive: true });
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          document.querySelector('input[type=search]')?.focus();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
          e.preventDefault();
          this.openAnalyzer();
        }
      });

      await Promise.all([this.loadSections(), this.loadFunctions(), this.loadFavorites()]);
      this.buildStats();
    },

    // ===== 数据加载 =====
    async loadSections() {
      try {
        const r = await fetch(`/api/knowledge/sections?db=${this.dbFilter}`);
        this.sections = await r.json();
        // 并发拉每个章节的 items
        await Promise.all(this.sections.map(async s => {
          const r = await fetch(`/api/knowledge/items?section=${s.id}&db=${this.dbFilter}`);
          this.itemsCache[s.id] = await r.json();
        }));
      } catch (e) {
        this.showToast('加载章节失败: ' + e.message, 'error');
      }
    },

    async loadFunctions() {
      try {
        const [c, f] = await Promise.all([
          fetch(`/api/functions/categories?db=${this.dbFilter}`).then(r => r.json()),
          fetch(`/api/functions/list?db=${this.dbFilter}`).then(r => r.json())
        ]);
        this.funcCategories = c;
        this.allFuncs = f;
        this.filterFuncs();
      } catch (e) {
        this.showToast('加载函数库失败: ' + e.message, 'error');
      }
    },

    async reloadSectionsAndFuncs() {
      this.itemsCache = {};
      await Promise.all([this.loadSections(), this.loadFunctions()]);
      this.buildStats();
    },

    buildStats() {
      const itemsCount = Object.values(this.itemsCache).reduce((a, b) => a + b.length, 0);
      this.stats = [
        { icon: 'fas fa-book', num: this.sections.length, label: '语法章节' },
        { icon: 'fas fa-list-ul', num: itemsCount, label: '语法条目' },
        { icon: 'fas fa-function', num: this.allFuncs.length, label: '内置函数' },
        { icon: 'fas fa-database', num: '2', label: 'Oracle + 达梦' }
      ];
    },

    sectionHasItems(s) {
      return (this.itemsCache[s.id] || []).length > 0;
    },

    itemsBySection(sid) {
      return this.itemsCache[sid] || [];
    },

    // ===== 函数过滤 =====
    filterFuncs() {
      const q = this.funcQuery.trim().toLowerCase();
      this.filteredFuncs = this.allFuncs.filter(f => {
        const catOk = this.activeCat === 'all' || f.category_id === this.activeCat;
        if (!catOk) return false;
        if (!q) return true;
        return (f.name + ' ' + f.desc + ' ' + (f.tags || '') + ' ' + f.syntax).toLowerCase().includes(q);
      });
    },

    // ===== 全局搜索 =====
    async onGlobalSearch() {
      const q = this.globalQuery.trim();
      if (q.length < 2) { this.globalResults = []; return; }
      try {
        const r = await fetch(`/api/knowledge/search?q=${encodeURIComponent(q)}`);
        let hits = await r.json();
        // 同时本地匹配函数
        const funcHits = this.allFuncs
          .filter(f => (f.name + f.desc + (f.tags || '')).toLowerCase().includes(q.toLowerCase()))
          .slice(0, 5)
          .map(f => ({ id: f.id, name: f.name, desc: f.desc, db: f.db, kind: 'function', section_id: 'functions' }));
        this.globalResults = [...hits.slice(0, 8), ...funcHits];
      } catch (e) {
        this.globalResults = [];
      }
    },

    jumpToSearchResult(r) {
      this.globalQuery = '';
      this.globalResults = [];
      if (r.kind === 'function' || r.section_id === 'functions') {
        this.activeCat = 'all';
        this.funcQuery = r.name;
        this.filterFuncs();
        location.hash = '#sec-functions';
        setTimeout(() => {
          const cards = document.querySelectorAll('#sec-functions article');
          cards.forEach(c => {
            if (c.querySelector('.mono')?.textContent.includes(r.name)) {
              c.scrollIntoView({ behavior: 'smooth', block: 'center' });
              c.style.transition = 'box-shadow .5s';
              c.style.boxShadow = '0 0 0 3px hsl(12 76% 51% / .5)';
              setTimeout(() => c.style.boxShadow = '', 2000);
            }
          });
        }, 300);
      } else {
        location.hash = '#sec-' + r.section_id;
        setTimeout(() => {
          const cards = document.querySelectorAll(`#sec-${r.section_id} article`);
          cards.forEach(c => {
            if (c.querySelector('h3')?.textContent.trim() === r.name) {
              c.scrollIntoView({ behavior: 'smooth', block: 'center' });
              c.style.transition = 'box-shadow .5s';
              c.style.boxShadow = '0 0 0 3px hsl(12 76% 51% / .5)';
              setTimeout(() => c.style.boxShadow = '', 2000);
            }
          });
        }, 300);
      }
    },

    // ===== 高亮/复制 =====
    hlHtml(code) {
      try {
        if (window.hljs) {
          return hljs.highlight(code, { language: 'sql' }).value;
        }
      } catch (e) { /* ignore */ }
      return this.esc(code);
    },

    esc(s) {
      return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    },

    async copyCode(text) {
      try {
        await navigator.clipboard.writeText(text);
        this.showToast('已复制到剪贴板', 'info');
      } catch {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        this.showToast('已复制', 'info');
      }
    },

    // ===== DB 徽章 =====
    dbLabel(db) {
      return { oracle: 'Oracle', dm: '达梦', both: '通用' }[db] || db;
    },
    dbBadgeClass(db) {
      return { oracle: 'badge-oracle', dm: 'badge-dm', both: 'badge-both' }[db] || 'badge-key';
    },

    // ===== 收藏 =====
    async loadFavorites() {
      try {
        const r = await fetch('/api/favorites');
        this.favorites = await r.json();
      } catch (e) { this.favorites = []; }
    },

    isFavorited(kind, id) {
      return this.favorites.some(f => f.kind === kind && f.target_id === id);
    },

    async toggleFavorite(kind, id, title) {
      if (this.isFavorited(kind, id)) {
        const fav = this.favorites.find(f => f.kind === kind && f.target_id === id);
        await this.removeFavorite(fav.id);
        this.showToast('已取消收藏', 'info');
      } else {
        try {
          await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind, target_id: id, title })
          });
          await this.loadFavorites();
          this.showToast('已收藏', 'info');
        } catch (e) {
          this.showToast('收藏失败', 'error');
        }
      }
    },

    async removeFavorite(id) {
      await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
      await this.loadFavorites();
    },

    async clearFavorites() {
      if (!confirm('确定清空全部收藏?')) return;
      await Promise.all(this.favorites.map(f => fetch(`/api/favorites/${f.id}`, { method: 'DELETE' })));
      await this.loadFavorites();
      this.showToast('收藏已清空', 'info');
    },

    // ===== 暗色模式 =====
    persistDark() {
      localStorage.setItem('od-dark', this.dark ? '1' : '0');
      this.applyDarkClass();
    },
    applyDarkClass() {
      document.documentElement.classList.toggle('dark', this.dark);
    },

    // ===== SQL 翻译器 =====
    async openAnalyzer() {
      this.analyzerOpen = true;
      this.analyzerDialect = (this.dbFilter === 'dm') ? 'dm' : 'oracle';
      await this.$nextTick();
      this.initEditor();
    },

    initEditor() {
      if (this.editor) return;
      const host = document.getElementById('editor-host');
      if (!host || !window.CodeMirror) return;
      const ta = document.createElement('textarea');
      host.appendChild(ta);
      this.editor = CodeMirror.fromTextArea(ta, {
        mode: 'text/x-sql',
        theme: 'material-darker',
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        extraKeys: {
          'Ctrl-Space': 'autocomplete',
          'Cmd-Enter': () => this.runTranslate(),
          'Ctrl-Enter': () => this.runTranslate()
        }
      });
      this.editor.on('change', () => { this.sqlInput = this.editor.getValue(); });
      this.editor.setValue(this.sqlInput || '');
      // Oracle/达梦 关键字提示
      CodeMirror.registerHelper('hint', 'sql', (cm) => {
        const cur = cm.getCursor(); const tk = cm.getTokenAt(cur);
        const keywords = ['SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','FULL','ON','GROUP','HAVING','ORDER','BY','FETCH','FIRST','NEXT','ROWS','ONLY','WITH','AS','DISTINCT','UNION','ALL','INSERT','INTO','VALUES','UPDATE','SET','DELETE','MERGE','USING','WHEN','MATCHED','NOT','THEN','CREATE','TABLE','VIEW','INDEX','DROP','ALTER','ADD','MODIFY','COLUMN','CONSTRAINT','PRIMARY','KEY','FOREIGN','REFERENCES','CHECK','DEFAULT','NULL','AND','OR','IN','BETWEEN','LIKE','IS','EXISTS','CASE','WHEN','THEN','ELSE','END','DUAL','SYSDATE','ROWNUM','NVL','DECODE','TO_CHAR','TO_DATE','TO_NUMBER','COUNT','SUM','AVG','MAX','MIN','ROW_NUMBER','RANK','DENSE_RANK','OVER','PARTITION','LEAD','LAG','BEGIN','DECLARE','END','EXCEPTION','PROCEDURE','FUNCTION','PACKAGE','TRIGGER','BULK','COLLECT','FORALL','RETURNING'];
        const str = tk.string.trim().toUpperCase();
        const list = keywords.filter(k => !str || k.startsWith(str)).map(k => ({ text: k, displayText: k }));
        return { list, from: CodeMirror.Pos(cur.line, tk.start), to: CodeMirror.Pos(cur.line, tk.end) };
      });
    },

    loadExample(ex) {
      this.sqlInput = ex.sql;
      if (this.editor) this.editor.setValue(ex.sql);
    },

    async sendToAnalyzer(sql) {
      this.sqlInput = sql;
      await this.openAnalyzer();
      if (this.editor) this.editor.setValue(sql);
    },

    clearAnalyzer() {
      this.sqlInput = '';
      this.result = null;
      this.resultHtml = '';
      if (this.editor) this.editor.setValue('');
    },

    formatSQL() {
      if (!this.sqlInput.trim()) return;
      this.runTranslate(true).then(() => {
        if (this.result?.formatted) {
          this.sqlInput = this.result.formatted;
          if (this.editor) this.editor.setValue(this.result.formatted);
        }
      });
    },

    async runTranslate(skipRender = false) {
      const sql = this.editor ? this.editor.getValue() : this.sqlInput;
      if (!sql.trim()) { this.showToast('请先输入 SQL', 'error'); return; }
      this.sqlInput = sql;
      this.analyzing = true;
      this.result = null;
      this.resultHtml = '';
      try {
        const r = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql, dialect: this.analyzerDialect })
        });
        const data = await r.json();
        this.result = data;
        if (!skipRender) this.renderResult(data);
        // 保存历史
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql, dialect: this.analyzerDialect })
        }).catch(() => {});
      } catch (e) {
        this.showToast('翻译失败: ' + e.message, 'error');
      } finally {
        this.analyzing = false;
      }
    },

    renderResult(d) {
      const stmtDesc = d.statementType ? `<span class="text-oracle font-extrabold text-lg">${this.esc(d.statementType)}</span>` : '';
      const cxBadge = {
        low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        high: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
      }[d.complexity] || '';
      const cxLabel = { low: '低', medium: '中', high: '高' }[d.complexity] || '?';

      const tokens = (d.tokens || []).map(t => {
        const cls = {
          keyword: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
          function: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
          operator: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
          clause: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
          join: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
          object: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
          literal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
          identifier: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        }[t.type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        return `<span class="px-2 py-0.5 rounded text-xs mono ${cls}" title="${t.type}">${this.esc(t.raw)}</span>`;
      }).join(' ');

      const sentences = (d.sentences || []).map(s => `<div class="flex gap-2 items-start"><span class="w-2 h-2 rounded-full bg-oracle mt-2 shrink-0"></span><div class="flex-1 leading-7">${s}</div></div>`).join('');
      const notes = (d.notes || []).map(n => `<div class="tl-note">${n}</div>`).join('');

      this.resultHtml = `
        <div class="card p-4 space-y-4">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>${stmtDesc}<span class="ml-2 text-xs text-[hsl(var(--mf))]">${d.dialect === 'dm' ? '达梦 DM' : 'Oracle'} 方言</span></div>
            <span class="badge px-3 py-1 ${cxBadge}">复杂度: ${cxLabel}</span>
          </div>

          ${d.tokens && d.tokens.length ? `
          <div>
            <div class="text-xs font-bold text-[hsl(var(--mf))] mb-1.5"><i class="fas fa-tags text-dm"></i> 词法 token (${d.tokens.length})</div>
            <div class="flex flex-wrap gap-1">${tokens}</div>
          </div>` : ''}

          <div>
            <div class="text-xs font-bold text-[hsl(var(--mf))] mb-1.5"><i class="fas fa-language text-oracle"></i> 中文翻译解读</div>
            <div class="space-y-1.5 leading-7">${sentences}</div>
          </div>

          ${notes ? `<div class="space-y-1">${notes}</div>` : ''}

          ${d.diffNote ? `<div class="px-3 py-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-amber-700 dark:text-amber-300"><i class="fas fa-exchange-alt mr-1"></i>${this.esc(d.diffNote)}</div>` : ''}

          ${d.formatted ? `
          <details class="text-sm">
            <summary class="cursor-pointer text-[hsl(var(--mf))] flex items-center gap-2 select-none"><i class="fas fa-align-left text-dm"></i> 格式化 SQL</summary>
            <div class="code-block mt-2"><pre><code class="hljs language-sql">${this.hlHtml(d.formatted)}</code></pre></div>
          </details>` : ''}
        </div>
      `;
    },

    // ===== Toast =====
    showToast(msg, type = 'info') {
      this.toast = { show: true, msg, type };
      setTimeout(() => this.toast.show = false, 2200);
    }
  };
}
