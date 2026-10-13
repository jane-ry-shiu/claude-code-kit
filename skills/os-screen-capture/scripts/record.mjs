// Screen recording and real clicks for harness.mjs. Installs on `h`:
//   click(target, opts)   glide the real cursor onto a CSS selector, Playwright locator or viewport point {x, y} and
//                         click with posted CGEvents
//   glide(x, y, p)        move the real cursor smoothly onto viewport point x,y (no click)
//   key(key, p)           press a key in the page (Playwright) and note it on the recording
//   mark(text)            caption the recording from now for `dur` seconds (default 2.5)
//   recStart(name, opts)  start recording the display; the stream lives in its own tab, so the page under test may
//                         navigate or reload freely
//   recStop()             stop, upload, crop to the browser, draw click rings and key/caption labels -> videos/<name>.mp4
//
// Why a separate recorder tab: a display stream belongs to the page that opened it and dies on reload. The recorder tab
// is served by the harness itself (http://127.0.0.1:<EVAL_PORT>/rec), so display capture is never blocked by the
// tested site's Permissions-Policy, and it uploads the finished recording back to the harness over the same origin.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const RING = { size: 36, thick: 4, color: 'red@0.9', dur: 0.45 };
const LABEL = { key: 1.2, mark: 2.5 };

export const recorderPage = `<!doctype html><meta charset="utf-8"><title>recorder</title>
<body style="margin:0;background:#111;color:#ccc;font:14px system-ui;display:grid;place-items:center;height:100vh">
recorder — leave this tab in the background<div id="label"></div></body>`;

