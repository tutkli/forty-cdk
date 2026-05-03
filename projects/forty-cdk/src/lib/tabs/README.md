# Tabs

Headless implementation of the [WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) with selectable activation mode (automatic vs manual) and roving tabindex.

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForTabs` | `[forTabs]` | Root. Owns `value` (selected tab), activation mode, orientation. Provides the shared context. |
| `ForTabsList` | `[forTabsList]` | `role="tablist"` container that wraps the tab buttons. |
| `ForTabsTrigger` | `[forTabsTrigger]` | One tab button. Apply on a `<button type="button">`. |
| `ForTabsContent` | `[forTabsContent]` | Panel revealed by the tab with the matching `value`. |

## Inputs / models

### `ForTabs`

| API | Type | Description |
| --- | --- | --- |
| `value` | `model<string>` | Two-way bindable. The selected tab's value. |
| `activationMode` | `input<'automatic' \| 'manual'>` | Default `'automatic'` (selection follows arrow focus). Use `'manual'` when panel content is expensive — user must press Space / Enter. |
| `orientation` | `input<'horizontal' \| 'vertical'>` | Default `'horizontal'`. Drives keyboard navigation and `aria-orientation`. |
| `dir` | `input<'ltr' \| 'rtl'>` | Default `'ltr'`. Swaps ArrowLeft / ArrowRight. |
| `disabled` | `input<boolean>` | When true, blocks all selection and keyboard nav. |
| `loop` | `input<boolean>` | When true (default), arrow nav wraps around past the first / last enabled trigger. Set to `false` for a non-wrapping tablist. |

### `ForTabsTrigger`

| API | Type | Description |
| --- | --- | --- |
| `value` | `input.required<string>` | The tab's identifier. Must match the `value` of its `ForTabsContent`. |
| `disabled` | `input<boolean>` | Disables this trigger; arrow nav skips it. |

Reflects on its host: `id`, `aria-selected`, `aria-controls` (looked up from the matching content), `aria-disabled`, `disabled`, `tabindex`, `data-state="active" \| "inactive"`.

### `ForTabsContent`

| API | Type | Description |
| --- | --- | --- |
| `value` | `input.required<string>` | Pairs the panel with the trigger of the same value. |

Reflects: `id`, `role="tabpanel"`, `aria-labelledby` (the matching trigger's id), `tabindex="0"`, `hidden` (when not selected), `data-state`.

## Example

```ts
import { Component, signal } from '@angular/core';
import {
  ForTabs,
  ForTabsList,
  ForTabsTrigger,
  ForTabsContent,
} from 'forty-cdk';

@Component({
  selector: 'demo-settings',
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <div forTabs [(value)]="active">
      <div forTabsList aria-label="Settings sections">
        <button type="button" forTabsTrigger value="profile">Profile</button>
        <button type="button" forTabsTrigger value="security">Security</button>
        <button type="button" forTabsTrigger value="billing">Billing</button>
      </div>
      <div forTabsContent value="profile">…profile…</div>
      <div forTabsContent value="security">…security…</div>
      <div forTabsContent value="billing">…billing…</div>
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

## Keyboard

- **Tab** moves focus into / out of the tablist; lands on the user-focused trigger (or the selected one, if none focused yet).
- **ArrowRight / ArrowLeft** in horizontal, **ArrowDown / ArrowUp** in vertical: move focus between triggers, wrap-around. RTL swaps Left/Right.
- **Home / End** jump to first / last enabled trigger.
- **Space / Enter** activate the focused trigger (no-op in automatic mode since arrow nav already activated it).
- Disabled triggers are skipped.

## Accessibility notes

- **Label the tablist** via `aria-label` on `ForTabsList`, or `aria-labelledby` pointing to a heading.
- **Choose `activationMode='automatic'`** when panels render quickly; `'manual'` when activation has noticeable cost (network, heavy computation).
- **Panel `tabindex="0"`** is set unconditionally so screen-reader users can focus the panel itself when it lacks focusable children. If your panel always contains focusable content, the extra tab stop is redundant — a future input may opt out.
- **`aria-controls` and `aria-labelledby`** are wired automatically when triggers and contents share the same `value`.
