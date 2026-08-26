import puppeteer from 'puppeteer-core';
import fs from 'fs';

const BROWSEUSE_CDP = 'http://127.0.0.1:8088/v1/cdp';
const SCREENSHOT_DIR = '/workspace/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const versionInfo = await fetch(`${BROWSEUSE_CDP}/json/version`).then(r => r.json());
  console.log('[INFO] Browser version:', JSON.stringify(versionInfo, null, 2));
  const browser = await puppeteer.connect({ browserWSEndpoint: versionInfo.webSocketDebuggerUrl, defaultViewport: { width: 1440, height: 900 } });

  const pages = await browser.pages();
  console.log(`[INFO] Total pages: ${pages.length}`);
  for (let i = 0; i < pages.length; i++) {
    console.log(`  [${i}] url=${pages[i].url()}  title=${await pages[i].title().catch(()=>'')}`);
  }

  // Select GitHub repo page or LOGIN page as the active one
  let page = null;
  for (let i = 0; i < pages.length; i++) {
    const u = pages[i].url();
    if (u.includes('github.com')) {
      page = pages[i];
      break;
    }
  }
  if (!page) page = pages[0];
  await page.bringToFront();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('[INFO] Active page URL:', page.url());

  // Navigate to GitHub LOGIN page if not already there (or if not logged in)
  if (!page.url().includes('github.com')) {
    console.log('[INFO] Not on GitHub. Navigating to GitHub LOGIN page');
    await page.goto('https://github.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
  } else {
    console.log('[INFO] Already on GitHub. Check current state');
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/step0-BROWSEUSE.png`, fullPage: true });
  console.log('[INFO] Screenshot saved: step0-BROWSEUSE.png');

  // Check Sign in button present
  const btn = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('a, button'));
    for (const n of nodes) {
      const txt = (n.innerText || n.textContent || '').trim();
      if ((txt === 'Sign in' || txt === 'Sign up') && n.offsetParent !== null) return { txt, href: n.href };
    }
    // Also check user avatar (logged in state)
    const imgs = Array.from(document.querySelectorAll('img'));
    for (const img of imgs) {
      const src = img.src || '';
      if (src.includes('avatars.githubusercontent.com') && img.offsetParent !== null) return { avatar: true, src };
    }
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    for (const b of buttons) {
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      if ((aria.includes('user') || aria.includes('account')) && b.offsetParent !== null) return { avatar: true, aria };
    }
    return null;
  });
  console.log('[CHECK] Login button or avatar:', JSON.stringify(btn));

  process.exit(0);
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
