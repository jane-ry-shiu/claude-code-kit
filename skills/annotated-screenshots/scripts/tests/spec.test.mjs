import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeSpec, SpecError } from '../lib/spec.mjs';
import { makePng } from './helpers/make-png.mjs';

const dir = mkdtempSync(join(tmpdir(), 'as-spec-'));
const png = makePng(join(dir, 'shot.png'), 200, 100);
const base = (rows, extra = {}) => ({ title: 'T', subtitle: 'S', columns: ['A'], rows, ...extra });
const problemsOf = (spec) => {
  try { normalizeSpec(spec, { baseDir: dir }); } catch (e) { if (e instanceof SpecError) return e.problems; throw e; }
  return [];
};

test('normalizes a valid spec with layout defaults', () => {
  const sheet = normalizeSpec(base([[{ src: png }]]), { baseDir: dir });
  assert.equal(sheet.cellWidth, 520);
  assert.deepEqual(sheet.rows[0][0].css, { width: 200, height: 100 });
  assert.equal(normalizeSpec(base([[{ src: png }]], { layout: 'pair' }), { baseDir: dir }).cellWidth, 700);
});

test('resolves a relative src against baseDir', () => {
  assert.equal(normalizeSpec(base([[{ src: 'shot.png' }]]), { baseDir: dir }).rows[0][0].src, png);
});

test('a missing file is an error naming the file', () => {
  const problems = problemsOf(base([[{ src: join(dir, 'nope.png') }]]));
  assert.match(problems.join('\n'), /file not found: .*nope\.png/);
});

test('unreachable needs a reason and excludes src', () => {
  assert.deepEqual(problemsOf(base([[{ unreachable: '沒有 Done 按鈕' }]])), []);
  assert.match(problemsOf(base([[{ unreachable: ' ' }]])).join('\n'), /needs a reason/);
  assert.match(problemsOf(base([[{ src: png, unreachable: 'x' }]])).join('\n'), /not both/);
});

test('a rect outside the screenshot is an error, using pixelRatio', () => {
  const cell = (rect) => [[{ src: png, pixelRatio: 2, marks: [{ rect, meaning: 'focus' }] }]];
  assert.match(problemsOf(base(cell([90, 0, 20, 10]))).join('\n'), /falls outside the 100×50 screenshot/);
  assert.deepEqual(problemsOf(base(cell([80, 0, 20, 10]))), []);
});

test('unknown meanings and recoloured fixed colours are errors; a new meaning is allowed', () => {
  assert.match(problemsOf(base([[{ src: png, marks: [{ rect: [0, 0, 5, 5], meaning: 'warn' }] }]])).join('\n'), /unknown meaning "warn"/);
  const reused = { meanings: { warn: { color: '#16A34A', name: '綠', label: 'x' } } };
  assert.match(problemsOf(base([[{ src: png }]], reused)).join('\n'), /already has a fixed meaning/);
  const fresh = { meanings: { warn: { color: '#7c3aed', name: '紫', label: '待確認' } } };
  assert.deepEqual(problemsOf(base([[{ src: png, marks: [{ rect: [0, 0, 5, 5], meaning: 'warn' }] }]], fresh)), []);
});

test('duplicate number: two marks numbered 1 in one cell are rejected, naming the cell', () => {
  const marks = [{ rect: [0, 0, 5, 5], meaning: 'step', n: 1 }, { rect: [10, 10, 5, 5], meaning: 'step', n: '1' }];
  assert.match(problemsOf(base([[{ src: png, marks }]])).join('\n'), /rows\[0\]\[0\]: number 1 appears more than once/);
});

test('a non-PNG source is an error', () => {
  const fake = join(dir, 'fake.png');
  writeFileSync(fake, 'text');
  assert.match(problemsOf(base([[{ src: fake }]])).join('\n'), /not a PNG file/);
});

test('every problem is reported at once', () => {
  const problems = problemsOf({ columns: ['A', 'B'], rows: [[{ src: png }]], layout: 'poster' });
  assert.ok(problems.length >= 3, problems.join('\n'));
  assert.match(problems.join('\n'), /title is required/);
  assert.match(problems.join('\n'), /subtitle is required/);
  assert.match(problems.join('\n'), /layout must be one of/);
  assert.match(problems.join('\n'), /rows\[0\] must have 2 cells/);
});