export function installRecording(h, { context, env, OUT, run, sleep, log }) {
  const port = env.EVAL_PORT || '9484';
  const vdir = path.join(OUT, 'videos');
  fs.mkdirSync(vdir, { recursive: true });
  const rec = { active: null, cursor: null };
  const note = (ev) => { if (rec.active) rec.active.events.push({ t: (Date.now() - rec.active.t0) / 1000, ...ev }); };

  const toGlobal = async (p, x, y) => { const g = await h.geo(p); return [Math.round(g.left + x), Math.round(g.top + y), g]; };

  h.glide = async (x, y, p = h.page, { steps = 14, ms = 420 } = {}) => {
    const [gx, gy, g] = await toGlobal(p, x, y);
    const [sx, sy] = rec.cursor || [g.left + g.iw - 30, g.top + g.ih - 30];
    for (let i = 1; i <= steps; i += 1) {
      const k = 1 - (1 - i / steps) ** 2; // ease-out
      run('warp', [String(Math.round(sx + (gx - sx) * k)), String(Math.round(sy + (gy - sy) * k)), 'post']);
      await sleep(ms / steps);
    }
    rec.cursor = [gx, gy];
    return { gx, gy, g };
  };

  const pointOf = async (target, p, fx, fy) => {
    if (typeof target?.boundingBox === 'function') {
      await target.waitFor({ state: 'visible', timeout: 5000 });
      const b = await target.boundingBox();
      return { x: b.x + b.width * fx, y: b.y + b.height * fy };
    }
    if (typeof target !== 'string') return target;
    const r = await p.evaluate((s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b && { x: b.x, y: b.y, w: b.width, h: b.height }; }, target);
    if (!r) throw new Error(`click: no element for ${target}`);
    return { x: r.x + r.w * fx, y: r.y + r.h * fy };
  };

  h.click = async (target, { fx = 0.5, fy = 0.5, count = 1, right = false, settle = 250, p = h.page } = {}) => {
    await h.front(p);
    const { x, y } = await pointOf(target, p, fx, fy);
    const { gx, gy } = await h.glide(x, y, p);
    await sleep(120);
    note({ type: 'click', gx, gy }); // before the press, so the ring lands with the click, not after it
    const out = run('click', [String(gx), String(gy), String(count), right ? 'right' : 'left']);
    await sleep(settle);
    return out;
  };

  h.key = async (key, p = h.page) => { await h.front(p); note({ type: 'key', text: key }); await p.keyboard.press(key); await sleep(250); };
  h.mark = (text, dur = LABEL.mark) => note({ type: 'mark', text, dur });

  h.recStart = async (name, { p = h.page, crop = 'viewport', fps = 30, kbps = 8000 } = {}) => {
    if (rec.active) throw new Error(`already recording ${rec.active.name}`);
    let rp = context.pages().find((x) => x.url().startsWith(`http://127.0.0.1:${port}/rec`));
    if (!rp) { rp = await context.newPage(); await rp.goto(`http://127.0.0.1:${port}/rec`); }
    await h.front(rp);
    await h.ensureGrab(rp);
    await h.front(p);
    const bar = await h.hideBar();
    await h.front(p);
    // t0 is taken inside the recorder tab when recording starts (same wall clock as the harness), so event times
    // line up with the video instead of lagging by the CDP round trip.
    const { sc, t0 } = await rp.evaluate(async ({ fps, kbps }) => {
      const s = window.__grab.s;
      const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(s, { mimeType: type, videoBitsPerSecond: kbps * 1000 });
      window.__rec = { mr, chunks: [] };
      mr.ondataavailable = (e) => { if (e.data.size) window.__rec.chunks.push(e.data); };
      const startedAt = await new Promise((r) => { mr.onstart = () => r(Date.now()); mr.start(1000); });
      const t = s.getVideoTracks()[0].getSettings();
      return { sc: (t.width || window.__grab.v.videoWidth) / screen.width, t0: startedAt };
    }, { fps, kbps });
    const g = await h.geo(p);
    const box = crop === 'screen' ? null
      : crop === 'window' ? { x: g.sx, y: g.sy, w: g.ow, h: g.oh }
        : { x: g.left, y: g.top, w: g.iw, h: g.ih };
    rec.active = { name, t0, events: [], sc, box, fps, rp, p, bar };
    log('REC start', name, JSON.stringify(box), sc);
    return { name, sc, box, bar };
  };

  h.recStop = async ({ keepRaw = false } = {}) => {
    const r = rec.active;
    if (!r) throw new Error('not recording');
    rec.active = null;
    const raw = path.join(vdir, `${r.name}.webm`);
    if (fs.existsSync(raw)) fs.unlinkSync(raw);
    await r.rp.evaluate(async (name) => {
      const { mr, chunks } = window.__rec;
      await new Promise((res) => { mr.onstop = res; mr.stop(); });
      const blob = new Blob(chunks, { type: mr.mimeType });
      const resp = await fetch(`/upload?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob });
      if (!resp.ok) throw new Error(`upload ${resp.status}`);
    }, r.name);
    const labels = await renderLabels(r);
    const mp4 = path.join(vdir, `${r.name}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, ...labels.flatMap((l) => ['-i', l.file]),
      '-filter_complex', filterGraph(r, labels), '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4]);
    labels.forEach((l) => fs.unlinkSync(l.file));
    if (!keepRaw) fs.unlinkSync(raw); // the raw file is the whole display, private windows included
    const meta = { name: r.name, mp4, raw: keepRaw ? raw : null, box: r.box, sc: r.sc, duration: (Date.now() - r.t0) / 1000, events: r.events };
    fs.writeFileSync(path.join(vdir, `${r.name}.json`), JSON.stringify(meta, null, 1));
    await h.front(r.p);
    return meta;
  };

  // Label PNGs are drawn by the recorder tab after recording stops; this ffmpeg build has no drawtext.
  const renderLabels = async (r) => {
    const items = r.events.filter((e) => e.type !== 'click');
    if (!items.length) return [];
    await r.rp.bringToFront();
    const out = [];
    for (const [i, e] of items.entries()) {
      const file = path.join(vdir, `.label-${r.name}-${i}.png`);
      await r.rp.evaluate(({ text, kind, sc }) => {
        const el = document.getElementById('label');
        el.textContent = text;
        el.style.cssText = `position:fixed;left:0;top:0;padding:${8 * sc}px ${16 * sc}px;border-radius:${8 * sc}px;font:600 ${16 * sc}px system-ui;color:#fff;background:${kind === 'key' ? 'rgba(20,20,20,.85)' : 'rgba(30,64,175,.9)'}`;
      }, { text: e.type === 'key' ? `⌨ ${e.text}` : e.text, kind: e.type, sc: r.sc });
      await r.rp.locator('#label').screenshot({ path: file, omitBackground: true });
      out.push({ file, t: e.t, dur: e.type === 'key' ? LABEL.key : e.dur });
    }
    return out;
  };

  const even = (n) => Math.max(2, Math.floor(n / 2) * 2);
  const filterGraph = (r, labels) => {
    const s = r.sc;
    const b = r.box ? { x: even(r.box.x * s), y: even(r.box.y * s), w: even(r.box.w * s), h: even(r.box.h * s) } : null;
    const steps = ['setpts=PTS-STARTPTS', `fps=${r.fps}`];
    if (b) steps.push(`crop=${b.w}:${b.h}:${b.x}:${b.y}`);
    const ox = b ? b.x : 0, oy = b ? b.y : 0, sz = RING.size * s;
    r.events.filter((e) => e.type === 'click').forEach((e) => {
      const x = Math.round(e.gx * s - ox - sz / 2), y = Math.round(e.gy * s - oy - sz / 2);
      steps.push(`drawbox=x=${x}:y=${y}:w=${sz}:h=${sz}:color=${RING.color}:t=${RING.thick * s}:enable='between(t,${e.t.toFixed(2)},${(e.t + RING.dur).toFixed(2)})'`);
    });
    let graph = `[0:v]${steps.join(',')}[v0]`;
    labels.forEach((l, i) => {
      graph += `;[v${i}][${i + 1}:v]overlay=x=(W-w)/2:y=H-h-${24 * s}:enable='between(t,${l.t.toFixed(2)},${(l.t + l.dur).toFixed(2)})'[v${i + 1}]`;
    });
    return `${graph};[v${labels.length}]null[out]`;
  };

  // Routes for the harness HTTP server: the recorder page and the upload sink. Returns true when it handled the request.
  return async (req, res) => {
    if (req.method === 'GET' && req.url.startsWith('/rec')) { res.setHeader('content-type', 'text/html'); res.end(recorderPage); return true; }
    if (req.method === 'POST' && req.url.startsWith('/upload')) {
      const name = new URL(req.url, 'http://x').searchParams.get('name');
      if (!/^[\w.-]+$/.test(name || '')) { res.statusCode = 400; res.end('bad name'); return true; }
      const file = fs.createWriteStream(path.join(vdir, `${name}.webm`));
      for await (const c of req) file.write(c);
      await new Promise((ok) => file.end(ok));
      res.end('ok'); return true;
    }
    return false;
  };
}
