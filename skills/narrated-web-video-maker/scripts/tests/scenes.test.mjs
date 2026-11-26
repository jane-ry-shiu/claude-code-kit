import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenes, buildCues } from '../lib/scenes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
process.env.DEMO_URL = 'http://127.0.0.1:9';

test('the demo scene file loads with defaults filled in', async () => {
  const sf = await loadScenes(join(here, 'fixtures/demo.scenes.mjs'));
  assert.equal(sf.name, 'demo-video');
  assert.equal(sf.start, '/');
  assert.equal(sf.scenes[0].sentences.length, 2);
});

test('every problem in a scene file is reported at once', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tv-scenes-'));
  const file = join(dir, 'bad.scenes.mjs');
  writeFileSync(file, `export default { name: 'bad', site: { baseUrl: 'http://x' }, scenes: [{ title: 't', sentences: [
    { say: '' }, { say: 'ok', do: 'x' }, { say: 'ok', async do(page) {} } ] }] };`);
  await assert.rejects(loadScenes(file), (e) => {
    assert.match(e.message, /scene 0 sentence 0: say is empty/);
    assert.match(e.message, /scene 0 sentence 1: do must be a function/);
    assert.match(e.message, /scene 0 sentence 2: do must be an arrow function/);
    return true;
  });
});

test('a scene file without name, baseUrl or scenes is rejected', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tv-scenes-'));
  const file = join(dir, 'empty.scenes.mjs');
  writeFileSync(file, 'export default { site: {}, scenes: [] };');
  await assert.rejects(loadScenes(file), (e) => /name/.test(e.message) && /baseUrl/.test(e.message) && /no scenes/.test(e.message));
});

test('buildCues attaches a sentence action to its first cue only', () => {
  const act = async () => {};
  const cues = buildCues({ scenes: [{ title: 't', sentences: [
    { say: '點進 Shipping Backend API 之後，About 卡片會告訴你它屬於哪個系統，由哪個團隊負責，往下捲還可以看到誰提供這支 API，又有誰在使用它。', do: act },
    { say: '下一句。' },
  ] }] });
  const first = cues.filter((c) => c.sentence === 0);
  assert.ok(first.length >= 2);
  assert.equal(first[0].action, act.toString());
  assert.ok(first.slice(1).every((c) => c.action === undefined));
  assert.deepEqual(cues.at(-1), { scene: 0, sentence: 1, text: '下一句', spoken: '下一句。', pause: 'scene' });
});

test('buildCues pauses briefly inside a sentence, longer after it, longest at a scene end', () => {
  const long = '點進 Shipping Backend API 之後，About 卡片會告訴你它屬於哪個系統，由哪個團隊負責，往下捲還可以看到誰提供這支 API，又有誰在使用它。';
  const cues = buildCues({ scenes: [
    { title: 'a', sentences: [{ say: long }, { say: '第二句。' }] },
    { title: 'b', sentences: [{ say: '最後一句。' }] },
  ] });
  const first = cues.filter((c) => c.scene === 0 && c.sentence === 0);
  assert.ok(first.slice(0, -1).every((c) => c.pause === 'clause'));
  assert.equal(first.at(-1).pause, 'sentence');
  assert.deepEqual(cues.filter((c) => c.pause === 'scene').map((c) => c.text), ['第二句', '最後一句']);
});

test('an action that writes its own subtitle is rejected before recording', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tv-scenes-'));
  const file = join(dir, 'mark.scenes.mjs');
  writeFileSync(file, `export default { name: 'mark', site: { baseUrl: 'http://x' }, scenes: [{ title: 't', sentences: [
    { say: 'ok', do: async (page, h) => { h.mark('extra'); } } ] }] };`);
  await assert.rejects(loadScenes(file), /scene 0 sentence 0: do must not call h\.mark/);
});

const writeScene = (voiceSource) => {
  const file = join(mkdtempSync(join(tmpdir(), 'tv-scenes-')), 'v.scenes.mjs');
  writeFileSync(file, `export default { name: 'v', site: { baseUrl: 'http://x' }, voice: ${voiceSource}, scenes: [{ title: 't', sentences: [{ say: 'ok' }] }] };`);
  return file;
};

test('an azure voice with a voice name is accepted', async () => {
  const sf = await loadScenes(writeScene(`{ engine: 'azure', name: 'zh-TW-HsiaoChenNeural', rate: '+10%' }`));
  assert.deepEqual(sf.voice, { engine: 'azure', name: 'zh-TW-HsiaoChenNeural', rate: '+10%' });
});

test('a voice that is neither azure nor a command is rejected', async () => {
  await assert.rejects(loadScenes(writeScene(`{ engine: 'polly', name: 'x' }`)), /voice must be \{ engine: 'azure', name \} or \{ command: \[\.\.\.\] \}/);
  await assert.rejects(loadScenes(writeScene(`{ engine: 'azure' }`)), /voice\.name must be an Azure voice short name/);
  await assert.rejects(loadScenes(writeScene(`{ engine: 'azure', name: 'zh-TW-HsiaoChenNeural', rate: 10 }`)), /voice\.rate must be a string/);
  await assert.rejects(loadScenes(writeScene(`{ command: ['say', 'hi'] }`)), /voice\.command must be an array of strings that writes to \{out\}/);
});

test('alsoSignIn must be a list of site URLs', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tv-scenes-'));
  const file = join(dir, 'signin.scenes.mjs');
  writeFileSync(file, `export default { name: 'signin', site: { baseUrl: 'http://x', alsoSignIn: ['github.com'] },
    scenes: [{ title: 't', sentences: [{ say: 'ok' }] }] };`);
  await assert.rejects(loadScenes(file), /site\.alsoSignIn must be a list of site URLs \(https:\/\/host\)/);
});

test('buildCues gives every cue of a sentence that sentence\'s caption position', () => {
  const long = '點進 Shipping Backend API 之後，About 卡片會告訴你它屬於哪個系統，由哪個團隊負責，往下捲還可以看到誰提供這支 API，又有誰在使用它。';
  const cues = buildCues({ scenes: [{ title: 't', sentences: [{ say: long, captionAt: 'top' }, { say: '下一句。' }] }] });
  assert.ok(cues.filter((c) => c.sentence === 0).every((c) => c.captionAt === 'top'));
  assert.equal(cues.at(-1).captionAt, undefined);
});

test('captionAt must be top or bottom', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tv-scenes-'));
  const file = join(dir, 'cap.scenes.mjs');
  writeFileSync(file, `export default { name: 'cap', site: { baseUrl: 'http://x' }, scenes: [{ title: 't', sentences: [{ say: 'ok', captionAt: 'middle' }] }] };`);
  await assert.rejects(loadScenes(file), /scene 0 sentence 0: captionAt must be 'top' or 'bottom'/);
});
