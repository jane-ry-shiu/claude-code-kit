# Adaptive Card Reference

## CRITICAL: Power Automate Teams flows require Adaptive Card format

Do NOT send plain JSON like `{"message": "..."}`. The flow will return HTTP 202 but **fail internally**.

## Required Structure

Every message MUST be a valid Adaptive Card:

```json
{
  "type": "AdaptiveCard",
  "body": [ ... ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4"
}
```

All four fields (`type`, `body`, `$schema`, `version`) are required.

## Common Elements

### TextBlock

```json
{"type": "TextBlock", "text": "Hello", "wrap": true}
```

Properties: `text`, `wrap` (bool), `weight` ("Bolder"), `size` ("Small"/"Medium"/"Large"/"ExtraLarge"), `color` ("Default"/"Accent"/"Good"/"Warning"/"Attention")

TextBlock supports markdown: `**bold**`, `_italic_`, `[link](url)`, `- list items`

### FactSet (key-value pairs)

```json
{
  "type": "FactSet",
  "facts": [
    {"title": "Project", "value": "web-frontend"},
    {"title": "Status", "value": "✅ Success"}
  ]
}
```

### Image

```json
{"type": "Image", "url": "https://...", "size": "Medium"}
```

### ColumnSet / Column

```json
{
  "type": "ColumnSet",
  "columns": [
    {"type": "Column", "width": "auto", "items": [...]},
    {"type": "Column", "width": "stretch", "items": [...]}
  ]
}
```

### ActionSet (buttons)

```json
{
  "type": "ActionSet",
  "actions": [
    {"type": "Action.OpenUrl", "title": "View PR", "url": "https://..."}
  ]
}
```

## Templates

### Simple Text

```json
{
  "type": "AdaptiveCard",
  "body": [
    {"type": "TextBlock", "text": "{{message}}", "wrap": true}
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4"
}
```

### Title + Content

```json
{
  "type": "AdaptiveCard",
  "body": [
    {"type": "TextBlock", "text": "{{title}}", "weight": "Bolder", "size": "Medium"},
    {"type": "TextBlock", "text": "{{content}}", "wrap": true}
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4"
}
```

### Deploy Notification

```json
{
  "type": "AdaptiveCard",
  "body": [
    {"type": "TextBlock", "text": "🚀 Deploy Notification", "weight": "Bolder", "size": "Medium"},
    {
      "type": "FactSet",
      "facts": [
        {"title": "Project", "value": "{{project}}"},
        {"title": "Version", "value": "{{version}}"},
        {"title": "Environment", "value": "{{env}}"},
        {"title": "Status", "value": "{{status}}"}
      ]
    }
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4"
}
```

### Card with Button

```json
{
  "type": "AdaptiveCard",
  "body": [
    {"type": "TextBlock", "text": "{{title}}", "weight": "Bolder", "size": "Medium"},
    {"type": "TextBlock", "text": "{{content}}", "wrap": true}
  ],
  "actions": [
    {"type": "Action.OpenUrl", "title": "{{buttonText}}", "url": "{{buttonUrl}}"}
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4"
}
```
