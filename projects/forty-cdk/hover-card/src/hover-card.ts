import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';

import {
  emitVetoableNativeEvent,
  injectPrefersReducedMotion,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import { warnIfOpenWithoutContent } from 'forty-cdk/core-overlay';
import {
  AnchoredOverlayPositioningBase,
  forceCloseWhenDisabled,
  createHoverIntent,
  createHoverSurfaceState,
  type HoverIntentScheduler,
  type HoverSurfaceState,
  type Point,
  ScrollDismissDispatcher,
  type ScrollDismissRegistration,
} from 'forty-cdk/core-anchored';
import {
  FOR_HOVER_CARD_CONTEXT,
  type ForHoverCardContext,
  HOVER_CARD_TRIGGERS,
  type HoverCardScheduleReason,
} from './hover-card-context';
import { FOR_HOVER_CARD_DEFAULTS, HoverCardCoordinator } from 'forty-cdk/defaults';

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

  /**
   * Padding (px) keeping `[forHoverCardArrow]` that far from the edges of the
   * content. Only consulted when an arrow is registered, since floating-ui
   * installs the `arrow` middleware only then — which is why the input is
   * declared here rather than on the shared positioning base. The default is
   * read from `provideForHoverCardDefaults` for the surrounding scope, since
   * arrow geometry is a design-system-wide decision rather than a per-card one.
   */
  readonly arrowPadding = input(this.positioningDefaults.arrowPadding, {
    transform: numberAttribute,
  });

  /** Per-card override for open delay (ms). Falls back to `ForHoverCardDefaults.openDelay` (700ms). */
  readonly openDelay = input<number | undefined>(undefined);

  /** Per-card override for close delay (ms). Falls back to `ForHoverCardDefaults.closeDelay` (300ms). */
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
   * is unchanged under reduced motion.
   */
  readonly reducedMotion = injectPrefersReducedMotion();

  readonly #triggers = inject(HOVER_CARD_TRIGGERS).of(this);
  readonly trigger = computed(() => this.#triggers().at(-1)?.host ?? null);

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  readonly #coordinator = inject(HoverCardCoordinator);
  readonly #hoverIntent: HoverIntentScheduler;

  readonly #surface: HoverSurfaceState;
  #returningFocus = false;
  readonly #scrollDismiss: ScrollDismissRegistration;

  constructor() {
    super();
    warnIfOpenWithoutContent({
      primitive: 'hover-card',
      piece: '[forHoverCardContent]',
      condition: 'card.open()',
      open: this.open,
      content: this.content,
    });
    forceCloseWhenDisabled({
      open: this.open,
      disabled: this.disabled,
      onForceClose: () => this.cancelPending(),
    });

    this.#hoverIntent = createHoverIntent({
      open: this.open,
      isDisabled: () => this.disabled(),
      openDelay: () => this.openDelay() ?? this.positioningDefaults.openDelay,
      closeDelay: () => this.closeDelay() ?? this.positioningDefaults.closeDelay,
      coordinator: this.#coordinator,
    });

    this.#surface = createHoverSurfaceState({
      trigger: this.trigger,
      content: this.#contentEl,
      side: () => this.side(),
      close: () => this.#hoverIntent.scheduleClose(false),
    });

    this.#scrollDismiss = inject(ScrollDismissDispatcher).register({
      dismiss: () => this.#dismissOnScroll(),
      scope: { anchor: this.trigger, surface: this.#contentEl },
      active: () => this.open() || this.#hoverIntent.isPending(),
    });

    inject(DestroyRef).onDestroy(() => {
      this.cancelPending();
      this.#scrollDismiss.unregister();
    });
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
      this.#surface.resetContent();
    }
  }

  pointerEnterTrigger(): void {
    this.#surface.enterTrigger();
    this.scheduleOpen('hover-trigger');
  }

  pointerLeaveTrigger(cursor: Point | null): void {
    this.#surface.leaveTrigger();
    if (this.#surface.triggerFocused()) {
      return;
    }
    if (cursor && this.open() && this.#contentEl()) {
      this.#surface.armGrace(cursor);
      return;
    }
    this.#surface.closeIfInactive();
  }

  focusTrigger(): void {
    this.#surface.focusTrigger();
    if (this.#returningFocus) {
      return;
    }
    this.scheduleOpen('focus');
  }

  blurTrigger(): void {
    this.#surface.blurTrigger();
  }

  pointerEnterContent(): void {
    this.#surface.enterContent();
    this.cancelPending();
  }

  pointerLeaveContent(): void {
    this.#surface.leaveContent();
  }

  private focusEnterContent(): void {
    this.#surface.focusContent();
    this.cancelPending();
  }

  private focusLeaveContent(): void {
    this.#surface.blurContent();
  }

  private closeOnTabOut(): void {
    this.cancelPending();
    this.#hoverIntent.scheduleClose(true);
  }

  private returnFocusToTrigger(): void {
    const trigger = this.trigger();
    if (!trigger) {
      return;
    }
    this.#returningFocus = true;
    try {
      trigger.focus();
    } finally {
      this.#returningFocus = false;
    }
  }

  scheduleOpen(reason: HoverCardScheduleReason): void {
    if (reason !== 'focus' && this.#scrollSuppressed()) {
      return;
    }
    this.#hoverIntent.scheduleOpen();
  }

  scheduleClose(reason: HoverCardScheduleReason): void {
    this.#surface.disarmGrace();
    this.#hoverIntent.scheduleClose(reason === 'escape');
  }

  cancelPending(): void {
    this.#surface.disarmGrace();
    this.#hoverIntent.cancelPending();
  }

  /**
   * Closes the card immediately when an ancestor of the trigger scrolls under a
   * stationary cursor and cancels any pending open / close timer. Closes
   * silently (bypassing `closeDelay` and without opening the skip-delay window)
   * so a peer row sliding under the cursor can't reopen instantly while the
   * scroll is in flight. A no-op when nothing is open or armed, and while focus
   * is on the trigger or inside the content: a focus-held card, and the open
   * the trigger's focus armed, survive the scroll.
   */
  #dismissOnScroll(): void {
    if (this.#surface.focused()) {
      return;
    }
    this.cancelPending();
    if (this.open()) {
      this.open.set(false);
    }
  }

  /**
   * True while the card is closed and a scroll of a container holding its
   * trigger is within the suppression window. An open card is never gated, so
   * returning to its trigger still cancels a pending close.
   */
  #scrollSuppressed(): boolean {
    return !this.open() && this.#scrollDismiss.isSuppressed();
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
   * same gates as a hover open: a no-op while `disabled`, and a no-op for a
   * short window after a scroll of a container holding the trigger. For an
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
}
