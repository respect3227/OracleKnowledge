import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP_URL = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const versionInfo = await fetch(`${CDP_URL}/json/version`).then(r => r.json());
  const browser = await puppeteer.connect({ browserWSEndpoint: versionInfo.webSocketDebuggerUrl, defaultViewport: { width: 1440, height: 900 } });

  const pages = await browser.pages();
  let page;
  // Close any local app pages / blank pages we may have opened
  for (const p of pages) {
    const u = p.url();
    if (u.includes('about:blank') || u.includes(':3000') || u.includes('run-agent')) {
      await p.close().catch(() => {});
    }
  }
  const pages2 = await browser.pages();
  if (pages2.length === 0) {
    page = await browser.newPage();
  } else {
    page = pages2[0];
  }
  await page.setViewport({ width: 1440, height: 900 });
  await page.bringToFront();

  console.log('[INFO] Navigating to GitHub LOGIN page');
  await page.goto('https://github.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
  console.log('[INFO] URL:', page.url());
  console.log('[INFO] Title:', await page.title());
  await page.screenshot({ path: '/workspace/screenshots/step0-github-login-screen.png', fullPage: true });
  console.log('[INFO] Screenshot saved to step0-github-login-screen.png. Browser ready for user login.');
  process.exit(0);
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
