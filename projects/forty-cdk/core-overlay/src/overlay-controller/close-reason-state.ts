import { type Signal, signal } from '@angular/core';

/**
 * Records the reason of an overlay's most recent close. Reset to `null` on
 * every open; the shared content pieces read it to skip their return-focus on a
 * `'tab'` close (so Tab advances focus out of the surface instead of snapping
 * back to the trigger).
 *
 * Generic over the reason union so every overlay controller shares one
 * implementation — `MenuOverlay` and `[forMenubar]`'s multiplexed menu context
 * (both `ForMenuCloseReason`), the listbox overlays, and combobox all compose
 * it. Plain class (no `inject()`) so each composes it instead of hand-copying
 * the signal.
 *
 * @typeParam Reason Close-reason union owned by the controller.
 */
export class CloseReasonState<Reason> {
  readonly #reason: ReturnType<typeof signal<Reason | null>>;

  /**
   * Reason of the most recent close, or `null` while the overlay is open / has
   * never closed.
   */
  readonly reason: Signal<Reason | null>;

  constructor() {
    this.#reason = signal<Reason | null>(null);
    this.reason = this.#reason.asReadonly();
  }

  set(reason: Reason): void {
    this.#reason.set(reason);
  }

  reset(): void {
    this.#reason.set(null);
  }
}
