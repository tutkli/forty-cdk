import { createPointerSuppression, type PointerSuppression } from '../pointer/pointer-suppression';

/**
 * Scroll-dismiss helper for hover-driven anchored overlays (Tooltip today).
 *
 * When an ancestor scroll container moves its content under a stationary
 * cursor — wheel / trackpad scrolling a `forVirtualFor` viewport or any
 * `overflow: auto` list — the browser does not reliably dispatch the matching
 * `pointerleave` / `pointerenter` on the trigger elements whose rows slide past
 * the pointer. An open tooltip therefore lingers after its trigger scrolls
 * away, and the spurious `pointerenter`s synthesized on the rows sliding under
 * the cursor open *their* tooltips too — instantly, while the skip-delay window
 * is open — so the list flickers a pile of bubbles for rows that are no longer
 * visible.
 *
 * The fix mirrors the pointer-suppression window used for the keyboard-scroll
 * active-descendant path: a single capture-phase `scroll` listener on the
 * document (capture is required — `scroll` does not bubble) that, on every
 * ancestor scroll, (a) {@link ScrollDismissOptions.dismiss}es the open / armed
 * overlay immediately and (b) opens a short window during which hover-driven
 * opens are a no-op. Continuous wheel / trackpad scrolling re-arms the window
 * each event, so opens stay suppressed for the whole gesture plus a short tail;
 * a genuine pointer move after the window elapses opens again, matching the
 * close-on-scroll behaviour of Radix Tooltip and the Angular CDK
 * `CloseScrollStrategy`.
 *
 * Framework-free and SSR-agnostic: it touches no Angular DI and the caller
 * supplies the `Document` only in the browser (gated on `isPlatformBrowser`),
 * so it is never invoked server-side. The suppression state is the same
 * timestamp window as {@link createPointerSuppression}. Internal — not
 * re-exported from `public-api.ts`.
 */

/** Default window (ms) opens stay suppressed after the last ancestor scroll. */
export const DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS = 200;

/** Handle returned by {@link attachScrollDismiss}. */
export interface ScrollDismiss {
  /**
   * Whether opens are currently suppressed because an ancestor scrolled within
   * the suppression window. Open handlers (hover-enter, imperative show) bail
   * out while this returns `true`, so content sliding under a stationary
   * pointer can't flicker overlays open.
   */
  isSuppressed(): boolean;
  /** Aborts the scroll listener's signal. Idempotent; call from a `DestroyRef` hook. */
  destroy(): void;
}

/** Inputs for {@link attachScrollDismiss}. */
export interface ScrollDismissOptions {
  /**
   * Dismiss the open / armed overlay immediately on scroll. Called on every
   * ancestor scroll; implement as a no-op when the overlay is neither open nor
   * armed. Close synchronously and bypass any close delay and the skip-delay
   * window so a peer can't reopen instantly while the scroll is in flight.
   */
  dismiss(): void;
  /**
   * Suppression window (ms) opens stay blocked after the last scroll. Defaults
   * to {@link DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS}.
   */
  windowMs?: number;
}

/**
 * Attaches a capture-phase, passive `scroll` listener on {@link doc} that
 * dismisses the overlay and arms the suppression window on every ancestor
 * scroll.
 *
 * @param doc The document to listen on. Pass it only in the browser.
 * @param options Dismiss callback and optional window override.
 * @returns A {@link ScrollDismiss} handle whose `destroy` removes the listener.
 */
export function attachScrollDismiss(doc: Document, options: ScrollDismissOptions): ScrollDismiss {
  const suppression: PointerSuppression = createPointerSuppression(
    options.windowMs ?? DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS,
  );
  const onScroll = (): void => {
    suppression.suppress();
    options.dismiss();
  };
  const controller = new AbortController();
  doc.addEventListener('scroll', onScroll, {
    capture: true,
    passive: true,
    signal: controller.signal,
  });
  return {
    isSuppressed: () => suppression.isSuppressed(),
    destroy: () => controller.abort(),
  };
}
