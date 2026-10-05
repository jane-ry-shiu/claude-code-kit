# Save Analysis Context

## Overview

Receives schema-compliant markdown (see references/format.md) and writes it to `docs/context/` with proper naming, directory creation, and image handling.

## File Naming

Derive filename from frontmatter `source` and `id`:

| source | pattern | example |
|--------|---------|---------|
| jira | `jira-{id}.md` | `jira-VOR-27265.md` |
| confluence | `confluence-{id}-{slug}.md` | `confluence-422825628-si-portal.md` |
| redmine | `redmine-issue-{id}.md` | `redmine-issue-59241.md` |
| (fallback) | `{source}-{id}.md` | `github-issue-42.md` |

Slug resolution order:
1. Frontmatter `slug` field (if present) → use as-is
2. Fallback: frontmatter `title` → lowercase, special chars to hyphens, collapse consecutive hyphens, trim leading/trailing hyphens, max 50 chars

## Paths

- Markdown: `docs/context/{filename}`
- Images: `docs/context/images/{source}-{id}/`

## Flow

```
1. Parse frontmatter from input markdown (source, id, title)
2. Generate filename using naming rules above
3. mkdir -p docs/context/
4. Check if file exists → ALWAYS ask before overwriting (even during auto-save from upstream)
5. If images section present in markdown:
   a. mkdir -p docs/context/images/{source}-{id}/
   b. Copy images from temp dir to target (if temp files available)
   c. Update image paths in markdown to relative local paths
6. Write markdown file
7. Confirm: "已儲存至 `docs/context/{filename}`，後續對話可透過讀取此檔案取得上下文。"
```

### Step 4: Overwrite Confirmation (MANDATORY)

This check is **unconditional** — it applies regardless of how the save was triggered (manual or auto-save from upstream). When the file exists, present:

> `docs/context/{filename}` 已存在。要覆蓋還是使用其他檔名？

## Image Handling

When the input markdown references images:

1. Identify temp source directory from conversation context (e.g., `/tmp/jira-attachments/VOR-123/`)
2. Copy to `docs/context/images/{source}-{id}/`
3. If temp files unavailable: keep text analysis, skip copy, note in output

## Edge Cases

| Situation | Handling |
|-----------|----------|
| `docs/context/` missing | Auto-create with `mkdir -p` |
| File already exists | Ask: overwrite or use different name |
| No identifiable source in frontmatter | Ask user for filename |
| Temp image files deleted | Skip image copy, keep text analysis |
| No images in content | Skip image directory creation |
