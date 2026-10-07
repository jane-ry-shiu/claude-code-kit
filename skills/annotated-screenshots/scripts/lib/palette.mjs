// Fixed meaning → colour table (design section 4). A colour here never takes another meaning.
export const PALETTE = Object.freeze({
  pass: Object.freeze({ color: '#16a34a', name: '綠', label: '符合預期', style: 'solid' }),
  fail: Object.freeze({ color: '#dc2626', name: '紅', label: '不符預期', style: 'solid' }),
  focus: Object.freeze({ color: '#2563eb', name: '藍', label: '要看的地方', style: 'solid' }),
  step: Object.freeze({ color: '#ea580c', name: '橘', label: '操作步驟', style: 'solid' }),
  unreachable: Object.freeze({ color: '#9ca3af', name: '灰色虛線', label: '這個條件到不了', style: 'dashed' }),
});

export const VERDICTS = Object.freeze({ pass: '✓', fail: '✗' });
export const LAYOUT_CELL_WIDTH = Object.freeze({ grid: 520, pair: 700, steps: 900 });
export const BADGE_HEIGHT = 18;
export const BOX_BORDER = 2;
export const BOX_OUTSET = 3;
export const NUMBERS_REFER_NOTES = '編號對應下方說明';
export const NUMBERS_REFER_TEXT = '編號對應文字說明裡的同一編號';
