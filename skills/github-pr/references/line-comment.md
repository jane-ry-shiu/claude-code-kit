# Line-Level Comment Rules

## Rule: One Issue Per Comment

Each distinct issue, suggestion, or question = one separate `add_comment_to_pending_review` call.

### Correct

Three separate tool calls:
```
Call 1: path="src/utils.ts", line=42
  body: "建議將此變數重新命名為 `userProfile`，語意更明確"

Call 2: path="src/utils.ts", line=85, startLine=78
  body: "此處缺少錯誤處理，當 API 回傳 404 時會導致未處理的例外"

Call 3: path="src/components/List.vue", line=120
  body: "此迴圈複雜度 O(n²)，建議改用 Map 做 lookup"
```

### Incorrect

One comment bundling multiple issues:
```
body: "1. 第 42 行變數命名不佳\n2. 第 78 行缺少錯誤處理\n3. 第 120 行效能問題"
```

**Why not batch?** Batching makes it impossible for PR authors to respond to or resolve individual issues. One issue per comment enables granular discussion threads.

## Rule: Line Annotation via Tool Parameters

ALWAYS use `line`/`startLine` params. NEVER write file paths or line numbers in comment body.

### Correct (tool params handle location)

```
mcp__github__add_comment_to_pending_review:
  path: "src/components/UserList.vue"
  line: 50
  startLine: 42        # Multi-line range
  side: "RIGHT"        # RIGHT = new code
  startSide: "RIGHT"   # For multi-line
  subjectType: "LINE"
  body: "這段邏輯在邊界條件下會產生非預期結果..."
```

### Incorrect (location written in body text)

```
body: "在 src/components/UserList.vue 的第 42~50 行，這段邏輯有問題..."
body: "src/utils.ts:42 - 建議重新命名..."
```

GitHub already shows the code context next to the comment. Writing location in body is redundant.

## Rule: Line Number Must Be Within Diff Hunk

The `line` parameter refers to the line number in the **new file** (RIGHT side) as determined by the diff hunk, NOT from reading the full file separately.

### Procedure: Calculating Exact Line Numbers from Diff

Each diff hunk starts with a header: `@@ -old_start,old_count +new_start,new_count @@`

The `new_start` is the line number of the first line in the hunk in the new file. From there, count lines sequentially using these rules:

| Line prefix | Meaning | Increments new-file line counter? |
|-------------|---------|-----------------------------------|
| ` ` (space) | Context (unchanged) | Yes |
| `+`         | Added line          | Yes |
| `-`         | Deleted line        | No (only exists in old file) |

**Algorithm:**
1. Parse hunk header → `new_line_counter = new_start`
2. For each line in the hunk body:
   - If prefix is ` ` (space) or `+` → this line's number is `new_line_counter`, then `new_line_counter += 1`
   - If prefix is `-` → skip (does not occupy a line in the new file)
3. The `line` param for a comment = the `new_line_counter` value assigned to the target line

**Example:**
```
@@ -309,6 +339,19 @@ const handleBundleAdjustTime = ...
 };                          ← L339 (space = context)
                             ← L340 (space = blank context line)
+/**                         ← L341 (+ = added)
+ * Handles the process...   ← L342
+ */                         ← L343
+const handleFn = async () => { ← L344
+  console.log('test');      ← L345
+};                          ← L346
```

To comment on `console.log('test')`, use `line: 345`.

**Critical:** Do NOT estimate line numbers by eye. Always count from the hunk header. Off-by-one errors compound across multiple context and deleted lines within a hunk.

4. If the target code is NOT within any diff hunk, attach the comment to the nearest changed line within the same hunk and mention the actual target in the comment body
5. For multi-line (`startLine` to `line`), both must fall within the same diff hunk

## Rule: Verify Line-Content Alignment

Before posting each comment, verify that the `line`/`startLine` you chose actually contains the code your comment describes.

### Procedure
1. After determining the `line` parameter, re-read that line (or range) from the diff
2. Confirm the code at that location matches the subject of your comment body (e.g., a comment about `hideElement` prop must point to lines where `hideElement` is defined, not unrelated code)
3. If mismatched, correct the line number before posting

### Common Failure Mode

When reviewing a file with many findings, line numbers from one finding bleed into the next. For example, after analyzing code at line 260, the next comment about code at line 185 accidentally reuses 260. **Each comment must independently locate its target code in the diff.**

## Parameter Reference

```
mcp__github__add_comment_to_pending_review:
  owner: string          # Repo owner
  repo: string           # Repo name
  pullNumber: number     # PR number
  path: string           # File path (relative to repo root)
  body: string           # Comment content (zh-TW)
  subjectType: "LINE"    # Always "LINE" for code comments
  line: number           # End line (or single line)
  startLine: number      # Start line for multi-line (optional)
  side: "RIGHT"          # RIGHT = new code, LEFT = old code
  startSide: "RIGHT"     # For multi-line start side (optional)
```

## GraphQL Fallback

`{review_node_id}` is the pending review's `PRR_...` id (see [pending-review.md](pending-review.md)). REST cannot add a comment to a pending review.

```bash
gh api graphql \
  -f query='mutation($rv:ID!,$path:String!,$line:Int!,$start:Int,$body:String!){addPullRequestReviewThread(input:{pullRequestReviewId:$rv,path:$path,line:$line,startLine:$start,side:RIGHT,startSide:RIGHT,body:$body}){thread{id}}}' \
  -f rv="{review_node_id}" \
  -f path="src/utils.ts" \
  -F line=50 \
  -F start=42 \
  -f body="這段邏輯在邊界條件下會產生非預期結果..."
```

Single line: drop `-F start=42`.

One API call per issue. Do NOT batch.

## Language

- Default zh-TW (Traditional Chinese)
- Technical terms keep English: `useMemo`, `re-render`, `O(n²)`, `Map`
- Code blocks in body remain as-is
- Example: `"建議改用 useMemo 避免不必要的 re-render"`
