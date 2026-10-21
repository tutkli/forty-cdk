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
  adoptHostId,
  emitVetoableNativeEvent,
  IdGenerator,
  injectPrefersReducedMotion,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  AnchoredOverlayPositioningBase,
  forceCloseWhenDisabled,
  createHoverIntent,
  createHoverSurfaceState,
  type HoverIntentScheduler,
  type HoverSurfaceState,
  type Point,
  RootedTriggerSlot,
  ScrollDismissDispatcher,
  type ScrollDismissRegistration,
} from 'forty-cdk/core-overlay';
import {
  FOR_TOOLTIP_CONTEXT,
  type ForTooltipContext,
  TOOLTIP_TRIGGERS,
  type TooltipScheduleReason,
} from './tooltip-context';
import { FOR_TOOLTIP_DEFAULTS, TooltipCoordinator } from 'forty-cdk/defaults';

/**
 * Headless implementation of the [WAI-ARIA Tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/).
 *
 * Wrapper directive that owns open / closed state, hover / focus delays, and
 * placement. Provides the shared context to `ForTooltipTrigger`,
 * `ForTooltipContent`, and the optional `ForTooltipArrow`.
 *
 * Tooltip content is portaled to `document.body` and positioned via
 * `@floating-ui/dom`. Per APG, content must NOT be interactive — for
 * interactive popups use a Popover primitive.
 */
@Directive({
  selector: '[forTooltip]',
  exportAs: 'forTooltip',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-reduced-motion]': 'reducedMotion() ? "" : null',
  },
  providers: [{ provide: FOR_TOOLTIP_CONTEXT, useExisting: ForTooltip }],
})
export class ForTooltip extends AnchoredOverlayPositioningBase implements ForTooltipContext {
  readonly #idGen = inject(IdGenerator);
  protected readonly positioningDefaults = inject(FOR_TOOLTIP_DEFAULTS);

  /**
   * Two-way bindable. Whether the tooltip is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (hover/focus delays, Escape, and the force-close that runs when `disabled`
   * flips to true), never on consumer writes through `[(open)]` — observe
   * state changes without binding back.
   */
  readonly open = model<boolean>(false);

  /**
   * Padding (px) keeping `[forTooltipArrow]` that far from the edges of the
   * content. Only consulted when an arrow is registered, since floating-ui
   * installs the `arrow` middleware only then — which is why the input is
   * declared here rather than on the shared positioning base. The default is
   * read from `provideForTooltipDefaults` for the surrounding scope, since arrow
   * geometry is a design-system-wide decision rather than a per-tooltip one.
   */
  readonly arrowPadding = input(this.positioningDefaults.arrowPadding, {
    transform: numberAttribute,
  });

  /**
   * Per-tooltip override for the hover open delay (ms). Keyboard focus ignores
   * this and opens immediately, so the description exists when the focused
   * trigger is announced. When `undefined` (default), falls back to
   * `ForTooltipDefaults.openDelay` from the surrounding
   * `provideForTooltipDefaults` scope (700ms unless configured).
   */
  readonly openDelay = input<number | undefined>(undefined);

  /**
   * Per-tooltip override for the close delay (ms) after hover or focus
   * leaves. `Escape` ignores this. When `undefined` (default), falls back to
   * `ForTooltipDefaults.closeDelay` from the surrounding
   * `provideForTooltipDefaults` scope (300ms unless configured).
   */
  readonly closeDelay = input<number | undefined>(undefined);

  /** When true, all hover / focus interaction is ignored and any open tooltip is forced closed. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Per-tooltip override for whether the tooltip shows only when the
   * trigger's own text is truncated (`scrollWidth > clientWidth`) — the
   * common pattern for ellipsized labels where the tooltip adds nothing once
   * the full text is visible. When `undefined` (default), falls back to
   * `ForTooltipDefaults.showOnOverflow` from the surrounding
   * `provideForTooltipDefaults` scope (`false` unless configured).
   *
   * The input is aliased to `showOnOverflow`; consumers bind
   * `[showOnOverflow]="..."` (or the bare attribute) and read the effective
   * value via the public `showOnOverflow` computed below.
   */
  readonly _showOnOverflowInput = input(undefined, {
    alias: 'showOnOverflow',
    transform: (v: unknown): boolean | undefined => (v == null ? undefined : booleanAttribute(v)),
  });

