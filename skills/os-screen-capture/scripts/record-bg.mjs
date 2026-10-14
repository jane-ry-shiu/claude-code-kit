// Background recording for harness.mjs (BACKGROUND=1): the browser runs headless, so nothing on the user's screen or
// mouse is touched. Installs the same helpers as record.mjs, so a step script runs unchanged in either mode:
//   click(target, opts)   move the page's pointer onto a CSS selector, Playwright locator or viewport point {x, y} and
//                         click (Playwright mouse: trusted events, hover states apply)
//                         While recording, click and key start at least GAP seconds after the previous one finished,
//                         so the viewer sees each result before the next action.
//   glide(x, y, p)        move the page's pointer smoothly onto viewport point x,y (no click)
//   key(key, p)           press a key in the page and note it on the recording
//   mark(text, dur)       caption the recording from now until the next caption (or for `dur` seconds)
//   recStart(name, opts)  start a CDP screencast of the page; it keeps running across navigation and reload
//   recStop()             stop, draw the pointer, key and caption labels -> videos/<name>.mp4
//
// There is no OS cursor in a headless browser, so recStop draws one: a translucent yellow circle that follows every
// move, darkens slightly on each press and sends out a ripple from the click point. Screencast frames arrive only
// when the page repaints; each carries its paint time, and the video is rebuilt at a constant fps from those times and
// the logged pointer moves.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { GAP, LABEL, POINTER, RIPPLE, draw, overlayAt, pipeFrames } from './overlay.mjs';

const now = () => Date.now() / 1000;

