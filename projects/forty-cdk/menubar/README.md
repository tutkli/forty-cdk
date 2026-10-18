---
title: Menubar
group: primitives
archetype: [overlay]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
---

# Menubar

A horizontal bar of menus, as in a desktop application, with roving tabindex across the triggers.

A bar of triggers (horizontal or vertical), each opening a dropdown menu, with cross-menu ArrowLeft / ArrowRight navigation and hover-after-first-open.

## When to choose

- **Menubar**: a persistent bar of menu triggers with roving tabindex across the bar, ArrowLeft / ArrowRight between menus, and one menu open at a time.
- **[Dropdown Menu](../dropdown-menu/README.md)**: a single trigger and its menu, with no bar and no cross-menu navigation. Choose it unless the menus genuinely belong to one bar.
- **[Context Menu](../context-menu/README.md)**: the same actions opened by right-click at the pointer.
- **[Toolbar](../toolbar/README.md)**: the same one-Tab-stop bar shape when the controls act directly (buttons, toggles) instead of opening menus.

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

The menu surface, items, separators, groups, and submenus come from the [`menu/`](../menu/README.md) folder and are the same primitives that `[forDropdownMenu]` and `[forContextMenu]` use. The bar simply pumps a different `ForMenuContext` whose anchor / side / ids reflect the active trigger.

## Examples

Move along the bar with the left / right arrows and open a menu with the down arrow. Once one is open, moving the pointer to another opens it without a click.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForMenuContent, ForMenuItem, ForMenuSeparator } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';

@Component({
  selector: 'app-menubar-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem, ForMenuSeparator],
  template: `
    <div forMenubar [(value)]="openMenu" ariaLabel="Application" class="menubar-menu">
      <button forMenubarTrigger value="file" class="menubar-menu-trigger">File</button>
      @if (openMenu() === 'file') {
        <div forMenuContent class="menubar-menu-content" animate.enter="menubar-menu-pop-in">
          <button forMenuItem class="menubar-menu-item">New file</button>
          <button forMenuItem class="menubar-menu-item">Open…</button>
          <button forMenuItem class="menubar-menu-item">Save</button>
          <hr forMenuSeparator class="menubar-menu-separator" />
          <button forMenuItem class="menubar-menu-item">Quit</button>
        </div>
      }

      <button forMenubarTrigger value="edit" class="menubar-menu-trigger">Edit</button>
      @if (openMenu() === 'edit') {
        <div forMenuContent class="menubar-menu-content" animate.enter="menubar-menu-pop-in">
          <button forMenuItem class="menubar-menu-item">Undo</button>
          <button forMenuItem class="menubar-menu-item" [disabled]="true">Redo</button>
          <hr forMenuSeparator class="menubar-menu-separator" />
          <button forMenuItem class="menubar-menu-item">Cut</button>
          <button forMenuItem class="menubar-menu-item">Copy</button>
          <button forMenuItem class="menubar-menu-item">Paste</button>
        </div>
      }

      <button forMenubarTrigger value="view" class="menubar-menu-trigger">View</button>
      @if (openMenu() === 'view') {
        <div forMenuContent class="menubar-menu-content" animate.enter="menubar-menu-pop-in">
          <button forMenuItem class="menubar-menu-item">Zoom in</button>
          <button forMenuItem class="menubar-menu-item">Zoom out</button>
          <button forMenuItem class="menubar-menu-item">Reset zoom</button>
        </div>
      }
    </div>
  `,
})
export class MenubarDefaultExample {
  protected readonly openMenu = signal<string | null>(null);
}
```

### Vertical & RTL

The same menubar laid out as a vertical sidebar (`orientation='vertical'` makes `Up` / `Down` move between triggers) with `dir='rtl'`. RTL swaps the cross-menu arrow keys and floats each menu out of the opposite edge. The directive resolves the writing direction and positioning for you.

## Mounting the menus

Wrap each trigger's `[forMenuContent]` in its own `@if` on the bar's value:

```html
<div forMenubar [(value)]="open">
  <button forMenubarTrigger value="file">File</button>
  @if (open() === 'file') {
  <div forMenuContent>…</div>
  }
