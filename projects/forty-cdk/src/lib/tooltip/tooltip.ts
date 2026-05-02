import {
  booleanAttribute,
  DestroyRef,
  Directive,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import type { Placement } from '@floating-ui/dom';

import { IdGenerator } from '../_internal/id-generator';
import {
  FOR_TOOLTIP_CONTEXT,
  ForTooltipContext,
  TooltipScheduleReason,
} from './tooltip-context';
import { ForTooltipProvider } from './tooltip-provider';

/**
 * Headless implementation of the [WAI-ARIA Tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/).
 *
 * Wrapper directive that owns open / closed state, hover / focus delays, and
 * placement. Provides the shared context to `ForTooltipTrigger`,
 * `ForTooltipContent`, and the optional `ForTooltipArrow`.
 *
 * Tooltip content is portaled to `document.body` and positioned via
 * `@floating-ui/dom`. Per APG, content must NOT be interactive — for
 * interactive popups use a Popover primitive (not yet shipped).
 */
@Directive({
  selector: '[forTooltip]',
  exportAs: 'forTooltip',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_TOOLTIP_CONTEXT, useExisting: ForTooltip }],
})
export class ForTooltip implements ForTooltipContext {
  readonly #idGen = inject(IdGenerator);

  /**
   * Two-way bindable. Whether the tooltip is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (hover/focus delays, Escape), never on consumer writes via `[(open)]` —
   * observe state changes without binding back.
   */
  readonly open = model<boolean>(false);

  /** Floating-ui placement (e.g. `'top'`, `'bottom-start'`). Default `'top'`. */
  readonly placement = input<Placement>('top');

  /** Gap (px) between trigger and content. Forwarded to floating-ui's `offset` middleware. Default `8`. */
  readonly offset = input<number>(8);

  /** ms before the tooltip opens after hover or focus enters the trigger. Default `700`. */
  readonly openDelay = input<number>(700);

  /** ms before the tooltip closes after hover or focus leaves. `Escape` ignores this. Default `300`. */
  readonly closeDelay = input<number>(300);

  /** When true, all hover / focus interaction is ignored and any open tooltip is forced closed. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * When true, `ForTooltipContent` stays mounted regardless of `open` —
   * `[hidden]` is never applied. Use when the consumer wants to drive
   * mount/unmount externally or keep DOM stable across animations.
   * `data-state` still reflects the logical open/closed state.
   */
  readonly forceMount = input(false, { transform: booleanAttribute });

  readonly triggerId = signal(this.#idGen.next('for-tooltip-trigger'));
  readonly contentId = signal(this.#idGen.next('for-tooltip-content'));

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

  #pendingTimer: ReturnType<typeof setTimeout> | null = null;
  readonly #provider = inject(ForTooltipProvider, { optional: true });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelPending());
  }

  registerTrigger(el: HTMLElement): void {
    this.#triggerEl.set(el);
  }

  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
    }
  }

  registerArrow(el: HTMLElement): void {
    this.#arrowEl.set(el);
  }

  unregisterArrow(el: HTMLElement): void {
    if (this.#arrowEl() === el) {
      this.#arrowEl.set(null);
    }
  }

  scheduleOpen(_reason: TooltipScheduleReason): void {
    if (this.disabled()) {
      return;
    }
    this.cancelPending();
    if (this.open()) {
      return;
    }
    // Skip the open delay if a peer tooltip just closed within the
    // provider's skipDelayDuration window — keeps toolbar-style tooltips
    // from feeling sluggish on cursor movement between targets.
    const baseDelay = this.#provider?.skipDelay() ? 0 : this.openDelay();
    const delay = Math.max(0, baseDelay);
    if (delay === 0) {
      this.open.set(true);
      return;
    }
    this.#pendingTimer = setTimeout(() => {
      this.#pendingTimer = null;
      this.open.set(true);
    }, delay);
  }

  scheduleClose(reason: TooltipScheduleReason): void {
    this.cancelPending();
    if (!this.open()) {
      return;
    }
    if (reason === 'escape') {
      this.#close();
      return;
    }
    const delay = Math.max(0, this.closeDelay());
    if (delay === 0) {
      this.#close();
      return;
    }
    this.#pendingTimer = setTimeout(() => {
      this.#pendingTimer = null;
      this.#close();
    }, delay);
  }

  #close(): void {
    this.open.set(false);
    this.#provider?.startSkipDelay();
  }

  cancelPending(): void {
    if (this.#pendingTimer !== null) {
      clearTimeout(this.#pendingTimer);
      this.#pendingTimer = null;
    }
  }
}
