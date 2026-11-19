/** Self-contained (serialized into the harness): reads pass, POST only when a site pattern says it is a read. */
export function isAllowedRequest(method, pathname, allowPost) {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  if (method !== 'POST') return false;
  return allowPost.some((p) => new RegExp(p).test(pathname));
}

/** Seconds a cue stays on screen: its audio plus a gap, longer at the end of a scene. */
export function holdSeconds(audioSec, isSceneEnd) {
  return Math.round((audioSec + (isSceneEnd ? 0.7 : 0.3)) * 1000) / 1000;
}
