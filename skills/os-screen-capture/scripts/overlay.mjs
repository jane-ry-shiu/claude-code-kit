// What both recorders draw on a video: a translucent yellow circle that follows the pointer, darkens slightly on each
// press and sends out a ripple from the click point, plus key and caption labels. Events are
// { type: 'move' | 'click' | 'key' | 'mark', t, x, y, text, dur } with t in seconds on any one clock and x, y in CSS px
// of the video frame.
export const POINTER = { r: 14.4, idle: [255, 204, 0, 0.4], press: [255, 204, 0, 0.55], hold: 0.12, fade: 0.3 };
export const RIPPLE = { dur: 0.5, grow: 2.8, width: 3, alpha: 0.8 }; // ring from r to r * grow, fading out
// key: minimum seconds shown; size/height/padX/bottom/gap in CSS px (bottom: caption box to the video's bottom edge,
// gap: between the key label and the caption under it)
export const LABEL = { key: 1.2, size: 24, height: 44, padX: 16, bottom: 56, gap: 10, bg: 'rgba(0,0,0,0.5)', keyPrefix: '按鍵：' };
export const GAP = 1; // seconds between the end of one action and the start of the next

// Pointer position at time t. `glide` between logged moves, or `hold` each one until the next: a real cursor that is
// warped step by step sits still between steps, and a glided circle runs ahead of it.
const pointerAt = (events, t, motion) => {
  const moves = events.filter((e) => e.type === 'move' || e.type === 'click');
  let prev = moves[0];
  for (const m of moves) {
    if (m.t > t) {
      if (motion === 'hold' || m.t - prev.t > 0.2 || m.t <= prev.t) break; // idle gap: stay put
      const k = (t - prev.t) / (m.t - prev.t);
      return { x: prev.x + (m.x - prev.x) * k, y: prev.y + (m.y - prev.y) * k };
    }
    prev = m;
  }
  return { x: prev.x, y: prev.y };
};
const pressAt = (events, t) => { // 1 = pressed, fading to 0 = idle
  let k = 0;
  events.filter((e) => e.type === 'click').forEach((c) => {
    const dt = t - c.t;
    if (dt >= 0 && dt <= POINTER.hold) k = 1;
    else if (dt > POINTER.hold && dt <= POINTER.hold + POINTER.fade) k = Math.max(k, 1 - (dt - POINTER.hold) / POINTER.fade);
  });
  return +k.toFixed(2);
};
const ripplesAt = (events, t) => events
  .filter((e) => e.type === 'click' && t >= e.t && t <= e.t + RIPPLE.dur)
  .map((e) => ({ x: +e.x.toFixed(1), y: +e.y.toFixed(1), k: +((t - e.t) / RIPPLE.dur).toFixed(2) }));
// A caption stays until the next caption; a key label until the next action or caption (at least LABEL.key).
const labelEnd = (events, e) => {
  if (e.type === 'mark' && e.dur) return e.t + e.dur;
  const ends = e.type === 'mark' ? ['mark'] : ['click', 'key', 'mark'];
  const next = events.find((x) => x !== e && x.t > e.t && ends.includes(x.type));
  const end = next ? next.t : Infinity;
  return e.type === 'key' ? Math.max(end, e.t + LABEL.key) : end;
};
const labelsAt = (events, t) => events
  .filter((e) => (e.type === 'key' || e.type === 'mark') && t >= e.t && t < labelEnd(events, e))
  .map((e) => ({ kind: e.type, text: e.type === 'key' ? `${LABEL.keyPrefix}${e.text}` : e.text }));

// Everything drawn at time t; equal specs draw equal overlays, so callers hold a frame while its spec repeats.
export const overlayAt = (events, t, { motion = 'glide' } = {}) => {
  const pt = pointerAt(events, t, motion);
  return { x: +pt.x.toFixed(1), y: +pt.y.toFixed(1), press: pressAt(events, t), ripples: ripplesAt(events, t), labels: labelsAt(events, t) };
};

// Runs in a browser page. With `jpg`, draws onto that frame and returns a base64 jpeg; without it, draws onto a
// transparent w x h canvas and returns a base64 png for ffmpeg to overlay. cssW: the frame's width in CSS px.
export async function draw({ jpg, w, h, spec, cssW, P, RP, L }) {
  const img = jpg ? await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${jpg}`)).blob()) : null;
  const W = img ? img.width : w, H = img ? img.height : h;
  const sc = W / cssW;
  const cv = new OffscreenCanvas(W, H);
  const g = cv.getContext('2d');
  if (img) g.drawImage(img, 0, 0);
  const mix = P.idle.map((v, i) => v + (P.press[i] - v) * spec.press);
  g.fillStyle = `rgba(${Math.round(mix[0])},${Math.round(mix[1])},${Math.round(mix[2])},${mix[3]})`;
  g.beginPath(); g.arc(spec.x * sc, spec.y * sc, P.r * sc, 0, Math.PI * 2); g.fill();
  for (const rp of spec.ripples) {
    const e = 1 - (1 - rp.k) ** 2; // ease-out
    g.strokeStyle = `rgba(${P.idle[0]},${P.idle[1]},${P.idle[2]},${RP.alpha * (1 - rp.k)})`;
    g.lineWidth = RP.width * sc;
    g.beginPath(); g.arc(rp.x * sc, rp.y * sc, P.r * (1 + (RP.grow - 1) * e) * sc, 0, Math.PI * 2); g.stroke();
  }
  g.font = `500 ${L.size * sc}px -apple-system, 'PingFang TC', system-ui, sans-serif`;
  g.textBaseline = 'middle';
  for (const l of spec.labels) {
    const tw = g.measureText(l.text).width, padX = L.padX * sc, hgt = L.height * sc;
    const top = H - hgt - L.bottom * sc - (l.kind === 'key' ? (L.height + L.gap) * sc : 0), left = (W - tw) / 2 - padX;
    g.fillStyle = L.bg;
    g.beginPath(); g.roundRect(left, top, tw + 2 * padX, hgt, 8 * sc); g.fill();
    g.fillStyle = '#fff'; g.fillText(l.text, left + padX, top + hgt / 2);
  }
  const blob = await cv.convertToBlob(img ? { type: 'image/jpeg', quality: 0.92 } : { type: 'image/png' });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

// Writes each held frame to ffmpeg's stdin as many times as it is held: the concat demuxer's per-image durations are
// not reliable. frames: [{ file, n }].
export const pipeFrames = async (stdin, frames, readFile) => {
  for (const f of frames) {
    const buf = readFile(f.file);
    for (let i = 0; i < f.n; i += 1) if (!stdin.write(buf)) await new Promise((r) => stdin.once('drain', r));
  }
  stdin.end();
};
