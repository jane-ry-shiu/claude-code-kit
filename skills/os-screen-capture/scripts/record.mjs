// Screen recording and real clicks for harness.mjs. Installs on `h`:
//   click(target, opts)   glide the real cursor onto a CSS selector, Playwright locator or viewport point {x, y} and
//                         click with posted CGEvents
//                         While recording, click and key start at least GAP seconds after the previous one finished,
//                         so the viewer sees each result before the next action.
//   glide(x, y, p)        move the real cursor smoothly onto viewport point x,y (no click)
//   key(key, p)           press a key in the page (Playwright) and note it on the recording
//   mark(text, dur)       caption the recording from now until the next caption (or for `dur` seconds)
//   recStart(name, opts)  start recording the display; the stream lives in its own tab, so the page under test may
//                         navigate or reload freely
//   recStop()             stop, upload, crop to the browser, draw the pointer circle and key/caption labels
//                         (overlay.mjs, same look as background mode) -> videos/<name>.mp4
//
// Why a separate recorder tab: a display stream belongs to the page that opened it and dies on reload. The recorder tab
// is served by the harness itself (http://127.0.0.1:<EVAL_PORT>/rec), so display capture is never blocked by the
// tested site's Permissions-Policy, and it uploads the finished recording back to the harness over the same origin.
// The overlay is drawn in that tab too, as transparent frames that ffmpeg lays over the cropped recording.
import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';
import { GAP, LABEL, POINTER, RIPPLE, draw, overlayAt, pipeFrames } from './overlay.mjs';

export const recorderPage = `<!doctype html><meta charset="utf-8"><title>recorder</title>
<body style="margin:0;background:#111;color:#ccc;font:14px system-ui;display:grid;place-items:center;height:100vh">
recorder — leave this tab in the background</body>`;

