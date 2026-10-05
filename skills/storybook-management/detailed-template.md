# Detailed Story Template

For base-like components (Button, Card, Table, Input, Select, etc.)

## Meta Structure

```js
const meta = {
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {
    // Map each prop from defineProps:
    // enum / string union → control: 'inline-radio', options: [...]
    // boolean → control: 'boolean'
    // Include JSDoc description if available
  },
  args: {
    // Default value for each prop
    // Slot defaults: default: 'Default'
  },
  parameters: {
    slots: {
      // Description for each <slot> found in template
    },
    docs: {
      description: {
        component: `
### Overview
(Describe what the component does and when to use it)
        `,
      },
    },
  },
};
```

## Required Stories

### Default (always generated)

Renders component with default args:

```js
export const Default = {
  render: (args) => ({
    components: { ComponentName },
    setup() { return { args }; },
    template: `<component-name v-bind="{...args}">{{ args.default }}</component-name>`,
  }),
};
```

### Variant Stories

Scan `defineProps` for visual/appearance props — props that change how the component **looks** (size, color, shape, variant, density, elevation, rounded) or its **interactive state** (disabled). Do NOT create variant stories for behavioral props (loading, readonly, clearable) or data props (value, items, label). Each visual prop gets a dedicated story that renders all options side by side.

| Prop Type | Export Name | Template Pattern |
|-----------|-------------|-----------------|
| `size` | `Size` | One instance per option with size label as slot content |
| `color` | `Color` | One instance per option with color name as slot content |
| `variant` | `Variant` | One instance per option with variant name as slot content |
| `shape` | `Shape` | One instance per option with shape name as slot content |
| `disabled` | `State` | Default, hover (class), active (class), disabled instances |
| icon-related (`prependIcon`, `appendIcon`, `icon`) | `Layout` | Combinations: icon-only, text-only, prepend, append, both |

Example for `size` prop with options `['sm', 'md', 'lg']`:

```js
export const Size = {
  render: (args) => ({
    components: { ComponentName },
    setup() { return { args }; },
    template: `
      <component-name v-bind="{...args}" size="sm">Small</component-name>
      <component-name v-bind="{...args}" size="md">Medium</component-name>
      <component-name v-bind="{...args}" size="lg">Large</component-name>
    `,
  }),
};
```

## Fallback Template Skeleton

Use when Reference-Based Learning finds no existing stories:

```js
import ComponentName from './ComponentName.vue';

const meta = {
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: { /* controls per prop */ },
  args: { /* default values */ },
  parameters: {
    slots: { /* slot descriptions */ },
    docs: {
      description: {
        component: `
### Overview
(Auto-generated: what the component does and when to use it)
        `,
      },
    },
  },
};

export default meta;

export const Default = {
  render: (args) => ({
    components: { ComponentName },
    setup() { return { args }; },
    template: `<component-name v-bind="{...args}">{{ args.default }}</component-name>`,
  }),
};

// One export per visual prop (Size, Color, Variant, Shape, State, Layout)
```

**Note:** Import paths, component tag casing, and helper utilities should always be adapted from Reference-Based Learning when available.
