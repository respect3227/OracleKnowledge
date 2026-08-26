import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP_URL = 'http://127.0.0.1:9222';
const REPO_URL = 'https://github.com/respect3227/OracleKnowledge';
const RELEASE_NOTES = `## v2.0.0 正式版

全栈重构,从「纯静态 Oracle 单库速查」升级为「Oracle + 达梦双语种、带后端数据库 + AST 翻译器」。

### ✨ 新增特性
- 🗄️ **双库知识** Oracle / 达梦 / 通用 三级徽章 + diff_note 差异说明
- ⚙️ **后端** Node.js + Express + SQLite(better-sqlite3)
- 🔍 **FTS5 全文搜索**(/api/knowledge/search)
- 🧠 **AST SQL 翻译器**(node-sql-parser + 惯用法识别):
  - \`SELECT 1 FROM dual WHERE EXISTS(...)\` 判存在惯用法完整解读
  - \`NOT IN\` NULL 陷阱提醒
  - MERGE upsert(目标表/源表/ON 匹配条件/匹配字段/插入字段)
  - 窗口函数 PARTITION BY + ORDER BY 窗口叙述
  - CTE 公用表表达式 / PL/SQL 匿名块 DECLARE…EXCEPTION
- 🎨 **UI** Tailwind + shadcn 设计语言 + Alpine.js + CodeMirror 5(关键字补全) + highlight.js 11
- ⭐ **收藏夹**(SQLite 持久化)
- 🧾 **SQL 分析历史**(最近 100 条)
- 🌙 **暗色模式**(localStorage 持久化)
- ⌨️ **快捷键** Ctrl/Cmd+K 搜索、Ctrl/Cmd+/ 打开翻译器、编辑器内 Ctrl+Enter 翻译

### 📚 知识点覆盖(14 章 / 97 条 / 143 函数)
1. 体系结构基础
2. SELECT 查询基础
3. 多表连接与集合运算
4. 分组与聚合
5. DDL 数据定义
6. DML 数据操作与事务
7. DCL 权限与用户
8. 高级查询
9. PL/SQL 程序设计
10. **PL/SQL 进阶**(包/触发器/调度/动态 SQL/自治事务)
11. **应用开发惯用法**(SELECT 1 / EXISTS vs IN / ROWNUM 分页 / MERGE / 绑定变量 / FORALL / EXCEPTION)
12. **DBA 运维**(RMAN / Data Pump / AWR / 闪回 / 统计信息)
13. **安全与高可用**(VPD / 审计 / RAC / Data Guard / DRCP)
14. 高级特性与运维
- 函数库新增「达梦特有函数」分类

### 🚀 启动
\`\`\`bash
npm install
npm start   # http://localhost:3000
\`\`\`
`;

const SCREENSHOT_DIR = '/workspace/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function clickByText(page, text, selectorHint = 'a, button, summary, [role="button"]', timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const found = await page.evaluate((txt, sel) => {
        const nodes = Array.from(document.querySelectorAll(sel));
        for (const n of nodes) {
          const visible = n.offsetParent !== null || n.getClientRects().length > 0;
          if (!visible) continue;
          const content = (n.innerText || n.textContent || '').trim();
          if (content === txt || content.includes(txt)) {
            n.scrollIntoView({ block: 'center', behavior: 'instant' });
            n.setAttribute('data-click-target', '1');
            return true;
          }
        }
        return false;
      }, text, selectorHint);
      if (found) {
        await page.click('[data-click-target="1"]').catch(() => {});
        await page.evaluate(() => document.querySelectorAll('[data-click-target="1"]').forEach(e => e.removeAttribute('data-click-target')));
        return true;
      }
    } catch (e) { /* ignore */ }
    await sleep(200);
  }
  return false;
}

async function fillByPlaceholderOrLabel(page, fieldName, value) {
  const sel = await page.evaluate((name) => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const el of inputs) {
      const ph = (el.getAttribute('placeholder') || '').toLowerCase();
      const nm = (el.getAttribute('name') || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      const lb = (el.getAttribute('aria-label') || '').toLowerCase();
      const label = document.querySelector(`label[for="${el.id}"]`);
      const lt = (label ? label.textContent : '').toLowerCase();
      if (ph.includes(name) || nm.includes(name) || id.includes(name) || lb.includes(name) || lt.includes(name)) {
        el.setAttribute('data-fill-target', '1');
        return true;
      }
    }
    // fallback: first visible empty input after that section
    return false;
  }, fieldName.toLowerCase());
  if (sel) {
    await page.focus('[data-fill-target="1"]');
    await page.click('[data-fill-target="1"]');
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('[data-fill-target="1"]', value, { delay: 8 });
    await page.evaluate(() => document.querySelectorAll('[data-fill-target="1"]').forEach(e => e.removeAttribute('data-fill-target')));
    return true;
  }
  return false;
}

