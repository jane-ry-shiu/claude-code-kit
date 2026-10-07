import test from 'node:test';
import assert from 'node:assert/strict';
import { badgeWidth, maxRectDrift, placeBadges, toDisplayBox } from '../lib/geometry.mjs';

test('toDisplayBox scales, outsets by 3 px and clamps to the image', () => {
  assert.deepEqual(toDisplayBox([100, 50, 40, 20], 0.5, 400, 300), { x: 47, y: 22, w: 26, h: 16 });
  assert.deepEqual(toDisplayBox([0, 0, 10, 10], 1, 400, 300), { x: 0, y: 0, w: 13, h: 13 });
});

test('badgeWidth: a circle for one character, wider for #10', () => {
  assert.equal(badgeWidth('1'), 18);
  assert.equal(badgeWidth('#10'), 29);
});

test('placeBadges takes the top-left corner when it is free', () => {
  const [b] = placeBadges([{ x: 100, y: 100, w: 50, h: 20, label: '1' }], 400, 300);
  assert.deepEqual(b, { x: 84, y: 84, w: 18, h: 18, corner: 'tl' });
});

test('edge: a box in the top-left corner of the image gets its badge bottom-right, inside the image', () => {
  const [b] = placeBadges([{ x: 5, y: 5, w: 50, h: 20, label: '1' }], 400, 300);
  assert.equal(b.corner, 'br');
  assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 400 && b.y + b.h <= 300);
});

test('edge: a box at the top-right corner keeps its badge inside the image', () => {
  const [b] = placeBadges([{ x: 370, y: 0, w: 30, h: 30, label: '1' }], 400, 300);
  assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 400 && b.y + b.h <= 300, JSON.stringify(b));
});

test('placeBadges skips a corner that would cover another box', () => {
  const boxes = [{ x: 100, y: 100, w: 50, h: 20, label: '1' }, { x: 70, y: 70, w: 30, h: 30 }];
  const [first, second] = placeBadges(boxes, 400, 300);
  assert.equal(first.corner, 'tr');
  assert.equal(second, null);
});

test('placeBadges skips a corner taken by an earlier badge', () => {
  const boxes = [
    { x: 100, y: 100, w: 10, h: 10, label: '1', badge: 'br' },
    { x: 130, y: 130, w: 10, h: 10, label: '2' },
  ];
  assert.equal(placeBadges(boxes, 400, 300)[1].corner, 'tr');
});

test('straddle: with no free corner the badge straddles top-left, moved inside the image', () => {
  const [b] = placeBadges([{ x: 0, y: 0, w: 400, h: 300, label: '1' }], 400, 300);
  assert.deepEqual(b, { x: 0, y: 0, w: 18, h: 18, corner: 'straddle' });
});

test('placeBadges honours a pinned corner', () => {
  const [b] = placeBadges([{ x: 100, y: 100, w: 50, h: 20, label: '1', badge: 'br' }], 400, 300);
  assert.equal(b.corner, 'br');
});

test('a pinned corner at the image edge is moved back inside the image', () => {
  const [b] = placeBadges([{ x: 490, y: 5, w: 25, h: 22, label: '#10', badge: 'tr' }], 520, 300);
  assert.equal(b.corner, 'tr');
  assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 520 && b.y + b.h <= 300, JSON.stringify(b));
});

test('maxRectDrift accepts two measure results directly', () => {
  const first = { targets: [{ selector: '#a', rect: [0, 0, 10, 10] }] };
  const second = { targets: [{ selector: '#a', rect: [0, 3, 10, 10] }] };
  assert.equal(maxRectDrift(first, second), 3);
});

test('maxRectDrift reports the largest coordinate change', () => {
  assert.equal(maxRectDrift([[0, 0, 10, 10]], [[1, 0, 10, 12]]), 2);
  assert.equal(maxRectDrift([[0, 0, 10, 10]], []), Infinity);
});
