import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { splitCueParts } from './cues.mjs';

const isExpression = (src) => { try { new vm.Script(`(${src})`); return true; } catch { return false; } };

const AZURE_VOICE_NAME = /^[a-z]{2,3}-[A-Za-z]{2,4}-\S+$/;

function voiceProblems(voice) {
  if (voice === undefined) return [];
  if (voice?.engine === 'azure') {
    const p = [];
    if (typeof voice.name !== 'string' || !AZURE_VOICE_NAME.test(voice.name)) p.push("voice.name must be an Azure voice short name, e.g. 'zh-TW-HsiaoChenNeural'");
    if (voice.rate !== undefined && typeof voice.rate !== 'string') p.push("voice.rate must be a string, e.g. '+10%'");
    return p;
  }
  if (voice && 'command' in voice && voice.engine === undefined) {
    const ok = Array.isArray(voice.command) && voice.command.length > 1 && voice.command.every((a) => typeof a === 'string')
      && voice.command.some((a) => a.startsWith('{out}'));
    return ok ? [] : ['voice.command must be an array of strings that writes to {out} (e.g. "{out}.aiff")'];
  }
  return ["voice must be { engine: 'azure', name } or { command: [...] }"];
}

function problemsOf(sf) {
  const p = [];
  if (!sf || typeof sf !== 'object') return ['the file must `export default` a scene object'];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(sf.name || '')) p.push('name is missing or not lower-case-with-dashes');
  if (!sf.site?.baseUrl) p.push('site.baseUrl is missing');
  const also = sf.site?.alsoSignIn;
  if (also !== undefined && !(Array.isArray(also) && also.every((u) => /^https?:\/\/[^/\s]+\/?$/.test(u)))) {
    p.push('site.alsoSignIn must be a list of site URLs (https://host)');
  }
  if (!Array.isArray(sf.scenes) || !sf.scenes.length) p.push('no scenes');
  p.push(...voiceProblems(sf.voice));
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

function pauseAfter(isLastInSentence, isLastInScene) {
  if (isLastInScene) return 'scene';
  return isLastInSentence ? 'sentence' : 'clause';
}

/** Cues in play order, each with the pause after it; a sentence's action (as source text) rides on its first cue. */
export function buildCues(sf) {
  return sf.scenes.flatMap((scene, i) => scene.sentences.flatMap((s, j, sentences) => {
    const parts = splitCueParts(s.say);
    return parts.map(({ text, spoken }, k) => {
      const isLastInSentence = k === parts.length - 1;
      const cue = { scene: i, sentence: j, text, spoken, pause: pauseAfter(isLastInSentence, isLastInSentence && j === sentences.length - 1) };
      if (k === 0 && s.do) cue.action = s.do.toString();
      return cue;
    });
  }));
}
