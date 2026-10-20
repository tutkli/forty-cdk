---
title: Number Input
group: primitives
archetype: [form-control]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/
---

# Number Input

A numeric spinbutton with keyboard stepping, optional +/− buttons, min / max / step clamping and Intl number formatting for the displayed text and aria-valuetext.

Headless and implementing Angular's `FormValueControl<number | null>` from `@angular/forms/signals`, so it auto-wires with `[formField]` and auto-associates inside a [`[forField]`](../field/README.md) (label, description, and error wiring) with zero extra markup. It owns parsing, clamping to `[min, max]`, the full Spinbutton keyboard map, and optional `Intl.NumberFormat`-based display formatting. The directive sits on a `<input type="text">` (not `type="number"`, whose native UI is unstylable and locale-quirky); the focusable spinbutton input itself is the `FormValueControl`, mirroring `<button forSwitch>`.

## Anatomy

```html
<div forNumberInputGroup>
  <button forNumberInputDecrement ariaLabel="Decrease">−</button>
  <input forNumberInput [(value)]="qty" [min]="0" [max]="10" [step]="1" />
  <button forNumberInputIncrement ariaLabel="Increase">+</button>
</div>

<!-- Keyboard-only — no buttons, no group: -->
<input forNumberInput [(value)]="qty" [min]="0" [max]="100" />
```

> **Why the group?** A `<input>` is a void element, so the stepper buttons can't be its DOM descendants and therefore can't inject its context directly. `[forNumberInputGroup]` provides that context and forwards it to the `[forNumberInput]` registered beneath it. A standalone spinbutton (keyboard / `[(value)]` only) needs no group.

## Examples

Type a number, press the arrow keys or click a stepper button. The host carries `data-empty` while the value is `null`. `data-dirty` is a reflection of the `dirty` input, so it appears only when `[formField]` or a `[dirty]` binding supplies it, never from this standalone `[(value)]` binding.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForNumberInput,
  ForNumberInputDecrement,
  ForNumberInputGroup,
  ForNumberInputIncrement,
} from 'forty-cdk/number-input';

@Component({
  selector: 'app-number-input-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForNumberInputGroup, ForNumberInput, ForNumberInputIncrement, ForNumberInputDecrement],
  template: `
    <div forNumberInputGroup class="stepper">
      <button forNumberInputDecrement class="step-btn" ariaLabel="Decrease">−</button>
      <input
        forNumberInput
        class="step-input"
        aria-label="Quantity"
        [(value)]="qty"
        [min]="0"
        [max]="10"
        [step]="1"
      />
      <button forNumberInputIncrement class="step-btn" ariaLabel="Increase">+</button>
    </div>
  `,
})
export class NumberInputDefaultExample {
  protected readonly qty = signal<number | null>(1);
}
```

### States

One class and one directive, three states. `disabled` reflects `data-disabled` on the spinbutton and both stepper buttons and removes the control from the tab order; `readonly` reflects `data-readonly` and keeps it focusable while refusing every edit. The example's stylesheet keys on nothing else.

### Formatting & precision

Type an amount: `value()` under the field follows it as a raw number, and when you press `Enter` or leave the field the text reformats through `formatOptions` as US dollars and `value()` rounds to the cents it shows. `↑` / `↓` step it to the next whole dollar, because stepping snaps to the `step` grid ([Keyboard](#keyboard)). [Formatting](#formatting) covers `locale`, what a surrounding form submits, and the `step` a percent style needs.

## Formatting

`formatOptions` (+ optional `locale`) drives both the displayed text and `aria-valuetext`; `value()` stays a number, and that number is what a surrounding `<form>` submits (via a hidden input). Committing typed text (`Enter` or blur) rounds the value to the precision the format displays, so typing `1.239` into the field below commits `1.24`, and the text, `aria-valuetext`, `aria-valuenow` and the submitted value agree. `min` / `max` win over that rounding, and compact, scientific and engineering notations commit the typed value unrounded. Only typed text is rounded and clamped: a value the field was bound to, or one reached by stepping, keeps the number it holds when focus passes through, so tabbing past a field (readonly or not) never changes its value or marks a form dirty.

```html
<input
  forNumberInput
  [(value)]="price"
  locale="en-US"
  [formatOptions]="{ style: 'currency', currency: 'USD' }"
