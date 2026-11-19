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
  assert.deepEqual(cues.at(-1), { scene: 0, sentence: 1, text: '下一句' });
});

test('an action that writes its own subtitle is rejected before recording', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tv-scenes-'));
  const file = join(dir, 'mark.scenes.mjs');
  writeFileSync(file, `export default { name: 'mark', site: { baseUrl: 'http://x' }, scenes: [{ title: 't', sentences: [
    { say: 'ok', do: async (page, h) => { h.mark('extra'); } } ] }] };`);
  await assert.rejects(loadScenes(file), /scene 0 sentence 0: do must not call h\.mark/);
});
