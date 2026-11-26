#!/usr/bin/env node
// Usage: PLAYWRIGHT_CORE=<dir with node_modules/playwright-core> node make-video.mjs <scene file> <out dir> [--voice mac]
// Voices every cue, records the scenes headless through os-screen-capture's harness, mixes the voice in at the times
// the subtitles appeared, and writes <out>/<name>.mp4, cues.json, report.json and frames/scene-<i>.png.
import { spawn, execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { loadScenes, buildCues } from './lib/scenes.mjs';
import { voiceCue, durationOf, chooseVoice, describeVoice, isAzureVoice } from './lib/voice.mjs';
import { azureCredentials } from './lib/azure-voice.mjs';
import { holdSeconds } from './lib/guard.mjs';
import { setupStepSource, recordStepSource, recordCues } from './lib/steps.mjs';
import { mixArgs, markTimes } from './lib/mix.mjs';
import { postStep } from './lib/harness-client.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(here, '..', '..', 'os-screen-capture', 'scripts', 'harness.mjs');
const run = promisify(execFile);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const freePort = () => new Promise((res, rej) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
  s.on('error', rej);
});

function spawnHarness({ port, profile, recDir, viewport, scale }) {
  if (!process.env.PLAYWRIGHT_CORE) throw new Error('set PLAYWRIGHT_CORE to a directory whose node_modules has playwright-core');
  mkdirSync(recDir, { recursive: true });
  rmSync(join(recDir, 'harness.log'), { force: true });
  const child = spawn(process.execPath, [HARNESS], {
    env: { ...process.env, BACKGROUND: '1', VIEWPORT: viewport, SCALE: String(scale), EVAL_PORT: String(port), PROFILE: profile, OUT: recDir },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const output = { stderr: '' };
  child.stderr.on('data', (d) => { output.stderr += d; });
  return { child, output };
}

async function waitHarnessUp({ child, output }, recDir, port) {
  const log = join(recDir, 'harness.log');
  for (let i = 0; i < 300; i += 1) {
    if (child.exitCode !== null) throw new Error(`harness exited: ${output.stderr.trim()}`);
    if (existsSync(log) && readFileSync(log, 'utf8').includes(`harness up on ${port}`)) return;
    await sleep(100);
  }
  throw new Error('harness did not start within 30 s');
}

const browserLeft = (profile) => {
  try { execFileSync('pgrep', ['-f', `user-data-dir=${profile}`]); return true; } catch { return false; }
};

async function stopHarness(harness, profile) {
  const child = harness?.child;
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    for (let i = 0; i < 50 && child.exitCode === null; i += 1) await sleep(100);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
  try { execFileSync('pkill', ['-f', `user-data-dir=${profile}`]); } catch { /* no browser left */ }
  for (let i = 0; i < 50 && browserLeft(profile); i += 1) await sleep(100);
  if (browserLeft(profile)) {
    try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${profile}`]); } catch { /* gone meanwhile */ }
  }
  rmSync(profile, { recursive: true, force: true });
  if (existsSync(profile)) throw new Error(`could not remove the copied browser profile ${profile}; delete it by hand`);
}

const streamDuration = async (file, stream) => parseFloat((await run('ffprobe', ['-v', 'error', '-select_streams', stream, '-show_entries', 'stream=duration', '-of', 'csv=p=0', file])).stdout.trim());

async function recordWithHarness(sf, cues, out) {
  const port = await freePort();
  const profile = join(out, '.profile');
  const recDir = join(out, 'rec');
  rmSync(profile, { recursive: true, force: true });
  console.error('harness port', port);
  let harness;
  const onSignal = (sig) => {
    console.error(`${sig}: stopping the harness and removing the copied profile`);
    stopHarness(harness, profile).catch((e) => console.error(e.message)).finally(() => process.exit(sig === 'SIGINT' ? 130 : 143));
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    harness = spawnHarness({ port, profile, recDir, viewport: sf.viewport, scale: sf.scale });
    await waitHarnessUp(harness, recDir, port);
    const setup = await postStep(port, setupStepSource(sf.site));
    console.error('recording', sf.name);
    const result = await postStep(port, recordStepSource({
      name: sf.name, baseUrl: sf.site.baseUrl, start: sf.start, secretPatterns: sf.site.secretPatterns,
      cues: recordCues(cues),
    }));
    return { ...result, guardHosts: setup.guardHosts };
  } finally {
    await stopHarness(harness, profile);
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
  }
}

/** `<scene file> <out dir> [--voice mac]` in any order of flag; null when the arguments do not fit. */
export function parseCli(argv) {
  const positional = [];
  let voice;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--voice') {
      if (i + 1 >= argv.length) return null;
      voice = argv[i += 1];
    } else if (a.startsWith('--voice=')) voice = a.slice('--voice='.length);
    else if (a.startsWith('-')) return null;
    else positional.push(a);
  }
  if (positional.length !== 2) return null;
  return { scenePath: positional[0], outDir: positional[1], voice };
}

export async function makeVideo(scenePath, outDir, { voice: voiceOverride } = {}) {
  const sf = await loadScenes(scenePath);
  const voice = chooseVoice(sf.voice, voiceOverride);
  const azure = isAzureVoice(voice) ? azureCredentials() : undefined;
  const out = resolve(outDir);
  const voiceDir = join(out, 'voice');
  mkdirSync(voiceDir, { recursive: true });
  console.error('voice', describeVoice(voice));
  const cues = buildCues(sf);
  for (const [i, c] of cues.entries()) {
    c.wav = join(voiceDir, `c${String(i).padStart(3, '0')}.wav`);
    c.dur = await voiceCue(c.spoken, c.wav, voice, { azure, cacheDir: join(voiceDir, 'cache') });
    c.hold = holdSeconds(c.dur, c.pause);
  }

  const result = await recordWithHarness(sf, cues, out);

  const times = markTimes(result.rec);
  if (times.length !== cues.length) throw new Error(`recorder logged ${times.length} subtitles for ${cues.length} cues`);
  const mp4 = join(out, `${sf.name}.mp4`);
  const recordedDuration = await streamDuration(result.rec.mp4, 'v:0');
  await run('ffmpeg', mixArgs(result.rec.mp4, cues.map((c, i) => ({ wav: c.wav, t: times[i] })), mp4, recordedDuration));

  const frames = join(out, 'frames');
  mkdirSync(frames, { recursive: true });
  for (const [i] of sf.scenes.entries()) {
    const first = cues.findIndex((c) => c.scene === i);
    await run('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(times[first] + 1.5), '-i', mp4, '-frames:v', '1', '-update', '1', join(frames, `scene-${i}.png`)]);
  }

  writeFileSync(join(out, 'cues.json'), JSON.stringify(cues.map((c, i) => ({ scene: c.scene, sentence: c.sentence, text: c.text, start: times[i], dur: c.dur })), null, 1));
  const report = {
    mp4,
    duration: await streamDuration(mp4, 'v:0'),
    audioDuration: await streamDuration(mp4, 'a:0'),
    voice: describeVoice(voice),
    voiceTotal: +(await Promise.all(cues.map((c) => durationOf(c.wav)))).reduce((a, b) => a + b, 0).toFixed(2),
    guardHosts: result.guardHosts,
    guardLog: result.guardLog,
    secretHits: result.secretHits,
  };
  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 1));
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cli = parseCli(process.argv.slice(2));
  if (!cli) {
    console.error('usage: PLAYWRIGHT_CORE=<dir> node make-video.mjs <scene file> <out dir> [--voice mac]');
    process.exit(2);
  }
  makeVideo(cli.scenePath, cli.outDir, { voice: cli.voice }).then(
    (r) => { console.log(JSON.stringify(r, null, 1)); },
    (e) => { console.error(e.message); process.exit(1); },
  );
}
