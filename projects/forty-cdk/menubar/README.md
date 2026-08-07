# Menubar

A horizontal bar of menus, as in a desktop application, with roving tabindex across the triggers.

A bar of triggers — horizontal or vertical — each opening a dropdown menu, with cross-menu ArrowLeft / ArrowRight navigation and hover-after-first-open.

## Anatomy

```html
<div forMenubar [(value)]="openMenu" ariaLabel="Application">
  <button forMenubarTrigger value="file">File</button>
  <!-- mounted when openMenu() === 'file' -->
  <div forMenuContent>
    <button forMenuItem>New file</button>
    <hr forMenuSeparator />
    <button forMenuItem>Quit</button>
  </div>

  <button forMenubarTrigger value="edit">Edit</button>
  <!-- mounted when openMenu() === 'edit' -->
  <div forMenuContent>
    <button forMenuItem>Undo</button>
    <button forMenuItem>Redo</button>
  </div>
</div>
```

`ForMenubar` (`[forMenubar]`) is the root: it owns `value` (the open trigger), orientation, dir, loop and disabled, and provides a multiplexed `ForMenuContext` to the active `[forMenuContent]`. Each `ForMenubarTrigger` (`[forMenubarTrigger]`) is a `role="menuitem"` button with `aria-haspopup="menu"` / `aria-expanded` / `aria-controls`, participating in roving tabindex and trigger-row keyboard.

The menu surface, items, separators, groups, and submenus come from the [`menu/`](../menu/README.md) folder — same primitives as `[forDropdownMenu]` and `[forContextMenu]`. The bar simply pumps a different `ForMenuContext` whose anchor / side / ids reflect the active trigger.

## Examples

```ts
import { Component, signal } from '@angular/core';
import { ForMenuContent, ForMenuItem, ForMenuSeparator } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';

@Component({
  selector: 'demo-menubar',
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem, ForMenuSeparator],
  template: `
    <div forMenubar [(value)]="open" aria-label="Main">
      <button forMenubarTrigger value="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent animate.leave="fade-out">
          <button forMenuItem (activate)="newDoc()">New</button>
          <button forMenuItem (activate)="openDoc()">Open…</button>
          <hr forMenuSeparator />
          <button forMenuItem (activate)="quit()">Quit</button>
        </div>
      }

      <button forMenubarTrigger value="edit">Edit</button>
      @if (open() === 'edit') {
        <div forMenuContent>
          <button forMenuItem (activate)="undo()">Undo</button>
          <button forMenuItem (activate)="redo()">Redo</button>
        </div>
      }

      <button forMenubarTrigger value="view" disabled>View</button>
    </div>
  `,
})
export class DemoMenubar {
  readonly open = signal<string | null>(null);
  newDoc() {}
  openDoc() {}
  quit() {}
  undo() {}
  redo() {}
}
```

`@if (open() === '<value>')` controls each menu's mount, so Angular's `animate.enter` / `animate.leave` fire on the natural mount cycle. `[(value)]` is two-way bindable; the menubar flips it on trigger interaction, item activation, Escape, outside dismissal, and cross-menu navigation.

## Mount shapes

The bar provides **one** multiplexed `ForMenuContext`, so a `[forMenuContent]` does not have to be repeated per trigger. Three shapes are supported, and all three preserve a consumer-set static `id` on the surface:

| Shape                       | Markup                                                    | When to reach for it                                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One `@if` per trigger**   | `@if (open() === 'file') { <div forMenuContent>…</div> }` | The canonical shape. Each menu owns its items, and `animate.enter` / `animate.leave` fire per menu on every switch.                                                                     |
| **One shared `@if`**        | `@if (open() !== null) { <div forMenuContent>…</div> }`   | One surface for the whole bar, with the consumer swapping the items. Cheaper to author; the surface is _not_ remounted on a switch, so per-menu enter / leave animations do not replay. |
| **Unconditionally mounted** | `<div forMenuContent>…</div>`                             | The surface stays in the DOM for the bar's whole lifetime. Nothing mounts or unmounts, so no mount-cycle animation runs at all.                                                         |

