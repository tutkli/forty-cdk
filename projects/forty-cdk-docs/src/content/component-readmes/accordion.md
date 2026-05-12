---
title: Accordion
slug: accordion
source: projects/forty-cdk/src/lib/accordion/README.md
---

# Accordion

Headless implementation of the [WAI-ARIA Accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).
A vertical stack of collapsible sections, each with a header button and a panel.

## Pieces

| Class                 | Selector                | Role                                                                                                 |
| --------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `ForAccordion`        | `[forAccordion]`        | Root. Owns the open `value`, the single/multiple mode, and the keyboard navigation between triggers. |
| `ForAccordionItem`    | `[forAccordionItem]`    | One section. Requires a unique `value` string.                                                       |
| `ForAccordionTrigger` | `[forAccordionTrigger]` | Header button. Wires ARIA + click + keyboard.                                                        |
| `ForAccordionContent` | `[forAccordionContent]` | Panel. Adds `role="region"` + `aria-labelledby` automatically.                                       |

## Inputs / outputs

### `ForAccordion`

| API           | Type                                | Description                                                                                                                                      |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `value`       | `model&lt;readonly string[]&gt;`          | Currently open item values. In single mode the array has 0 or 1 element.                                                                         |
| `multiple`    | `input&lt;boolean&gt;`                    | When true, multiple items can be open simultaneously. Defaults to `false`.                                                                       |
| `collapsible` | `input&lt;boolean&gt;`                    | Single mode only: when true, the open item can be collapsed by clicking it. Defaults to `false` — once any item is open, exactly one stays open. |
| `orientation` | `input&lt;'horizontal' \| 'vertical'&gt;` | Layout direction of the trigger list. Defaults to `'vertical'`; in horizontal mode ArrowLeft/Right replace ArrowUp/Down.                         |
| `dir`         | `input&lt;'ltr' \| 'rtl'&gt;`             | Writing direction. Only relevant in horizontal mode — swaps the meaning of Left/Right arrows.                                                    |

### `ForAccordionItem`

| API        | Type                     | Description                                                                        |
| ---------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `value`    | `input.required&lt;string&gt;` | Unique identifier within the accordion. Required.                                  |
| `disabled` | `input&lt;boolean&gt;`         | When true, the trigger ignores clicks and exposes the native `disabled` attribute. |

The host gets `data-state="open" \| "closed"` and `data-disabled` for CSS hooks.

### `ForAccordionTrigger`

Reflects on its host: `id`, `aria-expanded`, `aria-controls`, `aria-disabled` (when collapse is disallowed), `disabled` (real, when item is disabled), `data-state`. Toggles on click. Handles `ArrowDown` / `ArrowUp` / `Home` / `End` for navigation between triggers.

Wrap it in a heading element (`&lt;h2&gt;`–`&lt;h6&gt;`) — APG requires that for landmark navigation. Use a real `&lt;button type="button"&gt;` so Enter / Space activation comes for free.

### `ForAccordionContent`

Reflects on its host: `id`, `role="region"`, `aria-labelledby` (the trigger's id), `data-state`, `aria-hidden` (when closed), `inert` (when closed).

The directive does **not** apply `[hidden]`. Two patterns work:

- **Mount/unmount with `@if (item.expanded())`** — the panel is absent from the DOM while closed, which is the cleanest path for `animate.enter` / `animate.leave`.
- **Leave it mounted** — preserve internal state or run CSS-only transitions off `data-state`. While closed, the directive sets `aria-hidden="true"` and `inert` on the host so the panel is removed from the accessibility tree and focus order. Add `display: none` (or your own collapse animation) keyed on `[data-state="closed"]` to also hide it visually.

## Example

```ts
import { Component, signal } from '@angular/core';
import {
  ForAccordion,
  ForAccordionItem,
  ForAccordionTrigger,
  ForAccordionContent,
} from 'forty-cdk';

@Component({
  selector: 'demo-faq',
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  template: `
    <div forAccordion [(value)]="open" collapsible>
      <div forAccordionItem value="shipping">
        <h3>
          <button type="button" forAccordionTrigger>Shipping</button>
        </h3>
        <section forAccordionContent>Ships in 24h.</section>
      </div>
      <div forAccordionItem value="returns">
        <h3>
          <button type="button" forAccordionTrigger>Returns</button>
        </h3>
        <section forAccordionContent>Free 30-day returns.</section>
      </div>
    </div>
  `,
})
export class DemoFaq {
  readonly open = signal<readonly string[]>([]);
}
```

## Accessibility notes

- **Heading wrapper is your job.** The library does not render a heading around the trigger — wrap it in the heading level appropriate to your document outline. Without it, screen-reader landmark navigation is broken.
- **`role="region"`** is added to every panel automatically. APG recommends suppressing it on accordions with 6+ panels to avoid landmark proliferation. An opt-out input will be added to `ForAccordionContent` if this surfaces in real usage.
- **Keyboard**: Enter and Space toggle the focused trigger (native button). ArrowDown / ArrowUp (vertical, default) or ArrowLeft / ArrowRight (horizontal — flipped under `dir='rtl'`) move focus between triggers (wrap-around, skip disabled). Home / End jump to the first/last trigger.
- **`aria-disabled`** is applied to the open trigger only when single mode is active and `collapsible=false`, indicating the user cannot collapse it from this trigger. A truly disabled item uses the native `disabled` attribute instead.
