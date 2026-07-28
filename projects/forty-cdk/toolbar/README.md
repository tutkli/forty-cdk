# Toolbar

A container that groups a set of controls under roving-tabindex navigation.

The toolbar takes a single Tab stop and arrow keys move focus across its buttons, links, and toggle groups. Composes naturally with `[forToggleGroup]` — toggle items nested inside a toolbar register with the toolbar's roving tabindex automatically, so arrows move fluidly across the whole bar.

## Anatomy

```html
<div forToolbar aria-label="Formatting">
  <button forToolbarButton>Undo</button>
  <button forToolbarButton>Redo</button>
  <span forToolbarSeparator></span>
  <div forToggleGroup multiple>
    <button forToggleGroupItem value="bold">B</button>
    <button forToggleGroupItem value="italic">I</button>
  </div>
  <span forToolbarSeparator></span>
  <a forToolbarLink href="/help">Help</a>
</div>
```

## Examples

```ts
import { Component, signal } from '@angular/core';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';
import {
  ForToolbar,
  ForToolbarButton,
  ForToolbarLink,
  ForToolbarSeparator,
} from 'forty-cdk/toolbar';

@Component({
  selector: 'demo-toolbar',
  imports: [
    ForToolbar,
    ForToolbarButton,
    ForToolbarLink,
    ForToolbarSeparator,
    ForToggleGroup,
    ForToggleGroupItem,
  ],
  template: `
    <div forToolbar class="toolbar" [ariaLabel]="'Formatting'">
      <button forToolbarButton class="toolbar-button" (click)="undo()">Undo</button>
      <button forToolbarButton class="toolbar-button" (click)="redo()">Redo</button>
      <span forToolbarSeparator></span>
      <div forToggleGroup multiple [(value)]="formatting">
        <button forToggleGroupItem value="bold">B</button>
        <button forToggleGroupItem value="italic">I</button>
        <button forToggleGroupItem value="underline">U</button>
      </div>
      <span forToolbarSeparator></span>
      <a forToolbarLink class="toolbar-link" href="/help">Help</a>
    </div>
  `,
})
export class DemoToolbar {
  readonly formatting = signal<readonly string[]>([]);
  undo() {}
  redo() {}
}
```

## API

### `ForToolbar`

Root directive. `role="toolbar"`. Owns roving tabindex and arrow-key navigation.

| Property      | Type                                | Description                                                                                                                                                             |
| ------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ariaLabel`   | `input<string \| null>`             | Reactive accessible name, reflected as `aria-label`. Prefer `aria-labelledby` when a visible label element exists.<br>**Default:** `null` (and `''`) emits no attribute |
| `orientation` | `input<'horizontal' \| 'vertical'>` | Layout direction.<br>**Default:** `'horizontal'`                                                                                                                        |
| `dir`         | `input<WritingDirection>`           | Reading direction. RTL swaps ArrowLeft / ArrowRight.<br>**Default:** —                                                                                                  |
| `loop`        | `input<boolean>`                    | Whether arrow nav wraps at the ends.<br>**Default:** `true`                                                                                                             |
| `disabled`    | `input<boolean>`                    | Disables every item.<br>**Default:** —                                                                                                                                  |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |

### `ForToolbarButton`

Plain push button. Apply on `<button>` so Enter / Space activate via native semantics.

| Property   | Type             | Description                                                                                                                                                                                                                                    |
| ---------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled` | `input<boolean>` | Per-item disabled, in addition to the toolbar's `disabled`. When true the button is announced as `aria-disabled` and clicks are suppressed — it stays focusable (no native `disabled`) so assistive tech still announces it.<br>**Default:** — |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |

### `ForToolbarLink`

Hyperlink. Apply on `<a>`; `Enter` follows the link via native semantics.

| Property   | Type             | Description                                                                                                                                                                                                                                                  |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `disabled` | `input<boolean>` | Per-item disabled, in addition to the toolbar's `disabled`. When true the link is announced as `aria-disabled` and activation is suppressed — `<a>` has no native `disabled`, so it stays focusable and assistive tech still announces it.<br>**Default:** — |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |

### `ForToolbarSeparator`

Visual divider. Defaults `orientation` to the toolbar's cross-axis; reflects `role="separator"` + `aria-orientation` + `data-orientation`.

| Property      | Type                                             | Description                                                                                              |
| ------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `orientation` | `input<'horizontal' \| 'vertical' \| undefined>` | Axis the separator divides along. Falls back to the toolbar's cross-axis when omitted.<br>**Default:** — |
| `decorative`  | `input<boolean>`                                 | When true, gets `role="none"` and no `aria-orientation`.<br>**Default:** —                               |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |

## Keyboard

| Key                        | Action                                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| `ArrowRight` / `ArrowDown` | Move focus to the next enabled item (direction depends on `orientation`). |
| `ArrowLeft` / `ArrowUp`    | Move focus to the previous enabled item. RTL inverts the horizontal pair. |
| `Home`                     | Move focus to the first enabled item.                                     |
| `End`                      | Move focus to the last enabled item.                                      |

## Accessibility

Implements the [WAI-ARIA Toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/).

- **Single Tab stop that follows focus.** The toolbar takes one place in the tab order; only the entry-point item carries `tabindex="0"`. Before any interaction the entry point is the first enabled item; once you move focus with the arrows (or Home / End), the tab stop follows the last focused item, so Shift+Tab back into the toolbar restores it (matching APG and the Tabs / Tree primitives). Arrow keys move focus inside, Home / End jump to the first / last enabled item.
- **Always label the toolbar.** Pass the reactive `[ariaLabel]` input (or a native `aria-labelledby` pointing at a visible label element) so screen-reader users know what the toolbar acts on. Not optional — APG requires it.
- **Disabled items stay focusable.** Both `<button forToolbarButton>` and `<a forToolbarLink>` expose `aria-disabled="true"` and suppress click rather than setting the native `disabled` attribute. Removing an item from the focus order would deviate from APG; users can still hear "disabled".
- **Toggle groups don't change roles.** Inside a toolbar, `[forToggleGroup]` keeps `role="group"` (semantically a related set of buttons). The toolbar role lives only on the outer container.
- **Cross-axis separators.** `[forToolbarSeparator]` defaults to the orientation perpendicular to the toolbar so the line is visible. Override by setting `orientation` explicitly.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

```css
.toolbar {
  display: flex;
  gap: 0.25rem;
}

.toolbar[data-orientation='vertical'] {
  flex-direction: column;
}

.toolbar-button[data-disabled],
.toolbar-link[data-disabled] {
  opacity: 0.4;
  pointer-events: none;
}
```

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_TOOLBAR_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
