---
title: Field
group: primitives
archetype: [composable-ui]
---

# Field

Headless wiring that ties a label, description and error region to a control, and reflects validation state as data-\* for styling. Any forty-cdk form control auto-associates; native inputs opt in with forFieldControl.

It renders **nothing** and imposes no layout, and there is **no control contract to implement**: every forty-cdk form primitive (`FormValueControl` / `FormCheckboxControl`) already exposes the state the field needs (`id` / `aria-labelledby` / `aria-describedby` / `aria-errormessage` association plus `data-*` validation hooks), so wrapping one in a `[forField]` auto-associates it with zero extra markup.

## When to choose

- **Field**: the wiring, not the control. It owns the control's id, ties `[forLabel]`, `[forFieldDescription]` and `[forFieldError]` to it through `aria-labelledby` / `aria-describedby` / `aria-errormessage`, and reflects validation state as `data-*`. It renders no element and holds no value.
- **[Input](../input/README.md)** (and every other form primitive) is what holds the value. A field wraps exactly one of them; it never stands in for one.
- **[Fieldset](../fieldset/README.md)**: the grouping above it, with one accessible name and an optional shared disabled state over several fields.

## Anatomy

```html
<div forField #field="forField">
  <label forLabel>Email address</label>
  <input forFieldControl type="email" required />
  <p forFieldDescription>We'll only use this to send receipts.</p>
  @if (field.invalid()) {
  <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
  }
</div>
```

## How the control connects

- **forty-cdk controls** (`forSwitch`, `forCheckbox`, `forSlider`, `forSelect`, `forListbox`, `forCombobox`, `forRadioGroup`, `forToggle`, `forToggleGroup`) auto-wire, because they inherit the association from the shared form base. No marker needed.
- **Native controls** add `[forFieldControl]` and drive validation state via its `invalid` / `required` / `disabled` / `touched` inputs.

`ForField` owns the control's `id` (it assigns one if the control has none, otherwise it adopts the existing id), so a `<label forLabel>`'s `for` always resolves to the control.

**One control per field.** A `[forField]` owns a single `controlId`, so wrap each control in its own field and group related fields with `[forFieldset]`. Registering a second control logs a dev-mode warning; the last one registered wins, and unmounting it falls back to the previous still-mounted control.

**Overlay surfaces are field boundaries.** A control inside `[forDatePickerContent]`, `[forTimePickerContent]`, `[forSelectContent]`, `[forComboboxContent]`, `[forPopoverContent]`, `[forDialog]` or `[forDrawer]` never registers with a `[forField]` around the overlay, so a date-time picker's time field leaves the field reflecting the picker while its panel is open. A `[forField]` placed inside the surface still wires the control next to it.

For an auxiliary control that only writes into the field's control, such as a picker beside a segmented time field, put `[forFieldBoundary]` on its root. The field keeps reflecting the control it labels:

```html
<div forField>
  <span forLabel>Start time</span>
  <div forTimeField [formField]="form.start">…</div>
  <div forTimePicker forFieldBoundary [value]="form.start().value()" (valueChange)="commit($event)">
    …
  </div>
</div>
```

Inside a boundary `FOR_FIELD_CONTEXT` resolves to `null`, so `[forFieldDescription]` and `[forFieldError]` need a `[forField]` of their own there.

## Positioning anchor

A design-system form field usually draws the decorated box around the control it projects, in its own template. A `[forSelectAnchor]` / `[forComboboxAnchor]` / `[forDatePickerAnchor]` / `[forTimePickerAnchor]` on that box cannot reach the projected root, but a `[forFieldAnchor]` can, because both sides reach the field. `[forSelect]`, `[forCombobox]`, `[forDatePicker]` and `[forTimePicker]` inside the field then position their panel against the box, and `--for-floating-anchor-width` reports its width:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForField, ForFieldAnchor } from 'forty-cdk/field';

@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [ForField],
  imports: [ForFieldAnchor],
  template: `
    <ng-content select="[forLabel]" />
    <div forFieldAnchor class="field-box">
      <ng-content />
    </div>
  `,
})
export class AppFormField {}
```

```html
<app-form-field>
  <label forLabel>Country</label>
  <div forSelect [(value)]="country">
    <button forSelectTrigger><span forSelectValue placeholder="Pick one"></span></button>
    …
  </div>
