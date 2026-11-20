import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'check-script.mjs');
const dir = mkdtempSync(join(tmpdir(), 'check-script-'));
test.after(() => rmSync(dir, { recursive: true, force: true }));

const run = (name, text) => {
  const file = join(dir, name);
  if (text !== undefined) writeFileSync(file, text);
  return spawnSync(process.execPath, [cli, file], { encoding: 'utf8' });
};

test('a clean script prints ok and exits 0', () => {
  const r = run('clean.md', '1. Catalog 是 Backstage 的首頁。\n2. 點左邊的 APIs。（點側邊欄 APIs）\n3. 這裡只是示範。\n');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'ok: 3 sentences');
});

test('a problem is printed with its sentence number and exits 1', () => {
  const r = run('filler.md', '1. Catalog 是首頁。\n2. 嗯，點左邊的 APIs。\n');
  assert.equal(r.status, 1);
  assert.equal(r.stdout.trim(), '2: filler 「嗯」');
});

test('a file with no numbered sentences exits 2', () => {
  const r = run('outline.md', '# 大綱\n## 開場\n- 觀眾學到 Backstage 是什麼\n');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no numbered sentences/);
});

test('a missing file exits 2', () => {
  const r = run('missing.md');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /missing\.md/);
});
