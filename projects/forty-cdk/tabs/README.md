# Tabs

A tablist that switches between panels of content.

Headless, with a selectable activation mode (automatic vs manual), configurable orientation, and roving tabindex.

## Anatomy

```html
<div forTabs [(value)]="active">
  <div forTabsList aria-label="Settings sections">
    <button type="button" forTabsTrigger value="profile">Profile</button>
    <button type="button" forTabsTrigger value="security">Security</button>
  </div>
  <div forTabsContent value="profile">…profile…</div>
  <div forTabsContent value="security">…security…</div>
</div>
```

## Examples

```ts
import { Component, signal } from '@angular/core';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';

@Component({
  selector: 'demo-settings',
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <div forTabs [(value)]="active">
      <div forTabsList aria-label="Settings sections">
        <button type="button" forTabsTrigger class="tabs-trigger" value="profile">Profile</button>
        <button type="button" forTabsTrigger class="tabs-trigger" value="security">Security</button>
        <button type="button" forTabsTrigger class="tabs-trigger" value="billing">Billing</button>
      </div>
      <div forTabsContent class="tabs-content" value="profile">…profile…</div>
      <div forTabsContent class="tabs-content" value="security">…security…</div>
      <div forTabsContent class="tabs-content" value="billing">…billing…</div>
    </div>
  `,
})
export class DemoSettings {
  readonly active = signal('profile');
}
```

## Manual activation

```html
<div forTabs activationMode="manual" [(value)]="active">
  <!-- Arrow keys move focus only. Space / Enter activates. -->
</div>
```

## API

### `ForTabs`

| Property         | Type                                | Description                                                                                                                                                              |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `value`          | `model<string \| null>`             | Two-way bindable. The selected tab's value, or `null` when nothing is selected. `null` is the unset state — distinct from a tab whose `value` is `''`.<br>**Default:** — |
| `activationMode` | `input<'automatic' \| 'manual'>`    | Use `'manual'` when panel content is expensive — user must press Space / Enter.<br>**Default:** `'automatic'` (selection follows arrow focus)                            |
| `orientation`    | `input<'horizontal' \| 'vertical'>` | Drives keyboard navigation and `aria-orientation`.<br>**Default:** `'horizontal'`                                                                                        |
| `dir`            | `input<'ltr' \| 'rtl'>`             | Swaps ArrowLeft / ArrowRight.<br>**Default:** `'ltr'`                                                                                                                    |
| `disabled`       | `input<boolean>`                    | When true, blocks all selection and keyboard nav.<br>**Default:** —                                                                                                      |
| `loop`           | `input<boolean>`                    | When true (default), arrow nav wraps around past the first / last enabled trigger. Set to `false` for a non-wrapping tablist.<br>**Default:** `true`                     |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |

### `ForTabsList`

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |

### `ForTabsTrigger`

| Property   | Type                     | Description                                                                             |
| ---------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `value`    | `input.required<string>` | The tab's identifier. Must match the `value` of its `ForTabsContent`.<br>**Default:** — |
| `disabled` | `input<boolean>`         | Disables this trigger; arrow nav skips it.<br>**Default:** —                            |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-state`       | `active` \| `inactive`     |
| `data-disabled`    | present \| absent          |
| `data-orientation` | `horizontal` \| `vertical` |

Reflects on its host: `id`, `aria-selected`, `aria-controls` (looked up from the matching content), `aria-disabled`, `tabindex`. A disabled trigger keeps `aria-disabled="true"` + `data-disabled=""` (no native `disabled`, per APG) — announced but non-activatable, with arrow nav skipping it.

### `ForTabsContent`

| Property             | Type                     | Description                                                                                                                                                                                                                          |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `value`              | `input.required<string>` | Pairs the panel with the trigger of the same value.<br>**Default:** —                                                                                                                                                                |
| `interactiveContent` | `input<boolean \| null>` | Overrides the automatic focusable-content detection that drives `tabindex`. `true` forces no tab stop (the panel always holds its own focusable content); `false` forces a tab stop regardless.<br>**Default:** `null` (auto-detect) |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-state`       | `active` \| `inactive`     |
| `data-orientation` | `horizontal` \| `vertical` |

Reflects: `id`, `role="tabpanel"`, `aria-labelledby` (the matching trigger's id), `tabindex="0"` **only when the panel has no focusable descendants** (APG), `aria-hidden` (when inactive), `inert` (when inactive).

The directive does **not** apply `[hidden]`. Two patterns work:

- **Leave all panels mounted** (idiomatic) — preserves scroll/input state across activations. While inactive, the directive sets `aria-hidden="true"` and `inert` so each non-selected panel is out of the accessibility tree and focus order. Hide the inactive ones visually with CSS keyed on `[data-state="inactive"]` (e.g. `display: none`).
- **Mount/unmount with `@if (active() === 'tab')`** — the panel is absent while inactive; useful for heavy panels or when you want `animate.enter` / `animate.leave`.

## Keyboard

- **Tab** moves focus into / out of the tablist; lands on the user-focused trigger (or the selected one, if none focused yet).
- **ArrowRight / ArrowLeft** in horizontal, **ArrowDown / ArrowUp** in vertical: move focus between triggers, wrap-around. RTL swaps Left/Right.
- **Home / End** jump to first / last enabled trigger.
- **Space / Enter** activate the focused trigger (no-op in automatic mode since arrow nav already activated it).
- Disabled triggers are skipped.

## Accessibility

Implements the [WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

- **Label the tablist** via `aria-label` on `ForTabsList`, or `aria-labelledby` pointing to a heading.
- **Choose `activationMode='automatic'`** when panels render quickly; `'manual'` when activation has noticeable cost (network, heavy computation).
- **Panel `tabindex`** follows APG: a panel with **no** focusable descendants is itself a tab stop (`tabindex="0"`) so screen-reader users can focus and read it, while a panel that already contains focusable content (a form, links, buttons) is **not** a tab stop — the directive detects this automatically and reacts to subtree changes. Use `[interactiveContent]` to override the detection in either direction.
- **`aria-controls` and `aria-labelledby`** are wired automatically when triggers and contents share the same `value`. `aria-controls` is emitted only on the selected trigger — mirroring the overlay triggers' open-only gating — so the reference never dangles at an unmounted panel under the `@if (selected())` mount pattern.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed per piece in the [API](#api) section.

```css
.tabs-trigger[data-state='active'] {
  border-bottom: 2px solid currentColor;
}

.tabs-trigger[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.tabs-content[data-state='inactive'] {
  display: none;
}
```

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_TABS_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
