# Toggle / ToggleGroup

A two-state button that stays pressed or unpressed.

Two related primitives in a single folder: `[forToggle]` is a standalone two-state button (`<button aria-pressed>`); `[forToggleGroup]` + `[forToggleGroupItem]` compose a group of toggle buttons with single / multiple selection, roving tabindex, and arrow-key navigation. For exclusive selection where one option is always required, use `[forRadioGroup]` instead — Radio guarantees one-of-N, ToggleGroup in single mode lets the user clear the selection.

## Anatomy

```html
<!-- Standalone two-state button -->
<button forToggle [(checked)]="bold">B</button>

<!-- Group of toggle buttons (single or multiple selection) -->
<div forToggleGroup [(value)]="format" multiple>
  <button forToggleGroupItem value="bold">B</button>
  <button forToggleGroupItem value="italic">I</button>
  <button forToggleGroupItem value="underline">U</button>
</div>
```

## Examples

### Standalone Toggle

```ts
import { Component, signal } from '@angular/core';
import { ForToggle } from 'forty-cdk/toggle';

@Component({
  selector: 'demo-toggle',
  imports: [ForToggle],
  template: ` <button forToggle [(checked)]="bold">B</button> `,
})
export class DemoToggle {
  readonly bold = signal(false);
}
```

### Signal Forms (single Toggle)

`ForToggle` implements `FormCheckboxControl`, so a single `aria-pressed` toggle auto-wires with `[formField]` from `@angular/forms/signals` — the natural home for bold / italic, mute, or favourite buttons. The schema's `disabled`, `readonly`, `required`, `invalid`, `pending`, `dirty`, `errors`, and `touched` flow into the matching inputs without consumer glue.

```ts
import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { ForToggle } from 'forty-cdk/toggle';

@Component({
  selector: 'demo-bold',
  imports: [ForToggle, FormField],
  template: ` <button forToggle [formField]="prefs.bold" aria-label="Bold">B</button> `,
})
export class DemoBold {
  readonly model = signal({ bold: false });
  readonly prefs = form(this.model, (s) => required(s.bold));
}
```

When `[name]` is set (typically through `[formField]`), the directive mounts an `<input type="hidden" value="on">` sibling while checked so the surrounding `<form>` picks it up during native submission.

For a set of related toggles, `ForToggleGroup` implements `FormValueControl<readonly string[]>` instead — its `value` is `readonly string[]`, and a single-mode group simply carries `[]` or `[selected]`.

### ToggleGroup

```ts
import { Component, signal } from '@angular/core';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';

@Component({
  selector: 'demo-alignment',
  imports: [ForToggleGroup, ForToggleGroupItem],
  template: `
    <!-- single (default): one alignment at a time, click again to clear -->
    <div forToggleGroup [(value)]="alignment">
      <button forToggleGroupItem value="left">Left</button>
      <button forToggleGroupItem value="center">Center</button>
      <button forToggleGroupItem value="right">Right</button>
    </div>

    <!-- multiple: independent toggles -->
    <div forToggleGroup [(value)]="format" multiple>
      <button forToggleGroupItem value="bold">B</button>
      <button forToggleGroupItem value="italic">I</button>
      <button forToggleGroupItem value="underline">U</button>
    </div>
  `,
})
export class DemoAlignment {
  readonly alignment = signal<readonly string[]>([]);
  readonly format = signal<readonly string[]>([]);
}
```

`value` is always `readonly string[]`. In single mode it carries 0 or 1 entries; this lets consumers flip `multiple` without re-typing their state.

### Signal Forms (ToggleGroup)

`ForToggleGroup` implements `FormValueControl<readonly string[]>`, so it auto-wires with `[formField]` from `@angular/forms/signals`. The schema's `disabled`, `readonly`, `required`, `invalid`, `pending`, `dirty`, `errors`, `touched`, and `name` flow into the matching inputs without consumer glue.

```ts
import { Component, signal } from '@angular/core';
import { form, required, requiredError, validate } from '@angular/forms/signals';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';

@Component({
  selector: 'demo-formats',
  imports: [ForToggleGroup, ForToggleGroupItem /* , FormField from @angular/forms */],
  template: `
    <div forToggleGroup multiple [formField]="prefs.formats" aria-label="Formats">
      <button forToggleGroupItem value="bold">B</button>
      <button forToggleGroupItem value="italic">I</button>
      <button forToggleGroupItem value="underline">U</button>
    </div>
  `,
})
export class DemoFormats {
  readonly model = signal({ formats: [] as string[] });
  readonly prefs = form(this.model, (s) => {
    required(s.formats);
    validate(s.formats, ({ value }) =>
      value().length === 0 ? requiredError({ message: 'Pick at least one format' }) : undefined,
    );
  });
}
```

