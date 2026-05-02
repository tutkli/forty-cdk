# Separator

Headless implementation of the [WAI-ARIA Separator pattern](https://www.w3.org/WAI/ARIA/apg/patterns/separator/) (static variant). Splits content into groups visually and — by default — semantically.

## Pieces

| Class          | Selector         | Role                                                                                 |
| -------------- | ---------------- | ------------------------------------------------------------------------------------ |
| `ForSeparator` | `[forSeparator]` | Single attribute directive. Reflects role / `aria-orientation` / `data-orientation`. |

## Inputs

| API           | Type                                | Description                                                   |
| ------------- | ----------------------------------- | ------------------------------------------------------------- |
| `orientation` | `input<'horizontal' \| 'vertical'>` | Axis the separator divides along. Defaults to `'horizontal'`. |
| `decorative`  | `input<boolean>`                    | When true, the separator is purely visual (`role="none"`).    |

The host gets `data-orientation="horizontal" \| "vertical"` for CSS hooks.

## Usage

```ts
import { Component } from '@angular/core';
import { ForSeparator } from 'forty-cdk';

@Component({
  selector: 'demo-separator',
  imports: [ForSeparator],
  template: `
    <section>
      <h2>Profile</h2>
      <p>…</p>
    </section>

    <hr forSeparator />

    <section>
      <h2>Notifications</h2>
      <p>…</p>
    </section>

    <nav>
      <a href="/a">A</a>
      <span forSeparator orientation="vertical" decorative></span>
      <a href="/b">B</a>
    </nav>
  `,
})
export class DemoSeparator {}
```

## Accessibility notes

- **Default is semantic.** A `[forSeparator]` element gets `role="separator"` and (for vertical) `aria-orientation="vertical"`. Horizontal omits the attribute because it is the ARIA default.
- **Use `decorative` when redundant.** If the section split is already announced (e.g. headings on either side, or a list with ARIA grouping), set `decorative` so the separator becomes `role="none"` and screen readers skip it.
- **Native semantics still help.** `<hr forSeparator>` keeps the implicit `<hr>` semantics in non-AT contexts; the directive only adds explicit ARIA in case the host element isn't `<hr>`.
- **Not focusable.** This primitive implements the static variant only. If you need a draggable resize bar (the focusable `separator` variant), compose it yourself; that pattern's keyboard semantics differ and warrant its own primitive.
