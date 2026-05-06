# Toggle / ToggleGroup

Two related primitives in a single folder:

- **`[forToggle]`** — a standalone two-state button implementing the [WAI-ARIA Toggle Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) (`<button aria-pressed>`).
- **`[forToggleGroup]` + `[forToggleGroupItem]`** — a [Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) of toggle buttons with single / multiple selection, roving tabindex, and arrow-key navigation.

For exclusive selection where one option is always required, use `[forRadioGroup]` instead — Radio guarantees one-of-N, ToggleGroup in single mode lets the user clear the selection.

## Standalone Toggle

```ts
import { Component, signal } from '@angular/core';
import { ForToggle } from 'forty-cdk';

@Component({
  selector: 'demo-toggle',
  imports: [ForToggle],
  template: ` <button forToggle [(pressed)]="bold">B</button> `,
})
export class DemoToggle {
  readonly bold = signal(false);
}
```

### Inputs

| API        | Default | Description                                            |
| ---------- | ------- | ------------------------------------------------------ |
| `pressed`  | `false` | Two-way bindable pressed state.                        |
| `disabled` | `false` | When `true`, click is ignored and `[disabled]` is set. |

## ToggleGroup

```ts
import { Component, signal } from '@angular/core';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk';

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

### Pieces

| Class                | Selector               | Role                                                                      |
| -------------------- | ---------------------- | ------------------------------------------------------------------------- |
| `ForToggleGroup`     | `[forToggleGroup]`     | Root. Owns `value`, `multiple`, `disabled`, `orientation`, `dir`, `loop`. |
| `ForToggleGroupItem` | `[forToggleGroupItem]` | One toggle button. Pressed state derives from the group's `value`.        |

### Inputs (`ForToggleGroup`)

| API           | Default        | Description                                                                                               |
| ------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| `value`       | `[]`           | Two-way bindable. Selected values, in arbitrary order. Required by `FormValueControl<readonly string[]>`. |
| `multiple`    | `false`        | When `true`, items toggle independently. When `false`, single mode (clicking the pressed item clears).    |
| `disabled`    | `false`        | Disables every item regardless of per-item state.                                                         |
| `readonly`    | `false`        | Click is ignored, items remain focusable. Reflected as `aria-readonly`.                                   |
| `required`    | `false`        | Reflected as `aria-required`.                                                                             |
| `invalid`     | `false`        | Reflected as `aria-invalid` and `data-invalid`.                                                           |
| `pending`     | `false`        | Reflected as `aria-busy` and `data-pending`.                                                              |
| `dirty`       | `false`        | Reflected as `data-dirty`.                                                                                |
| `name`        | `''`           | When non-empty, hidden inputs are mounted for native form submission (one per selected value).            |
| `errors`      | `[]`           | Validation errors surfaced by Signal Forms.                                                               |
| `touched`     | `false`        | Two-way bindable. Set on focusout outside the group.                                                      |
| `orientation` | `'horizontal'` | Layout direction for keyboard navigation.                                                                 |
| `dir`         | `'ltr'`        | Reading direction. RTL swaps ArrowLeft / ArrowRight.                                                      |
| `loop`        | `true`         | When `true`, arrow nav wraps at the ends.                                                                 |

### Inputs (`ForToggleGroupItem`)

| API        | Default  | Description                                               |
| ---------- | -------- | --------------------------------------------------------- |
| `value`    | required | Identifier added to / removed from the group's `value`.   |
| `disabled` | `false`  | Per-item disabled, in addition to the group's `disabled`. |

## Keyboard

- **Enter / Space** on the focused item toggles it (native button behavior).
- **ArrowLeft / ArrowRight** moves focus in horizontal mode (or vertical, swapped via `orientation`). Disabled items are skipped.
- **ArrowUp / ArrowDown** moves focus in vertical mode.
- **Home / End** jump to the first / last enabled item.
- **Tab** enters and exits the group at the entry-point item: the first selected item, or the first enabled item when no value is selected.

Arrow keys move focus only — selection requires an explicit click or Space / Enter. There is no selection-on-focus, unlike `[forRadioGroup]`.

## Behavior notes

- **`data-state`** uses the form-control vocabulary `"checked" | "unchecked"` (per `CLAUDE.md` cross-primitive convention), even though ARIA uses `aria-pressed` — the data attribute mirrors the logical "is this option active" state, not the ARIA term.
- **Single mode** lets the user reach the `[]` state by clicking the currently pressed item again. Use `[forRadioGroup]` if you need to enforce one-of-N.
- **Roving tabindex** is computed from the group's value: with at least one selection the first selected item is the entry point; otherwise the first enabled item in DOM order. The consumer never sets `tabindex` manually.

## Signal Forms usage

`ForToggleGroup` implements `FormValueControl<readonly string[]>`, so it auto-wires with `[formField]` from `@angular/forms/signals`. The schema's `disabled`, `readonly`, `required`, `invalid`, `pending`, `dirty`, `errors`, `touched`, and `name` flow into the matching inputs without consumer glue.

```ts
import { Component, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk';

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
  readonly prefs = form(this.model, (s) => required(s.formats));
}
```

When `[name]` is set (typically through `[formField]`), the directive mounts one `<input type="hidden">` sibling per selected value so the surrounding `<form>` picks the values up during native submission.

`ForToggle` (the standalone single-button toggle) is intentionally **not** a form-control: it is the APG button pattern, not a form value. Use `ForToggleGroup` (in single or multiple mode) when you need form integration — its `value` is `readonly string[]` and a single-mode group simply carries `[]` or `[selected]`.
