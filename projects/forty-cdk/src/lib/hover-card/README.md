# HoverCard

> New to overlays in forty-cdk? [Your first overlay](../../../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

Headless preview card that opens on hover or focus of a trigger. Use it for profile snapshots, link previews, definition cards — any **complementary** information that surfaces on dwell.

There is no APG pattern for HoverCard. Treat it as a presentational layer: the trigger must already convey full meaning (it's a link, a name, a tag), so keyboard-only users miss nothing if they never see the card. Card content can be interactive — that's its main difference from `[forTooltip]`, where APG bans it.

## Pieces

| Class                 | Selector                | Role                                                                                                                     |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `ForHoverCard`        | `[forHoverCard]`        | Root. Owns open state and delays.                                                                                        |
| `ForHoverCardTrigger` | `[forHoverCardTrigger]` | Element that opens the card on hover / focus.                                                                            |
| `ForHoverCardContent` | `[forHoverCardContent]` | The card surface. Portaled and floating-positioned. Pointer-enter cancels close, so the user can move the cursor inside. |
| `ForHoverCardArrow`   | `[forHoverCardArrow]`   | Optional arrow positioned by floating-ui.                                                                                |

## Inputs / models

| API           | Type                                                       | Description                                                                                                                                           |
| ------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`        | `WritableSignal<boolean>` (two-way bindable as `[(open)]`) | `(openChange)` fires only on internal transitions (delay timers, escape, blur, and the force-close that runs when `disabled` flips to true).          |
| `side`        | `input<FloatingSide>`                                      | Anchor side. Default `'top'`.                                                                                                                         |
| `align`       | `input<FloatingAlign>`                                     | Alignment along `side`. Default `'center'`.                                                                                                           |
| `sideOffset`  | `input<number>`                                            | Gap (px) between trigger and card along the main axis. Default `8`.                                                                                   |
| `alignOffset` | `input<number>`                                            | Gap (px) along the cross axis. Default `0`.                                                                                                           |
| `openDelay`   | `input<number \| undefined>`                               | Per-card override for open delay. Falls back to `provideForHoverCardDefaults` (700ms).                                                                |
| `closeDelay`  | `input<number \| undefined>`                               | Per-card override for close delay. Falls back to `provideForHoverCardDefaults` (300ms).                                                               |
| `disabled`    | `input<boolean>`                                           | When true, hover / focus interaction is ignored AND any open card is force-closed (with `(openChange)` firing so a `[(open)]` binding stays in sync). |

## Outputs

| Output          | Payload         | Description                                                                                                                                                                                |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `escapeKeyDown` | `KeyboardEvent` | Fires when Escape is pressed while the card is open, regardless of where focus currently lives (trigger, portaled content, or an unrelated element). Call `preventDefault()` to keep open. |

## Defaults

`provideForHoverCardDefaults({ openDelay, closeDelay, skipDelayDuration })` configures the cadence for an injector subtree. Each call establishes a coordinator scope: peer cards inside the scope share a skip-delay window (the next open is instant within `skipDelayDuration` after a peer closed); cards in other scopes don't.

The HoverCard coordinator is **independent** from `TooltipCoordinator` — the two patterns have different cadences and shouldn't share their skip-delay windows.

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  ForHoverCard,
  ForHoverCardTrigger,
  ForHoverCardContent,
  ForHoverCardArrow,
} from 'forty-cdk';

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

## Behavior notes

- **Arrow offset**: `[forHoverCardArrow]` writes `position: absolute`, the floating-ui-resolved `left` / `top`, and `var(--for-arrow-offset, 0px)` on the side opposite the card. Set `--for-arrow-offset` on the arrow element (or any ancestor) to control how far the arrow pokes out — typically a negative `px` value such as `-4px`. The helper ships no default visual.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

### Data attributes

| Piece                   | Attribute               | Values             |
| ----------------------- | ----------------------- | ------------------ |
| `[forHoverCard]`        | `data-state`            | `open` \| `closed` |
| `[forHoverCard]`        | `data-disabled`         | present \| absent  |
| `[forHoverCardTrigger]` | `data-state`            | `open` \| `closed` |
| `[forHoverCardContent]` | `data-state`            | `open` \| `closed` |
| `[forHoverCardArrow]`   | `data-hover-card-arrow` | present (always)   |

### CSS custom properties

See also: [Styling floating content](../../../../../docs/styling-floating-content.md) — animation rules, standalone `scale`/`opacity`, and the arrow recipe.

`[forHoverCardContent]` is portaled to `document.body` and gets its position resolved by floating-ui. It exposes that geometry as custom properties on the content host (cleared on close), and `[forHoverCardArrow]` reads the consumer-settable `--for-arrow-offset`:

| Element                 | Custom property                  | Type / range        | Direction | Meaning                                                                                                      |
| ----------------------- | -------------------------------- | ------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `[forHoverCardContent]` | `--for-anchor-width`             | px                  | out       | Trigger (reference) width.                                                                                   |
| `[forHoverCardContent]` | `--for-anchor-height`            | px                  | out       | Trigger (reference) height.                                                                                  |
| `[forHoverCardContent]` | `--for-available-width`          | px                  | out       | Space available along the inline axis (floating-ui `size` middleware) — clamp with `max-width`.              |
| `[forHoverCardContent]` | `--for-available-height`         | px                  | out       | Space available along the block axis — clamp with `max-height`.                                              |
| `[forHoverCardContent]` | `--for-content-transform-origin` | `<origin>` keywords | out       | `transform-origin` matching the resolved side / align, so a `scale` enter animation pivots from the trigger. |
| `[forHoverCardArrow]`   | `--for-arrow-offset`             | px (default `0px`)  | in        | Consumer-set. How far the arrow pokes out past the card edge — typically a negative `px` (e.g. `-4px`).      |

> `[forHoverCardContent]` (and the projected `[forHoverCardArrow]`) is portaled to `document.body`, so it sits outside your component's view-encapsulated styles. Style it with **global CSS or a class** you pass on the content element — component-scoped styles won't reach it. The positioner also writes the shared geometry custom properties listed above (`--for-anchor-width` / `-height`, `--for-available-width` / `-height`, `--for-content-transform-origin`); see [Styling floating content](../../../../../docs/styling-floating-content.md) for the full list and the side/align animation recipe.

```css
.card[data-state='open'] {
  animation: card-in 120ms ease-out;
}
.card {
  max-width: var(--for-available-width);
  transform-origin: var(--for-content-transform-origin);
}
```

## Accessibility notes

- **Not for tooltips.** If your overlay is a non-interactive label / hint, use `[forTooltip]`. HoverCard does not set `aria-describedby`; the trigger keeps its own label.
- **Trigger must stand alone.** Keyboard users don't see hover-only previews. Make sure the trigger's text / `aria-label` already describes its destination or action.
- **Focus opens the card** so keyboard users get the preview when tabbing through a list. Blur closes it; Escape closes immediately, no matter where focus currently lives — on the trigger, on a link inside the content, or on an unrelated element (the common case for a card opened by hover). Escape is routed through a document-level dismissable layer that is active only while the card is open.
- **Pointer interaction inside the card.** Moving the cursor from the trigger to the content cancels the close timer, so users can copy text or follow nested links.
- **Use `provideForHoverCardDefaults` per scope** when you need a different cadence for, e.g., a list of profile cards (faster) vs. a sidebar of glossary entries (slower).
