# OTP Input

A one-time-code / PIN field on the single-input model: typed and pasted characters fill styled slots, with masking, character filtering and a complete event.

Headless and styleless. One real `<input maxlength=N>` carries the whole code as a `string`, and the `[forOtpInputSlot]` pieces are a pure styling surface painted over it. There is **no** WAI-ARIA APG pattern for OTP — this approach gives the cleanest screen-reader experience (one ordinary text field, not "edit text, 1 of 6" announced N times), native mobile SMS autofill via `autocomplete="one-time-code"`, and native paste / caret / selection. It implements Angular's `FormValueControl<string>` from `@angular/forms/signals`, so it auto-wires with `[formField]` and auto-associates inside a [`[forField]`](../field/README.md) — label, description, and error wiring — with zero extra markup.

## How it works

Apply `[forOtpInput]` on a **wrapper** element. It becomes a `role="group"` and the directive injects the single visually-hidden-but-interactive `<input>` inside it. You style that input to **overlay the slots** (typically `position: absolute; inset: 0` with a transparent or `caret-color`-only appearance); pointer events land on it and native caret positioning drives which slot is active. The slots are inert visual boxes.

The focusable, submittable control is the injected `<input>`, not the `role="group"` host — so form-control state, the field association, and native `name` submission all live on that input.

## Anatomy

```html
<div
  forOtpInput
  [(value)]="code"
  [length]="6"
  type="numeric"
  ariaLabel="Verification code"
  #otp="forOtpInput"
>
  <!-- one [forOtpInputSlot] per index in otp.slots() -->
  <div forOtpInputSlot [index]="i" #s="forOtpInputSlot">
    {{ s.char() }}
    <!-- rendered only when s.hasFakeCaret() is true -->
    <span class="caret"></span>
  </div>
</div>
```

## Exported pattern constants

`OTP_REGEXP_ONLY_DIGITS`, `OTP_REGEXP_ONLY_CHARS`, `OTP_REGEXP_ONLY_DIGITS_AND_CHARS` — bind one to `[allowedPattern]` for a custom restriction. `allowedCharForType` / `inputModeForType` expose the `type` → RegExp / `inputmode` mapping.

## Examples

### Stand-alone

```ts
import { Component, signal } from '@angular/core';
import { ForOtpInput, ForOtpInputSlot } from 'forty-cdk/otp-input';

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

### Field composition

Drop the OTP inside a `[forField]` and it auto-associates with the label, description, and error region — no `id` / `aria-*` wiring by hand. The label's `for`, `aria-labelledby`, `aria-describedby`, and `aria-errormessage` all land on the real input.

```ts
import { Component, signal } from '@angular/core';
import { form, required, FormField } from '@angular/forms/signals';
import { ForField, ForFieldError, ForLabel } from 'forty-cdk/field';
import { ForOtpInput, ForOtpInputSlot } from 'forty-cdk/otp-input';

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

## API

### `ForOtpInput`

| Property                                                               | Type                                                 | Description                                                                                                                                           |
| ---------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                                                                | `model<string>`                                      | Two-way bindable code. Rendered length is clamped to `length`.<br>**Default:** —                                                                      |
| `length`                                                               | `input.required<number>`                             | Number of characters / slots.<br>**Default:** —                                                                                                       |
| `type`                                                                 | `input<'numeric' \| 'alphanumeric' \| 'alphabetic'>` | Allowed character class. Ignored when `allowedPattern` is set.<br>**Default:** `'numeric'`                                                            |
| `allowedPattern`                                                       | `input<RegExp \| null>`                              | Custom allowed-character RegExp (tested per character); overrides `type`.<br>**Default:** —                                                           |
| `mask`                                                                 | `input<boolean>`                                     | Obscure the rendered `char()` (PIN entry); `value()` stays raw.<br>**Default:** —                                                                     |
| `oneTimeCode`                                                          | `input<boolean>`                                     | Toggle `autocomplete="one-time-code"` for SMS autofill.<br>**Default:** `true`                                                                        |
| `pasteTransformer`                                                     | `input<((pasted: string) => string) \| null>`        | Rewrite pasted text before it fills the slots (e.g. strip separators).<br>**Default:** —                                                              |
| `ariaLabel`                                                            | `input<string \| null>`                              | Accessible name for the group, also reflected onto the real input when no field label applies. Emits `aria-label` only when truthy.<br>**Default:** — |
| `disabled` / `readonly` / `required` / `invalid` / `pending` / `dirty` | `input<boolean>`                                     | Shared form-control flags (see [Field](../field/README.md)).<br>**Default:** —                                                                        |
| `name`                                                                 | `input<string>`                                      | Reflected as the real input's `name` for native form submission.<br>**Default:** —                                                                    |
| `touched`                                                              | `model<boolean>`                                     | Set to `true` on blur.<br>**Default:** —                                                                                                              |
| `complete`                                                             | `output<string>`                                     | Output. Fires when every slot is filled, by typing or paste.<br>**Default:** —                                                                        |
| `reject`                                                               | `output<{ value: string }>`                          | Output. Fires when an entered / pasted character is rejected by `type` / `allowedPattern`.<br>**Default:** —                                          |

