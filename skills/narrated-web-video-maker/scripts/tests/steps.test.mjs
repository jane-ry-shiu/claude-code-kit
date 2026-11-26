import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { isAllowedRequest, holdSeconds } from '../lib/guard.mjs';
import { setupStepSource, recordStepSource, recordCues } from '../lib/steps.mjs';

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
const fakeSession = () => {
  const s = { sent: [], handlers: {} };
  s.send = async (method, params) => { s.sent.push({ method, params }); };
  s.on = (event, fn) => { s.handlers[event] = fn; };
  return s;
};
const fakeContext = () => {
  const c = { cookies: [], routes: [], scripts: [], sessions: [], openPage: null, page: { id: 'first' } };
  c.addCookies = async (ck) => { c.cookies.push(...ck); };
  c.route = async (match, handler) => { c.routes.push({ match, handler }); };
  c.addInitScript = async (s) => { c.scripts.push(s); };
  c.pages = () => [c.page];
  c.newCDPSession = async (page) => { const s = fakeSession(); s.page = page; c.sessions.push(s); return s; };
  c.on = (event, fn) => { if (event === 'page') c.openPage = fn; };
  return c;
};
const globToRegExp = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
const interceptPatterns = (session) => session.sent.find((m) => m.method === 'Fetch.enable').params.patterns.map((p) => p.urlPattern);
const intercepts = (session, url) => interceptPatterns(session).some((g) => globToRegExp(g).test(url));
const pause = async (session, method, url) => {
  const before = session.sent.length;
  await session.handlers['Fetch.requestPaused']({ requestId: 'r1', request: { method, url } });
  return session.sent.slice(before).map((m) => m.method);
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
  const [session] = context.sessions;
  assert.equal(intercepts(session, 'https://x.example.com/api/z'), true);
  assert.equal(intercepts(session, 'https://other.com/api/z'), false);
  assert.deepEqual(await pause(session, 'DELETE', 'https://x.example.com/api/thing'), ['Fetch.failRequest']);
  assert.deepEqual(await pause(session, 'GET', 'https://x.example.com/api/thing'), ['Fetch.continueRequest']);
  assert.deepEqual(await pause(session, 'POST', 'https://x.example.com/api/read/1'), ['Fetch.continueRequest']);
  assert.deepEqual(plain(h.state.guardLog), ['DELETE /api/thing']);
});

