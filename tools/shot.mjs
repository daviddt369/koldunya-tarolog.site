// Скриншоты для проверки вёрстки: node tools/shot.mjs <ширина> <высота> <выход.png> [селектор|y] [--full]
import { chromium } from 'playwright-core';
const [w, h, out, target] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const full = process.argv.includes('--full');
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: +w < 800, isMobile: +w < 800 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => errors.push('reqfail: ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
await page.goto(process.env.URL || 'http://localhost:8090/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
if (target) {
  if (/^\d+$/.test(target)) await page.evaluate((y) => window.scrollTo(0, y), +target);
  else await page.locator(target).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(2800);
}
await page.screenshot({ path: out, fullPage: full });
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
