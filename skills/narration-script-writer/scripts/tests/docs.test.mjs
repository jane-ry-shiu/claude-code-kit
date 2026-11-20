import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('SKILL.md names every placeholder the reviewer prompt has', () => {
  const prompt = read('references/reviewer-prompt.md').match(/```text\n([\s\S]*?)```/)[1];
  const names = [...new Set(prompt.match(/\{[a-z_]+\}/g))];
  assert.ok(names.length >= 4, names.join(' '));
  const skill = read('SKILL.md');
  for (const n of names) assert.ok(skill.includes(n), `SKILL.md does not name ${n}`);
});
