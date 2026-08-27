// Functional test for the extension background service worker (background.js).
// Runs the script in a Chromium page with mocked chrome.runtime and mocked fetch,
// then drives the captured message listener. Run: node test/background.test.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const bgSrc = fs.readFileSync(path.join(ROOT, 'background.js'), 'utf8');
const md5Src = fs.readFileSync(path.join(ROOT, 'md5.js'), 'utf8');

let failures = 0, passes = 0;
function check(name, cond, extra) {
  if (cond) { passes++; console.log('  PASS  ' + name); }
  else { failures++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
}

async function runMessage(browser, request, apiResponses, fetchMode) {
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.evaluate(({ bgSrc, md5Src, apiResponses, fetchMode }) => {
    window.__fetchCalls = [];
    window.fetch = (url, opts) => {
      window.__fetchCalls.push({ url, opts });
      return new Promise((resolve, reject) => {
        if (fetchMode === 'network_error') { reject(new Error('TypeError: Failed to fetch')); return; }
        const key = window.__fetchCalls.length - 1;
        const resp = Array.isArray(apiResponses) ? apiResponses[Math.min(key, apiResponses.length - 1)] : apiResponses;
        if (resp && typeof resp === 'object' && resp.__reject) { reject(new Error(resp.__reject)); return; }
        const ok = resp && resp.__httpOk !== false;
        resolve({ ok, status: ok ? 200 : (resp && resp.__status || 500), json: () => Promise.resolve(resp && resp.__json || resp || {}) });
      });
    };
    window.__listener = null;
    window.chrome = { runtime: { onMessage: { addListener: (fn) => { window.__listener = fn; } } } };
    window.importScripts = () => {}; // worker-only API, no-op in a regular page
    const m = document.createElement('script'); m.textContent = md5Src; document.body.appendChild(m);
    setTimeout(() => {
      const s = document.createElement('script'); s.textContent = bgSrc; document.body.appendChild(s);
    }, 50);
  }, { bgSrc, md5Src, apiResponses, fetchMode });
  await new Promise(r => setTimeout(r, 200));
  await page.evaluate((request) => { window.__resolved = null; window.__listener(request, { tab: {} }, (v) => { window.__resolved = v; }); }, request);
  await new Promise(r => setTimeout(r, 300));
  const result = await page.evaluate(() => window.__resolved);
  const fetchCalls = await page.evaluate(() => window.__fetchCalls);
  await page.close();
  return { result, fetchCalls };
}

(async () => {
  const browser = await chromium.launch();

  console.log('\n[BG 1] checkLibrary returns available books');
  {
    const apiResp = { success: true, data: { books: [{ id: 'bk1', availableNumber: 2, availableLibs: ['libA'], ownerLibs: ['libA'] }], aggData: [{ lableCode: 'aggLibcode', labelValueList: [{ name: 'libA', label: '首都图书馆' }] }] } };
    const { result, fetchCalls } = await runMessage(browser, { action: 'checkLibrary', isbn: '9787536692930' }, apiResp, 'ok');
    check('hasBook true', result.hasBook === true, JSON.stringify(result));
    check('available true', result.available === true);
    check('POST to apps.jiatu.cloud/client/book/search', fetchCalls.length >= 1 && fetchCalls[0].url === 'https://apps.jiatu.cloud/client/book/search', JSON.stringify(fetchCalls));
    const reqBody = fetchCalls.length >= 1 && fetchCalls[0].opts ? JSON.parse(fetchCalls[0].opts.body) : {};
    check('request body has libcode/sign/salt/timestamp/bizParam', ['libcode','channel','sign','salt','timestamp','bizParam'].every(k => k in reqBody), JSON.stringify(reqBody));
    check('sign is a 32-char hex', typeof reqBody.sign === 'string' && /^[0-9a-f]{32}$/.test(reqBody.sign), reqBody.sign);
    check('availableCopies 2', result.availableCopies === 2, JSON.stringify(result));
    check('library name resolved 首都图书馆', Array.isArray(result.libraries) && result.libraries[0].name === '首都图书馆', JSON.stringify(result.libraries));
    check('message mentions 可借', result.message && result.message.includes('可借'), result.message);
  }

  console.log('\n[BG 2] checkLibrary - ownerLib only, no available copies');
  {
    const r2 = (await runMessage(browser, { action: 'checkLibrary', isbn: 'X' }, { success: true, data: { books: [{ id: 'bk2', availableNumber: 0, availableLibs: [], ownerLibs: ['libB'] }], aggData: [{ lableCode: 'aggLibcode', labelValueList: [{ name: 'libB', label: '海淀馆' }] }] } }, 'ok')).result;
    check('hasBook true', r2.hasBook === true);
    check('available false', r2.available === false, JSON.stringify(r2));
    check('message says 无可借', r2.message && r2.message.includes('无可借'), r2.message);
  }

  console.log('\n[BG 3] checkLibrary empty books');
  {
    const r3 = (await runMessage(browser, { action: 'checkLibrary', isbn: 'X' }, { success: true, data: { books: [], aggData: [] } }, 'ok')).result;
    check('hasBook false', r3.hasBook === false);
    check('message 图书馆暂无此书', r3.message === '图书馆暂无此书', r3.message);
  }

  console.log('\n[BG 4] checkLibrary API says success:false');
  {
    const r4 = (await runMessage(browser, { action: 'checkLibrary', isbn: 'X' }, { success: false, msg: '查询失败' }, 'ok')).result;
    check('hasBook false', r4.hasBook === false);
    check('message returned', r4.message === '查询失败', r4.message);
  }

  console.log('\n[BG 5] checkLibrary network error');
  {
    const r5 = (await runMessage(browser, { action: 'checkLibrary', isbn: 'X' }, null, 'network_error')).result;
    check('error surfaced', r5 && r5.error, JSON.stringify(r5));
  }

  console.log('\n[BG 6] searchByTitle found');
  {
    const s6 = (await runMessage(browser, { action: 'searchByTitle', title: '三体' }, { success: true, data: { books: [{ id: 's1' }] } }, 'ok')).result;
    check('found true', s6.found === true, JSON.stringify(s6));
    check('searchUrl includes title', s6.searchUrl && s6.searchUrl.includes(encodeURIComponent('三体')), s6.searchUrl);
  }

  console.log('\n[BG 7] searchByTitle not found');
  {
    const s7 = (await runMessage(browser, { action: 'searchByTitle', title: '三体' }, { success: true, data: { books: [] } }, 'ok')).result;
    check('found false', s7.found === false, JSON.stringify(s7));
  }

  console.log('\nRESULT: ' + passes + ' passed, ' + failures + ' failed');
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST ERROR:', e); process.exit(2); });