import { linkedSignal, type Signal, untracked, type WritableSignal } from '@angular/core';

/**
 * Records the reason of an overlay's most recent close, and clears it whenever the overlay's open
 * source turns `true`, whoever wrote it: an owner's own open path, an APG key, or a consumer's
 * `[(open)]` binding. The shared content pieces read it to skip their return-focus on a `'tab'`
 * close (so Tab advances focus out of the surface instead of snapping back to the trigger).
 *
 * `close` records the reason before running the close, so a synchronous `openChange` handler
 * already reads it, and settles it against the closed state before returning. A later read that
 * finds the source changed but closed again therefore knows an open happened in between, even one
 * nothing read during.
 *
 * Generic over the reason union so every overlay controller shares one implementation —
 * `OverlayController` (and through it `MenuOverlay`, the listbox overlays, combobox and
 * `[forMenubar]`'s multiplexed menu context) and `[forPopover]` compose it. Plain class (no
 * `inject()`) so each composes it instead of hand-copying the signal.
 *
 * @typeParam Reason Close-reason union owned by the controller.
 */
export class CloseReasonState<Reason> {
  readonly #reason: WritableSignal<Reason | null>;

  /**
   * Reason of the most recent close, or `null` while the overlay is open / has never closed.
   */
  readonly reason: Signal<Reason | null>;

  constructor(isOpen: () => boolean) {
    this.#reason = linkedSignal<boolean, Reason | null>({
      source: isOpen,
      computation: (open, previous) => (open || !previous?.source ? null : previous.value),
    });
    this.reason = this.#reason.asReadonly();
  }

  close(reason: Reason, apply: () => void): void {
    this.#reason.set(reason);
    apply();
    untracked(this.#reason);
  }
}
