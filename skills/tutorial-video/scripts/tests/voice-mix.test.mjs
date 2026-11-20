import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { voiceCue, DEFAULT_VOICE } from '../lib/voice.mjs';
import { mixArgs, markTimes } from '../lib/mix.mjs';

const SINE = { command: ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=d=1.5', '{out}.aiff'] };

test('voiceCue produces a 44.1 kHz mono wav and returns its length', async () => {
  const wav = join(mkdtempSync(join(tmpdir(), 'tv-voice-')), 'c1.wav');
  const dur = await voiceCue('測試', wav, SINE);
  assert.ok(Math.abs(dur - 1.5) < 0.05, String(dur));
  const info = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=sample_rate,channels', '-of', 'csv=p=0', wav]).toString().trim();
  assert.equal(info, '44100,1');
});

test('voiceCue fails loudly when the engine fails', async () => {
  const wav = join(mkdtempSync(join(tmpdir(), 'tv-voice-')), 'c1.wav');
  await assert.rejects(voiceCue('x', wav, { command: ['false', '{out}.aiff'] }), /voice engine failed/);
});

test('the default voice is Meijia', () => {
  assert.deepEqual(DEFAULT_VOICE.command.slice(0, 5), ['say', '-v', 'Meijia', '-r', '185']);
});

test('mixArgs places each clip at its mark time plus 0.15 s and keeps the video stream', () => {
  const args = mixArgs('v.mp4', [{ wav: 'a.wav', t: 2 }, { wav: 'b.wav', t: 9.5 }], 'o.mp4', 12.5);
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /adelay=2150\|2150/);
  assert.match(graph, /adelay=9650\|9650/);
  assert.match(graph, /amix=inputs=3:normalize=0/);
  assert.deepEqual(args.slice(-1), ['o.mp4']);
  assert.equal(args[args.indexOf('-c:v') + 1], 'copy');
});

test('mixArgs lays the voices over a silent track exactly as long as the video instead of padding and -shortest', () => {
  const args = mixArgs('v.mp4', [{ wav: 'a.wav', t: 2 }], 'o.mp4', 12.5);
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /^anullsrc=r=44100:cl=mono,atrim=end=12\.5\[base\];/);
  assert.match(graph, /\[base\]\[a0\]amix=inputs=2:normalize=0:duration=first\[aout\]$/);
  assert.doesNotMatch(graph, /apad/);
  assert.ok(!args.includes('-shortest'));
  assert.throws(() => mixArgs('v.mp4', [{ wav: 'a.wav', t: 2 }], 'o.mp4'), /video duration/);
});

test('mixing with ffmpeg succeeds every time and the voice track matches the video length', { timeout: 120000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tv-mix-'));
  const video = join(dir, 'v.mp4');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=d=4.7:s=320x240:r=30', '-c:v', 'mpeg4', video]);
  const clips = [0, 1].map((i) => {
    const wav = join(dir, `c${i}.wav`);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=d=1.2', '-ar', '44100', '-ac', '1', wav]);
    return { wav, t: 0.3 + i * 1.8 };
  });
  const probe = (file, stream) => Number(execFileSync('ffprobe', ['-v', 'error', '-select_streams', stream, '-show_entries', 'stream=duration', '-of', 'default=nw=1:nk=1', file]).toString().trim());
  const dur = probe(video, 'v:0');
  for (let i = 0; i < 10; i += 1) {
    const out = join(dir, `o${i}.mp4`);
    execFileSync('ffmpeg', mixArgs(video, clips, out, dur));
    assert.ok(Math.abs(probe(out, 'a:0') - dur) < 0.05, `run ${i}: audio ${probe(out, 'a:0')} vs video ${dur}`);
  }
});

test('markTimes reads the recorder mark times in order', () => {
  assert.deepEqual(markTimes({ events: [{ type: 'mark', t: 0.3 }, { type: 'click', t: 1 }, { type: 'mark', t: 8.4 }] }), [0.3, 8.4]);
});
