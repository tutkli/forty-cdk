import {
  booleanAttribute,
  DestroyRef,
  Directive,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * Optional ancestor wrapper for a group of `ForTooltip` instances. Two
 * jobs:
 *
 * 1. Carries `delayDuration` / `skipDelayDuration` defaults the
 *    individual tooltips can opt into.
 * 2. Coordinates the "skip-delay" window: when a tooltip closes, peer
 *    tooltips that open within `skipDelayDuration` ms will appear
 *    instantly — matching the behavior of toolbar-style tooltips that
 *    feel sluggish if every move re-incurs the open delay.
 *
 * Tooltips look up the provider via DI (`inject(ForTooltipProvider, { optional: true })`)
 * — applying it is purely additive and existing tooltips keep working
 * unchanged.
 *
 * @example
 * ```html
 * <div forTooltipProvider [skipDelayDuration]="200">
 *   <button forTooltip>Open</button>
 *   <button forTooltip>Save</button>
 *   <button forTooltip>Discard</button>
 * </div>
 * ```
 */
@Directive({
  selector: '[forTooltipProvider]',
  exportAs: 'forTooltipProvider',
})
export class ForTooltipProvider {
  /** Default open delay (ms) used by descendant tooltips that don't override. */
  readonly delayDuration = input<number>(700);

  /** Window (ms) after a peer closes during which the next open is instant. */
  readonly skipDelayDuration = input<number>(300);

  /** When true, suppresses the skip-delay coordination entirely (e.g. for testing). */
  readonly disableSkipDelay = input(false, { transform: booleanAttribute });

  readonly #skipDelay = signal(false);
  /** Read by descendant tooltips: when `true`, opening should bypass the delay. */
  readonly skipDelay = this.#skipDelay.asReadonly();

  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelSkipDelay());
  }

  /**
   * Called by a descendant `ForTooltip` when it closes. Opens the
   * skip-delay window so the next peer to open does so instantly.
   */
  startSkipDelay(): void {
    if (this.disableSkipDelay()) {
      return;
    }
    this.cancelSkipDelay();
    this.#skipDelay.set(true);
    this.#timer = setTimeout(() => {
      this.#skipDelay.set(false);
      this.#timer = null;
    }, Math.max(0, this.skipDelayDuration()));
  }

  /** Cancels any pending skip-delay window. Called on destroy. */
  cancelSkipDelay(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#skipDelay.set(false);
  }
}
