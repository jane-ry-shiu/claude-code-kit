# Browser Operation

Loaded at flow step 6 (Execute items), alongside `prototype-comparison.md` for tier 1 items or
`visual-comparison.md` for tier 2 items. This file covers what those two build on: which lane
drives which side, the order of preference between state, DOM, snapshot and screenshot, and the
mechanics of using each one without wasting tokens or trusting a false "Successfully."

Every tool call below is written `mcp__chrome-devtools-<lane>__<tool>`. Substitute `a` for the
prototype side and `b` for the implementation side, per Lane assignment below — `<lane>` is a
template slot, not a placeholder to fill in later.

## Lane assignment

The prototype runs on `chrome-devtools-a`, the implementation on `chrome-devtools-b`, both attached
to the shared Chrome started by `~/.claude/scripts/shared-chrome.sh`.

The reason for two lanes is state retention, not parallelism. Tool calls within one session
serialize regardless. What each entry keeps is its own selected page, so both sides stay where
they were between comparison items without tab-switching, and neither closes the other's page.
This is a deliberate reading of `browser-lanes`, not a violation of it: that skill's "when NOT
to use lanes" covers fanning work out to parallel subagents, and a per-item comparison is
indeed linear. Here both entries are driven by the one session, with no subagent involved.

Each lane opens its own tab with `new_page` and closes it at the end. The user's own tabs are
read-only.

Close those tabs LAST, after every reading is recorded. A lane whose selected page has been closed
has no selected page, and every subsequent call on that lane — `list_pages` included — answers
"The selected page has been closed" instead of doing its job. Do not climb out of that by selecting
one of the user's tabs: that is what "read-only" forbids. Confirm what remains open without any lane
at all —

```bash
curl -s http://localhost:9222/json/list
```

— and if the lane is genuinely needed again, `new_page` re-establishes it with a tab of its own.

Screenshots are inline by default. `take_screenshot` with `filePath` writes only inside a
workspace root, which dirties `git status`; persist an image only when a specific difference needs
it as evidence.

## Approach hierarchy

Four ways to get an answer out of the page, in order of preference:

1. **State inspection first** — for items about data/behaviour, query the store via
   `evaluate_script` (see State inspection below). One call usually replaces a navigate + snapshot
   + screenshot sequence.
2. **Narrow DOM query** — for text content, attributes, or visibility of a specific element.
3. **`take_snapshot`** — only when you need the a11y tree to find an element to interact with, or
   to confirm structural state (dialog open, role=alert appeared). See Snapshot usage below for
   rules on when to re-snapshot vs reuse uids.
4. **`take_screenshot`** — only for visual items.

The process below describes the snapshot-driven flow. Use it for the *interaction* part (clicking,
filling), but verify the *outcome* via state inspection whenever the store reflects what is being
compared.

### Process

For each comparison item:

#### 1. Navigate

```
mcp__chrome-devtools-<lane>__navigate_page → target route
```

#### 2. Wait for page ready

```
mcp__chrome-devtools-<lane>__wait_for → key text/element that signals page loaded
```

#### 3. Take initial snapshot

```
mcp__chrome-devtools-<lane>__take_snapshot → accessibility tree baseline
```

#### 4. Execute steps

Map each step to the appropriate tool:

| Action | Tool |
|--------|------|
| Click button/link | `mcp__chrome-devtools-<lane>__click` |
| Fill input field | `mcp__chrome-devtools-<lane>__fill` |
| Fill multiple fields | `mcp__chrome-devtools-<lane>__fill_form` |
| Select native `<select>` | `mcp__chrome-devtools-<lane>__fill` (select element) |
| Select custom dropdown (Vuetify, etc.) | `click` to open menu → `click` option in snapshot |
| Drag and drop | `mcp__chrome-devtools-<lane>__drag` — see Side-effect verification below first |
| Keyboard action | `mcp__chrome-devtools-<lane>__press_key` |
| Page reload | `mcp__chrome-devtools-<lane>__navigate_page` with `type: "reload"` |
| Read/verify JS state (localStorage, URL, etc.) | `mcp__chrome-devtools-<lane>__evaluate_script` |
| Wait for result | `mcp__chrome-devtools-<lane>__wait_for` |

