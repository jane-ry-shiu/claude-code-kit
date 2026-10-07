import { pathToFileURL } from 'node:url';
import { placeBadges, toDisplayBox } from './geometry.mjs';
import { BADGE_HEIGHT, BOX_BORDER, NUMBERS_REFER_NOTES, NUMBERS_REFER_TEXT, VERDICTS } from './palette.mjs';

const ENTITIES = Object.freeze({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' });
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ENTITIES[ch]);

const cellsOf = (sheet) => sheet.rows.flat().filter(Boolean);
const labelFor = (sheet, key) => sheet.legend[key] ?? sheet.meanings[key].label;

/** Meanings drawn in this sheet, in table order — exactly what the legend lists. */
export function usedMeanings(sheet) {
  const used = new Set(cellsOf(sheet).flatMap((cell) => [
    ...(cell.unreachable !== undefined ? ['unreachable'] : []),
    ...(cell.verdict ? [cell.verdict] : []),
    ...(cell.marks ?? []).map((m) => m.meaning),
  ]));
  return Object.keys(sheet.meanings).filter((k) => used.has(k));
}

export function legendItems(sheet) {
  return usedMeanings(sheet).map((key) => ({ key, ...sheet.meanings[key], text: labelFor(sheet, key) }));
}

/** Notes grouped by number in order of first appearance; a number used in several cells names its row/column. */
export function noteEntries(sheet) {
  const entries = sheet.rows.flatMap((row, r) => row.flatMap((cell, c) => (cell?.marks ?? [])
    .filter((m) => m.n !== undefined && m.note)
    .map((m) => ({ n: m.n, note: String(m.note), color: sheet.meanings[m.meaning].color, r, c }))));
  const order = [...new Set(entries.map((e) => e.n))];
  return order.flatMap((n) => {
    const group = entries.filter((e) => e.n === n);
    const repeated = new Set(group.map((e) => `${e.r}:${e.c}`)).size > 1;
    return group.map((e) => {
      const context = repeated ? [sheet.rowLabels?.[e.r], sheet.columns[e.c]].filter(Boolean).join('・') : '';
      return { n: e.n, color: e.color, text: context ? `（${context}）${e.note}` : e.note };
    });
  });
}

export const noteLines = (sheet) => noteEntries(sheet).map((e) => `${e.n} ${e.text}`);

const STYLE = `
body{margin:0;background:#fff;color:#111;font-family:-apple-system,"PingFang TC","Heiti TC","Microsoft JhengHei",sans-serif}
#sheet{display:inline-block;padding:20px 24px 24px}
h1{font-size:22px;margin:0 0 6px}
.sub{font-size:14px;color:#555;margin:0 0 14px}
.grid{display:grid;gap:14px 12px;align-items:start}
.colhead{font-size:15px;font-weight:600}
.rowhead{font-size:20px;font-weight:700;padding-top:4px}
.cell{margin:0}
.pic{position:relative;overflow:hidden;outline:3px solid var(--frame);outline-offset:2px}
.pic img{position:absolute;max-width:none}
.box{position:absolute;box-sizing:border-box;border:${BOX_BORDER}px solid var(--c);border-radius:3px;box-shadow:0 0 0 1px rgba(255,255,255,.85)}
.badge,.chip{box-sizing:border-box;height:${BADGE_HEIGHT}px;border-radius:${BADGE_HEIGHT / 2}px;background:var(--c);color:#fff;font:700 11px/${BADGE_HEIGHT}px -apple-system,sans-serif;text-align:center}
.badge{position:absolute;box-shadow:0 0 0 1px #fff}
.chip{display:inline-block;min-width:${BADGE_HEIGHT}px;padding:0 4px;margin-right:6px}
.verdict{margin-top:8px;font-size:14px;font-weight:600;color:var(--c)}
.na{display:flex;align-items:center;justify-content:center;min-height:120px;padding:12px;box-sizing:border-box;border:2px dashed var(--c);color:#666;font-size:15px;text-align:center}
.notes,.legend{margin-top:16px;padding-top:12px;border-top:1px solid #ddd;font-size:15px}
.notes div{margin:4px 0}
.legend{display:flex;flex-wrap:wrap;gap:8px 22px}
.key{display:inline-flex;align-items:center;gap:8px}
.swatch{display:inline-block;width:22px;height:14px;box-sizing:border-box;border:3px solid var(--c);border-radius:3px}
.swatch.dashed{border-style:dashed}`;

function renderMarks(cell, sheet, scale, W, H) {
  const boxes = cell.marks.map((m) => ({ ...toDisplayBox(m.rect, scale, W, H), label: m.n, badge: m.badge }));
  const badges = placeBadges(boxes, W, H);
  return cell.marks.map((m, i) => {
    const color = sheet.meanings[m.meaning].color;
    const b = boxes[i];
    const g = badges[i];
    const box = `<div class="box" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;--c:${color}"></div>`;
    const badge = g ? `<div class="badge" style="left:${g.x}px;top:${g.y}px;width:${g.w}px;--c:${color}">${escapeHtml(m.n)}</div>` : '';
    return box + badge;
  }).join('');
}

function renderCell(cell, sheet) {
  if (cell.unreachable !== undefined) {
    const color = sheet.meanings.unreachable.color;
    return `<div class="na" style="--c:${color}">${escapeHtml(labelFor(sheet, 'unreachable'))}：${escapeHtml(cell.unreachable)}</div>`;
  }
  // Show the crop (or the whole shot) at the cell width, never enlarged past the screenshot's own pixels.
  const [vx, vy, vw, vh] = cell.view;
  const W = Math.min(sheet.cellWidth, vw * cell.pixelRatio);
  const scale = W / vw;
  const H = Math.round(vh * scale);
  const frame = cell.verdict ? sheet.meanings[cell.verdict].color : 'transparent';
  const strip = cell.verdict
    ? `<div class="verdict" style="--c:${frame}">${VERDICTS[cell.verdict]} ${escapeHtml(labelFor(sheet, cell.verdict))}</div>` : '';
  const imgStyle = `left:${-vx * scale}px;top:${-vy * scale}px;width:${cell.css.width * scale}px;height:${cell.css.height * scale}px`;
  const img = `<img src="${pathToFileURL(cell.src).href}" style="${imgStyle}" alt="">`;
  const inView = { ...cell, marks: cell.marks.map((m) => ({ ...m, rect: [m.rect[0] - vx, m.rect[1] - vy, m.rect[2], m.rect[3]] })) };
  return `<figure class="cell"><div class="pic" style="width:${W}px;height:${H}px;--frame:${frame}">${img}${renderMarks(inView, sheet, scale, W, H)}</div>${strip}</figure>`;
}

function renderGrid(sheet) {
  const headings = sheet.columns.some(Boolean)
    ? `${sheet.rowLabels ? '<div></div>' : ''}${sheet.columns.map((c) => `<div class="colhead">${escapeHtml(c)}</div>`).join('')}` : '';
  const body = sheet.rows.map((row, r) => `${sheet.rowLabels ? `<div class="rowhead">${escapeHtml(sheet.rowLabels[r])}</div>` : ''}${row.map((cell) => renderCell(cell, sheet)).join('')}`).join('');
  const columnsCss = `${sheet.rowLabels ? 'auto ' : ''}repeat(${sheet.columns.length}, ${sheet.cellWidth}px)`;
  return `<div class="grid" style="grid-template-columns:${columnsCss}">${headings}${body}</div>`;
}

function renderNotesAndLegend(sheet) {
  const notes = noteEntries(sheet);
  const notesHtml = notes.length
    ? `<div class="notes">${notes.map((e) => `<div><span class="chip" style="--c:${e.color}">${escapeHtml(e.n)}</span>${escapeHtml(e.text)}</div>`).join('')}</div>` : '';
  const numbered = cellsOf(sheet).some((cell) => (cell.marks ?? []).some((m) => m.n !== undefined));
  const refer = sheet.numbersRefer ?? (notes.length ? NUMBERS_REFER_NOTES : NUMBERS_REFER_TEXT);
  const keys = [
    ...legendItems(sheet).map((l) => `<span class="key"><i class="swatch ${l.style}" style="--c:${l.color}"></i>${escapeHtml(`${l.name}框＝${l.text}`)}</span>`),
    ...(numbered ? [`<span class="key"><span class="chip" style="--c:#555">1</span>${escapeHtml(refer)}</span>`] : []),
  ];
  return `${notesHtml}${keys.length ? `<div class="legend">${keys.join('')}</div>` : ''}`;
}

export function renderSheetHtml(sheet) {
  const subtitle = sheet.subtitle ? `<p class="sub">${escapeHtml(sheet.subtitle)}</p>` : '';
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${escapeHtml(sheet.title)}</title><style>${STYLE}</style></head>
<body><div id="sheet"><h1>${escapeHtml(sheet.title)}</h1>${subtitle}${renderGrid(sheet)}${renderNotesAndLegend(sheet)}</div></body></html>`;
}

/** Plain lines for the destination skill to format: title, subtitle, notes, one legend line. */
export function renderCompanionText(sheet) {
  const notes = noteLines(sheet);
  const legend = legendItems(sheet).map((l) => `${l.name}框＝${l.text}`);
  return [
    sheet.title,
    ...(sheet.subtitle ? [sheet.subtitle] : []),
    ...(notes.length ? ['', ...notes] : []),
    ...(legend.length ? ['', `圖例：${legend.join('；')}`] : []),
    '',
  ].join('\n');
}
