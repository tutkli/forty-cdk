# Search

Headless `role="searchbox"` text field. `[forSearch]` applies on a native
`<input>` and wires its value to a signal, reflects WAI-ARIA validation state,
and exposes a `clear()` / `focusInput()` API for the companion `[forSearchClear]`
clear button.

There is no dedicated WAI-ARIA APG pattern page for "search" — the primitive
is a thin `role="searchbox"` text input (https://www.w3.org/TR/wai-aria-1.2/#searchbox)
that reuses `[forInput]`'s form-value wiring wholesale.

## Basic usage

```html
<input forSearch #s="forSearch" [(value)]="query" placeholder="Search…" />
<button [forSearchClear]="s" aria-label="Clear search">×</button>
```

`[forSearchClear]` self-hides while the value is empty and refocuses the input
on activation. Pass the exported `#s="forSearch"` reference through the
selector input — no wrapping element is required.

## With Signal Forms and Field

```html
<div forField>
  <label forLabel>Search</label>
  <input forSearch [formField]="searchForm.query" />
</div>
```

`[formField]` auto-wires the `FormValueControl<string>` contract — `required`,
`invalid`, `touched`, and the value itself flow in and out without extra glue.

## Accessibility notes

- The `role="searchbox"` attribute is set statically by the directive.
- Validation state (`aria-required`, `aria-invalid`, `aria-readonly`,
  `aria-disabled`) is reflected as truthy-only attributes (absent when `false`).
- `[forSearchClear]` carries `aria-label="Clear"` by default; override it with
  a consumer-set `aria-label` on the same element if the default label is not
  appropriate for the context.
