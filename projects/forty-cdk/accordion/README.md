---
title: Accordion
group: primitives
archetype: [composable-ui]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
---

# Accordion

A stack of collapsible sections, optionally allowing multiple panels open at once.

## When to choose

- **Accordion** — a group of collapsible items under one root. `[(value)]` holds which are open, `multiple` decides whether more than one may be, and ArrowUp / ArrowDown / Home / End move focus across the triggers.
- **[Disclosure](../disclosure/README.md)** — a single trigger and its region, with no shared state and no arrow-key navigation. Stacking several of them is not an accordion, and that is the right shape when the panels are unrelated.
- **[Tabs](../tabs/README.md)** — when exactly one panel is ever visible and the panels are alternatives rather than sections the reader may open together.

## Anatomy

```html
<div forAccordion>
  <div forAccordionItem value="item-1">
    <h3>
      <button type="button" forAccordionTrigger>Trigger</button>
    </h3>
    <div forAccordionContent>Panel content</div>
  </div>
  <!-- repeat forAccordionItem per section -->
</div>
```

## Examples

Open a panel with the pointer or `Enter`, move between headers with the arrow keys, and watch `data-state` flip on the item, its trigger and its content together.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk/accordion';

interface AccordionEntry {
  readonly value: string;
  readonly title: string;
  readonly body: string;
}

