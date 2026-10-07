import { readFileSync } from 'node:fs';

export const MEASURE_SOURCE = readFileSync(new URL('../measure.js', import.meta.url), 'utf8').trim();

/** An expression for Playwright's page.evaluate; wrap as `() => <expr>` for chrome-devtools evaluate_script. */
export const measureExpression = (input) => `(${MEASURE_SOURCE}\n)(${JSON.stringify(input)})`;