/>
<!-- value() === 1234.5 → displayed "$1,234.50", aria-valuenow="1234.5" -->
```

Typed text is read in the locale's own digits as well as ASCII ones. In a locale whose default numbering system is not Latin, such as `ar-EG` or `fa-IR`, the field displays Arabic-Indic or Persian digits and parses them back, so its formatted text stays editable.

> **Percent style needs a matching `step`.** With `{ style: 'percent' }` the model value is the fraction Intl formats from (`0.5` displays as `"50%"`), while `step` still defaults to `1`. Because stepping snaps to the `min ?? 0` ± k·`step` grid, ArrowUp from `0.5` would jump to `1` (100%). Set `[step]="0.01"` so one arrow press moves one percentage point. `step` is never derived from `formatOptions`, so the grid is always exactly what you bind.

## Field composition

Drop the spinbutton inside a `[forField]` and it auto-associates with the label, description, and error region, with no `id` / `aria-*` wiring by hand.

```ts
import { Component, signal } from '@angular/core';
import { form, min, required, FormField } from '@angular/forms/signals';
import { ForField, ForFieldError, ForLabel } from 'forty-cdk/field';
import { ForNumberInput } from 'forty-cdk/number-input';

@Component({
  selector: 'demo-order',
  imports: [ForField, ForLabel, ForFieldError, ForNumberInput, FormField],
  template: `
    <div forField #field="forField">
      <label forLabel>Quantity</label>
      <input forNumberInput [formField]="order.qty" />
      @if (field.invalid()) {
        <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
      }
    </div>
  `,
})
export class DemoOrder {
  readonly model = signal({ qty: null as number | null });
  readonly order = form(this.model, (o) => {
    required(o.qty, { message: 'Quantity is required' });
    min(o.qty, 1, { message: 'At least one' });
  });
}
```

Under `[formField]` the bounds come from the schema: Angular rejects a `[min]` or `[max]` binding on a node that carries `[formField]` (NG8022), and the field's `min()` / `max()` rules reach the spinbutton's `min` / `max` instead, so `aria-valuemin`, `aria-valuemax` and clamping follow them.

## Scoped defaults

`provideForNumberInputDefaults` configures number-input defaults for an injector subtree, either at the application root or in any component's `providers` array. Partial overrides inherit unspecified keys from the parent scope (or the library fallbacks at the root).

| Key              | Library fallback | Meaning                                                                                                                                     |
| ---------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `stepMultiplier` | `10`             | Multiplier applied to `step` for `PageUp` / `PageDown`, for inputs that don't set `stepMultiplier` themselves. A step of `1` pages by `10`. |

Per-instance inputs always win over the scope defaults.

```ts
import { type ApplicationConfig } from '@angular/core';
import { provideForNumberInputDefaults } from 'forty-cdk/defaults';

