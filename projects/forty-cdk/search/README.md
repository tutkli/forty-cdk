# Search

A role='searchbox' text input that mirrors its value to a signal and reflects validation state, paired with a clear button that self-hides while the field is empty. Reuses forInput's form-value wiring, so it auto-wires with Signal Forms and Field.

`[forSearch]` applies on a native `<input>`, wires its value to a signal, reflects validation state, and exposes a `clear()` / `focusInput()` API for the companion `[forSearchClear]` clear button.

## Anatomy

```html
<div forSearchGroup>
  <input forSearch [(value)]="query" placeholder="Search…" />
  <button forSearchClear ariaLabel="Clear search">×</button>
</div>
```

## Examples

### Basic usage

```html
<div forSearchGroup>
  <input forSearch [(value)]="query" placeholder="Search…" />
  <button forSearchClear ariaLabel="Clear search">×</button>
</div>
```

`[forSearchClear]` self-hides while the value is empty and refocuses the input
on activation. Wrap the field and the button in a `[forSearchGroup]` so the
button can coordinate with the field — the void `<input>` can't contain the
button as a DOM descendant, so they bridge through the group registry. A
standalone `[forSearch]` (no clear button) needs no group.

### With Signal Forms and Field

```html
<div forField>
  <label forLabel>Search</label>
  <input forSearch [formField]="searchForm.query" />
</div>
```

`[formField]` auto-wires the `FormValueControl<string>` contract — `required`,
`invalid`, `touched`, and the value itself flow in and out without extra glue.

## Keyboard interaction

| Key      | Behaviour                                                                         |
| -------- | --------------------------------------------------------------------------------- |
| `Escape` | Clears a non-empty value, matching the native `<input type="search">` affordance. |

`Escape` is consumed (`preventDefault()` + `stopPropagation()`) **only** when it
clears. When the field is already empty — or disabled / read-only, where
clearing is a no-op — the key is left to propagate, so a `[forSearch]` placed
inside a Dialog, Popover, or Combobox panel does not swallow that overlay's own
Escape dismissal. A non-empty search box inside an overlay therefore takes two
presses: the first clears the field, the second closes the overlay.

## API

### `ForSearch`

Applied to a native `<input>`. Sets `role="searchbox"`, mirrors the value to a
signal, reflects validation state, and exposes `clear()` / `focusInput()` for
the companion clear button. Implements `FormValueControl<string>`, so it
auto-wires with `[formField]` and auto-associates inside a `[forField]`.

`clear()` is a no-op while the field is disabled or read-only, whichever caller
invokes it — the clear button, the `Escape` key, or your own code through the
`[forSearchGroup]` context.

| Data attribute  | Values                                  |
| --------------- | --------------------------------------- |
| `data-disabled` | present when the field is disabled      |
| `data-readonly` | present when the field is read-only     |
| `data-empty`    | present while the value is `''` (empty) |

### `ForSearchGroup`

Optional coordination wrapper. Renders nothing and imposes no role or layout;
it bridges the `[forSearchClear]` button to the `[forSearch]` field through a
registry, since the void `<input>` can't contain the button as a descendant.
Required only when you use the clear button.

### `ForSearchClear`

Clear button. Apply on a `<button>` inside a `[forSearchGroup]` that also wraps
the `[forSearch]` — no instance is passed through the template. Self-hides while
the value is empty and refocuses the input on activation.

| Input       | Type             | Default                            | Description                                                                    |
| ----------- | ---------------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| `ariaLabel` | `string \| null` | scope `clearAriaLabel` (`'Clear'`) | Accessible name for the icon-only button. Set to `null` to drop the attribute. |

## Accessibility

- The `role="searchbox"` attribute is set statically by the directive.
- Validation state (`aria-required`, `aria-invalid`, `aria-readonly`,
  `aria-disabled`) is reflected as truthy-only attributes (absent when `false`).
- `[forSearchClear]` carries `aria-label="Clear"` by default so the icon-only
  button has an accessible name. Override it per-instance with `[ariaLabel]`, or
  centrally (and for localization) with `provideForSearchDefaults`:

  ```ts
  providers: [provideForSearchDefaults({ clearAriaLabel: 'Limpiar' })];
  ```

  Set `[ariaLabel]="null"` to drop the attribute entirely.
