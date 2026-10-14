// Long-lived harness for capturing what the OS draws (real mouse cursor, native title tooltips) in a visible Chrome.
// Attach to a Chrome started by launch-chrome.sh, then send steps as POST bodies `async (page, context, h) => ...`.
// BACKGROUND=1 instead launches its own headless Chrome and records with record-bg.mjs: the user's screen and mouse are
// never touched, and the OS-drawing helpers (csnap, hover, grab…) throw.
//
//   PLAYWRIGHT_CORE=<dir containing node_modules/playwright-core>  (required)
//   BACKGROUND=1  VIEWPORT=1280x800  SCALE=2  PROFILE=<persistent profile dir, default OUT/bg-profile>  (background only)
//   CDP=9333  EVAL_PORT=9484  OUT=<dir for shots/ and harness.log>  OSBIN=~/.cache/os-screen-capture/bin
//   WRITE_GUARD=<regex of API hosts>   abort non-read requests to those hosts, log them as BLOCKED (optional)
//   BAR_TEXT / BAR_TITLE / BAR_HIDE, PICKER_TITLE / PICKER_SCREEN / PICKER_SHARE: OS-language labels (zh-TW defaults;
//              find yours with axdump)
//   CORS_SHIM=<page origin>|<origin the API allows>   e.g. "http://localhost:8091|http://localhost:8080" (optional):
//              re-issues API requests from that page with the allowed Origin and answers CORS for the page origin
//
// Helpers on `h`: front, hover, ensureGrab, hideBar, grab, csnap, grabFromWindow, nativeWins, sleep, run, pid, log;
// recording and real clicks (record.mjs): click, glide, key, mark, recStart, recStop.
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { installRecording } from './record.mjs';
import { installBackgroundRecording } from './record-bg.mjs';

const env = process.env;
if (!env.PLAYWRIGHT_CORE) throw new Error('set PLAYWRIGHT_CORE to a directory whose node_modules has playwright-core');
const { chromium } = createRequire(path.join(env.PLAYWRIGHT_CORE, 'package.json'))('playwright-core');
const CDP = env.CDP || '9333';
const OUT = path.resolve(env.OUT || '.');
const OSBIN = env.OSBIN || path.join(os.homedir(), '.cache/os-screen-capture/bin');
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const LOG = path.join(OUT, 'harness.log');
const log = (...a) => fs.appendFileSync(LOG, `${new Date().toISOString()} ${a.join(' ')}\n`);
const state = { blocked: [] };

