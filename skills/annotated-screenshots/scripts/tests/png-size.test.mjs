import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readPngSize } from '../lib/png-size.mjs';
import { makePng } from './helpers/make-png.mjs';

const dir = mkdtempSync(join(tmpdir(), 'as-png-'));

test('reads width and height from the PNG header', () => {
  assert.deepEqual(readPngSize(makePng(join(dir, 'a.png'), 7, 5)), { width: 7, height: 5 });
});

test('rejects a file that is not a PNG', () => {
  const path = join(dir, 'fake.png');
  writeFileSync(path, 'hello, not an image');
  assert.throws(() => readPngSize(path), /not a PNG file/);
});
