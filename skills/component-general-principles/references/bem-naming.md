# BEM Naming Convention

## Structure

```
.block__element--modifier
```

| Part | Purpose | Format |
|------|---------|--------|
| **Block** | Standalone meaningful entity | kebab-case: `search-form`, `user-card` |
| **Element** | Part of a block with no standalone meaning | Double underscore: `search-form__input`, `user-card__avatar` |
| **Modifier** | Variant or state of a block or element | Double hyphen: `search-form--disabled`, `user-card__avatar--large` |

## Rules

| Rule | Core | Red Flag |
|------|------|----------|
| **Block = component name** | Block name matches the component name in kebab-case | Component `UserCard.vue` uses class `.card` or `.user-card-component` |
| **No element nesting beyond one level** | BEM elements are flat — never `block__element__sub-element` | `.card__header__title` — use `.card__header-title` or a new block |
| **Modifier never alone** | Modifier class always accompanies the base class | `<div class="card--active">` without `card` — use `class="card card--active"` |
| **No tag selectors** | Style via class selectors, not tag names | `.card h3 { }` — use `.card__title { }` |
| **No ID selectors** | IDs are for anchors and JS hooks, not styling | `#main-card { }` — use `.main-card { }` |
| **kebab-case only** | All class names use kebab-case | `.userCard`, `.UserCard`, `.user_card` |

## Modifier Patterns

### Boolean modifier (presence = true)

```html
<div class="button button--disabled">
```

```scss
.button {
  &--disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}
```

### Key-value modifier

```html
<div class="button button--size-sm">
<div class="button button--color-primary">
```

```scss
.button {
  &--size-sm { padding: 4px 8px; }
  &--size-lg { padding: 12px 24px; }
  &--color-primary { background: var(--color-primary); }
}
```

## When to Create a New Block vs Element

```
Can this part exist independently outside the parent?
  → Yes → New block (e.g., .avatar inside .user-card)
  → No  → Element of the parent block (e.g., .user-card__name)
```

Reusable pieces (avatar, badge, tag) are their own blocks even when nested inside another component's template.

## Mapping to Component Props

Props that control visual variants should map to BEM modifiers via computed class:

```
prop: size = 'sm' | 'md' | 'lg'
  → computed class: `button--size-${props.size}`
  → SCSS: .button--size-sm { ... }

prop: disabled = true
  → computed class: { 'button--disabled': props.disabled }
  → SCSS: .button--disabled { ... }
```
