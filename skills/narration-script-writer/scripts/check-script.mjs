#!/usr/bin/env node
// node check-script.mjs <script.md>
// Prints "N: <problem>" per mechanical problem (exit 1), or "ok: <k> sentences" (exit 0).
// Exit 2 when the file cannot be read or has no numbered sentences.
import { readFileSync } from 'node:fs';
import { parseScript, lintScript } from './lib/lint.mjs';

const file = process.argv[2];
if (!file || process.argv.length > 3) {
  console.error('usage: node check-script.mjs <script.md>');
  process.exit(2);
}
let md;
try {
  md = readFileSync(file, 'utf8');
} catch (e) {
  console.error(`cannot read ${file}: ${e.message}`);
  process.exit(2);
}
const sentences = parseScript(md);
if (!sentences.length) {
  console.error(`no numbered sentences in ${file} (expected lines like "1. 旁白（畫面動作）")`);
  process.exit(2);
}
const problems = lintScript(md);
for (const p of problems) console.log(`${p.n}: ${p.problem}`);
if (problems.length) process.exit(1);
console.log(`ok: ${sentences.length} sentences`);
