import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('/workspace/extension/node_modules/playwright/index.js');
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'screenshots');
mkdirSync(out, { recursive: true });

const pages = ['index.html', 'terms.html', 'privacy.html', 'refund.html', 'contact.html'];
const base = process.env.DEWCUE_SITE || 'http://127.0.0.1:4173';

const browser = await chromium.launch({ headless: true });
const failures = [];
const probe = await browser.newPage();
await probe.goto(`${base}/terms.html`, { waitUntil: 'networkidle' });
const secret = (await probe.locator('.who dd').allInnerTexts()).filter((line) => !line.includes('hello@dewcue.com'));
await probe.close();
if (secret.length < 4) failures.push('terms identity block is incomplete');

for (const width of [1280, 390]) {
  const label = width === 1280 ? 'desktop' : 'mobile';
  const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 800 : 844 } });
  const page = await context.newPage();
  for (const file of pages) {
    const name = file.replace('.html', '');
    await page.goto(`${base}/${file}`, { waitUntil: 'networkidle' });
    const text = await page.locator('body').innerText();
    const storeHrefs = await page.locator('[data-store]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    if (storeHrefs.some((href) => href !== 'https://chromewebstore.google.com/detail/dewcue')) {
      failures.push(`${file} store link ${storeHrefs.join(',')}`);
    }
    const footer = await page.locator('.copy').innerText();
    if (footer !== '© 2026 Tanishkha. All rights reserved.') failures.push(`${file} footer ${footer}`);
    const legal = file === 'terms.html' || file === 'privacy.html';
    for (const word of secret) {
      const hit = text.includes(word);
      if (hit !== legal) failures.push(`${file} ${hit ? 'leaks' : 'missing'} ${word}`);
    }
    if (file === 'contact.html' && !text.includes('hello@dewcue.com')) failures.push('contact missing email');
    if (file === 'contact.html' && !text.includes('1–2 business days')) failures.push('contact missing response time');
    await page.screenshot({ path: join(out, `${name}-${label}.png`), fullPage: true });
    console.log('shot', name, label);
  }
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('screenshots ok');
