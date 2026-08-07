# Tooltip

A small floating label that describes its trigger on hover or focus, without ever taking focus itself.

Hover / focus delays, Escape-to-dismiss, portal rendering, and `@floating-ui/dom`-driven positioning are built in.

> New to overlays in forty-cdk? [Your first overlay](../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

> APG: tooltips are for **non-interactive** descriptive text. If you need a click-to-open menu / popup with focusable contents, use a Popover primitive.

## Anatomy

```html
<span forTooltip #tip="forTooltip" side="top" [openDelay]="400">
  <button forTooltipTrigger type="button" aria-label="Save">💾</button>
  <!-- @if (tip.open()) { -->
  <div forTooltipContent class="my-tooltip">
    Save changes
    <span forTooltipArrow class="my-tooltip-arrow"></span>
  </div>
  <!-- } -->
</span>
```

## Examples

```ts
import { Component, signal } from '@angular/core';
import {
  ForTooltip,
  ForTooltipArrow,
  ForTooltipContent,
  ForTooltipTrigger,
} from 'forty-cdk/tooltip';

@Component({
  selector: 'demo-save',
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent, ForTooltipArrow],
  template: `
    <span forTooltip #tip="forTooltip" side="top" [openDelay]="400">
      <button type="button" forTooltipTrigger aria-label="Save">💾</button>
      @if (tip.open()) {
        <div forTooltipContent class="my-tooltip">
          Save changes
          <span forTooltipArrow class="my-tooltip-arrow"></span>
        </div>
      }
    </span>
  `,
  styles: `
    .my-tooltip {
      background: #111;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .my-tooltip-arrow {
      width: 8px;
      height: 8px;
      background: #111;
      transform: rotate(45deg);
      --for-floating-arrow-offset: -4px;
    }
  `,
})
export class DemoSave {}
```

### Triggers stamped from outside-declared templates

Angular resolves `ng-template` DI at the template's **declaration** site, not where it is stamped. A `[forTooltipTrigger]` declared in a template outside the root throws the orphan error even when the template is rendered inside the root via `ngTemplateOutlet`. For that case the selector attribute accepts the root reference as a value, `routerLink`-style — grab it with `#root="forTooltip"` and pass it through the outlet context. The bare valueless attribute keeps resolving via DI.

```html
<span forTooltip #root="forTooltip">
  <ng-container *ngTemplateOutlet="trig; context: { root }" />
  @if (root.open()) {
  <div forTooltipContent>Save changes</div>
  }
</span>

<ng-template #trig let-root="root">
  <button type="button" [forTooltipTrigger]="root" aria-label="Save">💾</button>
</ng-template>
```

## API

### `ForTooltip`

| Property           | Type                                | Description                                                                                                                                                                  |
| ------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`             | `model<boolean>`                    | Two-way bindable visibility.<br>**Default:** —                                                                                                                               |
| `side`             | `input<FloatingSide \| undefined>`  | Anchor side (`'top'` / `'right'` / `'bottom'` / `'left'`). Falls back to `provideForTooltipDefaults` (`'top'`).<br>**Default:** —                                            |
| `align`            | `input<FloatingAlign \| undefined>` | Alignment along `side` (`'start'` / `'center'` / `'end'`). Falls back to `provideForTooltipDefaults` (`'center'`).<br>**Default:** —                                         |
| `sideOffset`       | `input<number \| undefined>`        | Gap (px) between trigger and content along the main axis. Falls back to `provideForTooltipDefaults` (`8`).<br>**Default:** —                                                 |
| `alignOffset`      | `input<number>`                     | Gap (px) along the cross axis.<br>**Default:** `0`                                                                                                                           |
| `collisionPadding` | `input<number \| undefined>`        | Padding (px) for the `flip` / `shift` / `size` collision middlewares. Falls back to `provideForTooltipDefaults` (`8`).<br>**Default:** —                                     |
| `openDelay`        | `input<number \| undefined>`        | ms before showing after hover/focus enters. Falls back to `provideForTooltipDefaults` (`700`).<br>**Default:** —                                                             |
| `closeDelay`       | `input<number \| undefined>`        | ms before hiding after hover/focus leaves. Escape ignores this. Falls back to `provideForTooltipDefaults` (`300`).<br>**Default:** —                                         |
| `disabled`         | `input<boolean>`                    | When `true`, all interaction is ignored.<br>**Default:** —                                                                                                                   |
| `showOnOverflow`   | `input<boolean \| undefined>`       | Show only when the trigger's own text is truncated (`scrollWidth > clientWidth`). Falls back to `provideForTooltipDefaults` (`false`).<br>**Default:** —                     |
| `hoverableContent` | `input<boolean \| undefined>`       | Let the pointer move into the content without dismissing it (drops `pointer-events: none` while open). Falls back to `provideForTooltipDefaults` (`true`).<br>**Default:** — |

| Data attribute        | Values             |
| --------------------- | ------------------ |
| `data-state`          | `open` \| `closed` |
| `data-disabled`       | present \| absent  |
| `data-reduced-motion` | present \| absent  |

### `ForTooltipTrigger`

No inputs of its own — coordinates via the `ForTooltip` context.

| Data attribute | Values             |
| -------------- | ------------------ |
| `data-state`   | `open` \| `closed` |

### `ForTooltipContent`

No inputs of its own — coordinates via the `ForTooltip` context.

| Data attribute        | Values             |
| --------------------- | ------------------ |
| `data-state`          | `open` \| `closed` |
| `data-reduced-motion` | present \| absent  |

### `ForTooltipArrow`

No inputs of its own — coordinates via the `ForTooltip` context.

## Scoped defaults

`provideForTooltipDefaults` configures defaults for an injector subtree — at the application root or in any component's `providers` array. Partial overrides inherit unspecified keys from the parent scope (or the library fallbacks at the root). Each call also establishes a fresh skip-delay coordinator scope: peer tooltips inside the scope share a skip-delay window; tooltips in other scopes don't.

| Key                 | Library fallback | Meaning                                                                                    |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `openDelay`         | `700`            | ms before showing after hover/focus enters.                                                |
| `closeDelay`        | `300`            | ms before hiding after hover/focus leaves.                                                 |
| `skipDelayDuration` | `300`            | Window (ms) after a peer closes during which the next open is instant.                     |
| `side`              | `'top'`          | Anchor side for tooltips that don't set `side` themselves.                                 |
| `align`             | `'center'`       | Alignment along `side` for tooltips that don't set `align` themselves.                     |
| `sideOffset`        | `8`              | Main-axis gap (px) for tooltips that don't set `sideOffset` themselves.                    |
| `collisionPadding`  | `8`              | Collision-middleware padding (px) for tooltips that don't set it themselves.               |
| `showOnOverflow`    | `false`          | Show only when the trigger's text is truncated, for tooltips that don't set it themselves. |
| `hoverableContent`  | `true`           | Allow hovering into the content, for tooltips that don't set it themselves.                |

Per-instance inputs always win over the scope defaults.

```ts
import { provideForTooltipDefaults } from 'forty-cdk/tooltip';

// Bottom-anchored tooltips app-wide
bootstrapApplication(App, {
  providers: [provideForTooltipDefaults({ side: 'bottom', sideOffset: 4 })],
});

// component-level override layers on top, per key
@Component({
  providers: [provideForTooltipDefaults({ openDelay: 200 })],
  ...
})
class Toolbar {}
```

## Imperative show and hide

For programmatic control beyond hover and focus — e.g. a wrapper that drives the tooltip from a text-truncation observer — `ForTooltip` exposes `show()` and `hide()` methods. Grab the root with a template reference (`#tip="forTooltip"`) and call them:

```ts
import { Component } from '@angular/core';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

@Component({
  selector: 'demo-imperative',
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <span forTooltip #tip="forTooltip">
      <button type="button" forTooltipTrigger>Save</button>
      @if (tip.open()) {
        <div forTooltipContent class="my-tooltip">Save changes</div>
      }
    </span>

    <button type="button" (click)="tip.show()">Show</button>
    <button type="button" (click)="tip.hide()">Hide</button>
  `,
})
export class DemoImperative {}
```

Both mirror the hover / focus lifecycle rather than bypassing it:

- `show()` schedules the open after the resolved `openDelay` (instant when the delay is `0` or the scope's skip-delay window is active). It is a no-op while `disabled`, and a no-op under `showOnOverflow` when the trigger's own text is not truncated — the same gates a hover / focus open passes.
- `hide()` schedules the close after the resolved `closeDelay` and disarms the hoverable-content grace bridge.

For an **instant, unconditional** open or close that ignores the delays and both gates, write the `[(open)]` model directly (`open.set(true)` / `open.set(false)`) instead. To suppress empty-message tooltips, keep using the `disabled` input shown above rather than gating the `show()` call yourself.

## Keyboard

- **Tab** to the trigger → opens the tooltip after `openDelay`.
- **Tab** away → closes after `closeDelay`.
- **Escape** while open → closes immediately, regardless of `closeDelay`.

## Behavior notes

- **Activating the trigger dismisses the tooltip.** A press (`pointerdown`) on the trigger closes an open tooltip immediately — the user is acting on the control, not asking for its description, so the bubble shouldn't cover the result of the click. This mirrors Radix and Base UI. The focus the same press induces does **not** reopen it (see below); the tooltip stays dismissed until the pointer leaves and re-enters, or the trigger is focused again from the keyboard. To keep the tooltip open across a click, drive `[(open)]` yourself.
- **Only keyboard focus opens via the focus path.** Open-on-focus fires only when focus arrives **without** a preceding pointer interaction — i.e. a real keyboard `Tab`. A mouse, pen, or touch press that focuses the trigger never opens (or reopens) the tooltip, because hover already covers pointer users. This generalises the original touch-only guard to every pointer type.
- **Portal**: the content element is moved to `document.body` on first render. Any styles you scope to the wrapper won't reach it — style the bubble globally or via a class on the content directive itself.
- **`pointer-events: none`** is applied only when `hoverableContent` is set to `false`. By default (`hoverableContent` is `true`) the pointer may rest over the bubble (WCAG 2.1 SC 1.4.13 "Hoverable"), and clicks land on the bubble rather than passing through to whatever is behind. Set `hoverableContent` to `false` (per-instance or via `provideForTooltipDefaults`) to restore the pass-through behavior, and keep the content non-interactive per APG regardless.
- **Keep content non-interactive**. Tooltips don't trap focus and won't survive a click into them — APG explicitly forbids interactive children.
- **`hoverableContent`** lets the pointer move into the bubble without dismissing it — useful for descriptive text the user may want to select. It drops the default `pointer-events: none` while open and bridges the trigger / content gap with a pointer-grace "safe triangle" so a slow diagonal traversal doesn't close the tooltip. The content must still stay non-interactive per APG.
- **`showOnOverflow`** gates the tooltip on the trigger being truncated (`scrollWidth > clientWidth`) — the common pattern for ellipsized labels, where the tooltip adds nothing once the full text already fits. When the trigger's text fits, hover and focus are ignored.
- **Closes on scroll.** When an ancestor scroll container moves content under a stationary cursor (wheel / trackpad scrolling a virtualized or overflow-scroll list), an open tooltip closes immediately and hover opens stay suppressed for a short window while the scroll is in flight — so tooltips on rows sliding past the pointer don't linger or flicker open. This is always on; a genuine pointer move after scrolling settles opens the tooltip normally again.
- **Touch**: APG flags tooltips as problematic on touch devices (no hover, no separate focus, no obvious dismiss). The trigger filters touch pointers out of both the hover-open and focus-open paths, so a tap does **not** open the tooltip — only mouse hover and keyboard focus do. For touch-first UI where the descriptive content must be reachable on tap, consider a Popover.
- **Arrow offset**: `[forTooltipArrow]` writes `position: absolute`, the floating-ui-resolved `left` / `top`, and `var(--for-floating-arrow-offset, 0px)` on the side opposite the bubble. Set `--for-floating-arrow-offset` on the arrow (or any ancestor) to control how far the arrow pokes out — typically a negative `px` value such as `-4px`. Defaults to `0px`.

## Accessibility

Implements the [WAI-ARIA Tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/).

- The trigger receives `aria-describedby="<content-id>"` only while the tooltip is open, matching APG.
- A consumer-set `id` on the trigger element is preserved (and used as the trigger id internally); the generated `for-tooltip-trigger-*` id is only assigned when the element has none. Anchors, `aria-labelledby` references, and `<label for>` associations keep working.
- The content carries `role="tooltip"` and a stable id wired to the trigger.
- The optional arrow is `aria-hidden="true"` — it's purely decorative.
- The tooltip never steals focus.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

### CSS custom properties

See also: [Styling floating content](../../../docs/styling-floating-content.md) — animation rules, standalone `scale`/`opacity`, and the arrow recipe.

`[forTooltipContent]` is portaled to `document.body` and gets its position resolved by floating-ui. It exposes that geometry as custom properties on the content host (cleared on close), and `[forTooltipArrow]` reads the consumer-settable `--for-floating-arrow-offset`:

| Element               | Custom property                           | Type / range        | Direction | Meaning                                                                                                      |
| --------------------- | ----------------------------------------- | ------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `[forTooltipContent]` | `--for-floating-anchor-width`             | px                  | out       | Trigger (reference) width.                                                                                   |
| `[forTooltipContent]` | `--for-floating-anchor-height`            | px                  | out       | Trigger (reference) height.                                                                                  |
| `[forTooltipContent]` | `--for-floating-available-width`          | px                  | out       | Space available along the inline axis (floating-ui `size` middleware) — clamp with `max-width`.              |
| `[forTooltipContent]` | `--for-floating-available-height`         | px                  | out       | Space available along the block axis — clamp with `max-height`.                                              |
| `[forTooltipContent]` | `--for-floating-content-transform-origin` | `<origin>` keywords | out       | `transform-origin` matching the resolved side / align, so a `scale` enter animation pivots from the trigger. |
| `[forTooltipArrow]`   | `--for-floating-arrow-offset`             | px (default `0px`)  | in        | Consumer-set. How far the arrow pokes out past the bubble edge — typically a negative `px` (e.g. `-4px`).    |

> `[forTooltipContent]` is portaled to `document.body`, so styles scoped to the `[forTooltip]` wrapper won't reach it. Style the bubble with a global stylesheet or a class on the content directive itself. See [Styling floating content](../../../docs/styling-floating-content.md) for the full positioner custom-property list (`--for-floating-anchor-width` / `-height`, `--for-floating-available-width` / `-height`, `--for-floating-content-transform-origin`) and the animation / arrow recipes.

```css
.my-tooltip {
  opacity: 0;
  transform: scale(0.9);
  transform-origin: var(--for-floating-content-transform-origin);
  transition:
    opacity 120ms,
    transform 120ms;
}
.my-tooltip[data-state='open'] {
  opacity: 1;
  transform: scale(1);
}
```

### Reduced motion

`[forTooltip]` and `[forTooltipContent]` reflect `data-reduced-motion` (present / absent) whenever the OS `prefers-reduced-motion: reduce` media query matches, so you can opt your own transitions out without re-deriving the query in CSS or TypeScript. The attribute flips reactively if the preference changes mid-session.

```css
.my-tooltip[data-reduced-motion] {
  transition: none;
}
```

The tooltip's open / close delays are hover-intent debouncing rather than motion, so they are deliberately left unchanged under reduced motion — only the visual transitions (which are yours) should opt out.

Tooltip content is template-provided and mounts via the consumer's own markup, so the tooltip cannot know the content would be empty before opening — it would happily open an empty bubble on hover/focus. The supported gate is the existing `disabled` input: drive it from whatever signal feeds the content. This is the recipe for design-system wrappers that take the tooltip text as a string input:

```ts
import { Component, input } from '@angular/core';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

@Component({
  selector: 'my-tooltip-button',
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <span forTooltip #tip="forTooltip" [disabled]="!message()">
      <button type="button" forTooltipTrigger><ng-content /></button>
      @if (tip.open()) {
        <div forTooltipContent class="my-tooltip">{{ message() }}</div>
      }
    </span>
  `,
})
export class MyTooltipButton {
  readonly message = input('');
}
```

While `disabled` is `true`, hover and focus are ignored and an already-open tooltip force-closes — no empty bubble, no stale `aria-describedby`.

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_TOOLTIP_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