  /** Effective overflow gate: the `showOnOverflow` input when set, else the scope default. */
  readonly showOnOverflow = computed<boolean>(
    () => this._showOnOverflowInput() ?? this.positioningDefaults.showOnOverflow,
  );

  /**
   * Per-tooltip override for whether the pointer may move into the content
   * without dismissing the tooltip. When `true`, the content takes the pointer
   * and a pointer-grace "safe triangle" bridges the gap between trigger and
   * content so a slow diagonal traversal doesn't close it; when `false`, the
   * content carries `pointer-events: none`. When `undefined` (default), falls back to
   * `ForTooltipDefaults.hoverableContent` from the surrounding
   * `provideForTooltipDefaults` scope (`true` unless configured).
   *
   * Per APG the content must stay non-interactive; this only allows the
   * pointer to rest over descriptive text (e.g. to select it).
   *
   * The input is aliased to `hoverableContent`; consumers bind
   * `[hoverableContent]="..."` (or the bare attribute) and read the effective
   * value via the public `hoverableContent` computed below.
   */
  readonly _hoverableContentInput = input(undefined, {
    alias: 'hoverableContent',
    transform: (v: unknown): boolean | undefined => (v == null ? undefined : booleanAttribute(v)),
  });

  /** Effective hoverable-content flag: the `hoverableContent` input when set, else the scope default. */
  readonly hoverableContent = computed<boolean>(
    () => this._hoverableContentInput() ?? this.positioningDefaults.hoverableContent,
  );

  /**
   * Fires when the user presses Escape while the tooltip is open, regardless of
   * where focus currently lives — on the trigger or on an unrelated element (the
   * common case for a hover-opened tooltip). Routed through the content's
   * document-level dismissible layer. Call `preventDefault()` on the emitted
   * veto to keep the tooltip open. The native `KeyboardEvent` is on `.event`.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /**
   * Whether the user has requested reduced motion via the OS
   * `prefers-reduced-motion: reduce` media query. Reflected as the boolean
   * `data-reduced-motion` attribute on the root and content so consumers can
   * disable their own `animate.enter` / `animate.leave` and CSS transitions
   * without re-deriving the media query. Tooltip's JS-coordinated timing (the
   * open / close hover-intent delays) is intent debouncing, not motion, so it
   * is unchanged under reduced motion.
   */
  readonly reducedMotion = injectPrefersReducedMotion();

  readonly #generatedTriggerId = this.#idGen.next('for-tooltip-trigger');