export function installRecording(h, { context, env, OUT, run, sleep, log }) {
  const port = env.EVAL_PORT || '9484';
  const vdir = path.join(OUT, 'videos');
  fs.mkdirSync(vdir, { recursive: true });
  const rec = { active: null, cursor: null };
  const now = () => Date.now() / 1000;
  const note = (ev) => { if (rec.active) rec.active.events.push({ t: now() - rec.active.t0, ...ev }); };

  const toGlobal = async (p, x, y) => { const g = await h.geo(p); return [Math.round(g.left + x), Math.round(g.top + y), g]; };
  const warp = (gx, gy) => run('warp', [String(Math.round(gx)), String(Math.round(gy)), 'post']);

  h.glide = async (x, y, p = h.page, { steps = 14, ms = 420 } = {}) => {
    const [gx, gy, g] = await toGlobal(p, x, y);
    const [sx, sy] = rec.cursor || [g.left + g.iw - 30, g.top + g.ih - 30];
    for (let i = 1; i <= steps; i += 1) {
      const k = 1 - (1 - i / steps) ** 2; // ease-out
      const cx = Math.round(sx + (gx - sx) * k), cy = Math.round(sy + (gy - sy) * k);
      warp(cx, cy);
      note({ type: 'move', gx: cx, gy: cy });
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

  const waitGap = async () => {
    if (!rec.active || !rec.lastAction) return;
    const left = GAP - (now() - rec.lastAction);
    if (left > 0) await sleep(left * 1000);
  };
  const done = () => { rec.lastAction = now(); };

  h.click = async (target, { fx = 0.5, fy = 0.5, count = 1, right = false, settle = 250, p = h.page } = {}) => {
    await waitGap();
    await h.front(p);
    const { x, y } = await pointOf(target, p, fx, fy);
    const { gx, gy } = await h.glide(x, y, p);
    await sleep(120);
    // Noted before the press, so the ripple lands with the click, not after it.
    for (let n = 0; n < count; n += 1) note({ type: 'click', gx, gy, dt: n * 0.12 });
    const out = run('click', [String(gx), String(gy), String(count), right ? 'right' : 'left']);
    await sleep(settle);
    done();
    return out;
  };

  h.key = async (key, p = h.page) => { await waitGap(); await h.front(p); note({ type: 'key', text: key }); await p.keyboard.press(key); await sleep(250); done(); };
  h.mark = (text, dur) => note({ type: 'mark', text, dur });

  h.recStart = async (name, { p = h.page, crop = 'viewport', fps = 30, kbps = 8000 } = {}) => {
    if (rec.active) throw new Error(`already recording ${rec.active.name}`);
    if (!/^[\w.-]+$/.test(name)) throw new Error(`bad recording name ${name}`);
    let rp = context.pages().find((x) => x.url().startsWith(`http://127.0.0.1:${port}/rec`));
    if (!rp) { rp = await context.newPage(); await rp.goto(`http://127.0.0.1:${port}/rec`); }
    await h.front(rp);
    await h.ensureGrab(rp);
    await h.front(p);
    const bar = await h.hideBar();
    await h.front(p);
    const g = await h.geo(p);
    // Park the cursor where the drawn circle starts, so the two agree from the first frame.
    rec.cursor = rec.cursor || [Math.round(g.left + g.iw - 30), Math.round(g.top + g.ih - 30)];
    warp(...rec.cursor);
    // t0 is taken inside the recorder tab (same wall clock as the harness) right before start(): the webm's time zero
    // is the start() call, not the later onstart event (~0.1 s after), and not the CDP round trip back here.
    const { sc, t0 } = await rp.evaluate(async ({ kbps }) => {
      const s = window.__grab.s;
      const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(s, { mimeType: type, videoBitsPerSecond: kbps * 1000 });
      window.__rec = { mr, chunks: [] };
      mr.ondataavailable = (e) => { if (e.data.size) window.__rec.chunks.push(e.data); };
      const startedAt = Date.now();
      await new Promise((r) => { mr.onstart = r; mr.start(1000); });
      const t = s.getVideoTracks()[0].getSettings();
      return { sc: (t.width || window.__grab.v.videoWidth) / screen.width, t0: startedAt };
    }, { kbps });
    const box = crop === 'screen' ? null
      : crop === 'window' ? { x: g.sx, y: g.sy, w: g.ow, h: g.oh }
        : { x: g.left, y: g.top, w: g.iw, h: g.ih };
    rec.active = { name, t0: t0 / 1000, events: [], sc, box, fps, rp, p, bar };
    rec.lastAction = null;
    note({ type: 'move', gx: rec.cursor[0], gy: rec.cursor[1] });
    log('REC start', name, JSON.stringify(box), sc);
    return { name, sc, box, bar };
  };

  h.recStop = async ({ keepRaw = false, tail = 1 } = {}) => {
    const r = rec.active;
    if (!r) throw new Error('not recording');
    await sleep(tail * 1000);
    rec.active = null;
    const end = now() - r.t0;
    const raw = path.join(vdir, `${r.name}.webm`);
    if (fs.existsSync(raw)) fs.unlinkSync(raw);
    await r.rp.evaluate(async (name) => {
      const { mr, chunks } = window.__rec;
      await new Promise((res) => { mr.onstop = res; mr.stop(); });
      const blob = new Blob(chunks, { type: mr.mimeType });
      const resp = await fetch(`/upload?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob });
      if (!resp.ok) throw new Error(`upload ${resp.status}`);
    }, r.name);
    const b = cropBox(r, raw);
    const odir = path.join(vdir, `.${r.name}-overlay`);
    fs.rmSync(odir, { recursive: true, force: true });
    fs.mkdirSync(odir);
    try {
      const frames = await renderOverlay(r, b, end, odir);
      await encode(r, b, raw, frames, path.join(vdir, `${r.name}.mp4`));
    } finally { fs.rmSync(odir, { recursive: true, force: true }); }
    if (!keepRaw) fs.unlinkSync(raw); // the raw file is the whole display, private windows included
    const events = r.events.filter((e) => e.type !== 'move').map(({ dt, ...e }) => ({ ...e, t: +(e.t + (dt || 0)).toFixed(3) }));
    const mp4 = path.join(vdir, `${r.name}.mp4`);
    const meta = { name: r.name, mode: 'visible', mp4, raw: keepRaw ? raw : null, box: r.box, sc: r.sc, duration: +end.toFixed(2), events };
    fs.writeFileSync(path.join(vdir, `${r.name}.json`), JSON.stringify(meta, null, 1));
    await h.front(r.p);
    return meta;
  };

  const even = (n) => Math.max(2, Math.floor(n / 2) * 2);
  // The crop in device px of the recording; the whole display for crop 'screen'.
  const cropBox = (r, raw) => {
    if (r.box) {
      const s = r.sc;
      return { x: even(r.box.x * s), y: even(r.box.y * s), w: even(r.box.w * s), h: even(r.box.h * s) };
    }
    const [w, hgt] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', raw])
      .toString().trim().split(',').map(Number);
    return { x: 0, y: 0, w: even(w), h: even(hgt) };
  };

  // Transparent overlay frames, one per 1/fps, drawn once per distinct spec and held. Event points are global screen
  // points; the overlay works in points of the crop.
  const renderOverlay = async (r, b, end, odir) => {
    const s = r.sc;
    const events = r.events.map(({ gx, gy, dt, ...e }) => ({
      ...e, t: e.t + (dt || 0), ...(gx === undefined ? {} : { x: (gx * s - b.x) / s, y: (gy * s - b.y) / s }),
    }));
    const out = [];
    let last = null;
    for (let i = 0; i / r.fps <= end; i += 1) {
      const spec = overlayAt(events, i / r.fps, { motion: 'hold' });
      const key = JSON.stringify(spec);
      if (last && last.key === key) { last.n += 1; continue; }
      const file = path.join(odir, `${String(out.length).padStart(5, '0')}.png`);
      const png = await r.rp.evaluate(draw, { w: b.w, h: b.h, spec, cssW: b.w / s, P: POINTER, RP: RIPPLE, L: LABEL });
      fs.writeFileSync(file, Buffer.from(png, 'base64'));
      last = { key, file, n: 1 };
      out.push(last);
    }
    return out;
  };

  const encode = (r, b, raw, frames, mp4) => new Promise((ok, fail) => {
    const graph = `[0:v]setpts=PTS-STARTPTS,fps=${r.fps},crop=${b.w}:${b.h}:${b.x}:${b.y}[v];`
      + `[1:v]format=rgba[o];[v][o]overlay=0:0:eof_action=repeat[out]`;
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-f', 'image2pipe', '-framerate', String(r.fps), '-c:v', 'png', '-i', '-',
      '-filter_complex', graph, '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4]);
    let err = '';
    ff.stderr.on('data', (c) => { err += c; });
    ff.on('error', fail);
    ff.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg ${code}: ${err}`))));
    pipeFrames(ff.stdin, frames, fs.readFileSync).catch(fail);
  });

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
