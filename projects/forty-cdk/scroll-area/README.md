# ScrollArea

A scrollable region with cross-browser, stylable synthetic scrollbars.

Hides native scrollbars on the inner viewport and exposes synthetic `scrollbar` + `thumb` + `corner` directives that the consumer styles freely. This is the **only** primitive in forty-cdk that ships CSS — a single `<style>` tag (id `for-scroll-area-hide-native`) is injected into `document.head` the first time a viewport mounts. It hides webkit / Firefox / IE native scrollbars on `[forScrollAreaViewport]` only, leaving the rest of your CSS untouched.

## Anatomy

```html
<div forScrollArea type="hover">
  <div forScrollAreaViewport>
    <div forScrollAreaContent>… long content …</div>
  </div>
  <div forScrollAreaScrollbar orientation="vertical">
    <div forScrollAreaThumb></div>
  </div>
  <div forScrollAreaScrollbar orientation="horizontal">
    <div forScrollAreaThumb></div>
  </div>
  <div forScrollAreaCorner></div>
</div>
```

## Examples

```ts
import { Component } from '@angular/core';
import {
  ForScrollArea,
  ForScrollAreaContent,
  ForScrollAreaCorner,
  ForScrollAreaScrollbar,
  ForScrollAreaThumb,
  ForScrollAreaViewport,
} from 'forty-cdk/scroll-area';

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

## API

### `ForScrollArea`

Root directive. Owns scroll type, hide-delay, hover state, and writing direction.

| Property                   | Type                                               | Description                                                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                     | `input<'auto' \| 'always' \| 'scroll' \| 'hover'>` | Visibility behavior. `'always'` keeps the track painted even with no overflow; `'auto'` self-hides — see [Behavior notes](#behavior-notes) and the grid example for reserving the gutter.<br>**Default:** `'hover'` |
| `scrollHideDelay`          | `input<number>`                                    | ms after the most recent scroll before scrollbars fade (`'scroll'` and `'hover'`).<br>**Default:** `600`                                                                                                            |
| `trackPress`               | `input<'none' \| 'page' \| 'jump'>`                | What a primary-button press on bare track does — see [Behavior notes](#behavior-notes).<br>**Default:** `'page'`                                                                                                    |
| `trackPressRepeatDelay`    | `input<number>`                                    | ms a held `trackPress="page"` gesture waits before the first auto-repeat step.<br>**Default:** `300`                                                                                                                |
| `trackPressRepeatInterval` | `input<number>`                                    | ms between auto-repeat steps of a held `trackPress="page"` gesture.<br>**Default:** `50`                                                                                                                            |
| `dir`                      | `input<WritingDirection>`                          | Reflected as `dir`.<br>**Default:** —                                                                                                                                                                               |

All three `trackPress*` defaults are read from `provideForScrollAreaDefaults` for the surrounding scope, so an app can opt out of track-press paging in one place with `provideForScrollAreaDefaults({ trackPress: 'none' })`.

| Data attribute | Values                                    |
| -------------- | ----------------------------------------- |
| `data-type`    | `auto` \| `always` \| `scroll` \| `hover` |

The resolved writing direction is reflected on the root via the native `dir` attribute (`ltr` / `rtl`), not a `data-*` hook — select on `[dir='rtl']` / `:dir(rtl)` to flip layout.

### `ForScrollAreaViewport`

The actual scrolling element. Hides native scrollbars and reports scroll position and geometry to the root. Carries no `data-*` attributes.

| Property    | Type             | Description                                                                                                                                                                                            |
| ----------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `focusable` | `input<boolean>` | Whether the viewport is a keyboard tab stop. When `true`, emits `tabindex="0"` so the scroll container is focusable and gets native keyboard scrolling. Set `false` to opt out.<br>**Default:** `true` |

Reflects `tabindex="0"` while `focusable` is `true`; no `tabindex` attribute when `false`.

### `ForScrollAreaContent`

Marks the content element inside the viewport so its size changes drive the synthetic scrollbar. Carries no `data-*` attributes.

### `ForScrollAreaScrollbar`

Synthetic track. It measures its own length and derives the axis geometry from it; the thumb renders from those signals.

| Property      | Type                                         | Description                                      |
| ------------- | -------------------------------------------- | ------------------------------------------------ |
| `orientation` | `input.required<'horizontal' \| 'vertical'>` | Which axis this track scrolls.<br>**Default:** — |

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-state`       | `visible` \| `hidden`      |

The track self-removes via the `hidden` attribute plus an inline `display: none` when its axis has no overflow (except under `type="always"`).

It also owns the axis geometry (the thumb renders from it) and the scroll commands a track gesture needs. Reach them through the template reference `#bar="forScrollAreaScrollbar"` when `trackPress="none"` and you want to build the gesture yourself:

