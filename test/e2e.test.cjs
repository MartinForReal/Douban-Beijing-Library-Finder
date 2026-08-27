// E2E test: load the built extension (dist) in a persistent Chromium context,
// navigate to a route-intercepted Douban book page, and verify the content script +
// background service worker round-trip injects the correct button.
// Requires an EXTENSION on Windows / headed mode (extensions need non-headless shell).
// Run: npm run build && node test/e2e.test.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIST = path.join(__dirname, '..', 'dist');
const FIXTURE = fs.readFileSync(path.join(__dirname, 'mock-douban.html'), 'utf8');

const API_OK = JSON.stringify({ success: true, data: {
  books: [{ id: 'e2e1', availableNumber: 2, availableLibs: ['libA'], ownerLibs: ['libA'] }],
  aggData: [{ lableCode: 'aggLibcode', labelValueList: [{ name: 'libA', label: '首都图书馆' }] }]
} });

(async () => {
  const userData = path.join(__dirname, '.pw-profile-' + Date.now());
  const context = await chromium.launchPersistentContext(userData, {
    headless: false,
    args: ['--disable-extensions-except=' + DIST, '--load-extension=' + DIST]
  });

  await context.route('https://book.douban.com/subject/**', route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: FIXTURE }).catch(() => {}));
  let apiHits = 0;
  await context.route('https://apps.jiatu.cloud/**', route => { apiHits++; route.fulfill({ status: 200, contentType: 'application/json', body: API_OK }).catch(() => {}); });

  let sw = null;
  try { sw = context.serviceWorkers()[0] || await new Promise(res => setTimeout(() => { res(context.serviceWorkers()[0] || null); }, 1500)); } catch (e) { console.log('service worker error:', e.message); }

  const page = await context.newPage();
  let button = null; const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  try { await page.goto('https://book.douban.com/subject/mock1/', { waitUntil: 'domcontentloaded', timeout: 15000 }); await page.waitForTimeout(1500); button = await page.$('.library-borrow-btn'); }
  catch (e) { errs.push('goto: ' + e.message); }

  let txt = null, bg = null;
  if (button) { txt = await button.textContent(); bg = await button.evaluate(el => el.style.backgroundColor); }
  console.log('SERVICE WORKER loaded:', !!sw);
  console.log('API route hits:', apiHits);
  console.log('BUTTON present:', !!button, txt ? '("' + txt + '")' : '');
  console.log('BUTTON bg:', bg);
  console.log('PAGE JS errors:', errs.length ? errs : 'none');

  await context.close();
  fs.rmSync(userData, { recursive: true, force: true });

  const pass = !!button && txt === '图书馆借阅' && apiHits >= 1;
  console.log(pass ? 'E2E OK' : 'E2E FAILED');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
