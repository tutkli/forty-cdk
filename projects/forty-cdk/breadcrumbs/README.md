---
title: Breadcrumbs
group: primitives
archetype: [composable-ui]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/
---

# Breadcrumbs

A labelled navigation landmark for a breadcrumb trail: links with aria-current='page' on the current page and decorative separators hidden from assistive technology.

## Anatomy

```html
<nav forBreadcrumbs>
  <ol>
    <li><a forBreadcrumbItem href="/">Home</a></li>
    <li forBreadcrumbSeparator>/</li>
    <li><a forBreadcrumbItem href="/data" current>Data</a></li>
  </ol>
</nav>
```

## Examples

Walk the trail with `Tab` — the last crumb is the page you are on, so it carries `aria-current="page"` and is not a link back to itself.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForBreadcrumbItem, ForBreadcrumbSeparator, ForBreadcrumbs } from 'forty-cdk/breadcrumbs';

interface Crumb {
  readonly label: string;
  readonly href: string;
}

@Component({
  selector: 'app-breadcrumbs-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForBreadcrumbs, ForBreadcrumbItem, ForBreadcrumbSeparator],
  template: `
    <nav forBreadcrumbs class="bc">
      <ol class="bc-list">
        @for (crumb of crumbs(); track crumb.href; let last = $last) {
          <li class="bc-li">
            <a
              forBreadcrumbItem
              class="bc-link"
              [href]="crumb.href"
              [current]="last"
              (click)="$event.preventDefault()"
            >
              {{ crumb.label }}
            </a>
          </li>
          @if (!last) {
            <li forBreadcrumbSeparator class="bc-sep">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </li>
          }
        }
      </ol>
    </nav>
  `,
})
export class BreadcrumbsDefaultExample {
  protected readonly crumbs = signal<readonly Crumb[]>([
    { label: 'Home', href: '/' },
    { label: 'Components', href: '/components' },
    { label: 'Navigation', href: '/components/navigation' },
    { label: 'Breadcrumbs', href: '/components/navigation/breadcrumbs' },
  ]);
}
```

The root defaults its label to `Breadcrumb`. Override it with `ariaLabel="…"` (or point a native `aria-labelledby` at a visible heading) when a page hosts more than one breadcrumb trail.

### Collapsing a long trail

The primitive renders whatever items you give it, so collapsing a deep path is a consumer decision. Here the middle is folded into an expandable ellipsis button that reveals the hidden crumbs — the trail stays a single accessible navigation landmark either way.

## Localizing the label

`Breadcrumb` is verbalized by screen readers, so translate it per injector scope with `provideForBreadcrumbsDefaults`. Configure it at the application root, or in any component's `providers` to scope the translation to a subtree. A per-instance `[ariaLabel]` still wins over the scope default.

<!-- snippet: fragment -->

```ts
import { provideForBreadcrumbsDefaults } from 'forty-cdk/breadcrumbs';

bootstrapApplication(App, {
  providers: [provideForBreadcrumbsDefaults({ label: 'Ruta de navegación' })],
});
```

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

Implements the [WAI-ARIA Breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/).

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
