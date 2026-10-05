# Analysis Context Format Schema

## Overview

Strict contract for upstream reading/analysis skills. Any skill that produces reference content for future context reuse MUST output markdown conforming to this schema before invoking `analysis-context`.

## Frontmatter (Required)

All fields are mandatory:

```yaml
---
source: string      # Source type identifier (e.g., "jira", "confluence", "redmine")
id: string          # Unique identifier from source (e.g., "VOR-123", "422825628", "59241")
url: string         # Original source URL
title: string       # Title or subject
fetched_at: string  # Fetch date in YYYY-MM-DD format
slug: string        # (Optional) Override slug for filename. When present, used instead of title-derived slug.
---
```

## Content Sections

Fixed order. Omit sections that have no content — do NOT include empty sections.

### 1. Heading + Source Line

```markdown
# {title}

> Source: [{source}: {id}]({url}) | Fetched: {fetched_at}

---
```

### 2. Metadata (required)

Key-value table. Fields vary by source but format is consistent:

```markdown
## Metadata

| Field | Value |
|-------|-------|
| Type | Bug |
| Priority | High |
| Status | In Progress |
| Assignee | Jane |
```

### 3. Description (required)

Main content body:

```markdown
## Description

{Primary content — issue description, page body, etc.}
```

### 4. Images (optional)

Only include if images were downloaded and analyzed:

```markdown
## Images

- ![image-name](images/{source}-{id}/image-name.png)
  [Analyzed] Shows: description of what the image contains
```

### 5. Comments (optional)

Chronological order:

```markdown
## Comments

- **[author]** (YYYY-MM-DD): comment body
- **[author]** (YYYY-MM-DD): comment body
```

## Upstream Integration

Upstream skills follow this workflow:

1. Read this schema (references/format.md)
2. After presenting results to user, assemble a markdown string conforming to this schema
3. Invoke `analysis-context` skill, passing the assembled markdown

The upstream skill is responsible for producing the complete, schema-compliant markdown. `analysis-context` does NOT extract content from conversation history when invoked by upstream.
