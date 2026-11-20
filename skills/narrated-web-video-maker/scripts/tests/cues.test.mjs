import test from 'node:test';
import assert from 'node:assert/strict';
import { splitCues, splitCueParts, textWidth } from '../lib/cues.mjs';

const strip = (s) => s.replace(/[，、；：。！？\s\n]/g, '');
const lines = (cue) => cue.split('\n');

test('textWidth counts CJK as 1 and ASCII as 0.5', () => {
  assert.equal(textWidth('中文'), 2);
  assert.equal(textWidth('ab'), 1);
  assert.equal(textWidth('API 和'), 3);
});

test('a sentence that fits two lines stays one cue of two lines', () => {
  const s = 'Backstage 的首頁就是 Catalog，公司的服務、API 和基礎設施，都登記在這裡。';
  const cues = splitCues(s);
  assert.equal(cues.length, 1);
  assert.equal(lines(cues[0]).length, 2);
  for (const l of lines(cues[0])) assert.ok(textWidth(l) <= 22, l);
  assert.equal(strip(cues.join('')), strip(s));
});

test('a short sentence is one single-line cue without trailing punctuation', () => {
  assert.deepEqual(splitCues('這裡改成 API。'), ['這裡改成 API']);
});

test('a long sentence becomes several cues of at most two lines each', () => {
  const s = '點進 Shipping Backend API 之後，About 卡片會告訴你它屬於哪個系統，由哪個團隊負責，往下捲還可以看到誰提供這支 API，又有誰在使用它，最下面的 Relations 會把這些關係畫成一張圖。';
  const cues = splitCues(s);
  assert.ok(cues.length >= 2);
  for (const c of cues) {
    assert.ok(lines(c).length <= 2, c);
    for (const l of lines(c)) assert.ok(textWidth(l) <= 22, l);
  }
  assert.equal(strip(cues.join('')), strip(s));
});

test('an ASCII run is never cut, even past the limit', () => {
  const run = 'shipping-backend-api-very-long-name-here-and-more-text';
  const cues = splitCues(`點進 ${run} 這個頁面`);
  assert.ok(cues.some((c) => lines(c).includes(run) || lines(c).some((l) => l.split(' ').includes(run))), cues.join(' | '));
});

test('an empty or punctuation-only sentence throws', () => {
  assert.throws(() => splitCues('  。 '), /empty/);
});

test('the voice keeps the punctuation the caption drops at a line break', () => {
  const s = 'Backstage 的首頁就是 Catalog，公司的服務、API 和基礎設施，都登記在這裡。';
  const parts = splitCueParts(s);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].text, splitCues(s)[0]);
  assert.equal(parts[0].spoken, s);
});

test('a single-line cue is spoken with its punctuation', () => {
  assert.deepEqual(splitCueParts('這裡改成 API。'), [{ text: '這裡改成 API', spoken: '這裡改成 API。' }]);
});

test('a line break at a space between words stays a space in the voice', () => {
  const s = '請打開 Shipping Backend API Specification Document Viewer Page 看看';
  const [first] = splitCueParts(s, 12);
  assert.equal(first.text, '請打開 Shipping Backend\nAPI Specification');
  assert.equal(first.spoken, '請打開 Shipping Backend API Specification');
});
