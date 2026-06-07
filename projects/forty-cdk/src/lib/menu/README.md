# Menu (shared pieces)

Shared surface and item directives consumed by `[forDropdownMenu]` (button trigger) and `[forContextMenu]` (right-click). The folder doesn't expose its own root primitive — open the menu via one of those two flavors.

Implements the [WAI-ARIA Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) for the surface (`role="menu"`) and for items (`menuitem` / `menuitemcheckbox` / `menuitemradio`).

## Pieces

| Class                  | Selector                                   | Role                                                                                                                                                                   |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForMenuContent`       | `[forMenuContent]` / `[forMenuSubContent]` | The menu surface. Portaled, positioned by floating-ui, dismissable layer attached. The `Sub` selector is an alias used inside `[forMenuSub]` for template readability. |
| `ForMenuItem`          | `[forMenuItem]`                            | One action item. Activation closes the menu.                                                                                                                           |
| `ForMenuCheckboxItem`  | `[forMenuCheckboxItem]`                    | `model<boolean> checked`. Activation toggles + closes.                                                                                                                 |
| `ForMenuRadioGroup`    | `[forMenuRadioGroup]`                      | `model<string> value` shared by its radio items.                                                                                                                       |
| `ForMenuRadioItem`     | `[forMenuRadioItem]`                       | One radio option. `value: required<string>`.                                                                                                                           |
| `ForMenuItemIndicator` | `[forMenuItemIndicator]`                   | Optional. Used inside checkbox / radio items. Hides itself when the parent is unchecked. Mirrors the parent's `data-state`. `[forceMount]` keeps it mounted.           |
| `ForMenuSeparator`     | `[forMenuSeparator]`                       | Decorative separator, `role="separator"`.                                                                                                                              |
| `ForMenuGroup`         | `[forMenuGroup]`                           | Logical grouping, `role="group"` with `aria-labelledby`.                                                                                                               |
| `ForMenuGroupLabel`    | `[forMenuGroupLabel]`                      | Label registered with the parent group.                                                                                                                                |
| `ForMenuSub`           | `[forMenuSub]`                             | Root for a nested submenu — owns its own `open`, ids, and item collection.                                                                                             |
| `ForMenuSubTrigger`    | `[forMenuSubTrigger]`                      | The `menuitem` in the parent menu that opens the submenu. Wires `aria-haspopup` / `aria-expanded`.                                                                     |

For the recommended `[forceMount]` + `opacity` pattern that keeps indicator columns aligned across checkbox / radio items, see the [selected-indicator alignment guide](../../../../../docs/selected-indicator-pattern.md).

## Mount/visibility convention

`[forMenuContent]` follows the floating-overlay convention: the consumer's signal drives `@if`, the directive emits `(close)` (forwarded by the root primitive) when it wants to be unmounted. No `[hidden]`. See `[forDropdownMenu]` and `[forContextMenu]` for end-to-end examples.

## Item activation contract

Every item type emits a vetoable `(select)` event — handlers receive a `VetoableEvent`. The default action is to close the menu after the item's state has been applied (toggle for checkbox, set value for radio). Call `event.preventDefault()` on the veto to keep the menu open.

```html
<!-- Closes menu by default -->
<button forMenuItem class="menu-item" (select)="save()">Save</button>

<!-- Stays open -->
<button
  forMenuCheckboxItem
  class="menu-checkbox-item"
  [(checked)]="bold"
  (select)="$event.preventDefault()"
>
  Bold
