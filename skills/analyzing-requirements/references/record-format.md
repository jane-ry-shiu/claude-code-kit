# Record Format

One growing Markdown document, evolving across phases: scope list → work items → assessment → recommended slicing. One file, not many.

- **Addressable items:** every item gets a stable id (`S1`, `W3`, `A7`) so review can reference items individually.
- **Status** (per item): `pending-confirm` (待確認) · `in-this-round` (本輪做) · `not-this-round` (本輪不做) · `deferred` (緩).
- **Where to save:** ASK the user at write time (local path / Confluence / other). Do not hardcode or depend on Confluence (auth is unreliable).
- **Review loop:** batch-produce, then the user reviews item-by-item or as a batch; revise on feedback.
- **Target shape:** match `references/example-record.md` — a self-contained worked example showing the layout and depth (behavior rules, truth tables, per-page gaps, limits, phasing, explicit "confirm with PM" / "backfill to spec" markers). It is the canonical reference and is always available. The team's "Logic" page is an optional, fuller real example **if accessible** — do not depend on it (it can move, change, or be auth-blocked).
