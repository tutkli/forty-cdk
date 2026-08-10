import {
  booleanAttribute,
  DestroyRef,
  Directive,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import {
  emitVetoableNativeEvent,
  injectPrefersReducedMotion,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  AnchoredOverlayPositioningBase,
  forceCloseWhenDisabled,
  createHoverIntent,
  type HoverIntentScheduler,
  attachPointerGrace,
  buildSubmenuGracePolygon,
  type Point,
  resolveGraceSide,
  ScrollDismissDispatcher,
} from 'forty-cdk/core-overlay';
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
    '[attr.data-reduced-motion]': 'reducedMotion() ? "" : null',
  },
  providers: [{ provide: FOR_HOVER_CARD_CONTEXT, useExisting: ForHoverCard }],
})
export class ForHoverCard extends AnchoredOverlayPositioningBase implements ForHoverCardContext {
  protected readonly positioningDefaults = inject(FOR_HOVER_CARD_DEFAULTS);

  /**
   * Two-way bindable. Whether the card is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (delay-driven, escape, blur, and the force-close that runs when `disabled`
   * flips to true), never on consumer writes through `[(open)]`.
   */
  readonly open = model<boolean>(false);

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
   * hover). Routed through the content's document-level dismissible layer.
   * Call `preventDefault()` on the emitted veto to suppress the automatic
   * close. The native `KeyboardEvent` is on `.event`.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /**
   * Whether the user has requested reduced motion via the OS
   * `prefers-reduced-motion: reduce` media query. Reflected as the boolean
   * `data-reduced-motion` attribute on the root and content so consumers can
   * disable their own `animate.enter` / `animate.leave` and CSS transitions
   * without re-deriving the media query. The card's JS-coordinated timing (the
   * open / close hover-intent delays) is intent debouncing, not motion, so it
   * is deliberately unchanged under reduced motion.
   */
  readonly reducedMotion = injectPrefersReducedMotion();

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  readonly #coordinator = inject(HoverCardCoordinator);
  readonly #scrollDismissDispatcher = inject(ScrollDismissDispatcher);
  readonly #hoverIntent: HoverIntentScheduler;

  #triggerHovered = false;
  #triggerFocused = false;
  #contentHovered = false;
  #detachGrace: (() => void) | null = null;
  #unregisterScrollDismiss: () => void = () => {};

  constructor() {
    super();
    forceCloseWhenDisabled({
      open: this.open,
      disabled: this.disabled,
      onForceClose: () => this.cancelPending(),
    });

    this.#hoverIntent = createHoverIntent({
      open: this.open,
      isDisabled: () => this.disabled(),
      openDelay: () => this.openDelay() ?? this.#coordinator.openDelay,
      closeDelay: () => this.closeDelay() ?? this.#coordinator.closeDelay,
      coordinator: this.#coordinator,
    });

    this.#unregisterScrollDismiss = this.#scrollDismissDispatcher.register(() =>
      this.#dismissOnScroll(),
    );

    inject(DestroyRef).onDestroy(() => {
      this.cancelPending();
      this.#unregisterScrollDismiss();
    });
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

  pointerEnterTrigger(): void {
    this.#triggerHovered = true;
    this.#disarmContentGrace();
    this.scheduleOpen('hover-trigger');
  }

  pointerLeaveTrigger(cursor: Point): void {
    this.#triggerHovered = false;
    if (this.#triggerFocused) {
      return;
    }
    if (this.open() && this.#contentEl()) {
      this.#armContentGrace(cursor);
      return;
    }
    this.#scheduleCloseIfInactive();
  }

  focusTrigger(): void {
    this.#triggerFocused = true;
    this.scheduleOpen('focus');
  }

  blurTrigger(): void {
    this.#triggerFocused = false;
    this.#scheduleCloseIfInactive();
  }

  pointerEnterContent(): void {
    this.#contentHovered = true;
    this.#disarmContentGrace();
    this.cancelPending();
  }

  pointerLeaveContent(): void {
    this.#contentHovered = false;
    this.#scheduleCloseIfInactive();
  }

  scheduleOpen(reason: HoverCardScheduleReason): void {
    if (reason !== 'focus' && this.#scrollSuppressed()) {
      return;
    }
    this.#hoverIntent.scheduleOpen();
  }

  scheduleClose(reason: HoverCardScheduleReason): void {
    this.#disarmContentGrace();
    this.#hoverIntent.scheduleClose(reason === 'escape');
  }

  cancelPending(): void {
    this.#disarmContentGrace();
    this.#hoverIntent.cancelPending();
  }

  /**
   * Closes the card immediately when an ancestor scrolls under a stationary
   * cursor and cancels any pending open / close timer. Closes silently
   * (bypassing `closeDelay` and without opening the skip-delay window) so a peer
   * row sliding under the cursor can't reopen instantly while the scroll is in
   * flight. A no-op when nothing is open or armed.
   */
  #dismissOnScroll(): void {
    this.cancelPending();
    if (this.open()) {
      this.open.set(false);
    }
  }

  /** True while an ancestor scroll has opened the suppression window (hover opens are no-ops). */
  #scrollSuppressed(): boolean {
    return this.#scrollDismissDispatcher.isSuppressed();
  }

  /**
   * Emit `(escapeKeyDown)` and, unless the consumer calls `preventDefault()`
   * on the veto, close immediately. Driven by the content's document-level
   * dismissible layer so Escape works no matter where focus currently lives
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

  /**
   * Imperatively opens the card — for programmatic control beyond hover and
   * focus (e.g. a design-system wrapper opening the card from an external
   * event). Schedules the show after the resolved `openDelay` (instant when the
   * delay is `0` or the scope's skip-delay window is active) and applies the
   * same gates as a hover open: a no-op while `disabled`, and a no-op while an
   * ancestor is scrolling (the scroll-dismiss suppression window). For an
   * instant, unconditional open that bypasses the delay and every gate, write
   * the `[(open)]` model directly (`open.set(true)`).
   */
  show(): void {
    this.scheduleOpen('hover-trigger');
  }

  /**
   * Imperatively closes the card, mirroring a hover-leave / blur close:
   * schedules the hide after the resolved `closeDelay` (instant when the delay
   * is `0`) and disarms the pointer-grace bridge. For an instant close that
   * ignores `closeDelay`, write the `[(open)]` model directly
   * (`open.set(false)`).
   */
  hide(): void {
    this.scheduleClose('hover-trigger');
  }

  #scheduleCloseIfInactive(): void {
    if (this.#triggerHovered || this.#triggerFocused || this.#contentHovered) {
      return;
    }
    this.#hoverIntent.scheduleClose(false);
  }

  #armContentGrace(cursor: Point): void {
    const content = this.#contentEl();
    if (!content) {
      this.#scheduleCloseIfInactive();
      return;
    }
    const rect = content.getBoundingClientRect();
    const trigger = this.#triggerEl();
    const side = trigger ? resolveGraceSide(trigger.getBoundingClientRect(), rect) : this.side();
    const polygon = buildSubmenuGracePolygon(cursor, rect, side);
    this.#disarmContentGrace();
    this.#detachGrace = attachPointerGrace(content.ownerDocument, polygon, () => {
      this.#disarmContentGrace();
      this.#scheduleCloseIfInactive();
    });
  }

  #disarmContentGrace(): void {
    if (this.#detachGrace) {
      this.#detachGrace();
      this.#detachGrace = null;
    }
  }
}
