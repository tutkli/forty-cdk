# Toolbar

Headless implementation of the [WAI-ARIA Toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/). A toolbar is a single Tab stop that contains a set of buttons, links, and toggle groups; arrow keys move focus inside.

Composes naturally with `[forToggleGroup]` — toggle items nested inside a toolbar register with the toolbar's roving tabindex automatically, so arrows move fluidly across the whole bar.

## Pieces

| Class                 | Selector                | Role                                                                                                                                       |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ForToolbar`          | `[forToolbar]`          | Root. `role="toolbar"`. Owns roving + nav.                                                                                                 |
| `ForToolbarButton`    | `[forToolbarButton]`    | Plain push button. Apply on `<button>`.                                                                                                    |
| `ForToolbarLink`      | `[forToolbarLink]`      | Hyperlink. Apply on `<a>`.                                                                                                                 |
| `ForToolbarSeparator` | `[forToolbarSeparator]` | Visual divider. Defaults `orientation` to the toolbar's cross-axis; reflects `role="separator"` + `aria-orientation` + `data-orientation`. |

## Inputs (root)

| API           | Type                                | Description                                                                                                                                                      |
| ------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ariaLabel`   | `input<string \| null>`             | Reactive accessible name, reflected as `aria-label`. Default `null` (and `''`) emits no attribute. Prefer `aria-labelledby` when a visible label element exists. |
| `orientation` | `input<'horizontal' \| 'vertical'>` | Layout direction. Default `'horizontal'`.                                                                                                                        |
| `dir`         | `input<WritingDirection>`           | Reading direction. RTL swaps ArrowLeft / ArrowRight.                                                                                                             |
| `loop`        | `input<boolean>`                    | Whether arrow nav wraps at the ends. Default `true`.                                                                                                             |
| `disabled`    | `input<boolean>`                    | Disables every item.                                                                                                                                             |

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  ForToolbar,
  ForToolbarButton,
  ForToolbarLink,
  ForToolbarSeparator,
  ForToggleGroup,
  ForToggleGroupItem,
} from 'forty-cdk';

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

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

### Data attributes

| Piece                   | Attribute          | Values                     |
| ----------------------- | ------------------ | -------------------------- |
| `[forToolbar]`          | `data-orientation` | `horizontal` \| `vertical` |
| `[forToolbar]`          | `data-disabled`    | present \| absent          |
| `[forToolbarButton]`    | `data-orientation` | `horizontal` \| `vertical` |
| `[forToolbarButton]`    | `data-disabled`    | present \| absent          |
| `[forToolbarLink]`      | `data-orientation` | `horizontal` \| `vertical` |
| `[forToolbarLink]`      | `data-disabled`    | present \| absent          |
| `[forToolbarSeparator]` | `data-orientation` | `horizontal` \| `vertical` |

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

## Accessibility notes

- **Single Tab stop that follows focus.** The toolbar takes one place in the tab order; only the entry-point item carries `tabindex="0"`. Before any interaction the entry point is the first enabled item; once you move focus with the arrows (or Home / End), the tab stop follows the last focused item, so Shift+Tab back into the toolbar restores it (matching APG and the Tabs / Tree primitives). Arrow keys move focus inside, Home / End jump to the first / last enabled item.
- **Always label the toolbar.** Pass the reactive `[ariaLabel]` input (or a native `aria-labelledby` pointing at a visible label element) so screen-reader users know what the toolbar acts on. Not optional — APG requires it.
- **Disabled items stay focusable on `<a forToolbarLink>`.** Native `<a>` has no `disabled` attribute; we expose `aria-disabled="true"` and suppress click. Removing the link from the focus order would deviate from APG; users can still hear "disabled".
- **Toggle groups don't change roles.** Inside a toolbar, `[forToggleGroup]` keeps `role="group"` (semantically a related set of buttons). The toolbar role lives only on the outer container.
- **Cross-axis separators.** `[forToolbarSeparator]` defaults to the orientation perpendicular to the toolbar so the line is visible. Override by setting `orientation` explicitly.
