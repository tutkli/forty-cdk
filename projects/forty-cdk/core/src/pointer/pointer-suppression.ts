/**
 * Pointer-suppression window.
 *
 * When keyboard navigation moves the active option of an
 * `aria-activedescendant` listbox and scrolls it into view, the scroll can
 * slide a *different* option under a stationary cursor. The browser then fires
 * a synthetic `pointermove` / `pointerover` for that option even though the
 * pointer never physically moved, and a naive hover handler would hijack the
 * active descendant onto the option the user merely scrolled past — fighting
 * the keyboard intent.
 *
 * The fix every native-feeling listbox uses is a brief window, opened the
 * moment the directive scrolls programmatically, during which hover-driven
 * activation is ignored. A genuine pointer move that lands after the window
 * elapses takes over again, so mouse and keyboard intent stay in sync without
 * the scroll stealing the active option.
 *
 * Pure and Angular-free: no DI, no timers, no globals touched at module load.
 * State is a single "suppressed until" timestamp compared against `Date.now()`
 * inside the (browser-only) event handlers that call it, so it is SSR-safe and
 * needs no teardown. Unit-tested in `pointer-suppression.spec.ts`.
 */

/** Default suppression window, in milliseconds. */
export const DEFAULT_POINTER_SUPPRESSION_MS = 200;

/**
 * Tracks a short window during which hover-driven activation should be ignored.
 * Created once per primitive instance; consulted synchronously inside pointer
 * event handlers.
 */
export interface PointerSuppression {
  /**
   * Open (or extend) the suppression window from the current instant. Call it
   * immediately before a programmatic scroll that could move options under a
   * stationary cursor.
   */
  suppress(): void;
  /**
   * Whether the suppression window is currently open. Hover handlers bail out
   * (leaving the active descendant unchanged) while this returns `true`.
   */
  isSuppressed(): boolean;
}

/**
 * Create a {@link PointerSuppression} backed by a timestamp window.
 *
 * @param windowMs How long the window stays open after each {@link
 *   PointerSuppression.suppress} call. Defaults to
 *   {@link DEFAULT_POINTER_SUPPRESSION_MS}.
 */
export function createPointerSuppression(
  windowMs: number = DEFAULT_POINTER_SUPPRESSION_MS,
): PointerSuppression {
  let suppressedUntil = 0;
  return {
    suppress(): void {
      suppressedUntil = Date.now() + windowMs;
    },
    isSuppressed(): boolean {
      return Date.now() < suppressedUntil;
    },
  };
}
