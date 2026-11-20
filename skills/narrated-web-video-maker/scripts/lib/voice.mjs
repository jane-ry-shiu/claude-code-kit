import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { azureSynthesize } from './azure-voice.mjs';

const run = promisify(execFile);

/** A voice engine is a command; `{text}` is the cue as spoken, `{out}` the output path without extension. */
export const DEFAULT_VOICE = Object.freeze({ command: ['say', '-v', 'Meijia', '-r', '200', '-o', '{out}.aiff', '{text}'] });

export const isAzureVoice = (voice) => voice?.engine === 'azure';

/** The voice a run uses: the scene file's, unless the run asked for Meijia with `--voice mac`. */
export function chooseVoice(sceneVoice, override) {
  if (override === undefined) return sceneVoice || DEFAULT_VOICE;
  if (override === 'mac') return DEFAULT_VOICE;
  throw new Error(`--voice takes only "mac" (Meijia); got "${override}". Name other voices in the scene file.`);
}

/** One line naming the engine and voice, for logs and report.json. */
export function describeVoice(voice = DEFAULT_VOICE) {
  if (isAzureVoice(voice)) return `azure ${voice.name}`;
  const [cmd, ...args] = voice.command;
  const v = args.indexOf('-v');
  return cmd === 'say' && v >= 0 ? `say ${args[v + 1]}` : `command ${cmd}`;
}

export async function durationOf(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(stdout.trim());
}

async function produceWithCommand(text, out, voice) {
  const args = voice.command.map((a) => a.replaceAll('{out}', out).replaceAll('{text}', text));
  const produced = args.find((a) => a.startsWith(out));
  if (!produced) throw new Error('voice command must write to {out}');
  try {
    await run(args[0], args.slice(1));
  } catch (e) {
    throw new Error(`voice engine failed for "${text}": ${e.stderr || e.message}`);
  }
  return produced;
}

async function produceWithAzure(text, out, voice, creds) {
  if (!creds) throw new Error('an azure voice needs Azure credentials (azureCredentials())');
  const produced = `${out}.wav`;
  writeFileSync(produced, await azureSynthesize(text, voice, creds));
  return produced;
}

const cacheKey = (text, voice) => createHash('sha256').update(JSON.stringify({ voice, text })).digest('hex');

/**
 * Voices one cue into a 44.1 kHz mono wav at `wavPath`; resolves to its length in seconds.
 * `azure` carries the credentials an azure voice needs; with `cacheDir`, the same voice and text are voiced once.
 */
export async function voiceCue(text, wavPath, voice = DEFAULT_VOICE, { azure, cacheDir } = {}) {
  const cached = cacheDir && join(cacheDir, `${cacheKey(text, voice)}.wav`);
  if (cached && existsSync(cached)) {
    copyFileSync(cached, wavPath);
    return durationOf(wavPath);
  }
  const out = wavPath.replace(/\.wav$/, '') + '.src';
  const produced = isAzureVoice(voice) ? await produceWithAzure(text, out, voice, azure) : await produceWithCommand(text, out, voice);
  await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', produced, '-ar', '44100', '-ac', '1', wavPath]);
  rmSync(produced, { force: true });
  if (cached) {
    mkdirSync(cacheDir, { recursive: true });
    copyFileSync(wavPath, `${cached}.part`);
    renameSync(`${cached}.part`, cached);
  }
  return durationOf(wavPath);
}
