// Mechanical checks for a narration script: the rules a machine can apply without judging tone. Wording that needs
// judgment (labels to decode, word order, scope, 那個 or 進行 as padding) is left to the writer and the reviewer.
import { splitCueParts } from '../../../narrated-web-video-maker/scripts/lib/cues.mjs';

/** Words that are never ordinary in narration, so a match is always filler. */
export const FILLERS = Object.freeze(['嗯', '痾', '呃']);

const SENTENCE = /^(\d+)\.\s+(.+?)\s*$/;
const ACTION = /\s*[（(]([^（）()]*)[）)]\s*$/;
const CODE_WORD = /[A-Za-z0-9]*[A-Za-z][A-Za-z0-9]*(?:[-_./][A-Za-z0-9]+)+/g;
const CAPS_WORD = /\b[A-Z]{5,}\b/g;
const KEEP_LINE = /^keep:\s*(.*)$/i;
const WRITE_ACTION = /送出|儲存|刪除|\b(?:submit|save|delete|register|sign out)\b/i;

/** Numbered sentence lines of a script: `N. narration（screen action）`; every other line is ignored. */
export function parseScript(md) {
  return md.split('\n').flatMap((line) => {
    const m = SENTENCE.exec(line.trim());
    if (!m) return [];
    const a = ACTION.exec(m[2]);
    return [{ n: Number(m[1]), say: a ? m[2].slice(0, a.index).trim() : m[2], action: a ? a[1].trim() : null }];
  });
}

function cueProblems(say) {
  try {
    const k = splitCueParts(say).length;
    return k > 1 ? [`splits into ${k} subtitles; shorten or split the sentence`] : [];
  } catch (e) {
    return [e.message];
  }
}

/** Words listed on a `keep:` line: said as written (HTTPS) or shown that way on screen. */
function keptWords(md) {
  return new Set(md.split('\n').flatMap((line) => {
    const m = KEEP_LINE.exec(line.trim());
    return m ? m[1].split(/[,，\s]+/).filter(Boolean) : [];
  }));
}

function englishProblems(say, keep) {
  const code = say.match(CODE_WORD) || [];
  const rest = code.reduce((s, w) => s.replace(w, ' '), say);
  return [...code, ...(rest.match(CAPS_WORD) || [])]
    .filter((w) => !keep.has(w))
    .map((w) => `write 「${w}」 the way it is said`);
}

/** Every mechanical problem, one entry per problem, in sentence order. */
export function lintScript(md) {
  const keep = keptWords(md);
  return parseScript(md).flatMap(({ n, say, action }) => [
    ...cueProblems(say),
    ...FILLERS.filter((f) => say.includes(f)).map((f) => `filler 「${f}」`),
    ...englishProblems(say, keep),
    ...(action && WRITE_ACTION.test(action) && !action.includes('不點') ? ['the action writes; stop before it'] : []),
  ].map((problem) => ({ n, problem })));
}
