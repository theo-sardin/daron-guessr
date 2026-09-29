#!/usr/bin/env node
// Dev helper: screenshot a page with the preinstalled Chromium.
// Usage: node scripts/shoot.mjs <url> <out.png> [width=390] [height=844] [waitMs=1200] [--full]
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

const [url, out, w = '390', h = '844', wait = '1200', ...flags] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node scripts/shoot.mjs <url> <out.png> [width] [height] [waitMs] [--full]');
  process.exit(1);
}
const executablePath = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('socket.io') && errors.push(m.text()));
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out, fullPage: flags.includes('--full') });
await browser.close();
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
console.log('saved', out);
