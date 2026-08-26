import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CDP_URL = 'http://127.0.0.1:9222';
const REPO_URL = 'https://github.com/respect3227/OracleKnowledge';
const SCREENSHOT_DIR = '/workspace/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const versionInfo = await fetch(`${CDP_URL}/json/version`).then(r => r.json());
  const browserWSEndpoint = versionInfo.webSocketDebuggerUrl;
  const browser = await puppeteer.connect({ browserWSEndpoint, defaultViewport: { width: 1440, height: 900 } });
  console.log('[INFO] Connected to browser');

  const pages = await browser.pages();
  let page = pages[0];
  if (!page) page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('[STEP 0] Navigate to repository and check login');
  await page.goto(REPO_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);

  const url = page.url();
  const title = await page.title();
  console.log(`[INFO] URL after navigation: ${url}`);
  console.log(`[INFO] Page title: ${title}`);

  const isLoginPage = /login|sign\s*in|登录/i.test(url) || /login|sign\s*in/i.test(title) || /Sign in to GitHub/i.test(await page.content().catch(() => ''));

  if (isLoginPage) {
    console.log('[LOGIN] Login page detected. Taking screenshot of login state...');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step0-login-page.png`, fullPage: true });
    console.log('[LOGIN_REQUIRED] Please log in to GitHub manually. Check the browser.');
    console.log('[LOGIN_REQUIRED] Screenshot saved: step0-login-page.png');
    process.exit(2);
  } else {
    console.log('[INFO] Already logged in or repo page accessible.');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step0-repo-page-before.png`, fullPage: true });
  }

  // Check if it's really the repo page (not 404 or login)
  const content = await page.content();
  const hasRepoContent = /OracleKnowledge|respect3227|Repository/i.test(content);
  if (!hasRepoContent) {
    console.log('[WARN] Page might not be repo content. Dumping:');
    console.log('  title:', title);
    console.log('  url:', url);
  }

  console.log('[STEP 1 COMPLETE CHECKPOINT] Repo page loaded.');
  process.exit(0);
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
