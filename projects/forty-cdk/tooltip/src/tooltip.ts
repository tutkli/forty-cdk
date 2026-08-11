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
  type HoverIntentScheduler,
  attachPointerGrace,
  buildSubmenuGracePolygon,
  type Point,
  resolveGraceSide,
  ScrollDismissDispatcher,
} from 'forty-cdk/core-overlay';
import {
  FOR_TOOLTIP_CONTEXT,
  type ForTooltipContext,
  type TooltipScheduleReason,
} from './tooltip-context';
import { FOR_TOOLTIP_DEFAULTS, TooltipCoordinator } from './tooltip-defaults';

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
   * Per-tooltip override for the open delay (ms). When `undefined`
   * (default), falls back to `ForTooltipDefaults.openDelay` from the
   * surrounding `provideForTooltipDefaults` scope (700ms unless configured).
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
   * without dismissing the tooltip. When `true`, the content drops its
   * default `pointer-events: none` while open and a pointer-grace "safe
   * triangle" bridges the gap between trigger and content so a slow diagonal
   * traversal doesn't close it. When `undefined` (default), falls back to
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
   * is deliberately unchanged under reduced motion.
   */
  readonly reducedMotion = injectPrefersReducedMotion();

  readonly #generatedTriggerId = this.#idGen.next('for-tooltip-trigger');

  /**
   * Id of the trigger element. A consumer-set `id` on the trigger host is
   * adopted at registration and preserved; the generated
   * `for-tooltip-trigger-*` id is only assigned when the host has none.
   */
  readonly triggerId = signal(this.#generatedTriggerId);

  /** Generated id of the content element, wired to the trigger's `aria-describedby` while open. */
  readonly contentId = signal(this.#idGen.next('for-tooltip-content'));

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #contentEl = signal<HTMLElement | null>(null);

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

  readonly #coordinator = inject(TooltipCoordinator);
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

  /**
   * Registers the trigger host element. Adopts a pre-existing consumer-set
   * `id` as the trigger id so external references (anchors, `aria-labelledby`,
   * label `for`) keep resolving; falls back to the generated id otherwise.
   */
  registerTrigger(el: HTMLElement): void {
    adoptHostId(el, this.triggerId);
    this.#triggerEl.set(el);
  }

  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
    }
  }

  /** Registers the content host element so the hoverable-content grace polygon can measure it. */
  registerContent(el: HTMLElement): void {
    this.#contentEl.set(el);
  }

  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
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
    this.#triggerHovered = true;
    this.#disarmContentGrace();
    if (this.#scrollSuppressed() || this.#suppressedByOverflow()) {
      return;
    }
    this.#hoverIntent.scheduleOpen();
  }

  pointerLeaveTrigger(cursor: Point): void {
    this.#triggerHovered = false;
    if (this.#triggerFocused) {
      return;
    }
    if (this.hoverableContent() && this.open() && this.#contentEl()) {
      this.#armContentGrace(cursor);
      return;
    }
    this.#scheduleCloseIfInactive();
  }

  focusTrigger(): void {
    this.#triggerFocused = true;
    if (this.#suppressedByOverflow()) {
      return;
    }
    this.#hoverIntent.scheduleOpen();
  }

  blurTrigger(): void {
    this.#triggerFocused = false;
    this.#scheduleCloseIfInactive();
  }

  pointerEnterContent(): void {
    if (!this.hoverableContent()) {
      return;
    }
    this.#contentHovered = true;
    this.#disarmContentGrace();
    this.#hoverIntent.cancelPending();
  }

  pointerLeaveContent(): void {
    if (!this.hoverableContent()) {
      return;
    }
    this.#contentHovered = false;
    this.#scheduleCloseIfInactive();
  }

  scheduleOpen(reason: TooltipScheduleReason): void {
    if (reason !== 'focus' && this.#scrollSuppressed()) {
      return;
    }
    this.#hoverIntent.scheduleOpen();
  }

  scheduleClose(reason: TooltipScheduleReason): void {
    this.#disarmContentGrace();
    this.#hoverIntent.scheduleClose(reason === 'escape' || reason === 'press');
  }

  cancelPending(): void {
    this.#disarmContentGrace();
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
   * text is not truncated, and a no-op while an ancestor is scrolling (the
   * scroll-dismiss suppression window). For an instant, unconditional open that
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

  /** Close only when no keep-alive source (trigger hover/focus, content hover) is active. */
  #scheduleCloseIfInactive(): void {
    if (this.#triggerHovered || this.#triggerFocused || this.#contentHovered) {
      return;
    }
    this.#hoverIntent.scheduleClose(false);
  }

  /**
   * Closes the tooltip immediately when an ancestor scrolls under a stationary
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

  /** True while an ancestor scroll has opened the suppression window (opens are no-ops). */
  #scrollSuppressed(): boolean {
    return this.#scrollDismissDispatcher.isSuppressed();
  }

  /** True when `showOnOverflow` is on and the trigger's text is NOT truncated. */
  #suppressedByOverflow(): boolean {
    if (!this.showOnOverflow()) {
      return false;
    }
    const el = this.#triggerEl();
    return el !== null && el.scrollWidth <= el.clientWidth;
  }

  /**
   * Arms a pointer-grace "safe triangle" from `cursor` toward the content so
   * the pointer can travel across the trigger / content gap without closing.
   * On exit (or when content hover takes over) the grace disarms and a close
   * is scheduled if nothing else keeps the tooltip alive.
   */
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
