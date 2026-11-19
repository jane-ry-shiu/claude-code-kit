import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { PLACEHOLDER, luhnValid, maskSecrets, findSecrets, maskInitScript } from '../lib/secrets.mjs';

const SECRETS = [
  ['bearer JWT', 'Authorization: Bearer eyJhbGciOi.eyJzdWIi.abc123', 'eyJhbGciOi'],
  ['AWS key', 'key AKIAIOSFODNN7EXAMPLE here', 'AKIAIOSFODNN7EXAMPLE'],
  ['GitHub token', 'ghp_1234567890abcdefghijklmnopqrstuvwx12', 'ghp_1234567890'],
  ['OpenAI-style key', 'sk-proj-abcdefghijklmnop1234', 'sk-proj-abcdefghijklmnop1234'],
  ['labelled token', 'token: 9f8e7d6c5b4a39281706f5e4d3c2b1a0', '9f8e7d6c5b4a39281706f5e4d3c2b1a0'],
  ['spaced card', 'card 4111 1111 1111 1111 ok', '4111 1111 1111 1111'],
  ['plain card', '4111111111111111', '4111111111111111'],
  ['card followed by more digits', '4111 1111 1111 1111 123', '4111 1111 1111 1111'],
  ['card after a count', 'Item 2 4111111111111111', '4111111111111111'],
  ['spaced card after a number', 'No. 1 4111 1111 1111 1111', '4111 1111 1111 1111'],
  ['lower-case bearer token', 'authorization: bearer abcdefghijklmnop', 'abcdefghijklmnop'],
  ['token without a colon', 'Token 9f8e7d6c5b4a39281706f5e4d3c2b1a0', '9f8e7d6c5b4a39281706f5e4d3c2b1a0'],
];

for (const [name, text, secret] of SECRETS) {
  test(`masks a ${name}`, () => {
    const out = maskSecrets(text);
    assert.ok(!out.includes(secret), out);
    assert.ok(out.includes(PLACEHOLDER), out);
    assert.deepEqual(findSecrets(out), []);
  });
}

for (const text of ['Token refresh happens every 30 minutes', 'sam.lee@example.com', 'Shipping Team', '訂單 1234567890123456', 'v1.0.0', 'Shipping Backend API']) {
  test(`leaves "${text}" visible`, () => {
    assert.equal(maskSecrets(text), text);
    assert.deepEqual(findSecrets(text), []);
  });
}

test('luhnValid tells card numbers from other 16-digit numbers', () => {
  assert.equal(luhnValid('4111111111111111'), true);
  assert.equal(luhnValid('1234567890123456'), false);
});

test('site patterns are masked too', () => {
  assert.equal(maskSecrets('id ORD-77 done', ['ORD-\\d+']), `id ${PLACEHOLDER} done`);
  assert.deepEqual(findSecrets('id ORD-77', ['ORD-\\d+']), ['ORD-77']);
});

test('the browser init script compiles', () => {
  assert.doesNotThrow(() => new vm.Script(maskInitScript(['ORD-\\d+'])));
});

test('the browser init script masks text when run against a document', () => {
  const nodes = [{ nodeValue: 'token: 9f8e7d6c5b4a39281706f5e4d3c2b1a0' }, { nodeValue: 'Shipping Team' }];
  const inputs = [{ value: 'ghp_1234567890abcdefghijklmnopqrstuvwx12' }];
  const sandbox = {
    NodeFilter: { SHOW_TEXT: 4 },
    MutationObserver: class { observe() {} },
    document: {
      body: {},
      documentElement: {},
      readyState: 'complete',
      addEventListener() {},
      createTreeWalker: () => { let i = -1; return { nextNode: () => (++i < nodes.length ? nodes[i] : null) }; },
      querySelectorAll: () => inputs,
    },
  };
  vm.runInNewContext(maskInitScript(), sandbox);
  assert.equal(nodes[0].nodeValue, `token: ${PLACEHOLDER}`);
  assert.equal(nodes[1].nodeValue, 'Shipping Team');
  assert.equal(inputs[0].value, PLACEHOLDER);
});
