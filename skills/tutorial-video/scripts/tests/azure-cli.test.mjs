import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, '..', 'make-video.mjs');
const scenes = join(here, 'fixtures/demo.scenes.mjs');
const KEY = 'k'.repeat(32);
const browserSkip = !process.env.PLAYWRIGHT_CORE && 'set PLAYWRIGHT_CORE to run the browser smoke tests';

const wavBytes = () => execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=d=1.2', '-ar', '48000', '-ac', '1', '-f', 'wav', '-']);

/** Serves the demo page on GET and answers Azure TTS POSTs with `status`. */
const serve = (status) => new Promise((resolve) => {
  const html = readFileSync(join(here, 'fixtures/demo-site.html'));
  const ttsCalls = [];
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/tts') {
      req.resume();
      ttsCalls.push(req.headers);
      req.on('end', () => { res.writeHead(status); res.end(status === 200 ? wavBytes() : 'no'); });
      return;
    }
    if (req.method === 'POST') { res.end('deleted'); return; }
    res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(html);
  });
  server.listen(0, '127.0.0.1', () => resolve({ server, ttsCalls, url: `http://127.0.0.1:${server.address().port}` }));
});

const runCli = (args, env) => new Promise((resolve) => {
  execFile('node', [cli, scenes, ...args], { env: { ...process.env, DEMO_MODE: 'ok', ...env }, timeout: 180000 },
    (err, stdout, stderr) => resolve({ code: err ? err.code ?? 1 : 0, stdout, stderr }));
});

const azureEnv = (site) => ({
  DEMO_URL: site.url, DEMO_VOICE: 'azure',
  AZURE_SPEECH_KEY: KEY, AZURE_SPEECH_REGION: 'eastasia', AZURE_SPEECH_ENDPOINT: `${site.url}/tts`,
});

test('a rejected Azure key stops the run before the browser starts', { timeout: 60000 }, async () => {
  const site = await serve(401);
  const out = mkdtempSync(join(tmpdir(), 'tv-azure-cli-'));
  try {
    const r = await runCli([out], azureEnv(site));
    assert.equal(r.code, 1);
    assert.match(r.stderr, /key or region \(HTTP 401\)/);
    assert.match(r.stderr, /--voice mac/);
    assert.doesNotMatch(r.stderr, /harness port/);
    assert.ok(!r.stderr.includes(KEY));
    assert.equal(site.ttsCalls.length, 1);
  } finally { site.server.close(); }
});

test('an Azure scene file makes the video with the Azure voice and caches it', { skip: browserSkip, timeout: 200000 }, async () => {
  const site = await serve(200);
  const out = mkdtempSync(join(tmpdir(), 'tv-azure-cli-'));
  try {
    const r = await runCli([out], azureEnv(site));
    assert.equal(r.code, 0, r.stderr);
    const report = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8'));
    assert.equal(report.voice, 'azure zh-TW-HsiaoChenNeural');
    assert.ok(Math.abs(report.duration - report.audioDuration) < 0.3);
    const calls = site.ttsCalls.length;
    assert.ok(calls >= 2);
    assert.equal(readdirSync(join(out, 'voice', 'cache')).filter((f) => f.endsWith('.wav')).length, calls);
  } finally { site.server.close(); }
});

test('--voice mac voices an Azure scene file with Meijia and never calls Azure', { skip: browserSkip, timeout: 200000 }, async () => {
  const site = await serve(500);
  const out = mkdtempSync(join(tmpdir(), 'tv-azure-cli-'));
  try {
    const r = await runCli([out, '--voice', 'mac'], azureEnv(site));
    assert.equal(r.code, 0, r.stderr);
    const report = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8'));
    assert.equal(report.voice, 'say Meijia');
    assert.equal(site.ttsCalls.length, 0);
    assert.ok(existsSync(join(out, 'demo-video.mp4')));
  } finally { site.server.close(); }
});
