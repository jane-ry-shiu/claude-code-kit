import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { CORNERS } from './geometry.mjs';
import { LAYOUT_CELL_WIDTH, PALETTE, VERDICTS } from './palette.mjs';
import { readPngSize } from './png-size.mjs';

export class SpecError extends Error {
  constructor(problems) {
    super(`sheet spec has ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
    this.name = 'SpecError';
    this.problems = problems;
  }
}

const PALETTE_COLORS = new Set(Object.values(PALETTE).map((m) => m.color.toLowerCase()));

function customMeaningProblems(custom) {
  return Object.entries(custom).flatMap(([key, m]) => {
    if (PALETTE[key]) return [`meanings.${key}: "${key}" is a fixed meaning and cannot be redefined`];
    if (!m?.color || !m?.name || !m?.label) return [`meanings.${key}: needs color, name and label`];
    if (PALETTE_COLORS.has(String(m.color).toLowerCase())) return [`meanings.${key}: ${m.color} already has a fixed meaning`];
    return [];
  });
}

function markProblems(mark, at, css, meanings) {
  const rectOk = Array.isArray(mark?.rect) && mark.rect.length === 4 && mark.rect.every(Number.isFinite);
  const [x, y, w, h] = rectOk ? mark.rect : [0, 0, 0, 0];
  const outside = rectOk && (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > css.width || y + h > css.height);
  return [
    ...(rectOk ? [] : [`${at}: rect must be [x, y, width, height]`]),
    ...(outside ? [`${at}: rect ${JSON.stringify(mark.rect)} falls outside the ${css.width}×${css.height} screenshot`] : []),
    ...(meanings[mark?.meaning] ? [] : [`${at}: unknown meaning "${mark?.meaning}"`]),
    ...(mark?.badge === undefined || CORNERS.includes(mark.badge) ? [] : [`${at}: badge must be one of ${CORNERS.join(', ')}`]),
  ];
}

function duplicateNumberProblems(marks, where) {
  const labels = marks.map((m) => m.n).filter((n) => n !== undefined);
  const dupes = [...new Set(labels.filter((n, i) => labels.indexOf(n) !== i))];
  return dupes.map((n) => `${where}: number ${n} appears more than once`);
}

function unreachableCell(cell, where) {
  const problems = [
    ...(cell.src ? [`${where}: give either src or unreachable, not both`] : []),
    ...(String(cell.unreachable).trim() ? [] : [`${where}: unreachable needs a reason`]),
  ];
  return { problems, cell: { unreachable: String(cell.unreachable) } };
}

function readSize(src, where) {
  if (!existsSync(src)) return { problem: `${where}: file not found: ${src}` };
  try {
    return { size: readPngSize(src) };
  } catch (e) {
    return { problem: `${where}: ${e.message}` };
  }
}

function checkCell(cell, where, meanings, baseDir) {
  if (cell?.unreachable !== undefined) return unreachableCell(cell, where);
  if (!cell?.src) return { problems: [`${where}: src is required (or unreachable with a reason)`], cell: null };
  const src = isAbsolute(cell.src) ? cell.src : resolve(baseDir, cell.src);
  const { size, problem } = readSize(src, where);
  if (problem) return { problems: [problem], cell: null };
  const pixelRatio = cell.pixelRatio ?? 1;
  const css = { width: size.width / pixelRatio, height: size.height / pixelRatio };
  const marks = (cell.marks ?? []).map((m) => (m.n === undefined ? { ...m } : { ...m, n: String(m.n) }));
  const problems = [
    ...(pixelRatio > 0 ? [] : [`${where}: pixelRatio must be a positive number`]),
    ...(cell.verdict === undefined || VERDICTS[cell.verdict] ? [] : [`${where}: verdict must be pass or fail`]),
    ...marks.flatMap((m, i) => markProblems(m, `${where}.marks[${i}]`, css, meanings)),
    ...duplicateNumberProblems(marks, where),
  ];
  return { problems, cell: { src, css, verdict: cell.verdict, marks } };
}

function topLevelProblems(spec, layout, columns, rows) {
  return [
    ...(spec?.title ? [] : ['title is required']),
    ...(spec?.subtitle ? [] : ['subtitle is required (one sentence: how to read the image)']),
    ...(LAYOUT_CELL_WIDTH[layout] ? [] : [`layout must be one of ${Object.keys(LAYOUT_CELL_WIDTH).join(', ')}`]),
    ...(columns.length ? [] : ['columns must list at least one heading ("" for none)']),
    ...(rows.length ? [] : ['rows must contain at least one row']),
    ...(spec?.rowLabels && spec.rowLabels.length !== rows.length
      ? [`rowLabels has ${spec.rowLabels.length} entries for ${rows.length} rows`] : []),
  ];
}

/** Validates a sheet spec; returns the normalized sheet or throws SpecError listing every problem. */
export function normalizeSpec(spec, { baseDir = process.cwd() } = {}) {
  const layout = spec?.layout ?? 'grid';
  const columns = Array.isArray(spec?.columns) ? spec.columns.map(String) : [];
  const rows = Array.isArray(spec?.rows) ? spec.rows : [];
  const custom = spec?.meanings ?? {};
  const meanings = { ...PALETTE, ...Object.fromEntries(Object.entries(custom).map(([k, m]) => [k, { style: 'solid', ...m }])) };
  const checked = rows.map((row, r) => (Array.isArray(row) && row.length === columns.length
    ? row.map((cell, c) => checkCell(cell, `rows[${r}][${c}]`, meanings, baseDir))
    : null));
  const problems = [
    ...topLevelProblems(spec, layout, columns, rows),
    ...customMeaningProblems(custom),
    ...checked.flatMap((row, r) => (row ? row.flatMap((c) => c.problems) : [`rows[${r}] must have ${columns.length} cells`])),
  ];
  if (problems.length) throw new SpecError(problems);
  return Object.freeze({
    title: String(spec.title),
    subtitle: String(spec.subtitle),
    layout,
    columns,
    rowLabels: spec.rowLabels ? spec.rowLabels.map(String) : null,
    cellWidth: spec.cellWidth ?? LAYOUT_CELL_WIDTH[layout],
    meanings,
    legend: spec.legend ?? {},
    numbersRefer: spec.numbersRefer ?? null,
    rows: checked.map((row) => row.map((c) => c.cell)),
  });
}
