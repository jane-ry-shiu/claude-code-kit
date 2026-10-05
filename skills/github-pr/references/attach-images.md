# Attach Images

Images can go into any PR text the skill writes, including pending review comments. Uploading and posting are two separate steps. Upload the file to get a URL, then put `![alt](url)` in the body and post it through the usual route. Nothing about pending review changes.

## Upload a file → get its URL

```bash
FILE=./shot.png                      # png | jpg/jpeg | gif | webp | svg, ≤ 10 MB
REPO=VIVOTEK-IT/webtech-monorepo
RID=$(gh api repos/$REPO --jq .id)   # numeric repository id
TYPE=$(file -b --mime-type "$FILE")  # e.g. image/png
curl -sS -X POST \
  -H "Authorization: token $(gh auth token)" \
  -H "Content-Type: $TYPE" \
  --data-binary @"$FILE" \
  "https://uploads.github.com/user-attachments/assets?name=$(basename "$FILE")&content_type=$TYPE&repository_id=$RID"
# → 201 {"url":"https://github.com/user-attachments/assets/<id>"}
```

This is the endpoint `gh --attach` calls internally. It stores the file where the web editor's drag-and-drop puts it. Only people who can read the repo can see it, so it works for the private monorepo. Release assets and raw file URLs do not work there.

Then use the URL in the comment body, the same way for pending line comments and every other body:

```
mcp__github__add_comment_to_pending_review
  body: "展開箭頭在 hover 時位移了 2px：\n\n![hover 時的展開箭頭](https://github.com/user-attachments/assets/<id>)"
  path, line, side, subjectType: as usual
```

## Facts to rely on

| Fact | Consequence |
|---|---|
| An upload cannot be undone. The asset outlives any comment that references it. | If the flow shows the user a preview, upload after the user approves it. The preview shows the local file path where the image will go. |
| `404` from the upload means the token lacks write access to the repo. | Tell the user. Don't post the comment without the image and stay silent about it. |
| The endpoint is undocumented, but gh ≥ 2.99 depends on it. It does not exist on GitHub Enterprise Server. | If it stops working, `gh pr edit --attach` / `gh pr create --attach` still cover descriptions. Review comments then have no image route. |
| Alt text is read by screen readers and shown when the image fails. | Write it in zh-TW, describing what the image shows. |
