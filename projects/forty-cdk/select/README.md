# Select

A custom select: a trigger that opens a portaled listbox popup to pick one or many options, with groups and separators.

It implements the select-only combobox pattern (`role="combobox"` on the trigger, `role="listbox"` on the surface, `role="option"` on items) and the `FormValueControl<readonly T[]>` interface from `@angular/forms/signals`.

`[forSelect]` is generic over the option value type `T` (default `string`). Bind primitive ids for the simple case or full objects for richer models — the directive infers `T` from `[(value)]` and `[forSelectOption][value]`. See [Object values](#object-values) for the object-mode contract.

> New to overlays in forty-cdk? [Your first overlay](../../../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

## Anatomy

```html
<div forSelect #select="forSelect" [(value)]="value" placeholder="Pick a fruit">
  <button forSelectTrigger>
    <span forSelectValue></span>
  </button>

  <!-- @if (select.open()) -->
  <div forSelectContent>
    <div forSelectGroup>
      <div forSelectGroupLabel>Fruit</div>
      <button forSelectOption value="apple">
        <span forSelectIndicator>✓</span>
        Apple
      </button>
      <button forSelectOption value="banana">Banana</button>
    </div>

    <hr forSelectSeparator />

    <button forSelectOption value="other">Other</button>
  </div>
</div>
```

`[forSelectAnchor]` (optional) wraps a decorated field box so the listbox positions against it instead of the trigger — see [Anchoring to a field box](#anchoring-to-a-field-box).

## Examples

### Single mode (default)

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

### Multi mode

Set `multiple` and bind `[(value)]` to a `string[]`. Click an option to toggle in/out — the listbox stays open. Tab, Escape, or outside-pointer close it.

In the default (non-virtualized) path the full APG range keyboard works while the listbox is open, matching `ForListbox`: **Shift+Arrow** moves focus and toggles the destination option, **Shift+Space** selects the contiguous range from the anchor (the last clicked / activated option) to the focused option, **Ctrl/Cmd+A** selects all enabled options (toggling back to empty when all are already selected), and **Ctrl+Shift+Home / End** extends the selection to the first / last option. These range modifiers are not available in the [virtualized path](#virtualization).

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

### Signal Forms

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

A single-select consumer usually models the field as `T | null` rather than `readonly T[]`. Bridge it with `forSingleValueField` so the same `[formField]` wiring works unchanged: `[formField]="forSingleValueField(form.color)"`. See [Signal Forms helpers](../signal-forms/README.md).

## API

Input tables are not yet tabulated for this primitive. See the feature sections below for documented inputs and the prose descriptions of each input.

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

## Mount/visibility convention

`[forSelectContent]` follows the floating-overlay convention: the consumer's signal drives `@if`, the directive emits dismiss events (forwarded by the root primitive) when it wants to be unmounted. No `[hidden]`. The trigger's own click toggles the same signal — `[forSelect]` exposes `open` as a `model<boolean>` so two-way binding works out of the box.

## Initial focus on open

When the listbox mounts, focus lands per the trigger's hint:

- **Click / Enter / Space / ArrowDown** → focuses the currently-selected option, falling back to the first enabled option when no selection exists.
- **ArrowUp** → focuses the currently-selected option, or the last enabled option when no selection exists.

Override programmatically with `forSelect.openMenu('first' | 'last' | 'selected')`.

## Anchoring to a field box

By default the listbox is positioned against `[forSelectTrigger]`. When the trigger lives inside a decorated field box — padding, a prefix icon, a clear / chevron button — anchoring to the inner button makes the panel narrower than the visible field and offset from its edge. Wrap the field box in `[forSelectAnchor]` so floating-ui positions (and sizes, via `--for-anchor-width`) the listbox against the box instead:

```html
<div forSelect #select="forSelect" [(value)]="value">
  <div forSelectAnchor class="field-box">
    <icon name="search" />
    <button forSelectTrigger>
      <span forSelectValue placeholder="Pick a fruit"></span>
    </button>
    <button class="clear" (click)="value.set([])">×</button>
  </div>
  @if (select.open()) {
  <div forSelectContent style="width: var(--for-anchor-width)">
    <button forSelectOption value="apple">Apple</button>
    <button forSelectOption value="banana">Banana</button>
  </div>
  }
</div>
```

`[forSelectAnchor]` changes **only** positioning. The trigger keeps `aria-haspopup` / `aria-expanded` / `aria-controls`, the click toggle, focus return on close, and its exemption from outside-pointer dismissal. Without an anchor the listbox falls back to the trigger, so existing markup is unaffected. At most one `[forSelectAnchor]` per `[forSelect]` — a second one throws `[forty-cdk/select]`.

## Triggers stamped from outside-declared templates

Angular resolves `ng-template` DI at the template's **declaration** site, not where it is stamped. A `[forSelectTrigger]` declared in a template outside the root throws the orphan error even when the template is rendered inside the root via `ngTemplateOutlet`. For that case the selector attribute accepts the root reference as a value, `routerLink`-style — grab it with `#root="forSelect"` and pass it through the outlet context. The bare valueless attribute keeps resolving via DI.

```html
<div forSelect #root="forSelect" [(value)]="value">
  <ng-container *ngTemplateOutlet="trig; context: { root }" />
  @if (root.open()) {
  <div forSelectContent>…</div>
  }
</div>

<ng-template #trig let-root="root">
  <button [forSelectTrigger]="root">
    <span forSelectValue placeholder="Pick a fruit"></span>
  </button>
</ng-template>
```

## macOS-style alignment

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

The default stays `popper` so existing consumers' visuals don't shift on upgrade — opt in per primitive when the macOS feel is what you want.

## Modal touch presentation

`[forSelect]` defaults to a **non-modal anchored popover**. On small / touch screens the established pattern (native mobile pickers) is a centered modal surface that's easier to tap. Set `modal` to route `[forSelectContent]` through `_internal/modal-shell` — a **trapped / inert / scroll-locked** surface — instead of the anchored popover. The form-value wiring is unchanged: `[(value)]`, `name`, and the `selected()` accessor keep working exactly as in popover mode.

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

## Object values

Real apps usually have richer option models — `{ id, name, ... }` — where the comparison key differs from what you'd serialize for a form. `[forSelect]` is generic over `T` to support that without forcing the consumer to stringify and re-hydrate.

Three inputs configure the object behaviour. Defaults make string mode work unchanged:

| Input                  | Default                                                            | Purpose                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[isItemEqualToValue]` | `(a, b) => a === b`                                                | How two items compare. Override for object values so selection locates by id (or any stable key).                                                                     |
| `[itemToFormValue]`    | `(item) => typeof item === 'string' ? item : JSON.stringify(item)` | Serialize an item for the hidden input. Override to emit a per-item id (or any wire format your backend wants).                                                       |
| `[itemToLabel]`        | `undefined`                                                        | Resolve a selected item's display label without the listbox mounted. Supply it when a pre-set object value must render before the listbox is ever opened (see below). |

The visible option label normally comes from the rendered `textContent`, so there's no separate label function — `[forSelectValue]` renders the matching option's text.

### Pre-set object values and the `@if (open())` pattern

`[forSelectValue]` reads the selected option's label from the rendered option's `textContent`. With the recommended `@if (select.open())` markup the listbox stays unmounted until first opened, so an object value set **before** the user opens the listbox has no option to read from — `[forSelectValue]` shows the serialized form value (`[itemToFormValue]`, e.g. an id) as a last-resort fallback until the listbox is opened once.

Supply `[itemToLabel]` to resolve the label directly from the value, independent of the mounted options. It then renders correctly on first paint and never flickers from the id to the real label:

```html
<div
  forSelect
  #select="forSelect"
  [(value)]="city"
  [isItemEqualToValue]="byId"
  [itemToFormValue]="toId"
  [itemToLabel]="toName"
  placeholder="Pick a city"
>
  <button forSelectTrigger>
    <span forSelectValue></span>
  </button>
  @if (select.open()) {
  <div forSelectContent>
    @for (c of cities(); track c.id) {
    <button forSelectOption [value]="c">{{ c.name }}</button>
    }
  </div>
  }
</div>
```

```ts
readonly toName = (c: City) => c.name;
```

When `[itemToLabel]` is set it is authoritative for every selected value (single and multi mode), so the rendered label is identical whether or not the listbox has been opened. String-value selects render the value verbatim and never need it. Consumers who instead keep `[forSelectContent]` mounted (drop the `@if`) get the option `textContent` for free and don't need `[itemToLabel]`.

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

## Virtualization

For selects with thousands of options, bind `[totalCount]` to enable the **virtualized activedescendant focus model** backed by `injectVirtualizer`. The non-virtualized path (no `[totalCount]`) is byte-for-byte unchanged.

### Focus-model switch

| Mode                             | Tab stop / focus                                   | Active-option tracking                                  |
| -------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Non-virtualized (default)        | real DOM focus on each `[forSelectOption]`         | DOM `:focus` + `data-highlighted`                       |
| Virtualized (`[totalCount]` set) | DOM focus on `[forSelectContent]` (`tabindex="0"`) | `aria-activedescendant` on content + `data-highlighted` |

### Inputs and output

| Binding                | Type                        | Description                                                                                                 |
| ---------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `[totalCount]`         | `number`                    | Full source length. Switches to the virtualized path and populates `aria-setsize` on every rendered option. |
| `[visibleRange]`       | `readonly [number, number]` | Inclusive-exclusive rendered window provided by `injectVirtualizer`'s `.range()`.                           |
| `(scrollToIndex)`      | `number`                    | Emitted when navigation reaches an off-screen option. Pass to `injectVirtualizer`'s `scrollToIndex()`.      |
| `[posInSet]` on option | `number`                    | Zero-based absolute index of the option in the full source. Required per option in the virtualized path.    |

### Navigation flow

Arrow / Home / End keys are handled by `[forSelectContent]` (not the individual options) in the virtualized path. The content delegates to an internal navigator that walks `moveIndex` against the full `totalCount`, using the persisted position snapshot to handle disabled options outside the rendered window. When navigation lands outside the current window, `(scrollToIndex)` fires with the target index; once the option mounts the bridge effect resolves the pending activedescendant.

On open, `[forSelectContent]` seeds `aria-activedescendant` to the committed option (scrolling it into view), or the first enabled option when nothing is selected.

### Example with `injectVirtualizer`

```html
<div
  forSelect
  #select="forSelect"
  [(value)]="value"
  [totalCount]="items.length"
  [visibleRange]="v.range()"
  (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
>
  <button forSelectTrigger>
    <span forSelectValue placeholder="Pick an item"></span>
  </button>
  @if (select.open()) {
  <div forSelectContent #scroll style="overflow:auto; max-height:300px; position:relative">
    <div [style.height.px]="v.totalSize()" style="position:relative">
      @for (vi of v.virtualItems(); track vi.key) {
      <button
        forSelectOption
        [value]="items[vi.index]!.id"
        [posInSet]="vi.index"
        [style.transform]="'translateY(' + vi.start + 'px)'"
        style="position:absolute; left:0; right:0"
      >
        {{ items[vi.index]!.label }}
      </button>
      }
    </div>
  </div>
  }
</div>
```

```ts
readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
readonly v = injectVirtualizer({
  count: computed(() => this.items.length),
  estimateSize: () => 36,
  scrollElement: this.scrollElement,
});
```

### Intentional limitations

- **No multi-select range modifiers in the virtualized path.** Shift+Arrow, Shift+Space, Ctrl+A, and Ctrl+Shift+Home/End are not implemented — range operations require knowledge of every intermediate position, which is unavailable in a windowed render. Pressing one of these combinations on a virtualized multi-select select (`[multiple]` + `[totalCount]`) throws in dev mode rather than silently doing nothing, so the unsupported path surfaces during development; production builds no-op. Per-option toggling via Enter, Space, or click works normally.
- **Typeahead matches only the rendered window.** `[forSelect]` runs typeahead against the live registered options; options scrolled out of the window are unmounted and invisible to the buffer.
- **Cold-open committed-index resolution.** On the very first open, if the committed value has never been rendered (the option has never scrolled into the window), the position snapshot is empty and `[forSelect]` falls back to focusing the first enabled option. This mirrors the `[forSelectValue]` / `[itemToLabel]` cold-cache limitation: supply `[itemToLabel]` to render the label and open the listbox once to prime the snapshot.

## Keyboard

### Trigger (closed)

- **Click / Enter / Space** — open (focus selected, else first).
- **ArrowDown** — open (focus selected, else first).
- **ArrowUp** — open (focus selected, else last).
- **Typeahead** _(single mode only)_ — printable keys select the matching option immediately without opening, mirroring native `<select>`. The lookup goes through a cached snapshot of options (the live registry is empty while `[forSelectContent]` is unmounted); the cache is populated the first time the listbox opens, so closed-state typeahead is available after the user has interacted with the listbox at least once.

### Listbox (open)

- **ArrowDown / ArrowUp** — move focus to next / previous enabled option, wrapping by default.
- **Home / End** — jump to first / last enabled option.
- **PageUp / PageDown** — jump to first / last enabled option.
- **Enter / Space** — activate the focused option (native `<button>` semantics): select + close in single mode, toggle (stay open) in multi mode.
- **Shift+ArrowDown / Shift+ArrowUp** _(multi mode, non-virtualized)_ — move focus to the next / previous enabled option **and** toggle it. Non-wrapping. Does not move the range anchor.
- **Shift+Space** _(multi mode, non-virtualized)_ — select the contiguous range from the anchor (last clicked / activated option) to the focused option, preserving selection outside the span. Falls back to selecting just the focused option when no anchor exists.
- **Ctrl/Cmd+A** _(multi mode, non-virtualized)_ — select every enabled option, or clear the selection when all enabled options are already selected (toggle).
- **Ctrl+Shift+Home / Ctrl+Shift+End** _(multi mode, non-virtualized)_ — extend the selection from the focused option to the first / last option and move focus to that edge.
- **Escape** — close without changing selection. Returns focus to the trigger.
- **Tab / Shift+Tab** — commit the focused option (single mode only — multi-mode keeps the existing selection) and let the browser advance focus to the next / previous focusable, mirroring native `<select>`. The directive does **not** `preventDefault`, so form workflows keep flowing through tab order.
- **Typeahead** — single printable characters move focus to the first option whose text starts with the buffered string. Disabled options are skipped.

## Accessibility

Implements the [WAI-ARIA select-only combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/).

- Apply each option directive to a `<button>` so Space / Enter activation come from native button behavior — the listbox doesn't intercept them.
- Disabled options keep `tabindex="-1"` and `aria-disabled="true"` (per APG): focusable for screen-reader announcement, but click and keyboard activation are no-ops.
- `[forSelectSeparator]` is decorative and never registers with the listbox's option collection — it's skipped during navigation and typeahead automatically.
- `[forSelectGroup]` is purely advisory grouping — options inside still register flatly with the root, so navigation flows through groups without interruption.
- The trigger is exempt from the dismissable layer's outside-pointer checks, so a click on the trigger while the listbox is open routes through `(click)` (toggle) instead of double-firing as an outside dismissal.
- **`data-highlighted=""`** is reflected on the focused `[forSelectOption]` so consumers can paint a uniform focus ring shared with the listbox / menu / combobox primitives.
- **Open highlights the selected option, regardless of how the listbox was opened — an intentional divergence from the menu family.** Initial focus on open lands on the currently-selected option (see [Initial focus on open](#initial-focus-on-open)), and `data-highlighted` follows that focus, so a mouse-opened Select renders the selected option highlighted. This is deliberate: the highlight **marks the current value**, it does not fake a "preselection" that isn't there. It contrasts with the `[forMenu*]` items, whose `data-highlighted` is intent-driven — a pointer open focuses the first item **without** highlighting it ([#644](https://github.com/tutkli/forty-cdk/issues/644) / [#662](https://github.com/tutkli/forty-cdk/issues/662)) — because a menu has no "current value" to mark. `[forListbox]` shows neither effect: it's an embedded roving surface with no open-driven programmatic focus, so its highlight only ever derives from the roving active option. Decided in [#661](https://github.com/tutkli/forty-cdk/issues/661).

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

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

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_SELECT_HOST_DIRECTIVE_INPUTS` / `FOR_SELECT_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).
