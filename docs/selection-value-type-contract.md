# Selection value-type contract

Every selection primitive in forty-cdk models its value the same way, so you learn one shape across the whole library and it flows through `[formField]` unchanged whether the control is single- or multi-select.

## The value is always a `readonly` array

`ForAccordion`, `ForToggleGroup`, `ForListbox`, and `ForSelect` expose `value` as `model<readonly string[]>`; the generic `ForCombobox` uses `model<readonly T[]>`. That uniform array is the `FormValueControl<readonly T[]>` (or `readonly T[]`) backing that the `[formField]` directive auto-wires to — one control covers both single and multi selection because the shape never changes with mode.

The array is treated immutably: the primitive replaces it (`[...]`, `.filter()`, a fresh `Set` then spread) rather than mutating it in place. You write to it through `[(value)]`.

## Single mode is the same array with 0–1 elements

With `multiple` unset (the default) the array stays at length ≤ 1 — activating an option replaces the current entry rather than appending, and an empty array means nothing is selected. There is no separate "single value" model to keep in sync.

## Single-select consumers read a derived accessor, never `value()[0]`

Each primitive exposes a read-only, single-mode view derived with `computed()`:

| Primitive                 | Accessor                           |
| ------------------------- | ---------------------------------- |
| `ForSelect`, `ForListbox` | `selected: Signal<string \| null>` |
| `ForCombobox`             | `selectedItem: Signal<T \| null>`  |

It returns the sole element when the array holds exactly one entry, otherwise `null` (empty, or multiple in multi mode). This is a convenience accessor, not a second source of truth — writes still go through `[(value)]`.

## Bridging a `T | null` form field

A single-select consumer usually models their domain field as `T | null`, which cannot bind to a `readonly T[]` control directly. The `forSingleValueField` bridge in [`forty-cdk/signal-forms`](../projects/forty-cdk/signal-forms/README.md) adapts a `FieldTree<T | null>` to the array view the control expects, so the standard `[formField]` wiring works unchanged.

## What is out of this contract

Selection-for-display primitives that model a single value — `ForTabs` and `ForRadioGroup` — are out of this array contract. It covers the array-backed, multi-capable controls only.
