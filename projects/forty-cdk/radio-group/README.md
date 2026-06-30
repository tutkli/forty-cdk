# Radio Group

A set of radio buttons where only one option can be selected, with arrow-key navigation.

Headless implementation with selection-on-focus, wrap-around arrow navigation, and `FormValueControl<string>` integration for Angular Signal Forms.

## Anatomy

```html
<div forRadioGroup [(value)]="value" orientation="vertical" aria-labelledby="rg-label">
  <span id="rg-label">Shipping method</span>
  <button type="button" forRadio value="standard">
    <span forRadioIndicator></span>
    Standard
  </button>
  <button type="button" forRadio value="express">
    <span forRadioIndicator></span>
    Express
  </button>
</div>
```

## Examples

### Stand-alone

```ts
import { Component, signal } from '@angular/core';
import { ForRadio, ForRadioGroup } from 'forty-cdk/radio-group';

@Component({
  selector: 'demo-color',
  imports: [ForRadioGroup, ForRadio],
  template: `
    <div forRadioGroup [(value)]="color" aria-labelledby="color-label">
      <span id="color-label">Color</span>
      <button type="button" forRadio class="radio-group-item" value="red">Red</button>
      <button type="button" forRadio class="radio-group-item" value="green">Green</button>
      <button type="button" forRadio class="radio-group-item" value="blue" disabled>Blue</button>
    </div>
  `,
})
export class DemoColor {
  readonly color = signal('red');
}
```

### Signal Forms

```ts
import { Component, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { ForRadio, ForRadioGroup } from 'forty-cdk/radio-group';

@Component({
  selector: 'demo-shipping',
  imports: [ForRadioGroup, ForRadio /* , FormField from @angular/forms */],
  template: `
    <div forRadioGroup [formField]="checkout.shipping" aria-labelledby="ship-label">
      <span id="ship-label">Shipping</span>
      <button type="button" forRadio class="radio-group-item" value="standard">Standard</button>
      <button type="button" forRadio class="radio-group-item" value="express">Express</button>
      <button type="button" forRadio class="radio-group-item" value="overnight">Overnight</button>
    </div>
  `,
})
export class DemoShipping {
  readonly model = signal({ shipping: '' });
  readonly checkout = form(this.model, (s) => required(s.shipping));
}
```

## API

### `ForRadioGroup`

| Property                                                     | Type                                                      | Description                                                                                                                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                                                      | `model<string>`                                           | Two-way bindable. The selected radio's value. Empty string = none selected (matches HTML form semantics). Required by `FormValueControl<string>`.<br>**Default:** — |
| `orientation`                                                | `input<'horizontal' \| 'vertical'>`                       | Drives keyboard navigation and `aria-orientation`.<br>**Default:** `'vertical'`                                                                                     |
| `dir`                                                        | `input<'ltr' \| 'rtl'>`                                   | Swaps ArrowLeft / ArrowRight in horizontal layouts.<br>**Default:** `'ltr'`                                                                                         |
| `disabled` / `readonly` / `required` / `invalid` / `pending` | `input<boolean>`                                          | Reflected as `aria-*` / `data-*`. `disabled` and `readonly` block all selection.<br>**Default:** —                                                                  |
| `loop`                                                       | `input<boolean>`                                          | When true (default), arrow nav wraps around past the first / last enabled radio. Set to `false` for a non-wrapping group.<br>**Default:** `true`                    |
| `name`                                                       | `input<string>`                                           | For form association.<br>**Default:** —                                                                                                                             |
| `errors`                                                     | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Wired by `[formField]`.<br>**Default:** —                                                                                                                           |
| `touched`                                                    | `model<boolean>`                                          | Set to `true` when focus leaves the group entirely.<br>**Default:** —                                                                                               |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |
| `data-readonly`    | present \| absent          |

### `ForRadio`

| Property   | Type                     | Description                                                                                                            |
| ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `value`    | `input.required<string>` | This radio's identifier. Must be unique within the group and non-empty.<br>**Default:** —                              |
| `disabled` | `input<boolean>`         | Disables this radio independently of the group. Disabled radios are skipped during arrow navigation.<br>**Default:** — |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-state`       | `checked` \| `unchecked`   |
| `data-disabled`    | present \| absent          |
| `data-orientation` | `horizontal` \| `vertical` |

A disabled radio reflects `aria-disabled="true"` + `data-disabled=""` (no native `disabled`, per APG) — announced but non-selectable, and skipped during arrow nav. Tabindex is `0` for the selected radio (or, when no radio is selected, the first enabled one) and `-1` for the rest.

### `ForRadioIndicator`

Optional slot inside a `ForRadio`. Apply on the element you want to show only while the radio is selected (typically a filled dot). Mirrors the parent radio's `data-state` so you can hide the unchecked state with `[data-state="unchecked"] { display: none }`.

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-state`       | `checked` \| `unchecked`   |
| `data-orientation` | `horizontal` \| `vertical` |

## Keyboard

- **Tab** moves focus into / out of the group; lands on the selected radio (or the first enabled one if nothing is selected).
- **Space** / **Enter** select the focused radio (Space is APG; Enter comes from the underlying `<button>` and is harmless).
- **ArrowDown** / **ArrowUp** in a vertical group, **ArrowRight** / **ArrowLeft** in a horizontal group: move focus AND change selection ("selection on focus"), wrapping at the ends. RTL swaps Left/Right.
- **Home** / **End** jump to the first / last enabled radio (and select it).
- Disabled radios are skipped.

## Accessibility

Implements the [WAI-ARIA Radio Group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/).

- **Provide a group label.** Use `aria-labelledby` (pointing to a heading or `<span>`) or `aria-label`. Without one, screen readers cannot announce the group's purpose.
- **Selection-on-focus** is the APG-mandated behavior for standard radio groups (toolbars use a different model). Be aware that arrow navigation immediately changes the form value.
- **`role="radio"`** on a `<button>` is the most accessible host: it gets keyboard activation and SR-friendly semantics. Other host elements lose those defaults.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

```css
.radio-group-indicator[data-state='unchecked'] {
  display: none;
}

.radio-group-item:not([data-disabled]):hover {
  cursor: pointer;
}
```

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_RADIO_GROUP_HOST_DIRECTIVE_INPUTS` / `FOR_RADIO_GROUP_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).
