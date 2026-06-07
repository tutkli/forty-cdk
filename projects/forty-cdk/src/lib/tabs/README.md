# Tabs

Headless implementation of the [WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) with selectable activation mode (automatic vs manual) and roving tabindex.

## Pieces

| Class            | Selector           | Role                                                                                          |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| `ForTabs`        | `[forTabs]`        | Root. Owns `value` (selected tab), activation mode, orientation. Provides the shared context. |
| `ForTabsList`    | `[forTabsList]`    | `role="tablist"` container that wraps the tab buttons.                                        |
| `ForTabsTrigger` | `[forTabsTrigger]` | One tab button. Apply on a `<button type="button">`.                                          |
| `ForTabsContent` | `[forTabsContent]` | Panel revealed by the tab with the matching `value`.                                          |

## Inputs / models

### `ForTabs`

| API              | Type                                | Description                                                                                                                                            |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `value`          | `model<string \| null>`             | Two-way bindable. The selected tab's value, or `null` when nothing is selected. `null` is the unset state — distinct from a tab whose `value` is `''`. |
| `activationMode` | `input<'automatic' \| 'manual'>`    | Default `'automatic'` (selection follows arrow focus). Use `'manual'` when panel content is expensive — user must press Space / Enter.                 |
| `orientation`    | `input<'horizontal' \| 'vertical'>` | Default `'horizontal'`. Drives keyboard navigation and `aria-orientation`.                                                                             |
| `dir`            | `input<'ltr' \| 'rtl'>`             | Default `'ltr'`. Swaps ArrowLeft / ArrowRight.                                                                                                         |
| `disabled`       | `input<boolean>`                    | When true, blocks all selection and keyboard nav.                                                                                                      |
| `loop`           | `input<boolean>`                    | When true (default), arrow nav wraps around past the first / last enabled trigger. Set to `false` for a non-wrapping tablist.                          |

### `ForTabsTrigger`

| API        | Type                     | Description                                                           |
| ---------- | ------------------------ | --------------------------------------------------------------------- |
| `value`    | `input.required<string>` | The tab's identifier. Must match the `value` of its `ForTabsContent`. |
| `disabled` | `input<boolean>`         | Disables this trigger; arrow nav skips it.                            |

Reflects on its host: `id`, `aria-selected`, `aria-controls` (looked up from the matching content), `aria-disabled`, `tabindex`, `data-state="active" \| "inactive"`, `data-disabled`. A disabled trigger keeps `aria-disabled="true"` + `data-disabled=""` (no native `disabled`, per APG) — announced but non-activatable, with arrow nav skipping it.

### `ForTabsContent`

| API                  | Type                     | Description                                                                                                                                                                                                                   |
| -------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`              | `input.required<string>` | Pairs the panel with the trigger of the same value.                                                                                                                                                                           |
| `interactiveContent` | `input<boolean \| null>` | Overrides the automatic focusable-content detection that drives `tabindex`. Default `null` (auto-detect). `true` forces no tab stop (the panel always holds its own focusable content); `false` forces a tab stop regardless. |

Reflects: `id`, `role="tabpanel"`, `aria-labelledby` (the matching trigger's id), `tabindex="0"` **only when the panel has no focusable descendants** (APG), `aria-hidden` (when inactive), `inert` (when inactive), `data-state="active" \| "inactive"`.

The directive does **not** apply `[hidden]`. Two patterns work:

- **Leave all panels mounted** (idiomatic) — preserves scroll/input state across activations. While inactive, the directive sets `aria-hidden="true"` and `inert` so each non-selected panel is out of the accessibility tree and focus order. Hide the inactive ones visually with CSS keyed on `[data-state="inactive"]` (e.g. `display: none`).
- **Mount/unmount with `@if (active() === 'tab')`** — the panel is absent while inactive; useful for heavy panels or when you want `animate.enter` / `animate.leave`.

## Example

```ts
import { Component, signal } from '@angular/core';
import { ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent } from 'forty-cdk';

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

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes below.

### Data attributes

| Piece              | Attribute          | Values                     |
| ------------------ | ------------------ | -------------------------- |
| `[forTabs]`        | `data-orientation` | `horizontal` \| `vertical` |
| `[forTabs]`        | `data-disabled`    | present \| absent          |
| `[forTabsList]`    | `data-orientation` | `horizontal` \| `vertical` |
| `[forTabsTrigger]` | `data-state`       | `active` \| `inactive`     |
| `[forTabsTrigger]` | `data-disabled`    | present \| absent          |
| `[forTabsTrigger]` | `data-orientation` | `horizontal` \| `vertical` |
| `[forTabsContent]` | `data-state`       | `active` \| `inactive`     |
| `[forTabsContent]` | `data-orientation` | `horizontal` \| `vertical` |

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

## Keyboard

- **Tab** moves focus into / out of the tablist; lands on the user-focused trigger (or the selected one, if none focused yet).
- **ArrowRight / ArrowLeft** in horizontal, **ArrowDown / ArrowUp** in vertical: move focus between triggers, wrap-around. RTL swaps Left/Right.
- **Home / End** jump to first / last enabled trigger.
- **Space / Enter** activate the focused trigger (no-op in automatic mode since arrow nav already activated it).
- Disabled triggers are skipped.

## Accessibility notes

- **Label the tablist** via `aria-label` on `ForTabsList`, or `aria-labelledby` pointing to a heading.
- **Choose `activationMode='automatic'`** when panels render quickly; `'manual'` when activation has noticeable cost (network, heavy computation).
- **Panel `tabindex`** follows APG: a panel with **no** focusable descendants is itself a tab stop (`tabindex="0"`) so screen-reader users can focus and read it, while a panel that already contains focusable content (a form, links, buttons) is **not** a tab stop — the directive detects this automatically and reacts to subtree changes. Use `[interactiveContent]` to override the detection in either direction.
- **`aria-controls` and `aria-labelledby`** are wired automatically when triggers and contents share the same `value`. `aria-controls` is emitted only on the selected trigger — mirroring the overlay triggers' open-only gating — so the reference never dangles at an unmounted panel under the `@if (selected())` mount pattern.