const BG = env.BACKGROUND === '1';
const [VW, VH] = (env.VIEWPORT || '1280x800').split('x').map(Number);
const browser = BG ? null : await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`);
const context = BG
  ? await chromium.launchPersistentContext(env.PROFILE || path.join(OUT, 'bg-profile'), {
    channel: 'chrome', headless: true, viewport: null, args: [`--window-size=${VW},${VH}`, `--force-device-scale-factor=${env.SCALE || 2}`],
  })
  : browser.contexts()[0];

if (env.WRITE_GUARD) {
  const hosts = new RegExp(env.WRITE_GUARD);
  const [pageOrigin, allowedOrigin] = (env.CORS_SHIM || '').split('|');
  const cors = { 'access-control-allow-origin': pageOrigin, 'access-control-allow-credentials': 'true' };
  const isRead = (req) => {
    const m = req.method();
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return true;
    if (m !== 'POST') return false;
    const u = req.url();
    if (/cognito|\/login$|\/token/.test(u)) return true;
    if (/graphql|appsync/.test(u)) return !/\bmutation\b/.test(req.postData() || '');
    return /\/(query|search|batch-get|list)(\?|$)/.test(u);
  };
  await context.route((u) => hosts.test(u.host), async (route) => {
    const req = route.request();
    if (!isRead(req)) {
      const line = `${req.method()} ${req.url()} ${(req.postData() || '').slice(0, 300)}`;
      state.blocked.push(line); log('BLOCKED', line); return route.abort();
    }
    let fromShimmed = false;
    if (pageOrigin) { try { fromShimmed = req.frame().url().startsWith(pageOrigin); } catch { fromShimmed = req.headers().origin === pageOrigin; } }
    if (!fromShimmed) return route.continue();
    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-allow-headers': req.headers()['access-control-request-headers'] || '*' } });
    }
    try {
      const response = await route.fetch({ headers: { ...req.headers(), origin: allowedOrigin } });
      return route.fulfill({ response, headers: { ...response.headers(), ...cors } });
    } catch (e) { log('ROUTE-ERR', req.url(), e.message); return route.abort(); }
  });
}

// Skip the recorder tab (record.mjs) left open by an earlier harness run.
const page = context.pages().find((p) => !/^http:\/\/127\.0\.0\.1:\d+\/rec/.test(p.url())) || await context.newPage();
const run = (bin, args) => { try { return execFileSync(path.join(OSBIN, bin), args).toString().trim(); } catch (e) { return `ERR ${e.status} ${String(e.stdout || '')}`.trim(); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pid = () => execFileSync('/usr/sbin/lsof', [`-tiTCP:${CDP}`, '-sTCP:LISTEN']).toString().trim().split('\n')[0];
const h = { state, log, sleep, run, pid, OUT, page };

// The screencast records the real window, which ignores viewport emulation: size the headless window so the page
// area is exactly VIEWPORT.
if (BG) {
  const c = await context.newCDPSession(page);
  const { windowId, bounds } = await c.send('Browser.getWindowForTarget');
  const [iw, ih] = await page.evaluate(() => [innerWidth, innerHeight]);
  await c.send('Browser.setWindowBounds', { windowId, bounds: { width: bounds.width + VW - iw, height: bounds.height + VH - ih } });
  await c.detach();
}

// Native tooltips only appear in the key window: bring Chrome and this tab to the front first.
h.front = async (p = page) => { await p.bringToFront(); run('activate', [pid()]); await sleep(300); };
h.geo = async (p = page) => {
  const g = await p.evaluate(() => ({ sx: screenX, sy: screenY, ow: outerWidth, oh: outerHeight, iw: innerWidth, ih: innerHeight }));
  return { ...g, top: g.sy + (g.oh - g.ih), left: g.sx + (g.ow - g.iw) / 2 };
};
// Real hover: park in a corner, then glide onto viewport point x,y with posted CGEvent moves.
h.hover = async (x, y, p = page) => {
  const g = await h.geo(p);
  const post = (vx, vy) => run('warp', [String(Math.round(g.left + vx)), String(Math.round(g.top + vy)), 'post']);
  post(g.iw - 30, g.ih - 30); await sleep(500);
  for (let i = 12; i >= 0; i -= 3) { post(x - i, y); await sleep(40); }
  return g;
};
// Chrome's "sharing your screen" bar takes key-window status; while it is up no native tooltip appears.
h.barUp = () => run('allwin', []).split('\n').some((l) => l.includes(`Chrome ${pid()} `) && l.includes(env.BAR_TEXT || '正在共用你的畫面'));
h.hideBar = async () => {
  let n = 0;
  for (let i = 0; i < 16; i += 1) {
    if (h.barUp()) { run('axpress', [pid(), env.BAR_TITLE || '共用', env.BAR_HIDE || '隱藏']); n += 1; await sleep(400); continue; }
    if (n || i > 6) break;
    await sleep(250);
  }
  return h.barUp() ? 'still up' : `hidden ${n}`;
};
// One display stream per page. getDisplayMedia needs a user gesture (CDP userGesture). With an external monitor the
// auto-select flag stops matching and Chrome shows a picker: answer it over AX (labels via axdump; zh-TW shown).
h.ensureGrab = async (p = page) => {
  if (await p.evaluate(() => !!window.__grab)) return 'already';
  const c = await context.newCDPSession(p);
  const pending = c.send('Runtime.evaluate', { userGesture: true, awaitPromise: true, returnByValue: true, expression: `(async () => {
    const s = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor', frameRate: 30 }, audio: false, selfBrowserSurface: 'include', surfaceSwitching: 'exclude' });
    const v = document.createElement('video'); v.muted = true; v.srcObject = s; await v.play(); window.__grab = { s, v };
    return s.getVideoTracks()[0].label; })()` });
  let picked = null;
  for (let i = 0; i < 40 && !picked; i += 1) {
    await sleep(250);
    if (run('axpress', [pid(), env.PICKER_TITLE || '分享的內容', env.PICKER_SCREEN || '螢幕 1']).startsWith('pressed')) {
      await sleep(400); picked = run('axpress', [pid(), env.PICKER_TITLE || '分享的內容', env.PICKER_SHARE || '分享']);
    }
    if (await p.evaluate(() => !!window.__grab)) picked = picked || 'auto';
  }
  const r = await pending;
  if (!(await p.evaluate(() => !!window.__grab))) throw new Error(`getDisplayMedia failed on ${p.url()} — use grabFromWindow`);
  return { label: r.result?.value, picked };
};
// Crop one frame of the captured display to a region in global screen points; `grabPage` holds the stream.
h.grab = async (file, reg, grabPage = page) => {
  const data = await grabPage.evaluate(async (rg) => {
    const g = window.__grab;
    await new Promise((r) => g.v.requestVideoFrameCallback(() => r()));
    await new Promise((r) => g.v.requestVideoFrameCallback(() => r()));
    const sc = g.v.videoWidth / screen.width;
    const cv = document.createElement('canvas'); cv.width = Math.round(rg.w * sc); cv.height = Math.round(rg.h * sc);
    cv.getContext('2d').drawImage(g.v, rg.left * sc, rg.top * sc, rg.w * sc, rg.h * sc, 0, 0, cv.width, cv.height);
    return { url: cv.toDataURL('image/png'), sc };
  }, reg);
  fs.writeFileSync(file, Buffer.from(data.url.split(',')[1], 'base64'));
  return data.sc;
};
// Native tooltip windows: Chrome-owned, layer 103, global points [x, y, w, h].
h.nativeWins = () => run('allwin', []).split('\n').filter((l) => l.startsWith(`Google Chrome ${pid()} 103 `)).map((l) => l.trim().split(/\s+/).slice(-4).map(Number));
// Where macOS draws each cursor relative to its hotspot, in CSS px: [dx, dy, w, h], 3 px of margin included.
// Measured from real captures at 2x. `auto` has no entry: it is the I-beam over text and the arrow elsewhere.
const CURSOR_EXTENTS = { default: [-3, -3, 20, 30], 'not-allowed': [-2, -3, 32, 50], pointer: [-9, -4, 28, 34], text: [-9, -16, 18, 32] };
// Hover `hoverSel` at (fx, fy) of its box with the real cursor, wait, then save shots/<name>.png cropped to the union
// of `cropSels`, any visible popper tooltip and any native tooltip window, plus a 16 px margin. Writes <name>.json with
// the pointer position in the crop (CSS px) for annotation.
h.csnap = async (name, hoverSel, cropSels, { fx = 0.6, fy = 0.6, wait = 1600, p = page, grabPage = p } = {}) => {
  await h.front(p);
  if (grabPage === p) await h.ensureGrab(p);
  const bar = await h.hideBar();
  await h.front(p);
  const r = await p.evaluate((s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b && { x: b.x, y: b.y, w: b.width, h: b.height }; }, hoverSel);
  if (!r) return { name, error: 'no hover target' };
  const x = r.x + r.w * fx, y = r.y + r.h * fy;
  const g = await h.hover(x, y, p);
  await sleep(wait);
  const info = await p.evaluate(({ sels, x, y }) => {
    const rs = sels.map((s) => document.querySelector(s)?.getBoundingClientRect()).filter(Boolean);
    const tips = [...document.querySelectorAll('[data-reka-popper-content-wrapper],[data-radix-popper-content-wrapper],[data-tippy-root],[role="tooltip"]')].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
    const all = [...rs, ...tips]; const hit = document.elementFromPoint(x, y);
    return { x1: Math.min(...all.map((b) => b.left)), y1: Math.min(...all.map((b) => b.top)), x2: Math.max(...all.map((b) => b.right)), y2: Math.max(...all.map((b) => b.bottom)),
      cssCursor: hit ? getComputedStyle(hit).cursor : null, hitClass: hit ? String(hit.className?.baseVal ?? hit.className).slice(0, 60) : null };
  }, { sels: cropSels, x, y });
  for (const [wx, wy, ww, wh] of h.nativeWins()) {
    info.x1 = Math.min(info.x1, wx - g.left); info.y1 = Math.min(info.y1, wy - g.top);
    info.x2 = Math.max(info.x2, wx - g.left + ww); info.y2 = Math.max(info.y2, wy - g.top + wh);
  }
  const m = 16;
  const x1 = Math.max(0, info.x1 - m), y1 = Math.max(0, info.y1 - m), x2 = Math.min(g.iw, info.x2 + m), y2 = Math.min(g.ih, info.y2 + m);
  const file = path.join(OUT, 'shots', `${name}.png`);
  const scale = await h.grab(file, { left: g.left + x1, top: g.top + y1, w: x2 - x1, h: y2 - y1 }, grabPage);
  const px = Math.round(x - x1), py = Math.round(y - y1);
  const ext = CURSOR_EXTENTS[info.cssCursor];
  const cursorBox = ext ? [px + ext[0], py + ext[1], ext[2], ext[3]] : null;
  const meta = { name, pointer: [px, py], cursorBox, size: [Math.round(x2 - x1), Math.round(y2 - y1)], scale, cssCursor: info.cssCursor, hitClass: info.hitClass, nativeTooltip: h.nativeWins().length > 0, bar };
  fs.writeFileSync(path.join(OUT, 'shots', `${name}.json`), JSON.stringify(meta, null, 1));
  return meta;
};
// For an origin whose Permissions-Policy blocks display capture: hold the stream in a separate small window on a
// capture-allowed origin (moved to another display), keep the target page in front, and pass it as `grabPage`.
h.grabFromWindow = async (url, bounds) => {
  if (!bounds) {
    // Put the grabber window on the second display (from `screens`); without one it would cover the page.
    const second = run('screens', []).split('\n').map((l) => l.match(/^1 .*\(([-\d.]+), ([-\d.]+), [\d.]+, [\d.]+\)/)).find(Boolean);
    if (!second) throw new Error('grabFromWindow needs a second display, or pass bounds');
    bounds = { left: Math.round(+second[1]) + 50, top: Math.round(+second[2]) + 50, width: 500, height: 400 };
  }
  const cdp = await browser.newBrowserCDPSession();
  const { targetId } = await cdp.send('Target.createTarget', { url, newWindow: true });
  await sleep(1500);
  const gp = context.pages().find((x) => x !== page && x.url().startsWith(new URL(url).origin));
  const { windowId } = await cdp.send('Browser.getWindowForTarget', { targetId });
  await cdp.send('Browser.setWindowBounds', { windowId, bounds });
  await h.ensureGrab(gp);
  return gp;
};

const recordingRoutes = BG
  ? installBackgroundRecording(h, { context, OUT, sleep, log })
  : installRecording(h, { context, env, OUT, run, sleep, log });
if (BG) {
  for (const k of ['front', 'hover', 'barUp', 'hideBar', 'ensureGrab', 'grab', 'nativeWins', 'csnap', 'grabFromWindow']) {
    h[k] = () => { throw new Error(`h.${k} needs the real screen; restart the harness without BACKGROUND=1`); };
  }
}

http.createServer(async (req, res) => {
  try { if (await recordingRoutes(req, res)) return; } catch (e) { res.statusCode = 500; res.end(String(e.stack || e)); return; }
  let src = ''; for await (const c of req) src += c;
  try {
    const fn = eval(`(${src})`);
    res.end(JSON.stringify((await fn(page, context, h)) ?? null, null, 1));
  } catch (e) { res.statusCode = 500; res.end(String(e.stack || e)); }
}).listen(Number(env.EVAL_PORT || 9484), '127.0.0.1', () => log(`harness up on ${env.EVAL_PORT || 9484}`));
