import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { splitCues } from './cues.mjs';

const isExpression = (src) => { try { new vm.Script(`(${src})`); return true; } catch { return false; } };

function problemsOf(sf) {
  const p = [];
  if (!sf || typeof sf !== 'object') return ['the file must `export default` a scene object'];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(sf.name || '')) p.push('name is missing or not lower-case-with-dashes');
  if (!sf.site?.baseUrl) p.push('site.baseUrl is missing');
  if (!Array.isArray(sf.scenes) || !sf.scenes.length) p.push('no scenes');
  (sf.scenes || []).forEach((scene, i) => {
    if (!Array.isArray(scene.sentences) || !scene.sentences.length) p.push(`scene ${i}: no sentences`);
    (scene.sentences || []).forEach((s, j) => {
      const at = `scene ${i} sentence ${j}`;
      if (typeof s.say !== 'string' || !s.say.replace(/[\s，、；：。！？]/g, '')) p.push(`${at}: say is empty`);
      if (s.do === undefined) return;
      if (typeof s.do !== 'function') p.push(`${at}: do must be a function`);
      else if (!isExpression(s.do.toString())) p.push(`${at}: do must be an arrow function (async (page, h) => { ... })`);
      else if (/\bh\.mark\s*\(/.test(s.do.toString())) p.push(`${at}: do must not call h.mark; the subtitle is the sentence's say`);
    });
  });
  return p;
}

/** Imports a scene file, checks it, and fills in defaults. Throws one error listing every problem. */
export async function loadScenes(path) {
  const sf = (await import(`${pathToFileURL(path).href}?t=${Date.now()}`)).default;
  const problems = problemsOf(sf);
  if (problems.length) throw new Error(`scene file ${path}:\n- ${problems.join('\n- ')}`);
  return {
    start: '/', viewport: '1600x900', scale: 1.2, ...sf,
    site: { allowPost: [], secretPatterns: [], ...sf.site },
  };
}

/** Cues in play order; a sentence's action (as source text) rides on its first cue. */
export function buildCues(sf) {
  return sf.scenes.flatMap((scene, i) => scene.sentences.flatMap((s, j) => splitCues(s.say).map((text, k) => {
    const cue = { scene: i, sentence: j, text };
    if (k === 0 && s.do) cue.action = s.do.toString();
    return cue;
  })));
}