</button>
```

## Keyboard

- **ArrowDown / ArrowUp** — move focus to the next / previous enabled item, wrapping by default.
- **Home / End** — jump to first / last enabled item.
- **Enter / click** — activate the focused item via native `<button>` semantics. Closes the menu unless the consumer calls `event.preventDefault()` on `(select)`.
- **Space** — activates the focused item:
  - On a plain `[forMenuItem]`, behaves like Enter / click (closes the menu).
  - On `[forMenuCheckboxItem]` and `[forMenuRadioItem]`, toggles `checked` / sets the group `value`, emits `(select)`, and **never closes** the menu — per APG, so users can flip several options before dismissing. Calling `event.preventDefault()` on `(select)` is unnecessary for Space (the menu already stays open) but is still respected on Enter / click.
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

A nested menu is opened by a `[forMenuSubTrigger]` — itself a `menuitem` in the parent menu. The `[forMenuSub]` root owns the submenu's open state, item collection, and dismissable layer.

Both `[forMenuSub]` (`exportAs: 'forMenuSub'`) and the parent `[forDropdownMenu]` / `[forContextMenu]` own `open` as a `model<boolean>`, so the minimal case needs no consumer signals at all — expose each with a template reference variable (`#menu="forDropdownMenu"`, `#sub="forMenuSub"`) and drive the `@if` straight off its `open()`:

```html
<div forDropdownMenu #menu="forDropdownMenu">
  <button forDropdownMenuTrigger>File</button>
  @if (menu.open()) {
  <div forMenuContent>
    <button forMenuItem class="menu-item" (select)="openFile()">Open</button>
    <div forMenuSub #sub="forMenuSub">
      <button forMenuSubTrigger class="menu-sub-trigger">Open recent</button>
      @if (sub.open()) {
      <div forMenuSubContent>
        <button forMenuItem class="menu-item" (select)="openFile('a.txt')">a.txt</button>
        <button forMenuItem class="menu-item" (select)="openFile('b.txt')">b.txt</button>
      </div>
      }
    </div>
  </div>
  }
</div>
```

Bind `[(open)]="mySignal"` on either level instead only when the component class needs to read or drive that level's open state itself. The `[forMenuSubTrigger]` is registered as a `menuitem` in the **parent** menu's collection, so parent navigation (ArrowDown/Up, typeahead) reaches it. Reading open state from the **submenu**, it wires `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` to the submenu's content.

Closing semantics propagate upward by default: activating an item inside a submenu (or pressing Tab, or clicking outside both menus) tears down the entire chain. Escape closes only the level that has focus — Escape inside a submenu closes the submenu and returns focus to the `[forMenuSubTrigger]`, leaving the parent open.

The submenu's dismissable layer exempts the **parent menu's content** — clicking on a parent menu item doesn't fire the submenu's outside-handler. Instead, the parent item's own click activates and tears down everything via the propagated `closeMenu`.

### Pointer (mouse hover)

Additive to the click / keyboard behaviour, a `[forMenuSubTrigger]` also opens its submenu on **mouse hover** — matching Radix, Base UI, and native desktop menus:

- **pointerenter** over the sub-trigger opens the submenu after `subMenuOpenDelay` (default `100`ms), **without** moving focus into it (only keyboard / click move focus in).
- **pointerleave** closes it after `subMenuCloseDelay` (default `100`ms) — _unless_ the pointer is travelling toward the open submenu. A Radix-style pointer-grace "safe triangle" is drawn from the cursor to the submenu's near edge; while the pointer stays inside it (heading to the submenu) the close is held off. The triangle's lifetime is capped by `subMenuPointerGraceDuration` (default `300`ms).
- Touch / pen never hover, so they open the submenu by tap (the native click) — the hover listeners are gated to `pointerType === 'mouse'`.

Tune the timings per injector scope with `provideForMenuDefaults` (applies to every submenu in the surrounding scope, across DropdownMenu / ContextMenu / Menubar):

```ts
import { provideForMenuDefaults } from 'forty-cdk';

bootstrapApplication(App, {
  providers: [provideForMenuDefaults({ subMenuOpenDelay: 150, subMenuCloseDelay: 200 })],
});
```

Partial overrides inherit unspecified keys from the parent scope (or the library defaults at the root), so a component-level `providers: [provideForMenuDefaults({ subMenuOpenDelay: 0 })]` layers on top of an app-level configuration per key.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

### Data attributes

