---
title: Disclosure
slug: disclosure
source: projects/forty-cdk/src/lib/disclosure/README.md
---

# Disclosure

Headless implementation of the [WAI-ARIA Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).
A button toggles the visibility of a content region, wired with `aria-expanded` and `aria-controls`.

## Pieces

| Class                  | Selector                 | Role                                                                   |
| ---------------------- | ------------------------ | ---------------------------------------------------------------------- |
| `ForDisclosure`        | `[forDisclosure]`        | Root. Holds `open` / `disabled` state and provides the shared context. |
| `ForDisclosureTrigger` | `[forDisclosureTrigger]` | Button that toggles the state.                                         |
| `ForDisclosureContent` | `[forDisclosureContent]` | Panel revealed when open.                                              |

## Inputs / outputs

### `ForDisclosure`

| API        | Type             | Description                                                                       |
| ---------- | ---------------- | --------------------------------------------------------------------------------- |
| `open`     | `model&lt;boolean&gt;` | Two-way bindable. Defaults to `false`.                                            |
| `disabled` | `input&lt;boolean&gt;` | When true, click on the trigger is ignored. Reflects `data-disabled` on the host. |

The host element gets `data-state="open" \| "closed"` for CSS hooks.

### `ForDisclosureTrigger`

Reflects on its host: `id`, `aria-expanded`, `aria-controls`, `disabled`, `data-state`. Toggles the state on click.

Use a native `&lt;button type="button"&gt;` so Enter / Space activation come for free. Other elements lose keyboard accessibility — that is on you.

### `ForDisclosureContent`

Reflects on its host: `id`, `data-state`, `data-disabled`, `aria-hidden` (when closed), `inert` (when closed).

The directive does **not** apply `[hidden]` or otherwise control DOM presence. Two patterns work:

- **Mount/unmount with `@if (open())`** — the panel is absent from the DOM while closed; idiomatic for `animate.enter` / `animate.leave`.
- **Leave it mounted** — preserve scroll/input state or run CSS-only transitions off `data-state`. While closed, the directive sets `aria-hidden="true"` and `inert` on the host so the panel is removed from the accessibility tree and focus order. Add `display: none` (or your own collapse animation) keyed on `[data-state="closed"]` to also hide it visually.

If the panel is a semantic region, add `role="region"` and `aria-labelledby="..."` pointing to the trigger.

## Example

```ts
import { Component, signal } from '@angular/core';
import { ForDisclosure, ForDisclosureTrigger, ForDisclosureContent } from 'forty-cdk';

@Component({
  selector: 'demo-faq',
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div forDisclosure [(open)]="isOpen">
      <button type="button" forDisclosureTrigger>{{ isOpen() ? 'Hide' : 'Show' }} details</button>
      @if (isOpen()) {
        <div forDisclosureContent>
          <p>Hidden content goes here.</p>
        </div>
      }
    </div>
  `,
})
export class DemoFaq {
  readonly isOpen = signal(false);
}
```

The library ships no styles. Hide animations / transitions can be driven off `data-state` on the trigger and content:

```css
[forDisclosureContent][data-state='closed'] {
  /* … */
}
[forDisclosureContent][data-state='open'] {
  /* … */
}
```

## Accessibility notes

- The library does not auto-add `role="button"` or keyboard handlers when the trigger is not a `&lt;button&gt;`. Always use a real button.
- The directive does not apply the native `hidden` attribute to the content. Either wrap it with `@if (open())` so it unmounts when closed, or leave it mounted and rely on the `aria-hidden="true"` + `inert` reflection that keeps the closed panel out of the accessibility tree and focus order. Visual hiding (and enter/leave transitions) are still on you — drive them off `[data-state]`.
- Disabled state sets the native `disabled` attribute on the trigger (effective on `&lt;button&gt;` elements). Click is also ignored at the directive level as a defensive measure.
