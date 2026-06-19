# ScrollArea

Headless custom-scrollbar primitive. Hides native scrollbars on the inner viewport and exposes synthetic `scrollbar` + `thumb` + `corner` directives that the consumer styles freely.

This is the **only** primitive in forty-cdk that ships CSS — a single `<style>` tag (id `for-scroll-area-hide-native`) is injected into `document.head` the first time a viewport mounts. It hides webkit / Firefox / IE native scrollbars on `[forScrollAreaViewport]` only, leaving the rest of your CSS untouched.

## Pieces

| Class                    | Selector                   | Role                                                                                             |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------ |
| `ForScrollArea`          | `[forScrollArea]`          | Root. Owns `type`, `scrollHideDelay`, hover / scrolling state.                                   |
| `ForScrollAreaViewport`  | `[forScrollAreaViewport]`  | The actual scrolling element.                                                                    |
| `ForScrollAreaContent`   | `[forScrollAreaContent]`   | Marks the content element inside the viewport so its size changes drive the synthetic scrollbar. |
| `ForScrollAreaScrollbar` | `[forScrollAreaScrollbar]` | Synthetic track. Required `orientation`.                                                         |
| `ForScrollAreaThumb`     | `[forScrollAreaThumb]`     | Draggable thumb sized & translated automatically.                                                |
| `ForScrollAreaCorner`    | `[forScrollAreaCorner]`    | Only shows when both scrollbars are visible.                                                     |

## Inputs (root)

| API               | Type                                               | Description                                                                                                                                                                                |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`            | `input<'auto' \| 'always' \| 'scroll' \| 'hover'>` | Visibility behavior. Default `'hover'`. `'always'` keeps the track painted even with no overflow; `'auto'` self-hides — see [Notes](#notes) and the grid example for reserving the gutter. |
| `scrollHideDelay` | `input<number>`                                    | ms after the most recent scroll before scrollbars fade (`'scroll'` and `'hover'`). Default `600`.                                                                                          |
| `dir`             | `input<WritingDirection>`                          | Reflected as `dir`.                                                                                                                                                                        |

The scrollbar reflects `data-orientation`, `data-state` (`'visible'` / `'hidden'`); the thumb reflects `data-orientation` and `data-state`. Position is driven by inline `transform: translate{X,Y}(…)` on the thumb.

## Usage

```ts
import { Component } from '@angular/core';
import {
  ForScrollArea,
  ForScrollAreaViewport,
  ForScrollAreaContent,
  ForScrollAreaScrollbar,
  ForScrollAreaThumb,
  ForScrollAreaCorner,
} from 'forty-cdk';

