# Visual Comparison

Loaded at flow step 6 (Execute items) for tier-2 items, alongside `references/browser-operation.md`
for lane mechanics. Compares the implementation — screenshotted on `chrome-devtools-b` — against a
tier-2 Figma baseline resolved during baseline discovery, and produces differences tagged
`[LAYOUT] | [SPACING] | [COLOR] | [TYPOGRAPHY] | [ICON] | [ALIGNMENT] | [MISSING] | [EXTRA]`, which
flow step 7 (Classify differences) reads.

## Prerequisites

### 1. Figma MCP authentication

Check if `figma-remote-mcp` tools are available. If not:

```
mcp__figma-remote-mcp__authenticate
```

Guide the user through the OAuth flow. Do not proceed until authenticated.

### 2. Tier-2 baseline already resolved

The Figma frame — a `figma.com/design/` or `figma.com/file/` URL carrying a node id — comes from
flow step 2 (`references/baseline-discovery.md`, Classification) and was already confirmed by the
user at flow step 3's comparison-item gate. This file does not prompt the user about whether to run
a Figma comparison — the baseline tier is already settled before this file ever loads, so a prompt
here would be a second gate for a question the flow already answered. If the item being executed
has no tier-2 baseline recorded, it is not a visual-comparison item — go back to flow step 3 rather
than inventing a Figma URL here.

## Process

### 1. Capture implementation screenshot

Navigate to the target route on the implementation lane and take a screenshot:

```
mcp__chrome-devtools-b__navigate_page → route
mcp__chrome-devtools-b__take_screenshot
```

Screenshots are inline by default, per `references/browser-operation.md` (Lane assignment):
`take_screenshot` with `filePath` writes only inside a workspace root, which dirties `git status`.
Call it with no `filePath` and use the inline image for this comparison; persist a file only when a
specific difference needs it as evidence.

### 2. Get Figma design

Use the Figma MCP tools (available after authentication) to retrieve the frame image or node
information for the node id recorded during baseline discovery — `mcp__figma-remote-mcp__get_screenshot`
for the reference image, `get_design_context` or `get_metadata` for structural detail.

### 3. AI visual comparison

Compare the implementation screenshot against the Figma design on these dimensions:

| Dimension | What to Check |
|-----------|--------------|
| Layout | Element positioning, grid structure, spacing between sections |
| Spacing | Margins, padding, gaps between elements |
| Color | Background colors, text colors, border colors, status indicators |
| Typography | Font size, weight, line height |
| Icons | Presence, position, size |
| Alignment | Horizontal/vertical alignment of elements |
| Missing elements | Components in design but absent in implementation |
| Extra elements | Components in implementation but absent in design |

### 4. Record differences

Format:

```
VISUAL CHECK: <route> vs Figma "<frame name>"

Differences:
- [LAYOUT] <description> (implementation: X, design: Y)
- [SPACING] <description> (implementation: X, design: Y)
- [COLOR] <description> (implementation: X, design: Y)
- [TYPOGRAPHY] <description> (implementation: X, design: Y)
- [ICON] <description> (implementation: X, design: Y)
- [ALIGNMENT] <description> (implementation: X, design: Y)
- [MISSING] <description>
- [EXTRA] <description>

No differences:
- <aspects that match correctly>
```

Every difference carries exactly one tag from
`[LAYOUT] | [SPACING] | [COLOR] | [TYPOGRAPHY] | [ICON] | [ALIGNMENT] | [MISSING] | [EXTRA]` — flow
step 7 reads this tag when classifying the difference against existing review conclusions.

## Limitations

Include this disclaimer in every visual comparison result — it is mandatory output, not a footnote:

```
Visual comparison is AI-based, not pixel-perfect. Differences < 2px may not be detected. Recommend manual review for precise alignment verification.
```

## Scope

- Only compare pages/areas covered by the confirmed comparison-item list (flow step 3) — do not
  perform full-site visual regression.
- One comparison per Figma frame recorded for the item.
