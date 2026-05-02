# Menu (shared pieces)

Shared surface and item directives consumed by `[forDropdownMenu]` (button trigger) and `[forContextMenu]` (right-click). The folder doesn't expose its own root primitive — open the menu via one of those two flavors.

Implements the [WAI-ARIA Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) for the surface (`role="menu"`) and for items (`menuitem` / `menuitemcheckbox` / `menuitemradio`).

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForMenuContent` | `[forMenuContent]` / `[forMenuSubContent]` | The menu surface. Portaled, positioned by floating-ui, dismissable layer attached. The `Sub` selector is an alias used inside `[forMenuSub]` for template readability. |
| `ForMenuItem` | `[forMenuItem]` | One action item. Activation closes the menu. |
| `ForMenuCheckboxItem` | `[forMenuCheckboxItem]` | `model<boolean> checked`. Activation toggles + closes. |
| `ForMenuRadioGroup` | `[forMenuRadioGroup]` | `model<string> value` shared by its radio items. |
| `ForMenuRadioItem` | `[forMenuRadioItem]` | One radio option. `value: required<string>`. |
| `ForMenuSeparator` | `[forMenuSeparator]` | Decorative separator, `role="separator"`. |
| `ForMenuGroup` | `[forMenuGroup]` | Logical grouping, `role="group"` with `aria-labelledby`. |
| `ForMenuGroupLabel` | `[forMenuGroupLabel]` | Label registered with the parent group. |
| `ForMenuSub` | `[forMenuSub]` | Root for a nested submenu — owns its own `open`, ids, and item collection. |
| `ForMenuSubTrigger` | `[forMenuSubTrigger]` | The `menuitem` in the parent menu that opens the submenu. Wires `aria-haspopup` / `aria-expanded`. |

## Mount/visibility convention

`[forMenuContent]` follows the floating-overlay convention: the consumer's signal drives `@if`, the directive emits `(close)` (forwarded by the root primitive) when it wants to be unmounted. No `[hidden]`. See `[forDropdownMenu]` and `[forContextMenu]` for end-to-end examples.

## Item activation contract

Every item type emits a vetoable `(select)` event — a `CustomEvent` with `cancelable: true`. The default action is to close the menu after the item's state has been applied (toggle for checkbox, set value for radio). Call `event.preventDefault()` on the event to keep the menu open.

```html
<!-- Closes menu by default -->
<button forMenuItem (select)="save()">Save</button>

<!-- Stays open -->
<button forMenuCheckboxItem [(checked)]="bold" (select)="$event.preventDefault()">
  Bold
</button>
```

## Keyboard

- **ArrowDown / ArrowUp** — move focus to the next / previous enabled item, wrapping by default.
- **Home / End** — jump to first / last enabled item.
- **Enter / Space** — activate the focused item (native `<button>` semantics).
- **Tab / Shift+Tab** — close the menu and return focus to the trigger. Inside a submenu, propagates upward and tears down the entire chain.
- **Escape** — close the menu and return focus to the trigger. Inside a submenu, closes only that level (parent stays open).
- **ArrowRight** (on a `[forMenuSubTrigger]`) — open the submenu and focus its first item. (LTR.)
- **ArrowLeft** (on an item inside a submenu) — close the submenu and return focus to the `[forMenuSubTrigger]`.
- **Typeahead** — single printable characters move focus to the first item whose text starts with the buffered string. Disabled items are skipped.

## Submenu

A nested menu is opened by a `[forMenuSubTrigger]` — itself a `menuitem` in the parent menu. The `[forMenuSub]` root owns the submenu's open state, item collection, and dismissable layer.

```html
<div forDropdownMenu [(open)]="open">
  <button forDropdownMenuTrigger>File</button>
  @if (open()) {
    <div forMenuContent>
      <button forMenuItem (select)="open()">Open</button>
      <div forMenuSub [(open)]="recent">
        <button forMenuSubTrigger>Open recent</button>
        @if (recent()) {
          <div forMenuSubContent>
            <button forMenuItem (select)="open('a.txt')">a.txt</button>
            <button forMenuItem (select)="open('b.txt')">b.txt</button>
          </div>
        }
      </div>
    </div>
  }
</div>
```

The `[forMenuSubTrigger]` is registered as a `menuitem` in the **parent** menu's collection, so parent navigation (ArrowDown/Up, typeahead) reaches it. Reading open state from the **submenu**, it wires `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` to the submenu's content.

Closing semantics propagate upward by default: activating an item inside a submenu (or pressing Tab, or clicking outside both menus) tears down the entire chain. Escape closes only the level that has focus — Escape inside a submenu closes the submenu and returns focus to the `[forMenuSubTrigger]`, leaving the parent open.

The submenu's dismissable layer exempts the **parent menu's content** — clicking on a parent menu item doesn't fire the submenu's outside-handler. Instead, the parent item's own click activates and tears down everything via the propagated `closeMenu`.

## Accessibility notes

- Apply each item directive to a `<button>` so Space / Enter activation come from native button behavior.
- Disabled items keep `tabindex="-1"` and `aria-disabled="true"` (per APG) — they remain focusable so screen readers can announce them, but click and keyboard activation are no-ops.
- `[forMenuSeparator]` is decorative and never registers with the menu's item collection — it's skipped during navigation and typeahead automatically.
- `[forMenuGroup]` is purely advisory grouping — items inside still register flatly with the parent menu, so navigation flows through groups without interruption.
- Submenus use `placement="right-start"` by default (open to the right of the parent item). Override with `[placement]` on `[forMenuSub]` if your layout flips RTL or needs another direction.
