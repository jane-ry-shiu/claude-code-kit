import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { execFile, execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, '..', 'make-video.mjs');
const scenes = join(here, 'fixtures/demo.scenes.mjs');
const skip = !process.env.PLAYWRIGHT_CORE && 'set PLAYWRIGHT_CORE to run the browser smoke tests';

const serve = () => new Promise((resolve) => {
  const html = readFileSync(join(here, 'fixtures/demo-site.html'));
  const server = http.createServer((req, res) => {
    if (req.method === 'POST') { res.end('deleted'); return; }
    res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(html);
  });
  server.listen(0, '127.0.0.1', () => resolve(server));
});

const runCli = (env, out) => new Promise((resolve) => {
  execFile('node', [cli, scenes, out], { env: { ...process.env, ...env }, timeout: 180000 }, (err, stdout, stderr) => resolve({ code: err ? err.code ?? 1 : 0, stdout, stderr }));
});
const listening = (port) => new Promise((resolve) => {
  const s = net.connect(port, '127.0.0.1'); s.on('connect', () => { s.destroy(); resolve(true); }); s.on('error', () => resolve(false));
});
const ffprobe = async (file, stream) => parseFloat((await promisify(execFile)('ffprobe', ['-v', 'error', '-select_streams', stream, '-show_entries', 'stream=duration', '-of', 'csv=p=0', file])).stdout.trim());

test('makes a narrated video, blocks the write and masks the token', { skip, timeout: 200000 }, async () => {
  const server = await serve();
  const out = mkdtempSync(join(tmpdir(), 'tv-smoke-'));
  try {
    const r = await runCli({ DEMO_URL: `http://127.0.0.1:${server.address().port}`, DEMO_MODE: 'ok' }, out);
    assert.equal(r.code, 0, r.stderr);
    const mp4 = join(out, 'demo-video.mp4');
    assert.ok(existsSync(mp4));
    assert.ok(Math.abs((await ffprobe(mp4, 'v:0')) - (await ffprobe(mp4, 'a:0'))) < 0.3);
    const report = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8'));
    assert.ok(report.guardLog.includes('POST /api/delete'), JSON.stringify(report.guardLog));
    assert.deepEqual(report.guardHosts, [`127.0.0.1:${server.address().port}`]);
    assert.ok(report.secretHits.every((s) => s.hits.length === 0), JSON.stringify(report.secretHits));
    const cues = JSON.parse(readFileSync(join(out, 'cues.json'), 'utf8'));
    assert.equal(cues.length, 2);
    assert.ok(cues[1].start > cues[0].start + 1.2);
    assert.ok(existsSync(join(out, 'frames', 'scene-0.png')));
    assert.ok(!existsSync(join(out, '.profile')));
  } finally { server.close(); }
});

test('a failing action stops everything and names the sentence', { skip, timeout: 200000 }, async () => {
  const server = await serve();
  const out = mkdtempSync(join(tmpdir(), 'tv-smoke-'));
  try {
    const r = await runCli({ DEMO_URL: `http://127.0.0.1:${server.address().port}`, DEMO_MODE: 'throw' }, out);
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /scene 0 sentence 0/);
    assert.ok(!existsSync(join(out, '.profile')));
    const port = Number((r.stderr.match(/harness port (\d+)/) || [])[1]);
    assert.ok(port > 0, 'runner reports its harness port');
    assert.equal(await listening(port), false);
  } finally { server.close(); }
});

test('no session fails before recording and says to sign in', { skip, timeout: 200000 }, async () => {
  const server = await serve();
  const out = mkdtempSync(join(tmpdir(), 'tv-smoke-'));
  try {
    const r = await runCli({ DEMO_URL: `http://127.0.0.1:${server.address().port}`, DEMO_MODE: 'nosession' }, out);
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /sign in/);
    assert.ok(!existsSync(join(out, 'demo-video.mp4')));
    assert.ok(!existsSync(join(out, '.profile')));
  } finally { server.close(); }
});

test('an interrupted run removes the copied profile and stops the harness', { skip, timeout: 200000 }, async () => {
  const server = await serve();
  const out = mkdtempSync(join(tmpdir(), 'tv-smoke-'));
  try {
    const child = spawn('node', [cli, scenes, out], { env: { ...process.env, DEMO_URL: `http://127.0.0.1:${server.address().port}`, DEMO_MODE: 'slow' } });
    let stderr = '';
    const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })));
    await new Promise((resolve, reject) => {
      child.stderr.on('data', (d) => { stderr += d; if (/recording demo-video/.test(stderr)) resolve(); });
      child.on('exit', () => reject(new Error(`exited before recording: ${stderr}`)));
    });
    await new Promise((r) => setTimeout(r, 3000));
    assert.ok(existsSync(join(out, '.profile')), 'profile exists while recording');
    child.kill('SIGINT');
    const { code } = await exited;
    assert.notEqual(code, 0);
    assert.ok(!existsSync(join(out, '.profile')), 'profile removed');
    const port = Number((stderr.match(/harness port (\d+)/) || [])[1]);
    assert.equal(await listening(port), false);
    let left = '';
    try { left = execFileSync('pgrep', ['-f', `user-data-dir=${join(out, '.profile')}`]).toString(); } catch { /* none */ }
    assert.equal(left, '');
  } finally { server.close(); }
});