export function installBackgroundRecording(h, { context, OUT, sleep, log }) {
  const vdir = path.join(OUT, 'videos');
  fs.mkdirSync(vdir, { recursive: true });
  const rec = { active: null, cursor: null };
  const note = (ev) => { if (rec.active) rec.active.events.push({ t: now(), ...ev }); };

  h.glide = async (x, y, p = h.page, { steps = 16, ms = 450 } = {}) => {
    const vp = await p.evaluate(() => [innerWidth, innerHeight]);
    const [sx, sy] = rec.cursor || [vp[0] - 30, vp[1] - 30];
    for (let i = 1; i <= steps; i += 1) {
      const k = 1 - (1 - i / steps) ** 2; // ease-out
      const cx = sx + (x - sx) * k, cy = sy + (y - sy) * k;
      await p.mouse.move(cx, cy);
      note({ type: 'move', x: cx, y: cy });
      await sleep(ms / steps);
    }
    rec.cursor = [x, y];
    return { x, y };
  };

  // Scrolls the target into view first: a box read off-screen would put the click outside the viewport.
  const pointOf = async (target, p, fx, fy) => {
    if (target && typeof target === 'object' && !('boundingBox' in target) && 'x' in target) return target;
    const loc = typeof target === 'string' ? p.locator(target).first() : target;
    await loc.waitFor({ state: 'visible', timeout: 5000 });
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    return { x: b.x + b.width * fx, y: b.y + b.height * fy };
  };

  const waitGap = async () => {
    if (!rec.active || !rec.lastAction) return;
    const left = GAP - (now() - rec.lastAction);
    if (left > 0) await sleep(left * 1000);
  };
  const done = () => { rec.lastAction = now(); };

  h.click = async (target, { fx = 0.5, fy = 0.5, count = 1, right = false, settle = 250, p = h.page } = {}) => {
    await waitGap();
    const { x, y } = await pointOf(target, p, fx, fy);
    await h.glide(x, y, p);
    await sleep(120);
    const t = now();
    for (let n = 0; n < count; n += 1) rec.active?.events.push({ type: 'click', t: t + n * 0.12, x, y });
    await p.mouse.click(x, y, { clickCount: count, button: right ? 'right' : 'left', delay: 60 });
    await sleep(settle);
    done();
    return { x, y };
  };

  h.key = async (key, p = h.page) => { await waitGap(); note({ type: 'key', text: key }); await p.keyboard.press(key); await sleep(250); done(); };
  h.mark = (text, dur) => note({ type: 'mark', text, dur });

  h.recStart = async (name, { p = h.page, fps = 30 } = {}) => {
    if (rec.active) throw new Error(`already recording ${rec.active.name}`);
    if (!/^[\w.-]+$/.test(name)) throw new Error(`bad recording name ${name}`);
    const fdir = path.join(vdir, `.${name}-frames`);
    fs.rmSync(fdir, { recursive: true, force: true });
    fs.mkdirSync(fdir);
    const cdp = await context.newCDPSession(p);
    const vp = await p.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }));
    const r = { name, p, fps, cdp, fdir, frames: [], events: [], vp };
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      const file = path.join(fdir, `${String(r.frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      r.frames.push({ t: metadata.timestamp, file });
      try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch { /* session closed on stop */ }
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: Math.round(vp.w * vp.dpr), maxHeight: Math.round(vp.h * vp.dpr) });
    rec.active = r;
    rec.cursor = rec.cursor || [vp.w - 30, vp.h - 30];
    r.t0 = now();
    note({ type: 'move', x: rec.cursor[0], y: rec.cursor[1] });
    await sleep(300);
    log('REC(bg) start', name, JSON.stringify(vp));
    return { name, viewport: vp };
  };

  h.recStop = async ({ tail = 1 } = {}) => {
    const r = rec.active;
    if (!r) throw new Error('not recording');
    await sleep(tail * 1000);
    rec.active = null;
    await r.cdp.send('Page.stopScreencast');
    await r.cdp.detach().catch(() => {});
    if (!r.frames.length) throw new Error('screencast produced no frames');
    const mp4 = path.join(vdir, `${r.name}.mp4`);
    const t0 = r.frames[0].t, end = now();
    const rendered = await render(r, t0, end);
    await encode(rendered, mp4, r.fps);
    fs.rmSync(r.fdir, { recursive: true, force: true });
    const events = r.events.filter((e) => e.type !== 'move').map((e) => ({ ...e, t: +(e.t - t0).toFixed(3) }));
    const meta = { name: r.name, mode: 'background', mp4, viewport: r.vp, duration: +(end - t0).toFixed(2), events };
    fs.writeFileSync(path.join(vdir, `${r.name}.json`), JSON.stringify(meta, null, 1));
    return meta;
  };

  // One output frame per 1/fps; identical consecutive frames are drawn once and held. Drawing happens on a blank page
  // in the same headless browser, so no image library is needed.
  const render = async (r, t0, end) => {
    const dp = await context.newPage();
    const out = [];
    let fi = 0, last = null;
    try {
      for (let i = 0; i * (1 / r.fps) <= end - t0; i += 1) {
        const t = t0 + i / r.fps;
        while (fi + 1 < r.frames.length && r.frames[fi + 1].t <= t) fi += 1;
        const spec = overlayAt(r.events, t);
        const key = JSON.stringify({ fi, spec });
        if (last && last.key === key) { last.n += 1; continue; }
        const file = path.join(r.fdir, `out-${String(out.length).padStart(5, '0')}.jpg`);
        const jpg = fs.readFileSync(r.frames[fi].file).toString('base64');
        const drawn = await dp.evaluate(draw, { jpg, spec, cssW: r.vp.w, P: POINTER, RP: RIPPLE, L: LABEL });
        fs.writeFileSync(file, Buffer.from(drawn, 'base64'));
        last = { key, file, n: 1 };
        out.push(last);
      }
    } finally { await dp.close(); }
    return out;
  };

  const encode = (frames, mp4, fps) => new Promise((ok, fail) => {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4]);
    let err = '';
    ff.stderr.on('data', (c) => { err += c; });
    ff.on('error', fail);
    ff.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg ${code}: ${err}`))));
    pipeFrames(ff.stdin, frames, fs.readFileSync).catch(fail);
  });

  return async () => false; // no HTTP routes: the screencast needs no recorder tab
}
