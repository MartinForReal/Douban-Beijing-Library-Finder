// Verify button placement + test a second real Douban book page.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const DIST = path.join(__dirname, '..', 'dist');

(async () => {
  const userData = path.join(__dirname, '.pw-real2-' + Date.now());
  const context = await chromium.launchPersistentContext(userData, { headless: false, viewport: { width: 1280, height: 900 }, args: ['--disable-extensions-except=' + DIST, '--load-extension=' + DIST] });
  const page = await context.newPage();
  const logs = [];
  page.on('pageerror', e => logs.push('pageerror: ' + e.message));

  console.log('=== BOOK 1: 基督山伯爵 (re-check placement) ===');
  await page.goto('https://book.douban.com/subject/1085860/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);
  const layout1 = await page.evaluate(() => {
    const btn = document.querySelector('.library-borrow-btn');
    const info = document.querySelector('#info');
    let placement = null;
    if (btn && info) {
      const isbnIndex = info.innerHTML.indexOf('ISBN'); // roughly: button should come right before/after ISBN line
      placement = 'btn inside #info=' + info.contains(btn) + ' | btn rect top=' + Math.round(btn.getBoundingClientRect().top) + ' | ISBN span exists=' + !!Array.from(info.querySelectorAll('span')).find(s => s.textContent.includes('ISBN'));
    }
    return { placement, btnText: btn && btn.textContent };
  });
  console.log(JSON.stringify(layout1));

  console.log('=== BOOK 2: 三体 ===');
  await page.goto('https://book.douban.com/subject/2567698/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('nav2 err', e.message));
  await page.waitForTimeout(6000);
  const r2 = await page.evaluate(() => {
    const btn = document.querySelector('.library-borrow-btn');
    const cont = document.querySelector('.library-borrow-container');
    return { title: (document.querySelector('h1 span') || {}).textContent || (document.querySelector('h1') || {}).textContent, btnText: btn ? btn.textContent : null, btnHref: btn ? btn.getAttribute('href') : null, btnBg: btn ? btn.style.backgroundColor : null, btnTitle: btn ? btn.getAttribute('title') : null, note: cont ? cont.textContent : null };
  });
  console.log(JSON.stringify(r2, null, 2));

  console.log('=== PAGE ERRORS ===');
  logs.forEach(l => console.log('  ' + l));

  await context.close();
  fs.rmSync(userData, { recursive: true, force: true });
  process.exit(0);
})().catch(e => { console.error('FATAL:', e && e.stack || e); process.exit(2); });
