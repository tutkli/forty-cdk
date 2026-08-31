---
title: Context Menu
group: primitives
archetype: [overlay]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/menu/
---

# ContextMenu

A menu opened by right-click or long-press, anchored to the pointer position.

Opened via the `contextmenu` event (right-click, long-press on touch) and via the keyboard activators `Shift+F10` and the dedicated `ContextMenu` key. The native browser context menu is suppressed. Pointer activations anchor the menu at the cursor; keyboard activations anchor it at the bounding rect of the focused element so screen-reader / keyboard-only users get the menu next to whatever they're working on. Floating-ui's virtual element handles either case — placement, flip, and shift middleware still apply, so the menu is repositioned to stay on-screen automatically.

> New to overlays in forty-cdk? [Your first overlay](../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

## Anatomy

```html
<div forContextMenu #menu="forContextMenu">
  <div forContextMenuTrigger tabindex="0">Right-click anywhere here</div>
  <!-- @if (menu.open()) { -->
  <div forMenuContent>
    <button forMenuItem>Rename</button>
    <button forMenuItem>Duplicate</button>
    <button forMenuItem>Delete</button>
  </div>
  <!-- } -->
</div>
```

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

### Sharing one menu with a second opener

`[forContextMenu]` is a **single-opener preset**: one root, one right-click region. When the same actions must also be reachable another way — the canonical case being a table row with a right-click region _and_ a kebab button — bind the trigger to a `[forMenu]` root instead, which drives one `[forMenuContent]` block from any number of openers. See [Shared openers](../menu/README.md#shared-openers-formenu).

The same explicit-reference input carries it, and here the binding is **required** rather than optional: the trigger resolves `FOR_CONTEXT_MENU_CONTEXT`, which `[forMenu]` deliberately does not provide (`forty-cdk/menu` must not depend on `forty-cdk/context-menu`).

```html
<tr forMenu #row="forMenu" [(open)]="open" ariaLabel="Row actions">
  <td [forContextMenuTrigger]="row">…cells…</td>
  <td>
    <button [forDropdownMenuTrigger]="row" [menuPositioning]="{ sideOffset: 4 }">⋮</button>
  </td>
  <!-- one content block, no duplication -->
</tr>
```

Both triggers carry `[menuPositioning]`, a partial `{ side, align, sideOffset, alignOffset }` override applied only to the opens that trigger drives, with each omitted key falling back to the root's input. It exists because a shared root cannot pick offsets that suit heterogeneous openers: the region above keeps the root's `sideOffset` of `0` — flush at the cursor, which is what a pointer-anchored menu wants — while the sibling button opener asks for the 4px of clearance a menu button wants. Under a `[forContextMenu]` root it resolves the same way, where it is simply a per-trigger spelling of the root's inputs. See [Per-opener positioning](../menu/README.md#per-opener-positioning).

## API

### `ForContextMenu`

| Property                    | Type                                                      | Description                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`                      | `model<boolean>`                                          | Two-way bindable. Whether the menu is shown.<br>**Default:** `false`                                                                                                                                                                                                                                                                                |
| `side`                      | `input<string>`                                           | Anchor side relative to the pointer. The default is read from `provideForContextMenuDefaults` for the surrounding scope.<br>**Default:** `'bottom'`                                                                                                                                                                                                 |
| `align`                     | `input<string>`                                           | Alignment along `side` (`'start'` / `'center'` / `'end'`). The default is read from `provideForContextMenuDefaults` for the surrounding scope.<br>**Default:** `'start'`                                                                                                                                                                            |
| `sideOffset`                | `input<number>`                                           | Gap (px) between the pointer and the menu along the main axis.<br>**Default:** `0`                                                                                                                                                                                                                                                                  |
| `alignOffset`               | `input<number>`                                           | Gap (px) along the cross axis (parallel to `side`).<br>**Default:** `0`                                                                                                                                                                                                                                                                             |
| `fallbackAxisSideDirection` | `input<'none' \| 'start' \| 'end'>`                       | When both sides of the preferred axis overflow, lets `flip` drop the menu to a perpendicular side instead of clipping. `'none'` keeps only the opposite same-axis placement. The default is read from `provideForContextMenuDefaults` for the surrounding scope — set it once for the whole app rather than per call site.<br>**Default:** `'none'` |
| `loop`                      | `input<boolean>`                                          | Whether arrow navigation wraps.<br>**Default:** `true`                                                                                                                                                                                                                                                                                              |
| `dir`                       | `input<string>`                                           | Writing direction. In RTL, ArrowLeft opens submenus and ArrowRight closes them — the swap is automatic. Inherited by every nested `[forMenuSub]` underneath unless overridden.<br>**Default:** `'ltr'`                                                                                                                                              |
| `disabled`                  | `input<boolean>`                                          | When `true`, the contextmenu event falls through to the native browser menu.<br>**Default:** `false`                                                                                                                                                                                                                                                |
| `dismissible`               | `input<boolean>`                                          | When `false`, Escape and outside interactions don't close.<br>**Default:** `true`                                                                                                                                                                                                                                                                   |
| `returnFocus`               | `input<boolean>`                                          | When `true`, focus returns to the trigger element on close.<br>**Default:** `true`                                                                                                                                                                                                                                                                  |
| `ariaLabel`                 | `input<string \| null>`                                   | Accessible name reflected as `aria-label` on `[forMenuContent]`. The root's only name hook for a context menu — the right-click region is never used as an `aria-labelledby` target.<br>**Default:** `null`                                                                                                                                         |
| `escapeKeyDown`             | `output<VetoableNativeEvent<KeyboardEvent>>`              | Output. Escape pressed while the menu is the topmost dismissible layer.<br>**Default:** —                                                                                                                                                                                                                                                           |
| `pointerDownOutside`        | `output<VetoableNativeEvent<PointerEvent>>`               | Output. Pointer-down on a target outside content + trigger.<br>**Default:** —                                                                                                                                                                                                                                                                       |
| `focusOutside`              | `output<VetoableNativeEvent<FocusEvent>>`                 | Output. Focus moves outside content + trigger.<br>**Default:** —                                                                                                                                                                                                                                                                                    |
| `interactOutside`           | `output<VetoableNativeEvent<PointerEvent \| FocusEvent>>` | Output. Composite — fires alongside the two above (and shares their veto state).<br>**Default:** —                                                                                                                                                                                                                                                  |
| `autoFocusOnOpen`           | `output<VetoableEvent>`                                   | Output. Just before the imperative focus move on mount.<br>**Default:** —                                                                                                                                                                                                                                                                           |
| `autoFocusOnClose`          | `output<VetoableEvent>`                                   | Output. Just before the imperative focus move on unmount.<br>**Default:** —                                                                                                                                                                                                                                                                         |

Same vetoable dismiss API as DropdownMenu. Call `preventDefault()` on the emitted veto to suppress the directive's default action; the original DOM event, when present, is on `.event`.

`(autoFocusOnOpen)` / `(autoFocusOnClose)` are output-shape because ContextMenu always routes close transitions through `[(open)]` (via the implicit `openChange` emitter). Dialog and Drawer take callback-shape inputs for the same pair instead: either can be closed by a direct `open.set(false)` that bypasses the `(dismiss)` output entirely, so their close hook has to be a stored function reference that still runs during teardown.

### Data attributes

| Piece                     | Attribute       | Values             |
| ------------------------- | --------------- | ------------------ |
| `[forContextMenu]`        | `data-state`    | `open` \| `closed` |
| `[forContextMenu]`        | `data-disabled` | present \| absent  |
| `[forContextMenuTrigger]` | `data-state`    | `open` \| `closed` |
| `[forContextMenuTrigger]` | `data-disabled` | present \| absent  |

## Accessibility

`[forContextMenu]` implements the [WAI-ARIA Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/). The trigger captures `contextmenu`, `Shift+F10`, and the `ContextMenu` key; the menu surface and item roles come from the shared [`menu/`](../menu/README.md) primitives. Pointer activations anchor at the cursor; keyboard activations anchor at the bounding rect of the focused element so keyboard-only users get the menu next to whatever they're working on.

- **Name the menu with `[ariaLabel]`.** Unlike `[forDropdownMenu]` / `[forMenubar]` / `[forMenuSub]`, the content surface emits **no** `aria-labelledby` fallback here: the trigger is the whole right-click region, so pointing the menu's name at it would make screen readers announce the entire row / card text as the menu name. With no `[ariaLabel]` the `role="menu"` surface simply has no accessible name. A consumer-set static `aria-labelledby` on `[forMenuContent]` is still preserved, so pointing at your own visible heading also works. Submenus nested inside a context menu are unaffected — a `[forMenuSubContent]` is still labelled by its `[forMenuSubTrigger]`.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed under [Data attributes](#data-attributes).

> The menu content (`[forMenuContent]`, from the [`menu/`](../menu/README.md) folder) portals to `document.body`, so it sits outside the trigger's DOM subtree — descendant selectors won't reach it. Style it with **global CSS** or a class on the content element. The content host also exposes the shared positioner custom properties (`--for-floating-anchor-width` / `--for-floating-anchor-height`, `--for-floating-available-width` / `--for-floating-available-height`, `--for-floating-content-transform-origin`); see [Styling floating content](../../../docs/styling-floating-content.md) for the full list and the animation rules.

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
- **Touch long-press.** The trigger runs its own long-press timer (a `touch` `pointerdown` held ~500 ms, without lifting or moving past a small tolerance, opens the menu at the touch point). This is required because iOS Safari never fires the `contextmenu` event a long-press synthesizes elsewhere; where the browser does synthesize it (Android, desktop touch emulation) the two paths stay mutually exclusive, so the menu opens exactly once. For the press to survive on iOS, suppress the native callout / text-selection on the trigger with CSS — otherwise the OS gesture cancels the press:

```css
.context-menu-trigger {
  -webkit-touch-callout: none;
  user-select: none;
}
```

- **Mount equals open.** Same convention as the rest of the library — wrap `[forMenuContent]` in `@if (open())` and use `animate.enter` / `animate.leave` for transitions.

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_MENU_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
