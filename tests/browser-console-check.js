/**
 * Captures console errors when loading each page and during user interactions.
 * Run with: API server on :3001, Vite on :5173, then:
 *   node tests/browser-console-check.js
 */
const puppeteer = require('puppeteer');

const BASE = process.env.VITE_BASE || 'http://localhost:5173';
const PAGES = ['/', '/timeline', '/map', '/options', '/thresholds', '/scenarios', '/perspectives', '/market'];

async function main() {
  const browser = await puppeteer.launch({ headless: 'new' });
  let hasErrors = false;

  for (const path of PAGES) {
    const page = await browser.newPage();
    const errors = [];
    const warnings = [];

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') errors.push(text);
      if (type === 'warning') warnings.push(text);
    });
    page.on('pageerror', (err) => errors.push(`Uncaught: ${err.message}`));

    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1500));

      // Timeline: click first event to open CausalChainPanel
      if (path === '/timeline') {
        const eventLi = await page.$('li[class*="cursor-pointer"]');
        if (eventLi) {
          await eventLi.click();
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      // Map: click to trigger filters
      if (path === '/map') {
        const rect = await page.$('svg');
        if (rect) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } catch (e) {
      errors.push(`Page load failed: ${e.message}`);
    }

    if (errors.length > 0) {
      console.log(`\n${path} — ERRORS:`);
      errors.forEach((e) => console.log('  ', e));
      hasErrors = true;
    }
    if (warnings.length > 0) {
      console.log(`\n${path} — Warnings (${warnings.length}):`);
      warnings.slice(0, 5).forEach((w) => console.log('  ', w));
      if (warnings.length > 5) console.log('  ... and', warnings.length - 5, 'more');
    }
    if (errors.length === 0 && warnings.length === 0) {
      console.log(`${path} — OK`);
    }

    await page.close();
  }

  await browser.close();
  if (hasErrors) process.exit(1);
  console.log('\nNo console errors.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
