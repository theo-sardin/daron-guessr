// Temporary QA script (scratch): measures the mode step layout.
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
const OUT = process.argv[2];
const base = process.argv[3] ?? 'http://localhost:5173';
const executablePath = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await chromium.launch({ executablePath });
const sizes = [[390, 844], [360, 640], [320, 568], [768, 1024], [1280, 800], [1024, 700]];
for (const lang of ['en', 'fr']) {
  for (const variant of ['mode-step', 'mode-picked']) {
    for (const [w, h] of sizes) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${base}/__preview/home/${variant}?lang=${lang}`);
      await page.waitForTimeout(1800);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => {
        const r = (el) => (el ? el.getBoundingClientRect() : null);
        const q = (s) => document.querySelector(s);
        const header = r(q('header'));
        const bar = [...document.querySelectorAll('div.fixed')].map((d) => d.getBoundingClientRect()).find((b) => b.bottom >= innerHeight - 1 && b.top > 0);
        const btn = r([...document.querySelectorAll('button')].find((b) => /Create the room|Créer le salon/.test(b.textContent)));
        const later = [...document.querySelectorAll('section p')].pop();
        const laterR = r(later);
        const radios = [...document.querySelectorAll('[role=radiogroup] [role=radio]')].slice(0, 5).map((b) => b.getBoundingClientRect());
        // Any element wider than the viewport / text clipped
        const over = [...document.querySelectorAll('section *')].filter((e) => {
          const b = e.getBoundingClientRect();
          return b.width > 0 && (b.right > innerWidth + 0.5 || b.left < -0.5);
        }).map((e) => e.className?.toString().slice(0, 60) + ' :: ' + e.textContent.slice(0, 30));
        const clipped = [...document.querySelectorAll('section span, section p, section h1')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map((e) => e.textContent.slice(0, 40));
        return {
          scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
          headerBottom: header?.bottom, barTop: bar?.top, btnTop: btn?.top, btnBottom: btn?.bottom,
          laterBottom: laterR?.bottom, laterText: later?.textContent,
          cardsVisibleTop: radios.filter((b) => b.top >= 0 && b.bottom <= (btn?.top ?? innerHeight)).length,
          over: over.slice(0, 5), clipped: clipped.slice(0, 5),
          reactionBtn: !!document.querySelector('[aria-label*="eaction" i]'),
        };
      });
      console.log(lang, variant, `${w}x${h}`, JSON.stringify(m), errors.length ? 'ERR ' + errors.join('|') : '');
      if (OUT) await page.screenshot({ path: `${OUT}/${variant}-${lang}-${w}-bottom.png` });
      await page.close();
    }
  }
}
await browser.close();
