import {
  booleanAttribute,
  DestroyRef,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  signal,
} from '@angular/core';
import type { Placement } from '@floating-ui/dom';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import {
  FOR_HOVER_CARD_CONTEXT,
  type ForHoverCardContext,
  type HoverCardScheduleReason,
} from './hover-card-context';
import { HoverCardCoordinator } from './hover-card-defaults';

/**
 * Headless hover-preview card. Use it to surface rich, interactive previews
 * (profile snapshots, link previews, definition cards) on hover or focus
 * of an already-meaningful trigger (a link, a name).
 *
 * **Not a tooltip.** Hover-cards may contain interactive content
 * (clickable links, copy buttons, …); the trigger must convey full meaning
 * on its own so keyboard-only users miss nothing.
 *
 * Open / close delays default to 700 / 300 ms; the per-injector-scope
 * `provideHoverCardDefaults` configures the cadence and the skip-delay
 * window for adjacent cards.
 *
 * @example
 * ```html
 * <span forHoverCard #card="forHoverCard">
 *   <a forHoverCardTrigger href="/users/ada">Ada Lovelace</a>
 *   @if (card.open()) {
 *     <div forHoverCardContent animate.enter="fade-in" animate.leave="fade-out">
 *       <img src="/api/avatar/ada" alt="" />
 *       <h3>Ada Lovelace</h3>
 *       <p>Mathematician.</p>
 *     </div>
 *   }
 * </span>
 * ```
 */
@Directive({
  selector: '[forHoverCard]',
  exportAs: 'forHoverCard',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_HOVER_CARD_CONTEXT, useExisting: ForHoverCard }],
})
export class ForHoverCard implements ForHoverCardContext {
  /**
   * Two-way bindable. Whether the card is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (delay-driven, escape, blur), never on consumer writes via `[(open)]`.
   */
  readonly open = model<boolean>(false);

  /**
   * Floating-ui placement. Default `'top'`. Legacy single-string API —
   * new code should prefer the `side` + `align` pair.
   */
  readonly placement = input<Placement>('top');

  /**
   * Side the card is anchored to. When set, takes precedence over
   * `placement`. Pair with `align` for the full positioning API.
   */
  readonly side = input<FloatingSide | undefined>(undefined);

  /** Alignment along the chosen `side`. Defaults to `'center'`. */
  readonly align = input<FloatingAlign | undefined>(undefined);

  /** Gap (px) between trigger and card along the main axis. Default `8`. Legacy alias for `sideOffset`. */
  readonly offset = input<number>(8);

  /**
   * Gap (px) along the main axis. When set, overrides the legacy `offset`.
   * Identical semantics to Radix's `sideOffset`.
   */
  readonly sideOffset = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the card inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /** Padding (px) applied uniformly to flip / shift / size. Default `8`. */
  readonly collisionPadding = input(8, { transform: numberAttribute });

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /** Stickiness behaviour for `shift`. Default `'partial'`. */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /** When `true`, sets `data-detached=""` while the trigger is scrolled off-screen. */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /** Per-card override for open delay (ms). Falls back to coordinator (700ms). */
  readonly openDelay = input<number | undefined>(undefined);

  /** Per-card override for close delay (ms). Falls back to coordinator (300ms). */
  readonly closeDelay = input<number | undefined>(undefined);

  /** When true, all hover / focus interaction is ignored and any open card is forced closed. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

  #pendingTimer: ReturnType<typeof setTimeout> | null = null;
  readonly #coordinator = inject(HoverCardCoordinator);

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

  scheduleOpen(_reason: HoverCardScheduleReason): void {
    if (this.disabled()) {
      return;
    }
    this.cancelPending();
    if (this.open()) {
      return;
    }
    const local = this.openDelay();
    const base = this.#coordinator.skipDelay() ? 0 : (local ?? this.#coordinator.openDelay);
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

  scheduleClose(reason: HoverCardScheduleReason): void {
    this.cancelPending();
    if (!this.open()) {
      return;
    }
    if (reason === 'escape') {
      this.#close();
      return;
    }
    const local = this.closeDelay();
    const delay = Math.max(0, local ?? this.#coordinator.closeDelay);
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