</app-form-field>
```

A control resolves its anchor in this order: its own `[for…Anchor]`, then the field's `[forFieldAnchor]`, then its trigger or input. Without a `[forFieldAnchor]` nothing moves. `[forFieldBoundary]` leaves the anchor in place, so an auxiliary picker behind it still aligns to the box, while a control inside an overlay surface ignores the anchor of a field around that surface. One `[forFieldAnchor]` per field; a second one warns in dev mode.

## `ForFieldError` — automatic Signal Forms errors

`ForFieldError` reads the control's `errors()` automatically and exposes them as signals:

- `errors()`: the raw `ValidationError[]`.
- `messages()`: `string[]` of human-readable messages.
- `hasErrors()` / `shown()`: `shown()` is `true` when the control is invalid and has errors.

You render them; the field handles the ARIA. The error id is wired into `aria-errormessage` (and folded into `aria-describedby`) only while the control is invalid.

Gate the region's `@if` on the field's `invalid()` (exposed via the `[forField]` export, `#field="forField"`) or on the bound Signal Forms field, **not** on a reference to `ForFieldError` itself, which is block-scoped to the `@if` body and so can't appear in the condition that mounts it.

## Label-click activation

Clicking the label activates the control on both host shapes, not just focuses it. A native `<label forLabel>` emits `for` and the browser forwards the click; a non-`<label>` `[forLabel]` (e.g. `<span forLabel>`) has no native `for` forwarding, so the directive forwards the click itself. Either way, the label matches native `<label for>` behavior consistently: clicking it toggles a `[forSwitch]` / checkbox-role control, activates a button-host control, or focuses a text input.

> Note: composite controls whose host is not the focusable element (`forListbox`, `forSelect`, `forCombobox`) still receive `aria-labelledby` correctly, and a label click is forwarded to the control's nominated focusable element rather than the wrapper host: the Select trigger, the input of an editable Combobox, or the trigger of a picker-anatomy Combobox, even while its open panel holds the input the label names.

Pressing the label of an overlay control (`forSelect`, a picker-anatomy `forCombobox`, `forDatePicker`, `forTimePicker`) is pressing its trigger: it opens a closed panel and closes an open one, with one `openChange` per press, and focus lands on the trigger when the panel closes. That holds inside a focusable container such as a popover or dialog surface, because a press on the label moves focus nowhere but the control. The cost is that a text selection cannot start on the label.

A press on other interactive content inside the label (a `<button>`, an `<a href>`, a form element, a `<summary>` or any element with a `tabindex`) belongs to that element, as it does inside a native `<label>`. The control is neither clicked nor focused, the element takes focus as usual, and an open panel closes as it does on any outside press. A help button or a "learn more" link can therefore sit inside the label.

Where a composite is named on the wrapper itself (the `role="group"` of `[forDateField]`, `[forTimeField]`, `[forDateRangeField]` and `[forTimeRangeField]`), the association stays on that group and the label click moves focus to the control's own entry point instead: the first editable segment, or nowhere while the field is disabled. A native `<label>` reaches it too, because `for` pointing at a `role="group"` is not a [labelable element](https://html.spec.whatwg.org/multipage/forms.html#category-label) and the browser forwards nothing there, so the directive forwards it. Any control implementing `FormValueControl.focus` gets the same treatment.

## Examples

Focus the control through its label and watch the `[forField]` host: it reflects `data-disabled`, `data-required`, `data-touched` and `data-invalid` for the whole block.

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForField, ForFieldControl, ForFieldDescription, ForLabel } from 'forty-cdk/field';

