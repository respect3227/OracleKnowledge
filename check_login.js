import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP_URL = 'http://127.0.0.1:9222';
const SCREENSHOT_DIR = '/workspace/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const versionInfo = await fetch(`${CDP_URL}/json/version`).then(r => r.json());
  const browser = await puppeteer.connect({ browserWSEndpoint: versionInfo.webSocketDebuggerUrl, defaultViewport: { width: 1440, height: 900 } });

  // List all tabs, find the one that has GitHub or just pick a fresh one
  const targets = await browser.pages();
  console.log('[INFO] Open tabs:');
  for (let i = 0; i < targets.length; i++) {
    console.log(`  [${i}] ${targets[i].url()}  --  ${await targets[i].title().catch(()=>'')}`);
  }

  // Pick a tab to use: the last one that isn't our local app
  let page = null;
  for (let i = targets.length - 1; i >= 0; i--) {
    const url = targets[i].url();
    if (!url.startsWith('http://run-agent') && !url.includes(':3000') && !url.includes('about:blank')) {
      page = targets[i];
      break;
    }
  }
  if (!page) page = targets[targets.length - 1] || await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('[INFO] Using page with URL:', page.url());

  // Navigate to GitHub repository releases page
  console.log('[CHECK] Navigate to GitHub repo to verify login status');
  await page.goto('https://github.com/respect3227/OracleKnowledge', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);

  const url = page.url();
  const title = await page.title();
  console.log(`[CHECK] URL: ${url}`);
  console.log(`[CHECK] Title: ${title}`);

  // Check for Sign in button (top-right)
  const signInPresent = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('a, button'));
    for (const n of nodes) {
      const txt = (n.innerText || n.textContent || '').trim();
      if ((txt === 'Sign in' || txt === 'Sign up') && n.offsetParent !== null) return { txt, url: window.location.href };
    }
    return null;
  });

  await page.screenshot({ path: `${SCREENSHOT_DIR}/step0-check-login-state.png`, fullPage: true });

  if (signInPresent) {
    console.log('[NOT LOGGED IN] Still sees sign in button:', signInPresent);
    process.exit(10);
  } else {
    // Check for avatar/profile in top right
    const avatar = await page.evaluate(() => {
      // User avatar is usually an img with a src that has "avatars.githubusercontent.com" OR a button with aria-label containing user menu
      const imgs = Array.from(document.querySelectorAll('img'));
      for (const img of imgs) {
        const src = img.src || '';
        if (src.includes('avatars.githubusercontent.com') && img.offsetParent !== null) return { avatar: true, src };
      }
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      for (const b of buttons) {
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        if ((aria.includes('user') || aria.includes('account') || aria.includes('settings')) && b.offsetParent !== null) return { avatar: true, aria };
      }
      return null;
    });
    console.log('[LOGIN STATUS] avatar/user-menu found:', avatar);
    console.log('[LOGIN STATUS] Screenshot saved: step0-check-login-state.png');
    process.exit(0);
  }
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
