import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForToastManager,
  ForToastViewport,
  type ForToastSwipeDirection,
} from 'forty-cdk';

/**
 * Fixture for the swipe-dismiss / auto-dismiss / stacking behavior on
 * `ForToast`, which jsdom cannot honestly exercise:
 *
 * - swipe relies on `getBoundingClientRect` of the toast surface plus pointer
 *   velocity (ms gap between pointermoves);
 * - stacking depends on real CSS layout (toasts must stack vertically with
 *   distinct DOM positions);
 * - auto-dismiss timing is real-time and we deliberately run real timers in
 *   E2E (per CLAUDE.md guidance: "No fake timers — auto-dismiss tests use
 *   short real durations (≤ 500 ms)").
 *
 * Layout: the viewport is positioned `fixed` at the requested side. Toasts
 * stack on a vertical axis with a gap so their `getBoundingClientRect()`
 * surfaces distinct positions. Each toast surface is given an explicit
 * width / padding / background so the browser produces a real laid-out box
 * (jsdom-zero `boundingBox()` would break the swipe helper here).
 *
 * Query params:
 *  - `?side=top-right|top-left|top-center|bottom-right|bottom-left|bottom-center`
 *    — picks the corner / edge where the viewport anchors. Default `top-right`.
 *  - `?duration=N` — auto-dismiss duration (ms). Default `0` (sticky), so
 *    specs that don't care about auto-dismiss are not subject to the timer.
 *    The auto-dismiss spec uses `500`; the hover-pause spec uses a longer
 *    `2000` so Playwright's enqueue → visibility-check → hit-test → hover
 *    sequence cannot race the timer on slow CI.
 *  - `?autoDismiss=1` — shorthand for `?duration=500`. Used by tests that
 *    just want "auto-dismiss on" without picking a specific number.
 *  - `?swipe=right` — opt-in swipe direction wired through both the viewport
 *    and the per-toast config. `?swipe=down` for vertical drag, etc.
 */
@Component({
  selector: 'app-toast-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `ViewEncapsulation.None` is load-bearing here: the `[forToast]` hosts are
  // rendered inside `<for-toast-viewport>`'s template, NOT inside this
  // fixture's template, so they carry the viewport component's `_ngcontent-*`
  // attribute rather than the fixture's. With default emulated encapsulation,
  // the `[forToast] { width: 280px; pointer-events: auto; touch-action: none;
  // ... }` rule below would be scoped to the fixture's attribute and silently
  // skip the actual toast elements — leaving them at near-zero content width
  // and making Playwright's hit test at the toast's bbox centre return the
  // fixture host (`<app-toast-fixture> intercepts pointer events`) instead of
  // the toast. That swallowed every pointer event the swipe-dismiss and
  // hover-pause specs depend on. Encapsulation `None` lets the rule apply to
  // the toast elements regardless of where they render in the DOM.
  encapsulation: ViewEncapsulation.None,
  imports: [ForToastViewport],
  styles: [
    `
      app-toast-fixture {
        display: block;
        padding: 24px;
        min-height: 100vh;
      }
      app-toast-fixture [data-testid='enqueue'] {
        padding: 8px 16px;
      }
      app-toast-fixture for-toast-viewport {
        position: fixed;
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 100;
        padding: 16px;
        pointer-events: none;
      }
      app-toast-fixture for-toast-viewport[data-side='top-right'] {
        top: 0;
        right: 0;
      }
      app-toast-fixture for-toast-viewport[data-side='top-left'] {
        top: 0;
        left: 0;
      }
      app-toast-fixture for-toast-viewport[data-side='top-center'] {
        top: 0;
        left: 50%;
        transform: translateX(-50%);
      }
      app-toast-fixture for-toast-viewport[data-side='bottom-right'] {
        bottom: 0;
        right: 0;
      }
      app-toast-fixture for-toast-viewport[data-side='bottom-left'] {
        bottom: 0;
        left: 0;
      }
      app-toast-fixture for-toast-viewport[data-side='bottom-center'] {
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
      }
      app-toast-fixture [forToast] {
        display: block;
        width: 280px;
        padding: 12px 16px;
        background: #222;
        color: #fff;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        touch-action: none;
        pointer-events: auto;
        transform: translate(
          var(--for-toast-swipe-movement-x, 0px),
          var(--for-toast-swipe-movement-y, 0px)
        );
      }
      app-toast-fixture [forToast][data-swipe='cancel'] {
        transition: transform 200ms ease;
        transform: translate(0, 0);
      }
    `,
  ],
  template: `
    <button data-testid="enqueue" type="button" (click)="enqueue()">Enqueue toast</button>

    <for-toast-viewport
      [attr.data-testid]="'viewport'"
      [attr.data-side]="side"
      [swipeDirection]="swipeDirection"
    >
    </for-toast-viewport>

    <output data-testid="toast-count">{{ manager.count() }}</output>
    <output data-testid="enqueued">{{ enqueued() }}</output>
  `,
})
export class ToastFixture {
  readonly #route = inject(ActivatedRoute);
  protected readonly manager = inject(ForToastManager);

