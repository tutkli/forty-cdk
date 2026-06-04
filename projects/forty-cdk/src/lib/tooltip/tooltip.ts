import {
  booleanAttribute,
  DestroyRef,
  Directive,
  effect,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  output,
  signal,
  type WritableSignal,
} from '@angular/core';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  FOR_TOOLTIP_CONTEXT,
  type ForTooltipContext,
  type TooltipScheduleReason,
} from './tooltip-context';
import { TooltipCoordinator } from './tooltip-defaults';

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
   * Two-way bindable. Whether the tooltip is currently shown. `(openChange)`
   * fires only on internal transitions (hover/focus delays, Escape, and the
   * force-close that runs when `disabled` flips to true), never on consumer
   * writes through `[(open)]` — observe state changes without binding back.
   *
   * Backed by a `linkedSignal` whose source is `disabled` so the documented
   * "force-close while disabled" contract is enforced declaratively, without
   * an `effect()`-to-set anti-pattern.
   */
  readonly open: WritableSignal<boolean>;

  /** Emits when the directive itself transitions `open`. See `open` JSDoc. */
  readonly openChange = output<boolean>();

  /**
   * Backing input for `[(open)]` two-way binding. Internal — read the
   * user-facing `open` writable signal instead, which derives its value
   * from this input plus `disabled` via `linkedSignal`.
   *
   * @internal
   */
  readonly _openInput = input(false, {
    alias: 'open',
    transform: booleanAttribute,
  });

  /**
   * Side the tooltip is anchored to. Defaults to `'top'`. Pair with
   * `align` for the full positioning API.
   */
  readonly side = input<FloatingSide | undefined>('top');

  /** Alignment along the chosen `side`. Defaults to `'center'`. */
  readonly align = input<FloatingAlign | undefined>(undefined);

  /**
   * Gap (px) between trigger and content along the main axis.
   * Default `8`. Mirrors Radix's `sideOffset`.
   */
  readonly sideOffset = input(8, { transform: numberAttribute });

  /** Gap (px) along the cross axis (parallel to `side`). Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /**
   * When `true` (default), `flip` and `shift` keep the tooltip inside the
   * viewport. Disable for strict positioning where overflow is acceptable.
   */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /**
   * Padding (px) applied uniformly to the `flip`, `shift`, and `size`
   * middlewares. Default `8`.
   */
  readonly collisionPadding = input(8, { transform: numberAttribute });

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /**
   * Stickiness behaviour for `shift`. `'partial'` (default) lets the
   * tooltip shift to stay visible. `'always'` keeps the requested
   * placement even off-screen.
   */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /**
   * When `true`, sets `data-detached=""` while the trigger has scrolled
   * off all clipping ancestors.
   */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /**
   * Per-tooltip override for the open delay (ms). When `undefined`
   * (default), falls back to `ForTooltipDefaults.delayDuration` from the
   * surrounding `provideForTooltipDefaults` scope (700ms unless configured).
   */
  readonly openDelay = input<number | undefined>(undefined);

  /** ms before the tooltip closes after hover or focus leaves. `Escape` ignores this. Default `300`. */
  readonly closeDelay = input<number>(300);

  /** When true, all hover / focus interaction is ignored and any open tooltip is forced closed. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly triggerId = signal(this.#idGen.next('for-tooltip-trigger'));
  readonly contentId = signal(this.#idGen.next('for-tooltip-content'));

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

  #pendingTimer: ReturnType<typeof setTimeout> | null = null;
  readonly #coordinator = inject(TooltipCoordinator);

  constructor() {
    this.open = linkedSignal<{ input: boolean; disabled: boolean }, boolean>({
      source: () => ({ input: this._openInput(), disabled: this.disabled() }),
      computation: ({ input, disabled }, prev) => {
        if (disabled) return false;
        if (!prev || prev.source.input !== input) return input;
        return prev.value;
      },
    });

    // Bridge: emit `openChange` whenever `open` diverges from the consumer's
    // `[open]` input. That covers internal transitions (delay timers, escape)
    // AND the linkedSignal-driven force-close when `disabled` flips (or when
    // the consumer tries to open while disabled). Consumer-driven `[(open)]`
    // writes propagate through the linkedSignal so `open === input` again on
    // the next effect run, and stay silent — preserving the documented
    // `model()`-style contract.
    //
    // This effect emits an output (an imperative escape from the reactive
    // graph), it never writes a signal, so it does not violate CLAUDE.md's
    // "no propagate state in effect" rule. The "force-close on disabled"
    // state derivation lives in the `linkedSignal` above.
    effect(() => {
      const open = this.open();
      const input = this._openInput();
      if (open !== input) {
        this.openChange.emit(open);
      }
    });

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
    // Skip the open delay if a peer tooltip in the same provideForTooltipDefaults
    // scope just closed within the skipDelayDuration window — keeps
    // toolbar-style tooltips from feeling sluggish on cursor movement.
    const local = this.openDelay();
    const base = this.#coordinator.skipDelay() ? 0 : (local ?? this.#coordinator.delayDuration);
    const delay = Math.max(0, base);
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
    this.#coordinator.startSkipDelay();
  }

  cancelPending(): void {
    if (this.#pendingTimer !== null) {
      clearTimeout(this.#pendingTimer);
      this.#pendingTimer = null;
    }
  }
}