@Component({
  selector: 'demo-scroll',
  imports: [
    ForScrollArea,
    ForScrollAreaViewport,
    ForScrollAreaContent,
    ForScrollAreaScrollbar,
    ForScrollAreaThumb,
    ForScrollAreaCorner,
  ],
  template: `
    <div forScrollArea class="scroll-area">
      <div forScrollAreaViewport class="scroll-area-viewport">
        <div forScrollAreaContent class="content">…lots of stuff…</div>
      </div>
      <div forScrollAreaScrollbar class="scroll-area-scrollbar" orientation="vertical">
        <div forScrollAreaThumb class="scroll-area-thumb"></div>
      </div>
      <div forScrollAreaScrollbar class="scroll-area-scrollbar" orientation="horizontal">
        <div forScrollAreaThumb class="scroll-area-thumb"></div>
      </div>
      <div forScrollAreaCorner class="scroll-area-corner"></div>
    </div>
  `,
  styles: [
    `
      .scroll-area {
        position: relative;
        width: 240px;
        height: 240px;
      }
      .scroll-area-viewport {
        position: absolute;
        inset: 0;
      }
      .scroll-area-scrollbar[orientation='vertical'] {
        position: absolute;
        top: 0;
        right: 0;
        width: 8px;
        height: 100%;
        background: rgba(0, 0, 0, 0.04);
        transition: opacity 0.2s;
      }
      .scroll-area-scrollbar[orientation='horizontal'] {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 8px;
        width: 100%;
        background: rgba(0, 0, 0, 0.04);
        transition: opacity 0.2s;
      }
      .scroll-area-scrollbar[data-state='hidden'] {
        opacity: 0;
        pointer-events: none;
      }
      .scroll-area-thumb {
        background: rgba(0, 0, 0, 0.4);
        border-radius: 4px;
      }
      .scroll-area-corner {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 8px;
        height: 8px;
        background: rgba(0, 0, 0, 0.04);
      }
    `,
  ],
})
export class DemoScroll {}
```

## Notes

- **`type="always"` keeps a stable, always-painted track.** Unlike `auto` / `scroll` / `hover` — which render a scrollbar only for an axis that actually overflows and self-hide otherwise — `always` keeps both scrollbars (and the corner) mounted and `data-state="visible"` regardless of overflow. When the axis does not overflow the thumb fills the full track and dragging it is a no-op, so the track never appears/disappears as content crosses the overflow boundary.
- **Reserving the gutter with `type="always"` is the consumer's layout job.** forty-cdk is headless and does not own layout, so it cannot literally reserve a gutter — `always` only guarantees the track stays painted. To get "no content shift" behavior, lay the scrollbar out _in flow_ (a grid column) rather than `position: absolute`, so the always-present track occupies real space:

  ```css
  .scroll-area {
    display: grid;
    grid-template-columns: 1fr auto; /* content | reserved scrollbar gutter */
    grid-template-rows: 1fr auto;
    width: 240px;
    height: 240px;
  }
  .scroll-area-viewport {
    grid-column: 1;
    grid-row: 1;
  }
  .scroll-area-scrollbar[orientation='vertical'] {
    grid-column: 2;
    grid-row: 1;
    width: 8px;
  }
  .scroll-area-scrollbar[orientation='horizontal'] {
    grid-column: 1;
    grid-row: 2;
    height: 8px;
  }
  .scroll-area-corner {
    grid-column: 2;
    grid-row: 2;
  }
  ```

  With `type="always"` the vertical track's grid column is always filled, so the viewport width stays constant whether or not the content overflows — no reflow when it crosses the boundary. The `position: absolute` layout in the [Usage](#usage) example above is the right default for `auto` / `hover` / `scroll`, where an overlaid self-hiding scrollbar is the desired look.

- **Native scrollbars are hidden globally on `[forScrollAreaViewport]`** via an injected `<style>` tag. If you need to opt out (e.g. for a debug build), remove `#for-scroll-area-hide-native` from the head — but that defeats the primitive's purpose.
- **Keyboard scrolling stays native.** PageUp / PageDown / arrows / Tab still scroll the viewport because the underlying element keeps `overflow: scroll`. The thumb is just a visual + drag affordance.
- **Drag uses pointer-capture** so the cursor doesn't lose the thumb if it briefly leaves the track. The `pointermove` / `pointerup` listeners are attached to the owner document (capture still routes them there), and an in-flight drag pins the track `data-state="visible"` and painted — so a drag is never silently aborted if the scrollbar would otherwise self-hide mid-gesture (e.g. a `type="scroll"` fade, or a consumer `display: none` on `[data-state="hidden"]`).
- **RTL is handled on the horizontal axis.** When the root resolves to `dir="rtl"`, the horizontal thumb starts pinned to the right edge of the track and a leftward drag scrolls the content forward (the browser's native negative-`scrollLeft` model). Set the direction the standard way — `[dir]` on the root or an ancestor `dir` attribute.
- **Minimum thumb size is 8px**, matching common UI conventions for very long content.
- **The corner only shows when both scrollbars are visible** (or always, under `type="always"`, where both tracks are permanently present). Otherwise the directive hides it with an inline `display: none` in addition to the `hidden` attribute that removes it from the accessibility tree (the only place the rule "primitives never apply `[hidden]`" doesn't apply — the corner has no logical presence without two scrollbars). Because the inline style beats any author selector rule, you can give `[forScrollAreaCorner]` a custom `display` without a `.x[hidden] { display: none }` workaround — the directive's `display: none` still wins while the corner is hidden, and your `display` applies once both scrollbars show.
- **Content observation is opt-in**: the viewport observes its own size automatically, but only observes the content element when the consumer tags it with `[forScrollAreaContent]`. Skipping the directive is allowed (the viewport still scrolls and the scrollbars still render); the scrollbars just won't react to content reflows. The library never guesses `firstElementChild`, since that silently breaks when content is wrapped in a layer or split across siblings.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes below.

### Data attributes

| Piece                      | Attribute          | Values                                    |
| -------------------------- | ------------------ | ----------------------------------------- |
| `[forScrollArea]`          | `data-type`        | `auto` \| `always` \| `scroll` \| `hover` |
| `[forScrollAreaScrollbar]` | `data-orientation` | `horizontal` \| `vertical`                |
| `[forScrollAreaScrollbar]` | `data-state`       | `visible` \| `hidden`                     |
| `[forScrollAreaThumb]`     | `data-orientation` | `horizontal` \| `vertical`                |
| `[forScrollAreaThumb]`     | `data-state`       | `visible` \| `hidden`                     |

The resolved writing direction is reflected on the root via the native `dir` attribute (`ltr` / `rtl`), not a `data-*` hook — select on `[dir='rtl']` / `:dir(rtl)` to flip layout. `[forScrollAreaViewport]`, `[forScrollAreaContent]`, and `[forScrollAreaCorner]` carry no `data-*` attributes; the scrollbar and corner additionally self-remove via the `hidden` attribute plus an inline `display: none` when their axis has no overflow (except under `type="always"`).

```css
.scroll-area-scrollbar[data-state='hidden'] {
  opacity: 0;
  pointer-events: none;
}

.scroll-area-scrollbar[data-orientation='vertical'] {
  width: 8px;
}
```
