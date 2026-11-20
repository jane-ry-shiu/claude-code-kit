import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { azureSsml, azureCredentials, azureSynthesize } from '../lib/azure-voice.mjs';
import { voiceCue, describeVoice } from '../lib/voice.mjs';

const VOICE = Object.freeze({ engine: 'azure', name: 'zh-TW-HsiaoChenNeural' });
const KEY = 'k'.repeat(32);
const noSleep = async () => {};

const wavBytes = () => execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=d=1.2', '-ar', '48000', '-ac', '1', '-f', 'wav', '-']);

/** A fake Azure TTS endpoint that answers each request with the next reply in `replies`. */
function fakeAzure(replies) {
  const requests = [];
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => { body += d; });
      req.on('end', () => {
        requests.push({ method: req.method, url: req.url, headers: req.headers, body });
        const r = replies[Math.min(requests.length - 1, replies.length - 1)];
        res.writeHead(r.status, r.headers || {});
        res.end(r.body ?? '');
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({
      server, requests,
      creds: { key: KEY, region: 'eastasia', endpoint: `http://127.0.0.1:${server.address().port}/cognitiveservices/v1` },
    }));
  });
}

test('azureSsml escapes the text and takes xml:lang from the voice name', () => {
  const ssml = azureSsml('A & B <c> "d"', VOICE);
  assert.match(ssml, /xml:lang='zh-TW'/);
  assert.match(ssml, /name='zh-TW-HsiaoChenNeural'/);
  assert.match(ssml, /A &amp; B &lt;c&gt; &quot;d&quot;/);
  assert.doesNotMatch(ssml, /prosody/);
});

test('azureSsml wraps the text in prosody when a rate is given', () => {
  assert.match(azureSsml('你好', { ...VOICE, rate: '+10%' }), /<prosody rate='\+10%'>你好<\/prosody>/);
});

test('azureCredentials prefers the environment and builds the regional endpoint', () => {
  const c = azureCredentials({ AZURE_SPEECH_KEY: KEY, AZURE_SPEECH_REGION: 'eastasia' }, () => 'from-keychain');
  assert.deepEqual(c, { key: KEY, region: 'eastasia', endpoint: 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1' });
});

test('azureCredentials falls back to the stored secrets', () => {
  const stored = { AZURE_SPEECH_KEY: KEY, AZURE_SPEECH_REGION: 'japaneast' };
  const c = azureCredentials({}, (name) => stored[name] ?? null);
  assert.equal(c.key, KEY);
  assert.equal(c.region, 'japaneast');
});

test('azureCredentials uses AZURE_SPEECH_ENDPOINT when set', () => {
  const c = azureCredentials({ AZURE_SPEECH_KEY: KEY, AZURE_SPEECH_REGION: 'eastasia', AZURE_SPEECH_ENDPOINT: 'https://x.example/v1' }, () => null);
  assert.equal(c.endpoint, 'https://x.example/v1');
});

test('azureCredentials says how to store a missing key and how to switch to Meijia', () => {
  assert.throws(() => azureCredentials({ AZURE_SPEECH_REGION: 'eastasia' }, () => null),
    (e) => /AZURE_SPEECH_KEY/.test(e.message) && /kit-secret set/.test(e.message) && /--voice mac/.test(e.message));
  assert.throws(() => azureCredentials({ AZURE_SPEECH_KEY: KEY }, () => null), /AZURE_SPEECH_REGION/);
});

test('azureSynthesize posts SSML with the key and output format and returns the audio', async () => {
  const audio = wavBytes();
  const fake = await fakeAzure([{ status: 200, body: audio }]);
  try {
    const out = await azureSynthesize('你好', VOICE, fake.creds, { sleep: noSleep });
    assert.ok(out.equals(audio));
    const [r] = fake.requests;
    assert.equal(r.method, 'POST');
    assert.equal(r.url, '/cognitiveservices/v1');
    assert.equal(r.headers['ocp-apim-subscription-key'], KEY);
    assert.equal(r.headers['content-type'], 'application/ssml+xml');
    assert.equal(r.headers['x-microsoft-outputformat'], 'riff-48khz-16bit-mono-pcm');
    assert.equal(r.headers['user-agent'], 'tutorial-video');
    assert.match(r.body, /<voice name='zh-TW-HsiaoChenNeural'>你好<\/voice>/);
  } finally { fake.server.close(); }
});

test('azureSynthesize retries a rate limit, honouring Retry-After', async () => {
  const waits = [];
  const fake = await fakeAzure([{ status: 429, headers: { 'retry-after': '2' } }, { status: 200, body: wavBytes() }]);
  try {
    await azureSynthesize('你好', VOICE, fake.creds, { sleep: async (ms) => { waits.push(ms); } });
    assert.equal(fake.requests.length, 2);
    assert.deepEqual(waits, [2000]);
  } finally { fake.server.close(); }
});

test('azureSynthesize backs off long enough to clear the free tier minute window', async () => {
  const waits = [];
  const fake = await fakeAzure([{ status: 429 }, { status: 429 }, { status: 429 }, { status: 429 }, { status: 200, body: wavBytes() }]);
  try {
    await azureSynthesize('你好', VOICE, fake.creds, { sleep: async (ms) => { waits.push(ms); } });
    assert.deepEqual(waits, [5000, 15000, 30000, 60000]);
    assert.equal(fake.requests.length, 5);
  } finally { fake.server.close(); }
});

test('azureSynthesize gives up after four retries and names both the minute limit and the monthly quota', async () => {
  const fake = await fakeAzure([{ status: 429 }]);
  try {
    await assert.rejects(azureSynthesize('你好', VOICE, fake.creds, { sleep: noSleep }),
      (e) => /20 requests a minute/.test(e.message) && /monthly/.test(e.message) && /--voice mac/.test(e.message));
    assert.equal(fake.requests.length, 5);
  } finally { fake.server.close(); }
});

test('azureSynthesize explains a download cut off halfway', async () => {
  const server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'audio/wav', 'content-length': '100000' });
      res.write(Buffer.alloc(10));
      setTimeout(() => res.socket.destroy(), 20);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const creds = { key: KEY, region: 'eastasia', endpoint: `http://127.0.0.1:${server.address().port}/cognitiveservices/v1` };
  try {
    await assert.rejects(azureSynthesize('你好', VOICE, creds, { sleep: noSleep }),
      (e) => /audio download from Azure was cut off/.test(e.message) && /--voice mac/.test(e.message));
  } finally { server.close(); }
});

