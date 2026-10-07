import test from 'node:test';
import assert from 'node:assert/strict';
import { launchChrome } from '../lib/capture.mjs';
import { measureExpression } from '../lib/measure.mjs';
import { findPlaywright } from '../lib/playwright.mjs';

const playwright = findPlaywright(process.env.PLAYWRIGHT_FROM ?? process.cwd());
const skip = playwright ? false : 'Playwright not found: set PLAYWRIGHT_FROM';
const PAGE = `<body style="margin:0">
  <div id="region" style="position:absolute;left:50px;top:40px;width:300px;height:200px">
    <button id="a" style="position:absolute;left:10px;top:20px;width:80px;height:30px">A</button>
    <button class="twin" style="position:absolute;left:10px;top:100px;width:40px;height:20px">T1</button>
    <button class="twin" style="position:absolute;left:60px;top:100px;width:40px;height:20px">T2</button>
  </div></body>`;

async function withPage(fn) {
  const browser = await launchChrome(playwright.chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    await page.setContent(PAGE);
    return await fn(page);
  } finally {
    await browser.close();
  }
}

test('measureExpression is a self-contained expression', () => {
  assert.match(measureExpression({ region: null, targets: [] }), /^\(.*\)\(\{"region":null,"targets":\[\]\}\)$/s);
});

test('rects are relative to the region, in CSS px, and keep the target fields', { skip }, async () => {
  const result = await withPage((page) => page.evaluate(measureExpression({ region: '#region', targets: [{ selector: '#a', n: '1', meaning: 'step' }] })));
  assert.deepEqual(result.region, { width: 300, height: 200 });
  assert.deepEqual(result.targets[0], { selector: '#a', n: '1', meaning: 'step', rect: [10, 20, 80, 30] });
});

test('region null measures against the viewport', { skip }, async () => {
  const result = await withPage((page) => page.evaluate(measureExpression({ region: null, targets: [{ selector: '#a', meaning: 'focus' }] })));
  assert.deepEqual(result.targets[0].rect, [60, 60, 80, 30]);
});

test('a selector matching several elements is an error, not the first match', { skip }, async () => {
  await assert.rejects(withPage((page) => page.evaluate(measureExpression({ region: '#region', targets: [{ selector: '.twin', meaning: 'focus' }] }))), /target matches 2 elements: \.twin/);
});

test('a missing target is an error, not a silent skip', { skip }, async () => {
  await assert.rejects(withPage((page) => page.evaluate(measureExpression({ region: '#region', targets: [{ selector: '#nope', meaning: 'focus' }] }))), /target not found: #nope/);
});
