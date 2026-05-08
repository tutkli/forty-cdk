# HoverCard

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

| Output          | Payload         | Description                                                                                                                                                              |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `escapeKeyDown` | `KeyboardEvent` | Fires when Escape is pressed while the card is open, regardless of whether focus is on the trigger or inside the portaled content. Call `preventDefault()` to keep open. |

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

## Accessibility notes

- **Not for tooltips.** If your overlay is a non-interactive label / hint, use `[forTooltip]`. HoverCard does not set `aria-describedby`; the trigger keeps its own label.
- **Trigger must stand alone.** Keyboard users don't see hover-only previews. Make sure the trigger's text / `aria-label` already describes its destination or action.
- **Focus opens the card** so keyboard users get the preview when tabbing through a list. Blur closes it; Escape closes immediately, whether focus is on the trigger or on a link inside the content.
- **Pointer interaction inside the card.** Moving the cursor from the trigger to the content cancels the close timer, so users can copy text or follow nested links.
- **Use `provideForHoverCardDefaults` per scope** when you need a different cadence for, e.g., a list of profile cards (faster) vs. a sidebar of glossary entries (slower).