For the two shared shapes the surface belongs to no single trigger, so a static `id` on it stays put across a menu switch and every trigger's `aria-controls` resolves to it. A surface with no static `id` gets a generated one that follows the active trigger. In every shape the accessible name (`aria-labelledby` / `aria-label`) tracks whichever trigger's menu is currently open.

Only a plain `id="…"` **attribute** is preserved. A `[id]="expr"` property binding evaluates after the directive is constructed, so it is invisible to the adoption and fights the surface's own `[id]` binding.

## API

### `ForMenubar`

| Property             | Type                                                      | Description                                                                                                                                                                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`              | `model<string \| null>`                                   | Two-way bindable. The open trigger's `value`, or `null` when none.<br>**Default:** `null`                                                                                                                                                                                                                                    |
| `orientation`        | `input<string>`                                           | `'horizontal' \| 'vertical'`. Drives the trigger-row arrow keys (Left/Right horizontal, Up/Down vertical).<br>**Default:** `'horizontal'`                                                                                                                                                                                    |
| `dir`                | `input<string>`                                           | Writing direction. RTL inverts ArrowLeft / ArrowRight on the trigger row and inside the open menu.<br>**Default:** `'ltr'`                                                                                                                                                                                                   |
| `loop`               | `input<boolean>`                                          | When `true`, trigger-row navigation and cross-menu nav wrap at the ends.<br>**Default:** `true`                                                                                                                                                                                                                              |
| `disabled`           | `input<boolean>`                                          | When `true`, every trigger interaction is a no-op.<br>**Default:** `false`                                                                                                                                                                                                                                                   |
| `dismissible`        | `input<boolean>`                                          | When `false`, the open menu ignores Escape and outside interaction — it stays pinned open until `value` is flipped (consumer write, trigger / item interaction, or cross-menu nav).<br>**Default:** `true`                                                                                                                   |
| `ariaLabel`          | `input<string \| null>`                                   | Accessible name for the menubar (`<div forMenubar aria-label="Main">` works too).<br>**Default:** `null`                                                                                                                                                                                                                     |
| `escapeKeyDown`      | `output<VetoableNativeEvent<KeyboardEvent>>`              | Output. Escape pressed while the open menu is the topmost dismissible layer.<br>**Default:** —                                                                                                                                                                                                                               |
| `pointerDownOutside` | `output<VetoableNativeEvent<PointerEvent>>`               | Output. Pointer-down on a target outside the open menu and every trigger.<br>**Default:** —                                                                                                                                                                                                                                  |
| `focusOutside`       | `output<VetoableNativeEvent<FocusEvent>>`                 | Output. Focus moves outside the open menu and every trigger.<br>**Default:** —                                                                                                                                                                                                                                               |
| `interactOutside`    | `output<VetoableNativeEvent<PointerEvent \| FocusEvent>>` | Output. Composite — fires alongside the two above and shares their veto state.<br>**Default:** —                                                                                                                                                                                                                             |
| `autoFocusOnOpen`    | `output<VetoableEvent>`                                   | Output. Just before focus moves to the first / last enabled item on mount. Not fired on a hover-switch, which parks focus on the hovered trigger instead.<br>**Default:** —                                                                                                                                                  |
| `autoFocusOnClose`   | `output<VetoableEvent>`                                   | Output. Just before focus returns to the trigger on unmount. Not fired for Tab / outside-interaction closes, which already moved focus, nor when a sibling's menu replaces the open one — a switch (hover, cross-menu arrows, a click on another trigger) is not a close, so no return-focus move happens.<br>**Default:** — |

Every output above is vetoable — each handler receives a `VetoableEvent` (or `VetoableNativeEvent<E>` when there is a native DOM event). Call `preventDefault()` on the emitted veto to suppress the menubar's default action; the original DOM event, when present, is on `.event`. The outputs are declared on `[forMenubar]` rather than per trigger: the bar provides a single multiplexed menu context, so one set of handlers covers whichever trigger's menu is open.

### `ForMenubarTrigger`

| Property                                                                                                                      | Type                     | Description                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                                                                                                                       | `input.required<string>` | Identifier for the trigger. The menubar's `value` model holds this when the menu is open.<br>**Default:** —                                                                                                                                   |
| `disabled`                                                                                                                    | `input<boolean>`         | Per-trigger disabled, in addition to the menubar's `disabled`.<br>**Default:** `false`                                                                                                                                                        |
| `side` / `align` / `alignOffset` / `avoidCollisions` / `arrowPadding` / `sticky` / `hideWhenDetached` / `clipUntilPositioned` | `input<...>`             | Forwarded to the multiplexed `[forMenuContent]` when this trigger's menu is the one open. Same surface and same defaults as `[forDropdownMenu]`.<br>**Default:** `'bottom'` / `'start'` / `0` / `true` / `0` / `'partial'` / `false` / `true` |
| `sideOffset` / `collisionPadding` / `fallbackAxisSideDirection`                                                               | `input<...>`             | Gap (px) along the main axis / viewport collision padding (px) / side `flip` drops the menu to when both sides of the preferred axis overflow. Defaults from `provideForMenubarDefaults`.<br>**Default:** `4` / `8` / `'none'`                |
| `ariaLabel`                                                                                                                   | `input<string \| null>`  | Manual `aria-label` on `[forMenuContent]` if the trigger isn't a meaningful name.<br>**Default:** `null`                                                                                                                                      |

### Data attributes

| Piece                 | Attribute          | Values                     |
| --------------------- | ------------------ | -------------------------- |
| `[forMenubar]`        | `data-state`       | `open` \| `closed`         |
| `[forMenubar]`        | `data-orientation` | `horizontal` \| `vertical` |
| `[forMenubar]`        | `data-disabled`    | present \| absent          |
| `[forMenubarTrigger]` | `data-state`       | `open` \| `closed`         |
| `[forMenubarTrigger]` | `data-orientation` | `horizontal` \| `vertical` |
| `[forMenubarTrigger]` | `data-disabled`    | present \| absent          |

## Keyboard

### Trigger

| Key                        | Behavior                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `Click`                    | Toggle this trigger's menu. On open, focus moves to the first enabled item.                 |
| `Enter` / `Space`          | Open this trigger's menu and focus the first enabled item; already open, focus moves to it. |
| `ArrowDown`                | Open and focus the first enabled item; already open, focus moves to it.                     |
| `ArrowUp`                  | Open and focus the last enabled item; already open, focus moves to it.                      |
| `ArrowLeft` / `ArrowRight` | Move focus to the previous / next enabled trigger. RTL inverts.                             |
| `Home` / `End`             | Focus the first / last enabled trigger.                                                     |
| `Typeahead`                | Printable keys focus the first sibling trigger whose label starts with the buffered string. |

### In-menu

Inside an open menu, the standard `[forMenuContent]` keyboard applies — see [`menu/README.md`](../menu/README.md). The menubar adds:

| Key                                              | Behavior                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ArrowLeft` / `ArrowRight` (on a top-level item) | Close the current menu and open the previous / next sibling menu, focusing its first item. RTL inverts.                                                 |
| `ArrowRight` (on a plain item inside a submenu)  | Collapse the whole submenu chain and open the next sibling menu, focusing its first item. `ArrowLeft` collapses one submenu level instead. RTL inverts. |
| `Escape`                                         | Close the menu and return focus to its trigger.                                                                                                         |
| `Tab` / `Shift+Tab`                              | Close the menu and return focus to its trigger; the natural tab sequence then exits the menubar.                                                        |

