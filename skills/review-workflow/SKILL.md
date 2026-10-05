---
name: review-workflow
description: Use when user asks to review a branch's commits, review current branch, provides a commit range for code review, or provides a GitHub PR URL for review — dispatches to local branch review or PR review workflow
---

# Review Workflow

## Overview

Unified entry point for all code review workflows. Dispatches to focused reference files based on trigger type.

**Core principle:** Route to the correct workflow, load only that reference.

## Reference Dispatch

| Trigger | Reference | Description |
|---------|-----------|-------------|
| Review branch / review current branch / commit range | [local-branch.md](references/local-branch.md) | Local branch review with fix cycle |
| GitHub PR URL + review command | [pr-review.md](references/pr-review.md) | PR review → pending comments |

Load only the reference matching the current trigger. Do not load multiple references simultaneously.

## Shared References

| Reference | Purpose | Load When |
|-----------|---------|-----------|
| [post-review-validation.md](references/post-review-validation.md) | Validate pending review comments | PR review workflow, after creating comments |

## Trigger Detection

| User Input | Detected As |
|------------|-------------|
| GitHub PR URL (github.com/.../pull/N) | PR review |
| "review PR #N" / "code review PR" | PR review |
| Branch name without PR context | Local branch |
| "review current branch" / "review branch X" | Local branch |
| Commit range (contains `..`) | Local branch |
| "continue Phase N" | Local branch (continuation) |