  readonly #triggerSlot: RootedTriggerSlot = new RootedTriggerSlot(
    inject(TOOLTIP_TRIGGERS).of(this),
    () => this.#generatedTriggerId,
  );

  /**
   * Id of the trigger element. A consumer-set `id` on the trigger host is
   * adopted at registration and preserved; the generated
   * `for-tooltip-trigger-*` id is only assigned when the host has none.
   */
  readonly triggerId = this.#triggerSlot.id;

  /** Generated id of the content element, wired to the trigger's `aria-describedby` while open. */
  readonly contentId = signal(this.#idGen.next('for-tooltip-content'));

  readonly trigger = this.#triggerSlot.element;

  readonly #contentEl = signal<HTMLElement | null>(null);

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

  readonly #coordinator = inject(TooltipCoordinator);
  readonly #hoverIntent: HoverIntentScheduler;

  readonly #surface: HoverSurfaceState;
  readonly #scrollDismiss: ScrollDismissRegistration;

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

  private resolveTriggerId(staticId: string | null): string {
    return this.#triggerSlot.resolveId(staticId);
  }

  /** Registers the content host element so the hoverable-content grace polygon can measure it. */
  registerContent(el: HTMLElement): void {
    this.#contentEl.set(el);
  }

  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
      this.#surface.resetContent();
    }
  }

  /** Adopts a consumer-set static `id` on the content host into `contentId`. */
  adoptContentId(el: HTMLElement): void {
    adoptHostId(el, this.contentId);
  }

  registerArrow(el: HTMLElement): void {
    this.#arrowEl.set(el);
  }

  unregisterArrow(el: HTMLElement): void {
    if (this.#arrowEl() === el) {
      this.#arrowEl.set(null);
    }
  }

  pointerEnterTrigger(): void {
    this.#surface.enterTrigger();
    if (this.#scrollSuppressed() || this.#suppressedByOverflow()) {
      return;
    }
    this.#hoverIntent.scheduleOpen();
  }

  pointerLeaveTrigger(cursor: Point | null): void {
    this.#surface.leaveTrigger();
    if (this.#surface.triggerFocused()) {
      return;
    }
    if (cursor && this.hoverableContent() && this.open() && this.#contentEl()) {
      this.#surface.armGrace(cursor);
      return;
    }
    this.#surface.closeIfInactive();
  }

  focusTrigger(): void {
    this.#surface.focusTrigger();
    if (this.#suppressedByOverflow()) {
      return;
    }
    this.scheduleOpen('focus');
  }

  blurTrigger(): void {
    this.#surface.blurTrigger();
  }

  pointerEnterContent(): void {
    if (!this.hoverableContent()) {
      return;
    }
    this.#surface.enterContent();
    this.#hoverIntent.cancelPending();
  }

  pointerLeaveContent(): void {
    if (!this.hoverableContent()) {
      return;
    }
    this.#surface.leaveContent();
  }

  scheduleOpen(reason: TooltipScheduleReason): void {
    if (reason !== 'focus' && this.#scrollSuppressed()) {
      return;
    }
    this.#hoverIntent.scheduleOpen(reason === 'focus');
  }

  scheduleClose(reason: TooltipScheduleReason): void {
    this.#surface.disarmGrace();
    this.#hoverIntent.scheduleClose(reason === 'escape' || reason === 'press');
  }

  cancelPending(): void {
    this.#surface.disarmGrace();
    this.#hoverIntent.cancelPending();
  }

  /**
   * Emit the public `(escapeKeyDown)` output and, unless the consumer calls
   * `preventDefault()` on the veto, close the tooltip immediately. Driven by the
   * content's document-level dismissible layer so Escape dismisses the tooltip
   * regardless of where focus currently lives — including a hover-opened tooltip
   * with focus on an unrelated element (WCAG 2.1 SC 1.4.13) — and so a tooltip
   * layered over a dialog is dismissed by the first Escape while the dialog
   * stays open (topmost layer first). A no-op when nothing is open.
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
   * Imperatively opens the tooltip — for programmatic control beyond hover and
   * focus (e.g. a design-system wrapper driving the tooltip from a
   * text-truncation observer). Schedules the show after the resolved
   * `openDelay` (instant when the delay is `0` or the scope's skip-delay window
   * is active) and applies the same gates as a hover / focus open: a no-op
   * while `disabled`, a no-op under `showOnOverflow` when the trigger's own
   * text is not truncated, and a no-op for a short window after a scroll of a
   * container holding the trigger. For an instant, unconditional open that
   * bypasses the delay and every gate, write the `[(open)]` model directly
   * (`open.set(true)`).
   */
  show(): void {
    if (this.#scrollSuppressed() || this.#suppressedByOverflow()) {
      return;
    }
    this.#hoverIntent.scheduleOpen();
  }

  /**
   * Imperatively closes the tooltip, mirroring a hover-leave / blur close:
   * schedules the hide after the resolved `closeDelay` (instant when the delay
   * is `0`) and disarms the hoverable-content grace bridge. For an instant
   * close that ignores `closeDelay`, write the `[(open)]` model directly
   * (`open.set(false)`).
   */
  hide(): void {
    this.scheduleClose('hover');
  }

  /**
   * Closes the tooltip immediately when an ancestor of the trigger scrolls under
   * a stationary cursor and cancels any pending open / close timer. Closes
   * silently (bypassing `closeDelay` and without opening the skip-delay window)
   * so a peer row sliding under the cursor can't reopen instantly while the
   * scroll is in flight. A no-op when nothing is open or armed, and while the
   * trigger holds focus: a keyboard-held tooltip survives the scroll that brings
   * the trigger into view.
   */
  #dismissOnScroll(): void {
    if (this.#surface.triggerFocused()) {
      return;
    }
    this.cancelPending();
    if (this.open()) {
      this.open.set(false);
    }
  }

  /**
   * True while the tooltip is closed and a scroll of a container holding its
   * trigger is within the suppression window. An open tooltip is never gated,
   * so returning to its trigger still cancels a pending close.
   */
  #scrollSuppressed(): boolean {
    return !this.open() && this.#scrollDismiss.isSuppressed();
  }

  /** True when `showOnOverflow` is on and the trigger's text is NOT truncated. */
  #suppressedByOverflow(): boolean {
    if (!this.showOnOverflow()) {
      return false;
    }
    const el = this.trigger();
    return el !== null && el.scrollWidth <= el.clientWidth;
  }
}
