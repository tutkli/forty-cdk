# ContextMenu

> New to overlays in forty-cdk? [Your first overlay](../../../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

Headless right-click menu — variant of the [WAI-ARIA Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) opened via the `contextmenu` event (right-click, long-press on touch) and via the keyboard activators `Shift+F10` and the dedicated `ContextMenu` key. The native browser context menu is suppressed.

Pointer activations anchor the menu at the cursor; keyboard activations anchor it at the bounding rect of the focused element so screen-reader / keyboard-only users get the menu next to whatever they're working on. Floating-ui's virtual element handles either case — placement, flip, and shift middleware still apply, so the menu is repositioned to stay on-screen automatically.

## Anatomy

| Class                   | Selector                  | Role                                                                                                                                                                                             |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ForContextMenu`        | `[forContextMenu]`        | Root. Owns open state, the virtual anchor (pointer position), navigation, typeahead.                                                                                                             |
| `ForContextMenuTrigger` | `[forContextMenuTrigger]` | The right-click region. Captures `contextmenu`, `Shift+F10`, and the `ContextMenu` key, prevents the native menu, and opens — anchored at the pointer (mouse) or the focused element (keyboard). |

The menu items themselves come from the [`menu/`](../menu/README.md) folder.

## Examples

```ts
import { Component, signal } from '@angular/core';
import { ForContextMenu, ForContextMenuTrigger } from 'forty-cdk/context-menu';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';

@Component({
  selector: 'demo-context',
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forContextMenu #menu="forContextMenu">
      <div forContextMenuTrigger class="canvas context-menu-trigger">
        Right-click anywhere here.
      </div>
      @if (menu.open()) {
        <div forMenuContent animate.leave="fade-out">
          <button forMenuItem (activate)="rename()">Rename</button>
          <button forMenuItem (activate)="duplicate()">Duplicate</button>
          <button forMenuItem (activate)="delete()">Delete</button>
        </div>
      }
    </div>
  `,
})
export class DemoContext {
  rename() {
    /* ... */
  }
  duplicate() {
    /* ... */
  }
  delete() {
    /* ... */
  }
}
```

The trigger is focusable out of the box: `[forContextMenuTrigger]` host-binds a default `tabindex="-1"` so focus returns there programmatically when the menu closes — no consumer setup required. Override it with your own `tabindex` (e.g. `tabindex="0"` to put the region in the Tab order) and it wins.

### `#menu="forContextMenu"` vs. `[(open)]`

The minimal "right-click → show menu" case needs **neither** a separate `open` signal **nor** a two-way binding. `[forContextMenu]` is `exportAs: 'forContextMenu'`, so expose the directive instance with a template reference variable — `#menu="forContextMenu"` — and drive the `@if` straight off its own `open()` signal, as above. The contextmenu gesture, item activation, Escape, and outside dismissal all flip it.

Reach for the explicit `[(open)]="mySignal"` model binding only when the component class needs to read or drive open state — open it programmatically, persist it, or react to it elsewhere:

```html
<div forContextMenu [(open)]="open">
  <div forContextMenuTrigger class="context-menu-trigger">Right-click anywhere here.</div>
  @if (open()) {
  <div forMenuContent>…</div>
  }
</div>
```

### Triggers stamped from outside-declared templates

Angular resolves `ng-template` DI at the template's **declaration** site, not where it is stamped. A `[forContextMenuTrigger]` declared in a template outside the root throws the orphan error even when the template is rendered inside the root via `ngTemplateOutlet`. For that case the selector attribute accepts the root reference as a value, `routerLink`-style — grab it with `#root="forContextMenu"` and pass it through the outlet context. The bare valueless attribute keeps resolving via DI.

```html
<div forContextMenu #root="forContextMenu">
  <ng-container *ngTemplateOutlet="chip; context: { root }" />
  @if (root.open()) {
  <div forMenuContent>…</div>
  }
</div>

<ng-template #chip let-root="root">
  <span [forContextMenuTrigger]="root">Right-click here</span>
</ng-template>
```

## API

### `ForContextMenu`

| Property             | Type                                                      | Description                                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `open`               | `model<boolean>`                                          | Two-way bindable. Whether the menu is shown.<br>**Default:** `false`                                                                                                                                   |
| `side`               | `input<string>`                                           | Anchor side relative to the pointer.<br>**Default:** `'bottom'`                                                                                                                                        |
| `align`              | `input<string>`                                           | Alignment along `side` (`'start'` / `'center'` / `'end'`).<br>**Default:** `'start'`                                                                                                                   |
| `sideOffset`         | `input<number>`                                           | Gap (px) between the pointer and the menu along the main axis.<br>**Default:** `0`                                                                                                                     |
| `alignOffset`        | `input<number>`                                           | Gap (px) along the cross axis (parallel to `side`).<br>**Default:** `0`                                                                                                                                |
| `loop`               | `input<boolean>`                                          | Whether arrow navigation wraps.<br>**Default:** `true`                                                                                                                                                 |
| `dir`                | `input<string>`                                           | Writing direction. In RTL, ArrowLeft opens submenus and ArrowRight closes them — the swap is automatic. Inherited by every nested `[forMenuSub]` underneath unless overridden.<br>**Default:** `'ltr'` |
| `disabled`           | `input<boolean>`                                          | When `true`, the contextmenu event falls through to the native browser menu.<br>**Default:** `false`                                                                                                   |
| `dismissible`        | `input<boolean>`                                          | When `false`, Escape and outside interactions don't close.<br>**Default:** `true`                                                                                                                      |
| `returnFocus`        | `input<boolean>`                                          | When `true`, focus returns to the trigger element on close.<br>**Default:** `true`                                                                                                                     |
| `ariaLabel`          | `input<string \| null>`                                   | Manual `aria-label` on `[forMenuContent]`.<br>**Default:** `null`                                                                                                                                      |
| `escapeKeyDown`      | `output<VetoableNativeEvent<KeyboardEvent>>`              | Output. Escape pressed while the menu is the topmost dismissable layer.<br>**Default:** —                                                                                                              |
| `pointerDownOutside` | `output<VetoableNativeEvent<PointerEvent>>`               | Output. Pointer-down on a target outside content + trigger.<br>**Default:** —                                                                                                                          |
| `focusOutside`       | `output<VetoableNativeEvent<FocusEvent>>`                 | Output. Focus moves outside content + trigger.<br>**Default:** —                                                                                                                                       |
| `interactOutside`    | `output<VetoableNativeEvent<PointerEvent \| FocusEvent>>` | Output. Composite — fires alongside the two above (and shares their veto state).<br>**Default:** —                                                                                                     |
| `autoFocusOnOpen`    | `output<VetoableEvent>`                                   | Output. Just before the imperative focus move on mount.<br>**Default:** —                                                                                                                              |
| `autoFocusOnClose`   | `output<VetoableEvent>`                                   | Output. Just before the imperative focus move on unmount.<br>**Default:** —                                                                                                                            |

Same vetoable dismiss API as DropdownMenu. Call `preventDefault()` on the emitted veto to suppress the directive's default action; the original DOM event, when present, is on `.event`.

`(autoFocusOnOpen)` / `(autoFocusOnClose)` are output-shape because ContextMenu always routes close transitions through `[(open)]` (via the implicit `openChange` emitter). See [CLAUDE.md › Auto-focus hook shape](../../../../../CLAUDE.md#auto-focus-hook-shape) for why Dialog uses callback-shape inputs instead.

### Data attributes

| Piece                     | Attribute       | Values             |
| ------------------------- | --------------- | ------------------ |
| `[forContextMenu]`        | `data-state`    | `open` \| `closed` |
| `[forContextMenu]`        | `data-disabled` | present \| absent  |
| `[forContextMenuTrigger]` | `data-state`    | `open` \| `closed` |
| `[forContextMenuTrigger]` | `data-disabled` | present \| absent  |

## Accessibility

`[forContextMenu]` implements the [WAI-ARIA Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/). The trigger captures `contextmenu`, `Shift+F10`, and the `ContextMenu` key; the menu surface and item roles come from the shared [`menu/`](../menu/README.md) primitives. Pointer activations anchor at the cursor; keyboard activations anchor at the bounding rect of the focused element so keyboard-only users get the menu next to whatever they're working on.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed under [Data attributes](#data-attributes).

> The menu content (`[forMenuContent]`, from the [`menu/`](../menu/README.md) folder) portals to `document.body`, so it sits outside the trigger's DOM subtree — descendant selectors won't reach it. Style it with **global CSS** or a class on the content element. The content host also exposes the shared positioner custom properties (`--for-anchor-width` / `--for-anchor-height`, `--for-available-width` / `--for-available-height`, `--for-content-transform-origin`); see [Styling floating content](../../../../../docs/styling-floating-content.md) for the full list and the animation rules.

```css
.context-menu-trigger[data-state='open'] {
  outline: 2px solid hotpink;
}
```

## Behavior notes

- **Trigger is NOT exempt** from outside-pointer / outside-focus checks. Unlike DropdownMenu (where the trigger button toggles via its own click handler), the context-menu region is treated like any other "outside" element — a left-click on the region while the menu is open closes it. Right-clicking again immediately reopens at the new position. This is a full close → open cycle, not an in-place reposition: re-right-clicking while the menu is already open tears the surface down and rebuilds it (so any `animate.enter` / `animate.leave` replays and focus resets). Keep enter/leave animations cheap, or gate expensive ones, since a user can fire this rapidly — the directive deliberately exempts nothing, so there is no smooth reposition path to attach to.
- **Virtual anchor.** Right-click captures a 0×0 rect at the pointer location. `Shift+F10` and `ContextMenu` snapshot the bounding rect of the focused element (or the trigger if focus is on it directly), so the menu floats off the element under attention. Both forms feed floating-ui's `flip` and `shift` middleware, so corners and screen edges work without special-casing.
- **Keyboard activators only fire while focus is inside the trigger.** Keyboard events dispatch to the focused element, so `Shift+F10` / `ContextMenu` anywhere outside the trigger goes to the browser default. The trigger is focusable by default (host-bound `tabindex="-1"`), so this works out of the box; use `tabindex="0"` if you want the region itself reachable via Tab.
- **Native menu suppressed.** The trigger calls `event.preventDefault()` on `contextmenu` and on the keyboard activators. Set `disabled` to let the browser's native menu surface for that region.
- **Mount equals open.** Same convention as the rest of the library — wrap `[forMenuContent]` in `@if (open())` and use `animate.enter` / `animate.leave` for transitions.
