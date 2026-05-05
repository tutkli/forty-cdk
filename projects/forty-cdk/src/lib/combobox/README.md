# Combobox

Headless combobox with editable input + portaled listbox popup. Implements the [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) (`role="combobox"` on the input, `role="listbox"` on the surface, `role="option"` on items, plus `aria-activedescendant` so DOM focus stays in the input) and the `FormValueControl<readonly string[]>` interface from `@angular/forms/signals`.

Supports both single (default) and multi-select. Multi mode renders the selected values as chips next to the input (Base UI / Material Autocomplete style).

## Pieces

| Class                   | Selector                  | Role                                                                                                                           |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ForCombobox`           | `[forCombobox]`           | Root. Owns `[(query)]`, `[(value)]`, `[(open)]`, the option / chip collections, ids, and the dismiss event surface.            |
| `ForComboboxInput`      | `[forComboboxInput]`      | The `<input role="combobox">`. Handles keyboard, inline autocomplete, `aria-activedescendant`, multi-mode Backspace heuristic. |
| `ForComboboxContent`    | `[forComboboxContent]`    | The listbox surface. Portaled, positioned by floating-ui, dismissable layer attached.                                          |
| `ForComboboxOption`     | `[forComboboxOption]`     | One option. `value: required<string>`, optional `[label]`.                                                                     |
| `ForComboboxIndicator`  | `[forComboboxIndicator]`  | Optional. Hides itself when the parent option is unselected. Mirrors the option's `data-state`. `[forceMount]` keeps it mounted. |
| `ForComboboxEmpty`      | `[forComboboxEmpty]`      | Optional empty-state slot. Self-hides when there are registered options.                                                       |
| `ForComboboxStatus`     | `[forComboboxStatus]`     | Optional `aria-live="polite"` slot for async-filtering feedback (loading, result count, errors). Exposes a `count` signal.     |
| `ForComboboxClear`      | `[forComboboxClear]`      | Optional clear `<button>`. Self-hides when there's nothing to clear.                                                           |
| `ForComboboxChips`      | `[forComboboxChips]`      | _(multi only)_ Wrapper around the chips + the input. `role="group"`.                                                           |
| `ForComboboxChip`       | `[forComboboxChip]`       | _(multi only)_ One chip per entry in `value()`. `value: required<string>`.                                                     |
| `ForComboboxChipRemove` | `[forComboboxChipRemove]` | _(multi only)_ Remove `<button>` inside a chip with auto-generated `aria-label`.                                               |
| `ForComboboxGroup`      | `[forComboboxGroup]`      | Logical grouping, `role="group"` with `aria-labelledby`.                                                                       |
| `ForComboboxGroupLabel` | `[forComboboxGroupLabel]` | Label registered with the parent group.                                                                                        |
| `ForComboboxSeparator`  | `[forComboboxSeparator]`  | Decorative separator, `role="separator"`.                                                                                      |

## Filtering is the consumer's job

The primitive is headless — it does **not** filter the registered options. The consumer reads `[forCombobox][(query)]`, applies whatever match logic they want, and renders the filtered subset with `@for`. Each rendered `[forComboboxOption]` registers itself; the listbox tracks the live set automatically.

```html
@let q = query().toLowerCase(); @let filtered = items.filter(it =>
it.label.toLowerCase().includes(q));

<div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
  <input forComboboxInput placeholder="Search a fruit…" />
  @if (open()) {
  <div forComboboxContent>
    @for (it of filtered; track it.id) {
    <div forComboboxOption [value]="it.id" [label]="it.label">{{ it.label }}</div>
    }
    <div forComboboxEmpty>No matches.</div>
  </div>
  }
