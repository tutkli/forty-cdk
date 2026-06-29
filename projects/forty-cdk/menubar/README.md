# Menubar

Headless implementation of the [WAI-ARIA Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/): a horizontal (or vertical) bar of triggers, each opening a dropdown menu, with cross-menu ArrowLeft / ArrowRight navigation, hover-after-first-open, and roving tabindex among triggers.

## Anatomy

| Class               | Selector              | Role                                                                                                                                                                |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForMenubar`        | `[forMenubar]`        | Root. Owns `value` (the open trigger), orientation, dir, loop, disabled. Provides the `ForMenubarContext` and a multiplexed `ForMenuContext` to `[forMenuContent]`. |
| `ForMenubarTrigger` | `[forMenubarTrigger]` | A trigger button. `role="menuitem"` with `aria-haspopup="menu"` / `aria-expanded` / `aria-controls`. Participates in roving tabindex and trigger-row keyboard.      |

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
  readonly open = signal<string>('');
  newDoc() {}
  openDoc() {}
  quit() {}
  undo() {}
  redo() {}
}
```

`@if (open() === '<value>')` controls each menu's mount, so Angular's `animate.enter` / `animate.leave` fire on the natural mount cycle. `[(value)]` is two-way bindable; the menubar flips it on trigger interaction, item activation, Escape, outside dismissal, and cross-menu navigation.

## API

### `ForMenubar`

| Property      | Type                    | Description                                                                                                                                                                                                                |
| ------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | `model<string>`         | Two-way bindable. The open trigger's `value`, or `''` when none.<br>**Default:** `''`                                                                                                                                      |
| `orientation` | `input<string>`         | `'horizontal' \| 'vertical'`. Drives the trigger-row arrow keys (Left/Right horizontal, Up/Down vertical).<br>**Default:** `'horizontal'`                                                                                  |
| `dir`         | `input<string>`         | Writing direction. RTL inverts ArrowLeft / ArrowRight on the trigger row and inside the open menu.<br>**Default:** `'ltr'`                                                                                                 |
| `loop`        | `input<boolean>`        | When `true`, trigger-row navigation and cross-menu nav wrap at the ends.<br>**Default:** `true`                                                                                                                            |
| `disabled`    | `input<boolean>`        | When `true`, every trigger interaction is a no-op.<br>**Default:** `false`                                                                                                                                                 |
| `dismissible` | `input<boolean>`        | When `false`, the open menu ignores Escape, outside interaction, and pointer-leave — it stays pinned open until `value` is flipped (consumer write, trigger / item interaction, or cross-menu nav).<br>**Default:** `true` |
| `closeDelay`  | `input<number>`         | ms before the open menu closes after the pointer leaves the bar (and any open menu). Defaults from `provideForMenubarDefaults`.<br>**Default:** `150`                                                                      |
| `ariaLabel`   | `input<string \| null>` | Accessible name for the menubar (`<div forMenubar aria-label="Main">` works too).<br>**Default:** `null`                                                                                                                   |

### `ForMenubarTrigger`

| Property                                                                                                                                  | Type                     | Description                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                                                                                                                                   | `input.required<string>` | Identifier for the trigger. The menubar's `value` model holds this when the menu is open.<br>**Default:** —                                                           |
| `disabled`                                                                                                                                | `input<boolean>`         | Per-trigger disabled, in addition to the menubar's `disabled`.<br>**Default:** `false`                                                                                |
| `side` / `align` / `sideOffset` / `alignOffset` / `avoidCollisions` / `collisionPadding` / `arrowPadding` / `sticky` / `hideWhenDetached` | `input<...>`             | Forwarded to the multiplexed `[forMenuContent]` when this trigger's menu is the one open. Same surface as `[forDropdownMenu]`.<br>**Default:** (floating-ui defaults) |
| `ariaLabel`                                                                                                                               | `input<string \| null>`  | Manual `aria-label` on `[forMenuContent]` if the trigger isn't a meaningful name.<br>**Default:** `null`                                                              |

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

