import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { isAllowedRequest, holdSeconds } from '../lib/guard.mjs';
import { setupStepSource, recordStepSource } from '../lib/steps.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));

test('isAllowedRequest lets reads through and blocks everything else', () => {
  assert.equal(isAllowedRequest('GET', '/x', []), true);
  assert.equal(isAllowedRequest('HEAD', '/x', []), true);
  assert.equal(isAllowedRequest('DELETE', '/api/catalog/entities/x', []), false);
  assert.equal(isAllowedRequest('POST', '/api/catalog/entities/by-refs', ['^/api/catalog/entities/by-refs']), true);
  assert.equal(isAllowedRequest('POST', '/api/catalog/locations', ['^/api/catalog/entities/by-refs']), false);
  assert.equal(isAllowedRequest('PUT', '/api/catalog/entities/by-refs', ['^/api/catalog/entities/by-refs']), false);
});

test('holdSeconds adds a pause that grows from mid-sentence to sentence end to scene end', () => {
  assert.equal(holdSeconds(5, 'clause'), 5.6);
  assert.equal(holdSeconds(5, 'sentence'), 6.1);
  assert.equal(holdSeconds(5, 'scene'), 7);
});

test('holdSeconds rejects an unknown pause', () => {
  assert.throws(() => holdSeconds(5, 'paragraph'), /pause/);
});

const site = { baseUrl: 'https://x.example.com', cookieHost: 'x.example.com', cookieSource: 'http://127.0.0.1:9222', allowPost: ['^/api/read'], secretPatterns: [] };

const fakeChromium = (cookies) => ({ connectOverCDP: async () => ({ contexts: () => [{ cookies: async () => cookies }] }) });
const fakeContext = () => {
  const c = { cookies: [], routes: [], scripts: [] };
  c.addCookies = async (ck) => { c.cookies.push(...ck); };
  c.route = async (match, handler) => { c.routes.push({ match, handler }); };
  c.addInitScript = async (s) => { c.scripts.push(s); };
  return c;
};

test('setup step copies only the site cookies, guards writes and installs masking', async () => {
  const step = vm.runInNewContext(`(${setupStepSource(site)})`, {
    chromium: fakeChromium([{ domain: '.x.example.com', name: 'a' }, { domain: 'other.com', name: 'b' }]), URL,
  });
  const context = fakeContext();
  const h = { state: {} };
  const out = await step({}, context, h);
  assert.deepEqual(plain(out), { cookies: 1, guardHosts: ['x.example.com'] });
  assert.deepEqual(context.cookies.map((c) => c.name), ['a']);
  assert.equal(context.scripts.length, 1);
  const { match, handler } = context.routes[0];
  assert.equal(match(new URL('https://x.example.com/api/z')), true);
  assert.equal(match(new URL('https://other.com/api/z')), false);
  const routeFor = (method, path) => {
    const r = { done: '' };
    r.request = () => ({ method: () => method, url: () => `https://x.example.com${path}` });
    r.abort = async () => { r.done = 'abort'; };
    r.continue = async () => { r.done = 'continue'; };
    return r;
  };
  const del = routeFor('DELETE', '/api/thing'); await handler(del);
  const get = routeFor('GET', '/api/thing'); await handler(get);
  const post = routeFor('POST', '/api/read/1'); await handler(post);
  assert.deepEqual([del.done, get.done, post.done], ['abort', 'continue', 'continue']);
  assert.deepEqual(plain(h.state.guardLog), ['DELETE /api/thing']);
});

const setupWith = async (siteCfg, cookies) => {
  const step = vm.runInNewContext(`(${setupStepSource(siteCfg)})`, { chromium: fakeChromium(cookies), URL });
  const context = fakeContext();
  const out = await step({}, context, { state: {} });
  return { out: plain(out), context, guarded: (url) => context.routes[0].match(new URL(url)) };
};

test('setup step copies session cookies set on a parent domain', async () => {
  const { context } = await setupWith(site, [{ domain: '.example.com', name: 'sso' }, { domain: 'y.example.com', name: 'sibling' }]);
  assert.deepEqual(context.cookies.map((c) => c.name), ['sso']);
});

test('setup step guards the site host even when cookieHost names the parent domain', async () => {
  const { guarded } = await setupWith({ ...site, cookieHost: 'example.com' }, [{ domain: '.example.com', name: 'sso' }]);
  assert.equal(guarded('https://x.example.com/api/z'), true);
});

test('setup step guards a site with a port and reads its cookies without the port', async () => {
  const { context, guarded } = await setupWith({ ...site, baseUrl: 'http://localhost:3000', cookieHost: undefined }, [{ domain: 'localhost', name: 'sid' }]);
  assert.deepEqual(context.cookies.map((c) => c.name), ['sid']);
  assert.equal(guarded('http://localhost:3000/api/z'), true);
});

