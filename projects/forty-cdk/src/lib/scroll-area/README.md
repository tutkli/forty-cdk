# ScrollArea

Headless custom-scrollbar primitive. Hides native scrollbars on the inner viewport and exposes synthetic `scrollbar` + `thumb` + `corner` directives that the consumer styles freely.

This is the **only** primitive in forty-cdk that ships CSS — a single `<style>` tag (id `for-scroll-area-hide-native`) is injected into `document.head` the first time a viewport mounts. It hides webkit / Firefox / IE native scrollbars on `[forScrollAreaViewport]` only, leaving the rest of your CSS untouched.

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForScrollArea` | `[forScrollArea]` | Root. Owns `type`, `scrollHideDelay`, hover / scrolling state. |
| `ForScrollAreaViewport` | `[forScrollAreaViewport]` | The actual scrolling element. |
| `ForScrollAreaScrollbar` | `[forScrollAreaScrollbar]` | Synthetic track. Required `orientation`. |
| `ForScrollAreaThumb` | `[forScrollAreaThumb]` | Draggable thumb sized & translated automatically. |
| `ForScrollAreaCorner` | `[forScrollAreaCorner]` | Only shows when both scrollbars are visible. |

## Inputs (root)

| API | Type | Description |
| --- | --- | --- |
| `type` | `input<'auto' \| 'always' \| 'scroll' \| 'hover'>` | Visibility behavior. Default `'hover'`. |
| `scrollHideDelay` | `input<number>` | ms after the most recent scroll before scrollbars fade (`'scroll'` and `'hover'`). Default `600`. |
| `dir` | `input<WritingDirection>` | Reflected as `dir`. |

The scrollbar reflects `data-orientation`, `data-state` (`'visible'` / `'hidden'`); the thumb reflects `data-orientation` and `data-state`. Position is driven by inline `transform: translate{X,Y}(…)` on the thumb.

## Usage

```ts
import { Component } from '@angular/core';
import {
  ForScrollArea, ForScrollAreaViewport, ForScrollAreaScrollbar,
  ForScrollAreaThumb, ForScrollAreaCorner,
} from 'forty-cdk';

@Component({
  selector: 'demo-scroll',
  imports: [
    ForScrollArea, ForScrollAreaViewport, ForScrollAreaScrollbar,
    ForScrollAreaThumb, ForScrollAreaCorner,
  ],
  template: `
    <div forScrollArea>
      <div forScrollAreaViewport>
        <div class="content">…lots of stuff…</div>
      </div>
      <div forScrollAreaScrollbar orientation="vertical">
        <div forScrollAreaThumb></div>
      </div>
      <div forScrollAreaScrollbar orientation="horizontal">
        <div forScrollAreaThumb></div>
      </div>
      <div forScrollAreaCorner></div>
    </div>
  `,
  styles: [
    `
      [forScrollArea]            { position: relative; width: 240px; height: 240px; }
      [forScrollAreaViewport]    { position: absolute; inset: 0; }
      [forScrollAreaScrollbar][orientation="vertical"]   { position: absolute; top: 0; right: 0; width: 8px; height: 100%; background: rgba(0,0,0,.04); transition: opacity .2s; }
      [forScrollAreaScrollbar][orientation="horizontal"] { position: absolute; bottom: 0; left: 0; height: 8px; width: 100%; background: rgba(0,0,0,.04); transition: opacity .2s; }
      [forScrollAreaScrollbar][data-state="hidden"]      { opacity: 0; pointer-events: none; }
      [forScrollAreaThumb]                               { background: rgba(0,0,0,.4); border-radius: 4px; }
      [forScrollAreaCorner]                              { position: absolute; right: 0; bottom: 0; width: 8px; height: 8px; background: rgba(0,0,0,.04); }
    `,
  ],
})
export class DemoScroll {}
```

## Notes

- **Native scrollbars are hidden globally on `[forScrollAreaViewport]`** via an injected `<style>` tag. If you need to opt out (e.g. for a debug build), remove `#for-scroll-area-hide-native` from the head — but that defeats the primitive's purpose.
- **Keyboard scrolling stays native.** PageUp / PageDown / arrows / Tab still scroll the viewport because the underlying element keeps `overflow: scroll`. The thumb is just a visual + drag affordance.
- **Drag uses pointer-capture** so the cursor doesn't lose the thumb if it briefly leaves the track.
- **Minimum thumb size is 8px**, matching common UI conventions for very long content.
- **The corner only shows when both scrollbars are visible.** Otherwise it's removed via `[hidden]` (the only place the rule "primitives never apply `[hidden]`" doesn't apply — the corner has no logical presence without two scrollbars).
- **Two ResizeObservers per viewport**: one on the viewport itself, one on the first child (the content). This way, content size changes are picked up reactively without polling.