Submenus opened from a top-level menu work as in `[forDropdownMenu]` — Escape collapses one level at a time, the open-key opens, the close-key collapses upward. When the submenu's parent is the top of a menubar, the close-key on the submenu trigger collapses the parent and switches to the previous sibling menu; the away-key on a plain item inside any submenu level collapses the whole chain and switches to the next sibling menu.

## Accessibility

`[forMenubar]` implements the [WAI-ARIA Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/). Each trigger carries `role="menuitem"` with `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`. Roving tabindex keeps one trigger in the tab sequence at a time. Disabled triggers remain focusable with `aria-disabled="true"` per APG. The menu surface and item roles come from the shared [`menu/`](../menu/README.md) primitives.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

> Each trigger's menu surface is the shared `[forMenuContent]` (from [`menu/`](../menu/README.md)), which **portals to `document.body`**. Style it with global CSS or a class — scoped/`:host` styles won't reach it. The portaled content also exposes the shared positioner custom properties (`--for-floating-anchor-width` / `-height`, `--for-floating-available-width` / `-height`, `--for-floating-content-transform-origin`); see [Styling floating content](../../../docs/styling-floating-content.md) for the full list and how to use them.

```css
.menubar-trigger[data-state='open'] {
  background: var(--accent);
}

.menubar-trigger[data-disabled] {
  opacity: 0.5;
}
```

