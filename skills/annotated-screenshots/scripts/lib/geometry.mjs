import { BADGE_HEIGHT, BOX_BORDER, BOX_OUTSET } from './palette.mjs';

export const CORNERS = Object.freeze(['tl', 'tr', 'bl', 'br']);

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const intersects = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const insideImage = (r, W, H) => r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H;

/** Rect [x, y, w, h] in source CSS px → displayed px, 3 px outside the element, clamped to W×H. */
export function toDisplayBox([x, y, w, h], scale, W, H) {
  const left = clamp(x * scale - BOX_OUTSET, 0, W);
  const top = clamp(y * scale - BOX_OUTSET, 0, H);
  const right = clamp((x + w) * scale + BOX_OUTSET, 0, W);
  const bottom = clamp((y + h) * scale + BOX_OUTSET, 0, H);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** An 18 px circle for one character; longer labels such as "#10" widen it. */
export const badgeWidth = (label) => Math.max(BADGE_HEIGHT, 8 + 7 * String(label).length);

/** Badge touching a box corner diagonally from outside, overlapping only the box's border. */
function badgeAt(box, corner, w) {
  const x = corner.endsWith('l') ? box.x - w + BOX_BORDER : box.x + box.w - BOX_BORDER;
  const y = corner.startsWith('t') ? box.y - BADGE_HEIGHT + BOX_BORDER : box.y + box.h - BOX_BORDER;
  return { x, y, w, h: BADGE_HEIGHT };
}

const keepInside = (r, W, H) => ({ ...r, x: clamp(r.x, 0, W - r.w), y: clamp(r.y, 0, H - r.h) });

function straddle(box, w, W, H) {
  const x = clamp(box.x - w / 2, 0, W - w);
  const y = clamp(box.y - BADGE_HEIGHT / 2, 0, H - BADGE_HEIGHT);
  return { x, y, w, h: BADGE_HEIGHT };
}

/**
 * One badge per labelled box, in order; unlabelled boxes get null but still block corners.
 * A corner is free when the badge stays inside W×H and overlaps no other box and no earlier badge.
 */
export function placeBadges(boxes, W, H) {
  return boxes.reduce((placed, box, i) => {
    if (box.label === undefined) return [...placed, null];
    const w = badgeWidth(box.label);
    const others = boxes.filter((_, j) => j !== i);
    const free = (r) => insideImage(r, W, H)
      && !others.some((b) => intersects(r, b))
      && !placed.some((p) => p && intersects(r, p));
    const corner = box.badge ?? CORNERS.find((c) => free(badgeAt(box, c, w)));
    // A pinned corner skips the free check but must still stay inside the image.
    const rect = corner ? keepInside(badgeAt(box, corner, w), W, H) : straddle(box, w, W, H);
    return [...placed, { ...rect, corner: corner ?? 'straddle' }];
  }, []);
}

const rectsOf = (m) => (Array.isArray(m) ? m : m.targets.map((t) => t.rect));

/** Largest coordinate change between two measurements (measure results or rect lists) of the same targets. */
export function maxRectDrift(first, second) {
  const before = rectsOf(first);
  const after = rectsOf(second);
  if (before.length !== after.length) return Infinity;
  return Math.max(0, ...before.flatMap((r, i) => r.map((v, k) => Math.abs(v - after[i][k]))));
}
