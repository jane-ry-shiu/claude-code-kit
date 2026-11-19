import { execFile } from 'node:child_process';
import { rmSync } from 'node:fs';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** A voice engine is a command; `{text}` is the cue as spoken, `{out}` the output path without extension. */
export const DEFAULT_VOICE = Object.freeze({ command: ['say', '-v', 'Meijia', '-r', '185', '-o', '{out}.aiff', '{text}'] });

export async function durationOf(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(stdout.trim());
}

/** Voices one cue into a 44.1 kHz mono wav at `wavPath`; resolves to its length in seconds. */
export async function voiceCue(text, wavPath, voice = DEFAULT_VOICE) {
  const out = wavPath.replace(/\.wav$/, '') + '.src';
  const args = voice.command.map((a) => a.replaceAll('{out}', out).replaceAll('{text}', text));
  const produced = args.find((a) => a.startsWith(out));
  if (!produced) throw new Error('voice command must write to {out}');
  try {
    await run(args[0], args.slice(1));
  } catch (e) {
    throw new Error(`voice engine failed for "${text}": ${e.stderr || e.message}`);
  }
  await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', produced, '-ar', '44100', '-ac', '1', wavPath]);
  rmSync(produced, { force: true });
  return durationOf(wavPath);
}
