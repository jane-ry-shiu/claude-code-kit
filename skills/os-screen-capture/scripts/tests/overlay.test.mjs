import test from 'node:test';
import assert from 'node:assert/strict';
import { draw, POINTER, RIPPLE, LABEL } from '../overlay.mjs';

class FakeCtx {
  constructor() { this.calls = []; this.font = ''; }
  measureText(t) { const px = parseFloat(this.font.match(/(\d+(\.\d+)?)px/)[1]); return { width: [...t].length * px }; }
  roundRect(...a) { this.calls.push(['roundRect', ...a]); }
  fillText(t, x, y) { this.calls.push(['fillText', t, x, y, this.textAlign]); }
  beginPath() {} arc() {} fill() {} stroke() {} drawImage() {}
}
let ctx;
globalThis.OffscreenCanvas = class {
  constructor(w, h) { this.width = w; this.height = h; ctx = new FakeCtx(); }
  getContext() { return ctx; }
  async convertToBlob() { return { arrayBuffer: async () => new ArrayBuffer(1) }; }
};

const W = 1920, H = 1080, cssW = 1600, sc = W / cssW;
const run = async (labels) => {
  await draw({ jpg: null, w: W, h: H, cssW, spec: { x: 10, y: 10, press: 0, ripples: [], labels }, P: POINTER, RP: RIPPLE, L: LABEL });
  return { boxes: ctx.calls.filter((c) => c[0] === 'roundRect'), texts: ctx.calls.filter((c) => c[0] === 'fillText') };
};

test('a single-line caption draws its text centred in the same box as before', async () => {
  const text = '單行字幕';
  const { boxes, texts } = await run([{ kind: 'mark', text }]);
  const tw = [...text].length * LABEL.size * sc, padX = LABEL.padX * sc, hgt = LABEL.height * sc;
  const top = H - hgt - LABEL.bottom * sc, left = (W - tw) / 2 - padX;
  assert.deepEqual(boxes, [['roundRect', left, top, tw + 2 * padX, hgt, 8 * sc]]);
  assert.deepEqual(texts, [['fillText', text, W / 2, top + hgt / 2, 'center']]);
});

test('a caption with a line break draws one box with one line per segment', async () => {
  const { boxes, texts } = await run([{ kind: 'mark', text: 'A行\nB行很長一點' }]);
  assert.equal(boxes.length, 1);
  assert.deepEqual(texts.map((t) => t[1]), ['A行', 'B行很長一點']);
  assert.ok(texts[1][3] > texts[0][3]);
  const [, , top, , hgt] = boxes[0];
  assert.ok(Math.abs(top + hgt - (H - LABEL.bottom * sc)) < 1e-6, 'box bottom stays where a one-line box ends');
  assert.ok(Math.abs(boxes[0][3] - ([...'B行很長一點'].length * LABEL.size * sc + 2 * LABEL.padX * sc)) < 1e-6, 'width follows the widest line');
});

test('every line of a multi-line caption is centred on the box', async () => {
  const { boxes, texts } = await run([{ kind: 'mark', text: '短\n這一行比較長很多' }]);
  const [, left, , width] = boxes[0];
  for (const t of texts) {
    assert.equal(t[4], 'center', t[1]);
    assert.ok(Math.abs(t[2] - (left + width / 2)) < 1e-6, t[1]);
  }
});

test('a key label sits above a multi-line caption', async () => {
  const { boxes } = await run([{ kind: 'mark', text: '第一行\n第二行' }, { kind: 'key', text: '按鍵：Escape' }]);
  const cap = boxes[0], key = boxes[1];
  assert.ok(cap[4] > LABEL.height * sc, 'caption box is taller than one line');
  assert.ok(key[2] + key[4] <= cap[2] - LABEL.gap * sc + 1e-6);
});

test('a caption marked top sits the same distance from the top edge', async () => {
  const { boxes } = await run([{ kind: 'mark', text: '第一行\n第二行', at: 'top' }]);
  assert.ok(Math.abs(boxes[0][2] - LABEL.bottom * sc) < 1e-6);
});

test('a key label stays at the bottom when the caption is at the top', async () => {
  const { boxes } = await run([{ kind: 'mark', text: '字幕', at: 'top' }, { kind: 'key', text: '按鍵：Escape' }]);
  const key = boxes[1];
  assert.ok(Math.abs(key[2] + key[4] - (H - LABEL.bottom * sc)) < 1e-6);
});

test('overlayAt passes on where a caption sits', async () => {
  const { overlayAt } = await import('../overlay.mjs');
  const spec = overlayAt([{ type: 'move', t: 0, x: 1, y: 1 }, { type: 'mark', t: 0, text: '上', at: 'top' }, { type: 'mark', t: 1, text: '下' }], 0.5);
  assert.deepEqual(spec.labels, [{ kind: 'mark', text: '上', at: 'top' }]);
  assert.deepEqual(overlayAt([{ type: 'move', t: 0, x: 1, y: 1 }, { type: 'mark', t: 0, text: '下' }], 0.5).labels, [{ kind: 'mark', text: '下', at: 'bottom' }]);
});
