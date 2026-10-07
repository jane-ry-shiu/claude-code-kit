#!/usr/bin/env node
// Prints the chrome-devtools evaluate_script function for one measurement.
// Usage: node measure-expr.mjs '{"region":"#dialog","targets":[{"selector":"#save","n":1,"meaning":"step","note":"…"}]}'
import { measureExpression } from './lib/measure.mjs';

const [json] = process.argv.slice(2);
if (!json) {
  console.error('usage: node measure-expr.mjs \'<input JSON>\'');
  process.exit(2);
}
try {
  console.log(`() => ${measureExpression(JSON.parse(json))}`);
} catch (e) {
  console.error(`measure-expr: ${e.message}`);
  process.exit(1);
}
