import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForScrollArea,
  ForScrollAreaContent,
  ForScrollAreaCorner,
  ForScrollAreaScrollbar,
  ForScrollAreaThumb,
  ForScrollAreaViewport,
  type ForScrollAreaType,
} from 'forty-cdk';

/**
 * Fixture for the synthetic-scrollbar math that Vitest can't exercise — jsdom
 * returns zeros from `clientWidth` / `scrollWidth` / `clientHeight` /
 * `scrollHeight`, and doesn't run CSS. The viewport is laid out at a fixed
 * pixel size and the content at a fixed (usually oversized) size so the
 * browser produces real measured rects; Playwright then asserts the thumb's
 * geometry, drives drag gestures on it, and exercises `ResizeObserver` by
 * navigating with different query params.
 *
 * `type="always"` (the default here) keeps both scrollbars painted and
 * `data-state="visible"` regardless of overflow or hover / scroll interaction,
 * so specs don't need to fake pointerenter on the root before measuring — and
 * the divergence block asserts the track stays painted when content fits
 * (where `auto` self-hides). `?type=hover` and `?type=scroll` exercise the
 * visibility-mode contract (`data-state` toggling on pointerenter / leave and
 * on scroll-then-fade) against real layout.
 *
 * Query params (all default to a useful baseline that produces both axes of
 * overflow against a 300×200 viewport with 1000×800 content):
 *  - `?viewportWidth=N` — viewport width in CSS pixels (default 300).
 *  - `?viewportHeight=N` — viewport height in CSS pixels (default 200).
 *  - `?contentWidth=N` — content width in CSS pixels (default 1000).
 *  - `?contentHeight=N` — content height in CSS pixels (default 800).
 *  - `?type=auto|always|hover|scroll` — scrollbar visibility mode (default
 *    always). `always` keeps the track painted regardless of overflow; `auto`
 *    self-hides when content fits — the divergence block asserts both against
 *    real layout.
 *  - `?dir=ltr|rtl` — writing direction bound to `[dir]` on the root (default
 *    unset → ambient `ltr`). `rtl` pins the horizontal thumb to the right edge
 *    and inverts the drag, exercised by the RTL block.
 *  - `?hideOnLeave=1` — collapse a `data-state="hidden"` scrollbar to
 *    `display:none` (a consumer fade rule), used by the drag-survives-self-hide
 *    spec to prove an in-flight drag pins the track painted.
 */