for (const [status, pattern] of [[401, /key or region/], [403, /key or region/], [400, /voice name/], [500, /HTTP 500/]]) {
  test(`azureSynthesize explains HTTP ${status} without leaking the key`, async () => {
    const fake = await fakeAzure([{ status, body: 'server says no' }]);
    try {
      await assert.rejects(azureSynthesize('你好', VOICE, fake.creds, { sleep: noSleep }),
        (e) => pattern.test(e.message) && /--voice mac/.test(e.message) && !e.message.includes(KEY));
      assert.equal(fake.requests.length, 1);
    } finally { fake.server.close(); }
  });
}

test('azureSynthesize explains an unreachable endpoint', async () => {
  const creds = { key: KEY, region: 'eastasia', endpoint: 'http://127.0.0.1:9/cognitiveservices/v1' };
  await assert.rejects(azureSynthesize('你好', VOICE, creds, { sleep: noSleep }),
    (e) => /could not reach Azure/.test(e.message) && /--voice mac/.test(e.message));
});

test('voiceCue voices an azure cue into a 44.1 kHz mono wav', async () => {
  const fake = await fakeAzure([{ status: 200, body: wavBytes() }]);
  try {
    const wav = join(mkdtempSync(join(tmpdir(), 'tv-azure-')), 'c1.wav');
    const dur = await voiceCue('你好', wav, VOICE, { azure: fake.creds });
    assert.ok(Math.abs(dur - 1.2) < 0.05, String(dur));
    const info = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=sample_rate,channels', '-of', 'csv=p=0', wav]).toString().trim();
    assert.equal(info, '44100,1');
  } finally { fake.server.close(); }
});

test('voiceCue reuses a cached voice for the same voice and text', async () => {
  const fake = await fakeAzure([{ status: 200, body: wavBytes() }]);
  try {
    const dir = mkdtempSync(join(tmpdir(), 'tv-azure-'));
    const cacheDir = join(dir, 'cache');
    await voiceCue('你好', join(dir, 'a.wav'), VOICE, { azure: fake.creds, cacheDir });
    await voiceCue('你好', join(dir, 'b.wav'), VOICE, { azure: fake.creds, cacheDir });
    assert.equal(fake.requests.length, 1);
    assert.ok(readFileSync(join(dir, 'a.wav')).equals(readFileSync(join(dir, 'b.wav'))));
    await voiceCue('你好', join(dir, 'c.wav'), { ...VOICE, name: 'zh-TW-YunJheNeural' }, { azure: fake.creds, cacheDir });
    await voiceCue('再見', join(dir, 'd.wav'), VOICE, { azure: fake.creds, cacheDir });
    assert.equal(fake.requests.length, 3);
  } finally { fake.server.close(); }
});

