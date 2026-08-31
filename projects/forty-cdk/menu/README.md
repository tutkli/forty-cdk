---
title: Menu
group: primitives
archetype: [overlay]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/menu/
---

# Menu (shared pieces + shared-opener root)

The shared menu surface — items, checkbox / radio items, groups, separators and submenus — composed by every menu-family primitive.

Shared surface and item directives consumed by `[forDropdownMenu]` (button trigger) and `[forContextMenu]` (right-click), plus **`[forMenu]`** — the opener-agnostic root for one menu definition driven by [several openers at once](#shared-openers-formenu). For a single opener, reach for one of the two presets; they are `[forMenu]` with the opener already chosen.

## Anatomy

```html
<div forMenuContent class="menu">
  <div forMenuGroup>
    <div forMenuGroupLabel>Appearance</div>
    <button forMenuCheckboxItem [(checked)]="bold">
      <span forMenuItemIndicator [forceMount]="true">✓</span>
      Bold
    </button>
  </div>

  <hr forMenuSeparator />

  <div forMenuRadioGroup [(value)]="sortBy">
    <div forMenuGroupLabel>Sort by</div>
    <button forMenuRadioItem value="name">
      <span forMenuItemIndicator [forceMount]="true">●</span>
      Name
    </button>
    <button forMenuRadioItem value="date">Date modified</button>
  </div>

  <hr forMenuSeparator />

  <button forMenuItem (activate)="save()">Save</button>

  <div forMenuSub #sub="forMenuSub">
    <button forMenuSubTrigger>More tools</button>
    <!-- @if (sub.open()) { -->
    <div forMenuSubContent>
      <button forMenuItem>Developer tools</button>
    </div>
    <!-- } -->
  </div>
</div>
```

For the recommended `[forceMount]` + `opacity` pattern that keeps indicator columns aligned across checkbox / radio items, see the [selected-indicator alignment guide](../../../docs/selected-indicator-pattern.md).

## Mount/visibility convention

`[forMenuContent]` follows the floating-overlay convention: the consumer's signal drives `@if`, the directive emits `(close)` (forwarded by the root primitive) when it wants to be unmounted. No `[hidden]`. See `[forDropdownMenu]` and `[forContextMenu]` for end-to-end examples.

## Item activation contract

Every item type emits a vetoable `(activate)` event — handlers receive a `VetoableEvent`. The default action is to close the menu after the item's state has been applied (toggle for checkbox, set value for radio). Call `event.preventDefault()` on the veto to keep the menu open.

```html
<!-- Closes menu by default -->
<button forMenuItem class="menu-item" (activate)="save()">Save</button>

<!-- Stays open -->
<button
  forMenuCheckboxItem
  class="menu-checkbox-item"
  [(checked)]="bold"
  (activate)="$event.preventDefault()"
>
  Bold
</button>
```

## Keyboard

- **ArrowDown / ArrowUp** — move focus to the next / previous enabled item, wrapping by default.
- **Home / End** — jump to first / last enabled item.
- **Enter / click** — activate the focused item via native `<button>` semantics. Closes the menu unless the consumer calls `event.preventDefault()` on `(activate)`.
- **Space** — activates the focused item:
  - On a plain `[forMenuItem]`, behaves like Enter / click (closes the menu).
  - On `[forMenuCheckboxItem]` and `[forMenuRadioItem]`, toggles `checked` / sets the group `value`, emits `(activate)`, and **never closes** the menu — per APG, so users can flip several options before dismissing. Calling `event.preventDefault()` on `(activate)` is unnecessary for Space (the menu already stays open) but is still respected on Enter / click.
- **Tab / Shift+Tab** — close the menu and return focus to the trigger. Inside a submenu, propagates upward and tears down the entire chain.
- **Escape** — close the menu and return focus to the trigger. Inside a submenu, closes only that level (parent stays open).
- **ArrowRight** (on a `[forMenuSubTrigger]`) — open the submenu and focus its first item. (LTR.)
- **ArrowLeft** (on an item inside a submenu) — close the submenu and return focus to the `[forMenuSubTrigger]`.
- **Typeahead** — single printable characters move focus to the first item whose text starts with the buffered string. Disabled items are skipped. By default the match is run against the item's `textContent`; pass `textValue="…"` on `[forMenuItem]`, `[forMenuCheckboxItem]`, or `[forMenuRadioItem]` to override the matched string when the DOM contains icons, kbd hints, or badges that would otherwise bleed into it.

  ```html
  <!-- Without textValue, prefix-match would compare against "3 Archive" -->
  <button forMenuItem class="menu-item" textValue="Archive">
    <span class="badge">3</span>
    Archive
  </button>
  ```

## Submenu

A nested menu is opened by a `[forMenuSubTrigger]` — itself a `menuitem` in the parent menu. The `[forMenuSub]` root owns the submenu's open state, item collection, and dismissible layer.

Both `[forMenuSub]` (`exportAs: 'forMenuSub'`) and the parent `[forDropdownMenu]` / `[forContextMenu]` own `open` as a `model<boolean>`, so the minimal case needs no consumer signals at all — expose each with a template reference variable (`#menu="forDropdownMenu"`, `#sub="forMenuSub"`) and drive the `@if` straight off its `open()`:

```html
<div forDropdownMenu #menu="forDropdownMenu">
  <button forDropdownMenuTrigger>File</button>
  @if (menu.open()) {
  <div forMenuContent>
    <button forMenuItem class="menu-item" (activate)="openFile()">Open</button>
    <div forMenuSub #sub="forMenuSub">
      <button forMenuSubTrigger class="menu-sub-trigger">Open recent</button>
      @if (sub.open()) {
      <div forMenuSubContent>
        <button forMenuItem class="menu-item" (activate)="openFile('a.txt')">a.txt</button>
        <button forMenuItem class="menu-item" (activate)="openFile('b.txt')">b.txt</button>
      </div>
      }
    </div>
  </div>
  }
</div>
```

Bind `[(open)]="mySignal"` on either level instead only when the component class needs to read or drive that level's open state itself. The `[forMenuSubTrigger]` is registered as a `menuitem` in the **parent** menu's collection, so parent navigation (ArrowDown/Up, typeahead) reaches it. Reading open state from the **submenu**, it wires `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` to the submenu's content.

Closing semantics propagate upward by default: activating an item inside a submenu (or pressing Tab, or clicking outside both menus) tears down the entire chain. Escape closes only the level that has focus — Escape inside a submenu closes the submenu and returns focus to the `[forMenuSubTrigger]`, leaving the parent open.

The submenu's dismissible layer exempts the **parent menu's content** — clicking on a parent menu item doesn't fire the submenu's outside-handler. Instead, the parent item's own click activates and tears down everything via the propagated `closeMenu`.

### Pointer (mouse hover)

Additive to the click / keyboard behaviour, a `[forMenuSubTrigger]` also opens its submenu on **mouse hover** — like native desktop menus:

- **pointerenter** over the sub-trigger opens the submenu after `subMenuOpenDelay` (default `100`ms), **without** moving focus into it (only keyboard / click move focus in).
- **pointerleave** closes it after `subMenuCloseDelay` (default `100`ms) — _unless_ the pointer is travelling toward the open submenu. A pointer-grace "safe triangle" is drawn from the cursor to the submenu's near edge; while the pointer stays inside it (heading to the submenu) the close is held off. The triangle's lifetime is capped by `subMenuPointerGraceDuration` (default `300`ms).
- Touch / pen never hover, so they open the submenu by tap (the native click) — the hover listeners are gated to `pointerType === 'mouse'`.

Tune the timings per injector scope with `provideForMenuDefaults` (applies to every submenu in the surrounding scope, across DropdownMenu / ContextMenu / Menubar):

```ts
import { provideForMenuDefaults } from 'forty-cdk/menu';

bootstrapApplication(App, {
  providers: [provideForMenuDefaults({ subMenuOpenDelay: 150, subMenuCloseDelay: 200 })],
});
```

Partial overrides inherit unspecified keys from the parent scope (or the library defaults at the root), so a component-level `providers: [provideForMenuDefaults({ subMenuOpenDelay: 0 })]` layers on top of an app-level configuration per key.

### Narrow-viewport fallback

A submenu opens beside its parent item (`side="right"` in LTR, `side="left"` in RTL — `provideForMenuDefaults({ side })` pins it for a whole scope, and its default `null` is what "follow the writing direction here, `'bottom'` on the `[forMenu]` root" is spelled as). On a narrow / mobile viewport both horizontal sides can overflow — `flip` only tries the opposite same-axis placement by default, so the submenu ends up clipped or overlapping the parent. Opt a submenu into dropping to a **vertical** side (`top` / `bottom`) when both horizontal sides are blocked with `[fallbackAxisSideDirection]` (default `'none'`), typically bound to a media-query signal:

```html
<div forMenuSub #sub="forMenuSub" [fallbackAxisSideDirection]="isNarrow() ? 'start' : 'none'">
  <button forMenuSubTrigger>More</button>
  @if (sub.open()) {
  <div forMenuSubContent>…</div>
  }
</div>
```

`'start'` prefers the top side when it falls back, `'end'` prefers the bottom. The lever is a pure opt-in — the default `'none'` reproduces today's beside-parent behaviour exactly. `[forDropdownMenu]` and `[forContextMenu]` expose the same input for their own content surface.

Whether a clipped surface may drop to a perpendicular side is usually an app-wide policy rather than a per-submenu decision, so the input's default is seeded from `provideForMenuDefaults` — declare it once and every `[forMenuSub]` and `[forMenu]` root in the scope picks it up with no template binding:

```ts
import { provideForMenuDefaults } from 'forty-cdk/menu';

bootstrapApplication(App, {
  providers: [provideForMenuDefaults({ fallbackAxisSideDirection: 'end' })],
});
```

A per-instance `[fallbackAxisSideDirection]` still wins over the scope default, exactly as `sideOffset` behaves. `provideForDropdownMenuDefaults` / `provideForContextMenuDefaults` / `provideForMenubarDefaults` carry the same key for their own roots.

## Shared openers (`[forMenu]`)

`[forDropdownMenu]` and `[forContextMenu]` each provide their own menu context, and Angular resolves that context at the template's **declaration site** — so a single `[forMenuContent]` block can only ever see one of them. A table row that needs the same actions from a kebab button _and_ from a right-click over the whole row therefore had to duplicate every item and keep the two copies in sync.

`[forMenu]` is the opener-agnostic root that removes the duplication: one content block, any number of heterogeneous openers.

```html
<tr forMenu #row="forMenu" [(open)]="open" ariaLabel="Row actions">
  <!-- opener A: the whole row is the right-click region -->
  <td [forContextMenuTrigger]="row">…cells…</td>

  <!-- opener B: the kebab button at the end of the row -->
  <td>
    <button [forDropdownMenuTrigger]="row" class="kebab">⋮</button>
  </td>

  @if (open()) {
  <div forMenuContent class="menu">
    <button forMenuItem (activate)="edit()">Edit</button>
    <button forMenuItem (activate)="remove()">Delete</button>
  </div>
  }
</tr>
```

Exactly one instance is open at a time, and everything the mounted surface resolves follows the **active opener** — the one that fired:

- **Return focus** lands on that opener, not on a single fixed trigger.
- **The anchor** is the opener's own element for a button opener, or its recorded pointer / rect position for a right-click opener (`contextmenu`, long-press, `Shift+F10`, the `ContextMenu` key).
- **Ids** are per opener, so two openers never emit the same `id`. The button opener's `aria-controls` still points at the shared surface.
- **The accessible name** follows the opener's own nature. A `[forDropdownMenuTrigger]` button is a discrete labelling control, so an unnamed surface it opened falls back to `aria-labelledby="<that button's id>"`; a `[forContextMenuTrigger]` region is not — pointing the menu's name at a whole row would announce the row's entire text — so a region-opened surface emits no fallback. Reopening from the other opener flips it.
- **Outside-dismissal** exempts the button opener only (its own click toggles, so without the exemption the same pointer-down would double-close). A left-click on the right-click region closes the menu like any other outside click.
- **Placement** is the root's, unless the opener overrides it (see below).

Two boundaries worth knowing:

- **`[forContextMenuTrigger]` must be bound explicitly** — `[forContextMenuTrigger]="row"` with `#row="forMenu"`. It resolves `FOR_CONTEXT_MENU_CONTEXT`, which `[forMenu]` deliberately does not provide (`forty-cdk/menu` must not depend on `forty-cdk/context-menu`). `[forDropdownMenuTrigger]` resolves this root through DI like any other menu piece, so binding it is optional.
- **A shared menu with any region opener still wants `[ariaLabel]`.** The per-opener fallback covers the button openers for free, so a button-only shared menu needs no name hook at all; but a right-click region cannot name the surface, so an instance it opened has no accessible name unless `[ariaLabel]` (or your own static `aria-labelledby` on the content) supplies one. `[ariaLabel]` wins over the fallback for every opener, giving the menu one name regardless of how it was opened.

### Per-opener positioning

The root's positioning inputs are seeded from `provideForMenuDefaults`: `sideOffset` defaults to `0`, flush against the anchor, which is what a pointer-anchored open wants. That is the wrong answer for a button opener, which wants the few pixels of clearance `[forDropdownMenu]` seeds — so an individual opener can override the placement for the opens **it** drives, through its trigger's `[menuPositioning]`:

```html
<tr forMenu #row="forMenu" ariaLabel="Row actions">
  <td [forContextMenuTrigger]="row">…cells…</td>
  <td>
    <button [forDropdownMenuTrigger]="row" [menuPositioning]="{ sideOffset: 4 }">⋮</button>
  </td>
  …
</tr>
```

The button-opened menu now clears the button by 4px while a right-click still opens flush at the cursor.

- The override carries the four **placement** values — `side`, `align`, `sideOffset`, `alignOffset` — and every key is optional. An omitted key resolves the root's own input, so an opener that overrides nothing (or binds `null`) positions exactly as the root does.
- It applies only while that opener is the active one, and switches with the opener — nothing leaks from the previously active one.
- The rest of the positioning surface (`avoidCollisions`, `fallbackAxisSideDirection`, `collisionPadding`, `sticky`, `hideWhenDetached`, `clipUntilPositioned`) stays root-only: it is collision / viewport policy for the surface, not a property of the opener that fired.
- Both trigger directives carry the input, and it resolves the same way under their own preset root (`[forDropdownMenu]` / `[forContextMenu]`), where it is simply a per-trigger spelling of the root's inputs. Bind an object literal or a signal-returned object; a new identity re-positions the mounted surface.

A shared menu whose openers all want the same placement needs none of this — set the root's inputs.

## API

### `ForMenu`

Selector `[forMenu]`, `exportAs: 'forMenu'`.

| Input                       | Type                                | Default          | Notes                                                      |
| --------------------------- | ----------------------------------- | ---------------- | ---------------------------------------------------------- |
| `open`                      | `model<boolean>`                    | `false`          | Two-way. `(openChange)` fires on internal transitions only |
| `side`                      | `FloatingSide \| undefined`         | `'bottom'`       | From `provideForMenuDefaults`; overridable per opener      |
| `align`                     | `FloatingAlign \| undefined`        | `'start'`        | From `provideForMenuDefaults`; overridable per opener      |
| `sideOffset`                | `number`                            | `0`              | From `provideForMenuDefaults`; overridable per opener      |
| `alignOffset`               | `number`                            | `0`              | Overridable per opener via `[menuPositioning]`             |
| `avoidCollisions`           | `boolean`                           | `true`           |                                                            |
| `fallbackAxisSideDirection` | `FloatingFallbackAxisSideDirection` | `'none'`         | From `provideForMenuDefaults`                              |
| `collisionPadding`          | `number`                            | `8`              | From `provideForMenuDefaults`                              |
| `sticky`                    | `'partial' \| 'always' \| false`    | `'partial'`      |                                                            |
| `hideWhenDetached`          | `boolean`                           | `false`          |                                                            |
| `clipUntilPositioned`       | `boolean`                           | `true`           |                                                            |
| `loop`                      | `boolean`                           | `true`           |                                                            |
| `dir`                       | `'ltr' \| 'rtl' \| null`            | `null` (ambient) | Reflected to the host `dir` attribute                      |
| `disabled`                  | `boolean`                           | `false`          | Blocks every opener                                        |
| `dismissible`               | `boolean`                           | `true`           |                                                            |
| `returnFocus`               | `boolean`                           | `true`           | Returns focus to the **active** opener                     |
| `ariaLabel`                 | `string \| null`                    | `null`           | Wins over the per-opener `aria-labelledby` fallback        |

Outputs match the other trigger-anchored overlays: `(escapeKeyDown)`, `(pointerDownOutside)`, `(focusOutside)`, `(interactOutside)`, `(autoFocusOnOpen)`, `(autoFocusOnClose)` — all vetoable via `preventDefault()`.

### Data attributes

| Piece                                      | Attribute          | Values                     |
| ------------------------------------------ | ------------------ | -------------------------- |
| `[forMenu]`                                | `data-state`       | `open` \| `closed`         |
| `[forMenu]`                                | `data-disabled`    | present \| absent          |
| `[forMenuContent]` / `[forMenuSubContent]` | `data-state`       | `open` \| `closed`         |
| `[forMenuItem]`                            | `data-disabled`    | present \| absent          |
| `[forMenuItem]`                            | `data-highlighted` | present \| absent          |
| `[forMenuCheckboxItem]`                    | `data-state`       | `checked` \| `unchecked`   |
| `[forMenuCheckboxItem]`                    | `data-disabled`    | present \| absent          |
| `[forMenuCheckboxItem]`                    | `data-highlighted` | present \| absent          |
| `[forMenuRadioItem]`                       | `data-state`       | `checked` \| `unchecked`   |
| `[forMenuRadioItem]`                       | `data-disabled`    | present \| absent          |
| `[forMenuRadioItem]`                       | `data-highlighted` | present \| absent          |
| `[forMenuItemIndicator]`                   | `data-state`       | `checked` \| `unchecked`   |
| `[forMenuSub]`                             | `data-state`       | `open` \| `closed`         |
| `[forMenuSub]`                             | `data-disabled`    | present \| absent          |
| `[forMenuSubTrigger]`                      | `data-state`       | `open` \| `closed`         |
| `[forMenuSubTrigger]`                      | `data-disabled`    | present \| absent          |
| `[forMenuSeparator]`                       | `data-orientation` | `horizontal` \| `vertical` |

## Accessibility

Implements the [WAI-ARIA Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) for the surface (`role="menu"`) and for items (`menuitem` / `menuitemcheckbox` / `menuitemradio`).

- Apply each item directive to a `<button>` so Space / Enter activation come from native button behavior.
- Disabled items keep `tabindex="-1"` and `aria-disabled="true"` (never the native `disabled` attribute) — they are skipped by arrow-key navigation, typeahead, Home/End, and pointer hover, and click / keyboard activation are no-ops, but they stay in the DOM so screen readers can still announce them.
- The `role="menu"` surface takes its accessible name from a consumer-set static `aria-labelledby` on `[forMenuContent]` when present (it is preserved, never clobbered), else from the root's `ariaLabel` (reflected as `aria-label`); with neither it falls back to `aria-labelledby` pointing at the trigger that opened it — the `[forDropdownMenuTrigger]` button, the `[forMenubarTrigger]`, or the `[forMenuSubTrigger]`. The fallback is suppressed for a trigger that is not a discrete labelling control: `[forContextMenu]`'s right-click region is the whole row / card, so pointing the menu's name at it would announce that entire text, and `[ariaLabel]` (or your own `aria-labelledby`) is the way to name a context menu. `[forMenu]` decides **per active opener** rather than per root, so a shared menu names itself after the button that opened it and emits nothing when a region did.
- `[forMenuSeparator]` never registers with the menu's item collection — it's skipped during navigation and typeahead automatically. It carries `role="separator"` and emits `aria-orientation` only for `orientation="vertical"`, because `horizontal` is the ARIA default; `data-orientation` is always stamped for styling. Set `decorative` when the surrounding items already convey the split — it switches the line to `role="none"` and drops `aria-orientation`, matching the [shared separator emission policy](../separator/README.md#accessibility).
- `[forMenuGroup]` is purely advisory grouping — items inside still register flatly with the parent menu, so navigation flows through groups without interruption.
- `[forMenuGroup]` and `[forMenuRadioGroup]` both expose `role="group"`; give either an accessible name by projecting a `[forMenuGroupLabel]` inside it, which the group references via `aria-labelledby`.
- `[forMenuRadioGroup]`'s `[(value)]` is `string | null`, and `null` is the "nothing selected" state — bind a `signal<string | null>(…)`. The empty string is a legitimate item value, so a `[forMenuRadioItem] value=""` (a "None" / "Any" option in a sort-order or filter menu) is only checked once the user picks it, exactly like any other value.
- Submenus use `side="right"` `align="start"` by default in LTR and `side="left"` `align="start"` in RTL — set `[dir]="'rtl'"` on the top-level `[forDropdownMenu]` / `[forContextMenu]` and every nested `[forMenuSub]` inherits it (and flips `side`, ArrowLeft/Right semantics, etc.). Override per-submenu with `[dir]` or `[side]` if a specific submenu needs to render against the opposite direction.
- In RTL, ArrowLeft opens a submenu and ArrowRight closes it back to the parent — the swap mirrors the visual flip of the menu chain.
- **`data-highlighted=""`** is reflected on the focused `[forMenuItem]` / `[forMenuCheckboxItem]` / `[forMenuRadioItem]` so consumers can paint a uniform focus ring shared with the listbox / select / combobox primitives. The attribute is intent-driven: opening a menu with the pointer focuses the first item **without** highlighting it (no "preselected" look on mouse open), while a keyboard open (Enter / Space / ArrowDown / ArrowUp on the trigger, `Shift+F10` for context menus) highlights the initially focused item. Arrow / Home / End / typeahead navigation always highlights the focused item.
- **Hover follows the pointer.** Moving the mouse over an enabled item focuses **and** highlights it, so the keyboard highlight and the mouse hover never disagree — there is a single "active candidate" at a time. Hovering an adjacent item moves the highlight with it; hovering a disabled item is inert. When the pointer leaves the menu surface the highlight clears, while DOM focus stays anchored on the item so keyboard navigation continues from there. This means `[data-highlighted]` is the only hover styling hook you need — you do **not** add a separate `:hover` rule (it would fight the highlight). Touch / pen never hover, so this applies to mouse input only.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

> `[forMenuContent]` / `[forMenuSubContent]` portal to `document.body`, so a class scoped to your trigger's component cannot reach the surface. Style it with **global CSS** or a class you pass through (see [Styling floating content](../../../docs/styling-floating-content.md)). The content host also exposes the shared positioner custom properties — `--for-floating-anchor-width` / `--for-floating-anchor-height`, `--for-floating-available-width` / `--for-floating-available-height`, and `--for-floating-content-transform-origin` — tabulated below and documented in full in [Styling floating content](../../../docs/styling-floating-content.md).

### CSS custom properties

See also: [Styling floating content](../../../docs/styling-floating-content.md) — animation rules and standalone `scale`/`opacity`.

`[forMenuContent]` / `[forMenuSubContent]` are portaled to `document.body` and get their position resolved by floating-ui. The resolved geometry is exposed as custom properties on the content host (cleared on close). These also drive the content surface for `[forDropdownMenu]` and `[forContextMenu]`, which reuse `[forMenuContent]`:

| Custom property                           | Type / range        | Meaning                                                                                                      |
| ----------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `--for-floating-anchor-width`             | px                  | Anchor (trigger) width — match it with `width: var(--for-floating-anchor-width)`.                            |
| `--for-floating-anchor-height`            | px                  | Anchor (trigger) height.                                                                                     |
| `--for-floating-available-width`          | px                  | Space available along the inline axis (floating-ui `size` middleware) — clamp with `max-width`.              |
| `--for-floating-available-height`         | px                  | Space available along the block axis — clamp with `max-height`.                                              |
| `--for-floating-content-transform-origin` | `<origin>` keywords | `transform-origin` matching the resolved side / align, so a `scale` enter animation pivots from the trigger. |

```css
.menu-item[data-highlighted],
.menu-checkbox-item[data-highlighted],
.menu-radio-item[data-highlighted] {
  background: rgba(0, 0, 0, 0.06);
}
.menu-sub-trigger[data-state='open'] .chevron {
  transform: rotate(90deg);
}
```

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_MENU_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
