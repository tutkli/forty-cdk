# Combobox

Headless combobox with editable input + portaled listbox popup. Implements the [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) (`role="combobox"` on the input, `role="listbox"` on the surface, `role="option"` on items, plus `aria-activedescendant` so DOM focus stays in the input) and the `FormValueControl<readonly T[]>` interface from `@angular/forms/signals`.

Supports both single (default) and multi-select. Multi mode renders the selected values as chips next to the input (Base UI / Material Autocomplete style).

`[forCombobox]` is generic over the option value type `T` (default `string`). Bind primitive ids for the simple case or full objects for richer models — the directive infers `T` from `[(value)]` and `[forComboboxOption][value]`. See [Object values](#object-values) for the object-mode contract.

## Pieces

| Class                   | Selector                  | Role                                                                                                                             |
| ----------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ForCombobox`           | `[forCombobox]`           | Root. Owns `[(query)]`, `[(value)]`, `[(open)]`, the option / chip collections, ids, and the dismiss event surface.              |
| `ForComboboxInput`      | `[forComboboxInput]`      | The `<input role="combobox">`. Handles keyboard, inline autocomplete, `aria-activedescendant`, multi-mode Backspace heuristic.   |
| `ForComboboxContent`    | `[forComboboxContent]`    | The listbox surface. Portaled, positioned by floating-ui, dismissable layer attached.                                            |
| `ForComboboxOption`     | `[forComboboxOption]`     | One option. `value: required<string>`, optional `[label]`.                                                                       |
| `ForComboboxIndicator`  | `[forComboboxIndicator]`  | Optional. Hides itself when the parent option is unselected. Mirrors the option's `data-state`. `[forceMount]` keeps it mounted. |
| `ForComboboxEmpty`      | `[forComboboxEmpty]`      | Optional empty-state slot. Self-hides when there are registered options.                                                         |
| `ForComboboxStatus`     | `[forComboboxStatus]`     | Optional `aria-live="polite"` slot for async-filtering feedback (loading, result count, errors). Exposes a `count` signal.       |
| `ForComboboxClear`      | `[forComboboxClear]`      | Optional clear `<button>`. Self-hides when there's nothing to clear.                                                             |
| `ForComboboxChips`      | `[forComboboxChips]`      | _(multi only)_ Wrapper around the chips + the input. `role="group"`.                                                             |
| `ForComboboxChip`       | `[forComboboxChip]`       | _(multi only)_ One chip per entry in `value()`. `value: required<string>`.                                                       |
| `ForComboboxChipRemove` | `[forComboboxChipRemove]` | _(multi only)_ Remove `<button>` inside a chip with auto-generated `aria-label`.                                                 |
| `ForComboboxGroup`      | `[forComboboxGroup]`      | Logical grouping, `role="group"` with `aria-labelledby`.                                                                         |
| `ForComboboxGroupLabel` | `[forComboboxGroupLabel]` | Label registered with the parent group.                                                                                          |
| `ForComboboxSeparator`  | `[forComboboxSeparator]`  | Decorative separator, `role="separator"`.                                                                                        |

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

### `commitOnSelect`: single vs multi

The same boolean drives two different behaviours because what counts as "committing the selection" differs by mode. In **single mode** the query is the displayed label of the picked item, so committing means _copying the label_. In **multi mode** the query is the next-item search field, so committing means _clearing it_ to prepare for the next pick. Concrete state walks (starting from `query=""`, `value=[]`):

```text
Single, commitOnSelect=true (default)
  user types "ap"        → query="ap"  value=[]
  user activates "Apple" → query="Apple" value=["apple"]   ← label copied, listbox closes

Single, commitOnSelect=false
  user types "ap"        → query="ap"  value=[]
  user activates "Apple" → query="ap"  value=["apple"]     ← query untouched, listbox closes

Multi, commitOnSelect=true (default)
  user types "ap"        → query="ap"  value=[]
  user activates "Apple" → query=""    value=["apple"]     ← query cleared, listbox stays open
  user types "ba"        → query="ba"  value=["apple"]
  user activates "Banana"→ query=""    value=["apple","banana"]

Multi, commitOnSelect=false
  user types "ap"        → query="ap"  value=[]
  user activates "Apple" → query="ap"  value=["apple"]     ← query untouched, listbox stays open
```

Disable `commitOnSelect` when your filter logic compares against `query` directly and the listbox should keep showing the just-narrowed set after activation, instead of resetting to "everything matches the picked label".

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

Chips are intentionally **out of the Tab cycle** — Tab from outside lands on the input, not on a chip. The user reaches chips via the input's Backspace heuristic; once focused, ArrowLeft/Right + Backspace/Delete drive everything (the ArrowLeft / ArrowRight roles swap under `dir="rtl"` so they always follow the visual order):

| Key on chip            | Action (LTR)                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **ArrowLeft**          | Focus previous chip; bounces if first.                                                    |
| **ArrowRight**         | Focus next chip; if last, hop to the input.                                               |
| **Backspace / Delete** | Remove this chip + focus the previous chip (or the input if it was the only / last chip). |
| **Escape**             | Return focus to the input.                                                                |

In RTL the chip cluster lays out right-to-left, so **ArrowRight** moves to the visually-next chip (DOM-previous) and **ArrowLeft** moves to the visually-previous one (DOM-next, hopping to the input at the leftmost visual edge).

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

The `autocompleteMode` input mirrors the WAI-ARIA `aria-autocomplete` property:

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

## No `(autoFocusOnOpen)` / `(autoFocusOnClose)`

Unlike `[forDialog]`, `[forPopover]`, `[forDropdownMenu]`, `[forContextMenu]`, and `[forSelect]`, the combobox does **not** expose these events. By design, the input retains focus the entire time the listbox is open and on close — the active option is tracked via `aria-activedescendant`, never via `.focus()`. There's no automatic focus move to veto.

If you need to programmatically move focus elsewhere (e.g. into the listbox), do it from your own keydown handler — the combobox won't fight you.

## Form integration

`[forCombobox]` implements `FormValueControl<readonly T[]>`. Pair with `[formField]` for auto-wiring with `@angular/forms/signals`:

```html
<div forCombobox [formField]="form.country">
  <input forComboboxInput />
  …
</div>
```

For a legacy `<form action="…">` flow, set `[name]` — the directive mirrors `[(value)]` into N `<input type="hidden">` siblings (one per array entry; zero when empty). String values land verbatim in the hidden input; object values default to `JSON.stringify` (override via `[itemToFormValue]`, see below).

## Object values

Real apps usually have richer option models — `{ id, label, ... }` — where the user-facing label and the comparison key differ, plus extra fields the consumer wants on selection. `[forCombobox]` is generic over `T` to support that without forcing the consumer to stringify and re-hydrate.

Three inputs configure the object behaviour. Defaults make string mode work unchanged:

| Input                  | Default                                                            | Purpose                                                                                                         |
| ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `[isItemEqualToValue]` | `(a, b) => a === b`                                                | How two items compare. Override for object values so selection / removal locate by id (or any stable key).      |
| `[itemToStringLabel]`  | `(item) => String(item)`                                           | Render an item as a string. Drives `commitOnSelect` writes into the input and the chip-label fallback.          |
| `[itemToFormValue]`    | `(item) => typeof item === 'string' ? item : JSON.stringify(item)` | Serialize an item for the hidden input. Override to emit a per-item id (or any wire format your backend wants). |

```html
@let q = query().toLowerCase(); @let filtered = cities().filter((c) =>
c.name.toLowerCase().includes(q));

<div
  forCombobox
  [(query)]="query"
  [(value)]="value"
  [(open)]="open"
  [isItemEqualToValue]="byId"
  [itemToStringLabel]="toName"
  name="city"
  [itemToFormValue]="toId"
>
  <input forComboboxInput placeholder="Search a city…" />
  @if (open()) {
  <div forComboboxContent>
    @for (c of filtered; track c.id) {
    <div forComboboxOption [value]="c">{{ c.name }}</div>
    }
  </div>
  }
</div>
```

```ts
interface City {
  id: string;
  name: string;
}

readonly query = signal('');
readonly value = signal<readonly City[]>([]);
readonly open = signal(false);
readonly cities = signal<readonly City[]>([
  { id: 'paris', name: 'Paris' },
  { id: 'berlin', name: 'Berlin' },
]);

readonly byId = (a: City, b: City) => a.id === b.id;
readonly toName = (c: City) => c.name;
readonly toId = (c: City) => c.id;
```

The same three inputs cover multi mode + chips: bind `<span forComboboxChip [value]="chip.value">` to the object and the chip's resolved `label()` falls back through `itemToStringLabel` when the option cache is cold (e.g. chips rendered before the listbox has opened).

## Virtualization

For very large option sets (1k+) the consumer can render only the visible window and let the directive coordinate navigation across the full source. Three additive inputs / one output cover the wiring; non-virtualized usage is unchanged.

| Input / Output                              | Purpose                                                                                                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[totalCount]: number \| undefined`         | Length of the **filtered** source array. Drives `aria-setsize` and lets navigation walk past the rendered window. Leave `undefined` (default) for non-virtualized lists.   |
| `[visibleRange]: [start, end) \| undefined` | Inclusive-exclusive index range currently rendered in the DOM. Pulled from your virtualizer's `getVirtualItems()`.                                                         |
| `[forComboboxOption][posInSet]`             | Absolute index of this option in the source array. Required when virtualizing; the directive folds option data into a snapshot keyed by this index so it survives unmount. |
| `(scrollToIndex)`                           | Emitted when arrow keys (or Home / End) need to land on an option whose absolute index falls outside `visibleRange()`. Wire to the virtualizer's `scrollToIndex(idx)`.     |

How navigation flows when virtualizing:

1. The user presses **End** while the visible window is `[0, 20)` and the source has 1000 items.
2. The directive computes the next index (999) against `totalCount`. It's outside `visibleRange`, so the directive emits `(scrollToIndex)=999` and remembers 999 as the pending pos.
3. Your virtualizer scrolls; the directive's `@for` mounts the option for index 999.
4. As soon as that option registers (at the matching `posInSet`), the directive seeds `aria-activedescendant` to its id.

Typeahead, inline autocomplete, and `selected().label` all read from a merged snapshot that retains entries for options scrolled out of view, so completion against off-screen labels still works.

```html
@let virtualItems = virtualizer.virtualItems(); @let total = virtualizer.totalCount();

<div
  forCombobox
  [(query)]="query"
  [(value)]="value"
  [(open)]="open"
  [totalCount]="total"
  [visibleRange]="virtualizer.range()"
  (scrollToIndex)="virtualizer.scrollToIndex($event)"
>
  <input forComboboxInput placeholder="Search 100k items…" />
  @if (open()) {
  <div forComboboxContent #scroll>
    <div [style.height.px]="virtualizer.totalSize()" style="position: relative">
      @for (vi of virtualItems; track vi.key) {
      <div
        forComboboxOption
        [value]="filtered()[vi.index]!.id"
        [label]="filtered()[vi.index]!.label"
        [posInSet]="vi.index"
        [style.transform]="'translateY(' + vi.start + 'px)'"
        style="position: absolute; left: 0; right: 0;"
      >
        {{ filtered()[vi.index]!.label }}
      </div>
      }
    </div>
  </div>
  }
</div>
```

The above sketches a `@tanstack/virtual` integration: `virtualizer.virtualItems()` is the windowed slice, `virtualizer.totalSize()` is the spacer height, and `virtualizer.scrollToIndex(idx)` brings an absolute index into view. The directive does not own the scroll container — the consumer's virtualizer does.

When `[totalCount]` is omitted, the directive falls back to `options().length` and behaves exactly as before — `aria-setsize` is left to the platform default and navigation never emits `(scrollToIndex)`.

> **Disabled options off-screen.** The directive learns an option's `disabled` only when it's been rendered at least once. While the consumer can pre-mark disabled rows with their own filter (most apps do), arrow nav cannot skip an off-screen disabled option it has never seen — it will land on it, the option will mount, and the next arrow press skips. Mark disabled rows in the source array if this matters.

> **Listbox virtualization** is intentionally not part of this release: `[forListbox]` uses roving tabindex (DOM focus on the actual option element), which can't be virtualized without flipping its keyboard model to `aria-activedescendant`. That's a separate opt-in (`selection="activedescendant"`) tracked elsewhere.

## Writing direction

`[forCombobox]` exposes a `dir: 'ltr' | 'rtl'` input (default `'ltr'`). It drives:

- **Chip keyboard navigation** — ArrowLeft / ArrowRight roles swap so they follow the visual order of the chip cluster, not the DOM order. See _Chip keyboard_ above.
- **Default popover placement** — `align` defaults to `'start'` in LTR and `'end'` in RTL so the listbox anchors to the visually-leading edge of the input (`side` defaults to `'bottom'` in both). A consumer-provided `[align]` is honoured as-is — no automatic flip — so advanced layouts can pin an alignment regardless of writing direction.

The native `<input>` handles caret movement and BiDi from the document's CSS `direction` already, so there's nothing extra to do for the typed text itself.

## CSS custom properties

`[forComboboxContent]` is portaled to `document.body` and gets its position resolved by floating-ui. The resolved geometry is exposed as custom properties on the content host (cleared on close):

| Custom property                  | Type / range        | Meaning                                                                                              |
| -------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| `--for-anchor-width`             | px                  | Anchor (input / wrapper) width — match the listbox to the input with `width: var(--for-anchor-width)`. |
| `--for-anchor-height`            | px                  | Anchor height.                                                                                       |
| `--for-available-width`          | px                  | Space available along the inline axis (floating-ui `size` middleware) — clamp with `max-width`.      |
| `--for-available-height`         | px                  | Space available along the block axis — clamp with `max-height`.                                      |
| `--for-content-transform-origin` | `<origin>` keywords | `transform-origin` matching the resolved side / align, so a `scale` enter animation pivots from the input. |

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