@Component({
  selector: 'app-field-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForField, ForLabel, ForFieldControl, ForFieldDescription],
  template: `
    <div forField class="field">
      <label forLabel class="field-label">
        <span class="field-label-text">Email address</span>
        <input
          forFieldControl
          class="input"
          type="email"
          placeholder="jane@example.com"
          required
          aria-required="true"
        />
      </label>
      <p forFieldDescription class="field-desc">We'll only use this to send receipts.</p>
    </div>
  `,
})
export class FieldDefaultExample {}
```

### States

One class and one directive, four states. The control's own `required`, `invalid` and `disabled` are reflected on the `[forField]` host as `data-required`, `data-invalid` and `data-disabled`, so the label, the input and the description all key on one element.

### Validation with Signal Forms

`[forFieldError]` reads the control's Signal Forms errors automatically. You render `err.messages()`; the field wires `aria-errormessage` and folds the id into `aria-describedby` while invalid. The `[forCheckbox]` auto-associates because it extends the shared form base. Tick then untick to surface the required error.

## API

### `ForField`

Root container (`[forField]`). Owns the generated ids and reflects the registered control's validation state. The reflected state mirrors the registered control: `data-invalid` while it is invalid, `data-required` while it is required, `data-touched` once it has been touched, and `data-disabled` from the control's own disabled state OR a surrounding `[forFieldset]`'s `disabled`.

| Data attribute  | Values           |
| --------------- | ---------------- |
| `data-invalid`  | present / absent |
| `data-disabled` | present / absent |
| `data-required` | present / absent |
| `data-touched`  | present / absent |

### `ForLabel`

Accessible label (`[forLabel]`). Inside a field it adopts the field's `labelId` and wires `aria-labelledby` (and `for` on a native `<label>`); usable standalone.

### `ForFieldDescription`

Hint / description (`[forFieldDescription]`). Adopts the field's `descriptionId` and wires `aria-describedby`.

### `ForFieldError`

Error region (`[forFieldError]`, `role="alert"`). Reads the control's Signal Forms errors automatically and exposes them as signals.

| Property    | Type                        | Description                                        |
| ----------- | --------------------------- | -------------------------------------------------- |
| `errors`    | `Signal<ValidationError[]>` | The control's current raw validation errors.       |
| `messages`  | `Signal<readonly string[]>` | Human-readable messages derived from `errors`.     |
| `hasErrors` | `Signal<boolean>`           | `true` when the control has at least one error.    |
| `shown`     | `Signal<boolean>`           | `true` when the control is invalid and has errors. |

### `ForFieldBoundary`

Field boundary (`[forFieldBoundary]`). A control on its host or inside it does not register with an ancestor `[forField]`, and a `[forField]` inside it wires its own control. It has no inputs.

### `ForFieldAnchor`

Positioning anchor (`[forFieldAnchor]`). Its host becomes the element the overlay controls inside the field position against when they have no anchor of their own. It has no inputs; see [Positioning anchor](#positioning-anchor).

### `ForFieldControl`

Opt-in marker (`[forFieldControl]`) for a **native** `<input>` / `<textarea>` / `<select>` (forty-cdk controls auto-wire and don't need it). Validation state is consumer-driven. Reflects `aria-invalid` on its own host while `invalid` is true (an ARIA hook, not a styling one).

| Property   | Type             | Description                                                                                          |
| ---------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| `invalid`  | `input<boolean>` | Marks the control invalid, which drives the error region and `aria-invalid`.<br>**Default:** `false` |
| `required` | `input<boolean>` | Marks the control required, which the field reflects as `data-required`.<br>**Default:** `false`     |
| `disabled` | `input<boolean>` | Marks the control disabled, which the field reflects as `data-disabled`.<br>**Default:** `false`     |
| `touched`  | `input<boolean>` | Marks the control touched, which the field reflects as `data-touched`.<br>**Default:** `false`       |

## Accessibility

- **`aria-labelledby`** is wired from `[forLabel]` to the control's id, so screen readers announce the label when the control receives focus.
- **`aria-describedby`** is wired from `[forFieldDescription]` (hint text) and folds in the error id while the control is invalid.
- **`aria-errormessage`** points at `[forFieldError]`'s id while the control is invalid. The error region carries `role="alert"` so it is announced immediately.
- **Label-click activation** matches native `<label for>` behavior on both native `<label>` and non-label hosts (demonstrated under [Examples](#examples)).

## Styling

forty-cdk ships no styles: put your own class on each piece and key your CSS off the `data-*` attributes listed under [API](#api), not off the `for*` selectors ([Styling forty-cdk](../../../docs/styling.md) explains why).

```css
.field[data-invalid] .field-label {
  color: var(--color-danger);
}
```

## Wrapping in a design system

Subclass the root and re-provide `FOR_FIELD_CONTEXT` and `FOR_FIELD_ANCHOR_CONTEXT` with `useExisting` pointing at the subclass, since Angular does not inherit a directive's `providers`; [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md) walks the pattern.
