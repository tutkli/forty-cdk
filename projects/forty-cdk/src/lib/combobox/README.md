# Combobox

Headless combobox with editable input + portaled listbox popup. Implements the [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) (`role="combobox"` on the input, `role="listbox"` on the surface, `role="option"` on items, plus `aria-activedescendant` so DOM focus stays in the input) and the `FormValueControl<string | null>` interface from `@angular/forms/signals`.

Single-select. Multi-tag combobox is a separate primitive.

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForCombobox` | `[forCombobox]` | Root. Owns `[(query)]`, `[(value)]`, `[(open)]`, the option collection, ids, and the dismiss event surface. |
| `ForComboboxInput` | `[forComboboxInput]` | The `<input role="combobox">`. Handles keyboard, inline autocomplete, `aria-activedescendant`. |
| `ForComboboxContent` | `[forComboboxContent]` | The listbox surface. Portaled, positioned by floating-ui, dismissable layer attached. |
| `ForComboboxOption` | `[forComboboxOption]` | One option. `value: required<string>`, optional `[label]` (defaults to trimmed `textContent`). |
| `ForComboboxEmpty` | `[forComboboxEmpty]` | Optional empty-state slot. Self-hides when there are registered options. |
| `ForComboboxClear` | `[forComboboxClear]` | Optional clear `<button>`. Self-hides when there's nothing to clear. |
| `ForComboboxGroup` | `[forComboboxGroup]` | Logical grouping, `role="group"` with `aria-labelledby`. |
| `ForComboboxGroupLabel` | `[forComboboxGroupLabel]` | Label registered with the parent group. |
| `ForComboboxSeparator` | `[forComboboxSeparator]` | Decorative separator, `role="separator"`. |

## Filtering is the consumer's job

The primitive is headless — it does **not** filter the registered options. The consumer reads `[forCombobox][(query)]`, applies whatever match logic they want, and renders the filtered subset with `@for`. Each rendered `[forComboboxOption]` registers itself; the listbox tracks the live set automatically.

```html
@let q = query().toLowerCase();
@let filtered = items.filter(it => it.label.toLowerCase().includes(q));

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
- `[(value)]: string | null` — the committed selection.

They diverge while the user types and resync on activation:

- Click / Enter on an option → `value` becomes the option's `value`. If `commitOnSelect` is on (default), `query` is also overwritten with the option's label.
- Clear button → both reset.
- `clearOnQueryChange` (off by default) — flip on to drop `value` automatically whenever the query is edited (useful when the user editing means "I'm picking a new one").

## Autocomplete modes

The `autocomplete` input mirrors the WAI-ARIA `aria-autocomplete` property:

- **`'none'`** — input is a free-text query; no completion.
- **`'list'`** *(default)* — listbox shows filtered options; input shows verbatim what the user typed.
- **`'inline'`** — the rest of the first matching label is auto-completed into the input as selected text; no listbox popup.
- **`'both'`** — combines `'list'` and `'inline'`: listbox opens *and* the input is auto-completed.

Inline completion preserves the user's typed prefix as unselected and selects the appended remainder, so the next keystroke replaces the selection (matching native browser autofill behavior). Backspace deletes the selection without re-completing, so the user can always shorten the query.

The lookup pool is a snapshot of the registered options refreshed by `afterEveryRender`; this lets inline completion match labels even right after the listbox opens or filtering changes the rendered options.

## Open / close behavior

| Behavior | Default | Override |
| --- | --- | --- |
| Open on focus | `false` (matches Radix / Headless UI / Material) | `[openOnFocus]="true"` |
| Open on query | `true` | `[openOnQuery]="false"` |
| Auto-highlight first option | `true` (matches Headless UI / Material) | `[autoHighlight]="false"` for Radix-style "user must arrow first" |
| Commit label to input on select | `true` | `[commitOnSelect]="false"` |
| Clear value on query edit | `false` | `[clearOnQueryChange]="true"` |

## Keyboard

Focus stays in the input throughout — arrow keys move the listbox's *active descendant* (the highlighted option), they do not move DOM focus.

| Key | Action |
| --- | --- |
| **ArrowDown** | Open listbox + move activedescendant to next enabled option (or first when none). |
| **ArrowUp** | Open listbox + move activedescendant to previous enabled option (or last when none). |
| **Home** *(open)* | Move activedescendant to first enabled option. |
| **End** *(open)* | Move activedescendant to last enabled option. |
| **Enter** *(open)* | Activate the activedescendant (commit value, close, copy label into input if `commitOnSelect`). |
| **Escape** *(open)* | Close the listbox. Focus stays in the input. |
| **Tab** *(open)* | Close the listbox and let Tab flow to the next focusable. |
| Printable keys | Update `query`. With `'inline'` / `'both'` autocomplete, complete the rest of the first match into the input as selected text. |

Hovering an option also makes it the activedescendant, so mouse and keyboard intent stay synchronized.

## Dismiss events

Each dismiss reason emits a vetoable event from `[forCombobox]` — call `preventDefault()` on the event to keep the listbox open.

| Output | When |
| --- | --- |
| `(escapeKeyDown)` | Escape pressed while the listbox is open and the input has focus. |
| `(pointerDownOutside)` | Pointer-down outside both input and content. |
| `(focusOutside)` | Focus moves outside both input and content. |
| `(interactOutside)` | Either of the two above. |

## Form integration

`[forCombobox]` implements `FormValueControl<string | null>`. Pair with `[formField]` for auto-wiring with `@angular/forms/signals`:

```html
<div forCombobox [formField]="form.country">
  <input forComboboxInput />
  …
</div>
```

For a legacy `<form action="…">` flow, set `[name]` — the directive mirrors `[(value)]` into a single `<input type="hidden">` (or none when `value()` is `null`).

## Accessibility notes

- Apply the input directive to an actual `<input>` — the browser's caret and selection semantics are what make inline autocomplete work, and screen readers expect a real text field for `role="combobox"`.
- Disabled options keep the host `aria-disabled="true"`. Click and hover (activedescendant pinning) are no-ops on disabled options.
- `[forComboboxSeparator]` is decorative and never registers with the listbox's option collection — keyboard navigation skips it automatically.
- `[forComboboxGroup]` is purely advisory grouping — options inside still register flatly with the root, so navigation flows through groups without interruption.
- `[forComboboxEmpty]` carries `role="status"` + `aria-live="polite"` so the empty-state message is announced when filtering removes all matches.
- The input element is exempt from the listbox's outside-pointer dismissal layer, so a click on the input while the listbox is open routes through `(click)` (toggle / focus open) instead of double-firing as an outside dismissal.
