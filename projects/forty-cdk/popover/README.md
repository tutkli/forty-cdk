# Popover

A non-modal floating panel anchored to its trigger by floating-ui, dismissed on Escape, pointer-down outside or focus outside.

A popover is a non-modal dialog: focus moves into the surface on open and returns to the trigger on close, but Tab is allowed to leave (no focus trap). For a modal version, use `[forDialog]`. For a non-interactive label that follows the cursor / focus, use `[forTooltip]`.

> New to overlays in forty-cdk? [Your first overlay](../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

## Anatomy

```html
<div forPopover #popover="forPopover" side="bottom" align="center">
  <button forPopoverTrigger>Settings</button>

  <!-- rendered only when popover.open() is true -->
  <div forPopoverContent>
    <h3 forPopoverTitle>Display</h3>
    <p forPopoverDescription>Adjust theme and density.</p>
    <button forPopoverClose>Done</button>
    <span forPopoverArrow></span>
  </div>
</div>
```

## Examples

```ts
import { Component } from '@angular/core';
import {
  ForPopover,
  ForPopoverArrow,
  ForPopoverClose,
  ForPopoverContent,
  ForPopoverDescription,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk/popover';

@Component({
  selector: 'demo-popover',
  imports: [
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
    ForPopoverClose,
    ForPopoverArrow,
  ],
  template: `
    <div forPopover #popover="forPopover" side="bottom" align="start">
      <button forPopoverTrigger>Settings</button>

      @if (popover.open()) {
        <div forPopoverContent class="popover" animate.leave="fade-out">
          <h2 forPopoverTitle>Display</h2>
          <p forPopoverDescription>Adjust theme and density.</p>
          <!-- your content -->
          <button forPopoverClose>Close</button>
          <span forPopoverArrow class="arrow"></span>
        </div>
      }
    </div>
  `,
})
export class DemoPopover {}
```

`[forPopoverContent]` portals to `document.body` and is positioned with floating-ui — it must be wrapped with `@if` so mount and unmount drive `animate.enter` / `animate.leave`.

### `#popover="forPopover"` vs `[(open)]`

The minimal "click trigger → show content" case needs **neither** a separate `open` signal **nor** a two-way binding. `[forPopover]` is `exportAs: 'forPopover'`, so expose the directive instance with a template reference variable — `#popover="forPopover"` — and drive the `@if` straight off its own `open()` signal, as above. The trigger toggles it; Escape and outside dismissal flip it back.

Reach for the explicit `[(open)]="mySignal"` model binding only when the component class needs to read or drive open state — open it programmatically, persist it, or react to it elsewhere:

```html
<div forPopover [(open)]="open">
  <button forPopoverTrigger>Settings</button>
  @if (open()) {
  <div forPopoverContent>…</div>
  }
</div>
```

### Triggers stamped from outside-declared templates

Angular resolves `ng-template` DI at the template's **declaration** site, not where it is stamped. A `[forPopoverTrigger]` declared in a template outside the root throws the orphan error even when the template is rendered inside the root via `ngTemplateOutlet`. For that case the selector attribute accepts the root reference as a value, `routerLink`-style — grab it with `#root="forPopover"` and pass it through the outlet context. The bare valueless attribute keeps resolving via DI.

```html
<div forPopover #root="forPopover">
  <ng-container *ngTemplateOutlet="trig; context: { root }" />
  @if (root.open()) {
  <div forPopoverContent>…</div>
  }
</div>

<ng-template #trig let-root="root">
  <button [forPopoverTrigger]="root">Settings</button>
</ng-template>
```

## API

### `ForPopover`

| Property             | Type                                                                | Description                                                                                                                               |
| -------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `open`               | `model<boolean>`                                                    | Two-way bindable visibility.<br>**Default:** —                                                                                            |
| `side`               | `input<string>`                                                     | Anchor side (`'top'` / `'right'` / `'bottom'` / `'left'`). Falls back to `provideForPopoverDefaults`.<br>**Default:** `'bottom'`          |
| `align`              | `input<string>`                                                     | Alignment along the chosen side (`'start'` / `'center'` / `'end'`). Falls back to `provideForPopoverDefaults`.<br>**Default:** `'center'` |
| `sideOffset`         | `input<number>`                                                     | Gap (px) between trigger and content along the main axis. Falls back to `provideForPopoverDefaults`.<br>**Default:** `8`                  |
| `alignOffset`        | `input<number>`                                                     | Gap (px) along the cross axis (parallel to `side`).<br>**Default:** `0`                                                                   |
| `collisionPadding`   | `input<number>`                                                     | Padding (px) for the `flip` / `shift` / `size` collision middlewares. Falls back to `provideForPopoverDefaults`.<br>**Default:** `8`      |
| `disabled`           | `input<boolean>`                                                    | When `true`, trigger does not toggle.<br>**Default:** `false`                                                                             |
| `dismissible`        | `input<boolean>`                                                    | When `false`, Escape / outside-pointer / outside-focus do not close.<br>**Default:** `true`                                               |
| `returnFocus`        | `input<boolean>`                                                    | Focus returns to the trigger on close.<br>**Default:** `true`                                                                             |
| `initialFocus`       | `input<string>`                                                     | `'first'` (first focusable inside content) or `'container'` (the content host).<br>**Default:** `'first'`                                 |
| `ariaLabel`          | `input<string \| null>`                                             | Manual `aria-label` on the content when no `[forPopoverTitle]` is rendered.<br>**Default:** `null`                                        |
| `escapeKeyDown`      | `OutputEmitterRef<VetoableNativeEvent<KeyboardEvent>>`              | Output. Fires on Escape while this popover is the topmost dismissible layer.<br>**Default:** —                                            |
| `pointerDownOutside` | `OutputEmitterRef<VetoableNativeEvent<PointerEvent>>`               | Output. Fires on pointer-down outside the content (and outside the trigger).<br>**Default:** —                                            |
| `focusOutside`       | `OutputEmitterRef<VetoableNativeEvent<FocusEvent>>`                 | Output. Fires when focus moves outside the content (and outside the trigger).<br>**Default:** —                                           |
| `interactOutside`    | `OutputEmitterRef<VetoableNativeEvent<PointerEvent \| FocusEvent>>` | Output. Composite: fires alongside both `pointerDownOutside` and `focusOutside` (and shares their veto state).<br>**Default:** —          |
| `autoFocusOnOpen`    | `OutputEmitterRef<VetoableEvent>`                                   | Output. Fires just before focus moves into the popover on mount. `preventDefault()` skips the move.<br>**Default:** —                     |
| `autoFocusOnClose`   | `OutputEmitterRef<VetoableEvent>`                                   | Output. Fires just before focus returns to the trigger on unmount. `preventDefault()` skips the return-focus.<br>**Default:** —           |
| `openChange`         | `OutputEmitterRef<boolean>`                                         | Output. Implicit from `model()`. Emits only on internal transitions, not on consumer writes via `[(open)]`.<br>**Default:** —             |

| Data attribute        | Values             |
| --------------------- | ------------------ |
| `data-state`          | `open` \| `closed` |
| `data-disabled`       | present \| absent  |
| `data-reduced-motion` | present \| absent  |

The dismiss outputs and the auto-focus pair are vetoable: each receives a `VetoableEvent` (or `VetoableNativeEvent<E>` when there is a native DOM event to surface). Call `preventDefault()` on the emitted veto to suppress the automatic close / focus move; the original DOM event, when present, is on `.event`.

`(autoFocusOnOpen)` / `(autoFocusOnClose)` are output-shape because Popover always routes close transitions through `[(open)]` (via the implicit `openChange` emitter). See [Conventions › Auto-focus hook shape](../../../.claude/rules/conventions.md#auto-focus-hook-shape) for why Dialog uses callback-shape inputs instead.

### Open without stealing focus

```html
<div forPopover [(open)]="open">
  <input forPopoverAnchor #q type="search" (input)="open.set(true)" placeholder="Search…" />
  <button forPopoverTrigger hidden></button>

  @if (open()) {
  <div
    forPopoverContent
    (autoFocusOnOpen)="$event.preventDefault()"
    (autoFocusOnClose)="$event.preventDefault()"
  >
    …
  </div>
  }
</div>
```

The popover opens / closes alongside the input but never steals focus from it — handy for live-search panels where every keystroke matters.

### `ForPopoverTrigger`

| Property   | Type             | Description                                                                                                                                                                                                                                |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `disabled` | `input<boolean>` | Disables this trigger only — merged OR with the root's `disabled`. The effective state drives the native `disabled` attribute, `data-disabled` and the click guard — no `aria-disabled` (single channel, #561 D2).<br>**Default:** `false` |

| Data attribute  | Values             |
| --------------- | ------------------ |
| `data-state`    | `open` \| `closed` |
| `data-disabled` | present \| absent  |

### `ForPopoverContent`

| Data attribute        | Values             |
| --------------------- | ------------------ |
| `data-state`          | `open` \| `closed` |
| `data-reduced-motion` | present \| absent  |

### `ForPopoverArrow`

| Data attribute       | Values  |
| -------------------- | ------- |
| `data-popover-arrow` | present |

## Scoped defaults

`provideForPopoverDefaults` configures positioning defaults for an injector subtree — at the application root or in any component's `providers` array. Partial overrides inherit unspecified keys from the parent scope (or the library fallbacks at the root).

| Key                | Library fallback | Meaning                                                                      |
| ------------------ | ---------------- | ---------------------------------------------------------------------------- |
| `side`             | `'bottom'`       | Anchor side for popovers that don't set `side` themselves.                   |
| `align`            | `'center'`       | Alignment along `side` for popovers that don't set `align` themselves.       |
| `sideOffset`       | `8`              | Main-axis gap (px) for popovers that don't set `sideOffset` themselves.      |
| `collisionPadding` | `8`              | Collision-middleware padding (px) for popovers that don't set it themselves. |

Per-instance inputs always win over the scope defaults.

```ts
import { provideForPopoverDefaults } from 'forty-cdk/popover';

// Top-anchored popovers app-wide
bootstrapApplication(App, {
  providers: [provideForPopoverDefaults({ side: 'top', sideOffset: 4 })],
});

// component-level override layers on top, per key
@Component({
  providers: [provideForPopoverDefaults({ align: 'start' })],
  ...
})
class Toolbar {}
```

## Keyboard

- **Tab / Shift+Tab** moves focus through the popover and beyond (no trap). When focus leaves, `focusOutside` fires and the popover closes unless prevented.
- **Escape** closes when `dismissible`. Use `(escapeKeyDown)="$event.preventDefault()"` to ask "are you sure?" first.
- **Enter / Space** on the trigger toggles (native button behavior).

## Accessibility

Implements the [WAI-ARIA Modeless Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

- Always provide an accessible name: render a `[forPopoverTitle]` or pass `ariaLabel`.
- `[forPopoverDescription]` is optional — use it for explanatory copy beyond the title.
- `aria-haspopup="dialog"` advertises the popover as a dialog (matches `role="dialog"` on the content). For menus or listboxes, build a different primitive.
- The popover is not modal: assistive tech users can still navigate around it. That's intentional — modeless surfaces should not interrupt.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

### CSS custom properties

See also: [Styling floating content](../../../docs/styling-floating-content.md) — animation rules, standalone `scale`/`opacity`, and the arrow recipe.

`[forPopoverContent]` is portaled to `document.body` and gets its position resolved by floating-ui. It exposes that geometry as custom properties on the content host (cleared on close), and `[forPopoverArrow]` reads the consumer-settable `--for-arrow-offset`:

| Element               | Custom property                  | Type / range        | Direction | Meaning                                                                                                      |
| --------------------- | -------------------------------- | ------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `[forPopoverContent]` | `--for-anchor-width`             | px                  | out       | Trigger (reference) width — match it with `width: var(--for-anchor-width)`.                                  |
| `[forPopoverContent]` | `--for-anchor-height`            | px                  | out       | Trigger (reference) height.                                                                                  |
| `[forPopoverContent]` | `--for-available-width`          | px                  | out       | Space available along the inline axis (floating-ui `size` middleware) — clamp with `max-width`.              |
| `[forPopoverContent]` | `--for-available-height`         | px                  | out       | Space available along the block axis — clamp with `max-height`.                                              |
| `[forPopoverContent]` | `--for-content-transform-origin` | `<origin>` keywords | out       | `transform-origin` matching the resolved side / align, so a `scale` enter animation pivots from the trigger. |
| `[forPopoverArrow]`   | `--for-arrow-offset`             | px (default `0px`)  | in        | Consumer-set. How far the arrow pokes out past the popover edge — typically a negative `px` (e.g. `-4px`).   |

> `[forPopoverContent]` portals to `document.body`, so ancestor-scoped CSS can't reach it. Style it with global CSS or a class — see [Styling floating content](../../../docs/styling-floating-content.md) for the full positioner-property list and the floating-content rules.

```css
.popover-trigger .chevron {
  transition: transform 150ms;
}
.popover-trigger[data-state='open'] .chevron {
  transform: rotate(180deg);
}
```

### Reduced motion

`[forPopover]` and `[forPopoverContent]` reflect `data-reduced-motion` (present / absent) whenever the OS `prefers-reduced-motion: reduce` media query matches, so you can opt your own `animate.enter` / `animate.leave` and CSS transitions out without re-deriving the query. The attribute flips reactively if the preference changes mid-session. The popover toggles open / closed synchronously on click, so there is no JS-coordinated timing to skip — only the visual transitions (which are yours) opt out.

```css
.popover-content[data-reduced-motion] {
  transition: none;
}
```

## Behavior notes

- **Portal**: the content is moved to `document.body` on first render. CSS scoped to ancestors won't reach it — use global styles or classes.
- **Trigger exemption**: clicks on the trigger never fire `pointerDownOutside` or `interactOutside`. Their only effect is the trigger's own toggle.
- **Anchor vs. trigger**: `[forPopoverAnchor]` only changes the floating-ui reference. The trigger keeps `aria-controls` / `aria-expanded`, the click toggle, and focus return on close. The anchor is _not_ exempt from outside dismissal — clicking it is treated as outside.
- **Non-modal**: no focus trap, no body scroll lock, no `aria-modal`. If you need modal semantics, use `[forDialog]` instead.
- **No backdrop**: popovers don't render an overlay. Outside dismissal is event-driven.
- **Focus return**: on unmount, focus is sent back to the registered trigger element (unless `returnFocus="false"`). The one exception is an **outside-interaction close** — a pointer-down or focus-out that lands outside the popover: focus stays where the interaction moved it instead of snapping back to the trigger, matching `[forDropdownMenu]` (so a popover on a trigger that also carries a tooltip doesn't rip focus back and re-open that tooltip). Escape and programmatic closes still return focus. The return happens before the portal helper removes the node, so the trigger receives `focusin` against a stable layout.
- **Arrow offset**: `[forPopoverArrow]` writes `position: absolute`, the floating-ui-resolved `left` / `top`, and `var(--for-arrow-offset, 0px)` on the side opposite the popover (so the arrow points back at the trigger). Set `--for-arrow-offset` on the arrow element (or any ancestor) to control how far the arrow pokes out — typically a negative `px` value such as `-4px`. Defaults to `0px` (flush with the popover edge); the helper ships no default visual.

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_POPOVER_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
