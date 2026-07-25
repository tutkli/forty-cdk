# Separator

A static, optionally semantic divider between groups of content or controls, horizontal or vertical.

The focusable divider that resizes two panes is a separate primitive — [`ForPaneResizer`](../pane-resizer/README.md). Keeping them apart means a plain `<hr forSeparator>` never pulls the drag / keyboard-resize code in.

## Anatomy

```html
<hr forSeparator />

<span forSeparator orientation="vertical" decorative></span>
```

## Examples

```ts
import { Component } from '@angular/core';
import { ForSeparator } from 'forty-cdk/separator';

@Component({
  selector: 'demo-separator',
  imports: [ForSeparator],
  template: `
    <section>
      <h2>Profile</h2>
      <p>…</p>
    </section>

    <hr forSeparator class="separator" />

    <section>
      <h2>Notifications</h2>
      <p>…</p>
    </section>

    <nav>
      <a href="/a">A</a>
      <span forSeparator class="separator" orientation="vertical" decorative></span>
      <a href="/b">B</a>
    </nav>
  `,
})
export class DemoSeparator {}
```

## API

### `ForSeparator`

| Property      | Type                                | Description                                                                  |
| ------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| `orientation` | `input<'horizontal' \| 'vertical'>` | Axis the separator divides along.<br>**Default:** `'horizontal'`             |
| `decorative`  | `input<boolean>`                    | When true, the separator is purely visual (`role="none"`).<br>**Default:** — |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |

## Accessibility

Implements the static [WAI-ARIA Separator pattern](https://www.w3.org/WAI/ARIA/apg/patterns/separator/).

- **Static is the only mode.** `[forSeparator]` keeps `role="separator"` and (for vertical) `aria-orientation="vertical"`. Horizontal omits the attribute because it is the ARIA default.
- **Use `decorative` when redundant.** If the section split is already announced (e.g. headings on either side), set `decorative` so the separator becomes `role="none"` and AT skips it.
- **One emission policy across every separator in the library.** `[forSeparator]`, `[forToolbarSeparator]`, `[forMenuSeparator]`, `[forSelectSeparator]`, and `[forComboboxSeparator]` all share the same contract: `role="separator"` (or `role="none"` with `decorative`), `aria-orientation` emitted only for `orientation="vertical"`, and `data-orientation` always stamped for styling. `[forToolbarSeparator]` is the one variation — its `orientation` defaults to the toolbar's cross-axis instead of `horizontal`.
- **Need a resizer?** Reach for [`ForPaneResizer`](../pane-resizer/README.md) — the focusable, draggable, value-carrying divider between two panes.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

```css
.separator {
  background: var(--border);
}

.separator[data-orientation='horizontal'] {
  block-size: 1px;
  inline-size: 100%;
}

.separator[data-orientation='vertical'] {
  inline-size: 1px;
  align-self: stretch;
}
```
