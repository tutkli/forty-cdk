# Select

Headless select primitive — a button trigger that opens a portaled listbox of options. Implements the [WAI-ARIA select-only combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/) (`role="combobox"` on the trigger, `role="listbox"` on the surface, `role="option"` on items) and the `FormValueControl<readonly string[]>` interface from `@angular/forms/signals`.

## Pieces

| Class                 | Selector                | Role                                                                                                                             |
| --------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ForSelect`           | `[forSelect]`           | Root. Owns `[(value)]`, `[(open)]`, the option collection, ids, and the dismiss event surface.                                   |
| `ForSelectTrigger`    | `[forSelectTrigger]`    | The `<button role="combobox">` that opens the listbox. Wires `aria-haspopup`, `aria-expanded`, `aria-controls`.                  |
| `ForSelectValue`      | `[forSelectValue]`      | Renders the selected option's text — or the placeholder — into its host via `textContent`. Optional.                             |
| `ForSelectContent`    | `[forSelectContent]`    | The listbox surface. Portaled, positioned by floating-ui, dismissable layer attached.                                            |
| `ForSelectOption`     | `[forSelectOption]`     | One option. `value: required<string>`.                                                                                           |
| `ForSelectIndicator`  | `[forSelectIndicator]`  | Optional. Hides itself when the parent option is unselected. Mirrors the option's `data-state`. `[forceMount]` keeps it mounted. |
| `ForSelectGroup`      | `[forSelectGroup]`      | Logical grouping, `role="group"` with `aria-labelledby`.                                                                         |
| `ForSelectGroupLabel` | `[forSelectGroupLabel]` | Label registered with the parent group.                                                                                          |
| `ForSelectSeparator`  | `[forSelectSeparator]`  | Decorative separator, `role="separator"`. Skipped by navigation.                                                                 |

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
<div forSelect [(value)]="country" position="item-aligned" [collisionPadding]="10">
  <button forSelectTrigger>
    <span forSelectValue placeholder="Country"></span>
  </button>
  @if (countryOpen()) {
  <div forSelectContent class="select-content">
    <button forSelectOption value="es">Spain</button>
    <button forSelectOption value="fr">France</button>
    <button forSelectOption value="de">Germany</button>
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

`(autoFocusOnOpen)` / `(autoFocusOnClose)` fire just before the listbox sends focus to the selected option (open) or returns it to the trigger (close). Both deliver a cancelable `CustomEvent` — call `preventDefault()` to skip the imperative focus move. The listbox stays mounted; only the focus move is vetoed.

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
- **`data-highlighted=""`** is reflected on the focused `[forSelectOption]` so consumers can paint a uniform focus ring shared with the listbox / menu / combobox primitives.
