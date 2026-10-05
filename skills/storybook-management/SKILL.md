---
name: storybook-management
description: Use when creating or modifying Vue component files in projects with Storybook installed, or when asked to generate Storybook stories via /storybook command
---

# Storybook Management

Automatically generate and sync Storybook story files for Vue components. Two tiers: **detailed** stories for base-like UI primitives, **simple** stories for higher-level components.

## When to Use

**Prerequisite:** Project has Storybook installed (`package.json` contains `storybook` or `@storybook/*` dependencies). If not found, this skill does not apply.

**Passive mode (auto-trigger):**
- New `.vue` component file created → create story
- Component interface changed (`defineProps`, `defineEmits`, `defineSlots`, `defineModel`) → sync story
- Internal logic only (computed, methods, template tweaks) → no action

**Manual mode:**
- `/storybook <ComponentName>` → search project for `.vue` file, generate story

## Component Classification

Classify by component **nature** (resembles open-source UI library component?), NOT by folder structure or complexity.

| Classification | Examples | Template |
|---|---|---|
| Base-like | Button, Card, Table, Input, Select, Tabs, Pagination, Navbar, Alert, Dialog, Tooltip, Avatar, Tag, Checkbox, Radio, Accordion, Menu, Breadcrumb, Divider, Badge, Switch | [detailed-template.md](detailed-template.md) |
| High-level | Everything else (business forms, feature composites, page-specific, layout components) | [simple-template.md](simple-template.md) |
| Uncertain | Ask user | — |
| User override | Follow user's explicit request | — |

## Core Workflow

### Step 1: Verify Storybook
Check `package.json` for `storybook` or `@storybook/*`. If absent → skip.

### Step 2: Classify Component
Apply classification table. If uncertain → ask user.

### Step 3: Reference-Based Learning
Search for existing `.stories.js` or `.stories.ts` files in the same or nearby directories. Read 2-3 to learn:
- File format (`.js` vs `.ts`)
- Import style (`@/` vs relative)
- Meta structure conventions
- Template patterns (kebab-case vs PascalCase)
- v-bind pattern (spread vs no-spread)
- Project-specific helpers or utilities

If no existing stories → use built-in fallback templates.

### Step 4: Read Component
Analyze: `defineProps`, `defineEmits`, `defineSlots`, `defineModel`, template structure. Understand component purpose.

### Step 5: Generate Story
- Base-like → read [detailed-template.md](detailed-template.md)
- High-level → read [simple-template.md](simple-template.md)
- Adapt based on Reference-Based Learning findings

### Step 6: Write File
Co-locate as `ComponentName.stories.{js|ts}` next to the component. Match file extension to project convention from Step 3.

## Sync Logic (Existing Stories)

When a component's interface changes and a story file already exists:

| Change Type | Story Update |
|-------------|-------------|
| Prop added | Add to `argTypes` with control, add to `args` with default |
| Prop removed | Remove from `argTypes`, `args`, and template usage |
| Prop renamed | Rename in `argTypes`, `args`, and template |
| Prop options changed | Update `argTypes.options` and variant story template |
| Emit added/removed | Sync `@event` bindings in story template if present |
| Slot added/removed | Update slot-related content in template |
| v-model added/removed | Adjust import (`ref`) and template binding |
| Visual prop added (size, color, etc.) | Append new variant story for base-like components |

### Sync Safety
- Only modify `meta` object (`argTypes`, `args`, `parameters`) and append new variant stories at the end
- NEVER modify or remove existing story exports — may contain hand-crafted templates
- Preserve any existing `parameters.design` blocks (e.g., Figma URLs)
- If a variant story export already exists (e.g., `export const Size`) and prop options changed → update `argTypes.options` in meta only; do NOT rewrite the existing story export

## Conventions

### v-bind Pattern
- With `v-model` on same element → `v-bind="args"` (no spread)
- Without `v-model` → `v-bind="{...args}"` (spread)

Reference-Based Learning should discover and follow the project's actual convention.

### Meta Pattern
Always use named variable: `const meta = { ... }; export default meta;` — not direct `export default { ... }`.

### Title
Omit `title` from meta. Storybook auto-infers from file path. Only include if sibling stories explicitly use it.

## Manual Mode

### `/storybook <ComponentName>`
1. Search project for matching `.vue` file
2. If not found → error message
3. If `.stories.{js|ts}` already exists → ask user whether to overwrite
4. Execute Core Workflow (Steps 1-6)
5. Report result

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Classifying by folder instead of nature | A `ButtonCopy` in `composite/` is still base-like |
| Generating variant stories for high-level components | Only base-like get variant stories |
| Removing existing story exports during sync | Only modify `meta` and append — never delete exports |
| Using spread `v-bind` with `v-model` | Use `v-bind="args"` when `v-model` is present |
| Skipping Reference-Based Learning | Always read 2-3 sibling stories first |
| Generating story when project has no Storybook | Check `package.json` first |
| Using args-only shorthand without render function | Always use explicit `render()` with `setup()` and `template` |
| Adding `title` to meta | Omit — Storybook auto-infers from file path |
| Using `export default { ... }` directly | Use `const meta = { ... }; export default meta;` |
