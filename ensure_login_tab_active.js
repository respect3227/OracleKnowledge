import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP_URL = 'http://127.0.0.1:9222';
const REPO = 'https://github.com/respect3227/OracleKnowledge';
const SCREENSHOT_DIR = '/workspace/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const versionInfo = await fetch(`${CDP_URL}/json/version`).then(r => r.json());
  const browser = await puppeteer.connect({ browserWSEndpoint: versionInfo.webSocketDebuggerUrl, defaultViewport: { width: 1440, height: 900 } });

  // 清理无关页面,只留 GitHub 页面/新页面
  const pages = await browser.pages();
  for (const p of pages) {
    const u = p.url();
    if (u.includes(':3000') || u.includes('run-agent')) {
      try { await p.close(); } catch (e) {}
    }
  }
  const pages2 = await browser.pages();
  const page = pages2[0] || await browser.newPage();
  await page.bringToFront();
  await page.setViewport({ width: 1440, height: 900 });

  // 直接打开 GitHub LOGIN 页并截图
  console.log('[INFO] Open login page as foreground tab');
  await page.goto('https://github.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);

  // 检查 DOM 状态并把 login 输入框聚焦
  await page.screenshot({ path: `${SCREENSHOT_DIR}/step0-FINAL-LOGIN-PAGE.png`, fullPage: true });
  console.log('[INFO] LOGIN PAGE loaded and focused. Screenshot saved:', `${SCREENSHOT_DIR}/step0-FINAL-LOGIN-PAGE.png`);
  console.log('[INFO] Please do the login from the browser user control now.');

  // 同时 dump 一下所有 tab 列表
  const allPages = await browser.pages();
  console.log('[INFO] Current tabs:');
  for (let i = 0; i < allPages.length; i++) {
    console.log(`  [${i}] ${allPages[i].url()}  title=${await allPages[i].title().catch(()=>'')}`);
  }

  process.exit(0);
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