## Behavior notes

- **One open at a time.** Opening trigger `B` while `A` is open implicitly closes `A` and opens `B` with its first item focused — except on a hover-switch, which leaves focus on `B`'s trigger (see below).
- **First open is intentional, subsequent are hover.** While no menu is open, hovering a trigger does _not_ auto-open, and keyboard focus alone never opens a menu. After the user opens any menu via click / keyboard, hovering a sibling trigger opens it instantly (no delay).
- **Hover-switch parks focus on the hovered trigger.** Switching menus by hover is a full close/open cycle: the outgoing menu unmounts, so the focus it held has to be relocated or it would fall to `<body>`. It is relocated to the **hovered trigger**, not into the menu that just opened — matching the APG reference implementation's [`menubar-navigation.js`](https://www.w3.org/WAI/content-assets/wai-aria-practices/patterns/menubar/examples/js/menubar-navigation.js), whose `onMenuitemPointerover` focuses the hovered bar item and only then swaps the popups. So a mouse user sweeping across the bar to read the menus never has focus dragged through each popup in turn, and `(autoFocusOnOpen)` does not fire for the incoming surface: there is no focus move to veto. Keyboard handoff is seamless from there — `ArrowDown` / `ArrowUp` / `Enter` on the hovered trigger move focus to the first / last item of the menu that is already open. Every other open path (click, `Enter` / `Space`, `ArrowDown` / `ArrowUp`, cross-menu `ArrowLeft` / `ArrowRight`) still focuses an item inside the menu. This is a different mechanism from `[forMenuSub]`, whose hover-open simply _suppresses_ the focus move: a submenu opens _alongside_ the menu that holds focus, whereas a menubar hover-switch destroys the focus holder and so must put focus somewhere.
- **Hover-leave does _not_ dismiss.** Moving the pointer off the bar (or off the open menu) leaves the menu open. The [APG Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) prescribes no hover-leave close, and a menubar menu always holds focus while open — dismissing it because the mouse wandered would rip focus out from under a keyboard user and strand it on `<body>`. Dismiss with Escape, an outside pointer interaction, Tab, or by activating an item.
- **Dismissal.** Escape and an outside pointer interaction close the open menu when `dismissible` is `true` (default). `[dismissible]="false"` suppresses both.
- **Roving tabindex.** Only one trigger is in the tab sequence at a time — the open trigger, the most-recently-focused trigger, or the first enabled one when nothing's focused.
- **Mount equals open.** In the canonical shape each menu's `[forMenuContent]` is wrapped in `@if (value() === '<id>')`, so `animate.enter` / `animate.leave` fire on mount / unmount. The directive never toggles `[hidden]` — a surface kept mounted (see [Mount shapes](#mount-shapes)) runs no mount-cycle animation.
- **Disabled triggers stay focusable** (per APG) — they still reflect `data-disabled=""` and `aria-disabled="true"` and are skipped by ArrowLeft / ArrowRight, typeahead, and cross-menu nav.

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_MENUBAR_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
