const CLAUSE_END = /[，、；：。！？]/;
const TRAILING = /[，、；：。！？\s]+$/;
const TOKEN = /[\x21-\x7e]+|\s+|[^\s\x21-\x7e]/g;

/** Display width: an ASCII character counts half a CJK character. */
export function textWidth(s) {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) < 0x80 ? 0.5 : 1;
  return w;
}

/** What the voice reads for a cue: its lines joined by a space. */
export function spokenText(cue) {
  return cue.split('\n').join(' ');
}

function clausesOf(sentence) {
  const out = [];
  let cur = '';
  for (const ch of sentence) {
    cur += ch;
    if (CLAUSE_END.test(ch)) { out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  return out;
}

function chunkClause(clause, max) {
  if (textWidth(clause) <= max) return [clause];
  const chunks = [];
  let cur = [];
  const width = (toks) => textWidth(toks.join(''));
  for (const tok of clause.match(TOKEN) || []) {
    if (cur.length && width([...cur, tok]) > max) {
      const sp = cur.findLastIndex((t) => /^\s+$/.test(t));
      if (sp > 0) {
        chunks.push(cur.slice(0, sp).join(''));
        cur = cur.slice(sp + 1);
      } else {
        chunks.push(cur.join(''));
        cur = [];
      }
      if (cur.length && width([...cur, tok]) > max) { chunks.push(cur.join('')); cur = []; }
    }
    if (!(cur.length === 0 && /^\s+$/.test(tok))) cur.push(tok);
  }
  if (cur.length) chunks.push(cur.join(''));
  return chunks;
}

const cleanLine = (l) => l.trim().replace(TRAILING, '').trim();

/**
 * Splits one narration sentence into subtitle cues: each cue is one or two lines joined by '\n', each line at most
 * `max` wide (an unbreakable ASCII run may exceed it), trailing clause punctuation removed from every line.
 */
export function splitCues(sentence, max = 22, lines = 2) {
  if (!cleanLine(sentence).replace(/[，、；：。！？]/g, '').trim()) throw new Error('narration sentence is empty');
  const pieces = clausesOf(sentence).flatMap((c) => chunkClause(c, max));
  const packed = [];
  let cur = '';
  for (const p of pieces) {
    if (cur && textWidth(cleanLine(cur + p)) > max) { packed.push(cur); cur = p; } else cur += p;
  }
  if (cur) packed.push(cur);
  const clean = packed.map(cleanLine).filter(Boolean);
  const cues = [];
  for (let i = 0; i < clean.length; i += lines) cues.push(clean.slice(i, i + lines).join('\n'));
  return cues;
}