test('describeVoice names the engine and voice', () => {
  assert.equal(describeVoice(VOICE), 'azure zh-TW-HsiaoChenNeural');
  assert.equal(describeVoice(undefined), 'say Meijia');
  assert.equal(describeVoice({ command: ['espeak', '{text}', '-w', '{out}.wav'] }), 'command espeak');
});

test('chooseVoice keeps the scene voice unless --voice mac asks for Meijia', async () => {
  const { chooseVoice, DEFAULT_VOICE } = await import('../lib/voice.mjs');
  assert.equal(chooseVoice(VOICE, undefined), VOICE);
  assert.equal(chooseVoice(undefined, undefined), DEFAULT_VOICE);
  assert.equal(chooseVoice(VOICE, 'mac'), DEFAULT_VOICE);
  assert.throws(() => chooseVoice(VOICE, 'azure'), /--voice takes only "mac"/);
});

test('the command line takes the scene file, the out dir and an optional --voice', async () => {
  const { parseCli } = await import('../make-video.mjs');
  assert.deepEqual(parseCli(['a.mjs', 'out']), { scenePath: 'a.mjs', outDir: 'out', voice: undefined });
  assert.deepEqual(parseCli(['a.mjs', 'out', '--voice', 'mac']), { scenePath: 'a.mjs', outDir: 'out', voice: 'mac' });
  assert.deepEqual(parseCli(['--voice=mac', 'a.mjs', 'out']), { scenePath: 'a.mjs', outDir: 'out', voice: 'mac' });
  assert.equal(parseCli(['a.mjs']), null);
  assert.equal(parseCli(['a.mjs', 'out', '--voice']), null);
});

test('azureCredentials trims stray whitespace and rejects a region that is not a region name', () => {
  const c = azureCredentials({ AZURE_SPEECH_KEY: ` ${KEY}\n`, AZURE_SPEECH_REGION: 'eastasia\n' }, () => null);
  assert.equal(c.key, KEY);
  assert.equal(c.endpoint, 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1');
  assert.throws(() => azureCredentials({ AZURE_SPEECH_KEY: KEY, AZURE_SPEECH_REGION: 'east asia' }, () => null),
    (e) => /AZURE_SPEECH_REGION "east asia"/.test(e.message) && /eastasia/.test(e.message) && /--voice mac/.test(e.message));
});

test('azureCredentials reads each stored secret once', () => {
  const calls = [];
  const stored = { AZURE_SPEECH_KEY: KEY, AZURE_SPEECH_REGION: 'eastasia' };
  azureCredentials({}, (name) => { calls.push(name); return stored[name]; });
  assert.deepEqual(calls.sort(), ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION']);
});

test('azureCredentials sends the key only over https, except to this machine', () => {
  const base = { AZURE_SPEECH_KEY: KEY, AZURE_SPEECH_REGION: 'eastasia' };
  assert.throws(() => azureCredentials({ ...base, AZURE_SPEECH_ENDPOINT: 'http://speech.example.com/v1' }, () => null),
    (e) => /AZURE_SPEECH_ENDPOINT must be an https URL/.test(e.message) && /--voice mac/.test(e.message));
  assert.throws(() => azureCredentials({ ...base, AZURE_SPEECH_ENDPOINT: 'not a url' }, () => null), /AZURE_SPEECH_ENDPOINT must be an https URL/);
  for (const ok of ['https://speech.example.com/v1', 'http://127.0.0.1:8080/tts', 'http://localhost/tts', 'http://[::1]:9/tts']) {
    assert.equal(azureCredentials({ ...base, AZURE_SPEECH_ENDPOINT: ok }, () => null).endpoint, ok);
  }
});

test('the command line rejects options it does not know', async () => {
  const { parseCli } = await import('../make-video.mjs');
  assert.equal(parseCli(['a.mjs', '--verbose']), null);
  assert.equal(parseCli(['a.mjs', 'out', '--verbose']), null);
  assert.equal(parseCli(['a.mjs', 'out', '-v']), null);
});
