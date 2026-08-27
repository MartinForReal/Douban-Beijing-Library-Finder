// Verify the background.js md5 implementation against known RFC 1321 vectors.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const md5Src = fs.readFileSync(path.join(__dirname, '..', 'md5.js'), 'utf8');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.evaluate((md5Src) => { const s = document.createElement('script'); s.textContent = md5Src; document.body.appendChild(s); }, md5Src);
  await new Promise(r => setTimeout(r, 200));
  const r = await page.evaluate(() => ({ empty: md5(''), abc: md5('abc'), fox: md5('The quick brown fox jumps over the lazy dog'), msg: md5('message digest') }));
  const exp = { empty: 'd41d8cd98f00b204e9800998ecf8427e', abc: '900150983cd24fb0d6963f7d28e17f72', fox: '9e107d9d372bb6826bd81d3542a419d6', msg: 'f96b697d7cb7938d525a2f31aaf161d0' };
  let ok = true;
  for (const k of Object.keys(exp)) { const good = r[k] === exp[k]; if (!good) ok = false; console.log('MD5(' + k + ') =', r[k], good ? 'OK' : 'WRONG (expected ' + exp[k] + ')'); }
  console.log(ok ? 'MD5 IMPLEMENTATION OK' : 'MD5 MISMATCH');
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });