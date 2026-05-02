# ContextMenu

Headless right-click menu — variant of the [WAI-ARIA Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) opened via the `contextmenu` event (right-click, `Shift+F10`, long-press on touch). The native browser context menu is suppressed.

The menu is anchored to the pointer position via floating-ui's virtual element — placement, flip, and shift middleware still apply, so the menu is repositioned to stay on-screen automatically.

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  ForContextMenu,
  ForContextMenuTrigger,
  ForMenuContent,
  ForMenuItem,
} from 'forty-cdk';

@Component({
  selector: 'demo-context',
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forContextMenu [(open)]="open">
      <div forContextMenuTrigger tabindex="-1" class="canvas">
        Right-click anywhere here.
      </div>
      @if (open()) {
        <div forMenuContent animate.leave="fade-out">
          <button forMenuItem (select)="rename()">Rename</button>
          <button forMenuItem (select)="duplicate()">Duplicate</button>
          <button forMenuItem (select)="delete()">Delete</button>
        </div>
      }
    </div>
  `,
})
export class DemoContext {
  readonly open = signal(false);
  rename() { /* ... */ }
  duplicate() { /* ... */ }
  delete() { /* ... */ }
}
```

Add `tabindex="-1"` on the trigger element so focus can return there programmatically when the menu closes — without it, focus falls to the document body on close.

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForContextMenu` | `[forContextMenu]` | Root. Owns open state, the virtual anchor (pointer position), navigation, typeahead. |
| `ForContextMenuTrigger` | `[forContextMenuTrigger]` | The right-click region. Captures `contextmenu`, prevents the native menu, opens at the pointer. |

The menu items themselves come from the [`menu/`](../menu/README.md) folder.

## Inputs (`ForContextMenu`)

| API | Default | Description |
| --- | --- | --- |
| `open` | `false` | Two-way bindable. Whether the menu is shown. |
| `placement` | `'bottom-start'` | Floating-ui placement relative to the pointer. |
| `offset` | `0` | Gap (px) between the pointer and the menu. |
| `loop` | `true` | Whether arrow navigation wraps. |
| `disabled` | `false` | When `true`, the contextmenu event falls through to the native browser menu. |
| `dismissible` | `true` | When `false`, Escape and outside interactions don't close. |
| `returnFocus` | `true` | When `true`, focus returns to the trigger element on close. |
| `ariaLabel` | `null` | Manual `aria-label` on `[forMenuContent]`. |

## Outputs (`ForContextMenu`)

Same vetoable dismiss API as DropdownMenu — `(escapeKeyDown)`, `(pointerDownOutside)`, `(focusOutside)`, `(interactOutside)`. Call `preventDefault()` to keep the menu open.

## Behavior notes

- **Trigger is NOT exempt** from outside-pointer / outside-focus checks. Unlike DropdownMenu (where the trigger button toggles via its own click handler), the context-menu region is treated like any other "outside" element — a left-click on the region while the menu is open closes it. Right-clicking again immediately reopens at the new position.
- **Virtual anchor.** The menu is positioned against a 0×0 rect at the pointer location captured during `contextmenu`. Floating-ui's `flip` and `shift` middleware reposition the menu to stay inside the viewport, so corners and screen edges work without special-casing.
- **Native menu suppressed.** The trigger calls `event.preventDefault()` on `contextmenu`. Set `disabled` to let the browser's native menu surface for that region.
- **Mount equals open.** Same convention as the rest of the library — wrap `[forMenuContent]` in `@if (open())` and use `animate.enter` / `animate.leave` for transitions.
