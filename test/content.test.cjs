// Functional test for the extension content script (content.js).
// Loads realistic Douban HTML with a stubbed chrome.runtime.sendMessage and
// asserts the borrow button for each scenario. Run: node test/content.test.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FIXTURE = path.join(__dirname, 'mock-douban.html');
const contentSrc = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');

let failures = 0, passes = 0;
function check(name, cond, extra) {
  if (cond) { passes++; console.log('  PASS  ' + name); }
  else { failures++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
}

async function runScenario(browser, apiResult, titleResult) {
  const page = await browser.newPage();
  await page.goto('file://' + FIXTURE);
  await page.evaluate(({ contentSrc, apiResult, titleResult }) => {
    window.__calls = [];
    window.chrome = { runtime: { sendMessage: (msg) => {
      window.__calls.push(msg);
      if (msg.action === 'checkLibrary') return Promise.resolve(apiResult);
      if (msg.action === 'searchByTitle') return Promise.resolve(titleResult);
      return Promise.resolve({});
    } } };
    const s = document.createElement('script'); s.textContent = contentSrc; document.body.appendChild(s);
  }, { contentSrc, apiResult, titleResult });
  await new Promise(r => setTimeout(r, 300));
  const state = await page.evaluate(() => {
    const btn = document.querySelector('.library-borrow-btn');
    const cont = document.querySelector('.library-borrow-container');
    const other = cont ? Array.from(cont.querySelectorAll('span')).find(x => x !== btn) : null;
    return {
      btnText: btn ? btn.textContent : null,
      btnHref: btn ? btn.getAttribute('href') : null,
      btnBg: btn ? btn.style.backgroundColor : null,
      availText: other ? other.textContent : null,
      btnTitle: btn ? btn.getAttribute('title') : null,
      calls: window.__calls
    };
  });
  await page.close();
  return state;
}

(async () => {
  const browser = await chromium.launch();

  console.log('\n[Scenario 1] Book available at library');
  {
    const st = await runScenario(browser,
      { available: true, hasBook: true,
        detailUrl: 'https://bjyth.jiatu.cloud/yuntu-pc/book/detail?id=book1',
        availableCopies: 3, totalCopies: 5,
        libraries: [{ name: '首都图书馆', available: true, availableCount: 3 }] },
      { found: true, searchUrl: 'https://bjyth.jiatu.cloud/search?word=三体' });
    const checkCall = st.calls && st.calls.find(c => c.action === 'checkLibrary');
    check('checkLibrary sent with extracted ISBN', checkCall && checkCall.isbn === '9787536692930', JSON.stringify(st.calls));
    check('button text = 图书馆借阅', st.btnText === '图书馆借阅', 'text=' + st.btnText);
    check('href = detail page', st.btnHref === 'https://bjyth.jiatu.cloud/yuntu-pc/book/detail?id=book1', 'href=' + st.btnHref);
    check('background = #37a', st.btnBg === 'rgb(51, 119, 170)', 'bg=' + st.btnBg);
    check('shows (可借3本)', st.availText && st.availText.includes('可借3本'), 'avail=' + st.availText);
    check('tooltip lists 首都图书馆', st.btnTitle && st.btnTitle.includes('首都图书馆'), 'title=' + st.btnTitle);
  }

  console.log('\n[Scenario 2] Has book but all checked out');
  {
    const st = await runScenario(browser,
      { available: false, hasBook: true,
        detailUrl: 'https://bjyth.jiatu.cloud/yuntu-pc/book/detail?id=2',
        availableCopies: 0, totalCopies: 2,
        libraries: [{ name: '朝阳区图书馆', available: false, availableCount: 0 }] },
      { found: false });
    check('button text = 图书馆查看', st.btnText === '图书馆查看', 'text=' + st.btnText);
    check('shows (已借完)', st.availText && st.availText.includes('已借完'), 'avail=' + st.availText);
  }

  console.log('\n[Scenario 3] ISBN not found but similar book by title');
  {
    const st = await runScenario(browser,
      { available: false, hasBook: false, searchUrl: 'https://bjyth.jiatu.cloud/search?word=9787' },
      { found: true, searchUrl: 'https://bjyth.jiatu.cloud/search?word=三体' });
    check('button text = 搜索同名图书', st.btnText === '搜索同名图书', 'text=' + st.btnText);
    check('button bg = orange', st.btnBg === 'rgb(224, 144, 21)', 'bg=' + st.btnBg);
    check('shows (ISBN未匹配...)', st.availText && st.availText.includes('ISBN未匹配'), 'avail=' + st.availText);
    check('searchByTitle sent with title', st.calls.some(c => c.action === 'searchByTitle' && c.title === '三体'), JSON.stringify(st.calls));
  }

  console.log('\n[Scenario 4] No book found at all');
  {
    const st = await runScenario(browser,
      { available: false, hasBook: false, searchUrl: 'https://bjyth.jiatu.cloud/search?word=9787' },
      { found: false });
    check('button text = 未找到此书', st.btnText === '未找到此书', 'text=' + st.btnText);
  }

  console.log('\n[Scenario 5] No ISBN in page -> no button');
  {
    const page = await browser.newPage();
    await page.setContent('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><h1><span property="v:itemreviewed">X</span></h1><div id="info"><span> 不含ISBN </span></div></body></html>', { waitUntil: 'domcontentloaded' });
    await page.evaluate((contentSrc) => {
      window.chrome = { runtime: { sendMessage: () => Promise.resolve({}) } };
      const s = document.createElement('script'); s.textContent = contentSrc; document.body.appendChild(s);
    }, contentSrc);
    await new Promise(r => setTimeout(r, 300));
    check('no borrow button injected', (await page.evaluate(() => !!document.querySelector('.library-borrow-btn'))) === false);
    await page.close();
  }

  console.log('\nRESULT: ' + passes + ' passed, ' + failures + ' failed');
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST ERROR:', e); process.exit(2); });
