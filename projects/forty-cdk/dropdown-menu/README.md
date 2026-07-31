# DropdownMenu

A button that opens a menu of actions, with full keyboard navigation, typeahead and submenus.

> New to overlays in forty-cdk? [Your first overlay](../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

## Anatomy

```html
<div forDropdownMenu #menu="forDropdownMenu" side="bottom" align="start">
  <button forDropdownMenuTrigger>Options</button>
  <!-- @if (menu.open()) { -->
  <div forMenuContent>
    <button forMenuItem (activate)="cut()">Cut</button>
    <button forMenuItem (activate)="copy()">Copy</button>
    <hr forMenuSeparator />
    <div forMenuRadioGroup [(value)]="alignment">
      <button forMenuRadioItem value="left">Left</button>
      <button forMenuRadioItem value="center">Center</button>
    </div>
  </div>
  <!-- } -->
</div>
```

The menu items, content surface, radio groups, separators, and groups come from the [`menu/`](../menu/README.md) folder — the same primitives are used by `[forContextMenu]`.

## Examples

```ts
import { Component, signal } from '@angular/core';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import {
  ForMenuContent,
  ForMenuItem,
  ForMenuRadioGroup,
  ForMenuRadioItem,
  ForMenuSeparator,
} from 'forty-cdk/menu';

@Component({
  selector: 'demo-options',
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSeparator,
    ForMenuRadioGroup,
    ForMenuRadioItem,
  ],
  template: `
    <div forDropdownMenu #menu="forDropdownMenu">
      <button forDropdownMenuTrigger class="dropdown-menu-trigger">Options</button>
      @if (menu.open()) {
        <div forMenuContent animate.leave="fade-out">
          <button forMenuItem (activate)="cut()">Cut</button>
          <button forMenuItem (activate)="copy()">Copy</button>
          <button forMenuItem disabled>Paste</button>
          <hr forMenuSeparator />
          <div forMenuRadioGroup [(value)]="alignment">
            <button forMenuRadioItem value="left">Left</button>
            <button forMenuRadioItem value="center">Center</button>
            <button forMenuRadioItem value="right">Right</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DemoOptions {
  readonly alignment = signal<string>('left');
  cut() {
    /* ... */
  }
  copy() {
    /* ... */
  }
}
```

`@if` is what makes Angular's `animate.enter` / `animate.leave` work — they fire on real mount / unmount.

### `#menu="forDropdownMenu"` vs. `[(open)]`

The minimal "click trigger → show menu" case needs **neither** a separate `open` signal **nor** a two-way binding. `[forDropdownMenu]` is `exportAs: 'forDropdownMenu'`, so expose the directive instance with a template reference variable — `#menu="forDropdownMenu"` — and drive the `@if` straight off its own `open()` signal, as above. Trigger interactions, item activation, Escape, and outside dismissal all flip it.

Reach for the explicit `[(open)]="mySignal"` model binding only when the component class needs to read or drive open state — open it programmatically, persist it, or react to it elsewhere:

```html
<div forDropdownMenu [(open)]="open">
  <button forDropdownMenuTrigger class="dropdown-menu-trigger">Options</button>
  @if (open()) {
  <div forMenuContent>…</div>
  }
</div>
```

### Triggers stamped from outside-declared templates

Angular resolves `ng-template` DI at the template's **declaration** site, not where it is stamped. A `[forDropdownMenuTrigger]` declared in a template outside the root throws the orphan error even when the template is rendered inside the root via `ngTemplateOutlet`. For that case the selector attribute accepts the root reference as a value, `routerLink`-style — grab it with `#root="forDropdownMenu"` and pass it through the outlet context. The bare valueless attribute keeps resolving via DI.

```html
<div forDropdownMenu #root="forDropdownMenu">
  <ng-container *ngTemplateOutlet="trig; context: { root }" />
  @if (root.open()) {
  <div forMenuContent>…</div>
  }
</div>

<ng-template #trig let-root="root">
  <button [forDropdownMenuTrigger]="root">Options</button>
</ng-template>
```

### Sharing one menu with a second opener

`[forDropdownMenu]` is a **single-opener preset**: one root, one button trigger. When the same actions must also be reachable another way — the canonical case being a table row with a kebab button _and_ a right-click region over the whole row — bind the trigger to a `[forMenu]` root instead, which drives one `[forMenuContent]` block from any number of openers. See [Shared openers](../menu/README.md#shared-openers-formenu).

```html
<tr forMenu #row="forMenu" [(open)]="open" ariaLabel="Row actions">
  <td [forContextMenuTrigger]="row">…cells…</td>
  <td>
    <button [forDropdownMenuTrigger]="row" [menuPositioning]="{ sideOffset: 4 }">⋮</button>
  </td>
  <!-- one content block, no duplication -->
</tr>
```

`[menuPositioning]` is the trigger's own placement override — a partial `{ side, align, sideOffset, alignOffset }`, each key falling back to the root's input when omitted. It exists because a shared root cannot pick offsets that suit heterogeneous openers: the `sideOffset: 4` above keeps the button-opened menu clear of the button while a sibling right-click region still opens flush at the cursor. Under a `[forDropdownMenu]` root it resolves the same way, where it is simply a per-trigger spelling of the root's inputs. See [Per-opener positioning](../menu/README.md#per-opener-positioning).

## API

### `ForDropdownMenu`

| Property                    | Type                                                      | Description                                                                                                                                                                                            |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `open`                      | `model<boolean>`                                          | Two-way bindable. Whether the menu is shown.<br>**Default:** `false`                                                                                                                                   |
| `side`                      | `input<string>`                                           | Anchor side of `[forMenuContent]` against the trigger.<br>**Default:** `'bottom'`                                                                                                                      |
| `align`                     | `input<string>`                                           | Alignment along `side` (`'start'` / `'center'` / `'end'`).<br>**Default:** `'start'`                                                                                                                   |
| `sideOffset`                | `input<number>`                                           | Gap (px) between the trigger and the content along the main axis.<br>**Default:** `4`                                                                                                                  |
| `alignOffset`               | `input<number>`                                           | Gap (px) along the cross axis (parallel to `side`).<br>**Default:** `0`                                                                                                                                |
| `fallbackAxisSideDirection` | `input<'none' \| 'start' \| 'end'>`                       | When both sides of the preferred axis overflow, lets `flip` drop the menu to a perpendicular side instead of clipping. `'none'` keeps only the opposite same-axis placement.<br>**Default:** `'none'`  |
| `loop`                      | `input<boolean>`                                          | Whether arrow navigation wraps at the ends.<br>**Default:** `true`                                                                                                                                     |
| `dir`                       | `input<string>`                                           | Writing direction. In RTL, ArrowLeft opens submenus and ArrowRight closes them — the swap is automatic. Inherited by every nested `[forMenuSub]` underneath unless overridden.<br>**Default:** `'ltr'` |
| `disabled`                  | `input<boolean>`                                          | When `true`, trigger interactions are ignored.<br>**Default:** `false`                                                                                                                                 |
| `dismissible`               | `input<boolean>`                                          | When `false`, Escape and outside interactions don't close.<br>**Default:** `true`                                                                                                                      |
| `returnFocus`               | `input<boolean>`                                          | When `true`, focus returns to the trigger on close.<br>**Default:** `true`                                                                                                                             |
| `ariaLabel`                 | `input<string \| null>`                                   | Manual `aria-label` on `[forMenuContent]` if the trigger isn't a meaningful name.<br>**Default:** `null`                                                                                               |
| `escapeKeyDown`             | `output<VetoableNativeEvent<KeyboardEvent>>`              | Output. Escape pressed while the menu is the topmost dismissible layer.<br>**Default:** —                                                                                                              |
| `pointerDownOutside`        | `output<VetoableNativeEvent<PointerEvent>>`               | Output. Pointer-down on a target outside content + trigger.<br>**Default:** —                                                                                                                          |
| `focusOutside`              | `output<VetoableNativeEvent<FocusEvent>>`                 | Output. Focus moves outside content + trigger.<br>**Default:** —                                                                                                                                       |
| `interactOutside`           | `output<VetoableNativeEvent<PointerEvent \| FocusEvent>>` | Output. Composite — fires alongside the two above (and shares their veto state).<br>**Default:** —                                                                                                     |
| `autoFocusOnOpen`           | `output<VetoableEvent>`                                   | Output. Just before focus moves to the first / last enabled item on mount.<br>**Default:** —                                                                                                           |
| `autoFocusOnClose`          | `output<VetoableEvent>`                                   | Output. Just before focus returns to the trigger on unmount.<br>**Default:** —                                                                                                                         |

Every output above is vetoable — each handler receives a `VetoableEvent` (or `VetoableNativeEvent<E>` when there is a native DOM event). Call `preventDefault()` on the emitted veto to suppress the directive's default action; the original DOM event, when present, is on `.event`.

`(autoFocusOnOpen)` / `(autoFocusOnClose)` are output-shape because DropdownMenu always routes close transitions through `[(open)]` (via the implicit `openChange` emitter). See [Conventions › Auto-focus hook shape](../../../.claude/rules/conventions.md#auto-focus-hook-shape) for why Dialog uses callback-shape inputs instead.

### Data attributes

| Piece                      | Attribute       | Values             |
| -------------------------- | --------------- | ------------------ |
| `[forDropdownMenu]`        | `data-state`    | `open` \| `closed` |
| `[forDropdownMenu]`        | `data-disabled` | present \| absent  |
| `[forDropdownMenuTrigger]` | `data-state`    | `open` \| `closed` |
| `[forDropdownMenuTrigger]` | `data-disabled` | present \| absent  |

The menu items, content surface, radio groups, separators, and groups live in the [`menu/`](../menu/README.md) folder — see [menu → Styling](../menu/README.md#styling) for their `data-state` / `data-highlighted` / `data-disabled` attributes and the content-surface CSS custom properties.

## Keyboard

| Key                             | Behavior                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Click`                         | Toggles the menu. On open, focus moves to the first enabled item.                              |
| `Enter` / `Space` / `ArrowDown` | Opens the menu and focuses the first enabled item; on an already-open menu, moves focus there. |
| `ArrowUp`                       | Opens the menu and focuses the last enabled item; on an already-open menu, moves focus there.  |

The open keys never close the menu — the APG menu-button pattern gives them no close semantics (that's `Escape`, or a pointer click on the trigger). Pressing one while the menu is already open moves focus into it, which is what makes them useful after an `(autoFocusOnOpen)`-vetoed open left focus on the trigger. A menu with no enabled item moves nothing.

Once focus is in the menu, see [`menu/README.md`](../menu/README.md) for the in-menu keyboard.

## Accessibility

`[forDropdownMenu]` implements the [WAI-ARIA Menu Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/). The trigger wires `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`; the menu surface and item roles come from the shared [`menu/`](../menu/README.md) primitives.

A disabled trigger (its own `[disabled]`, or the root's) reflects through a **single channel**: the native `disabled` attribute plus the `data-disabled` styling hook. No `aria-disabled` is emitted — the trigger is a real single-purpose `<button>` and the native attribute already conveys the state to assistive technology, per the sanctioned native-`disabled` case in [rule #561](https://github.com/tutkli/forty-cdk/issues/561) (D2). Style the disabled trigger off `[disabled]` or `[data-disabled]`, never `[aria-disabled]`.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

> The menu content (`[forMenuContent]`) portals to `document.body`, so a class scoped to your trigger's component cannot reach it. Style it with **global CSS** or a class you pass through (see [Styling floating content](../../../docs/styling-floating-content.md)). The content host also exposes the shared positioner custom properties — `--for-anchor-width` / `--for-anchor-height`, `--for-available-width` / `--for-available-height`, and `--for-content-transform-origin` — documented in full in [Styling floating content](../../../docs/styling-floating-content.md).

```css
.dropdown-menu-trigger .chevron {
  transition: transform 150ms;
}
.dropdown-menu-trigger[data-state='open'] .chevron {
  transform: rotate(180deg);
}
```

## Behavior notes

- **Mount equals open.** The directive does not toggle `[hidden]` — `@if (open())` controls presence so `animate.enter` / `animate.leave` fire on the natural mount cycle.
- **Trigger is exempt** from outside-pointer / outside-focus checks. Without this, clicking the trigger to close would race with its own toggle handler and reopen immediately.
- **Initial focus depends on the opening key.** Click / Space / Enter / ArrowDown focus the first enabled item; ArrowUp focuses the last enabled item. The same keys re-focus that item when the menu is already open.
- **Selecting an item closes the menu** by default. To keep the menu open after activation (multi-select pattern), call `$event.preventDefault()` in the item's `(activate)` handler.

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_MENU_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