  protected readonly side: ToastSide = parseSide(
    this.#route.snapshot.queryParamMap.get('side'),
  );

  protected readonly duration: number = parseDuration(
    this.#route.snapshot.queryParamMap.get('duration'),
    this.#route.snapshot.queryParamMap.get('autoDismiss'),
  );

  protected readonly swipeDirection: ForToastSwipeDirection = parseSwipe(
    this.#route.snapshot.queryParamMap.get('swipe'),
  );

  readonly #enqueuedCount = signal(0);
  protected readonly enqueued = computed(() => this.#enqueuedCount());

  /**
   * Map of `title → stable testid` so the MutationObserver below can stamp
   * the correct `data-testid` onto each freshly-mounted toast regardless of
   * how many enqueue clicks have happened since.
   */
  readonly #pendingTestids = new Map<string, string>();

  constructor() {
    const doc = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    // The default viewport template renders `<div forToast>` with the toast
    // title text as its first text content. We can't set `data-testid`
    // directly through `manager.show()` (the default template renders a
    // fixed shape), so a MutationObserver watches the document body for
    // newly-mounted `[forToast]` hosts and stamps the `data-testid` derived
    // from the toast's title. Driving this through a MutationObserver
    // (rather than `queueMicrotask` after `show()`) sidesteps the ordering
    // race between the manager's synchronous signal update, OnPush change
    // detection, and the DOM commit.
    afterNextRender(() => {
      const observer = new MutationObserver(() => {
        const hosts = doc.querySelectorAll<HTMLElement>('[forToast]:not([data-testid])');
        for (const host of Array.from(hosts)) {
          // The default viewport template puts `<div forToastTitle>{{ title }}</div>`
          // as the first child of the host; reading its textContent picks up
          // the toast id we stashed in the title (`toast-N`).
          const title = host.querySelector('[forToastTitle]')?.textContent?.trim() ?? '';
          const stable = this.#pendingTestids.get(title);
          if (stable) {
            host.setAttribute('data-testid', stable);
            this.#pendingTestids.delete(title);
          }
        }
      });
      observer.observe(doc.body, { childList: true, subtree: true });
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected enqueue(): void {
    const index = this.#enqueuedCount();
    const title = `toast-${index}`;
    this.#pendingTestids.set(title, title);
    this.manager.show({
      id: title,
      title,
      // The duration captured at the moment of the show() call. `0` keeps the
      // toast sticky so swipe / stacking tests aren't racing the timer.
      duration: this.duration,
      // Swipe direction also flows through the per-show config so toasts
      // enqueued through this fixture honour `?swipe=…` even if a viewport
      // default disagrees (it doesn't here, but kept explicit for clarity).
      swipeDirection: this.swipeDirection,
    });
    this.#enqueuedCount.update((n) => n + 1);
  }
}

type ToastSide =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

function parseSide(raw: string | null): ToastSide {
  switch (raw) {
    case 'top-left':
    case 'top-center':
    case 'bottom-right':
    case 'bottom-left':
    case 'bottom-center':
      return raw;
    default:
      return 'top-right';
  }
}

function parseDuration(raw: string | null, autoDismissRaw: string | null): number {
  if (raw !== null) {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  if (autoDismissRaw === '1') {
    return 500;
  }
  return 0;
}

function parseSwipe(raw: string | null): ForToastSwipeDirection {
  switch (raw) {
    case 'left':
    case 'right':
    case 'up':
    case 'down':
      return raw;
    default:
      return null;
  }
}
