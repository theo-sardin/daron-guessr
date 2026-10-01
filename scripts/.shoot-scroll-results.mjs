// temp helper (results agent): scroll through a page, one screenshot per viewport.
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
const [url, prefix, w = '390', h = '844', n = '6'] = process.argv.slice(2);
const executablePath = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() !== 'log' && m.type() !== 'debug' && m.type() !== 'info' && !m.text().includes('socket.io') && errors.push(m.type() + ': ' + m.text()));
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5500);
const total = await page.evaluate(() => document.documentElement.scrollHeight);
const sw = await page.evaluate(() => document.documentElement.scrollWidth);
console.log('height', total, 'scrollWidth', sw);
for (let i = 0; i < +n; i++) {
  const y = i * (+h - 120);
  if (i > 0 && y >= total - 40) break;
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${prefix}-${i}.png` });
}
await browser.close();
if (errors.length) console.log(errors.slice(0, 8).join('\n'));
