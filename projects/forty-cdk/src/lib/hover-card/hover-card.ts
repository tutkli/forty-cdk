import {
  booleanAttribute,
  computed,
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
import { FOR_HOVER_CARD_DEFAULTS, HoverCardCoordinator } from './hover-card-defaults';

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
  readonly #defaults = inject(FOR_HOVER_CARD_DEFAULTS);

  /**
   * Two-way bindable. Whether the card is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (delay-driven, escape, blur, and the force-close that runs when `disabled`
   * flips to true), never on consumer writes through `[(open)]`.
   */
  readonly open = model<boolean>(false);

  /**
   * Per-card override for the side the card is anchored to. Pair with
   * `align` for the full positioning API. When `undefined` (default), falls
   * back to `ForHoverCardDefaults.side` from the surrounding
   * `provideForHoverCardDefaults` scope (`'top'` unless configured).
   *
   * The input is aliased to `side`; consumers bind `[side]="..."` and read
   * the effective value via the public `side` computed below.
   */
  readonly _sideInput = input<FloatingSide | undefined>(undefined, { alias: 'side' });

  /** Effective anchor side: the `side` input when set, else the scope default. */
  readonly side = computed<FloatingSide>(() => this._sideInput() ?? this.#defaults.side);

  /**
   * Per-card override for the alignment along the chosen `side`. When
   * `undefined` (default), falls back to `ForHoverCardDefaults.align` from the
   * surrounding `provideForHoverCardDefaults` scope (`'center'` unless
   * configured).
   *
   * The input is aliased to `align`; consumers bind `[align]="..."` and read
   * the effective value via the public `align` computed below.
   */
  readonly _alignInput = input<FloatingAlign | undefined>(undefined, { alias: 'align' });

  /** Effective alignment: the `align` input when set, else the scope default. */
  readonly align = computed<FloatingAlign>(() => this._alignInput() ?? this.#defaults.align);

  /**
   * Per-card override for the gap (px) between trigger and card along the
   * main axis. Mirrors Radix's `sideOffset`. When `undefined` (default),
   * falls back to `ForHoverCardDefaults.sideOffset` from the surrounding
   * `provideForHoverCardDefaults` scope (`8` unless configured).
   *
   * The input is aliased to `sideOffset`; consumers bind `[sideOffset]="..."`
   * and read the effective value via the public `sideOffset` computed below.
   */
  readonly _sideOffsetInput = input(undefined, {
    alias: 'sideOffset',
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /** Effective main-axis gap (px): the `sideOffset` input when set, else the scope default. */
  readonly sideOffset = computed<number>(
    () => this._sideOffsetInput() ?? this.#defaults.sideOffset,
  );

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the card inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /**
   * Per-card override for the padding (px) applied uniformly to the `flip`,
   * `shift`, and `size` middlewares. When `undefined` (default), falls back
   * to `ForHoverCardDefaults.collisionPadding` from the surrounding
   * `provideForHoverCardDefaults` scope (`8` unless configured).
   *
   * The input is aliased to `collisionPadding`; consumers bind
   * `[collisionPadding]="..."` and read the effective value via the public
   * `collisionPadding` computed below.
   */
  readonly _collisionPaddingInput = input(undefined, {
    alias: 'collisionPadding',
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /** Effective collision padding (px): the `collisionPadding` input when set, else the scope default. */
  readonly collisionPadding = computed<number>(
    () => this._collisionPaddingInput() ?? this.#defaults.collisionPadding,
  );

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /** Stickiness behaviour for `shift`. Default `'partial'`. */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /** When `true`, sets `data-detached=""` while the trigger is scrolled off-screen. */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /**
   * When `true` (default), the content is clipped until floating-ui resolves
   * its first position, preventing a flash at the viewport corner. Set to
   * `false` so a dramatic `animate.enter` plays from its first frame (the
   * surface may flash briefly at the unresolved position while positioning
   * computes).
   */
  readonly clipUntilPositioned = input(true, { transform: booleanAttribute });

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

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

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

  registerContent(el: HTMLElement): void {
    this.#contentEl.set(el);
  }

  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
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