const setupWith = async (siteCfg, cookies) => {
  const step = vm.runInNewContext(`(${setupStepSource(siteCfg)})`, { chromium: fakeChromium(cookies), URL });
  const context = fakeContext();
  const out = await step({}, context, { state: {} });
  return { out: plain(out), context, guarded: (url) => intercepts(context.sessions[0], url) };
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

test('setup step keeps the browser cache by intercepting only the guarded hosts', async () => {
  const { context, guarded } = await setupWith(site, [{ domain: 'x.example.com', name: 'a' }]);
  assert.equal(context.routes.length, 0);
  assert.equal(context.sessions[0].sent.some((m) => m.method === 'Network.setCacheDisabled'), false);
  assert.equal(guarded('https://x.example.com.evil.net/a'), false);
  assert.equal(guarded('https://assets.example.com/app.js'), false);
});

test('setup step guards pages opened after it ran', async () => {
  const { context } = await setupWith(site, [{ domain: 'x.example.com', name: 'a' }]);
  await context.openPage({ id: 'later' });
  await new Promise((r) => setImmediate(r));
  const later = context.sessions.find((s) => s.page.id === 'later');
  assert.ok(later, 'no guard on the later page');
  assert.equal(intercepts(later, 'https://x.example.com/api/z'), true);
  assert.deepEqual(await pause(later, 'PUT', 'https://x.example.com/api/z'), ['Fetch.failRequest']);
});

test('setup step fails before recording when there is no session', async () => {
  const step = vm.runInNewContext(`(${setupStepSource(site)})`, { chromium: fakeChromium([]), URL });
  await assert.rejects(step({}, fakeContext(), { state: {} }), /sign in to https:\/\/x\.example\.com in the shared Chrome/);
});

test('setup step also signs in to every alsoSignIn site and guards its writes', async () => {
  const { out, context, guarded } = await setupWith(
    { ...site, alsoSignIn: ['https://code.example.org'] },
    [{ domain: 'x.example.com', name: 'a' }, { domain: '.code.example.org', name: 'gh' }, { domain: 'other.com', name: 'b' }],
  );
  assert.deepEqual(context.cookies.map((c) => c.name), ['a', 'gh']);
  assert.equal(out.cookies, 2);
  assert.equal(guarded('https://code.example.org/api/write'), true);
  assert.deepEqual(out.guardHosts, ['x.example.com', 'code.example.org']);
});

test('setup step names the alsoSignIn site that has no session', async () => {
  const step = vm.runInNewContext(`(${setupStepSource({ ...site, alsoSignIn: ['https://code.example.org'] })})`, {
    chromium: fakeChromium([{ domain: 'x.example.com', name: 'a' }]), URL,
  });
  await assert.rejects(step({}, fakeContext(), { state: {} }), /no session for code\.example\.org: sign in to https:\/\/code\.example\.org in the shared Chrome/);
});

test('setup step without a cookie source skips sign-in', async () => {
  const step = vm.runInNewContext(`(${setupStepSource({ ...site, cookieSource: undefined })})`, { URL });
  assert.deepEqual(plain(await step({}, fakeContext(), { state: {} })), { cookies: 0, guardHosts: ['x.example.com'] });
});

const fakeRun = () => {
  const log = [];
  const page = {
    goto: async (u, o) => log.push(['goto', u, o && o.waitUntil]),
    waitForLoadState: async (state, o) => log.push(['wait', state, o && o.timeout]),
    evaluate: async () => 'page text token: 9f8e7d6c5b4a39281706f5e4d3c2b1a0',
  };
  const h = {
    state: { guardLog: ['DELETE /x'] },
    sleep: async (ms) => log.push(['sleep', Math.round(ms / 100) / 10]),
    recStart: async (n) => log.push(['recStart', n]),
    recStop: async () => { log.push(['recStop']); return { mp4: 'v.mp4', events: [] }; },
    mark: (t, dur, o) => log.push(['mark', t, o && o.at]),
  };
  return { log, page, h };
};

const plan = {
  name: 'demo', baseUrl: 'https://x.example.com', start: '/', secretPatterns: [],
  cues: [
    { scene: 0, sentence: 0, text: '第一句\n第二行', hold: 2, action: 'async (page, h) => { h.mark("unexpected-if-run-twice"); }' },
    { scene: 0, sentence: 0, text: '第一句續', hold: 1 },
    { scene: 1, sentence: 0, text: '第二場', hold: 1, captionAt: 'top' },
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

test('record step puts a cue caption at the top when the cue asks for it', async () => {
  const step = vm.runInNewContext(`(${recordStepSource(plan)})`, { Date });
  const { log, page, h } = fakeRun();
  await step(page, {}, h);
  const at = Object.fromEntries(log.filter((l) => l[0] === 'mark' && l[1] !== 'unexpected-if-run-twice').map((l) => [l[1], l[2]]));
  assert.deepEqual(at, { '第一句\n第二行': 'bottom', '第一句續': 'bottom', '第二場': 'top' });
});

test('record step waits for the start page to load, then at most 10 s for it to go quiet', async () => {
  const step = vm.runInNewContext(`(${recordStepSource(plan)})`, { Date });
  const { log, page, h } = fakeRun();
  await step(page, {}, h);
  const before = log.slice(0, log.findIndex((l) => l[0] === 'recStart'));
  assert.deepEqual(before.filter((l) => l[0] !== 'sleep'), [['goto', 'https://x.example.com/', 'load'], ['wait', 'networkidle', 10000]]);
});

test('record step still records when the start page never goes quiet', async () => {
  const step = vm.runInNewContext(`(${recordStepSource(plan)})`, { Date });
  const { log, page, h } = fakeRun();
  page.waitForLoadState = async () => { throw new Error('Timeout 10000ms exceeded.'); };
  const out = await step(page, {}, h);
  assert.equal(log.filter((l) => l[0] === 'recStart').length, 1);
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

test('recordCues keeps what the recording step reads, captionAt included, and drops voice fields', () => {
  const cues = [
    { scene: 0, sentence: 0, text: '一', spoken: '一', hold: 2, action: 'async (page, h) => {}', wav: '/v/1.wav', dur: 1.5, pause: 'clause' },
    { scene: 0, sentence: 1, text: '二', spoken: '二', hold: 3, captionAt: 'top', wav: '/v/2.wav', dur: 2, pause: 'scene' },
  ];
  assert.deepEqual(recordCues(cues), [
    { scene: 0, sentence: 0, text: '一', hold: 2, action: 'async (page, h) => {}' },
    { scene: 0, sentence: 1, text: '二', hold: 3, captionAt: 'top' },
  ]);
});
