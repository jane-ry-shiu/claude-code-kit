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
  const args = mixArgs('v.mp4', [{ wav: 'a.wav', t: 2 }, { wav: 'b.wav', t: 9.5 }], 'o.mp4');
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /adelay=2150\|2150/);
  assert.match(graph, /adelay=9650\|9650/);
  assert.match(graph, /amix=inputs=2:normalize=0/);
  assert.deepEqual(args.slice(-1), ['o.mp4']);
  assert.ok(args.includes('-shortest'));
  assert.equal(args[args.indexOf('-c:v') + 1], 'copy');
});

test('markTimes reads the recorder mark times in order', () => {
  assert.deepEqual(markTimes({ events: [{ type: 'mark', t: 0.3 }, { type: 'click', t: 1 }, { type: 'mark', t: 8.4 }] }), [0.3, 8.4]);
});
