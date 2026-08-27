// Install + test the extension against the REAL Douban book page.
// Loads dist/ as an unpacked extension in a headed Chromium persistent profile,
// navigates to the target book page, and reports the extension's behavior.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIST = path.join(__dirname, '..', 'dist');

(async () => {
  const userData = path.join(__dirname, '.pw-real-' + Date.now());
  const context = await chromium.launchPersistentContext(userData, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-extensions-except=' + DIST, '--load-extension=' + DIST]
  });

  const page = await context.newPage();
  const logs = [];
  const errors = [];
  const apiRequests = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  // Watch the service worker network calls to the library API
  let sw = null;
  try { sw = context.serviceWorkers()[0]; } catch (e) {}
  // context.route with a callback clones requests for the target API (read-only, don't intercept)
  context.on('request', req => {
    if (req.url().includes('jiatu.cloud')) {
      apiRequests.push({ url: req.url(), method: req.method() });
    }
  });

  console.log('Extension service worker present:', !!sw);
  console.log('Navigating to https://book.douban.com/subject/1085860/ ...');
  let navErr = null;
  try {
    await page.goto('https://book.douban.com/subject/1085860/?icn=index-book250-subject', { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (e) { navErr = e.message; }
  await page.waitForTimeout(6000);

  // Read the injected button (the extension adds it after the ISBN span)
  const result = await page.evaluate(() => {
    const btn = document.querySelector('.library-borrow-btn');
    const cont = document.querySelector('.library-borrow-container');
    return {
      title: document.querySelector('h1 span[property="v:itemreviewed"]') ? document.querySelector('h1 span[property="v:itemreviewed"]').textContent.trim() : (document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : null),
      hasISBN: (document.querySelector('#info') ? document.querySelector('#info').textContent.includes('ISBN') : false),
      btnText: btn ? btn.textContent : null,
      btnHref: btn ? btn.getAttribute('href') : null,
      btnBg: btn ? btn.style.backgroundColor : null,
      btnTitle: btn ? btn.getAttribute('title') : null,
      charging: cont ? cont.innerHTML : null
    };
  });

  const shotPath = path.join(__dirname, '..', 'real-douban-test.png');
  try { await page.screenshot({ path: shotPath, fullPage: true }); } catch (e) { console.log('screenshot err', e.message); }

  console.log('NAV ERROR:', navErr || 'none');
  console.log('=== EXTENSION STATE ===');
  console.log(JSON.stringify(result, null, 2));
  console.log('=== SERVICE WORKER API REQUESTS ===');
  console.log(JSON.stringify(apiRequests, null, 2));
  console.log('=== PAGE JS ERRORS (' + errors.length + ') ===');
  errors.forEach(e => console.log('  ' + e));
  console.log('=== KEY OWN CONSOLE LOGS ===');
  logs.filter(l => /豆瓣|图书馆|ISBN|借阅|错误|error/i.test(l)).slice(0, 20).forEach(l => console.log('  ' + l));
  console.log('screenshot saved to', shotPath);

  await context.close();
  fs.rmSync(userData, { recursive: true, force: true });
  process.exit(0);
})().catch(e => { console.error('FATAL:', e && e.stack || e); process.exit(2); });
