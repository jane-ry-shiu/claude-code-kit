# Simple Story Template

For high-level components (business forms, feature composites, page-specific, layout components).

## Meta Structure

```js
const meta = {
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {},       // Empty or minimal
  args: { /* default values */ },
  parameters: {},     // Empty or minimal
};
```

- No variant stories
- Omit `docs.description` by default; if Reference-Based Learning discovers sibling stories include descriptions, follow that convention

## Form Detection

| Condition | Form |
|-----------|------|
| Component name starts with `Dialog` | Dialog form |
| Component has `defineModel` | v-model form |
| Otherwise | Basic form |

## Basic Form (no v-model)

```js
import ComponentName from './ComponentName.vue';

const meta = {
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {},
  args: { /* default values */ },
  parameters: {},
};

export default meta;

export const Default = {
  render: (args) => ({
    components: { ComponentName },
    setup() { return { args }; },
    template: `<component-name v-bind="{...args}"></component-name>`,
  }),
};
```

## v-model Form

Same as Basic but add `import { ref } from 'vue'` and bind with ref:

```js
import { ref } from 'vue';
import ComponentName from './ComponentName.vue';

// ... meta same as Basic ...

export const Default = {
  render: (args) => ({
    components: { ComponentName },
    setup() {
      const modelValue = ref(args.modelValue ?? '');
      return { args, modelValue };
    },
    template: `<component-name v-model="modelValue" v-bind="args"></component-name>`,
  }),
};
```

**Note:** Use `v-bind="args"` (no spread) when `v-model` is on the same element.

## Dialog Form (v-model + trigger button)

```js
import { ref } from 'vue';
import ComponentName from './ComponentName.vue';

// ... meta same as Basic ...

export const Default = {
  render: (args) => ({
    components: { ComponentName },
    setup() {
      const modelValue = ref(false);
      return { args, modelValue };
    },
    template: `
      <div>
        <button @click="modelValue = true">Open Dialog</button>
        <component-name v-model="modelValue" v-bind="args" />
      </div>
    `,
  }),
};
```

**Note:** The trigger button element is intentionally generic (`<button>`). Reference-Based Learning will discover the project's preferred trigger component (e.g., a custom `BaseButton`) and adapt accordingly.

**Note:** Use `v-bind="args"` (no spread) when `v-model` is on the same element.