> **Requiring a non-empty selection.** `ForToggleGroup`'s value is a `readonly string[]`, and Angular's
> `required()` treats only `''`, `false`, `null`, and `NaN` as empty — an empty array `[]` counts as
> _present_, so `required(s.formats)` reflects `aria-required="true"` but never makes the form invalid
> on its own. Enforce "at least one" with the explicit `validate(...)` length rule above, or with
> Angular's `minLength(s.formats, 1)` (which emits a `minLengthError` instead of a `requiredError`).
> The single-`boolean` `ForToggle` above is unaffected: `required(s.bold)` works because `false` is
> treated as empty.

When `[name]` is set (typically through `[formField]`), the directive mounts one `<input type="hidden">` sibling per selected value so the surrounding `<form>` picks the values up during native submission.

Choose between the two form-control shapes by the value you need: `ForToggle` (`FormCheckboxControl`, a single `boolean`) for one independent on/off button, `ForToggleGroup` (`FormValueControl<readonly string[]>`) for a set of related toggles whose selection is a list.

## API

### `ForToggle`

| Property   | Type                                                      | Description                                                                                                                                                                   |
| ---------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checked`  | `model<boolean>`                                          | Two-way bindable on/off state. Required by `FormCheckboxControl`; what `[formField]` binds. The host reflects it via `aria-pressed` and `data-state`.<br>**Default:** `false` |
| `disabled` | `input<boolean>`                                          | When `true`, click is ignored; reflects `aria-disabled="true"` + `data-disabled`. Stays focusable (per APG) — no native `disabled`.<br>**Default:** `false`                   |
| `readonly` | `input<boolean>`                                          | When `true`, click is ignored but the host stays focusable. Reflected as `data-readonly` only — `aria-readonly` is not supported on `role="button"`.<br>**Default:** `false`  |
| `required` | `input<boolean>`                                          | Reflected as `aria-required`.<br>**Default:** `false`                                                                                                                         |
| `invalid`  | `input<boolean>`                                          | Reflected as `aria-invalid` and `data-invalid`.<br>**Default:** `false`                                                                                                       |
| `pending`  | `input<boolean>`                                          | Reflected as `aria-busy` and `data-pending`.<br>**Default:** `false`                                                                                                          |
| `dirty`    | `input<boolean>`                                          | Reflected as `data-dirty`.<br>**Default:** `false`                                                                                                                            |
| `name`     | `input<string>`                                           | When non-empty, a hidden input is mounted for native form submission (`name=on` while checked).<br>**Default:** `''`                                                          |
| `errors`   | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Validation errors surfaced by Signal Forms.<br>**Default:** `[]`                                                                                                              |
| `touched`  | `model<boolean>`                                          | Two-way bindable. Set to `true` on blur.<br>**Default:** `false`                                                                                                              |

| Data attribute  | Values                   |
| --------------- | ------------------------ |
| `data-state`    | `checked` \| `unchecked` |
| `data-disabled` | present \| absent        |
| `data-readonly` | present \| absent        |

### `ForToggleGroup`

| Property      | Type                                                      | Description                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | `model<readonly string[]>`                                | Two-way bindable. Selected values, in arbitrary order. Required by `FormValueControl<readonly string[]>`.<br>**Default:** `[]`                                                                           |
| `multiple`    | `input<boolean>`                                          | When `true`, items toggle independently. When `false`, single mode (clicking the pressed item clears).<br>**Default:** `false`                                                                           |
| `disabled`    | `input<boolean>`                                          | Disables every item regardless of per-item state.<br>**Default:** `false`                                                                                                                                |
| `readonly`    | `input<boolean>`                                          | Click is ignored, items remain focusable. Reflected as `data-readonly` on the root only — `aria-readonly` is supported on neither `role="group"` nor the items' `role="button"`.<br>**Default:** `false` |
| `required`    | `input<boolean>`                                          | Reflected as `aria-required`.<br>**Default:** `false`                                                                                                                                                    |
| `invalid`     | `input<boolean>`                                          | Reflected as `aria-invalid` and `data-invalid`.<br>**Default:** `false`                                                                                                                                  |
| `pending`     | `input<boolean>`                                          | Reflected as `aria-busy` and `data-pending`.<br>**Default:** `false`                                                                                                                                     |
| `dirty`       | `input<boolean>`                                          | Reflected as `data-dirty`.<br>**Default:** `false`                                                                                                                                                       |
| `name`        | `input<string>`                                           | When non-empty, hidden inputs are mounted for native form submission (one per selected value).<br>**Default:** `''`                                                                                      |
| `errors`      | `input<readonly ValidationError.WithOptionalFieldTree[]>` | Validation errors surfaced by Signal Forms.<br>**Default:** `[]`                                                                                                                                         |
| `touched`     | `model<boolean>`                                          | Two-way bindable. Set on focusout outside the group.<br>**Default:** `false`                                                                                                                             |
| `orientation` | `input<'horizontal' \| 'vertical'>`                       | Layout direction for keyboard navigation.<br>**Default:** `'horizontal'`                                                                                                                                 |
| `dir`         | `input<'ltr' \| 'rtl'>`                                   | Reading direction. RTL swaps ArrowLeft / ArrowRight.<br>**Default:** `'ltr'`                                                                                                                             |
| `loop`        | `input<boolean>`                                          | When `true`, arrow nav wraps at the ends. The default is read from `provideForToggleDefaults`.<br>**Default:** `true`                                                                                    |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-disabled`    | present \| absent          |
| `data-readonly`    | present \| absent          |