| Member                        | Type                              | Description                                                                                      |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `trackLength`                 | `Signal<number>`                  | Measured track length along this axis, in CSS pixels.                                            |
| `thumbSize`                   | `Signal<number>`                  | Rendered thumb length (ratio × track, floored at 8px).                                           |
| `usableTrack`                 | `Signal<number>`                  | Travel available to the thumb (`trackLength − thumbSize`).                                       |
| `thumbOffset`                 | `Signal<number>`                  | Thumb offset from the track's start edge.                                                        |
| `maxScroll`                   | `Signal<number>`                  | Maximum scroll offset of this axis.                                                              |
| `scrollPosition`              | `Signal<number>`                  | Scroll offset normalised to a start-edge origin in `[0, maxScroll]` (RTL absorbed).              |
| `pageStep`                    | `Signal<number>`                  | One page step in scroll pixels.                                                                  |
| `pressing`                    | `Signal<boolean>`                 | True while a track press is in flight.                                                           |
| `trackPointFromEvent(event)`  | `(event: PointerEvent) => number` | Press offset from the track's start edge (measured from `rect.left` in both writing directions). |
| `scrollToPosition(position)`  | `(position: number) => void`      | Scrolls the axis to a start-edge-origin position, clamped into range.                            |
| `scrollToTrackPoint(trackPx)` | `(trackPx: number) => void`       | Centres the thumb on a track offset.                                                             |
| `pageBy(direction)`           | `(direction: -1 \| 1) => void`    | Steps one page backward / forward.                                                               |

```html
<div
  forScrollAreaScrollbar
  orientation="vertical"
  #bar="forScrollAreaScrollbar"
  (pointerdown)="onTrackPress($event, bar)"
>
  <div forScrollAreaThumb></div>
</div>
```

```ts
onTrackPress(event: PointerEvent, bar: ForScrollAreaScrollbar): void {
  if (event.button !== 0) return;
  const point = bar.trackPointFromEvent(event);
  if (point >= bar.thumbOffset() && point <= bar.thumbOffset() + bar.thumbSize()) return;
  bar.pageBy(point < bar.thumbOffset() ? -1 : 1);
}
```

### `ForScrollAreaThumb`

Draggable thumb, sized and translated automatically. Mirrors its scrollbar's orientation and state.

| Data attribute     | Values                     |
| ------------------ | -------------------------- |
| `data-orientation` | `horizontal` \| `vertical` |
| `data-state`       | `visible` \| `hidden`      |

### `ForScrollAreaCorner`

Filler in the corner where horizontal and vertical scrollbars meet. Shows only when both scrollbars are visible (or always, under `type="always"`), self-removing via the `hidden` attribute plus an inline `display: none` otherwise. Carries no `data-*` attributes.

## Behavior notes

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

  With `type="always"` the vertical track's grid column is always filled, so the viewport width stays constant whether or not the content overflows — no reflow when it crosses the boundary. The `position: absolute` layout in the [Examples](#examples) section above is the right default for `auto` / `hover` / `scroll`, where an overlaid self-hiding scrollbar is the desired look.