export const appConfig: ApplicationConfig = {
  providers: [provideForNumberInputDefaults({ stepMultiplier: 5 })],
};
```

## API

### `ForNumberInput`

| Property                                                               | Type                                      | Description                                                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `value`                                                                | `model<number \| null>`                   | Two-way bindable value. `null` is the empty input (reflected as `data-empty`).<br>**Default:** —                      |
| `min`                                                                  | `input<number \| undefined>`              | Lower bound. Reflected as `aria-valuemin`. Unset → no lower bound.<br>**Default:** —                                  |
| `max`                                                                  | `input<number \| undefined>`              | Upper bound. Reflected as `aria-valuemax`. Unset → no upper bound.<br>**Default:** —                                  |
| `step`                                                                 | `input<number>`                           | Increment for ArrowUp / ArrowDown and the buttons.<br>**Default:** `1`                                                |
| `stepMultiplier`                                                       | `input<number>`                           | Multiplier over `step` for PageUp / PageDown (configurable via `provideForNumberInputDefaults`).<br>**Default:** `10` |
| `formatOptions`                                                        | `input<Intl.NumberFormatOptions \| null>` | When set, drives the displayed text and `aria-valuetext`.<br>**Default:** —                                           |
| `locale`                                                               | `input<string \| null>`                   | BCP 47 locale for parsing and formatting. Defaults to the runtime locale.<br>**Default:** —                           |
| `disabled` / `readonly` / `required` / `invalid` / `pending` / `dirty` | `input<boolean>`                          | Shared form-control flags (see [Field](../field/README.md)).<br>**Default:** —                                        |
| `name`                                                                 | `input<string>`                           | Mounts a hidden `<input>` carrying the **raw** number for native form submission.<br>**Default:** —                   |
| `touched`                                                              | `model<boolean>`                          | Set to `true` on blur, and on an increment / decrement button click.<br>**Default:** —                                |

| Data attribute  | Values                                       |
| --------------- | -------------------------------------------- |
| `data-empty`    | present (while `value()` is `null`) / absent |
| `data-disabled` | present / absent                             |
| `data-readonly` | present / absent                             |
| `data-touched`  | present / absent                             |
| `data-dirty`    | present / absent                             |
| `data-pending`  | present / absent                             |
| `data-invalid`  | present / absent                             |

### Stepper buttons

Both `[forNumberInputIncrement]` / `[forNumberInputDecrement]` stay `tabindex="-1"` (focus belongs on the spinbutton). They reflect `aria-disabled="true"` + `data-disabled` at the bound (`max` for increment, `min` for decrement) or when the control is disabled / read-only, never the native `disabled` attribute: a click that reaches the bound leaves focus on the button instead of sending it to `<body>`, and activating a disabled button does nothing. Clicking either button also marks the spinbutton touched. The buttons are outside the tab order, so a pointer-only user would otherwise never blur the input and never engage touched-gated error display.

> Name each button with the `ariaLabel` input (`ariaLabel="Increase"`) or a static `aria-label` attribute. A static attribute wins over the input, and the directive leaves it in place. Only a bound `[attr.aria-label]` competes with the directive's own binding, so use the input for a name that changes.

`[forNumberInputIncrement]`:

| Data attribute  | Values                                               |
| --------------- | ---------------------------------------------------- |
| `data-disabled` | present (at `max`, or disabled / read-only) / absent |

`[forNumberInputDecrement]`:

| Data attribute  | Values                                               |
| --------------- | ---------------------------------------------------- |
| `data-disabled` | present (at `min`, or disabled / read-only) / absent |

`[forNumberInputGroup]` is a behavior-only coordination wrapper, so it carries no styling attributes.

## Keyboard

The following shortcuts implement the Spinbutton APG keyboard map.

| Key                     | Behavior                                                        |
| ----------------------- | --------------------------------------------------------------- |
| `ArrowUp` / `ArrowDown` | `value ± step`, clamped.                                        |
| `PageUp` / `PageDown`   | `value ± step × stepMultiplier`, clamped.                       |
| `Home` / `End`          | Set to `min` / `max` (when defined).                            |
| `Enter`                 | Commit (round to the format's precision, then clamp).           |
| typing                  | Numeric characters parsed live; clamped on blur / Enter / step. |

Stepping from an empty field lands on the clamped baseline (`min ?? 0`).

Values live on the `min ?? 0` ± k·`step` grid. A value already on the grid travels the full amount (`step`, or `step × stepMultiplier` for the page keys); a value **off** the grid (a server-supplied `37.4` with `[step]="5"`, say) lands on the adjacent grid point in the direction of travel and the page multiplier is discarded, exactly as the platform's `HTMLInputElement.stepUp()` / `stepDown()` behave. So ArrowUp from `0.55` with `[step]="1"` gives `1`, not `1.55`, and one arrow press is all it takes to correct an off-grid value.

## Accessibility

Implements the [WAI-ARIA Spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/).

- **`role="spinbutton"` on a text input.** `aria-valuenow` / `aria-valuemin` / `aria-valuemax` reflect the value and bounds; `aria-valuetext` is emitted only when `formatOptions` is set (so the formatted text, such as "$1,234.50", is announced instead of the bare number). `inputmode` is `numeric`, or `decimal` when fractional values are possible.
- **Clamp on commit, validate on input.** Keystrokes update the parsed value live so you can type transient out-of-range text without fighting the caret; clamping to `[min, max]` happens on blur / Enter / step actions, and blur / Enter also round to the precision `formatOptions` displays.
- **Hidden input for submission.** Because the displayed text can be formatted, the visible input does **not** carry `name`; setting `name` mounts a hidden `<input>` with the raw number so native `<form>` serialization sees the value, not "$1,234.50". A disabled control is skipped automatically.
- **A native form reset reaches the value.** When the owning `<form>` resets, the spinbutton shows the text it showed when it first rendered and that text is parsed back into `value()`, so the hidden input submits the first-render value again, or nothing when the field started empty.
- **A value written while focused reaches the field.** A consumer reset on submit or a `[formField]` write lands in the focused spinbutton at once, so the next keystroke starts from it. Text you type is left alone until it commits, even when the formatted display differs from it.
- **Disabled reflects through one channel per piece.** On the spinbutton, the native `disabled` attribute already exposes the unavailable state through HTML-AAM, so no `aria-disabled` is emitted alongside it. The stepper buttons use `aria-disabled` instead, so they keep focus at the bound. `[data-disabled]` matches every disabled piece, so style the disabled state with it.
- **Falsy state styling selects on absence.** `aria-readonly` / `aria-required` / `aria-invalid` / `aria-busy` are emitted only when truthy, so style the off state with `:not([aria-invalid])`, never `[aria-invalid="false"]`.
- **`@angular/forms` is an optional peer.** If you're not using Signal Forms, don't install it: the directive runs fine on a plain `[(value)]` binding (the only `@angular/forms/signals` reference is a type import, erased at build).

## Styling

forty-cdk ships no styles: put your own class on each piece and key your CSS off the `data-*` attributes listed under [API](#api), not off the `for*` selectors ([Styling forty-cdk](../../../docs/styling.md) explains why).

```css
.step-btn[data-disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}
```

## Wrapping in a design system

[Wrapping form primitives](../../../docs/wrapping-form-primitives.md) documents both supported wrapper patterns: `hostDirectives` with the exported `FOR_NUMBER_INPUT_HOST_DIRECTIVE_INPUTS` / `FOR_NUMBER_INPUT_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing.
