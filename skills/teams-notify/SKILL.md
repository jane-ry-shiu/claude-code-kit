---
name: teams-notify
description: Use when user asks to send a Microsoft Teams message, notify a Teams channel/person/group, or manage Teams notification targets. Also use when another skill needs to send Teams notifications (e.g., deploy alerts, CI results).
---

# Teams Notify

Send messages to Microsoft Teams via Power Automate HTTP trigger URLs using Adaptive Cards.

## Overview

Each Teams target (channel, person, group chat) has a Power Automate flow with an HTTP trigger URL. This skill manages a registry of targets and sends Adaptive Card messages to them via curl.

## Reference Dispatch

| Trigger | Reference(s) | Description |
|---------|-------------|-------------|
| Send message to target(s) | targets.json → [send-message.md](references/send-message.md) | Resolve alias, build card, send |
| No target specified | targets.json → [send-message.md](references/send-message.md) | List targets for selection |
| Add/remove/list/update targets | [manage-targets.md](references/manage-targets.md) | Manage target registry |
| Complex card needed | [adaptive-card.md](references/adaptive-card.md) → [send-message.md](references/send-message.md) | Load format reference, then send |
| Other skill calls notification | targets.json → [send-message.md](references/send-message.md) | Passive trigger |

**Always read `references/targets.json` first** when sending messages — needed to resolve alias to URL.

Load only the reference(s) matching the current trigger.
