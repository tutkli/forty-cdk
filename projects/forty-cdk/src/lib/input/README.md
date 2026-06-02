# Input / Textarea

Headless text form controls that implement Angular's `FormValueControl<string>` from `@angular/forms/signals`, so they auto-wire with `[formField]` and auto-associate inside a [`[forField]`](../field/README.md) — label, description, and error wiring — with zero extra markup.

These are thin wrappers, not re-implementations: the native `<input>` / `<textarea>` keeps its own `type`, caret, IME composition, and native form submission. The directive only bridges the value to a signal and reflects validation state.

## Pieces

| Class | Selector | Element | Role |
| --- | --- | --- | --- |
| `ForInput` | `[forInput]` | `<input>` | Single-line text control. |
| `ForTextarea` | `[forTextarea]` | `<textarea>` | Multi-line text control. |

Both expose the identical API below.

## Inputs / models

| API | Type | Description |
| --- | --- | --- |
| `value` | `model<string>` | Two-way bindable text value. Defaults to `''`; reflected as `data-empty` while empty. |
| `disabled` | `input<boolean>` | Reflects native `disabled` + `aria-disabled="true"` + `data-disabled`. |
| `readonly` | `input<boolean>` | Reflects native `readonly` + `aria-readonly="true"` + `data-readonly`. |
| `required` | `input<boolean>` | Reflects `aria-required="true"`. |
| `invalid` | `input<boolean>` | Reflects `aria-invalid="true"` + `data-invalid`. |
| `pending` | `input<boolean>` | Reflects `aria-busy="true"` + `data-pending` while async validation is in flight. |
| `dirty` | `input<boolean>` | Reflects `data-dirty`. |
| `name` | `input<string>` | Reflected on the native `name` attribute for form submission. |
| `errors` | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Validation errors fed by `[formField]`. The directive does not render them — that is consumer territory. |
| `touched` | `model<boolean>` | Set to `true` on blur. Two-way so the field can read it back. |

The host gets `data-empty` (while the value is `''`), `data-disabled`, and `data-readonly` for CSS hooks, plus `data-touched` / `data-dirty` / `data-pending` / `data-invalid` from the shared form-control reflection.

## Stand-alone usage

```ts
import { Component, signal } from '@angular/core';
import { ForInput, ForTextarea } from 'forty-cdk';

@Component({
  selector: 'demo-profile',
  imports: [ForInput, ForTextarea],
  template: `
    <input forInput [(value)]="email" type="email" placeholder="you@example.com" />
    <textarea forTextarea [(value)]="bio" placeholder="About you"></textarea>
    <p>{{ email() }} — {{ bio().length }} chars</p>
  `,
})
export class DemoProfile {
  readonly email = signal('');
  readonly bio = signal('');
}
```

## Field composition

Drop the control inside a `[forField]` and it auto-associates with the label, description, and error region — no `id` / `aria-*` wiring by hand.

```ts
import { Component, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { FormField } from '@angular/forms/signals';
import { ForField, ForLabel, ForFieldError, ForInput } from 'forty-cdk';

@Component({
  selector: 'demo-signup',
  imports: [ForField, ForLabel, ForFieldError, ForInput, FormField],
  template: `
    <form>
      <div forField>
        <label forLabel>Full name</label>
        <input forInput [formField]="profile.name" />
        @if (err.shown()) {
          <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
        }
      </div>
    </form>
  `,
})
export class DemoSignup {
  readonly model = signal({ name: '' });
  readonly profile = form(this.model, (p) => {
    required(p.name, { message: 'Name is required' });
  });
}
```

`[formField]` detects the `FormValueControl<string>` interface and wires everything — value, disabled, required, invalid, errors, touched — without any glue.

## Accessibility notes

- **The native element is the control.** It stays the focusable, submittable form field, so screen readers, mobile keyboards (`type`, `inputmode`), autofill, and native validation all behave exactly as they would on a bare `<input>` / `<textarea>`.
- **No hidden input.** Because the visible element carries `name` and its `.value` _is_ the form value, the browser serializes it natively — unlike `ForSwitch` (a `<button>`) or `ForNumberInput` (formatted display), which mount a hidden input. A disabled control is skipped by native serialization automatically.
- **Falsy state styling selects on absence.** `aria-disabled` / `aria-readonly` / `aria-required` / `aria-invalid` / `aria-busy` are emitted only when truthy — style the off state with `:not([aria-invalid])`, never `[aria-invalid="false"]`.
- **`@angular/forms` is an optional peer.** If you're not using Signal Forms, don't install it — the directive runs fine on a plain `[(value)]` binding (the only `@angular/forms/signals` reference is a type import, erased at build).
