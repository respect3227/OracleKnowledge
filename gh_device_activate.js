import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP_URL = 'http://127.0.0.1:8088/v1/cdp';
const SCREENSHOT_DIR = '/workspace/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const versionInfo = await fetch(`${CDP_URL}/json/version`).then(r => r.json());
  const browser = await puppeteer.connect({ browserWSEndpoint: versionInfo.webSocketDebuggerUrl, defaultViewport: { width: 1440, height: 900 } });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  await page.bringToFront();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('[INFO] Navigate to GitHub device activation URL');
  await page.goto('https://github.com/login/device', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/step0-GITHUB-DEVICE-ACTIVATION.png`, fullPage: true });
  console.log(`[INFO] Screenshot saved: step0-GITHUB-DEVICE-ACTIVATION.png`);
  console.log(`[INFO] URL: ${page.url()}`);
  console.log(`[INFO] Title: ${await page.title()}`);

  // Try to find the activation code input and pre-focus (NOT filling to avoid credential typing)
  const codeInputSel = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    for (const el of inputs) {
      const ph = (el.getAttribute('placeholder') || '').toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      if (type === 'text' || ph.includes('code') || aria.includes('code') || id.includes('code')) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        el.setAttribute('data-gh-code', '1');
        return true;
      }
    }
    return false;
  });
  if (codeInputSel) {
    await page.focus('[data-gh-code="1"]').catch(() => {});
    await page.click('[data-gh-code="1"]').catch(() => {});
    console.log('[INFO] Clicked on code input. User needs to type: 630B-9DE1');
    await page.evaluate(() => document.querySelectorAll('[data-gh-code="1"]').forEach(e => e.removeAttribute('data-gh-code')));
  }

  process.exit(0);
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
