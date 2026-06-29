# Breadcrumbs

Headless breadcrumb trail implementing the [WAI-ARIA Breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/): a labelled `navigation` landmark wrapping a set of links, with [`aria-current="page"`](https://www.w3.org/TR/wai-aria-1.2/#aria-current) on the current page and decorative separators hidden from assistive technology. Ships no styles — apply your own.

## Anatomy

| Class                    | Selector                   | Role                                                                      |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------- |
| `ForBreadcrumbs`         | `[forBreadcrumbs]`         | Root. `role="navigation"`, labelled `aria-label="Breadcrumb"` by default. |
| `ForBreadcrumbItem`      | `[forBreadcrumbItem]`      | A link in the trail. Reflects `aria-current="page"` when `current`.       |
| `ForBreadcrumbSeparator` | `[forBreadcrumbSeparator]` | Decorative divider between items. Reflects `aria-hidden="true"`.          |

## Examples

```ts
import { Component } from '@angular/core';
import { ForBreadcrumbItem, ForBreadcrumbSeparator, ForBreadcrumbs } from 'forty-cdk/breadcrumbs';

@Component({
  selector: 'demo-breadcrumbs',
  imports: [ForBreadcrumbs, ForBreadcrumbItem, ForBreadcrumbSeparator],
  template: `
    <nav forBreadcrumbs>
      <ol>
        <li><a forBreadcrumbItem href="/">Home</a></li>
        <li forBreadcrumbSeparator>/</li>
        <li><a forBreadcrumbItem href="/library">Library</a></li>
        <li forBreadcrumbSeparator>/</li>
        <li><a forBreadcrumbItem href="/library/data" current>Data</a></li>
      </ol>
    </nav>
  `,
})
export class DemoBreadcrumbs {}
```

The root defaults its label to `Breadcrumb`. Override it with `ariaLabel="…"` (or point a native `aria-labelledby` at a visible heading) when a page hosts more than one breadcrumb trail.

## API

### `ForBreadcrumbs`

| Property    | Type            | Description                                                                                                                               |
| ----------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `ariaLabel` | `input<string>` | Accessible label for the `navigation` landmark. Override when a page hosts more than one breadcrumb trail.<br>**Default:** `'Breadcrumb'` |

### `ForBreadcrumbItem`

| Property  | Type             | Description                                                              |
| --------- | ---------------- | ------------------------------------------------------------------------ |
| `current` | `input<boolean>` | When true, reflects `aria-current="page"` on the link.<br>**Default:** — |

## Accessibility

- **Navigation landmark.** `[forBreadcrumbs]` applies `role="navigation"` and labels it `aria-label="Breadcrumb"` by default, creating a named landmark that screen-reader users can jump to directly.
- **Current page.** Set `current` on `[forBreadcrumbItem]` for the active page; the directive reflects `aria-current="page"` so assistive technology announces the user's location in the trail.
- **Decorative separators.** `[forBreadcrumbSeparator]` reflects `aria-hidden="true"` so the visual divider (e.g. `/`) is skipped by screen readers.

## Styling

forty-cdk ships no styles. Style the current item via `[aria-current="page"]`.

```css
[forBreadcrumbItem][aria-current='page'] {
  font-weight: bold;
  color: inherit;
  text-decoration: none;
}
```
