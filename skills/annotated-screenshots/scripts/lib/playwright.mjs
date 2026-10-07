import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const PACKAGES = Object.freeze(['playwright', 'playwright-core']);

/** Loads Playwright from the nearest node_modules at or above startDir; null when there is none. */
export function findPlaywright(startDir) {
  const dir = resolve(startDir);
  const name = PACKAGES.find((p) => existsSync(join(dir, 'node_modules', p, 'package.json')));
  if (name) return createRequire(join(dir, 'package.json'))(name);
  const parent = dirname(dir);
  return parent === dir ? null : findPlaywright(parent);
}
