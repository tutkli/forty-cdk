---
title: Radio Group
slug: radio-group
source: projects/forty-cdk/src/lib/radio-group/README.md
---

# Radio Group

Headless implementation of the [WAI-ARIA Radio Group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) with selection-on-focus, wrap-around arrow navigation, and `FormValueControl&lt;string&gt;` integration for Angular Signal Forms.

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForRadioGroup` | `[forRadioGroup]` | Container. Owns the selected value, orientation, disabled / readonly / form state. Provides the shared context. |
| `ForRadio` | `[forRadio]` | One radio. Apply on a `&lt;button type="button"&gt;`. |

## Inputs / models

### `ForRadioGroup`

| API | Type | Description |
| --- | --- | --- |
| `value` | `model&lt;string&gt;` | Two-way bindable. The selected radio's value. Empty string = none selected (matches HTML form semantics). Required by `FormValueControl&lt;string&gt;`. |
| `orientation` | `input&lt;'horizontal' \| 'vertical'&gt;` | Default `'vertical'`. Drives keyboard navigation and `aria-orientation`. |
| `dir` | `input&lt;'ltr' \| 'rtl'&gt;` | Default `'ltr'`. Swaps ArrowLeft / ArrowRight in horizontal layouts. |
| `disabled` / `readonly` / `required` / `invalid` / `pending` | `input&lt;boolean&gt;` | Reflected as `aria-*` / `data-*`. `disabled` and `readonly` block all selection. |
| `loop` | `input&lt;boolean&gt;` | When true (default), arrow nav wraps around past the first / last enabled radio. Set to `false` for a non-wrapping group. |
| `name` | `input&lt;string&gt;` | For form association. |
| `errors` | `input&lt;readonly ValidationError.WithOptionalFieldTree[]&gt;` | Wired by `[formField]`. |
| `touched` | `model&lt;boolean&gt;` | Set to `true` when focus leaves the group entirely. |

The group host gets `data-orientation`, `data-disabled`, and `data-readonly` for CSS hooks.

### `ForRadio`

| API | Type | Description |
| --- | --- | --- |
| `value` | `input.required&lt;string&gt;` | This radio's identifier. Must be unique within the group and non-empty. |
| `disabled` | `input&lt;boolean&gt;` | Disables this radio independently of the group. Disabled radios are skipped during arrow navigation. |

The radio host gets `aria-checked`, `aria-disabled`, `disabled`, `tabindex`, `data-state`, and `data-disabled`. Tabindex is `0` for the selected radio (or, when no radio is selected, the first enabled one) and `-1` for the rest.

## Stand-alone usage

```ts
import { Component, signal } from '@angular/core';
import { ForRadioGroup, ForRadio } from 'forty-cdk';

@Component({
  selector: 'demo-color',
  imports: [ForRadioGroup, ForRadio],
  template: `
    <div forRadioGroup [(value)]="color" aria-labelledby="color-label">
      <span id="color-label">Color</span>
      <button type="button" forRadio value="red">Red</button>
      <button type="button" forRadio value="green">Green</button>
      <button type="button" forRadio value="blue" disabled>Blue</button>
    </div>
  `,
})
export class DemoColor {
  readonly color = signal('red');
}
```

## Signal Forms usage

```ts
import { Component, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { ForRadioGroup, ForRadio } from 'forty-cdk';

@Component({
  selector: 'demo-shipping',
  imports: [ForRadioGroup, ForRadio /* , FormField from @angular/forms */],
  template: `
    <div forRadioGroup [formField]="checkout.shipping" aria-labelledby="ship-label">
      <span id="ship-label">Shipping</span>
      <button type="button" forRadio value="standard">Standard</button>
      <button type="button" forRadio value="express">Express</button>
      <button type="button" forRadio value="overnight">Overnight</button>
    </div>
  `,
})
export class DemoShipping {
  readonly model = signal({ shipping: '' });
  readonly checkout = form(this.model, (s) => required(s.shipping));
}
```

## Keyboard

- **Tab** moves focus into / out of the group; lands on the selected radio (or the first enabled one if nothing is selected).
- **Space** / **Enter** select the focused radio (Space is APG; Enter comes from the underlying `&lt;button&gt;` and is harmless).
- **ArrowDown** / **ArrowUp** in a vertical group, **ArrowRight** / **ArrowLeft** in a horizontal group: move focus AND change selection ("selection on focus"), wrapping at the ends. RTL swaps Left/Right.
- **Home** / **End** jump to the first / last enabled radio (and select it).
- Disabled radios are skipped.

## Accessibility notes

- **Provide a group label.** Use `aria-labelledby` (pointing to a heading or `&lt;span&gt;`) or `aria-label`. Without one, screen readers cannot announce the group's purpose.
- **Selection-on-focus** is the APG-mandated behavior for standard radio groups (toolbars use a different model). Be aware that arrow navigation immediately changes the form value.
- **`role="radio"`** on a `&lt;button&gt;` is the most accessible host: it gets keyboard activation, the `disabled` attribute, and SR-friendly semantics. Other host elements lose those defaults.
