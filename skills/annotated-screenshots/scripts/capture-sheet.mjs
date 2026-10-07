#!/usr/bin/env node
// Screenshots a built sheet page at device scale 2.
// Usage: PLAYWRIGHT_FROM=<dir with node_modules/playwright> node capture-sheet.mjs <sheet.html> <out.png>
// Exit: 0 ok · 2 usage · 3 Playwright not found (use references/chrome-devtools.md) · 4 an image did not load
import { captureSheet } from './lib/capture.mjs';

const [htmlPath, outPath] = process.argv.slice(2);
if (!htmlPath || !outPath) {
  console.error('usage: node capture-sheet.mjs <sheet.html> <out.png>');
  process.exit(2);
}
try {
  console.log(JSON.stringify(await captureSheet(htmlPath, outPath)));
} catch (e) {
  console.error(`capture-sheet: ${e.message}`);
  process.exit(e.exitCode ?? 1);
}