@Component({
  selector: 'app-accordion-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  template: `
    <div forAccordion class="acc-root" [(value)]="value" collapsible>
      @for (item of items; track item.value) {
        <div forAccordionItem class="acc-item" [value]="item.value">
          <h3 class="acc-heading">
            <button type="button" forAccordionTrigger class="acc-trigger">
              <span>{{ item.title }}</span>
              <span class="chevron" aria-hidden="true"></span>
            </button>
          </h3>
          <section forAccordionContent class="acc-content">
            <div class="acc-inner">
              <p>{{ item.body }}</p>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class AccordionDefaultExample {
  protected readonly items: readonly AccordionEntry[] = [
    {
      value: 'a',
      title: 'What is forty-cdk?',
      body: 'A library of headless UI primitives with built-in WAI-ARIA accessibility.',
    },
    {
      value: 'b',
      title: 'Does it ship styles?',
      body: 'No. It exposes state, behavior, focus and ARIA; you apply the styles yourself.',
    },
    {
      value: 'c',
      title: 'Does it work without Zone.js?',
      body: 'Yes, it is designed to run under provideZonelessChangeDetection().',
    },
  ];

  protected readonly value = signal<readonly string[]>(['a']);
}
```

### Multiple

`multiple` lets several sections stay open at once, so `value` holds an array of every open item.

### Horizontal

`orientation='horizontal'` lays the sections out in a row and switches roving navigation to `ArrowLeft` / `ArrowRight`. It is reflected as `data-orientation` for styling.

### Disabled item

A disabled item cannot be toggled and is skipped by the arrow keys, while staying in the DOM for screen readers.

## API

### `ForAccordion`

| Property      | Type                                | Description                                                                                                                                                              |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `value`       | `model<readonly string[]>`          | Currently open item values. In single mode the array has 0 or 1 element.<br>**Default:** —                                                                               |
| `multiple`    | `input<boolean>`                    | When true, multiple items can be open simultaneously.<br>**Default:** `false`                                                                                            |
| `collapsible` | `input<boolean>`                    | Single mode only: when true, the open item can be collapsed by clicking it. Otherwise once any item is open, exactly one stays open.<br>**Default:** `false`             |
| `disabled`    | `input<boolean>`                    | When true, disables every item — each trigger reflects the native `disabled` attribute and cannot toggle. Composes with a per-item `[disabled]`.<br>**Default:** `false` |
| `orientation` | `input<'horizontal' \| 'vertical'>` | Layout direction of the trigger list. In horizontal mode ArrowLeft/Right replace ArrowUp/Down.<br>**Default:** `'vertical'`                                              |
| `dir`         | `input<'ltr' \| 'rtl'>`             | Writing direction. Only relevant in horizontal mode — swaps the meaning of Left/Right arrows.<br>**Default:** —                                                          |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |

### `ForAccordionItem`

| Property   | Type                     | Description                                                                                          |
| ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `value`    | `input.required<string>` | Unique identifier within the accordion. Required.<br>**Default:** —                                  |
| `disabled` | `input<boolean>`         | When true, the trigger ignores clicks and exposes the native `disabled` attribute.<br>**Default:** — |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-state`       | `open` \| `closed`         |
| `data-disabled`    | present \| absent          |
| `data-orientation` | `horizontal` \| `vertical` |

### `ForAccordionTrigger`

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-state`       | `open` \| `closed`         |
| `data-orientation` | `horizontal` \| `vertical` |

### `ForAccordionContent`

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-state`       | `open` \| `closed`         |
| `data-orientation` | `horizontal` \| `vertical` |

## Keyboard

| Key                                          | Action                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| <kbd>Enter</kbd> / <kbd>Space</kbd>          | Toggle the focused trigger (native button).                                                        |
| <kbd>ArrowDown</kbd> / <kbd>ArrowUp</kbd>    | Move focus between triggers (vertical, default). Wrap-around, skips disabled.                      |
| <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> | Move focus between triggers (horizontal — flipped under `dir='rtl'`). Wrap-around, skips disabled. |
| <kbd>Home</kbd>                              | Jump to the first trigger.                                                                         |
| <kbd>End</kbd>                               | Jump to the last trigger.                                                                          |

## Accessibility

- **Heading wrapper is your job.** The library does not render a heading around the trigger — wrap it in the heading level (`<h2>`–`<h6>`) appropriate to your document outline. Without it, screen-reader landmark navigation is broken.
- **Use a real `<button type="button">` for the trigger.** Native Enter / Space activation and focus come for free; the directive does not synthesize them.
- **`role="region"`** is added to every panel automatically. APG recommends suppressing it on accordions with 6+ panels to avoid landmark proliferation; there is currently no opt-out.
- **Closed panels leave the accessibility tree.** While closed, `ForAccordionContent` sets `aria-hidden="true"` and `inert` on the panel, removing it from both the accessibility tree and the focus order. The directive does **not** apply `[hidden]`, so pick how to hide it visually:
  - **Mount / unmount with `@if (item.expanded())`** — the panel is absent from the DOM while closed; the cleanest path for `animate.enter` / `animate.leave`. The trigger emits `aria-controls` only while expanded, so the reference never dangles at an unmounted panel.
  - **Leave it mounted** — preserve internal state or run CSS-only transitions off `data-state`. Add `display: none` (or your own collapse animation) keyed on `[data-state="closed"]` to also hide it visually.
- **`aria-disabled`** is applied to the open trigger only when single mode is active and `collapsible=false`, indicating the user cannot collapse it from this trigger.
- **A truly disabled item (`[disabled]` on `[forAccordionItem]`) uses the native `disabled` attribute on the trigger, by design.** The trigger is a real single-purpose `<button>`, not a roving-tabindex collection item (each trigger stays independently in the Tab order; arrow-key navigation is the APG-optional enhancement on top). The disabled trigger leaves the Tab order and the arrow-key navigation (which already skips it), but stays in the accessibility tree so screen readers announce it as unavailable in browse mode. The [APG Accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) does not require disabled headers to remain focusable.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

```css
.trigger-chevron {
  transition: transform 150ms ease;
}

.accordion-trigger[data-state='open'] .trigger-chevron {
  transform: rotate(180deg);
}
```

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_ACCORDION_CONTEXT` with `useExisting` pointing at itself, because Angular does not inherit a directive's `providers` and every projected piece resolves its context through that token. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
