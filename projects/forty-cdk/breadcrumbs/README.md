# Breadcrumbs

Headless breadcrumb trail implementing the [WAI-ARIA Breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/): a labelled `navigation` landmark wrapping a set of links, with [`aria-current="page"`](https://www.w3.org/TR/wai-aria-1.2/#aria-current) on the current page and decorative separators hidden from assistive technology. Ships no styles — apply your own.

## Pieces

| Class                    | Selector                   | Role                                                                      |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------- |
| `ForBreadcrumbs`         | `[forBreadcrumbs]`         | Root. `role="navigation"`, labelled `aria-label="Breadcrumb"` by default. |
| `ForBreadcrumbItem`      | `[forBreadcrumbItem]`      | A link in the trail. Reflects `aria-current="page"` when `current`.       |
| `ForBreadcrumbSeparator` | `[forBreadcrumbSeparator]` | Decorative divider between items. Reflects `aria-hidden="true"`.          |

## Usage

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

## Styling

forty-cdk ships no styles. Style the current item via `[aria-current="page"]`.

```css
[forBreadcrumbItem][aria-current='page'] {
  font-weight: bold;
  color: inherit;
  text-decoration: none;
}
```
