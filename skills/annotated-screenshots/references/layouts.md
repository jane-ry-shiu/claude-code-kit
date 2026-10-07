# Layouts

Three layouts share one spec shape: rows × columns of cells. `layout` only sets the default cell
width. Paths in `src` may be relative to the spec file.

## Spec fields

| Field | Where | Meaning |
|---|---|---|
| `title` | sheet | What the image shows. Required |
| `subtitle` | sheet | One sentence: how to read it. Required |
| `layout` | sheet | `grid` (520), `pair` (700), `steps` (900) — default cell width |
| `cellWidth` | sheet | Overrides the default width |
| `columns` | sheet | Column headings; `[""]` for none |
| `rowLabels` | sheet | Row headings, one per row (Jira: the checklist numbers) |
| `legend` | sheet | `{ meaning: text }` — this image's wording for a meaning |
| `meanings` | sheet | Extra meanings `{ key: { color, name, label } }`; table colours are taken |
| `numbersRefer` | sheet | What badge numbers refer to; default depends on whether notes exist |
| `src` | cell | PNG screenshot |
| `pixelRatio` | cell | Device scale of the screenshot (2 for live captures; 1 when rects were read off the image) |
| `verdict` | cell | `pass` / `fail` — frame colour and ✓ / ✗ strip |
| `unreachable` | cell | Reason, instead of `src`, for a condition that cannot exist |
| `crop` | cell | `[x, y, width, height]` in the screenshot's CSS px. The cell shows only this part, enlarged to the cell width but never past the screenshot's own pixels. Marks keep full-screenshot coordinates and must sit inside the crop |
| `marks[].rect` | mark | `[x, y, width, height]` in the screenshot's CSS px |
| `marks[].meaning` | mark | `pass`, `fail`, `focus`, `step`, or a key from `meanings` |
| `marks[].n` | mark | Badge label; unique within a cell |
| `marks[].note` | mark | The line for the notes list; never drawn on the screenshot |
| `marks[].badge` | mark | Pin the badge to `tl`, `tr`, `bl` or `br` |

## grid — Jira verification record

```json
{
  "title": "Settings 對話框：tooltip 外觀",
  "subtitle": "每格是同一個 tooltip 在不同條件下的樣子；外框顏色是驗證結果，藍框是受測的 tooltip。",
  "layout": "grid",
  "columns": ["Dark theme", "Light theme", "很長、中間沒有斷點的字串"],
  "rowLabels": ["#10", "#11", "#12"],
  "legend": { "focus": "受測的 tooltip" },
  "numbersRefer": "編號對應驗證清單項目",
  "rows": [
    [
      { "src": "tip10-dark.png", "verdict": "pass", "crop": [240, 90, 520, 130], "marks": [{ "rect": [320, 130, 345, 50], "meaning": "focus", "n": "#10" }] },
      { "src": "tip10-light.png", "verdict": "pass", "crop": [240, 90, 520, 130], "marks": [{ "rect": [320, 130, 345, 50], "meaning": "focus", "n": "#10" }] },
      { "src": "tip10-long.png", "verdict": "pass", "crop": [240, 90, 520, 130] }
    ],
    [
      { "src": "tip11-dark.png", "verdict": "pass" },
      { "src": "tip11-light.png", "verdict": "pass" },
      { "src": "tip11-long.png", "verdict": "pass" }
    ],
    [
      { "src": "tip12-dark.png", "verdict": "pass" },
      { "src": "tip12-light.png", "verdict": "pass" },
      { "src": "tip12-long.png", "verdict": "pass" }
    ]
  ]
}
```

Numbers are the checklist's own (`#10`); never renumber them. Every cell has a verdict. Row #10
is cropped to the tooltip and its surroundings, the same crop in every column, so the tooltip shows
at its real size and the three cells compare position for position.

## pair — PR before / after

```json
{
  "title": "長字串 tooltip：改動前後",
  "subtitle": "同一個位置、同一串很長的名稱；編號相同的框是同一處。",
  "layout": "pair",
  "columns": ["改動前", "改動後"],
  "legend": { "fail": "改動前的問題", "pass": "改動後的結果" },
  "rows": [[
    { "src": "before-long-string.png", "marks": [{ "rect": [20, 40, 345, 30], "meaning": "fail", "n": 1, "note": "字串被切掉，看不到結尾" }] },
    { "src": "after-long-string.png", "marks": [{ "rect": [20, 40, 345, 48], "meaning": "pass", "n": 1, "note": "折成兩行，完整顯示" }] }
  ]]
}
```

The same number on both sides marks the same spot; the notes list names the side.

## steps — Confluence operation manual

```json
{
  "title": "變更通知設定",
  "subtitle": "照編號順序操作。",
  "layout": "steps",
  "columns": [""],
  "rows": [[
    { "src": "settings-dialog.png", "marks": [
      { "rect": [440, 104, 104, 30], "meaning": "step", "n": 1, "note": "點 Notifications 分頁" },
      { "rect": [828, 167, 200, 30], "meaning": "step", "n": 2, "note": "在 Email 這一列選通知頻率" },
      { "rect": [772, 697, 148, 31], "meaning": "step", "n": 3, "note": "按 Save" }
    ] }
  ]]
}
```

Numbers follow the operation order. The screenshot must show nothing but the screen the reader will
see: close unrelated tooltips before capturing.