### `ForToggleGroupItem`

| Property   | Type                     | Description                                                                       |
| ---------- | ------------------------ | --------------------------------------------------------------------------------- |
| `value`    | `input.required<string>` | Identifier added to / removed from the group's `value`.<br>**Default:** —         |
| `disabled` | `input<boolean>`         | Per-item disabled, in addition to the group's `disabled`.<br>**Default:** `false` |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-state`       | `checked` \| `unchecked`   |
| `data-disabled`    | present \| absent          |
| `data-orientation` | `horizontal` \| `vertical` |

## Keyboard

- **Enter / Space** on the focused item toggles it (native button behavior).
- **ArrowLeft / ArrowRight** moves focus in horizontal mode (or vertical, swapped via `orientation`). Disabled items are skipped.
- **ArrowUp / ArrowDown** moves focus in vertical mode.
- **Home / End** jump to the first / last enabled item.
- **Tab** enters and exits the group at the entry-point item. Before any interaction that is the first selected item, or the first enabled item when no value is selected; once you move focus with the arrows (or Home / End), the tab stop follows the last focused item, so Shift+Tab back into the group restores it.

Arrow keys move focus only — selection requires an explicit click or Space / Enter. There is no selection-on-focus, unlike `[forRadioGroup]`.

## Accessibility

Implements the [WAI-ARIA Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) (toggle-button variant).

- **`[forToggle]`** emits `role="button"` with `aria-pressed="true|false"` — announced as "toggle button" by screen readers.
- **`[forToggleGroup]`** emits `role="group"` and reflects `data-orientation` for CSS (not `aria-orientation`). Provide a label via `aria-label` or `aria-labelledby`.
- **Roving tabindex** manages focus within the group. The consumer never sets `tabindex` manually.
- **A disabled item stays focusable** (per APG): it reflects `aria-disabled="true"` + `data-disabled=""` rather than native `disabled`, so assistive tech still announces it while interaction is a no-op.
- **`readonly` has no ARIA channel here.** WAI-ARIA supports `aria-readonly` on neither `role="button"` nor `role="group"`, so a read-only toggle / group reflects the boolean `data-readonly` styling hook only and interaction is blocked in the handler.

## Behavior notes

- **`data-state`** uses the form-control vocabulary `"checked" | "unchecked"` (per `CLAUDE.md` cross-primitive convention), even though ARIA uses `aria-pressed` — the data attribute mirrors the logical "is this option active" state, not the ARIA term.
- **Single mode** lets the user reach the `[]` state by clicking the currently pressed item again. Use `[forRadioGroup]` if you need to enforce one-of-N.
- **Roving tabindex** follows focus: once any item is focused, that item becomes the tab stop so re-entry restores it. Before any focus, the entry point is computed from the group's value — with at least one selection the first selected item, otherwise the first enabled item in DOM order. The consumer never sets `tabindex` manually.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed per piece in the [API](#api) section.

```css
.toggle {
  background: var(--surface);
}

.toggle[data-state='checked'] {
  background: var(--accent);
}

.toggle[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_TOGGLE_HOST_DIRECTIVE_INPUTS` / `FOR_TOGGLE_HOST_DIRECTIVE_OUTPUTS` and `FOR_TOGGLE_GROUP_HOST_DIRECTIVE_INPUTS` / `FOR_TOGGLE_GROUP_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).
