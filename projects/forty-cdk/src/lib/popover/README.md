# Popover

> New to overlays in forty-cdk? [Your first overlay](../../../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

Headless implementation of the [WAI-ARIA Modeless Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), positioned against an internal trigger via [`@floating-ui/dom`](https://floating-ui.com/).

A popover is a non-modal dialog: focus moves into the surface on open and returns to the trigger on close, but Tab is allowed to leave (no focus trap). For a modal version, use `[forDialog]`. For a non-interactive label that follows the cursor / focus, use `[forTooltip]`.

## Usage

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
} from 'forty-cdk';

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

### `#popover="forPopover"` vs. `[(open)]`

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

## Pieces

| Class                   | Selector                  | Role                                                                                                                                                                                                                                                        |
| ----------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForPopover`            | `[forPopover]`            | Root. Owns `open`, side / align positioning, dismissible, returnFocus, initialFocus.                                                                                                                                                                        |
| `ForPopoverTrigger`     | `[forPopoverTrigger]`     | Toggles `open` on click. Wires `aria-haspopup` / `aria-expanded` / `aria-controls`. Used as the floating-ui anchor unless a `[forPopoverAnchor]` is registered.                                                                                             |
| `ForPopoverAnchor`      | `[forPopoverAnchor]`      | Optional. When present, the popover is positioned against this element instead of the trigger — useful when "what opens it" and "where it appears" differ (cursor follower, contextual help anchored to a row, popover anchored to a text-selection range). |
| `ForPopoverContent`     | `[forPopoverContent]`     | The popover surface. `role="dialog"`, portaled to body, positioned, dismissable.                                                                                                                                                                            |
| `ForPopoverTitle`       | `[forPopoverTitle]`       | Generates an id and registers it as `aria-labelledby`.                                                                                                                                                                                                      |
| `ForPopoverDescription` | `[forPopoverDescription]` | Same, for `aria-describedby`.                                                                                                                                                                                                                               |
| `ForPopoverClose`       | `[forPopoverClose]`       | Button that sets `open` to `false`. Bypasses `dismissible`.                                                                                                                                                                                                 |
| `ForPopoverArrow`       | `[forPopoverArrow]`       | Optional decorative arrow positioned by floating-ui.                                                                                                                                                                                                        |

## Inputs (`ForPopover`)

| API            | Default    | Description                                                                     |
| -------------- | ---------- | ------------------------------------------------------------------------------- |
| `open`         | `false`    | Two-way bindable visibility.                                                    |
| `side`         | `'bottom'` | Anchor side (`'top'` / `'right'` / `'bottom'` / `'left'`).                      |
| `align`        | `'center'` | Alignment along the chosen side (`'start'` / `'center'` / `'end'`).             |
| `sideOffset`   | `8`        | Gap (px) between trigger and content along the main axis.                       |
| `alignOffset`  | `0`        | Gap (px) along the cross axis (parallel to `side`).                             |
| `disabled`     | `false`    | When `true`, trigger does not toggle.                                           |
| `dismissible`  | `true`     | When `false`, Escape / outside-pointer / outside-focus do not close.            |
| `returnFocus`  | `true`     | Focus returns to the trigger on close.                                          |
| `initialFocus` | `'first'`  | `'first'` (first focusable inside content) or `'container'` (the content host). |
| `ariaLabel`    | `null`     | Manual `aria-label` on the content when no `[forPopoverTitle]` is rendered.     |

## Inputs (`ForPopoverTrigger`)

| API        | Default | Description                                                                                                                                                       |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled` | `false` | Disables this trigger only — merged OR with the root's `disabled`. The effective state drives `disabled` / `aria-disabled` / `data-disabled` and the click guard. |

## Outputs (`ForPopover`)

The dismiss outputs and the auto-focus pair are vetoable: each receives a `VetoableEvent` (or `VetoableNativeEvent<E>` when there is a native DOM event to surface). Call `preventDefault()` on the emitted veto to suppress the automatic close / focus move; the original DOM event, when present, is on `.event`.

| Output               | Payload                                           | Fires on                                                                                            |
| -------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `escapeKeyDown`      | `VetoableNativeEvent<KeyboardEvent>`              | Escape while this popover is the topmost dismissable layer.                                         |
| `pointerDownOutside` | `VetoableNativeEvent<PointerEvent>`               | Pointer-down outside the content (and outside the trigger).                                         |
| `focusOutside`       | `VetoableNativeEvent<FocusEvent>`                 | Focus moves outside the content (and outside the trigger).                                          |
| `interactOutside`    | `VetoableNativeEvent<PointerEvent \| FocusEvent>` | Composite: fires alongside both of the above (and shares their veto state).                         |
| `autoFocusOnOpen`    | `VetoableEvent`                                   | Just before focus moves into the popover on mount. `preventDefault()` skips the move.               |
| `autoFocusOnClose`   | `VetoableEvent`                                   | Just before focus returns to the trigger on unmount. `preventDefault()` skips the return-focus.     |
| `openChange`         | `boolean`                                         | Implicit from `model()`. Emits only on internal transitions, not on consumer writes via `[(open)]`. |

`(autoFocusOnOpen)` / `(autoFocusOnClose)` are output-shape because Popover always routes close transitions through `[(open)]` (via the implicit `openChange` emitter). See [CLAUDE.md › Auto-focus hook shape](../../../../../CLAUDE.md#auto-focus-hook-shape) for why Dialog uses callback-shape inputs instead.

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

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

### Data attributes

| Piece                 | Attribute            | Values             |
| --------------------- | -------------------- | ------------------ |
| `[forPopover]`        | `data-state`         | `open` \| `closed` |
| `[forPopover]`        | `data-disabled`      | present \| absent  |
| `[forPopoverTrigger]` | `data-state`         | `open` \| `closed` |
| `[forPopoverTrigger]` | `data-disabled`      | present \| absent  |
| `[forPopoverContent]` | `data-state`         | `open` \| `closed` |
| `[forPopoverArrow]`   | `data-popover-arrow` | present            |

### CSS custom properties

See also: [Styling floating content](../../../../../docs/styling-floating-content.md) — animation rules, standalone `scale`/`opacity`, and the arrow recipe.

`[forPopoverContent]` is portaled to `document.body` and gets its position resolved by floating-ui. It exposes that geometry as custom properties on the content host (cleared on close), and `[forPopoverArrow]` reads the consumer-settable `--for-arrow-offset`:

| Element               | Custom property                  | Type / range        | Direction | Meaning                                                                                                      |
| --------------------- | -------------------------------- | ------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `[forPopoverContent]` | `--for-anchor-width`             | px                  | out       | Trigger (reference) width — match it with `width: var(--for-anchor-width)`.                                  |
| `[forPopoverContent]` | `--for-anchor-height`            | px                  | out       | Trigger (reference) height.                                                                                  |
| `[forPopoverContent]` | `--for-available-width`          | px                  | out       | Space available along the inline axis (floating-ui `size` middleware) — clamp with `max-width`.              |
| `[forPopoverContent]` | `--for-available-height`         | px                  | out       | Space available along the block axis — clamp with `max-height`.                                              |
| `[forPopoverContent]` | `--for-content-transform-origin` | `<origin>` keywords | out       | `transform-origin` matching the resolved side / align, so a `scale` enter animation pivots from the trigger. |
| `[forPopoverArrow]`   | `--for-arrow-offset`             | px (default `0px`)  | in        | Consumer-set. How far the arrow pokes out past the popover edge — typically a negative `px` (e.g. `-4px`).   |

> `[forPopoverContent]` portals to `document.body`, so ancestor-scoped CSS can't reach it. Style it with global CSS or a class — see [Styling floating content](../../../../../docs/styling-floating-content.md) for the full positioner-property list and the floating-content rules.

```css
.popover-trigger .chevron {
  transition: transform 150ms;
}
.popover-trigger[data-state='open'] .chevron {
  transform: rotate(180deg);
}
```

## Keyboard

- **Tab / Shift+Tab** moves focus through the popover and beyond (no trap). When focus leaves, `focusOutside` fires and the popover closes unless prevented.
- **Escape** closes when `dismissible`. Use `(escapeKeyDown)="$event.preventDefault()"` to ask "are you sure?" first.
- **Enter / Space** on the trigger toggles (native button behavior).

## Behavior notes

- **Portal**: the content is moved to `document.body` on first render. CSS scoped to ancestors won't reach it — use global styles or classes.
- **Trigger exemption**: clicks on the trigger never fire `pointerDownOutside` or `interactOutside`. Their only effect is the trigger's own toggle.
- **Anchor vs. trigger**: `[forPopoverAnchor]` only changes the floating-ui reference. The trigger keeps `aria-controls` / `aria-expanded`, the click toggle, and focus return on close. The anchor is _not_ exempt from outside dismissal — clicking it is treated as outside.
- **Non-modal**: no focus trap, no body scroll lock, no `aria-modal`. If you need modal semantics, use `[forDialog]` instead.
- **No backdrop**: popovers don't render an overlay. Outside dismissal is event-driven.
- **Focus return**: on unmount, focus is sent back to the registered trigger element (unless `returnFocus="false"`). The return happens before the portal helper removes the node, so the trigger receives `focusin` against a stable layout.
- **Arrow offset**: `[forPopoverArrow]` writes `position: absolute`, the floating-ui-resolved `left` / `top`, and `var(--for-arrow-offset, 0px)` on the side opposite the popover (so the arrow points back at the trigger). Set `--for-arrow-offset` on the arrow element (or any ancestor) to control how far the arrow pokes out — typically a negative `px` value such as `-4px`. Defaults to `0px` (flush with the popover edge); the helper ships no default visual.

## Accessibility notes

- Always provide an accessible name: render a `[forPopoverTitle]` or pass `ariaLabel`.
- `[forPopoverDescription]` is optional — use it for explanatory copy beyond the title.
- `aria-haspopup="dialog"` advertises the popover as a dialog (matches `role="dialog"` on the content). For menus or listboxes, build a different primitive.
- The popover is not modal: assistive tech users can still navigate around it. That's intentional — modeless surfaces should not interrupt.