test('setup step guards extra API hosts and reports every guarded host', async () => {
  const { out, guarded } = await setupWith({ ...site, guardHosts: ['api.example.net'] }, [{ domain: 'x.example.com', name: 'a' }]);
  assert.equal(guarded('https://api.example.net/v1/delete'), true);
  assert.equal(guarded('https://cdn.example.org/a.js'), false);
  assert.deepEqual(out.guardHosts, ['x.example.com', 'api.example.net']);
});

test('setup step fails before recording when there is no session', async () => {
  const step = vm.runInNewContext(`(${setupStepSource(site)})`, { chromium: fakeChromium([]), URL });
  await assert.rejects(step({}, fakeContext(), { state: {} }), /sign in to https:\/\/x\.example\.com in the shared Chrome/);
});

test('setup step without a cookie source skips sign-in', async () => {
  const step = vm.runInNewContext(`(${setupStepSource({ ...site, cookieSource: undefined })})`, { URL });
  assert.deepEqual(plain(await step({}, fakeContext(), { state: {} })), { cookies: 0, guardHosts: ['x.example.com'] });
});

const fakeRun = () => {
  const log = [];
  const page = { goto: async (u) => log.push(['goto', u]), evaluate: async () => 'page text token: 9f8e7d6c5b4a39281706f5e4d3c2b1a0' };
  const h = {
    state: { guardLog: ['DELETE /x'] },
    sleep: async (ms) => log.push(['sleep', Math.round(ms / 100) / 10]),
    recStart: async (n) => log.push(['recStart', n]),
    recStop: async () => { log.push(['recStop']); return { mp4: 'v.mp4', events: [] }; },
    mark: (t) => log.push(['mark', t]),
  };
  return { log, page, h };
};

const plan = {
  name: 'demo', baseUrl: 'https://x.example.com', start: '/', secretPatterns: [],
  cues: [
    { scene: 0, sentence: 0, text: '第一句\n第二行', hold: 2, action: 'async (page, h) => { h.mark("unexpected-if-run-twice"); }' },
    { scene: 0, sentence: 0, text: '第一句續', hold: 1 },
    { scene: 1, sentence: 0, text: '第二場', hold: 1 },
  ],
};

test('record step marks each cue, runs a sentence action once, holds, and scans each scene end', async () => {
  const step = vm.runInNewContext(`(${recordStepSource(plan)})`, { Date });
  const { log, page, h } = fakeRun();
  const out = await step(page, {}, h);
  const marks = log.filter((l) => l[0] === 'mark').map((l) => l[1]);
  assert.deepEqual(marks, ['第一句\n第二行', 'unexpected-if-run-twice', '第一句續', '第二場']);
  assert.equal(log.filter((l) => l[0] === 'recStop').length, 1);
  assert.equal(out.secretHits.length, 2);
  assert.deepEqual(plain(out.secretHits[0]), { scene: 0, hits: ['9f8e7d6c5b4a39281706f5e4d3c2b1a0'] });
  assert.deepEqual(plain(out.guardLog), ['DELETE /x']);
  assert.equal(out.rec.mp4, 'v.mp4');
});

test('record step stops the recording and names the sentence when an action throws', async () => {
  const bad = { ...plan, cues: [{ scene: 2, sentence: 3, text: '壞掉', hold: 1, action: 'async () => { throw new Error("no such button"); }' }] };
  const step = vm.runInNewContext(`(${recordStepSource(bad)})`, { Date });
  const { log, page, h } = fakeRun();
  await assert.rejects(step(page, {}, h), /scene 2 sentence 3: no such button/);
  assert.equal(log.filter((l) => l[0] === 'recStop').length, 1);
});

test('record step keeps the failing sentence in the error when stopping the recording also fails', async () => {
  const bad = { ...plan, cues: [{ scene: 4, sentence: 1, text: '壞掉', hold: 1, action: 'async () => { throw new Error("no such node"); }' }] };
  const step = vm.runInNewContext(`(${recordStepSource(bad)})`, { Date });
  const { page, h } = fakeRun();
  h.recStop = async () => { throw new Error('screencast produced no frames'); };
  await assert.rejects(step(page, {}, h), (e) => {
    assert.match(e.message, /scene 4 sentence 1: no such node/);
    assert.match(e.message, /screencast produced no frames/);
    return true;
  });
});

test('record step starts the next subtitle only after a slow action ends', async () => {
  const slow = { ...plan, cues: [
    { scene: 0, sentence: 0, text: '慢動作', hold: 0.01, action: 'async (page, h) => { await new Promise((r) => setTimeout(r, 60)); h.state.done = true; page.log.push(["action-done"]); }' },
    { scene: 0, sentence: 1, text: '下一句', hold: 0.01 },
  ] };
  const step = vm.runInNewContext(`(${recordStepSource(slow)})`, { Date, setTimeout });
  const { log, page, h } = fakeRun();
  page.log = log;
  await step(page, {}, h);
  const order = log.filter((l) => l[0] === 'mark' || l[0] === 'action-done').map((l) => (l[0] === 'mark' ? l[1] : l[0]));
  assert.deepEqual(order, ['慢動作', 'action-done', '下一句']);
});