| Key                         | Behavior                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `Click` / `Enter` / `Space` | Toggle this trigger's menu. On open, focus moves to the first enabled item.                 |
| `ArrowDown`                 | Open and focus the first enabled item.                                                      |
| `ArrowUp`                   | Open and focus the last enabled item.                                                       |
| `ArrowLeft` / `ArrowRight`  | Move focus to the previous / next enabled trigger. RTL inverts.                             |
| `Home` / `End`              | Focus the first / last enabled trigger.                                                     |
| `Typeahead`                 | Printable keys focus the first sibling trigger whose label starts with the buffered string. |

### In-menu

Inside an open menu, the standard `[forMenuContent]` keyboard applies — see [`menu/README.md`](../menu/README.md). The menubar adds:

| Key                                                               | Behavior                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ArrowLeft` / `ArrowRight` (on a top-level item, no submenu open) | Close the current menu and open the previous / next sibling menu, focusing its first item. RTL inverts. |
| `Escape`                                                          | Close the menu and return focus to its trigger.                                                         |
| `Tab` / `Shift+Tab`                                               | Close the menu and return focus to its trigger; the natural tab sequence then exits the menubar.        |

Submenus opened from a top-level menu work as in `[forDropdownMenu]` — Escape collapses one level at a time, the open-key opens, the close-key collapses upward. When the submenu's parent is the top of a menubar, the close-key collapses the parent and switches to the previous sibling menu.

## Accessibility

`[forMenubar]` implements the [WAI-ARIA Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/). Each trigger carries `role="menuitem"` with `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`. Roving tabindex keeps one trigger in the tab sequence at a time. Disabled triggers remain focusable with `aria-disabled="true"` per APG. The menu surface and item roles come from the shared [`menu/`](../menu/README.md) primitives.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

> Each trigger's menu surface is the shared `[forMenuContent]` (from [`menu/`](../menu/README.md)), which **portals to `document.body`**. Style it with global CSS or a class — scoped/`:host` styles won't reach it. The portaled content also exposes the shared positioner custom properties (`--for-anchor-width` / `-height`, `--for-available-width` / `-height`, `--for-content-transform-origin`); see [Styling floating content](../../../../../docs/styling-floating-content.md) for the full list and how to use them.

```css
.menubar-trigger[data-state='open'] {
  background: var(--accent);
}

.menubar-trigger[data-disabled] {
  opacity: 0.5;
}
```

## Behavior notes

- **One open at a time.** Opening trigger `B` while `A` is open implicitly closes `A` and opens `B` with its first item focused.
- **First open is intentional, subsequent are hover.** While no menu is open, hovering a trigger does _not_ auto-open, and keyboard focus alone never opens a menu. After the user opens any menu via click / keyboard, hovering a sibling trigger opens it instantly (no delay).
- **Hover-leave dismisses.** Once a menu is open, moving the pointer off the bar (and away from the open menu) closes it after `closeDelay` (default `150`ms). Re-entering the bar, a trigger, or the open menu before the delay elapses cancels the pending close, so travelling from a trigger down into its menu keeps it open. Touch / pen pointers don't trigger this — they dismiss by tapping outside. Set `[dismissible]="false"` to pin the menu open regardless.
- **Dismissal.** Escape, an outside pointer interaction, and pointer-leave all close the open menu when `dismissible` is `true` (default). `[dismissible]="false"` suppresses all three.
- **Roving tabindex.** Only one trigger is in the tab sequence at a time — the open trigger, the most-recently-focused trigger, or the first enabled one when nothing's focused.
- **Mount equals open.** Each menu's `[forMenuContent]` is wrapped in `@if (value() === '<id>')`, so `animate.enter` / `animate.leave` fire on mount / unmount. The directive does not toggle `[hidden]`.
- **Disabled triggers stay focusable** (per APG) — they still reflect `data-disabled=""` and `aria-disabled="true"` and are skipped by ArrowLeft / ArrowRight, typeahead, and cross-menu nav.
