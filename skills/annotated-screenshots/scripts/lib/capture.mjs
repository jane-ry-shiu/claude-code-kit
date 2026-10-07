import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findPlaywright } from './playwright.mjs';

const VIEWPORT = Object.freeze({ width: 2400, height: 1200 });
const failure = (message, exitCode) => Object.assign(new Error(message), { exitCode });

/** Headless Google Chrome; bundled Chromium when Chrome is not installed. */
export async function launchChrome(chromium) {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function brokenImages(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    await Promise.all(images.map((img) => (img.complete ? null : new Promise((done) => { img.onload = done; img.onerror = done; }))));
    return images.filter((img) => !img.naturalWidth).map((img) => decodeURI(img.src));
  });
}

/** Screenshots #sheet at device scale 2; resolves to { out, width, height } with the sheet's CSS size. */
export async function captureSheet(htmlPath, outPath, { from = process.env.PLAYWRIGHT_FROM ?? process.cwd() } = {}) {
  const playwright = findPlaywright(from);
  if (!playwright) throw failure(`Playwright not found from ${from} upward; set PLAYWRIGHT_FROM or follow references/chrome-devtools.md`, 3);
  const browser = await launchChrome(playwright.chromium);
  try {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(resolve(htmlPath)).href);
    const broken = await brokenImages(page);
    if (broken.length) throw failure(`images failed to load:\n- ${broken.join('\n- ')}`, 4);
    const sheet = page.locator('#sheet');
    await sheet.screenshot({ path: outPath });
    const box = await sheet.boundingBox();
    return { out: outPath, width: Math.round(box.width), height: Math.round(box.height) };
  } finally {
    await browser.close();
  }
}
