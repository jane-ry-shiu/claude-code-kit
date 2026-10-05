# Manage Targets

## Operations

| Command | Action |
|---------|--------|
| Add | Collect alias, URL, type, description → write to targets.json |
| Remove | Specify alias → confirm → remove |
| List | Read targets.json → display grouped by type |
| Update | Specify alias → update fields |

## Add Target

1. Collect: alias, Power Automate URL, type (`channel`/`person`/`group`), description
2. Validate URL contains `powerautomate` and `sig=`
3. Check alias uniqueness — if exists, confirm overwrite
4. Write to `references/targets.json`

## Remove Target

1. Confirm alias exists
2. Confirm deletion with user
3. Remove from `references/targets.json`

## Update Target

1. Confirm alias exists
2. Update specified fields (url, type, description)
3. Write to `references/targets.json`

## targets.json Format

`targets.json` holds signed Power Automate URLs (`sig=` is a credential), so it is git-ignored and never committed. If it does not exist yet, create it with an empty `{"targets": {}}` on the first Add.

```json
{
  "targets": {
    "<alias>": {
      "url": "<Power Automate HTTP trigger URL>",
      "type": "channel | person | group",
      "description": "<display description>"
    }
  }
}
```