</div>
```

The surface's mount is its open state. Focus moves to the first item when the menu mounts and back to the trigger when it is destroyed, Escape and outside presses reach it only while it exists, and `animate.enter` / `animate.leave` fire per menu on every switch. A surface left mounted while no menu is open, or shared by every trigger through one `@if (open() !== null)`, outlives the open state and gets none of that right, so neither is supported. In dev mode a `[forMenuContent]` still mounted after its first render while the bar is closed logs `FORCDK-CORE-006`.

A consumer-set static `id` on the surface is adopted by its trigger, so `aria-controls` resolves to it. Only a plain `id="…"` **attribute** is preserved. A `[id]="expr"` property binding evaluates after the directive is constructed, so it is invisible to the adoption and fights the surface's own `[id]` binding.

## API

### `ForMenubar`

| Property             | Type                                                      | Description                                                                                                                                                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`              | `model<string \| null>`                                   | Two-way bindable. The open trigger's `value`, or `null` when none. The menubar writes it on trigger interaction, item activation, Escape, outside dismissal and cross-menu navigation.<br>**Default:** `null`                                                                                                               |
| `orientation`        | `input<string>`                                           | `'horizontal' \| 'vertical'`. Drives the trigger-row arrow keys (Left/Right horizontal, Up/Down vertical).<br>**Default:** `'horizontal'`                                                                                                                                                                                   |
| `dir`                | `input<'ltr' \| 'rtl' \| null>`                           | Writing direction. `null` inherits the nearest `[dir]` / `<html dir>`, else `'ltr'`. RTL inverts ArrowLeft / ArrowRight on the trigger row and inside the open menu.<br>**Default:** `null`                                                                                                                                 |
| `loop`               | `input<boolean>`                                          | When `true`, trigger-row navigation and cross-menu nav wrap at the ends.<br>**Default:** `true`                                                                                                                                                                                                                             |
| `disabled`           | `input<boolean>`                                          | When `true`, every trigger interaction is a no-op.<br>**Default:** `false`                                                                                                                                                                                                                                                  |
| `dismissible`        | `input<boolean>`                                          | When `false`, the open menu ignores Escape and outside interaction. It stays pinned open until `value` is flipped (consumer write, trigger / item interaction, or cross-menu nav).<br>**Default:** `true`                                                                                                                   |
| `ariaLabel`          | `input<string \| null>`                                   | Accessible name for the menubar (`<div forMenubar aria-label="Main">` works too).<br>**Default:** `null`                                                                                                                                                                                                                    |
| `escapeKeyDown`      | `output<VetoableNativeEvent<KeyboardEvent>>`              | Output. Escape pressed while the open menu is the topmost dismissible layer.<br>**Default:** —                                                                                                                                                                                                                              |
| `pointerDownOutside` | `output<VetoableNativeEvent<PointerEvent>>`               | Output. Pointer-down on a target outside the open menu and every trigger.<br>**Default:** —                                                                                                                                                                                                                                 |
| `focusOutside`       | `output<VetoableNativeEvent<FocusEvent>>`                 | Output. Focus moves outside the open menu and every trigger.<br>**Default:** —                                                                                                                                                                                                                                              |
| `interactOutside`    | `output<VetoableNativeEvent<PointerEvent \| FocusEvent>>` | Output. A composite that fires alongside the two above and shares their veto state.<br>**Default:** —                                                                                                                                                                                                                       |
| `autoFocusOnOpen`    | `output<VetoableEvent>`                                   | Output. Just before focus moves to the first / last enabled item on mount. Not fired on a hover-switch, which parks focus on the hovered trigger instead.<br>**Default:** —                                                                                                                                                 |
| `autoFocusOnClose`   | `output<VetoableEvent>`                                   | Output. Just before focus returns to the trigger on unmount. Not fired for Tab / outside-interaction closes, which already moved focus, nor when a sibling's menu replaces the open one. A switch (hover, cross-menu arrows, a click on another trigger) is not a close, so no return-focus move happens.<br>**Default:** — |

Every output above is vetoable: each handler receives a `VetoableEvent` (or `VetoableNativeEvent<E>` when there is a native DOM event). Call `preventDefault()` on the emitted veto to suppress the menubar's default action; the original DOM event, when present, is on `.event`. The outputs are declared on `[forMenubar]` rather than per trigger: the bar provides a single multiplexed menu context, so one set of handlers covers whichever trigger's menu is open.

### `ForMenubarTrigger`

