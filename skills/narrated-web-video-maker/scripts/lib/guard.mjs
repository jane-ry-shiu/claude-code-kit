/** Self-contained (serialized into the harness): reads pass, POST only when a site pattern says it is a read. */
export function isAllowedRequest(method, pathname, allowPost) {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  if (method !== 'POST') return false;
  return allowPost.some((p) => new RegExp(p).test(pathname));
}

/** Seconds of silence after a cue's voice, by where the cue ends: mid-sentence, a sentence, or a scene. */
export const PAUSE_AFTER = Object.freeze({ clause: 0.6, sentence: 1.1, scene: 2.0 });

/** Seconds a cue stays on screen: its audio plus the pause for where it ends. */
export function holdSeconds(audioSec, pause) {
  if (!Object.hasOwn(PAUSE_AFTER, pause)) throw new Error(`unknown pause '${pause}', expected one of ${Object.keys(PAUSE_AFTER).join(', ')}`);
  return Math.round((audioSec + PAUSE_AFTER[pause]) * 1000) / 1000;
}
