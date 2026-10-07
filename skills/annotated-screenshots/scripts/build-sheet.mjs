#!/usr/bin/env node
// Builds a sheet page and its companion text from a sheet spec.
// Usage: node build-sheet.mjs <spec.json> <out-base>   → <out-base>.html, <out-base>.md
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { renderCompanionText, renderSheetHtml } from './lib/render.mjs';
import { normalizeSpec, SpecError } from './lib/spec.mjs';

const [specPath, outBase] = process.argv.slice(2);
if (!specPath || !outBase) {
  console.error('usage: node build-sheet.mjs <spec.json> <out-base>');
  process.exit(2);
}
try {
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  const sheet = normalizeSpec(spec, { baseDir: dirname(resolve(specPath)) });
  writeFileSync(`${outBase}.html`, renderSheetHtml(sheet));
  writeFileSync(`${outBase}.md`, renderCompanionText(sheet));
  console.log(JSON.stringify({ html: `${outBase}.html`, text: `${outBase}.md` }));
} catch (e) {
  console.error(e instanceof SpecError ? e.message : `build-sheet failed: ${e.message}`);
  process.exit(1);
}
