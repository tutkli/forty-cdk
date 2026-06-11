# Switch

Headless implementation of the [WAI-ARIA Switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) that doubles as a `FormCheckboxControl` for Angular Signal Forms.

A switch is a binary on/off control whose state changes immediately on activation — distinct semantically from a checkbox (which represents a deferred selection).

## Pieces

| Class       | Selector      | Role                                                                 |
| ----------- | ------------- | -------------------------------------------------------------------- |
| `ForSwitch` | `[forSwitch]` | Single directive on a `<button>`. Wires ARIA + click + Signal Forms. |

## Inputs / models

| API        | Type                                                      | Description                                                                                              |
| ---------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `checked`  | `model<boolean>`                                          | Two-way bindable on/off state. Required by `FormCheckboxControl`.                                        |
| `disabled` | `input<boolean>`                                          | Ignores click; reflects `aria-disabled="true"` and `data-disabled`. Stays focusable (per APG).           |
| `readonly` | `input<boolean>`                                          | Ignores click; reflects `aria-readonly="true"`. Stays focusable.                                         |
| `required` | `input<boolean>`                                          | Reflects `aria-required="true"`.                                                                         |
| `invalid`  | `input<boolean>`                                          | Reflects `aria-invalid="true"`.                                                                          |
| `pending`  | `input<boolean>`                                          | Reflects `aria-busy="true"` while async validation is in flight.                                         |
| `name`     | `input<string \| undefined>`                              | Reflects on `name`.                                                                                      |
| `errors`   | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Validation errors fed by `[formField]`. The directive does not render them — that is consumer territory. |
| `touched`  | `model<boolean>`                                          | Set to `true` on blur. Two-way so the field can read it back.                                            |

The host gets `data-state="checked" \| "unchecked"`, `data-disabled`, and `data-readonly` for CSS hooks.

## Stand-alone usage

```ts
import { Component, signal } from '@angular/core';
import { ForSwitch } from 'forty-cdk';

@Component({
  selector: 'demo-toggle',
  imports: [ForSwitch],
  template: `
    <button forSwitch class="switch" [(checked)]="enabled">
      <span class="thumb"></span>
    </button>
    <p>Notifications: {{ enabled() ? 'on' : 'off' }}</p>
  `,
})
export class DemoToggle {
  readonly enabled = signal(false);
}
```

## Signal Forms usage

`ForSwitch` implements `FormCheckboxControl`. The `[formField]` directive detects the interface and wires everything — value, disabled, required, invalid, errors, touched — without any glue.

```ts
import { Component, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { Field } from '@angular/forms';
import { ForSwitch } from 'forty-cdk';

interface Settings {
  notifications: boolean;
  termsAccepted: boolean;
}

@Component({
  selector: 'demo-settings',
  imports: [ForSwitch /* , FormField from @angular/forms */],
  template: `
    <button forSwitch [formField]="settings.notifications"></button>
    <button forSwitch [formField]="settings.termsAccepted"></button>
  `,
})
export class DemoSettings {
  readonly model = signal<Settings>({ notifications: false, termsAccepted: false });
  readonly settings = form(this.model, (s) => {
    required(s.termsAccepted);
  });
}
```

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

### Data attributes

| Piece         | Attribute       | Values                   |
| ------------- | --------------- | ------------------------ |
| `[forSwitch]` | `data-state`    | `checked` \| `unchecked` |
| `[forSwitch]` | `data-disabled` | present \| absent        |
| `[forSwitch]` | `data-readonly` | present \| absent        |
| `[forSwitch]` | `data-touched`  | present \| absent        |
| `[forSwitch]` | `data-dirty`    | present \| absent        |
| `[forSwitch]` | `data-pending`  | present \| absent        |
| `[forSwitch]` | `data-invalid`  | present \| absent        |

```css
.switch .thumb {
  transition: transform 150ms;
}

.switch[data-state='checked'] .thumb {
  transform: translateX(100%);
}
```

## Accessibility notes

- **Use a `<button>`.** The directive forces `type="button"` to prevent submit-by-Enter inside a `<form>`. Enter and Space toggle the switch via native button behavior. On other elements (e.g. `<div>`), keyboard activation is on you.
- **A disabled switch stays focusable** (per APG): it reflects `aria-disabled="true"` + `data-disabled=""` rather than the native `disabled` attribute, so assistive tech still announces it while click / keyboard activation is a no-op. Form-submit exclusion is handled by the hidden `<input>`, not the visible button.
- **`role="switch"`** is announced as "switch, on/off" by screen readers, distinct from "checkbox, checked/not checked".
- **`@angular/forms` is an optional peer.** If you're not using Signal Forms, don't install it — the directive runs fine without it (only the type import from `@angular/forms/signals` is type-only and erased at build).

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_SWITCH_HOST_DIRECTIVE_INPUTS` / `FOR_SWITCH_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).