async function main() {
  const versionInfo = await fetch(`${CDP_URL}/json/version`).then(r => r.json());
  const browser = await puppeteer.connect({ browserWSEndpoint: versionInfo.webSocketDebuggerUrl, defaultViewport: { width: 1440, height: 900 } });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('[STEP 1] Navigate to repo and find Releases entry');
  await page.goto(REPO_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);

  // Look for "Create a new release" or "Releases" link
  const tryLinks = [
    { text: 'Create a new release', sel: 'a, button' },
    { text: 'Releases', sel: 'a' },
  ];
  let clicked = false;
  for (const t of tryLinks) {
    const found = await page.evaluate((txt, sel) => {
      const nodes = Array.from(document.querySelectorAll(sel));
      for (const n of nodes) {
        const visible = n.offsetParent !== null || n.getClientRects().length > 0;
        if (!visible) continue;
        const content = (n.innerText || n.textContent || '').trim();
        if (content === txt || content.startsWith(txt) || content.includes(txt)) {
          n.scrollIntoView({ block: 'center', behavior: 'instant' });
          n.setAttribute('data-auto-click', '1');
          return true;
        }
      }
      return false;
    }, t.text, t.sel);
    if (found) {
      await page.click('[data-auto-click="1"]').catch(() => {});
      await page.evaluate(() => document.querySelectorAll('[data-auto-click="1"]').forEach(e => e.removeAttribute('data-auto-click')));
      clicked = true;
      console.log(`[STEP 1] Clicked link: "${t.text}"`);
      await sleep(3000);
      break;
    }
  }
  if (!clicked) {
    // fallback: go directly to releases/new URL
    console.log('[STEP 1] No link found, navigating directly...');
    await page.goto(`${REPO_URL}/releases/new`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3500);
  }

  // Ensure we are on "Create release" page. If we landed on releases list, click "Draft a new release"
  const currentUrl = page.url();
  console.log(`[STEP 1] URL: ${currentUrl}`);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/step1a-releases-page.png`, fullPage: true });

  if (currentUrl.includes('/releases') && !currentUrl.includes('/new') && !currentUrl.includes('/edit')) {
    // Try "Draft a new release"
    const foundNew = await page.evaluate(() => {
      const textMatch = ['Draft a new release', 'Create a new release', 'New release'];
      const nodes = Array.from(document.querySelectorAll('a, button'));
      for (const n of nodes) {
        const visible = n.offsetParent !== null || n.getClientRects().length > 0;
        if (!visible) continue;
        const content = (n.innerText || n.textContent || '').trim();
        if (textMatch.some(t => content.includes(t) || content === t)) {
          n.scrollIntoView({ block: 'center', behavior: 'instant' });
          n.setAttribute('data-new-rel', '1');
          return true;
        }
      }
      return false;
    });
    if (foundNew) {
      await page.click('[data-new-rel="1"]').catch(() => {});
      await page.evaluate(() => document.querySelectorAll('[data-new-rel="1"]').forEach(e => e.removeAttribute('data-new-rel')));
      await sleep(4000);
      console.log('[STEP 1] Clicked Draft a new release');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/step1b-draft-release.png`, fullPage: true });
    } else {
      await page.goto(`${REPO_URL}/releases/new`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3500);
    }
  }

  console.log('[STEP 1] Filling tag field "v2.0.0"');
  // Choose a tag: look for "Choose a tag" combobox / input
  let tagFilled = await page.evaluate(() => {
    // The tag combobox in GitHub releases page: find input with placeholder/tag-like
    const candidates = Array.from(document.querySelectorAll('input, textarea'));
    for (const el of candidates) {
      const ph = (el.getAttribute('placeholder') || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const nm = (el.getAttribute('name') || '').toLowerCase();
      if (ph.includes('choose a tag') || ph.includes('tag') || id.includes('tag') || aria.includes('tag') || nm.includes('tag')) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        el.setAttribute('data-tag', '1');
        return true;
      }
    }
    // GitHub's newer UI: look for button with "Choose a tag" then an input
    return false;
  });

  if (!tagFilled) {
    // Newer GitHub: click the "Choose a tag" button/menu first
    const openTagBox = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('button, summary, [role="button"]'));
      for (const n of nodes) {
        const visible = n.offsetParent !== null || n.getClientRects().length > 0;
        if (!visible) continue;
        const content = (n.innerText || n.textContent || '').trim();
        if (content.includes('Choose a tag') || content.includes('选择标签')) {
          n.scrollIntoView({ block: 'center', behavior: 'instant' });
          n.setAttribute('data-tag-btn', '1');
          return true;
        }
      }
      return false;
    });
    if (openTagBox) {
      await page.click('[data-tag-btn="1"]').catch(() => {});
      await page.evaluate(() => document.querySelectorAll('[data-tag-btn="1"]').forEach(e => e.removeAttribute('data-tag-btn')));
      await sleep(1500);
    }
    // Try again to find tag input
    tagFilled = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('input, textarea'));
      for (const el of candidates) {
        const ph = (el.getAttribute('placeholder') || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        if (ph.includes('choose a tag') || ph.includes('tag') || id.includes('tag') || aria.includes('tag')) {
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          el.setAttribute('data-tag', '1');
          return true;
        }
      }
      // As fallback: the most recently shown input (filter box) often first text input
      return false;
    });
  }

  if (tagFilled) {
    await page.focus('[data-tag="1"]');
    await page.click('[data-tag="1"]');
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('[data-tag="1"]', 'v2.0.0', { delay: 20 });
    await sleep(800);
    await page.keyboard.press('Enter'); // select "Create new tag: v2.0.0 on publish"
    await sleep(800);
    await page.evaluate(() => document.querySelectorAll('[data-tag="1"]').forEach(e => e.removeAttribute('data-tag')));
    console.log('[STEP 1] Entered v2.0.0 tag');
  } else {
    console.log('[WARN] Could not find tag input; trying direct keyboard approach');
  }

  await sleep(1500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/step1c-tag-filled.png`, fullPage: false });

  console.log('[STEP 1] Filling Release title');
  // Release title input - usually first large text input after tag
  let titleFilled = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
    for (const el of inputs) {
      if (el.type === 'hidden' || el.type === 'file') continue;
      const visible = el.offsetParent !== null || el.getClientRects().length > 0;
      if (!visible) continue;
      const ph = (el.getAttribute('placeholder') || '').toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const nm = (el.getAttribute('name') || '').toLowerCase();
      if (ph.includes('release title') || aria.includes('release title') || nm.includes('title') || ph.includes('标题')) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        el.setAttribute('data-title', '1');
        return true;
      }
    }
    // fallback: first visible non-tag input that's not tag
    return false;
  });

  if (!titleFilled) {
    // Try a more brute: find large text input that's empty-ish
    titleFilled = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      // pick first input that is visibly wide enough
      for (const el of inputs) {
        if (el.tagName === 'TEXTAREA') continue;
        const visible = el.offsetParent !== null || el.getClientRects().length > 0;
        if (!visible) continue;
        const w = el.getBoundingClientRect().width;
        if (w > 500 && (el.value || '').length < 3) {
          const type = (el.getAttribute('type') || 'text').toLowerCase();
          if (type === 'hidden' || type === 'file') continue;
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          el.setAttribute('data-title', '1');
          return true;
        }
      }
      return false;
    });
  }

  if (titleFilled) {
    await page.focus('[data-title="1"]');
    await page.click('[data-title="1"]');
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await page.type('[data-title="1"]', '🎉 v2.0.0 正式版 - Oracle + 达梦双语种速查', { delay: 5 });
    await page.evaluate(() => document.querySelectorAll('[data-title="1"]').forEach(e => e.removeAttribute('data-title')));
    console.log('[STEP 1] Filled release title');
  }

  await sleep(1000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/step1d-title-filled.png`, fullPage: false });

  console.log('[STEP 1] Filling release description (Markdown)');
  // Description textarea
  let descFilled = await page.evaluate(() => {
    const areas = Array.from(document.querySelectorAll('textarea'));
    for (const el of areas) {
      const visible = el.offsetParent !== null || el.getClientRects().length > 0;
      if (!visible) continue;
      const w = el.getBoundingClientRect().width;
      const h = el.getBoundingClientRect().height;
      if (w > 400 && h > 100) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        el.setAttribute('data-desc', '1');
        return true;
      }
    }
    // Fallback: any textarea with "Describe" placeholder/aria
    for (const el of areas) {
      const ph = (el.getAttribute('placeholder') || '').toLowerCase();
      if (ph.includes('describe') || ph.includes('描述')) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        el.setAttribute('data-desc', '1');
        return true;
      }
    }
    return false;
  });

  if (descFilled) {
    await page.focus('[data-desc="1"]');
    await page.click('[data-desc="1"]');
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('[data-desc="1"]', RELEASE_NOTES, { delay: 1 });
    await page.evaluate(() => document.querySelectorAll('[data-desc="1"]').forEach(e => e.removeAttribute('data-desc')));
    console.log('[STEP 1] Filled release notes');
  } else {
    console.log('[ERROR] Could not find description textarea');
  }

  await sleep(1500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/step1e-notes-filled.png`, fullPage: true });

  console.log('[STEP 1] Ensuring Set as the latest release checkbox is checked, then Publish');
  // Ensure "Set as the latest release" is checked (usually default)
  // Now click Publish release green button (scroll to bottom first)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(800);

  let publishClicked = false;
  const publishTexts = ['Publish release', '发布 releases', '发布 release'];
  for (const txt of publishTexts) {
    const found = await page.evaluate((t) => {
      const nodes = Array.from(document.querySelectorAll('button, [role="button"], summary, input[type="submit"]'));
      for (const n of nodes) {
        const visible = n.offsetParent !== null || n.getClientRects().length > 0;
        if (!visible) continue;
        const content = (n.innerText || n.value || n.textContent || '').trim();
        if (content.toLowerCase().includes(t.toLowerCase())) {
          const cls = (n.className || '').toString();
          const style = n.getAttribute('style') || '';
          if (content.length < 50) {
            n.scrollIntoView({ block: 'center', behavior: 'instant' });
            n.setAttribute('data-pub', '1');
            return true;
          }
        }
      }
      return false;
    }, txt);
    if (found) {
      console.log(`[STEP 1] Clicking Publish button via text "${txt}"`);
      await page.click('[data-pub="1"]', { delay: 50 }).catch(() => {});
      await page.evaluate(() => document.querySelectorAll('[data-pub="1"]').forEach(e => e.removeAttribute('data-pub')));
      publishClicked = true;
      break;
    }
  }

  if (!publishClicked) {
    // Fallback: click the green button that looks like publish (bottom right, class contains Button--primary etc.)
    const foundBtn = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('button, [role="button"]'));
      for (const n of nodes) {
        const rect = n.getBoundingClientRect();
        const visible = n.offsetParent !== null || n.getClientRects().length > 0;
        if (!visible) continue;
        const cls = (n.className || '').toString();
        const style = window.getComputedStyle ? window.getComputedStyle(n).backgroundColor : '';
        const content = (n.innerText || n.textContent || '').trim();
        if ((cls.includes('primary') || style.includes('rgb(46, 160, 67') || style.includes('rgb(35, 134, 54')) &&
            rect.width > 100 && content.length > 0) {
          n.scrollIntoView({ block: 'center', behavior: 'instant' });
          n.setAttribute('data-pub-green', '1');
          return { c: content, cls };
        }
      }
      return null;
    });
    if (foundBtn) {
      console.log('[STEP 1] Found primary button:', JSON.stringify(foundBtn));
      await page.click('[data-pub-green="1"]', { delay: 50 }).catch(() => {});
      await page.evaluate(() => document.querySelectorAll('[data-pub-green="1"]').forEach(e => e.removeAttribute('data-pub-green')));
      publishClicked = true;
    }
  }

  if (!publishClicked) {
    console.log('[ERROR] FAILED to find Publish button. Aborting step 1.');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step1e-publish-ERROR.png`, fullPage: true });
    process.exit(3);
  }

  console.log('[STEP 1] Publish clicked. Waiting for release page to load.');
  await sleep(7000);

  const newUrl = page.url();
  console.log(`[STEP 1] New URL: ${newUrl}`);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/step1-RELEASE-PUBLISHED.png`, fullPage: true });
  console.log(`[STEP 1 ✅ DONE] Screenshot saved: step1-RELEASE-PUBLISHED.png`);
  process.exit(0);
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
