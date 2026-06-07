# OTP Input

Headless OTP / PIN input on the **single-input** model: one real `<input maxlength=N>` carries the whole code as a `string`, and the `[forOtpInputSlot]` pieces are a pure styling surface painted over it. There is **no** WAI-ARIA APG pattern for OTP — this approach (shadcn [`input-otp`](https://github.com/guilhermerodz/input-otp), Spartan `BrnInputOtp`) gives the cleanest screen-reader experience (one ordinary text field, not "edit text, 1 of 6" announced N times), native mobile SMS autofill via `autocomplete="one-time-code"`, and native paste / caret / selection.

It implements Angular's `FormValueControl<string>` from `@angular/forms/signals`, so it auto-wires with `[formField]` and auto-associates inside a [`[forField]`](../field/README.md) — label, description, and error wiring — with zero extra markup.

## How it works

Apply `[forOtpInput]` on a **wrapper** element. It becomes a `role="group"` and the directive injects the single visually-hidden-but-interactive `<input>` inside it. You style that input to **overlay the slots** (typically `position: absolute; inset: 0` with a transparent or `caret-color`-only appearance); pointer events land on it and native caret positioning drives which slot is active. The slots are inert visual boxes.

The focusable, submittable control is the injected `<input>`, not the `role="group"` host — so form-control state, the field association, and native `name` submission all live on that input.

## Pieces

| Class             | Selector            | Element | Role                                                                                 |
| ----------------- | ------------------- | ------- | ------------------------------------------------------------------------------------ |
| `ForOtpInput`     | `[forOtpInput]`     | wrapper | `role="group"`. Owns the value, injects the real input, parsing / filtering / paste. |
| `ForOtpInputSlot` | `[forOtpInputSlot]` | any     | One styling surface per index. Exposes `char()` / `active()` / `hasFakeCaret()`.     |

## Inputs / models (`ForOtpInput`)

| API                                                                    | Type                                                 | Description                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `value`                                                                | `model<string>`                                      | Two-way bindable code. Rendered length is clamped to `length`.                          |
| `length`                                                               | `input.required<number>`                             | Number of characters / slots.                                                           |
| `type`                                                                 | `input<'numeric' \| 'alphanumeric' \| 'alphabetic'>` | Allowed character class. Defaults to `'numeric'`. Ignored when `allowedPattern` is set. |
| `allowedPattern`                                                       | `input<RegExp \| null>`                              | Custom allowed-character RegExp (tested per character); overrides `type`.               |
| `mask`                                                                 | `input<boolean>`                                     | Obscure the rendered `char()` (PIN entry); `value()` stays raw.                         |
| `oneTimeCode`                                                          | `input<boolean>`                                     | Toggle `autocomplete="one-time-code"` for SMS autofill. Defaults to `true`.             |
| `pasteTransformer`                                                     | `input<((pasted: string) => string) \| null>`        | Rewrite pasted text before it fills the slots (e.g. strip separators).                  |
| `ariaLabel`                                                            | `input<string \| null>`                              | Accessible name for the group. Emits `aria-label` only when truthy.                     |
| `disabled` / `readonly` / `required` / `invalid` / `pending` / `dirty` | `input<boolean>`                                     | Shared form-control flags (see [Field](../field/README.md)).                            |
| `name`                                                                 | `input<string>`                                      | Reflected as the real input's `name` for native form submission.                        |
| `touched`                                                              | `model<boolean>`                                     | Set to `true` on blur.                                                                  |

| Output          | Type                        | Fires                                                                        |
| --------------- | --------------------------- | ---------------------------------------------------------------------------- |
| `valueComplete` | `output<string>`            | When every slot is filled, by typing or paste.                               |
| `valueInvalid`  | `output<{ value: string }>` | When an entered / pasted character is rejected by `type` / `allowedPattern`. |

`ForOtpInput` also exposes a `slots()` signal (`readonly number[]`) for the `@for`, a `complete()` signal, and a `focus()` method.

> **Why `allowedPattern`, not `pattern`?** `FormUiControl.pattern` is reserved by Signal Forms for an array of validation patterns the `[formField]` directive binds in. Reusing the name would break the `FormValueControl` contract and let the field overwrite your character filter, so the custom char-class RegExp is `allowedPattern`.

### Slot (`ForOtpInputSlot`)

| API              | Type                     | Description                                                      |
| ---------------- | ------------------------ | ---------------------------------------------------------------- |
| `index`          | `input.required<number>` | This slot's 0-based position.                                    |
| `char()`         | `Signal<string \| null>` | The slot's character (masked when `mask`), or `null` when empty. |
| `active()`       | `Signal<boolean>`        | Whether this slot is the active caret position.                  |
| `hasFakeCaret()` | `Signal<boolean>`        | Whether to render a fake caret here (active + empty + focused).  |

The slot host reflects boolean `data-active` / `data-highlighted` (current caret slot) and `data-empty` (no character) for CSS.

## Exported pattern constants

`OTP_REGEXP_ONLY_DIGITS`, `OTP_REGEXP_ONLY_CHARS`, `OTP_REGEXP_ONLY_DIGITS_AND_CHARS` — bind one to `[allowedPattern]` for a custom restriction. `allowedCharForType` / `inputModeForType` expose the `type` → RegExp / `inputmode` mapping.

## Usage

```ts
import { Component, signal } from '@angular/core';
import { ForOtpInput, ForOtpInputSlot } from 'forty-cdk';

@Component({
  selector: 'demo-otp',
  imports: [ForOtpInput, ForOtpInputSlot],
  template: `
    <div
      forOtpInput
      class="otp-input"
      [(value)]="code"
      [length]="6"
      type="numeric"
      ariaLabel="Verification code"
      #otp="forOtpInput"
    >
      @for (i of otp.slots(); track i) {
        <div forOtpInputSlot [index]="i" #s="forOtpInputSlot" class="slot otp-input-slot">
          {{ s.char() }}
          @if (s.hasFakeCaret()) {
            <span class="caret"></span>
          }
        </div>
      }
    </div>
    <p>{{ code() }}</p>
  `,
})
export class DemoOtp {
  readonly code = signal('');
}
```

The styling is yours. The key rule: make the injected `<input>` overlay the slots so it stays the interactive surface, e.g.

```css
.slot {
  position: relative;
  width: 2.5rem;
  height: 3rem; /* ... */
}
.otp-input {
  position: relative;
  display: flex;
  gap: 0.5rem;
}
.otp-input > input {
  position: absolute;
  inset: 0;
  opacity: 0;
}
.caret {
  /* style + animate; gate the blink on prefers-reduced-motion */
}
```

## Field composition

Drop the OTP inside a `[forField]` and it auto-associates with the label, description, and error region — no `id` / `aria-*` wiring by hand. The label's `for`, `aria-labelledby`, `aria-describedby`, and `aria-errormessage` all land on the real input.

```ts
import { Component, signal } from '@angular/core';
import { form, required, FormField } from '@angular/forms/signals';
import { ForField, ForLabel, ForFieldError, ForOtpInput, ForOtpInputSlot } from 'forty-cdk';

@Component({
  selector: 'demo-otp-field',
  imports: [ForField, ForLabel, ForFieldError, ForOtpInput, ForOtpInputSlot, FormField],
  template: `
    <div forField>
      <label forLabel>One-time code</label>
      <div
        forOtpInput
        class="otp-input"
        [formField]="login.otp"
        [length]="6"
        type="numeric"
        #otp="forOtpInput"
      >
        @for (i of otp.slots(); track i) {
          <div forOtpInputSlot class="otp-input-slot" [index]="i" #s="forOtpInputSlot">
            {{ s.char() }}
          </div>
        }
      </div>
      @if (err.shown()) {
        <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
      }
    </div>
  `,
})
export class DemoOtpField {
  readonly model = signal({ otp: '' });
  readonly login = form(this.model, (l) => {
    required(l.otp, { message: 'Enter the 6-digit code' });
  });
}
```

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

### Data attributes

| Piece               | Attribute          | Values           |
| ------------------- | ------------------ | ---------------- |
| `[forOtpInput]`     | `data-complete`    | present / absent |
| `[forOtpInput]`     | `data-disabled`    | present / absent |
| `[forOtpInputSlot]` | `data-active`      | present / absent |
| `[forOtpInputSlot]` | `data-highlighted` | present / absent |
| `[forOtpInputSlot]` | `data-empty`       | present / absent |

The injected real `<input>` (created inside the `[forOtpInput]` wrapper) additionally carries `data-disabled`, `data-readonly`, `data-touched`, `data-dirty`, `data-pending`, and `data-invalid` (present / absent), mirroring its form-control flags.

```css
.otp-input-slot[data-active] {
  outline: 2px solid var(--ring);
}
.otp-input-slot[data-empty] {
  color: transparent;
}
```

## Accessibility notes

- **One real text field, not N boxes.** The `role="group"` wrapper carries the `ariaLabel`; the single `<input>` inside it is the focusable control. Screen readers announce the group name on entry and treat the code as one ordinary text field.
- **Mobile autofill & keypad.** `autocomplete="one-time-code"` (toggle with `oneTimeCode`) drives SMS autofill; `inputmode` is `numeric` for `type="numeric"` (plus a legacy `pattern="[0-9]*"` for older iOS), `text` otherwise.
- **Character filtering happens live.** Rejected characters (per `type` / `allowedPattern`) are dropped before they reach the value and fire `valueInvalid`. Paste runs through `pasteTransformer`, is filtered, and sliced to `length`.
- **Fake caret is yours to style.** The slot exposes `hasFakeCaret()`; render and animate the blink in CSS, gated on `prefers-reduced-motion`. There is no JS-driven blink.
- **Falsy state styling selects on absence.** `aria-disabled` / `aria-readonly` / `aria-required` / `aria-invalid` / `aria-busy` are emitted only when truthy — style the off state with `:not([aria-invalid])`, never `[aria-invalid="false"]`.
- **`@angular/forms` is an optional peer.** The directive runs fine on a plain `[(value)]` binding; the only `@angular/forms/signals` reference is a type import, erased at build.