Between steps, only re-snapshot when uids are invalidated (see Snapshot usage below, Rule 1).
Reuse existing uids when possible.

**Side-effect verification (mandatory after non-trivial interactions):** drag-and-drop, dropdown
selection on portal-rendered menus, autocomplete, toggles, contenteditable fills — all can return
"Successfully" while the application ignored the action. After any such interaction, run a
side-effect check via state or DOM (see Side-effect verification below) before moving on. If
verification fails, follow Retry policy below.

#### 5. Verify expected result

| Expected description | Verification method (preferred → fallback) |
|---------------------|-------------------------------------------|
| Dialog appears | `evaluate_script` `!!document.querySelector('[role="dialog"]')` → snapshot |
| Success message shown | `wait_for` success text → `evaluate_script` on alert/toast textContent |
| Navigates to /path | `evaluate_script` → `window.location.pathname` |
| Form field shows error | `evaluate_script` query error span → snapshot |
| Item disappears from list | Store query (state-first) → `evaluate_script` querySelector count |
| Network request sent | `list_network_requests` to verify call made |
| Specific data displayed | Store query → `evaluate_script` textContent → snapshot |
| State persists after reload | `navigate_page` type reload → re-check via store/JS state |
| localStorage/sessionStorage value | `evaluate_script` → `localStorage.getItem(key)` |
| Filtered list shows subset | Store query → `evaluate_script` row count |
| Drag/drop placed item | Store query (must — never trust drag tool's return) |

#### 6. Record result

For each item, record:

- **status**: PASS or FAIL
- **actual**: what was observed
- **evidence**: snapshot content or screenshot path that proves the result

### Principles

- This is a dev environment — don't avoid destructive operations (creating/deleting data is fine)
- Execute items in the order given
- Each item is independently recorded
- If a step fails mid-way, record FAIL with the step that failed and what happened instead
- Take a screenshot on FAIL for evidence: `mcp__chrome-devtools-<lane>__take_screenshot`

## State inspection

### Why state-first

For SPAs with reactive state (Vuex / Pinia / Redux / Zustand), querying the store via
`evaluate_script` is faster, more precise, and more token-efficient than reading a11y snapshots or
screenshots:

- One tool call instead of navigate → snapshot → screenshot → read
- Returns ~500 chars instead of ~3000 chars of a11y tree noise
- Sees data the a11y tree cannot (canvas-rendered markers, virtualized lists, items rendered in
  portals)
- No human-eye judgement required

**Rule of thumb:** if the comparison item is about *whether data is correct*, query the state. If
it is about *how it looks*, use visual.

### Verification approach decision table

| Item type | State-first viable? | How to verify |
|---|---|---|
| Item added/deleted in list | Yes | Query store array length + content |
| Form submission persists data | Yes | Read store after mutation |
| Navigation/redirect happens | Yes | `window.location.pathname` |
| Dialog/modal opens | Yes | Query visibility state |
| Button disabled / loading | Yes | Query corresponding ref/computed |
| Filter / sort applied | Yes | Compare store array before/after |
| Counter / badge value | Yes | Query state field |
| Text content / i18n | Mixed | DOM `textContent` of specific selector — still cheaper than full snapshot |
| Color / spacing / layout | No | Visual comparison required |
| Animation / transition | No | Screenshot or video |
| Canvas-rendered visuals | No | Screenshot |

### Detect framework + store

Run this **once** when first navigating to the target app:

```js
() => {
  const roots = ['#app', '#root', '[data-v-app]', '[data-reactroot]'];
  let root, vueApp;
  for (const sel of roots) {
    root = document.querySelector(sel);
    if (root?.__vue_app__) { vueApp = root.__vue_app__; break; }
  }
  return {
    framework: vueApp ? 'vue3' : (root?._reactRootContainer ? 'react' : 'unknown'),
    hasVuex: !!vueApp?.config.globalProperties.$store,
    hasPinia: !!vueApp?.config.globalProperties.$pinia,
    vuexModules: vueApp?.config.globalProperties.$store
      ? Object.keys(vueApp.config.globalProperties.$store.state) : [],
    piniaStores: vueApp?.config.globalProperties.$pinia
      ? Array.from(vueApp.config.globalProperties.$pinia._s?.keys() || []) : [],
  };
}
```

The result tells you which store-access snippet to use below.

### Access the store

#### Vuex (Vue 3)

```js
() => {
  const store = document.querySelector('#app').__vue_app__
    .config.globalProperties.$store;
  return store.state.<module>.<field>;
}
```

#### Pinia

```js
() => {
  const pinia = document.querySelector('#app').__vue_app__
    .config.globalProperties.$pinia;
  const useStore = pinia._s.get('<store-id>');
  return { count: useStore.count, items: useStore.items };
}
```

#### Redux

```js
() => {
  const state = window.__REDUX_DEVTOOLS_EXTENSION__
    ? window.store?.getState()
    : null;
  return state?.<slice>;
}
```

If Redux DevTools extension is not exposed, ask the developer to expose `window.store = store` in
dev builds.

#### Zustand / generic

Zustand stores are usually module-local. Either expose them on `window` in dev builds, or fall back
to DOM inspection.

### Verify side effects after a UI action

When you DO need a UI interaction (click, fill, etc.), still verify via state afterwards rather
than re-snapshotting:

```js
// After clicking the delete button
() => {
  const store = document.querySelector('#app').__vue_app__
    .config.globalProperties.$store;
  const items = store.state.device.deviceList;
  return {
    count: items.length,
    deletedItemPresent: items.some(d => d.id === 'F6A100007508'),
  };
}
```

This pattern — **act via UI, verify via state** — is faster than **act via UI, verify via
snapshot**.

### When to fall back

Fall back to snapshot/screenshot when:

1. The visible UI is not a faithful projection of the store (e.g., the bug is "store is correct but
   UI doesn't reflect it" — you NEED to look at the DOM)
2. The item is purely visual (layout, color, spacing)
3. Canvas / WebGL / SVG visuals where the data lives in the renderer, not the store
4. Cross-frame / iframe content the page-level store cannot reach

Even in these cases, prefer narrow DOM queries (`document.querySelector(...).textContent`) over
full `take_snapshot` whenever possible.

### Anti-patterns

| Anti-pattern | Fix |
|---|---|
| `take_snapshot` after every interaction | Query state, not a11y tree |
| Reading entire store dump | Query only the field you need; return ≤ 500 chars |
| Using state-first for visual items | Use `take_screenshot` and visual comparison |
| Trusting state alone for "UI bug" reports | If the original report is about UI mismatch, you must verify both store AND DOM |

### Recording evidence

When state-first verification passes, capture the JS query and its output in the item's actual
field:

```markdown
- Actual:
  - Vuex query: `store.state.floorPlan.devicePositions.filter(p => p.deviceSerialNumber.startsWith('F6A100007508'))`
  - Result: `[]`
  - Conclusion: ghost position cleared
```

This is more precise than "I saw the marker disappear" and reproducible by reviewers.

## Snapshot usage

`mcp__chrome-devtools-<lane>__take_snapshot` returns the page's accessibility (a11y) tree as text —
not a screenshot. It is the primary way to find element `uid`s for `click` / `fill` / `drag`. Treat
each call as expensive: a typical app page returns 100–280 lines that go straight into the prompt
as tokens, and `uid`s are renumbered on every call so they cannot be reused across snapshots.

### Rule 1: don't re-snapshot when uids are still valid

Most actions do NOT invalidate uids. Only re-snapshot when the page structure has actually changed.

| Action | Invalidates uids? | Re-snapshot? |
|---|---|---|
| `navigate_page` | Yes | Yes |
| `wait_for` resolves a route/page change | Yes | Yes |
| Modal / dialog opens | Yes (new subtree) | Yes |
| Modal / dialog closes | Yes | Yes |
| List filter / sort / pagination | Yes (rows change) | Yes |
| Accordion / tree expand/collapse | Locally yes | Sometimes — try narrow query first |
| `fill` (single field) | No | No |
| `fill_form` (multi-field) | Usually no | No (fill all you need before snapshotting) |
| `hover` | No | No (unless you need the tooltip's a11y) |
| `press_key` for normal typing | No | No |
| `press_key` Enter that submits | Yes | Yes |
| `evaluate_script` | No | No |
| `click` on a stateless link | Yes (navigation) | Yes |
| `click` on toggle / checkbox | Locally yes | Sometimes — narrow query may suffice |

**Pattern:** plan a sequence of actions that share one snapshot. Only re-snapshot at "structural"
boundaries (route changes, dialogs, list refreshes).

### Rule 2: dialog / modal — one snapshot is enough

Anti-pattern (4 calls):

```
1. click "Delete"
2. take_snapshot   ← find dialog
3. fill "DELETE"
4. take_snapshot   ← unnecessary, uids still valid
5. click "Confirm"
6. take_snapshot   ← unnecessary, evaluate_script can confirm dialog gone
```

Recommended (1 snapshot + 1 verification call):

```
1. click "Delete"
2. wait_for "DELETE to confirm"
3. take_snapshot                          ← capture all dialog uids at once
4. fill "DELETE" → click "Confirm"        ← uses uids from step 3
5. wait_for list-updated text             OR
   evaluate_script: !document.querySelector('[role="dialog"]')
```

### Rule 3: use evaluate_script when the question is narrow

`take_snapshot` returns the WHOLE page. If you only need one piece of info, `evaluate_script`
returns 100x less data and bypasses uid renumbering.

| Goal | Tool | Snippet |
|---|---|---|
| Need element uid to click/fill | `take_snapshot` | — |
| Confirm text appears/disappears | `wait_for` or `evaluate_script` | `document.body.innerText.includes('Successfully')` |
| Count list items | `evaluate_script` | `document.querySelectorAll('tr.row').length` |
| Read button disabled state | `evaluate_script` | `document.querySelector('#submit').disabled` |
| Read toast / alert | `evaluate_script` | `document.querySelector('[role="alert"]')?.textContent` |
| Current URL / pathname | `evaluate_script` | `window.location.pathname` |
| Confirm dialog closed | `evaluate_script` | `!document.querySelector('[role="dialog"]')` |
| Read form validation error | `evaluate_script` | `document.querySelector('.error-message')?.textContent` |
| Filter rows by visible text | `evaluate_script` | `[...document.querySelectorAll('tr')].filter(r => r.innerText.includes('X'))` |

Real example from a past session:

```js
// Instead of take_snapshot (returns ~4000 chars) and eyeballing the row list:
() => {
  return [...document.querySelectorAll('tr')]
    .map(r => r.innerText.split('\n')[0])
    .filter(t => t.includes('PR7508'));
}
// Returns: ["PR7508CAM2"]   (~30 chars, definitive answer)
```

### Rule 4: avoid `verbose: true`

`verbose: true` returns 3–5x more nodes (every `ignored` and `generic` element). Only use it when
the default snapshot truly cannot locate the target — usually a sign the element is ARIA-hidden, in
which case prefer `evaluate_script` with a CSS selector instead of forcing a verbose snapshot.

### Decision tree

```
Need to do something with the page?
├─ Need to interact (click/fill/drag)?
│   ├─ Do I already have a recent snapshot whose uids are still valid?
│   │   ├─ Yes → use existing uids
│   │   └─ No  → take_snapshot ONCE, plan all interactions in this region
│   └─ → call the action(s)
└─ Need to verify state/text/visibility?
    ├─ Is it in the reactive store?         → evaluate_script (see State inspection above)
    ├─ Is it a narrow DOM property?         → evaluate_script (querySelector)
    ├─ Is it just "a string appeared"?      → wait_for
    ├─ Is it structural (dialog open, role=alert)?
    │                                        → take_snapshot
    └─ Is it visual (layout/colour/canvas)? → take_screenshot
```

### Anti-patterns

| Anti-pattern | Fix |
|---|---|
| `take_snapshot` after every `fill` / `click` | Only re-snapshot at structural boundaries (Rule 1 table) |
| Re-snapshotting to verify a single text appeared | Use `wait_for` or `evaluate_script` |
| Reading row data out of snapshot text | Use `evaluate_script` to query the DOM directly |
| `verbose: true` as a default | Default snapshot first; if it fails, switch to `evaluate_script` |
| Snapshot on every modal step (open / fill / confirm) | One snapshot after modal opens covers all its interior elements |

## Side-effect verification

`mcp__chrome-devtools-<lane>__drag` (and several other interactions) returns "Successfully" based
on whether the gesture completed, NOT whether the application accepted it. A drop into the wrong
target, a click on a portal-rendered option, or a fill on an autocomplete that didn't select — all
return success while doing nothing.

**Core rule:** every interaction whose handler is non-trivial MUST be followed by a side-effect
verification step.

### The verification must be its own tool call

Never perform the action and read the result inside one `evaluate_script`. A reactive framework
does not re-render synchronously — Vue flushes on its own tick, React on its own scheduler — so a
read taken in the same call returns the value from **before** the action and the interaction looks
like it did nothing. Measured on a live page during this skill's own dry run: ticking two rows and
reading the count in the same call returned `0 selected`; the identical read in the next call
returned `2 selected`, with no further interaction in between.

Getting this wrong is worse here than in ordinary automation, because the false reading is
indistinguishable from the finding this skill exists to make. "The value did not change at the
moment of the action" is exactly the timing difference `references/prototype-comparison.md` hunts
for — so a same-call read manufactures the very defect being looked for, on both sides, and the
comparison still reports SAME while both readings are wrong.

One action per call, one read per call. If a sequence needs several actions, each still gets its
own read before the next action begins.

### Selecting the drag source (`from_uid`)

Draggable cards usually look like this in a snapshot:

```
group                          ← drag THIS
  generic
    image (thumbnail)
  generic
    StaticText "Item label"    ← NOT this
```

**Default a11y snapshot often hides the group as `ignored`.** If you only see the StaticText, do
NOT drag it. Take ONE `verbose: true` snapshot to find the group container, record its uid, and
switch back to default snapshots.

Hints for identifying the right `from_uid`:

| Visual pattern | Right `from_uid` |
|---|---|
| Card with thumbnail + label | The card container (usually `group`) |
| Table row | The `tr` / `row`, not a cell |
| Sortable list item | The `listitem`, not its label text |
| Tile in a kanban column | The tile container, not its title |

If unsure, prefer a parent over a child. Dragging a parent always works if the parent is the
registered drag source; dragging a child usually fails.

### Selecting the drop target (`to_uid`)

A drop zone is whatever element has the registered `drop` handler. The visible "this is where it
goes" area often contains many child elements with their own `click` handlers — those are NOT drop
zones.

**Priority for `to_uid`:**

1. ARIA `Canvas` role — for canvas-based apps (floor plans, whiteboards, design tools)
2. ARIA `region` or named container — for kanban columns, sortable lists
3. The parent `generic` whose children are the existing items
4. Never pick: `button`, `tab`, filter chip, icon button — even if they sit visually within the
   drop region

Real example of a wrong choice from a past session: dropping onto an "Online" filter button inside
the floor plan area looked geometrically correct, but the button has its own click handler and the
gesture got swallowed.

### Verifying the side effect

Even if you followed the source and target rules above perfectly, **assume the drag/drop / click /
fill might have failed silently** until you've verified its effect.

**Verification template (state-first):**

```js
() => {
  const store = document.querySelector('#app').__vue_app__
    .config.globalProperties.$store;
  return {
    targetPresent: store.state.<module>.<list>
      .some(item => item.id === '<expected-id>'),
    listCount: store.state.<module>.<list>.length,
  };
}
```

Verification fallback ladder (use the highest applicable):

1. **State change** — query reactive store (see State inspection above)
2. **DOM marker** — `querySelector` for a "Placed" / "Selected" / "Done" badge that only appears on
   success
3. **Source state change** — source item disappears from the list, or its row gains a CSS class
4. **Destination state change** — destination region's child count grows by 1
5. **Network request fired** — `mcp__chrome-devtools-<lane>__list_network_requests` to confirm an
   API call was sent
6. **Re-snapshot a narrow region** — last resort

If verification confirms success → continue. If not → go to Retry policy below.

### Other interactions that silently fail

The same "act → verify side effect" discipline applies to:

| Interaction | Common silent-failure cause | Verify by |
|---|---|---|
| `click` on dropdown option | Vuetify/Antd menu uses portal, uid is stale | Read select element's value |
| `fill` on autocomplete | Text typed but no option selected | Check hidden `input[name]` value or store binding |
| `press_key` Enter to submit form | Form only listens to click submit | Check URL/state change; if unchanged, click submit button |
| `click` toggle / switch | Click during transition is swallowed | Read `aria-checked` / `aria-pressed` |
| `click` icon button without label | Wrong uid (clicked the SVG path, not the button) | Verify the action's effect |
| `fill` on contenteditable | `value` doesn't update for contenteditable | Read `textContent` or store-bound model |

**General rule:** if the interaction's effect is anything other than "the same element changed
visibly," verify the side effect. Don't trust the tool's "Successfully" return.

### When to re-snapshot after an interaction

Only re-snapshot if:

- The interaction was supposed to navigate / open a dialog / change route — yes, re-snapshot (see
  Snapshot usage above, Rule 1 table)
- You need new uids to perform the next interaction — yes, but combine with verification
- You're verifying a purely visual side effect that has no store/DOM marker — yes, but prefer
  narrow query or screenshot

If the interaction's success can be verified by state or a single DOM property, **don't
re-snapshot**. Use `evaluate_script` and move on.

### Comparing timing across two lanes

When comparing timing, a side-effect check that is merely "eventually true" is not enough — the
check must distinguish "changed now" from "changed on close," which usually means reading state
immediately after the action and again after the closing action.

### Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Treating `drag` "Successfully" as proof of success | Always verify the side effect |
| Retrying drag with the same uids | Change `from_uid` or `to_uid` each attempt |
| Retrying more than 3 times | Stop, report BLOCKED, escalate to user |
| Dragging a StaticText label that's inside a `group` | Drag the `group` (use verbose snapshot once if needed) |
| Dropping onto a button inside the drop region | Pick the region/canvas itself, not its inner controls |
| Skipping verification because "it looked like it worked" | "Looked like" is not evidence; query state or DOM |

## Retry policy

Cap retries at **3 attempts**. Beyond that, escalate to the user — do not retry indefinitely.

```
attempt 1: best-guess uids (from_uid + to_uid rules above)
  └─ verify (Verifying the side effect above) → ok? done. failed? continue.
attempt 2: change from_uid (try the parent or child of the previous choice)
  └─ verify → ok? done. failed? continue.
attempt 3: change to_uid (try a different region/canvas; avoid any element you suspect has its own click handler)
  └─ verify → ok? done. failed? STOP.

STOP → report BLOCKED with:
  - All from/to uid combinations attempted
  - Snapshot of the relevant region (so a human can see the structure)
  - Suggestion: try escape hatch, or ask user to perform manually
```

### Escape hatch: synthetic DragEvent

Last resort when MCP `drag` cannot succeed. Use `evaluate_script` to dispatch the events directly:

```js
() => {
  const source = document.querySelector('[data-device-id="<id>"]');
  const target = document.querySelector('canvas.floorplan-canvas');
  if (!source || !target) return { error: 'selectors missing' };
  const dt = new DataTransfer();
  source.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
  target.dispatchEvent(new DragEvent('dragover',  { dataTransfer: dt, bubbles: true }));
  target.dispatchEvent(new DragEvent('drop',      { dataTransfer: dt, bubbles: true }));
  source.dispatchEvent(new DragEvent('dragend',   { dataTransfer: dt, bubbles: true }));
  return 'dispatched';
}
```

**Limitations:**

- Vue Draggable / SortableJS / similar JS-based libraries: synthetic events usually work
- HTML5 native drag-and-drop with `isTrusted` checks: synthetic events get rejected
- Always verify the side effect afterwards (Verifying the side effect above). If the synthetic
  events don't take effect, ask the user to perform the action manually and continue verification
  from a known state.
