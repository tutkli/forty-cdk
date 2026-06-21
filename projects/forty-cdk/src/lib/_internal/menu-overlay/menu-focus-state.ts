import { type Signal, signal } from '@angular/core';

/**
 * Tracks where a menu's initial focus should land on the next open and whether
 * that one programmatic move should reflect `data-highlighted` on the focused
 * item.
 *
 * `target` is set by triggers before they flip the menu open (ArrowDown →
 * `'first'`, ArrowUp → `'last'`). `highlightOnNextFocus` is armed per open via
 * {@link prepareOpen}: a `'keyboard'` activation highlights the focused item per
 * the APG menu-button pattern; a `'pointer'` activation (click, hover-after-open)
 * suppresses the highlight so a mouse-opened menu doesn't read as "preselected".
 * {@link consumeHighlight} reads the flag once and re-arms it to `true`, so the
 * suppression applies only to the single initial-focus move that follows an open.
 *
 * Plain class (no `inject()`) so both `MenuOverlay` and `[forMenubar]`'s
 * multiplexed menu context compose the same one-shot protocol instead of each
 * hand-copying it.
 */
export class InitialFocusState {
  readonly #target = signal<'first' | 'last'>('first');
  #highlightOnNextFocus = true;

  /** Where focus should land when the menu mounts. */
  readonly target: Signal<'first' | 'last'> = this.#target.asReadonly();

  setTarget(target: 'first' | 'last'): void {
    this.#target.set(target);
  }

  /**
   * Arms the state for the next open: records the initial-focus target and
   * whether the upcoming initial-focus move should highlight the focused item
   * (`true` for keyboard activation, `false` for pointer activation).
   */
  prepareOpen(target: 'first' | 'last', highlight: boolean): void {
    this.#target.set(target);
    this.#highlightOnNextFocus = highlight;
  }

  /**
   * Returns whether the next initial-focus move should highlight, then re-arms
   * the flag to `true` so the suppression is one-shot.
   */
  consumeHighlight(): boolean {
    const highlight = this.#highlightOnNextFocus;
    this.#highlightOnNextFocus = true;
    return highlight;
  }
}

/**
 * Records the reason of a menu's most recent close. Reset to `null` on every
 * open; the shared `[forMenuContent]` reads it to skip its return-focus on a
 * `'tab'` close (so Tab advances focus out of the menu instead of snapping back
 * to the trigger).
 *
 * Generic over the reason union so `MenuOverlay` (`MenuOverlayCloseReason`) and
 * `[forMenubar]`'s menu context (`ForMenuCloseReason`) — structurally identical
 * unions — share one implementation. Plain class (no `inject()`) so both compose
 * it instead of each hand-copying the signal.
 */
export class CloseReasonState<R extends string> {
  readonly #reason = signal<R | null>(null);

  /**
   * Reason of the most recent close, or `null` while the menu is open / has
   * never closed.
   */
  readonly reason: Signal<R | null> = this.#reason.asReadonly();

  set(reason: R): void {
    this.#reason.set(reason);
  }

  reset(): void {
    this.#reason.set(null);
  }
}
