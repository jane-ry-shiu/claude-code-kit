import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureSheet } from '../lib/capture.mjs';
import { findPlaywright } from '../lib/playwright.mjs';
import { readPngSize } from '../lib/png-size.mjs';
import { renderSheetHtml } from '../lib/render.mjs';
import { normalizeSpec } from '../lib/spec.mjs';
import { makePng } from './helpers/make-png.mjs';

const from = process.env.PLAYWRIGHT_FROM ?? process.cwd();
const skip = findPlaywright(from) ? false : 'Playwright not found: set PLAYWRIGHT_FROM to a directory with node_modules/playwright';

function buildSheet(dir) {
  const png = makePng(join(dir, '截圖 一.png'), 400, 200);
  const sheet = normalizeSpec({ title: '標題', subtitle: '副標', columns: ['A'], rows: [[{ src: png, verdict: 'pass' }]] });
  const html = join(dir, 'sheet.html');
  writeFileSync(html, renderSheetHtml(sheet));
  return { png, html };
}

test('findPlaywright returns null when no node_modules above has it', () => {
  assert.equal(findPlaywright(mkdtempSync(join(tmpdir(), 'as-none-'))), null);
});

test('captures the sheet at device scale 2, from a path with spaces and Chinese characters', { skip }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'as cap 中文-'));
  const { html } = buildSheet(dir);
  const result = await captureSheet(html, join(dir, 'sheet.png'), { from });
  const size = readPngSize(result.out);
  assert.ok(Math.abs(size.width - result.width * 2) <= 2, `${size.width} vs ${result.width}`);
  assert.ok(Math.abs(size.height - result.height * 2) <= 2, `${size.height} vs ${result.height}`);
});

test('rejects with exit code 4 when an image does not load', { skip }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'as-broken-'));
  const { png, html } = buildSheet(dir);
  unlinkSync(png);
  await assert.rejects(captureSheet(html, join(dir, 'sheet.png'), { from }), (e) => e.exitCode === 4 && /截圖 一\.png/.test(e.message));
});

test('rejects with exit code 3 when Playwright cannot be found', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'as-nopw-'));
  await assert.rejects(captureSheet(join(dir, 'x.html'), join(dir, 'x.png'), { from: dir }), (e) => e.exitCode === 3);
});
