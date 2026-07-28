# Combobox

An editable input paired with a filterable listbox popup, supporting single or multi selection with chips.

> New to overlays in forty-cdk? [Your first overlay](../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

Headless: `role="combobox"` on the input, `role="listbox"` on the surface, `role="option"` on items, plus `aria-activedescendant` so DOM focus stays in the input. Implements the `FormValueControl<readonly T[]>` interface from `@angular/forms/signals`.

Supports both single (default) and multi-select. Multi mode renders the selected values as chips next to the input.

Two anatomies share the same core:

- **Editable** _(default)_ — the input is the visible field, the floating anchor, and the keyboard owner; `[forComboboxContent]` is the listbox. This is the APG editable combobox.
- **Picker** — a `[forComboboxTrigger]` `<button>` keeps showing the committed selection while the search input lives **inside** the panel (a "combobox with trigger" picker). Add a `[forComboboxList]` so the popup can hold an input without violating ARIA owned-elements. See [Picker anatomy](#picker-anatomy).

`[forCombobox]` is generic over the option value type `T` (default `string`). Bind primitive ids for the simple case or full objects for richer models — the directive infers `T` from `[(value)]` and `[forComboboxOption][value]`. See [Object values](#object-values) for the object-mode contract.

## Anatomy

The editable (default) anatomy — an `<input>` that filters a portaled listbox in place:

```html
<div forCombobox [(query)]="query" [(value)]="value">
  <input forComboboxInput placeholder="Search…" />
  <button forComboboxClear>×</button>

  <!-- @if (open()) { -->
  <div forComboboxContent>
    <div forComboboxOption [value]="item.id" [label]="item.label">
      <span forComboboxIndicator>✓</span>
      {{ item.label }}
    </div>
    <div forComboboxEmpty>No matches.</div>
  </div>
  <!-- } -->
</div>
```

**Editable + list (no trigger).** Wrapping the options in a `[forComboboxList]` without adding a `[forComboboxTrigger]` is a supported shape, and the a11y-clean way to add non-option pieces (`[forComboboxEmpty]`, `[forComboboxStatus]`, `[forComboboxAction]`) to the editable anatomy. Because content carries `role="listbox"` (which may only own `option` / `group` children), moving the options into `[forComboboxList]` makes those pieces siblings of the listbox instead of invalid listbox children — content becomes role-less and the list owns the listbox role. The role split keys off `hasList`, the focus model off `trigger()`, so focus still stays on the input the whole time:

```html
<div forComboboxContent>
  <div forComboboxList>
    <div forComboboxOption [value]="item.id" [label]="item.label">{{ item.label }}</div>
  </div>
  <div forComboboxEmpty>No matches.</div>
</div>
```

A `[forComboboxAction]` **requires** this shape — see [Action items](#action-items).

> **Editable-anatomy caveat.** For the common case of options plus only a `[forComboboxEmpty]` / `[forComboboxStatus]` message (the bare anatomy above, no `[forComboboxList]`), the message sits directly inside `[forComboboxContent]`. This is still supported and does not throw, but it leaves the `role="status"` message as an owned child of `role="listbox"`, a minor `aria-required-owned` compromise; wrap the options in a `[forComboboxList]` (the "editable + list" shape) when you want the strictly-clean tree.

The picker anatomy adds a `[forComboboxTrigger]` `<button>` showing the committed selection, with the search input and a `[forComboboxList]` (`role="listbox"`) nested inside the popup — see [Picker anatomy](#picker-anatomy). Multi mode wraps the chips + input in `[forComboboxChips]` — see [Multi mode](#multi-mode). Optional `[forComboboxAnchor]`, `[forComboboxStatus]`, `[forComboboxGroup]` / `[forComboboxGroupLabel]`, and `[forComboboxSeparator]` pieces are covered in their own sections below.

## Examples

### Filtering is the consumer's job

The primitive is headless — it does **not** filter the registered options. The consumer reads `[forCombobox][(query)]`, applies whatever match logic they want, and renders the filtered subset with `@for`. Each rendered `[forComboboxOption]` registers itself; the listbox tracks the live set automatically.

```html
@let q = query().toLowerCase(); @let filtered = items.filter(it =>
it.label.toLowerCase().includes(q));

<div forCombobox #combobox="forCombobox" [(query)]="query" [(value)]="value">
  <input forComboboxInput placeholder="Search a fruit…" />
  @if (combobox.open()) {
  <div forComboboxContent>
    @for (it of filtered; track it.id) {
    <div forComboboxOption [value]="it.id" [label]="it.label">{{ it.label }}</div>
    }
    <div forComboboxEmpty>No matches.</div>
  </div>
  }
</div>
```

`[(query)]` (the typed text) and `[(value)]` (the committed selection / form state) are the consumer's. Open state is separate: `[forCombobox]` owns it as a `model<boolean>`, and since the directive is `exportAs: 'forCombobox'` you can read it straight off a template reference variable — `#combobox="forCombobox"` — and gate `[forComboboxContent]` on `combobox.open()`. Focus / query / arrow keys flip it; Escape, Tab, and outside-pointer flip it back. No separate `open` signal, no `[(open)]` — bind `[(open)]="mySignal"` (as the multi / object / virtualization examples below do) only when the component class needs to read or drive open state itself.

#### Static options alongside the `@for`

A sentinel option (an "Add new…" action, a "No results" row, a pinned default) can be rendered **statically** above or below the `@for` list — it does not need to be folded into the filtered collection:

```html
<div forComboboxContent>
  <div forComboboxOption [value]="addSentinel" [label]="'Add new…'">Add new…</div>
  @for (it of filtered; track it.id) {
  <div forComboboxOption [value]="it.id" [label]="it.label">{{ it.label }}</div>
  }
</div>
```

Static and `@for`-rendered options share the same registry, navigation order (DOM order), filtering, and label cache. This is right when the entry _selects_ (adds to `value` and commits). For a pinned entry that is a pure side-effect and must **not** land in `value` — "Create new…", "Manage tags…" — reach for [`[forComboboxAction]`](#action-items) instead.

### Signal Forms

`[forCombobox]` implements `FormValueControl<readonly T[]>`. Pair with `[formField]` for auto-wiring with `@angular/forms/signals`:

```html
<div forCombobox [formField]="form.country">
  <input forComboboxInput />
  …
</div>
```

For a legacy `<form action="…">` flow, set `[name]` — the directive mirrors `[(value)]` into N `<input type="hidden">` siblings (one per array entry; zero when empty). String values land verbatim in the hidden input; object values default to `JSON.stringify` (override via `[itemToFormValue]`, see below).

When the consumer models a single-select field as `T | null` (not `readonly T[]`), bridge it with `forSingleValueField` so the same `[formField]` wiring works unchanged: `[formField]="forSingleValueField(form.country)"`. See [Signal Forms helpers](../signal-forms/README.md).

## API

Input tables are not yet tabulated for this primitive. See the feature sections below for documented inputs and the prose descriptions of each input.

### Data attributes

| Piece                    | Attribute          | Values                                                              |
| ------------------------ | ------------------ | ------------------------------------------------------------------- |
| `[forCombobox]`          | `data-state`       | `open` \| `closed`                                                  |
| `[forCombobox]`          | `data-disabled`    | present / absent                                                    |
| `[forComboboxInput]`     | `data-state`       | `open` \| `closed`                                                  |
| `[forComboboxInput]`     | `data-disabled`    | present / absent                                                    |
| `[forComboboxContent]`   | `data-state`       | `open` \| `closed`                                                  |
| `[forComboboxOption]`    | `data-state`       | `checked` \| `unchecked` (membership in `value()`, both modes)      |
| `[forComboboxOption]`    | `data-highlighted` | present / absent (the current `aria-activedescendant`)              |
| `[forComboboxOption]`    | `data-disabled`    | present / absent                                                    |
| `[forComboboxAction]`    | `data-highlighted` | present / absent (the action currently holds DOM focus)             |
| `[forComboboxAction]`    | `data-disabled`    | present / absent                                                    |
| `[forComboboxIndicator]` | `data-state`       | `checked` \| `unchecked` (mirrors the parent option)                |
| `[forComboboxChip]`      | `data-value`       | the chip's serialized value (verbatim string, or `itemToFormValue`) |
| `[forComboboxChip]`      | `data-disabled`    | present / absent                                                    |
| `[forComboboxSeparator]` | `data-orientation` | `horizontal` \| `vertical`                                          |

Focus stays on the `<input>` the whole time the listbox is open, so options never get `:focus` — `data-highlighted` is the canonical hook for styling the keyboard-active option.

## Mount/visibility convention

`[forComboboxContent]` follows the floating-overlay convention: the consumer's signal drives `@if`, the directive emits dismiss events when it wants to be unmounted. No `[hidden]`. The visible input lives outside the overlay; only the listbox surface portals.

## Anchoring to a field box

By default the listbox is positioned against `[forComboboxInput]`. When the input lives inside a decorated field box — padding, a prefix icon, a clear button, or the multi-mode chip cluster — anchoring to the bare `<input>` makes the panel narrower than the visible field and offset from its edge. Wrap the field box in `[forComboboxAnchor]` so floating-ui positions (and sizes, via `--for-anchor-width`) the listbox against the box instead:

```html
<div forCombobox #combobox="forCombobox" [(query)]="query" [(value)]="value">
  <div forComboboxAnchor class="field-box">
    <icon name="search" />
    <input forComboboxInput placeholder="Search a fruit…" />
    <button class="clear" (click)="combobox.clear()">×</button>
  </div>
  @if (combobox.open()) {
  <div forComboboxContent style="width: var(--for-anchor-width)">
    @for (it of filtered; track it.id) {
    <div forComboboxOption [value]="it.id" [label]="it.label">{{ it.label }}</div>
    }
  </div>
  }
</div>
```

`[forComboboxAnchor]` changes **only** positioning. The input keeps `aria-controls` / `aria-expanded` / `aria-activedescendant`, all keyboard interaction, and its exemption from outside-pointer dismissal. Without an anchor the listbox falls back to the input, so existing markup is unaffected. At most one `[forComboboxAnchor]` per `[forCombobox]` — a second one throws `[forty-cdk/combobox]`. In multi mode, wrap `[forComboboxChips]` (which already wraps the chips + input) to anchor against the full chip cluster.

## Picker anatomy

The default (editable) anatomy is a text field that filters in place. A **picker** is the other common shape: a button shows the committed selection (label + icon), and clicking it opens a panel whose search input filters a list — a "combobox with trigger" picker. Reach for it when the closed control should read as "the selected thing", not as an editable field.

Add two parts:

- **`[forComboboxTrigger]`** — a real `<button>` outside the `@if (open())`. It opens the panel, becomes the default positioning anchor, and is where focus returns on close.
- **`[forComboboxList]`** — the `role="listbox"` element nested inside `[forComboboxContent]`, next to the input. It owns the options and the labelled role; `[forComboboxContent]` becomes a neutral popup surface.

```html
<div forCombobox #combobox="forCombobox" [(value)]="value" [(query)]="query" [(open)]="open">
  <button forComboboxTrigger>{{ selectedLabel() }}</button>
  @if (combobox.open()) {
  <div forComboboxContent>
    <input forComboboxInput placeholder="Search…" />
    <div forComboboxList>
      @for (item of filtered(); track item.id) {
      <div forComboboxOption [value]="item.id" [label]="item.label">{{ item.label }}</div>
      }
      <div forComboboxEmpty>No matches.</div>
    </div>
  </div>
  }
</div>
```

Why the list part is required, not optional: a `role="listbox"` may only own `option` / `group` children (`aria-required-owned-elements`). Nesting the input inside a listbox would be invalid, so the listbox role moves to `[forComboboxList]` and the input sits beside it under the neutral popup surface. Put non-option chrome — `[forComboboxInput]`, `[forComboboxEmpty]`, `[forComboboxStatus]` — inside `[forComboboxContent]` but **outside** `[forComboboxList]`.

**Focus hand-off.** Registering a trigger opts the combobox into the standard trigger-anchored focus model: on open, focus moves into the input (the search field inside the panel); on close, focus returns to the trigger. Both moves are vetoable via `(autoFocusOnOpen)` / `(autoFocusOnClose)` on `[forCombobox]`, and the return is gated by `[returnFocus]` (default `true`). Escape stays owned by the input. See [Focus & the `(autoFocusOnOpen)` / `(autoFocusOnClose)` hooks](#focus--the-autofocusonopen--autofocusonclose-hooks).

**Trigger keyboard.** Click / Enter / Space toggle (open moves focus into the input). ArrowDown opens with the first enabled option highlighted; ArrowUp opens with the last.

**Anchor preference.** With a trigger present the panel anchors to it by default. An explicit `[forComboboxAnchor]` still wins (explicit anchor → trigger → input), so you can wrap a decorated trigger box and anchor against it.

**Picking which anatomy.** Use the editable anatomy for type-to-filter text fields and tag inputs (the input is always visible). Use the picker anatomy for select-like pickers where the closed state shows a chosen value and search is an in-panel affordance. Everything else — filtering being the consumer's job, `[(value)]` / `[(query)]` / object values / multi mode / virtualization — works identically in both.

**Transient query.** In the picker anatomy the in-panel `[forComboboxInput]` is a _transient filter_, not the value display — the committed selection lives on the `[forComboboxTrigger]`. So the combobox resets `query` to `''` every time the panel closes, and single-mode activation never copies the option label into `query` (the editable anatomy's `commitOnSelect` is effectively off here). Reopen the panel and the search starts empty with the full option list, the previously-picked option carrying `data-state="checked"`. `commitOnSelect` governs the **editable** anatomy only; to keep a typed filter across reopen in the picker, drive `query` yourself from `(openChange)`.

**Triggers stamped from outside-declared templates.** Angular resolves `ng-template` DI at the template's **declaration** site, not where it is stamped. A `[forComboboxTrigger]` declared in a template outside the root throws the orphan error even when the template is rendered inside the root via `ngTemplateOutlet`. For that case the selector attribute accepts the root reference as a value, `routerLink`-style — grab it with `#root="forCombobox"` and pass it through the outlet context. The bare valueless attribute keeps resolving via DI.

```html
<div forCombobox #root="forCombobox" [(value)]="value" [(query)]="query">
  <ng-container *ngTemplateOutlet="trig; context: { root }" />
  @if (root.open()) {
  <div forComboboxContent>…</div>
  }
</div>

<ng-template #trig let-root="root">
  <button [forComboboxTrigger]="root">{{ selectedLabel() }}</button>
</ng-template>
```

## Action items

A combobox popup often needs an entry that is an **action**, not a value —
"Create new …", "Manage tags …", "Clear all". Semantically these are
`role="button"` actions, not `role="option"` selections, so `[forComboboxAction]`
renders one that stays out of the option/value collection entirely.

`[forComboboxAction]` **requires a `[forComboboxList]`**: content carries
`role="listbox"` in the editable anatomy, so a `role="button"` placed directly
inside it would be an invalid listbox child (`aria-required-owned`). Wrap the
options in a `[forComboboxList]` so the action becomes a sibling of the listbox.
An action rendered without a `[forComboboxList]` throws `[forty-cdk/combobox]` at
runtime. This is the "editable + list" shape (no `[forComboboxTrigger]` needed).

```html
<div forCombobox #combobox="forCombobox" [(query)]="query" [(value)]="value">
  <input forComboboxInput placeholder="Search…" />
  @if (combobox.open()) {
  <div forComboboxContent>
    <button forComboboxAction (activate)="createNew(query())">Create "{{ query() }}"</button>
    <div forComboboxList>
      @for (it of filtered; track it.id) {
      <div forComboboxOption [value]="it.id" [label]="it.label">{{ it.label }}</div>
      }
    </div>
  </div>
  }
</div>
```

An action:

- **never touches `value` / `options()`.** It registers in a collection separate
  from options, so `options()`, `aria-setsize`, and `aria-posinset` are
  unaffected and activation emits `(activate)` instead of mutating `[(value)]`. The
  consumer decides what happens and whether to close the popup afterwards.
- **is `role="button"`, not `role="option"`.** Assistive tech announces it as an
  action, not as one of N choices.
- **is reached by Tab, not the arrow keys** (see below), so it stays reachable no
  matter how long — or how virtualized — the option list is.

Use `[forComboboxAction]` for a pinned side-effect. For an entry that _does_
select (an "Add new" row that adds an item and commits it to `value`), use a
plain `[forComboboxOption]` — see [Static options alongside the `@for`](#static-options-alongside-the-for).

### Focus & keyboard (model A)

While the popup is open, **Tab / Shift+Tab** cycle DOM focus around the ring
`[input, …enabled actions]` (in DOM order, wrapping both ways) **without
dismissing** the popup. Options stay arrow-navigated via `aria-activedescendant`;
actions stay Tab-focused — the two models never mix. This keeps a pinned action
reachable in a bounded number of keypresses regardless of the option count, which
a bottom-pinned option cannot guarantee under infinite scroll.

Because focus is trapped in the input↔actions ring while open, **Escape** (or an
outside pointer) is how you leave: Escape from an action closes the popup and
returns focus to the input (editable anatomy) or the `[forComboboxTrigger]`
(picker anatomy). Activation is **click / Enter / Space** and routes to `(activate)`
only. With no action registered, Tab keeps its default "close and let Tab flow on"
behaviour, so existing comboboxes are unchanged.

Actions live inside `[forComboboxContent]` and beside `[forComboboxList]` (never
inside it, in either anatomy), so they are naturally "inside" the outside-pointer /
outside-focus dismissal checks, exactly like the input.

### API

| Member       | Type           | Notes                                                                                                      |
| ------------ | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `[disabled]` | `boolean`      | Drops the action out of the focus ring (`tabindex` removed), reflects `aria-disabled`, ignores activation. |
| `(activate)` | `output<void>` | Fired on click / Enter / Space. Never mutates `[(value)]`.                                                 |

`[forComboboxAction]` host-binds `role="button"`, `type="button"` (on a native
`<button>` host only — any other element gets no `type`), a primitive-managed
`tabindex`, `aria-disabled` (when disabled), and reflects `data-highlighted`
while it holds DOM focus + `data-disabled` when disabled.

> **Out of scope (v1):** grouped action clusters / multiple action zones,
> submenu-style nested actions, and actions that mutate `value` (use a plain
> `[forComboboxOption]`).

## Self-hiding pieces

`[forComboboxClear]` (nothing to clear) and `[forComboboxEmpty]` (options exist) hide themselves with an inline `display: none` in addition to the `hidden` attribute that removes them from the accessibility tree. Because the inline style beats any author selector rule, you can give these pieces a custom `display` (e.g. `display: inline-flex` for an icon) without a `.x[hidden] { display: none }` workaround — the directive's `display: none` still wins while the piece is hidden, and your `display` applies once it shows.

## Two models, separately tracked

The combobox separates **what the user is typing** from **what's been committed**:

- `[(query)]: string` — the visible text the user is editing.
- `[(value)]: readonly string[]` — committed selection. Single mode keeps 0 or 1 element; multi mode keeps any number.
- `selectedItem: Signal<T | null>` — read-only single-select convenience view of `value`: the sole selected item, or `null` when none / many are selected. Lets single-select consumers skip `value()[0]`. (Distinct from `selected`, which pairs every value with its resolved label for chip rendering.)

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

When the input is empty (no query) and the user presses Backspace, focus jumps to the last chip. A second Backspace there removes it. While typing (input non-empty), Backspace falls through to the native delete-char.

## Open / close behavior

| Behavior                                | Default | Override                                                         |
| --------------------------------------- | ------- | ---------------------------------------------------------------- |
| Open on focus                           | `false` | `[openOnFocus]="true"`                                           |
| Open on query                           | `true`  | `[openOnQuery]="false"`                                          |
| Auto-highlight first option             | `true`  | `[autoHighlight]="false"` to require arrowing to an option first |
| Commit label / clear query on select    | `true`  | `[commitOnSelect]="false"`                                       |
| Clear value on query edit (single only) | `false` | `[clearOnQueryChange]="true"`                                    |

## Autocomplete modes

The `autocompleteMode` input mirrors the WAI-ARIA `aria-autocomplete` property:

- **`'none'`** — input is a free-text query; no completion.
- **`'list'`** _(default)_ — listbox shows filtered options; input shows verbatim what the user typed.
- **`'inline'`** — the rest of the first matching label is auto-completed into the input as selected text; no listbox popup.
- **`'both'`** — combines `'list'` and `'inline'`: listbox opens _and_ the input is auto-completed.

Inline completion preserves the user's typed prefix as unselected and selects the appended remainder, so the next keystroke replaces the selection (matching native browser autofill behavior). Backspace deletes the selection without re-completing, so the user can always shorten the query.

> **Pure `'inline'` needs a warm cache.** `'inline'` never opens the popup (per APG — `aria-autocomplete="inline"` has no listbox), so in the default `@if (open())` anatomy no `[forComboboxOption]` ever renders and the label cache starts cold. A first keystroke into a combobox that has never been opened completes against nothing; inline completion only works once the options have rendered at least once (the user opened the popup via ArrowDown or `[openOnFocus]`, warming the cache). If completion must work from the very first keystroke, use `'both'` (which opens the popup) or keep the options mounted rather than gating them behind `@if (open())`.

## Dismiss events

Each dismiss reason emits a vetoable event from `[forCombobox]` — call `preventDefault()` on the event to keep the listbox open.

| Output                 | When                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `(escapeKeyDown)`      | Escape pressed while the listbox is open and the input has focus. |
| `(pointerDownOutside)` | Pointer-down outside both input and content.                      |
| `(focusOutside)`       | Focus moves outside both input and content.                       |
| `(interactOutside)`    | Either of the two above.                                          |

## Focus & the `autoFocusOnOpen` / `autoFocusOnClose` hooks

The two anatomies have different focus models:

- **Editable anatomy** — the input retains focus the entire time the listbox is open and on close; the active option is tracked via `aria-activedescendant`, never via `.focus()`. There is no automatic focus move, so `(autoFocusOnOpen)` / `(autoFocusOnClose)` never fire. If you need to move focus elsewhere, do it from your own keydown handler — the combobox won't fight you.
- **Picker anatomy** — focus moves into the input on open and returns to the `[forComboboxTrigger]` on close, exactly like the other trigger-anchored overlays (`[forPopover]`, `[forDropdownMenu]`, `[forSelect]`). Both moves emit a vetoable event on `[forCombobox]`; call `preventDefault()` to keep focus where it is:

| Output               | When                                        | `preventDefault()` effect   |
| -------------------- | ------------------------------------------- | --------------------------- |
| `(autoFocusOnOpen)`  | Just before focus enters the input on open. | Focus stays on the trigger. |
| `(autoFocusOnClose)` | Just before focus returns to the trigger.   | Focus stays where it is.    |

Return focus is also gated by `[returnFocus]` (default `true`) and is skipped on a Tab close (Tab already advanced focus past the closing panel).

## Object values

Real apps usually have richer option models — `{ id, label, ... }` — where the user-facing label and the comparison key differ, plus extra fields the consumer wants on selection. `[forCombobox]` is generic over `T` to support that without forcing the consumer to stringify and re-hydrate.

Three inputs configure the object behaviour. Defaults make string mode work unchanged:

| Input                 | Default                                                            | Purpose                                                                                                         |
| --------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `[compareWith]`       | `(a, b) => a === b`                                                | How two items compare. Override for object values so selection / removal locate by id (or any stable key).      |
| `[itemToStringLabel]` | `(item) => String(item)`                                           | Render an item as a string. Drives `commitOnSelect` writes into the input and the chip-label fallback.          |
| `[itemToFormValue]`   | `(item) => typeof item === 'string' ? item : JSON.stringify(item)` | Serialize an item for the hidden input. Override to emit a per-item id (or any wire format your backend wants). |

```html
@let q = query().toLowerCase(); @let filtered = cities().filter((c) =>
c.name.toLowerCase().includes(q));

<div
  forCombobox
  [(query)]="query"
  [(value)]="value"
  [(open)]="open"
  [compareWith]="byId"
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
<div
  forCombobox
  [(query)]="query"
  [(value)]="value"
  [(open)]="open"
  [totalCount]="filtered().length"
  [visibleRange]="v.range()"
  (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
>
  <input forComboboxInput placeholder="Search 100k items…" />
  @if (open()) {
  <div forComboboxContent #scroll style="overflow: auto; max-height: 320px">
    <div [style.height.px]="v.totalSize()" style="position: relative">
      @for (vi of v.virtualItems(); track vi.key) {
      <div
        forComboboxOption
        [value]="filtered()[vi.index]!.id"
        [label]="filtered()[vi.index]!.label"
        [posInSet]="vi.index"
        [style.transform]="'translateY(' + vi.start + 'px)'"
        style="position: absolute; left: 0; right: 0"
      >
        {{ filtered()[vi.index]!.label }}
      </div>
      }
    </div>
  </div>
  }
</div>
```

```ts
readonly query = signal('');
readonly value = signal<readonly string[]>([]);
readonly open = signal(false);
// `filtered()` is the consumer's own filtered source array (see "Filtering is the consumer's job").

readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
readonly v = injectVirtualizer({
  count: computed(() => this.filtered().length),
  estimateSize: () => 36,
  scrollElement: this.scrollElement,
});
```

This uses the library's own [`injectVirtualizer`](../virtualization/README.md) core: `v.virtualItems()` is the windowed slice, `v.totalSize()` the spacer height, `v.range()` feeds `[visibleRange]`, and `v.scrollToIndex(idx)` brings an absolute index into view. The directive does not own the scroll container — the consumer's virtualizer does (here `[forComboboxContent]` is the scroll element).

When `[totalCount]` is omitted, the directive falls back to `options().length` and behaves exactly as before — `aria-setsize` is left to the platform default and navigation never emits `(scrollToIndex)`.

> **Disabled options off-screen.** The directive learns an option's `disabled` only when it's been rendered at least once. While the consumer can pre-mark disabled rows with their own filter (most apps do), arrow nav cannot skip an off-screen disabled option it has never seen — it will land on it, the option will mount, and the next arrow press skips. Mark disabled rows in the source array if this matters.

> **Listbox virtualization** ships the same contract — `[forListbox]` defaults to roving tabindex (DOM focus on the actual option element) and switches to the `aria-activedescendant` model when you set `[totalCount]`. See the [Listbox README "Virtualization"](../listbox/README.md#virtualization) section.

## Writing direction

`[forCombobox]` exposes a `dir: 'ltr' | 'rtl'` input (default `'ltr'`). It drives:

- **Chip keyboard navigation** — ArrowLeft / ArrowRight roles swap so they follow the visual order of the chip cluster, not the DOM order. See _Chip keyboard_ above.
- **Default popover placement** — `align` defaults to `'start'` in LTR and `'end'` in RTL so the listbox anchors to the visually-leading edge of the input (`side` defaults to `'bottom'` in both). A consumer-provided `[align]` is honoured as-is — no automatic flip — so advanced layouts can pin an alignment regardless of writing direction.

The native `<input>` handles caret movement and BiDi from the document's CSS `direction` already, so there's nothing extra to do for the typed text itself.

## Keyboard

Focus stays in the input throughout — arrow keys move the listbox's _active descendant_ (the highlighted option), they do not move DOM focus.

| Key                                          | Action                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **ArrowDown**                                | Open listbox + move activedescendant to next enabled option (or first when none).                                              |
| **ArrowUp**                                  | Open listbox + move activedescendant to previous enabled option (or last when none).                                           |
| **Home** _(open)_                            | Move activedescendant to first enabled option.                                                                                 |
| **End** _(open)_                             | Move activedescendant to last enabled option.                                                                                  |
| **PageUp** _(open)_                          | Move activedescendant to first enabled option.                                                                                 |
| **PageDown** _(open)_                        | Move activedescendant to last enabled option.                                                                                  |
| **Enter** _(open)_                           | Activate the activedescendant (single: replace + close; multi: toggle + stay open).                                            |
| **Escape** _(open)_                          | Close the listbox. Focus stays in the input.                                                                                   |
| **Tab** _(open, no action)_                  | Close the listbox and let Tab flow to the next focusable.                                                                      |
| **Tab / Shift+Tab** _(open, action present)_ | Move focus around the input↔actions ring without dismissing — see [Action items](#action-items).                               |
| **Backspace** _(empty input, multi only)_    | Focus the last chip; a second Backspace there removes it.                                                                      |
| Printable keys                               | Update `query`. With `'inline'` / `'both'` autocomplete, complete the rest of the first match into the input as selected text. |

Hovering an option also makes it the activedescendant, so mouse and keyboard intent stay synchronized.

## Accessibility

Implements the [WAI-ARIA Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

- Apply the input directive to an actual `<input>` — the browser's caret and selection semantics are what make inline autocomplete work, and screen readers expect a real text field for `role="combobox"`.
- `role="listbox"` lives on `[forComboboxContent]` in the editable anatomy and on `[forComboboxList]` in the picker anatomy; the input's `aria-controls` targets whichever carries it. In the picker anatomy the popup surface (`[forComboboxContent]`) is role-less so it can hold the input next to the list without an `aria-required-owned-elements` violation.
- `aria-multiselectable="true"` (multi mode) and the labelled role (`aria-label` / `aria-labelledby`, pointing at the input) sit on whichever element carries `role="listbox"` — content in the editable anatomy, the list in the picker anatomy.
- `[forComboboxTrigger]` (picker anatomy) is a real `<button>` reflecting `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` (the popup surface, while open), and native `disabled` from the combobox's effective disabled. It is exempt from the popup's outside-pointer dismissal layer, like the input.
- In single mode, `aria-selected="true"` follows the activedescendant (the option Enter would activate). In multi mode it follows membership in `value()` — every selected option carries `aria-selected="true"` simultaneously.
- `data-state="checked" | "unchecked"` always reflects membership in `value()`, so consumers can paint a checkmark icon with pure CSS regardless of mode.
- `data-highlighted=""` marks the option that is the current `aria-activedescendant`. Because focus stays on the `<input>`, there is no `:focus` on the option to style — `data-highlighted` is the canonical CSS hook.
- Disabled options keep the host `aria-disabled="true"`. Click and hover (activedescendant pinning) are no-ops on disabled options.
- `[forComboboxSeparator]` never registers with the listbox's option collection — keyboard navigation skips it automatically. It carries `role="separator"` and emits `aria-orientation` only for `orientation="vertical"`, because `horizontal` is the ARIA default; `data-orientation` is always stamped for styling. Set `decorative` when the surrounding options already convey the split — it switches the line to `role="none"` and drops `aria-orientation`, matching the [shared separator emission policy](../separator/README.md#accessibility).
- `[forComboboxGroup]` is purely advisory grouping — options inside still register flatly with the root, so navigation flows through groups without interruption.
- `[forComboboxEmpty]` carries `role="status"` + `aria-live="polite"` so the empty-state message is announced when filtering removes all matches.
- Non-option pieces (`[forComboboxAction]`, and ideally `[forComboboxEmpty]` / `[forComboboxStatus]`) belong inside `[forComboboxContent]` but **outside** `[forComboboxList]` — `role="listbox"` may only own `option` / `group` children (`aria-required-owned-elements`). Wrapping the options in a `[forComboboxList]` (the "editable + list" shape) makes those pieces siblings of the listbox. `[forComboboxAction]` **requires** a `[forComboboxList]` and throws `[forty-cdk/combobox]` without one; `[forComboboxEmpty]` / `[forComboboxStatus]` stay lenient in the bare editable anatomy (documented compromise) — see the [editable-anatomy caveat](#anatomy).
- The input element is exempt from the listbox's outside-pointer dismissal layer, so a click on the input while the listbox is open routes through `(click)` (toggle / focus open) instead of double-firing as an outside dismissal.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed under [Data attributes](#data-attributes).

### CSS custom properties

`[forComboboxContent]` is portaled to `document.body` and gets its position resolved by floating-ui. The resolved geometry is exposed as custom properties on the content host (cleared on close):

| Custom property                  | Type / range        | Meaning                                                                                                    |
| -------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `--for-anchor-width`             | px                  | Anchor (input / wrapper) width — match the listbox to the input with `width: var(--for-anchor-width)`.     |
| `--for-anchor-height`            | px                  | Anchor height.                                                                                             |
| `--for-available-width`          | px                  | Space available along the inline axis (floating-ui `size` middleware) — clamp with `max-width`.            |
| `--for-available-height`         | px                  | Space available along the block axis — clamp with `max-height`.                                            |
| `--for-content-transform-origin` | `<origin>` keywords | `transform-origin` matching the resolved side / align, so a `scale` enter animation pivots from the input. |

> `[forComboboxContent]` is portaled to `document.body`, so it lives outside your component's view-encapsulated styles. Style it with global CSS (or a class you pass through) and the shared positioner properties above. See [Styling floating content](../../../docs/styling-floating-content.md) for the full positioner-variable list and the portal styling rules.

```css
.option[data-highlighted] {
  background: var(--accent);
}

.option:not([data-disabled]) {
  cursor: pointer;
}
```

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_COMBOBOX_HOST_DIRECTIVE_INPUTS` / `FOR_COMBOBOX_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../docs/wrapping-form-primitives.md).
