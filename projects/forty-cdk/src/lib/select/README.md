# Select

> New to overlays in forty-cdk? [Your first overlay](../../../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

Headless select primitive — a button trigger that opens a portaled listbox of options. Implements the [WAI-ARIA select-only combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/) (`role="combobox"` on the trigger, `role="listbox"` on the surface, `role="option"` on items) and the `FormValueControl<readonly T[]>` interface from `@angular/forms/signals`.

`[forSelect]` is generic over the option value type `T` (default `string`). Bind primitive ids for the simple case or full objects for richer models — the directive infers `T` from `[(value)]` and `[forSelectOption][value]`. See [Object values](#object-values) for the object-mode contract.

## Pieces

| Class                 | Selector                | Role                                                                                                                             |
| --------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ForSelect`           | `[forSelect]`           | Root. Owns `[(value)]`, `[(open)]`, the option collection, ids, and the dismiss event surface.                                   |
| `ForSelectTrigger`    | `[forSelectTrigger]`    | The `<button role="combobox">` that opens the listbox. Wires `aria-haspopup`, `aria-expanded`, `aria-controls`.                  |
| `ForSelectValue`      | `[forSelectValue]`      | Renders the selected option's text — or the placeholder — into its host via `textContent`. Optional.                             |
| `ForSelectContent`    | `[forSelectContent]`    | The listbox surface. Portaled, positioned by floating-ui, dismissable layer attached.                                            |
| `ForSelectOption`     | `[forSelectOption]`     | One option. `value: required<T>` (defaults to `string`).                                                                         |
| `ForSelectIndicator`  | `[forSelectIndicator]`  | Optional. Self-hides (inline `display:none` + `hidden`) when the parent option is unselected. Mirrors the option's `data-state`. |
| `ForSelectGroup`      | `[forSelectGroup]`      | Logical grouping, `role="group"` with `aria-labelledby`.                                                                         |
| `ForSelectGroupLabel` | `[forSelectGroupLabel]` | Label registered with the parent group.                                                                                          |
| `ForSelectSeparator`  | `[forSelectSeparator]`  | Decorative separator, `role="separator"`. Skipped by navigation.                                                                 |

## Single mode (default)

Click an option to replace the selection and close. `[(value)]` keeps 0 or 1 element. Read the sole value through the read-only `selected: Signal<T | null>` accessor (the form contract keeps `value` as `readonly T[]`; `selected()` is `value()[0]` or `null`).

```html
<div forSelect #select="forSelect" [(value)]="favorite" placeholder="Pick a fruit">
  <button forSelectTrigger class="select-trigger">
    <span forSelectValue></span>
  </button>
  @if (select.open()) {
  <div forSelectContent>
    <button forSelectOption class="select-item" value="apple">Apple</button>
    <button forSelectOption class="select-item" value="banana">Banana</button>
    <button forSelectOption class="select-item" value="cherry">Cherry</button>
  </div>
  }
</div>
```

`[(value)]` is the selection (form state) and is always the consumer's. Open state is separate: `[forSelect]` owns it as a `model<boolean>`, so the `@if` reads it straight off the directive instance. `[forSelect]` is `exportAs: 'forSelect'` — expose it with a template reference variable (`#select="forSelect"`) and gate `[forSelectContent]` on `select.open()`. The trigger toggles it; Escape, Tab, and outside-pointer flip it back. No separate `open` signal, no `[(open)]` — bind `[(open)]="mySignal"` only when the component class needs to read or drive open state itself (open it programmatically, persist it, or react to it elsewhere).

## Multi mode

Set `multiple` and bind `[(value)]` to a `string[]`. Click an option to toggle in/out — the listbox stays open. Tab, Escape, or outside-pointer close it.

```html
<div forSelect #select="forSelect" multiple [(value)]="tags">
  <button forSelectTrigger class="select-trigger">
    <span forSelectValue placeholder="Pick tags…"></span>
  </button>
  @if (select.open()) {
  <div forSelectContent>
    <button forSelectOption class="select-item" value="ng">Angular</button>
    <button forSelectOption class="select-item" value="ts">TypeScript</button>
    <button forSelectOption class="select-item" value="rx">RxJS</button>
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

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

### Data attributes

| Piece                  | Attribute          | Values                     |
| ---------------------- | ------------------ | -------------------------- |
| `[forSelect]`          | `data-state`       | `open` \| `closed`         |
| `[forSelect]`          | `data-disabled`    | present \| absent          |
| `[forSelectTrigger]`   | `data-state`       | `open` \| `closed`         |
| `[forSelectTrigger]`   | `data-disabled`    | present \| absent          |
| `[forSelectValue]`     | `data-placeholder` | present \| absent          |
| `[forSelectContent]`   | `data-state`       | `open` \| `closed`         |
| `[forSelectContent]`   | `data-orientation` | `vertical` \| `horizontal` |
| `[forSelectOption]`    | `data-state`       | `checked` \| `unchecked`   |
| `[forSelectOption]`    | `data-disabled`    | present \| absent          |
| `[forSelectOption]`    | `data-highlighted` | present \| absent          |
| `[forSelectIndicator]` | `data-state`       | `checked` \| `unchecked`   |

`data-highlighted` marks the keyboard-focused option (shared vocabulary with the listbox / menu / combobox primitives). In popper mode `[forSelectContent]` also carries the positioner markers `data-side` / `data-align` / `data-placement` (and `data-detached` while `hideWhenDetached` is active); in `item-aligned` mode it carries `data-position="item-aligned"` instead — see [Styling floating content](../../../../../docs/styling-floating-content.md).

### CSS custom properties

`[forSelectContent]` is portaled to `document.body` and exposes its resolved geometry as custom properties (set on the content host). Which ones are present depends on `position`:

| Custom property                         | Type / range        | `position`     | Meaning                                                                                                         |
| --------------------------------------- | ------------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `--for-anchor-width`                    | px                  | both           | Trigger width — size the content to match with `width: var(--for-anchor-width)`.                                |
| `--for-anchor-height`                   | px                  | both           | Trigger height.                                                                                                 |
| `--for-select-content-available-height` | px                  | `item-aligned` | Viewport height minus `collisionPadding` — clamp with `max-height: var(--for-select-content-available-height)`. |
| `--for-available-width`                 | px                  | `popper`       | Space available to the content along the inline axis (from floating-ui's `size` middleware).                    |
| `--for-available-height`                | px                  | `popper`       | Space available to the content along the block axis.                                                            |
| `--for-content-transform-origin`        | `<origin>` keywords | `popper`       | `transform-origin` matching the resolved side / align, so a `scale` enter animation pivots from the trigger.    |

> `[forSelectContent]` is portaled to `document.body`, so a scoped component style sheet will not reach it — style it with **global CSS** or pass a class the consumer keeps global. The anchored-positioning markers and shared positioner variables (`--for-anchor-width` / `-height`, `--for-available-width` / `-height`, `--for-content-transform-origin`) live on the portaled host too; see [Styling floating content](../../../../../docs/styling-floating-content.md) for the full list.

```css
.select-trigger svg {
  transition: transform 150ms ease;
}
.select-trigger[data-state='open'] svg {
  transform: rotate(180deg);
}

.select-item[data-highlighted] {
  background: var(--accent);
}
.select-item:not([data-disabled]):hover {
  cursor: pointer;
}
```

## Keyboard

### Trigger (closed)

- **Click / Enter / Space** — open (focus selected, else first).
- **ArrowDown** — open (focus selected, else first).
- **ArrowUp** — open (focus selected, else last).
- **Typeahead** _(single mode only)_ — printable keys select the matching option immediately without opening, mirroring native `<select>`. The lookup goes through a cached snapshot of options (the live registry is empty while `[forSelectContent]` is unmounted); the cache is populated the first time the listbox opens, so closed-state typeahead is available after the user has interacted with the listbox at least once.

### Listbox (open)

- **ArrowDown / ArrowUp** — move focus to next / previous enabled option, wrapping by default.
- **Home / End** — jump to first / last enabled option.
- **Enter / Space** — activate the focused option (native `<button>` semantics): select + close in single mode, toggle (stay open) in multi mode.
- **Escape** — close without changing selection. Returns focus to the trigger.
- **Tab / Shift+Tab** — commit the focused option (single mode only — multi-mode keeps the existing selection) and let the browser advance focus to the next / previous focusable, mirroring native `<select>`. The directive does **not** `preventDefault`, so form workflows keep flowing through tab order.
- **Typeahead** — single printable characters move focus to the first option whose text starts with the buffered string. Disabled options are skipped.

## macOS-style alignment (`position="item-aligned"`)

`[forSelect]` defaults to `position="popper"` — standard floating-ui anchored placement (`side` / `align` / `sideOffset` / `alignOffset` with `flip` + `shift` collision handling). Set `position="item-aligned"` to switch to the macOS-native algorithm: the listbox overlays the trigger so the **selected option's vertical center** lines up with the **trigger's vertical center**. The visual effect is that opening the menu doesn't shift the eye — the selected value stays in place; the rest of the options expand around it. Better UX for short lists with a known selected value (country / language / role pickers).

When nothing is selected, the algorithm falls back to the first enabled option. The listbox is clamped inside the viewport with `collisionPadding`; if the listbox is taller than the viewport the directive snaps it to the padding line and scrolls the selected option into view via `scrollIntoView({ block: 'nearest' })`.

```html
<div
  forSelect
  #select="forSelect"
  [(value)]="country"
  position="item-aligned"
  [collisionPadding]="10"
>
  <button forSelectTrigger class="select-trigger">
    <span forSelectValue placeholder="Country"></span>
  </button>
  @if (select.open()) {
  <div forSelectContent class="select-content">
    <button forSelectOption class="select-item" value="es">Spain</button>
    <button forSelectOption class="select-item" value="fr">France</button>
    <button forSelectOption class="select-item" value="de">Germany</button>
  </div>
  }
</div>
```

The directive sets `--for-select-content-available-height` on the content host so consumers can clamp the visible height in CSS:

```css
.select-content {
  max-height: var(--for-select-content-available-height);
  overflow-y: auto;
}
```

When `position="item-aligned"`, the following inputs are **no-ops**: `side`, `align`, `sideOffset`, `alignOffset`, `avoidCollisions`, `sticky`, `hideWhenDetached`, `arrowPadding`. Only `collisionPadding` (default `8`) is honored — it drives both the viewport clamp and the available-height variable. The content gets `data-position="item-aligned"` so consumers can target it with CSS; in popper mode the attribute is absent and the `data-side` / `data-align` / `data-placement` markers from `injectFloating` apply instead.

The default stays `popper` (rather than mirroring Radix's `item-aligned` default) so existing consumers' visuals don't shift on upgrade — opt in per primitive when the macOS feel is what you want.

## Modal (touch) presentation (`modal`)

`[forSelect]` defaults to a **non-modal anchored popover**. On small / touch screens the established pattern (Angular Material's `touchUi`, native mobile pickers) is a centered modal surface that's easier to tap. Set `modal` to route `[forSelectContent]` through `_internal/modal-shell` — a **trapped / inert / scroll-locked** surface — instead of the anchored popover. The form-value wiring is unchanged: `[(value)]`, `name`, and the `selected()` accessor keep working exactly as in popover mode.

```html
<div
  forSelect
  [(value)]="value"
  [(open)]="open"
  name="country"
  [modal]="isCoarsePointer()"
  ariaLabel="Country"
>
  <button forSelectTrigger class="select-trigger">
    <span forSelectValue placeholder="Country"></span>
  </button>
  @if (open()) {
  <div forSelectContent>
    <button forSelectOption class="select-item" value="es">Spain</button>
    <button forSelectOption class="select-item" value="fr">France</button>
  </div>
  }
</div>
```

The consumer drives the mode — bind `[modal]="isCoarsePointer()"` (e.g. from a `(pointer: coarse)` media query) to switch presentation by device. The library does **not** auto-switch on viewport or pointer.

What modal mode changes:

- **Focus** is trapped inside the surface (Tab / Shift+Tab cycle through the options; they no longer commit-and-advance the way the anchored listbox does). The rest of the page is `inert` while open, and body scroll is locked.
- **Initial focus** still lands on the selected option (then first / last enabled), via the shared focus algorithm.
- **`aria-modal="true"`** is reflected on the surface as a hint. The surface keeps `role="listbox"` (several screen readers ignore `aria-modal` outside window roles), so the real modality comes from the `inert` background the shell applies — not from the attribute alone.
- **Dismiss** (`dismissible`), **return-focus** (`returnFocus`), `ariaLabel`, and the `(autoFocusOnOpen)` / `(autoFocusOnClose)` veto hooks all behave the same as popover mode.

The mode is read **once** when `[forSelectContent]` mounts (the two shells are structurally different; switching at runtime would need a remount, and the surface mounts lazily via `@if (open())`, well after `modal` settles). Every **anchored-positioning input is a no-op** in modal mode: `position` (`popper` / `item-aligned`), `side`, `align`, `sideOffset`, `alignOffset`, `sticky`, `hideWhenDetached`, `avoidCollisions`, `collisionPadding`, `arrowPadding`.

> **Not** a swipe / snap-point sheet. This is the batteries-included _modal_ presentation of a value field. The draggable bottom-sheet (snap points, swipe-to-dismiss) is a different use case — compose a `ForListbox` inside a `ForDrawer` by hand for that. It loses the form-value wiring, which is why it isn't an internal mode here.

## Selection follows focus

Single-mode only. Set `selectionFollowsFocus` to also commit `[(value)]` as arrow navigation moves focus — useful for "live preview" UX. Default off; APG calls it optional and recommends caution.

```html
<div forSelect selectionFollowsFocus [(value)]="theme">…</div>
```

## Dismiss events

Each dismiss reason emits a vetoable event from `[forSelect]` — call `preventDefault()` on the event to keep the listbox open.

| Output                 | When                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| `(escapeKeyDown)`      | Escape pressed while listbox is open.                                        |
| `(pointerDownOutside)` | Pointer-down outside both trigger and content.                               |
| `(focusOutside)`       | Focus moves outside both trigger and content.                                |
| `(interactOutside)`    | Either of the two above (single output for consumers that don't care which). |

## Auto-focus events

`(autoFocusOnOpen)` / `(autoFocusOnClose)` fire just before the listbox sends focus to the selected option (open) or returns it to the trigger (close). Both deliver a `VetoableEvent` — call `preventDefault()` on the veto to skip the imperative focus move. The listbox stays mounted; only the focus move is vetoed. These are output-shape because Select always routes close transitions through `[(open)]` (via the implicit `openChange` emitter). See [CLAUDE.md › Auto-focus hook shape](../../../../../CLAUDE.md#auto-focus-hook-shape) for why Dialog uses callback-shape inputs instead.

## Form integration

`[forSelect]` implements `FormValueControl<readonly T[]>`. Pair with the `[formField]` directive for auto-wiring with `@angular/forms/signals`:

```html
<div forSelect [formField]="form.color">
  <button forSelectTrigger class="select-trigger">
    <span forSelectValue placeholder="Color"></span>
  </button>
  …
</div>
```

For a legacy `<form action="…">` flow, set `[name]` — `[forSelect]` mirrors `[(value)]` into one `<input type="hidden">` per selected value (single produces 0–1 inputs, multi produces N). String values land verbatim in the hidden input; object values default to `JSON.stringify` (override via `[itemToFormValue]`, see below).

## Object values

Real apps usually have richer option models — `{ id, name, ... }` — where the comparison key differs from what you'd serialize for a form. `[forSelect]` is generic over `T` to support that without forcing the consumer to stringify and re-hydrate.

Two inputs configure the object behaviour. Defaults make string mode work unchanged:

| Input                  | Default                                                            | Purpose                                                                                                         |
| ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `[isItemEqualToValue]` | `(a, b) => a === b`                                                | How two items compare. Override for object values so selection locates by id (or any stable key).               |
| `[itemToFormValue]`    | `(item) => typeof item === 'string' ? item : JSON.stringify(item)` | Serialize an item for the hidden input. Override to emit a per-item id (or any wire format your backend wants). |

The visible option label still comes from the rendered `textContent`, so there's no separate label function — `[forSelectValue]` renders the matching option's text.

```html
<div
  forSelect
  #select="forSelect"
  [(value)]="city"
  [isItemEqualToValue]="byId"
  name="city"
  [itemToFormValue]="toId"
  placeholder="Pick a city"
>
  <button forSelectTrigger class="select-trigger">
    <span forSelectValue></span>
  </button>
  @if (select.open()) {
  <div forSelectContent>
    @for (c of cities; track c.id) {
    <button forSelectOption class="select-item" [value]="c">{{ c.name }}</button>
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

readonly city = signal<readonly City[]>([]);
readonly cities = signal<readonly City[]>([
  { id: 'paris', name: 'Paris' },
  { id: 'berlin', name: 'Berlin' },
]);

readonly byId = (a: City, b: City) => a.id === b.id;
readonly toId = (c: City) => c.id;
```

Multi mode uses the same two inputs — `[(value)]` is a `readonly City[]` and option clicks toggle entries in/out by `isItemEqualToValue`.

## Accessibility notes

- Apply each option directive to a `<button>` so Space / Enter activation come from native button behavior — the listbox doesn't intercept them.
- Disabled options keep `tabindex="-1"` and `aria-disabled="true"` (per APG): focusable for screen-reader announcement, but click and keyboard activation are no-ops.
- `[forSelectSeparator]` is decorative and never registers with the listbox's option collection — it's skipped during navigation and typeahead automatically.
- `[forSelectGroup]` is purely advisory grouping — options inside still register flatly with the root, so navigation flows through groups without interruption.
- The trigger is exempt from the dismissable layer's outside-pointer checks, so a click on the trigger while the listbox is open routes through `(click)` (toggle) instead of double-firing as an outside dismissal.
- **`data-highlighted=""`** is reflected on the focused `[forSelectOption]` so consumers can paint a uniform focus ring shared with the listbox / menu / combobox primitives.
