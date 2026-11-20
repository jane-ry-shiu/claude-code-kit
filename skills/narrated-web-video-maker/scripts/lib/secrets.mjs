export const PLACEHOLDER = '••••••';

/**
 * Self-contained so it can be serialized into a page: mode 'mask' returns text with every secret replaced by the
 * placeholder, 'find' returns the secrets found, 'luhn' returns whether `text` (digits) passes the Luhn check.
 */
export function scanSecrets(text, extra = [], mode = 'mask') {
  const placeholder = '••••••';
  const luhn = (digits) => {
    let sum = 0;
    for (let i = 0; i < digits.length; i += 1) {
      let d = Number(digits[digits.length - 1 - i]);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return digits.length > 0 && sum % 10 === 0;
  };
  if (mode === 'luhn') return luhn(text);
  const rules = [
    { re: /\bBearer\s+([A-Za-z0-9\-._~+/]{8,}=*)/gi, group: 1 },
    { re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?/g },
    { re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
    { re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
    { re: /\bsk-[A-Za-z0-9_-]{16,}/g },
    { re: /\b(?:token|secret|password|passwd|api[_-]?key|access[_-]?key|client[_-]?secret)\b\s*[:=]\s*["']?([^\s"']{8,})/gi, group: 1 },
    { re: /\b(?:token|secret|api[_-]?key|access[_-]?key)\s+([A-Za-z0-9_\-]*\d[A-Za-z0-9_\-]*)/gi, group: 1, min: 20 },
    ...extra.map((p) => ({ re: new RegExp(p, 'g') })),
  ];
  const ranges = [];
  for (const { re, group, min } of rules) {
    for (const m of text.matchAll(re)) {
      const value = group ? m[group] : m[0];
      if (!value || value.length < (min || 0)) continue;
      const start = m.index + m[0].indexOf(value);
      ranges.push([start, start + value.length]);
    }
  }
  for (const m of text.matchAll(/\b\d+(?:[ -]\d+)*\b/g)) {
    const groups = [...m[0].matchAll(/\d+/g)].map((g) => ({ s: m.index + g.index, e: m.index + g.index + g[0].length, d: g[0] }));
    for (let i = 0; i < groups.length;) {
      let best = -1, digits = '';
      for (let j = i; j < groups.length && digits.length < 19; j += 1) {
        digits += groups[j].d;
        if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) best = j;
      }
      if (best < 0) { i += 1; continue; }
      ranges.push([groups[i].s, groups[best].e]);
      i = best + 1;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push([...r]);
  }
  if (mode === 'find') return merged.map(([s, e]) => text.slice(s, e));
  let out = '', at = 0;
  for (const [s, e] of merged) { out += text.slice(at, s) + placeholder; at = e; }
  return out + text.slice(at);
}

export const maskSecrets = (text, extra = []) => scanSecrets(text, extra, 'mask');
export const findSecrets = (text, extra = []) => scanSecrets(text, extra, 'find');
export const luhnValid = (digits) => scanSecrets(digits, [], 'luhn');

/** Page init script: masks secrets in text nodes and input values before they are painted, and on every change. */
export function maskInitScript(extra = []) {
  return `(() => {
  const scan = ${scanSecrets.toString()};
  const extra = ${JSON.stringify(extra)};
  const fixText = (n) => { const v = n.nodeValue; if (!v) return; const m = scan(v, extra, 'mask'); if (m !== v) n.nodeValue = m; };
  const fixTree = (root) => {
    if (!root) return;
    if (root.nodeType === 3) { fixText(root); return; }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) fixText(n);
  };
  const fixInputs = () => {
    for (const el of document.querySelectorAll('input, textarea')) {
      const v = el.value; if (!v) continue; const m = scan(v, extra, 'mask'); if (m !== v) el.value = m;
    }
  };
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') fixText(r.target);
      for (const n of r.addedNodes || []) fixTree(n);
    }
    fixInputs();
  }).observe(document, { subtree: true, childList: true, characterData: true });
  const all = () => { fixTree(document.body); fixInputs(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
})();`;
}