- **Native scrollbars are hidden globally on `[forScrollAreaViewport]`** via an injected `<style>` tag. If you need to opt out (e.g. for a debug build), remove `#for-scroll-area-hide-native` from the head — but that defeats the primitive's purpose.
- **Keyboard scrolling is native, via a focusable viewport.** `[forScrollAreaViewport]` carries `tabindex="0"` by default, so it is a tab stop and the browser gives the focused overflow container native arrow / PageUp / PageDown / Home / End / Space scrolling — this works in every browser, including Safari (which, unlike Chrome/Firefox, does not make a non-focusable overflow container keyboard-scrollable). The scrollbar is a pointer affordance only (thumb drag + track press) and never a tab stop. If the projected content already holds focusable elements and you don't want the extra tab stop, set `[focusable]="false"` on the viewport.
- **Drag uses pointer-capture** so the cursor doesn't lose the thumb if it briefly leaves the track. The `pointermove` / `pointerup` listeners are attached to the owner document (capture still routes them there), and an in-flight drag pins the track `data-state="visible"` and painted — so a drag is never silently aborted if the scrollbar would otherwise self-hide mid-gesture (e.g. a `type="scroll"` fade, or a consumer `display: none` on `[data-state="hidden"]`).
- **RTL is handled on the horizontal axis.** When the root resolves to `dir="rtl"`, the horizontal thumb starts pinned to the right edge of the track and a leftward drag scrolls the content forward (the browser's native negative-`scrollLeft` model). Set the direction the standard way — `[dir]` on the root or an ancestor `dir` attribute.
- **Minimum thumb size is 8px**, matching common UI conventions for very long content.
- **A press on bare track scrolls, like a native scrollbar.** `trackPress` on the root picks the behaviour:
  - `'page'` (default) steps one page toward the press, then auto-repeats while the pointer is held (`trackPressRepeatDelay` ms, then every `trackPressRepeatInterval` ms) and **stops once the thumb reaches the pointer** instead of overshooting — moving the pointer further along the track resumes it. One page is `max(clientSize × 0.875, clientSize − 40, 1)` scroll pixels, so a step keeps a sliver of the previous page in view.
  - `'jump'` centres the thumb on the press point immediately, then keeps scrubbing while the pointer is held and moved.
  - `'none'` ignores track presses entirely — the escape hatch for a hand-rolled gesture built on the scrollbar's commands (see [`ForScrollAreaScrollbar`](#forscrollareascrollbar)).

  A track press claims the gesture with `preventDefault()` (so the browser starts no text selection) and uses pointer-capture with document-level listeners, exactly like the thumb drag; the track is pinned `data-state="visible"` and painted while the press is in flight, so a `type="hover"` / `"scroll"` fade can't collapse it mid-gesture. A press whose `defaultPrevented` is already set — a consumer handler on the same element that ran first — is left alone, and a press that lands on the thumb belongs to the thumb's drag. RTL works on the horizontal axis with no extra wiring: the press point maps through the same left-origin space the thumb uses, so pressing before the (right-resting) thumb steps the logical scroll forward.

- **A track press never moves focus.** A native scrollbar is not focusable and a press on one does not move focus, so neither does this one — the `preventDefault()` also suppresses the implicit focus-on-pointerdown. This is deliberately the opposite of `[forSliderTrack]`, where a press changes a _value_ on a focusable widget. Keyboard scrolling stays the focusable viewport's job.
- **Motion is yours: the library writes plain `scrollTop` / `scrollLeft`.** No `behavior: 'smooth'` is shipped, so animate a track press by setting `scroll-behavior` on `[forScrollAreaViewport]` and gating it yourself — that is also the primitive's `prefers-reduced-motion` hook:

  ```css
  .scroll-area-viewport {
    scroll-behavior: smooth;
  }
  @media (prefers-reduced-motion: reduce) {
    .scroll-area-viewport {
      scroll-behavior: auto;
    }
  }
  ```

- **For reliable touch track presses, give the scrollbar `touch-action: none`.** The library adds no inline `touch-action` (on the track or the thumb), so on touch a press-and-drag on the track can also pan the page. Add the rule in your own CSS on `[forScrollAreaScrollbar]` when you want the gesture to belong to the scrollbar.
- **The corner only shows when both scrollbars are visible** (or always, under `type="always"`, where both tracks are permanently present). Otherwise the directive hides it with an inline `display: none` in addition to the `hidden` attribute that removes it from the accessibility tree (the only place the rule "primitives never apply `[hidden]`" doesn't apply — the corner has no logical presence without two scrollbars). Because the inline style beats any author selector rule, you can give `[forScrollAreaCorner]` a custom `display` without a `.x[hidden] { display: none }` workaround — the directive's `display: none` still wins while the corner is hidden, and your `display` applies once both scrollbars show.
- **Content observation is opt-in**: the viewport observes its own size automatically, but only observes the content element when the consumer tags it with `[forScrollAreaContent]`. Skipping the directive is allowed (the viewport still scrolls and the scrollbars still render); the scrollbars just won't react to content reflows. The library never guesses `firstElementChild`, since that silently breaks when content is wrapped in a layer or split across siblings.

## Accessibility

The synthetic scrollbars are pointer affordances only — they carry no ARIA roles, are not focusable, and neither a thumb drag nor a track press moves focus (mirroring a native scrollbar). The corner element is removed from the accessibility tree via the `hidden` attribute when not visible.

`[forScrollAreaViewport]` is focusable by default (`tabindex="0"`), so keyboard users can Tab to the scroll container and scroll it with the arrow keys / PageUp / PageDown / Home / End / Space in every browser — including Safari, which does not make a non-focusable overflow container keyboard-scrollable. Because the viewport is now a tab stop, **recommend** giving it `role="region"` plus an accessible label so screen-reader users know what the focusable container is:

```html
<div forScrollAreaViewport role="region" aria-label="Release notes">
  <div forScrollAreaContent>… long content …</div>
</div>
```

The label may instead point at a visible heading with `aria-labelledby`. The library does not force a `role` on the viewport: a `role="region"` without an accessible name is itself an accessibility anti-pattern, and only the consumer knows the content's name — so the role and label stay opt-in. If the projected content is already a labelled, keyboard-focusable region, set `[focusable]="false"` on the viewport to avoid a redundant tab stop.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes listed per piece in the [API](#api) section.

```css
.scroll-area-scrollbar[data-state='hidden'] {
  opacity: 0;
  pointer-events: none;
}

.scroll-area-scrollbar[data-orientation='vertical'] {
  width: 8px;
}
```

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_SCROLL_AREA_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