| Property                                                                                                     | Type                     | Description                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                                                                                                      | `input.required<string>` | Identifier for the trigger. The menubar's `value` model holds this when the menu is open.<br>**Default:** —                                                                                                                                                                                        |
| `disabled`                                                                                                   | `input<boolean>`         | Per-trigger disabled, in addition to the menubar's `disabled`.<br>**Default:** `false`                                                                                                                                                                                                             |
| `textValue`                                                                                                  | `input<string>`          | Overrides the string the trigger-row typeahead matches on. Empty falls back to the trigger's accessible text.<br>**Default:** `''`                                                                                                                                                                 |
| `side` / `align` / `alignOffset` / `avoidCollisions` / `sticky` / `hideWhenDetached` / `clipUntilPositioned` | `input<...>`             | Forwarded to the multiplexed `[forMenuContent]` when this trigger's menu is the one open. Same surface and same defaults as `[forDropdownMenu]`; `side` / `align` default from `provideForMenubarDefaults`.<br>**Default:** `'bottom'` / `'start'` / `0` / `true` / `'partial'` / `false` / `true` |
| `sideOffset` / `collisionPadding` / `fallbackAxisSideDirection`                                              | `input<...>`             | Gap (px) along the main axis / viewport collision padding (px) / side `flip` drops the menu to when both sides of the preferred axis overflow. Defaults from `provideForMenubarDefaults`.<br>**Default:** `4` / `8` / `'none'`                                                                     |
| `ariaLabel`                                                                                                  | `input<string \| null>`  | Manual `aria-label` on `[forMenuContent]` if the trigger isn't a meaningful name.<br>**Default:** `null`                                                                                                                                                                                           |

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

| Key                        | Behavior                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Click`                    | Toggle this trigger's menu. On open, focus moves to the first enabled item.                                                                                                                                                                                                                                                                                                                                  |
| `Enter` / `Space`          | Open this trigger's menu and focus the first enabled item; already open, focus moves to it.                                                                                                                                                                                                                                                                                                                  |
| `ArrowDown`                | Horizontal bar: open and focus the first enabled item; already open, focus moves to it. Vertical bar: move focus to the next enabled trigger; while a menu is open, the menu switches to it.                                                                                                                                                                                                                 |
| `ArrowUp`                  | Horizontal bar: open and focus the last enabled item; already open, focus moves to it. Vertical bar: move focus to the previous enabled trigger; while a menu is open, the menu switches to it.                                                                                                                                                                                                              |
| `ArrowLeft` / `ArrowRight` | Horizontal bar: move focus to the previous / next enabled trigger, RTL inverts; while a menu is open, the menu switches to the focused trigger, with focus left on it. Vertical bar: `ArrowRight` (`ArrowLeft` in RTL) opens and focuses the first enabled item; already open, focus moves to it.                                                                                                            |
| `Home` / `End`             | Focus the first / last enabled trigger. While a menu is open, the menu switches to it.                                                                                                                                                                                                                                                                                                                       |
| `Typeahead`                | Printable keys focus the first sibling trigger whose label starts with the buffered string. The label is the trigger's **accessible text**, so an `aria-hidden` icon inside it never bleeds into the match. Pass `textValue="…"` on `[forMenubarTrigger]` when announced content, such as a badge or a count, would otherwise bleed into it. While a menu is open, the menu switches to the matched trigger. |

### In-menu

Inside an open menu, the standard `[forMenuContent]` keyboard applies (see [`menu/README.md`](../menu/README.md)). The menubar adds:

| Key                                              | Behavior                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ArrowLeft` / `ArrowRight` (on a top-level item) | Close the current menu and open the previous / next sibling menu, focusing its first item. RTL inverts.                                                 |
| `ArrowRight` (on a plain item inside a submenu)  | Collapse the whole submenu chain and open the next sibling menu, focusing its first item. `ArrowLeft` collapses one submenu level instead. RTL inverts. |
| `Escape`                                         | Close the menu and return focus to its trigger.                                                                                                         |
| `Tab` / `Shift+Tab`                              | Close the menu and return focus to its trigger; the natural tab sequence then exits the menubar.                                                        |

Submenus opened from a top-level menu work as in `[forDropdownMenu]`: Escape collapses one level at a time, the open-key opens, and the close-key collapses upward. When the submenu's parent is the top of a menubar, the close-key on the submenu trigger collapses the parent and switches to the previous sibling menu; the away-key on a plain item inside any submenu level collapses the whole chain and switches to the next sibling menu.

## Accessibility

`[forMenubar]` implements the [WAI-ARIA Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/). Each trigger carries `role="menuitem"` with `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`. Roving tabindex keeps one trigger in the tab sequence at a time. A disabled trigger carries `aria-disabled="true"` and no native `disabled`, so a screen reader still announces it, but the keyboard skips it: it never holds the Tab stop, and the arrows, Home / End, typeahead and cross-menu navigation pass over it. The menu surface and item roles come from the shared [`menu/`](../menu/README.md) primitives.

