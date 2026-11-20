import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScript, lintScript, FILLERS } from '../lib/lint.mjs';

const problems = (md) => lintScript(md).map((p) => `${p.n}: ${p.problem}`);

test('parseScript reads number, narration and action', () => {
  const md = '## 1. 開場\n1. 點左邊的 APIs。（點側邊欄 APIs）\n';
  assert.deepEqual(parseScript(md), [{ n: 1, say: '點左邊的 APIs。', action: '點側邊欄 APIs' }]);
});

test('a sentence without an action has action null', () => {
  assert.deepEqual(parseScript('21. 接下來還有兩支影片。'), [{ n: 21, say: '接下來還有兩支影片。', action: null }]);
});

test('half-width brackets are the action', () => {
  assert.deepEqual(parseScript('3. 點 Filter。(點 Filter)'), [{ n: 3, say: '點 Filter。', action: '點 Filter' }]);
});

test('a sentence longer than one subtitle is flagged', () => {
  const md = '1. 接下來還有兩支影片，分別給後端和前端，說明怎麼更新自己服務的資料，以及 Backstage 能怎麼幫你開發。';
  const out = problems(md);
  assert.equal(out.length, 1);
  assert.match(out[0], /^1: splits into 2 subtitles/);
});

test('filler words are flagged', () => {
  assert.deepEqual([...FILLERS], ['嗯', '痾', '呃']);
  for (const f of FILLERS) {
    assert.deepEqual(problems(`2. ${f}，點左邊的 APIs。`), [`2: filler 「${f}」`]);
  }
});

test('ordinary words are not flagged', () => {
  assert.deepEqual(problems('1. 透過 Filter 找到服務，再點那個按鈕進行設定。'), []);
});

test('code-style English is flagged, acronyms are not', () => {
  for (const word of ['openapi/README.md', 'my-backend-api', 'README']) {
    const out = problems(`4. 打開 ${word} 看看。`);
    assert.equal(out.length, 1, word);
    assert.match(out[0], new RegExp(`^4: write 「${word.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}」 the way it is said`));
  }
  assert.deepEqual(problems('5. API、URL、JSON 和 UI 都在這裡。'), []);
});

test('words on the keep line are not flagged as code-style English', () => {
  assert.equal(problems('1. 用 HTTPS 連線到 ACMECLOUD。').length, 2);
  assert.deepEqual(problems('keep: HTTPS, ACMECLOUD\n1. 用 HTTPS 連線到 ACMECLOUD。'), []);
  assert.deepEqual(problems('keep: HTTPS\n1. 用 HTTPS 連線到 ACMECLOUD。'), ['1: write 「ACMECLOUD」 the way it is said']);
});

test('a write action is flagged unless it says 不點', () => {
  for (const action of ['點 Save', '按下送出', 'click Delete']) {
    assert.deepEqual(problems(`6. 改完就好。（${action}）`), ['6: the action writes; stop before it']);
  }
  assert.deepEqual(problems('6. 改完之後按下 Save 就可以了。（指標停在 Save 上，不點）'), []);
});

test('a status or label that only contains a write word is not a write action', () => {
  for (const action of ['打開 Status 下拉選單，選 Submitted', '點 Saved searches', '篩選 Deleted items']) {
    assert.deepEqual(problems(`7. 只看某一種狀態。（${action}）`), [], action);
  }
});

test('a clean script has no problems', () => {
  const md = [
    '# 示範',
    '## 1. 開場',
    '1. Catalog 是 Backstage 的首頁。（指標指向頁面標題）',
    '2. 點左邊的 APIs，可以瀏覽所有已經登記在 Backstage 上的 API。（點側邊欄 APIs）',
    '3. 改完之後按下送出就可以了，這裡只是示範，所以不會真的送出。',
  ].join('\n');
  assert.deepEqual(lintScript(md), []);
});