| Piece                                      | Attribute          | Values                   |
| ------------------------------------------ | ------------------ | ------------------------ |
| `[forMenuContent]` / `[forMenuSubContent]` | `data-state`       | `open` \| `closed`       |
| `[forMenuItem]`                            | `data-disabled`    | present \| absent        |
| `[forMenuItem]`                            | `data-highlighted` | present \| absent        |
| `[forMenuCheckboxItem]`                    | `data-state`       | `checked` \| `unchecked` |
| `[forMenuCheckboxItem]`                    | `data-disabled`    | present \| absent        |
| `[forMenuCheckboxItem]`                    | `data-highlighted` | present \| absent        |
| `[forMenuRadioItem]`                       | `data-state`       | `checked` \| `unchecked` |
| `[forMenuRadioItem]`                       | `data-disabled`    | present \| absent        |
| `[forMenuRadioItem]`                       | `data-highlighted` | present \| absent        |
| `[forMenuItemIndicator]`                   | `data-state`       | `checked` \| `unchecked` |
| `[forMenuSub]`                             | `data-state`       | `open` \| `closed`       |
| `[forMenuSub]`                             | `data-disabled`    | present \| absent        |
| `[forMenuSubTrigger]`                      | `data-state`       | `open` \| `closed`       |
| `[forMenuSubTrigger]`                      | `data-disabled`    | present \| absent        |

> `[forMenuContent]` / `[forMenuSubContent]` portal to `document.body`, so a class scoped to your trigger's component cannot reach the surface. Style it with **global CSS** or a class you pass through (see [Styling floating content](../../../../../docs/styling-floating-content.md)). The content host also exposes the shared positioner custom properties — `--for-anchor-width` / `--for-anchor-height`, `--for-available-width` / `--for-available-height`, and `--for-content-transform-origin` — tabulated below and documented in full in [Styling floating content](../../../../../docs/styling-floating-content.md).

### CSS custom properties

See also: [Styling floating content](../../../../../docs/styling-floating-content.md) — animation rules and standalone `scale`/`opacity`.

`[forMenuContent]` / `[forMenuSubContent]` are portaled to `document.body` and get their position resolved by floating-ui. The resolved geometry is exposed as custom properties on the content host (cleared on close). These also drive the content surface for `[forDropdownMenu]` and `[forContextMenu]`, which reuse `[forMenuContent]`:

| Custom property                  | Type / range        | Meaning                                                                                                      |
| -------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `--for-anchor-width`             | px                  | Anchor (trigger) width — match it with `width: var(--for-anchor-width)`.                                     |
| `--for-anchor-height`            | px                  | Anchor (trigger) height.                                                                                     |
| `--for-available-width`          | px                  | Space available along the inline axis (floating-ui `size` middleware) — clamp with `max-width`.              |
| `--for-available-height`         | px                  | Space available along the block axis — clamp with `max-height`.                                              |
| `--for-content-transform-origin` | `<origin>` keywords | `transform-origin` matching the resolved side / align, so a `scale` enter animation pivots from the trigger. |

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

## Accessibility notes

- Apply each item directive to a `<button>` so Space / Enter activation come from native button behavior.
- Disabled items keep `tabindex="-1"` and `aria-disabled="true"` (per APG) — they remain focusable so screen readers can announce them, but click and keyboard activation are no-ops.
- `[forMenuSeparator]` is decorative and never registers with the menu's item collection — it's skipped during navigation and typeahead automatically.
- `[forMenuGroup]` is purely advisory grouping — items inside still register flatly with the parent menu, so navigation flows through groups without interruption.
- Submenus use `side="right"` `align="start"` by default in LTR and `side="left"` `align="start"` in RTL — set `[dir]="'rtl'"` on the top-level `[forDropdownMenu]` / `[forContextMenu]` and every nested `[forMenuSub]` inherits it (and flips `side`, ArrowLeft/Right semantics, etc.). Override per-submenu with `[dir]` or `[side]` if a specific submenu needs to render against the opposite direction.
- In RTL, ArrowLeft opens a submenu and ArrowRight closes it back to the parent — the swap mirrors the visual flip of the menu chain.
- **`data-highlighted=""`** is reflected on the focused `[forMenuItem]` / `[forMenuCheckboxItem]` / `[forMenuRadioItem]` so consumers can paint a uniform focus ring shared with the listbox / select / combobox primitives.