## Styling

forty-cdk ships no styles: put your own class on each piece and key your CSS off the `data-*` attributes listed under [Data attributes](#data-attributes), not off the `for*` selectors ([Styling forty-cdk](../../../docs/styling.md) explains why).

> Each trigger's menu surface is the shared `[forMenuContent]` (from [`menu/`](../menu/README.md)), which **portals to `document.body`**. Style it with global CSS or a class, because scoped/`:host` styles won't reach it. The portaled content also exposes the shared positioner custom properties (`--for-floating-anchor-width` / `-height`, `--for-floating-available-width` / `-height`, `--for-floating-content-transform-origin`); see [Styling floating content](../../../docs/styling-floating-content.md) for the full list and how to use them.

```css
.menubar-menu-trigger[data-state='open'] {
  background: var(--accent);
}

.menubar-menu-trigger[data-disabled] {
  opacity: 0.5;
}
```

## Behavior notes

- **One open at a time.** Opening trigger `B` while `A` is open implicitly closes `A` and opens `B` with its first item focused. The exception is a hover-switch, which leaves focus on `B`'s trigger (see below).
- **First open is intentional, subsequent are hover.** While no menu is open, hovering a trigger does _not_ auto-open, and keyboard focus alone never opens a menu. After the user opens any menu via click / keyboard, hovering a sibling trigger opens it instantly (no delay). Hover is mouse-only: touch and pen never hover, so a tap on a sibling trigger switches menus through its click instead of opening on `pointerenter` and then closing on the click that follows.
- **Hover-switch parks focus on the hovered trigger.** Switching menus by hover is a full close/open cycle: the outgoing menu unmounts, so the focus it held has to be relocated or it would fall to `<body>`. It is relocated to the **hovered trigger**, not into the menu that just opened. This matches the APG reference implementation's [`menubar-navigation.js`](https://www.w3.org/WAI/content-assets/wai-aria-practices/patterns/menubar/examples/js/menubar-navigation.js), whose `onMenuitemPointerover` focuses the hovered bar item and only then swaps the popups. So a mouse user sweeping across the bar to read the menus never has focus dragged through each popup in turn, and `(autoFocusOnOpen)` does not fire for the incoming surface: there is no focus move to veto. Keyboard handoff is seamless from there: `ArrowDown` / `ArrowUp` / `Enter` on the hovered trigger move focus to the first / last item of the menu that is already open, and moving along the bar (`ArrowLeft` / `ArrowRight`, `Home` / `End`, typeahead) switches the open menu to whichever trigger takes focus, so the expanded trigger is always the focused one. Every other open path (click, `Enter` / `Space`, `ArrowDown` / `ArrowUp`, cross-menu `ArrowLeft` / `ArrowRight`) still focuses an item inside the menu. This is a different mechanism from `[forMenuSub]`, whose hover-open simply _suppresses_ the focus move: a submenu opens _alongside_ the menu that holds focus, whereas a menubar hover-switch destroys the focus holder and so must put focus somewhere.
- **Hover-leave does _not_ dismiss.** Moving the pointer off the bar (or off the open menu) leaves the menu open. The [APG Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) prescribes no hover-leave close, and a menubar menu always holds focus while open. Dismissing it because the mouse wandered would rip focus out from under a keyboard user and strand it on `<body>`. Dismiss with Escape, an outside pointer interaction, Tab, or by activating an item.
- **Dismissal.** Escape and an outside pointer interaction close the open menu when `dismissible` is `true` (default). `[dismissible]="false"` suppresses both.
- **Roving tabindex.** Only one trigger is in the tab sequence at a time: the open trigger, the most-recently-focused trigger, or the first enabled one when nothing's focused.
- **Mount equals open.** Each menu's `[forMenuContent]` is wrapped in `@if (open() === '<value>')`, so `animate.enter` / `animate.leave` fire on mount / unmount. The directive never toggles `[hidden]`. See [Mounting the menus](#mounting-the-menus).
- **Disabled triggers are skipped by the keyboard.** They reflect `data-disabled=""` and `aria-disabled="true"`, never the native `disabled`, are forced to `tabindex="-1"`, and are skipped by the arrows that move along the bar, Home / End, typeahead, and cross-menu nav. A click on one does nothing.

## Wrapping in a design system

Subclass the root and re-provide `FOR_MENUBAR_CONTEXT` with `useExisting` pointing at the subclass, since Angular does not inherit a directive's `providers`; [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md) walks the pattern.
