# Send Message

## Flow

1. Read `references/targets.json` — resolve alias(es) to URL(s)
2. If no target specified — list all targets, ask user to choose
3. Build Adaptive Card payload (load `adaptive-card.md` if complex card needed)
4. Send to each target URL
5. Report results

## Building the Payload

| Input | Action |
|-------|--------|
| Plain text | Wrap in simple TextBlock Adaptive Card |
| Text with markdown (bold/lists/links) | TextBlock with `"wrap": true` |
| Structured data or explicit card request | Load adaptive-card.md, build full card |

**CRITICAL:** Always use Adaptive Card format. Never send plain JSON like `{"message": "..."}`.

## Sending

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST "<url>" \
  -H "Content-Type: application/json" \
  -d '<adaptive card json>'
```

## Result Interpretation

- **HTTP 202**: Request accepted — flow triggered successfully
- **HTTP 400**: Payload format error — check Adaptive Card structure
- **Other**: Show response body for debugging

## Multi-target

When sending to multiple targets, send same payload to each URL sequentially. Report per-target:

```
✅ web-frontend — HTTP 202
✅ jane — HTTP 202
❌ backend-team — HTTP 400: <error details>
```

## No Target Specified

List targets grouped by type:

```
可用的 Teams 目標：

頻道:
  web-frontend  — Web Frontend 團隊頻道

個人:
  jane          — Jane 的私人聊天

群組:
  backend-team  — Backend Team 群組聊天

請選擇要發送的目標（可多選）：
```