</div>
```

## Mount/visibility convention

`[forComboboxContent]` follows the floating-overlay convention: the consumer's signal drives `@if`, the directive emits dismiss events when it wants to be unmounted. No `[hidden]`. The visible input lives outside the overlay; only the listbox surface portals.

## Two models, separately tracked

The combobox separates **what the user is typing** from **what's been committed**:

- `[(query)]: string` — the visible text the user is editing.
- `[(value)]: readonly string[]` — committed selection. Single mode keeps 0 or 1 element; multi mode keeps any number.

They diverge while the user types and resync on activation:

- Click / Enter on an option:
  - **Single mode** → `value` becomes `[option.value]`. If `commitOnSelect` is on (default), `query` is overwritten with the option's label. Listbox closes.
  - **Multi mode** → option's value is toggled in/out of `value`. If `commitOnSelect` is on (default), `query` is **cleared** so the user can search the next item. Listbox stays open.
- Clear button → both reset.
- `clearOnQueryChange` (off by default, **single mode only**) — flip on to drop `value` automatically whenever the query is edited (useful when the user editing means "I'm picking a new one").

## Multi mode

Pass `multiple` and let the consumer render chips inside `[forComboboxChips]`. The primitive's `selected()` computed returns `{ value, label }` pairs ready for `@for`:

```html
<div forCombobox multiple [(value)]="tags" [(query)]="query" [(open)]="open">
  <div forComboboxChips>
    @for (chip of selected(); track chip.value) {
    <span forComboboxChip [value]="chip.value">
      {{ chip.label }}
      <button forComboboxChipRemove>×</button>
    </span>
    }
    <input forComboboxInput placeholder="Add tags…" />
  </div>

  @if (open()) {
  <div forComboboxContent>
    @for (it of filtered(); track it.id) {
    <div forComboboxOption [value]="it.id" [label]="it.label">{{ it.label }}</div>
    }
  </div>
  }
</div>
```

In multi mode, options with `aria-selected="true"` keep appearing in the listbox by default — `aria-selected` lets screen readers announce them as already-picked. To hide already-selected entries, the consumer filters them out of the rendered set themselves.

### Chip keyboard

Chips are intentionally **out of the Tab cycle** — Tab from outside lands on the input, not on a chip. The user reaches chips via the input's Backspace heuristic; once focused, ArrowLeft/Right + Backspace/Delete drive everything:

| Key on chip            | Action                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **ArrowLeft**          | Focus previous chip; bounces if first.                                                    |
| **ArrowRight**         | Focus next chip; if last, hop to the input.                                               |
| **Backspace / Delete** | Remove this chip + focus the previous chip (or the input if it was the only / last chip). |
| **Escape**             | Return focus to the input.                                                                |

`[forComboboxChipRemove]` is a click-only target (also out of Tab cycle) with auto-generated `aria-label="Remove <chip label>"`.

### Multi-mode Backspace heuristic

When the input is empty (no query) and the user presses Backspace, focus jumps to the last chip — Base UI / Material Autocomplete behavior. A second Backspace there removes it. While typing (input non-empty), Backspace falls through to the native delete-char.

## Open / close behavior

| Behavior                                | Default                                          | Override                                                          |
| --------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| Open on focus                           | `false` (matches Radix / Headless UI / Material) | `[openOnFocus]="true"`                                            |
| Open on query                           | `true`                                           | `[openOnQuery]="false"`                                           |
| Auto-highlight first option             | `true` (matches Headless UI / Material)          | `[autoHighlight]="false"` for Radix-style "user must arrow first" |
| Commit label / clear query on select    | `true`                                           | `[commitOnSelect]="false"`                                        |
| Clear value on query edit (single only) | `false`                                          | `[clearOnQueryChange]="true"`                                     |

## Autocomplete modes

The `autocomplete` input mirrors the WAI-ARIA `aria-autocomplete` property:

- **`'none'`** — input is a free-text query; no completion.
- **`'list'`** _(default)_ — listbox shows filtered options; input shows verbatim what the user typed.
- **`'inline'`** — the rest of the first matching label is auto-completed into the input as selected text; no listbox popup.
- **`'both'`** — combines `'list'` and `'inline'`: listbox opens _and_ the input is auto-completed.

Inline completion preserves the user's typed prefix as unselected and selects the appended remainder, so the next keystroke replaces the selection (matching native browser autofill behavior). Backspace deletes the selection without re-completing, so the user can always shorten the query.

## Keyboard (input-focused, both modes)

Focus stays in the input throughout — arrow keys move the listbox's _active descendant_ (the highlighted option), they do not move DOM focus.

| Key                                       | Action                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **ArrowDown**                             | Open listbox + move activedescendant to next enabled option (or first when none).                                              |
| **ArrowUp**                               | Open listbox + move activedescendant to previous enabled option (or last when none).                                           |
| **Home** _(open)_                         | Move activedescendant to first enabled option.                                                                                 |
| **End** _(open)_                          | Move activedescendant to last enabled option.                                                                                  |
| **Enter** _(open)_                        | Activate the activedescendant (single: replace + close; multi: toggle + stay open).                                            |
| **Escape** _(open)_                       | Close the listbox. Focus stays in the input.                                                                                   |
| **Tab** _(open)_                          | Close the listbox and let Tab flow to the next focusable.                                                                      |
| **Backspace** _(empty input, multi only)_ | Focus the last chip; a second Backspace there removes it.                                                                      |
| Printable keys                            | Update `query`. With `'inline'` / `'both'` autocomplete, complete the rest of the first match into the input as selected text. |

Hovering an option also makes it the activedescendant, so mouse and keyboard intent stay synchronized.

## Dismiss events

Each dismiss reason emits a vetoable event from `[forCombobox]` — call `preventDefault()` on the event to keep the listbox open.

| Output                 | When                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `(escapeKeyDown)`      | Escape pressed while the listbox is open and the input has focus. |
| `(pointerDownOutside)` | Pointer-down outside both input and content.                      |
| `(focusOutside)`       | Focus moves outside both input and content.                       |
| `(interactOutside)`    | Either of the two above.                                          |

## Form integration

`[forCombobox]` implements `FormValueControl<readonly string[]>`. Pair with `[formField]` for auto-wiring with `@angular/forms/signals`:

```html
<div forCombobox [formField]="form.country">
  <input forComboboxInput />
  …
