# Disclosure

A single trigger that shows or hides a related region of content.

A button toggles the visibility of a content region, wired with `aria-expanded` and `aria-controls`.

## Anatomy

```html
<div forDisclosure [(open)]="isOpen">
  <button type="button" forDisclosureTrigger>{{ isOpen() ? 'Hide' : 'Show' }} details</button>
  <div forDisclosureContent>Hidden content goes here.</div>
</div>
```

## Examples

```ts
import { Component, signal } from '@angular/core';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk/disclosure';

@Component({
  selector: 'demo-faq',
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div forDisclosure class="disclosure" [(open)]="isOpen">
      <button type="button" forDisclosureTrigger class="disclosure-trigger">
        {{ isOpen() ? 'Hide' : 'Show' }} details
      </button>
      @if (isOpen()) {
        <div forDisclosureContent class="disclosure-content">
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
.disclosure-content[data-state='closed'] {
  /* … */
}
.disclosure-content[data-state='open'] {
  /* … */
}
```

## API

### `ForDisclosure`

| Property   | Type             | Description                                                                                         |
| ---------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `open`     | `model<boolean>` | Two-way bindable open state.<br>**Default:** `false`                                                |
| `disabled` | `input<boolean>` | When true, click on the trigger is ignored. Reflects `data-disabled` on the host.<br>**Default:** — |

| Data attribute  | Values             |
| --------------- | ------------------ |
| `data-state`    | `open` \| `closed` |
| `data-disabled` | present \| absent  |

### `ForDisclosureTrigger`

| Property   | Type             | Description                                                                          |
| ---------- | ---------------- | ------------------------------------------------------------------------------------ |
| `disabled` | `input<boolean>` | Disables this trigger only — merged OR with the root's `disabled`.<br>**Default:** — |

| Data attribute  | Values             |
| --------------- | ------------------ |
| `data-state`    | `open` \| `closed` |
| `data-disabled` | present \| absent  |

Reflects on its host: `id`, `aria-expanded`, `aria-controls`, `disabled`, `data-state`. Toggles the state on click. The disabled reflection (the native `disabled` attribute plus `data-disabled`; no `aria-disabled` — one channel only) and the click guard follow the effective state — the trigger's own `disabled` OR the root's.

`aria-controls` is emitted only while open — mirroring the overlay triggers' open-only gating — so the reference never dangles at an unmounted panel under the recommended `@if (open())` mount pattern.

Use a native `<button type="button">` so Enter / Space activation come for free. Other elements lose keyboard accessibility — that is on you.

### `ForDisclosureContent`

| Data attribute  | Values             |
| --------------- | ------------------ |
| `data-state`    | `open` \| `closed` |
| `data-disabled` | present \| absent  |

Reflects on its host: `id`, `data-state`, `data-disabled`, `aria-hidden` (when closed), `inert` (when closed).

The directive does **not** apply `[hidden]` or otherwise control DOM presence. Two patterns work:

- **Mount/unmount with `@if (open())`** — the panel is absent from the DOM while closed; idiomatic for `animate.enter` / `animate.leave`.
- **Leave it mounted** — preserve scroll/input state or run CSS-only transitions off `data-state`. While closed, the directive sets `aria-hidden="true"` and `inert` on the host so the panel is removed from the accessibility tree and focus order. Add `display: none` (or your own collapse animation) keyed on `[data-state="closed"]` to also hide it visually.

If the panel is a semantic region, add `role="region"` and `aria-labelledby="..."` pointing to the trigger.

## Accessibility

Implements the [WAI-ARIA Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).

- The library does not auto-add `role="button"` or keyboard handlers when the trigger is not a `<button>`. Always use a real button.
- The directive does not apply the native `hidden` attribute to the content. Either wrap it with `@if (open())` so it unmounts when closed, or leave it mounted and rely on the `aria-hidden="true"` + `inert` reflection that keeps the closed panel out of the accessibility tree and focus order. Visual hiding (and enter/leave transitions) are still on you — drive them off `[data-state]`.
- Disabled state sets the native `disabled` attribute on the trigger (effective on `<button>` elements). Click is also ignored at the directive level as a defensive measure. The trigger can be disabled from the root (`[forDisclosure] [disabled]`) or per trigger (`[forDisclosureTrigger] [disabled]`); either source disables it.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

```css
.disclosure-trigger .chevron {
  transition: transform 150ms ease;
}
.disclosure-trigger[data-state='open'] .chevron {
  transform: rotate(180deg);
}
```

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_DISCLOSURE_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
