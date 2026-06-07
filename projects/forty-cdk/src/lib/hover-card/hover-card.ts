import {
  booleanAttribute,
  DestroyRef,
  Directive,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
} from '@angular/core';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import {
  createHoverIntent,
  type HoverIntentScheduler,
} from '../_internal/hover-intent/hover-intent';
import {
  emitVetoableNativeEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
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
 * `provideForHoverCardDefaults` configures the cadence and the skip-delay
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
   * (delay-driven, escape, blur, and the force-close that runs when `disabled`
   * flips to true), never on consumer writes through `[(open)]`.
   */
  readonly open = model<boolean>(false);

  /**
   * Side the card is anchored to. Defaults to `'top'`. Pair with `align`
   * for the full positioning API.
   */
  readonly side = input<FloatingSide | undefined>('top');

  /** Alignment along the chosen `side`. Defaults to `'center'`. */
  readonly align = input<FloatingAlign | undefined>(undefined);

  /**
   * Gap (px) between trigger and card along the main axis. Default `8`.
   * Mirrors Radix's `sideOffset`.
   */
  readonly sideOffset = input(8, { transform: numberAttribute });

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

  /**
   * Fires when the user presses Escape while the card is open, regardless of
   * where focus currently lives — on the trigger, inside the portaled
   * content, or on an unrelated element (the common case for a card opened by
   * hover). Routed through the content's document-level dismissable layer.
   * Call `preventDefault()` on the emitted veto to suppress the automatic
   * close. The native `KeyboardEvent` is on `.event`.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

  readonly #coordinator = inject(HoverCardCoordinator);
  readonly #hoverIntent: HoverIntentScheduler;

  constructor() {
    // Force-close when `disabled` flips to true. The scheduler already
    // early-returns on `disabled()` so hover/focus can't open a disabled card;
    // this isolated reaction only covers the remaining path — an open card
    // being disabled out from under itself. The `open` read is `untracked` so
    // this never re-runs as a function of `open` (no read+write cycle on the
    // same signal); it reacts to `disabled` alone. This is the documented,
    // intentional `effect()`-to-set carve-out (CLAUDE.md): it integrates the
    // disabled gate with the public `model()` instead of wrapping the model in
    // a parallel signal.
    effect(() => {
      if (this.disabled() && untracked(this.open)) {
        this.cancelPending();
        this.open.set(false);
      }
    });

    this.#hoverIntent = createHoverIntent({
      open: this.open,
      isDisabled: () => this.disabled(),
      openDelay: () => this.openDelay() ?? this.#coordinator.openDelay,
      closeDelay: () => this.closeDelay() ?? this.#coordinator.closeDelay,
      coordinator: this.#coordinator,
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

  scheduleOpen(_reason: HoverCardScheduleReason): void {
    this.#hoverIntent.scheduleOpen();
  }

  scheduleClose(reason: HoverCardScheduleReason): void {
    this.#hoverIntent.scheduleClose(reason === 'escape');
  }

  cancelPending(): void {
    this.#hoverIntent.cancelPending();
  }

  /**
   * Emit `(escapeKeyDown)` and, unless the consumer calls `preventDefault()`
   * on the veto, close immediately. Driven by the content's document-level
   * dismissable layer so Escape works no matter where focus currently lives
   * — including a hover-opened card with focus on an unrelated element.
   */
  emitEscapeKeyDown(event: KeyboardEvent): void {
    if (!this.open()) {
      return;
    }
    const vetoed = emitVetoableNativeEvent(this.escapeKeyDown, event);
    if (!vetoed) {
      event.preventDefault();
      event.stopPropagation();
      this.scheduleClose('escape');
    }
  }
}