</div>
```

For a legacy `<form action="…">` flow, set `[name]` — the directive mirrors `[(value)]` into N `<input type="hidden">` siblings (one per array entry; zero when empty).

## Accessibility notes

- Apply the input directive to an actual `<input>` — the browser's caret and selection semantics are what make inline autocomplete work, and screen readers expect a real text field for `role="combobox"`.
- `aria-multiselectable="true"` is set on `[forComboboxContent]` in multi mode.
- In single mode, `aria-selected="true"` follows the activedescendant (the option Enter would activate). In multi mode it follows membership in `value()` — every selected option carries `aria-selected="true"` simultaneously.
- `data-state="checked" | "unchecked"` always reflects membership in `value()`, so consumers can paint a checkmark icon with pure CSS regardless of mode.
- `data-highlighted=""` marks the option that is the current `aria-activedescendant`. Because focus stays on the `<input>`, there is no `:focus` on the option to style — `data-highlighted` is the canonical CSS hook (Radix-aligned).
- Disabled options keep the host `aria-disabled="true"`. Click and hover (activedescendant pinning) are no-ops on disabled options.
- `[forComboboxSeparator]` is decorative and never registers with the listbox's option collection — keyboard navigation skips it automatically.
- `[forComboboxGroup]` is purely advisory grouping — options inside still register flatly with the root, so navigation flows through groups without interruption.
- `[forComboboxEmpty]` carries `role="status"` + `aria-live="polite"` so the empty-state message is announced when filtering removes all matches.
- The input element is exempt from the listbox's outside-pointer dismissal layer, so a click on the input while the listbox is open routes through `(click)` (toggle / focus open) instead of double-firing as an outside dismissal.
