import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeSpec } from '../lib/spec.mjs';
import { legendItems, noteLines, renderCompanionText, renderSheetHtml, usedMeanings } from '../lib/render.mjs';
import { makePng } from './helpers/make-png.mjs';

const dir = mkdtempSync(join(tmpdir(), 'as-render-'));
const png = makePng(join(dir, 'shot.png'), 400, 200);
const sheetOf = (spec) => normalizeSpec({ title: 'T', subtitle: 'S', ...spec }, { baseDir: dir });

test('the legend lists only meanings that are drawn', () => {
  const sheet = sheetOf({ columns: ['A'], rows: [[{ src: png, verdict: 'pass', marks: [{ rect: [0, 0, 10, 10], meaning: 'focus' }] }]] });
  assert.deepEqual(usedMeanings(sheet), ['pass', 'focus']);
  assert.ok(!renderSheetHtml(sheet).includes('不符預期'));
});

test('an unreachable cell shows its reason and adds the grey legend entry', () => {
  const sheet = sheetOf({ columns: ['A', 'B'], rows: [[{ src: png }, { unreachable: '沒有 Done 按鈕' }]] });
  assert.deepEqual(legendItems(sheet).map((l) => l.key), ['unreachable']);
  assert.match(renderSheetHtml(sheet), /這個條件到不了：沒有 Done 按鈕/);
});

test('a number repeated across cells names its column; a unique one does not', () => {
  const sheet = sheetOf({
    layout: 'pair',
    columns: ['改動前', '改動後'],
    rows: [[
      { src: png, marks: [{ rect: [0, 0, 10, 10], meaning: 'fail', n: 1, note: '字串被切掉' }, { rect: [50, 50, 10, 10], meaning: 'focus', n: 2, note: '另一處' }] },
      { src: png, marks: [{ rect: [0, 0, 10, 10], meaning: 'pass', n: 1, note: '完整顯示' }] },
    ]],
  });
  assert.deepEqual(noteLines(sheet), ['1 （改動前）字串被切掉', '1 （改動後）完整顯示', '2 另一處']);
});

test('escape: HTML-special characters in title and notes are shown literally', () => {
  const sheet = sheetOf({ title: '<b>A & "B"</b>', columns: ['A'], rows: [[{ src: png, marks: [{ rect: [0, 0, 10, 10], meaning: 'step', n: 1, note: "x<y & 'z'" }] }]] });
  const html = renderSheetHtml(sheet);
  assert.ok(!html.includes('<b>A'));
  assert.ok(html.includes('&lt;b&gt;A &amp; &quot;B&quot;&lt;/b&gt;'));
  assert.ok(html.includes('x&lt;y &amp; &#39;z&#39;'));
});

test('pixelRatio 2: boxes land on the measured element at the displayed scale', () => {
  const big = makePng(join(dir, 'big.png'), 1040, 600);
  const sheet = sheetOf({ columns: ['A'], rows: [[{ src: big, pixelRatio: 2, marks: [{ rect: [100, 50, 40, 20], meaning: 'focus' }] }]] });
  assert.match(renderSheetHtml(sheet), /class="box" style="left:97px;top:47px;width:46px;height:26px/);
});

test('crop shows only that part, at most at the screenshot\'s own resolution, with marks moved into it', () => {
  const sheet = sheetOf({ columns: ['A'], rows: [[{ src: png, crop: [100, 50, 200, 100], marks: [{ rect: [150, 70, 20, 10], meaning: 'focus' }] }]] });
  const html = renderSheetHtml(sheet);
  assert.match(html, /class="pic" style="width:200px;height:100px/);
  assert.match(html, /<img [^>]*style="left:-100px;top:-50px;width:400px;height:200px"/);
  assert.match(html, /class="box" style="left:47px;top:17px;width:26px;height:16px/);
});

test('a crop of a device-scale-2 screenshot is enlarged to the cell width', () => {
  const big = makePng(join(dir, 'big2.png'), 1040, 600);
  const sheet = sheetOf({ columns: ['A'], rows: [[{ src: big, pixelRatio: 2, crop: [100, 50, 260, 100] }]] });
  assert.match(renderSheetHtml(sheet), /class="pic" style="width:520px;height:200px/);
});

test('an uncropped screenshot narrower than the cell is not enlarged', () => {
  const sheet = sheetOf({ columns: ['A'], rows: [[{ src: png }]] });
  assert.match(renderSheetHtml(sheet), /class="pic" style="width:400px;height:200px/);
});

test('a #10 badge is wider than a single-digit one', () => {
  const sheet = sheetOf({ columns: ['A'], rows: [[{ src: png, marks: [{ rect: [100, 100, 50, 20], meaning: 'focus', n: '#10' }] }]] });
  assert.match(renderSheetHtml(sheet), /class="badge" style="[^"]*width:29px/);
});

test('the numbers key explains what numbers refer to', () => {
  const withNotes = sheetOf({ columns: ['A'], rows: [[{ src: png, marks: [{ rect: [0, 0, 10, 10], meaning: 'step', n: 1, note: 'n' }] }]] });
  assert.match(renderSheetHtml(withNotes), /編號對應下方說明/);
  const noNotes = sheetOf({ columns: ['A'], rows: [[{ src: png, marks: [{ rect: [0, 0, 10, 10], meaning: 'focus', n: '#10' }] }]] });
  assert.match(renderSheetHtml(noNotes), /編號對應文字說明裡的同一編號/);
  const custom = sheetOf({ numbersRefer: '編號對應驗證清單項目', columns: ['A'], rows: [[{ src: png, marks: [{ rect: [0, 0, 10, 10], meaning: 'focus', n: '#10' }] }]] });
  assert.match(renderSheetHtml(custom), /編號對應驗證清單項目/);
});

test('companion text carries the same note lines and the legend', () => {
  const sheet = sheetOf({ subtitle: 'S', columns: ['A'], rows: [[{ src: png, verdict: 'pass', marks: [{ rect: [0, 0, 10, 10], meaning: 'step', n: 1, note: '點這裡' }] }]] });
  assert.equal(renderCompanionText(sheet), 'T\nS\n\n1 點這裡\n\n圖例：綠框＝符合預期；橘框＝操作步驟\n');
});
