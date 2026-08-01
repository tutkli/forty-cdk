# HoverCard

A floating card that opens on hover to preview the content behind a link, with a pointer bridge keeping it open.

Use it for profile snapshots, link previews, definition cards — any complementary information that surfaces on dwell. There is no APG pattern for HoverCard. Treat it as a presentational layer: the trigger must already convey full meaning (it's a link, a name, a tag), so keyboard-only users miss nothing if they never see the card. Card content can be interactive — that's its main difference from `[forTooltip]`, where APG bans it.

> New to overlays in forty-cdk? [Your first overlay](../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

## Anatomy

```html
<span forHoverCard #card="forHoverCard" side="top">
  <a forHoverCardTrigger href="/users/ada">Ada Lovelace</a>
  <!-- @if (card.open()) { -->
  <div forHoverCardContent animate.enter="card-in" animate.leave="card-out">
    <h3>Ada Lovelace</h3>
    <p>Mathematician — designed the first algorithm.</p>
    <span forHoverCardArrow></span>
  </div>
  <!-- } -->
</span>
```

## Examples

```ts
import { Component, signal } from '@angular/core';
import {
  ForHoverCard,
  ForHoverCardArrow,
  ForHoverCardContent,
  ForHoverCardTrigger,
} from 'forty-cdk/hover-card';

@Component({
  selector: 'demo-profile-link',
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent, ForHoverCardArrow],
  template: `
    <span forHoverCard #card="forHoverCard">
      <a forHoverCardTrigger href="/users/ada">Ada Lovelace</a>
      @if (card.open()) {
        <div forHoverCardContent animate.enter="card-in" animate.leave="card-out">
          <img src="/api/avatar/ada" alt="" width="64" height="64" />
          <h3>Ada Lovelace</h3>
          <p>Mathematician — designed the first algorithm.</p>
          <span forHoverCardArrow class="arrow"></span>
        </div>
      }
    </span>
  `,
})
export class DemoProfileLink {}
```

### Triggers stamped from outside-declared templates

Angular resolves `ng-template` DI at the template's **declaration** site, not where it is stamped. A `[forHoverCardTrigger]` declared in a template outside the root throws the orphan error even when the template is rendered inside the root via `ngTemplateOutlet`. For that case the selector attribute accepts the root reference as a value, `routerLink`-style — grab it with `#root="forHoverCard"` and pass it through the outlet context. The bare valueless attribute keeps resolving via DI.

```html
<span forHoverCard #root="forHoverCard">
  <ng-container *ngTemplateOutlet="trig; context: { root }" />
  @if (root.open()) {
  <div forHoverCardContent>…</div>
  }
</span>

<ng-template #trig let-root="root">
  <a [forHoverCardTrigger]="root" href="/users/ada">Ada Lovelace</a>
</ng-template>
```

## API

### `ForHoverCard`

| Property           | Type                                              | Description                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`             | `model<boolean>` (two-way bindable as `[(open)]`) | `(openChange)` fires only on internal transitions (delay timers, escape, blur, and the force-close that runs when `disabled` flips to true).<br>**Default:** —                                                       |
| `side`             | `input<FloatingSide \| undefined>`                | Anchor side (`'top'` / `'right'` / `'bottom'` / `'left'`). Falls back to `provideForHoverCardDefaults` (`'top'`).<br>**Default:** —                                                                                  |
| `align`            | `input<FloatingAlign \| undefined>`               | Alignment along `side` (`'start'` / `'center'` / `'end'`). Falls back to `provideForHoverCardDefaults` (`'center'`).<br>**Default:** —                                                                               |
| `sideOffset`       | `input<number \| undefined>`                      | Gap (px) between trigger and card along the main axis. Falls back to `provideForHoverCardDefaults` (`8`).<br>**Default:** —                                                                                          |
| `alignOffset`      | `input<number>`                                   | Gap (px) along the cross axis.<br>**Default:** `0`                                                                                                                                                                   |
| `collisionPadding` | `input<number \| undefined>`                      | Padding (px) for the `flip` / `shift` / `size` collision middlewares. Falls back to `provideForHoverCardDefaults` (`8`).<br>**Default:** —                                                                           |
| `openDelay`        | `input<number \| undefined>`                      | Per-card override for open delay. Falls back to `provideForHoverCardDefaults` (700ms).<br>**Default:** —                                                                                                             |
| `closeDelay`       | `input<number \| undefined>`                      | Per-card override for close delay. Falls back to `provideForHoverCardDefaults` (300ms).<br>**Default:** —                                                                                                            |
| `disabled`         | `input<boolean>`                                  | When true, hover / focus interaction is ignored AND any open card is force-closed (with `(openChange)` firing so a `[(open)]` binding stays in sync).<br>**Default:** —                                              |
| `escapeKeyDown`    | `OutputEmitterRef<KeyboardEvent>`                 | Output. Fires when Escape is pressed while the card is open, regardless of where focus currently lives (trigger, portaled content, or an unrelated element). Call `preventDefault()` to keep open.<br>**Default:** — |

| Data attribute        | Values             |
| --------------------- | ------------------ |
| `data-state`          | `open` \| `closed` |
| `data-disabled`       | present \| absent  |
| `data-reduced-motion` | present \| absent  |

### `ForHoverCardTrigger`

| Data attribute | Values             |
| -------------- | ------------------ |
| `data-state`   | `open` \| `closed` |

### `ForHoverCardContent`

| Data attribute        | Values             |
| --------------------- | ------------------ |
| `data-state`          | `open` \| `closed` |
| `data-reduced-motion` | present \| absent  |

### `ForHoverCardArrow`

| Data attribute          | Values           |
| ----------------------- | ---------------- |
| `data-hover-card-arrow` | present (always) |

## Defaults

`provideForHoverCardDefaults` configures defaults for an injector subtree — at the application root or in any component's `providers` array. Partial overrides inherit unspecified keys from the parent scope (or the library fallbacks at the root). Each call also establishes a fresh skip-delay coordinator scope: peer cards inside the scope share a skip-delay window (the next open is instant within `skipDelayDuration` after a peer closed); cards in other scopes don't.

| Key                 | Library fallback | Meaning                                                                   |
| ------------------- | ---------------- | ------------------------------------------------------------------------- |
| `openDelay`         | `700`            | ms before showing after hover/focus enters.                               |
| `closeDelay`        | `300`            | ms before hiding after hover/focus leaves.                                |
| `skipDelayDuration` | `300`            | Window (ms) after a peer closes during which the next open is instant.    |
| `side`              | `'top'`          | Anchor side for cards that don't set `side` themselves.                   |
| `align`             | `'center'`       | Alignment along `side` for cards that don't set `align` themselves.       |
| `sideOffset`        | `8`              | Main-axis gap (px) for cards that don't set `sideOffset` themselves.      |
| `collisionPadding`  | `8`              | Collision-middleware padding (px) for cards that don't set it themselves. |

Per-instance inputs always win over the scope defaults.

The HoverCard coordinator is **independent** from `TooltipCoordinator` — the two patterns have different cadences and shouldn't share their skip-delay windows.

```ts
import { provideForHoverCardDefaults } from 'forty-cdk/hover-card';

// Right-aligned profile cards app-wide
bootstrapApplication(App, {
  providers: [provideForHoverCardDefaults({ side: 'right', sideOffset: 4 })],
});

// component-level override layers on top, per key
@Component({
  providers: [provideForHoverCardDefaults({ openDelay: 200 })],
  ...
})
class ProfileList {}
```

## Imperative show and hide

For programmatic control beyond hover and focus — e.g. a wrapper that opens the card from an external event — `ForHoverCard` exposes `show()` and `hide()` methods. Grab the root with a template reference (`#card="forHoverCard"`) and call them:

```ts
import { Component } from '@angular/core';
import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';

@Component({
  selector: 'demo-imperative',
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  template: `
    <span forHoverCard #card="forHoverCard">
      <a forHoverCardTrigger href="/users/ada">Ada Lovelace</a>
      @if (card.open()) {
        <div forHoverCardContent>Mathematician — designed the first algorithm.</div>
      }
    </span>

    <button type="button" (click)="card.show()">Show</button>
    <button type="button" (click)="card.hide()">Hide</button>
  `,
})
export class DemoImperative {}
```

Both mirror the hover / focus lifecycle rather than bypassing it:

- `show()` schedules the open after the resolved `openDelay` (instant when the delay is `0` or the scope's skip-delay window is active). It is a no-op while `disabled`, and a no-op while an ancestor is scrolling (the scroll-dismiss suppression window) — the same gates a hover open passes.
- `hide()` schedules the close after the resolved `closeDelay` and disarms the pointer-grace bridge.

For an **instant, unconditional** open or close that ignores the delays and every gate, write the `[(open)]` model directly (`open.set(true)` / `open.set(false)`) instead.

## Keyboard

- **Tab** to the trigger → opens the card after `openDelay`.
- **Blur** (Tab away) → closes the card after `closeDelay`.
- **Escape** while open → closes immediately, regardless of where focus currently lives (trigger, portaled content, or an unrelated element). Routed through a document-level dismissible layer that is active only while the card is open. Call `preventDefault()` on the `(escapeKeyDown)` output to keep it open.

## Behavior notes

- **Closes on scroll.** When an ancestor scroll container moves content under a stationary cursor (wheel / trackpad scrolling a virtualized or overflow-scroll list), an open card closes immediately and hover opens stay suppressed for a short window while the scroll is in flight — so cards on rows sliding past the pointer don't linger or flicker open. This is always on; a genuine pointer move after scrolling settles opens the card normally again. The keyboard-focus open path is never suppressed.
- **Arrow offset**: `[forHoverCardArrow]` writes `position: absolute`, the floating-ui-resolved `left` / `top`, and `var(--for-arrow-offset, 0px)` on the side opposite the card. Set `--for-arrow-offset` on the arrow element (or any ancestor) to control how far the arrow pokes out — typically a negative `px` value such as `-4px`. The helper ships no default visual.

## Accessibility

- **Not for tooltips.** If your overlay is a non-interactive label / hint, use `[forTooltip]`. HoverCard does not set `aria-describedby`; the trigger keeps its own label.
- **Trigger must stand alone.** Keyboard users don't see hover-only previews. Make sure the trigger's text / `aria-label` already describes its destination or action.
- **Focus opens the card** so keyboard users get the preview when tabbing through a list. Blur closes it; Escape closes immediately, no matter where focus currently lives — on the trigger, on a link inside the content, or on an unrelated element (the common case for a card opened by hover). Escape is routed through a document-level dismissible layer that is active only while the card is open.
- **Pointer interaction inside the card.** Moving the cursor from the trigger to the content cancels the close timer, so users can copy text or follow nested links. A pointer-grace "safe triangle" bridges the gap between the trigger and the content: while the pointer travels across the default `sideOffset` gap toward the card it is assumed to be heading there, so the card stays open even when `closeDelay` is `0`. This also holds when the content overlaps its trigger (a negative `sideOffset`). The card closes once the pointer leaves the safe triangle without reaching the card, or on blur / Escape / scroll.
- **Use `provideForHoverCardDefaults` per scope** when you need a different cadence for, e.g., a list of profile cards (faster) vs. a sidebar of glossary entries (slower).

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

### CSS custom properties

See also: [Styling floating content](../../../docs/styling-floating-content.md) — animation rules, standalone `scale`/`opacity`, and the arrow recipe.

`[forHoverCardContent]` is portaled to `document.body` and gets its position resolved by floating-ui. It exposes that geometry as custom properties on the content host (cleared on close), and `[forHoverCardArrow]` reads the consumer-settable `--for-arrow-offset`:

| Element                 | Custom property                  | Type / range        | Direction | Meaning                                                                                                      |
| ----------------------- | -------------------------------- | ------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `[forHoverCardContent]` | `--for-anchor-width`             | px                  | out       | Trigger (reference) width.                                                                                   |
| `[forHoverCardContent]` | `--for-anchor-height`            | px                  | out       | Trigger (reference) height.                                                                                  |
| `[forHoverCardContent]` | `--for-available-width`          | px                  | out       | Space available along the inline axis (floating-ui `size` middleware) — clamp with `max-width`.              |
| `[forHoverCardContent]` | `--for-available-height`         | px                  | out       | Space available along the block axis — clamp with `max-height`.                                              |
| `[forHoverCardContent]` | `--for-content-transform-origin` | `<origin>` keywords | out       | `transform-origin` matching the resolved side / align, so a `scale` enter animation pivots from the trigger. |
| `[forHoverCardArrow]`   | `--for-arrow-offset`             | px (default `0px`)  | in        | Consumer-set. How far the arrow pokes out past the card edge — typically a negative `px` (e.g. `-4px`).      |

> `[forHoverCardContent]` (and the projected `[forHoverCardArrow]`) is portaled to `document.body`, so it sits outside your component's view-encapsulated styles. Style it with **global CSS or a class** you pass on the content element — component-scoped styles won't reach it. The positioner also writes the shared geometry custom properties listed above (`--for-anchor-width` / `-height`, `--for-available-width` / `-height`, `--for-content-transform-origin`); see [Styling floating content](../../../docs/styling-floating-content.md) for the full list and the side/align animation recipe.

```css
.card[data-state='open'] {
  animation: card-in 120ms ease-out;
}
.card {
  max-width: var(--for-available-width);
  transform-origin: var(--for-content-transform-origin);
}
```

### Reduced motion

`[forHoverCard]` and `[forHoverCardContent]` reflect `data-reduced-motion` (present / absent) whenever the OS `prefers-reduced-motion: reduce` media query matches, so you can opt your own transitions out without re-deriving the query in CSS or TypeScript. The attribute flips reactively if the preference changes mid-session.

```css
.card[data-reduced-motion] {
  animation: none;
  transition: none;
}
```

The card's open / close delays are hover-intent debouncing rather than motion, so they are deliberately left unchanged under reduced motion — only the visual transitions (which are yours) should opt out.

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_HOVER_CARD_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
