# Select

Headless select primitive — a button trigger that opens a portaled listbox of options. Implements the [WAI-ARIA select-only combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/) (`role="combobox"` on the trigger, `role="listbox"` on the surface, `role="option"` on items) and the `FormValueControl<readonly string[]>` interface from `@angular/forms/signals`.

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForSelect` | `[forSelect]` | Root. Owns `[(value)]`, `[(open)]`, the option collection, ids, and the dismiss event surface. |
| `ForSelectTrigger` | `[forSelectTrigger]` | The `<button role="combobox">` that opens the listbox. Wires `aria-haspopup`, `aria-expanded`, `aria-controls`. |
| `ForSelectValue` | `[forSelectValue]` | Renders the selected option's text — or the placeholder — into its host via `textContent`. Optional. |
| `ForSelectContent` | `[forSelectContent]` | The listbox surface. Portaled, positioned by floating-ui, dismissable layer attached. |
| `ForSelectOption` | `[forSelectOption]` | One option. `value: required<string>`. |
| `ForSelectGroup` | `[forSelectGroup]` | Logical grouping, `role="group"` with `aria-labelledby`. |
| `ForSelectGroupLabel` | `[forSelectGroupLabel]` | Label registered with the parent group. |
| `ForSelectSeparator` | `[forSelectSeparator]` | Decorative separator, `role="separator"`. Skipped by navigation. |

## Single mode (default)

Click an option to replace the selection and close. `[(value)]` keeps 0 or 1 element.

```html
<div forSelect [(value)]="favorite" placeholder="Pick a fruit">
  <button forSelectTrigger>
    <span forSelectValue></span>
  </button>
  @if (favoriteOpen()) {
    <div forSelectContent>
      <button forSelectOption value="apple">Apple</button>
      <button forSelectOption value="banana">Banana</button>
      <button forSelectOption value="cherry">Cherry</button>
    </div>
  }
</div>
```

## Multi mode

Set `multiple` and bind `[(value)]` to a `string[]`. Click an option to toggle in/out — the listbox stays open. Tab, Escape, or outside-pointer close it.

```html
<div forSelect multiple [(value)]="tags">
  <button forSelectTrigger>
    <span forSelectValue placeholder="Pick tags…"></span>
  </button>
  @if (tagsOpen()) {
    <div forSelectContent>
      <button forSelectOption value="ng">Angular</button>
      <button forSelectOption value="ts">TypeScript</button>
      <button forSelectOption value="rx">RxJS</button>
    </div>
  }
</div>
```

## Mount/visibility convention

`[forSelectContent]` follows the floating-overlay convention: the consumer's signal drives `@if`, the directive emits dismiss events (forwarded by the root primitive) when it wants to be unmounted. No `[hidden]`. The trigger's own click toggles the same signal — `[forSelect]` exposes `open` as a `model<boolean>` so two-way binding works out of the box.

## Initial focus on open

When the listbox mounts, focus lands per the trigger's hint:

- **Click / Enter / Space / ArrowDown** → focuses the currently-selected option, falling back to the first enabled option when no selection exists.
- **ArrowUp** → focuses the currently-selected option, or the last enabled option when no selection exists.

Override programmatically with `forSelect.openMenu('first' | 'last' | 'selected')`.

## Keyboard

### Trigger (closed)

- **Click / Enter / Space** — open (focus selected, else first).
- **ArrowDown** — open (focus selected, else first).
- **ArrowUp** — open (focus selected, else last).
- **Typeahead** *(single mode only)* — printable keys select the matching option immediately without opening, mirroring native `<select>`. The lookup goes through a cached snapshot of options (the live registry is empty while `[forSelectContent]` is unmounted); the cache is populated the first time the listbox opens, so closed-state typeahead is available after the user has interacted with the listbox at least once.

### Listbox (open)

- **ArrowDown / ArrowUp** — move focus to next / previous enabled option, wrapping by default.
- **Home / End** — jump to first / last enabled option.
- **Enter / Space** — activate the focused option (native `<button>` semantics): select + close in single mode, toggle (stay open) in multi mode.
- **Escape** — close without changing selection. Returns focus to the trigger.
- **Tab** — close. Returns focus to the trigger.
- **Typeahead** — single printable characters move focus to the first option whose text starts with the buffered string. Disabled options are skipped.

## Selection follows focus

Single-mode only. Set `selectionFollowsFocus` to also commit `[(value)]` as arrow navigation moves focus — useful for "live preview" UX. Default off; APG calls it optional and recommends caution.

```html
<div forSelect selectionFollowsFocus [(value)]="theme">…</div>
```

## Dismiss events

Each dismiss reason emits a vetoable event from `[forSelect]` — call `preventDefault()` on the event to keep the listbox open.

| Output | When |
| --- | --- |
| `(escapeKeyDown)` | Escape pressed while listbox is open. |
| `(pointerDownOutside)` | Pointer-down outside both trigger and content. |
| `(focusOutside)` | Focus moves outside both trigger and content. |
| `(interactOutside)` | Either of the two above (single output for consumers that don't care which). |

## Form integration

`[forSelect]` implements `FormValueControl<readonly string[]>`. Pair with the `[formField]` directive for auto-wiring with `@angular/forms/signals`:

```html
<div forSelect [formField]="form.color">
  <button forSelectTrigger><span forSelectValue placeholder="Color"></span></button>
  …
</div>
```

For a legacy `<form action="…">` flow, set `[name]` — `[forSelect]` mirrors `[(value)]` into one `<input type="hidden">` per selected value (single produces 0–1 inputs, multi produces N).

## Accessibility notes

- Apply each option directive to a `<button>` so Space / Enter activation come from native button behavior — the listbox doesn't intercept them.
- Disabled options keep `tabindex="-1"` and `aria-disabled="true"` (per APG): focusable for screen-reader announcement, but click and keyboard activation are no-ops.
- `[forSelectSeparator]` is decorative and never registers with the listbox's option collection — it's skipped during navigation and typeahead automatically.
- `[forSelectGroup]` is purely advisory grouping — options inside still register flatly with the root, so navigation flows through groups without interruption.
- The trigger is exempt from the dismissable layer's outside-pointer checks, so a click on the trigger while the listbox is open routes through `(click)` (toggle) instead of double-firing as an outside dismissal.