| Data attribute  | Values           |
| --------------- | ---------------- |
| `data-complete` | present / absent |
| `data-disabled` | present / absent |

The injected real `<input>` (created inside the `[forOtpInput]` wrapper) additionally carries `data-disabled`, `data-readonly`, `data-touched`, `data-dirty`, `data-pending`, and `data-invalid` (present / absent), mirroring its form-control flags.

`ForOtpInput` also exposes a `slots()` signal (`readonly number[]`) for the `@for`, a `filled()` signal (reflected as `data-complete`), and a `focus()` method.

> **Why `allowedPattern`, not `pattern`?** `FormUiControl.pattern` is reserved by Signal Forms for an array of validation patterns the `[formField]` directive binds in. Reusing the name would break the `FormValueControl` contract and let the field overwrite your character filter, so the custom char-class RegExp is `allowedPattern`.

### Slot (`ForOtpInputSlot`)

| Property         | Type                     | Description                                                                        |
| ---------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `index`          | `input.required<number>` | This slot's 0-based position.<br>**Default:** —                                    |
| `char()`         | `Signal<string \| null>` | The slot's character (masked when `mask`), or `null` when empty.<br>**Default:** — |
| `active()`       | `Signal<boolean>`        | Whether this slot is the active caret position.<br>**Default:** —                  |
| `hasFakeCaret()` | `Signal<boolean>`        | Whether to render a fake caret here (active + empty + focused).<br>**Default:** —  |

| Data attribute | Values                                |
| -------------- | ------------------------------------- |
| `data-active`  | present / absent (current caret slot) |
| `data-empty`   | present / absent (no character)       |

## Accessibility

- **One real text field, not N boxes.** The `role="group"` wrapper carries the `ariaLabel`; the single `<input>` inside it is the focusable control, and it reflects the same `ariaLabel` as its own `aria-label` whenever no field-provided `aria-labelledby` applies (a `[forField]` label always wins). Screen readers announce the group name on entry and treat the code as one ordinary, named text field.
- **Mobile autofill & keypad.** `autocomplete="one-time-code"` (toggle with `oneTimeCode`) drives SMS autofill; `inputmode` is `numeric` for `type="numeric"` (plus a legacy `pattern="[0-9]*"` for older iOS), `text` otherwise.
- **Character filtering happens live.** Rejected characters (per `type` / `allowedPattern`) are dropped before they reach the value and fire `(reject)`. Paste runs through `pasteTransformer`, is filtered, and sliced to `length`. A rejected keystroke never moves the insertion point: the caret stays at the position it was being edited at, so typing a disallowed character mid-code leaves the next character landing in the slot the user was on. A paste replaces the whole code and leaves the caret at the end.
- **Fake caret is yours to style.** The slot exposes `hasFakeCaret()`; render and animate the blink in CSS, gated on `prefers-reduced-motion`. There is no JS-driven blink.
- **Disabled reflects through one channel.** The native `disabled` attribute already exposes the unavailable state through HTML-AAM, so no `aria-disabled` is emitted alongside it — style the disabled state with `:disabled` or `[data-disabled]`.
- **Falsy state styling selects on absence.** `aria-readonly` / `aria-required` / `aria-invalid` / `aria-busy` are emitted only when truthy — style the off state with `:not([aria-invalid])`, never `[aria-invalid="false"]`.
- **`@angular/forms` is an optional peer.** The directive runs fine on a plain `[(value)]` binding; the only `@angular/forms/signals` reference is a type import, erased at build.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

```css
.otp-input-slot[data-active] {
  outline: 2px solid var(--ring);
}
.otp-input-slot[data-empty] {
  color: transparent;
}
```

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_OTP_INPUT_HOST_DIRECTIVE_INPUTS` / `FOR_OTP_INPUT_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../docs/wrapping-form-primitives.md).
