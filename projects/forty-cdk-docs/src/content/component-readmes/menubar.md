---
title: Menubar
slug: menubar
source: projects/forty-cdk/src/lib/menubar/README.md
---

# Menubar

Headless implementation of the [WAI-ARIA Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/): a horizontal (or vertical) bar of triggers, each opening a dropdown menu, with cross-menu ArrowLeft / ArrowRight navigation, hover-after-first-open, and roving tabindex among triggers.

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  ForMenubar,
  ForMenubarTrigger,
  ForMenuContent,
  ForMenuItem,
  ForMenuSeparator,
} from 'forty-cdk';

@Component({
  selector: 'demo-menubar',
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem, ForMenuSeparator],
  template: `
    <div forMenubar [(value)]="open" aria-label="Main">
      <button forMenubarTrigger value="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent animate.leave="fade-out">
          <button forMenuItem (select)="newDoc()">New</button>
          <button forMenuItem (select)="openDoc()">Open…</button>
          <hr forMenuSeparator />
          <button forMenuItem (select)="quit()">Quit</button>
        </div>
      }

      <button forMenubarTrigger value="edit">Edit</button>
      @if (open() === 'edit') {
        <div forMenuContent>
          <button forMenuItem (select)="undo()">Undo</button>
          <button forMenuItem (select)="redo()">Redo</button>
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

`@if (open() === '&lt;value&gt;')` controls each menu's mount, so Angular's `animate.enter` / `animate.leave` fire on the natural mount cycle. `[(value)]` is two-way bindable; the menubar flips it on trigger interaction, item activation, Escape, outside dismissal, and cross-menu navigation.

## Pieces

| Class               | Selector              | Role                                                                                                                                                                |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForMenubar`        | `[forMenubar]`        | Root. Owns `value` (the open trigger), orientation, dir, loop, disabled. Provides the `ForMenubarContext` and a multiplexed `ForMenuContext` to `[forMenuContent]`. |
| `ForMenubarTrigger` | `[forMenubarTrigger]` | A trigger button. `role="menuitem"` with `aria-haspopup="menu"` / `aria-expanded` / `aria-controls`. Participates in roving tabindex and trigger-row keyboard.      |

The menu surface, items, separators, groups, and submenus come from the [`menu/`](../menu/README.md) folder — same primitives as `[forDropdownMenu]` and `[forContextMenu]`. The bar simply pumps a different `ForMenuContext` whose anchor / side / ids reflect the active trigger.

## Inputs (`ForMenubar`)

| API           | Default        | Description                                                                                                |
| ------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `value`       | `''`           | Two-way bindable. The open trigger's `value`, or `''` when none.                                           |
| `orientation` | `'horizontal'` | `'horizontal' \| 'vertical'`. Drives the trigger-row arrow keys (Left/Right horizontal, Up/Down vertical). |
| `dir`         | `'ltr'`        | Writing direction. RTL inverts ArrowLeft / ArrowRight on the trigger row and inside the open menu.         |
| `loop`        | `true`         | When `true`, trigger-row navigation and cross-menu nav wrap at the ends.                                   |
| `disabled`    | `false`        | When `true`, every trigger interaction is a no-op.                                                         |
| `ariaLabel`   | `null`         | Accessible name for the menubar (`&lt;div forMenubar aria-label="Main"&gt;` works too).                          |

## Inputs (`ForMenubarTrigger`)

| API                                                                                                                                                                | Default                | Description                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `value`                                                                                                                                                            | required               | Identifier for the trigger. The menubar's `value` model holds this when the menu is open.                                      |
| `disabled`                                                                                                                                                         | `false`                | Per-trigger disabled, in addition to the menubar's `disabled`.                                                                 |
| `side` / `align` / `sideOffset` / `alignOffset` / `avoidCollisions` / `collisionPadding` / `arrowPadding` / `sticky` / `hideWhenDetached` | (floating-ui defaults) | Forwarded to the multiplexed `[forMenuContent]` when this trigger's menu is the one open. Same surface as `[forDropdownMenu]`. |
| `ariaLabel`                                                                                                                                                        | `null`                 | Manual `aria-label` on `[forMenuContent]` if the trigger isn't a meaningful name.                                              |

## Trigger keyboard

| Key                         | Behavior                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `Click` / `Enter` / `Space` | Toggle this trigger's menu. On open, focus moves to the first enabled item.                 |
| `ArrowDown`                 | Open and focus the first enabled item.                                                      |
| `ArrowUp`                   | Open and focus the last enabled item.                                                       |
| `ArrowLeft` / `ArrowRight`  | Move focus to the previous / next enabled trigger. RTL inverts.                             |
| `Home` / `End`              | Focus the first / last enabled trigger.                                                     |
| `Typeahead`                 | Printable keys focus the first sibling trigger whose label starts with the buffered string. |

## In-menu keyboard

Inside an open menu, the standard `[forMenuContent]` keyboard applies — see [`menu/README.md`](../menu/README.md). The menubar adds:

| Key                                                               | Behavior                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ArrowLeft` / `ArrowRight` (on a top-level item, no submenu open) | Close the current menu and open the previous / next sibling menu, focusing its first item. RTL inverts. |
| `Escape`                                                          | Close the menu and return focus to its trigger.                                                         |
| `Tab` / `Shift+Tab`                                               | Close the menu and return focus to its trigger; the natural tab sequence then exits the menubar.        |

Submenus opened from a top-level menu work as in `[forDropdownMenu]` — Escape collapses one level at a time, the open-key opens, the close-key collapses upward. When the submenu's parent is the top of a menubar, the close-key collapses the parent and switches to the previous sibling menu (matching Radix).

## Behavior notes

- **One open at a time.** Opening trigger `B` while `A` is open implicitly closes `A` and opens `B` with its first item focused.
- **First open is intentional, subsequent are hover.** While no menu is open, hovering or focusing a trigger does _not_ auto-open. After the user opens any menu via click / keyboard, hovering or focusing a sibling trigger opens it instantly (no delay).
- **Roving tabindex.** Only one trigger is in the tab sequence at a time — the open trigger, the most-recently-focused trigger, or the first enabled one when nothing's focused.
- **Mount equals open.** Each menu's `[forMenuContent]` is wrapped in `@if (value() === '&lt;id&gt;')`, so `animate.enter` / `animate.leave` fire on mount / unmount. The directive does not toggle `[hidden]`.
- **Disabled triggers stay focusable** (per APG) — they still reflect `data-disabled=""` and `aria-disabled="true"` and are skipped by ArrowLeft / ArrowRight, typeahead, and cross-menu nav.
