# Toolbar

Headless implementation of the [WAI-ARIA Toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/). A toolbar is a single Tab stop that contains a set of buttons, links, and toggle groups; arrow keys move focus inside.

Composes naturally with `[forToggleGroup]` — toggle items nested inside a toolbar register with the toolbar's roving tabindex automatically, so arrows move fluidly across the whole bar.

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForToolbar` | `[forToolbar]` | Root. `role="toolbar"`. Owns roving + nav. |
| `ForToolbarButton` | `[forToolbarButton]` | Plain push button. Apply on `<button>`. |
| `ForToolbarLink` | `[forToolbarLink]` | Hyperlink. Apply on `<a>`. |
| `ForToolbarSeparator` | `[forToolbarSeparator]` | Visual divider. Defaults to the cross-axis. Delegates role / `aria-orientation` to `ForSeparator`. |

## Inputs (root)

| API | Type | Description |
| --- | --- | --- |
| `orientation` | `input<'horizontal' \| 'vertical'>` | Layout direction. Default `'horizontal'`. |
| `dir` | `input<WritingDirection>` | Reading direction. RTL swaps ArrowLeft / ArrowRight. |
| `loop` | `input<boolean>` | Whether arrow nav wraps at the ends. Default `true`. |
| `disabled` | `input<boolean>` | Disables every item. |

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  ForToolbar, ForToolbarButton, ForToolbarLink, ForToolbarSeparator,
  ForToggleGroup, ForToggleGroupItem,
} from 'forty-cdk';

@Component({
  selector: 'demo-toolbar',
  imports: [
    ForToolbar, ForToolbarButton, ForToolbarLink, ForToolbarSeparator,
    ForToggleGroup, ForToggleGroupItem,
  ],
  template: `
    <div forToolbar aria-label="Formatting">
      <button forToolbarButton (click)="undo()">Undo</button>
      <button forToolbarButton (click)="redo()">Redo</button>
      <span forToolbarSeparator></span>
      <div forToggleGroup multiple [(value)]="formatting">
        <button forToggleGroupItem value="bold">B</button>
        <button forToggleGroupItem value="italic">I</button>
        <button forToggleGroupItem value="underline">U</button>
      </div>
      <span forToolbarSeparator></span>
      <a forToolbarLink href="/help">Help</a>
    </div>
  `,
})
export class DemoToolbar {
  readonly formatting = signal<readonly string[]>([]);
  undo() {}
  redo() {}
}
```

## Accessibility notes

- **Single Tab stop.** The toolbar takes one place in the tab order; only the entry-point item carries `tabindex="0"`. Arrow keys move focus inside, Home / End jump to the first / last enabled item.
- **Always label the toolbar.** Pass `aria-label` (or `aria-labelledby`) so screen-reader users know what the toolbar acts on. Not optional — APG requires it.
- **Disabled items stay focusable on `<a forToolbarLink>`.** Native `<a>` has no `disabled` attribute; we expose `aria-disabled="true"` and suppress click. Removing the link from the focus order would deviate from APG; users can still hear "disabled".
- **Toggle groups don't change roles.** Inside a toolbar, `[forToggleGroup]` keeps `role="group"` (semantically a related set of buttons). The toolbar role lives only on the outer container.
- **Cross-axis separators.** `[forToolbarSeparator]` defaults to the orientation perpendicular to the toolbar so the line is visible. Override by setting `orientation` explicitly.
