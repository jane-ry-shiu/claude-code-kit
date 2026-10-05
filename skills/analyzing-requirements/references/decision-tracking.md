# Decision Tracking

Tag every finding by category, and never leave an unknown silent.

**Categories:** `confirmed-decision` · `supplementary-decision` (we decided it; the spec didn't — recommend backfill) · `spec-gap` (spec silent/ambiguous — confirm with PM) · `known-limitation` (no current solution) · `technical-constraint` (API/data reality) · `phasing` (split across phases).

**Per item:** id, category, status, owner (required if `pending-confirm`), and — for `supplementary-decision` — a "backfill to spec" note.

**No silent unknowns:** any unresolved decision is either escalated (`pending-confirm` + owner) or recorded as an explicit assumption with a risk note. Never silent.