@Component({
  selector: 'app-scroll-area-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-hide-on-leave]': 'hideOnLeave ? "" : null',
  },
  imports: [
    ForScrollArea,
    ForScrollAreaViewport,
    ForScrollAreaContent,
    ForScrollAreaScrollbar,
    ForScrollAreaThumb,
    ForScrollAreaCorner,
  ],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      [forScrollArea] {
        position: relative;
        background: #f5f5f5;
        border: 1px solid #ccc;
      }
      [forScrollAreaViewport] {
        position: relative;
        width: 100%;
        height: 100%;
      }
      [forScrollAreaContent] {
        /* A simple solid block so the browser's layout produces a deterministic
           scroll{Width,Height} equal to the inline width / height styles. */
        background: linear-gradient(135deg, #eef 0%, #fee 100%);
      }
      [forScrollAreaScrollbar] {
        position: absolute;
        background: rgba(0, 0, 0, 0.06);
        /* Force-visible regardless of hover so the spec doesn't have to
           pointerenter the root to read the thumb's bounding box. */
        opacity: 1;
        /* A consumer display rule (author selector). The directive's inline
           display:none must still win while the scrollbar is hidden — the
           type="auto" self-hide spec asserts toBeHidden() against this. */
        display: flex;
      }
      /* Opt-in consumer fade rule: when the host carries [data-hide-on-leave],
         a scrollbar in the hidden state collapses to display:none. The
         drag-survives-self-hide spec uses this to prove an in-flight drag pins
         the track visible (so it is never collapsed mid-gesture). */
      :host([data-hide-on-leave]) [forScrollAreaScrollbar][data-state='hidden'] {
        display: none;
      }
      [forScrollAreaScrollbar][orientation='vertical'] {
        top: 0;
        right: 0;
        width: 10px;
        height: 100%;
      }
      [forScrollAreaScrollbar][orientation='horizontal'] {
        left: 0;
        bottom: 0;
        height: 10px;
        width: 100%;
      }
      [forScrollAreaThumb] {
        background: rgba(0, 0, 0, 0.5);
        border-radius: 4px;
      }
      /* The thumb directive sets only the axis-aligned dimension via
         inline styles ([style.height.px] for vertical, [style.width.px]
         for horizontal). Fill the perpendicular axis so the thumb has a
         real hit area — otherwise vertical thumb is 0px wide and
         Playwright's pointer lands outside it (and toBeVisible() reports
         zero bounding box). */
      [forScrollAreaScrollbar][orientation='vertical'] [forScrollAreaThumb] {
        width: 100%;
      }
      [forScrollAreaScrollbar][orientation='horizontal'] [forScrollAreaThumb] {
        height: 100%;
      }
      [forScrollAreaCorner] {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 10px;
        height: 10px;
        background: rgba(0, 0, 0, 0.1);
        /* A consumer display rule (author selector). The directive's inline
           display:none must still win while the corner is hidden — see the
           "consumer display rule cannot leak through" spec. */
        display: flex;
      }
    `,
  ],
  template: `
    <input data-testid="before" placeholder="before-scroll-area" />
    <div
      data-testid="root"
      forScrollArea
      [type]="type"
      [dir]="dir"
      [style.width.px]="viewportWidth"
      [style.height.px]="viewportHeight"
    >
      <div data-testid="viewport" forScrollAreaViewport>
        <div
          data-testid="content"
          forScrollAreaContent
          [style.width.px]="contentWidth"
          [style.height.px]="contentHeight"
        ></div>
      </div>
      <div data-testid="scrollbar-vertical" forScrollAreaScrollbar orientation="vertical">
        <div data-testid="thumb-vertical" forScrollAreaThumb></div>
      </div>
      <div data-testid="scrollbar-horizontal" forScrollAreaScrollbar orientation="horizontal">
        <div data-testid="thumb-horizontal" forScrollAreaThumb></div>
      </div>
      <div data-testid="corner" forScrollAreaCorner></div>
    </div>
    <input data-testid="after" placeholder="after-scroll-area" />

    <output data-testid="ratio-vertical">{{ ratioVertical }}</output>
    <output data-testid="ratio-horizontal">{{ ratioHorizontal }}</output>
  `,
})
export class ScrollAreaFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly viewportWidth = this.#numParam('viewportWidth', 300);
  protected readonly viewportHeight = this.#numParam('viewportHeight', 200);
  protected readonly contentWidth = this.#numParam('contentWidth', 1000);
  protected readonly contentHeight = this.#numParam('contentHeight', 800);
  protected readonly type = this.#typeParam();
  protected readonly dir = this.#dirParam();

  /**
   * Opt-in consumer fade: when `?hideOnLeave=1` the host collapses any
   * `data-state="hidden"` scrollbar to `display:none`, mirroring a consumer
   * that hides the track on `type="hover"` leave. The drag-survives-self-hide
   * spec uses it to prove an in-flight drag keeps the track painted.
   */
  protected readonly hideOnLeave = this.#route.snapshot.queryParamMap.get('hideOnLeave') === '1';

  /**
   * Expected ratios surfaced as `<output>` so a spec can read them as plain
   * text — useful for the resize case where the spec wants to compare the
   * pre- and post-navigation ratios without recomputing the formula itself.
   */
  protected readonly ratioVertical = this.viewportHeight / this.contentHeight;
  protected readonly ratioHorizontal = this.viewportWidth / this.contentWidth;

  #numParam(key: string, fallback: number): number {
    const raw = this.#route.snapshot.queryParamMap.get(key);
    if (!raw) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  #typeParam(): ForScrollAreaType {
    const raw = this.#route.snapshot.queryParamMap.get('type');
    return raw === 'hover' || raw === 'scroll' || raw === 'auto' ? raw : 'always';
  }

  #dirParam(): 'ltr' | 'rtl' | null {
    const raw = this.#route.snapshot.queryParamMap.get('dir');
    return raw === 'rtl' || raw === 'ltr' ? raw : null;
  }
}
