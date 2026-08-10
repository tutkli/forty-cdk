import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import {
  hostButtonType,
  adoptHostId,
  registerHandle,
  hostId,
  IdGenerator,
  resolveListNavigation,
} from 'forty-cdk/core';
import {
  AnchoredOverlayPositioningBase,
  type FloatingFallbackAxisSideDirection,
  type MenuActivationModality,
} from 'forty-cdk/core-overlay';
import { injectMenubarContext } from './menubar-context';
import { FOR_MENUBAR_DEFAULTS } from './menubar-defaults';

/**
 * One trigger inside `[forMenubar]`. Apply on a `<button>` so Space / Enter
 * dispatch native click events that route through `(click)`.
 *
 * Wires `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded`, and
 * `aria-controls`. Participates in the menubar's roving tabindex (only the
 * active trigger is tabbable; the rest are `tabindex="-1"`).
 *
 * Each trigger registers its per-menu floating-ui inputs (side, align,
 * sideOffset, …) with the menubar so the multiplexed `[forMenuContent]`
 * reads the right values when this trigger's menu is the one currently
 * open. It inherits them from `AnchoredOverlayPositioningBase` like every
 * other anchored root, with the four placement seeds resolved from
 * `provideForMenubarDefaults`.
 *
 * Keyboard (orientation-aware):
 * - **Click** — toggle this trigger's menu (focus first item on open).
 * - **Enter / Space** — open this trigger's menu, focusing the first item.
 * - **Horizontal bar** — ArrowDown opens (first item), ArrowUp opens (last item);
 *   ArrowLeft / ArrowRight move focus across sibling triggers (RTL inverts).
 * - **Vertical bar** — ArrowUp / ArrowDown move focus across sibling triggers;
 *   ArrowRight (ArrowLeft in RTL) opens the menu, focusing the first item.
 * - **Home / End** — jump to first / last enabled trigger.
 * - **Typeahead** — printable keys focus the sibling trigger whose label matches
 *   the buffered string, anchored on the focused trigger and cycling.
 *
 * While some other trigger's menu is open, hovering this trigger opens it
 * immediately (no delay) — "first open is intentional, subsequent
 * are hover". Keyboard focus alone never opens a menu.
 *
 * A click open (detected by the `pointerdown` preceding it) moves focus to the
 * menu's first item without highlighting it; keyboard activation (Enter /
 * Space / ArrowDown / ArrowUp) highlights the focused item. A hover-switch
 * moves focus to this trigger instead of into the menu it opens, so the pointer
 * sweeping across the bar leaves focus on the bar.
 */
@Directive({
  selector: '[forMenubarTrigger]',
  exportAs: 'forMenubarTrigger',
  host: {
    role: 'menuitem',
    '[attr.type]': 'buttonType()',
    '[id]': 'triggerId()',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'isOpen() ? "true" : "false"',
    '[attr.aria-controls]': 'isOpen() ? contentId() : null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-orientation]': 'menubar.orientation()',
    '(pointerdown)': 'onPointerDown()',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(pointerenter)': 'onPointerEnter()',
  },
})
export class ForMenubarTrigger extends AnchoredOverlayPositioningBase {
  protected readonly buttonType = hostButtonType();

  protected readonly menubar = injectMenubarContext('ForMenubarTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #idGen = inject(IdGenerator);
  protected readonly positioningDefaults = inject(FOR_MENUBAR_DEFAULTS);
  #pointerActivation = false;

  /** Identifies this trigger in the menubar's `value` model. */
  readonly value = input.required<string>();

  /** Per-trigger disabled, in addition to the menubar's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  // -- Floating-ui inputs (forwarded to the multiplexed [forMenuContent]) --

  /**
   * Direction `flip` falls back to on the perpendicular axis when both sides of
   * the preferred axis overflow. `'none'` (default) keeps only the opposite
   * same-axis placement; `'start'` / `'end'` let the menu drop to a
   * perpendicular side on a narrow viewport. Only consulted when
   * `avoidCollisions` is on. The default is read from
   * `provideForMenubarDefaults` for the surrounding scope, since dropping to a
   * perpendicular side is a design-system-wide viewport-degradation policy rather
   * than a per-trigger one.
   */
  readonly fallbackAxisSideDirection = input<FloatingFallbackAxisSideDirection>(
    this.positioningDefaults.fallbackAxisSideDirection,
  );

  /** Manual `aria-label` on `[forMenuContent]` when the trigger isn't a meaningful name. */
  readonly ariaLabel = input<string | null>(null);

  readonly triggerId = hostId('for-menubar-trigger');
  readonly #ownContentId = signal(this.#idGen.next('for-menubar-content'));

  /**
   * Id of this trigger's `[forMenuContent]` surface — the `aria-controls`
   * target while open, and the surface's own `id`. Seeded with a generated id;
   * a consumer-set static `id` on the mounted content host is adopted instead
   * (see {@link adoptContentId}).
   *
   * A surface shared across triggers has no single owner to adopt into — either
   * because it registered before any trigger was active (mounted
   * unconditionally) or because it outlived the trigger it registered under (one
   * `@if (value() !== null)` around the whole bar). The bar exposes its
   * consumer-set static `id` as `sharedContentId` and every trigger prefers that
   * over its own seed, keeping `aria-controls` resolvable to the consumer's id
   * whichever menu opens.
   */
  readonly contentId = computed(() => this.menubar.sharedContentId() ?? this.#ownContentId());

  readonly effectiveDisabled = computed(() => this.disabled() || this.menubar.disabled());

  protected readonly isOpen = computed(() => this.menubar.value() === this.value());

  protected readonly tabindex = computed<0 | -1>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    return this.menubar.tabindexFor(this.#host.nativeElement);
  });

  constructor() {
    super();
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
      triggerId: this.triggerId,
      contentId: this.contentId,
      side: this.side,
      align: this.align,
      sideOffset: this.sideOffset,
      alignOffset: this.alignOffset,
      avoidCollisions: this.avoidCollisions,
      fallbackAxisSideDirection: this.fallbackAxisSideDirection,
      collisionPadding: this.collisionPadding,
      arrowPadding: this.arrowPadding,
      sticky: this.sticky,
      hideWhenDetached: this.hideWhenDetached,
      clipUntilPositioned: this.clipUntilPositioned,
      ariaLabel: this.ariaLabel,
      adoptContentId: (el: HTMLElement) => this.adoptContentId(el),
    };
    registerHandle(
      handle,
      (h) => this.menubar.registerTrigger(h),
      (h) => this.menubar.unregisterTrigger(h),
    );
  }

  /**
   * Adopts a consumer-set static `id` on the mounted `[forMenuContent]` host
   * into {@link contentId}, so `aria-controls` and any external
   * `aria-labelledby` / `aria-describedby` references keep resolving instead of
   * being clobbered by the generated fallback. Called by the menubar's
   * multiplexed menu context when the content registers; a no-op when the
   * content host carries no static `id`.
   */
  adoptContentId(el: HTMLElement): void {
    adoptHostId(el, this.#ownContentId);
  }

  protected onPointerDown(): void {
    this.#pointerActivation = true;
  }

  protected onClick(): void {
    const modality: MenuActivationModality = this.#pointerActivation ? 'pointer' : 'keyboard';
    this.#pointerActivation = false;
    if (this.effectiveDisabled()) {
      return;
    }
    if (this.isOpen()) {
      this.menubar.closeOpen();
    } else {
      this.menubar.openTrigger(this.value(), 'first', modality);
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    this.#pointerActivation = false;
    if (this.effectiveDisabled()) {
      return;
    }
    const orientation = this.menubar.orientation();
    const dir = this.menubar.dir();

    // Open / focus-on-open first.
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.menubar.openTrigger(this.value(), 'first');
      return;
    }
    if (orientation === 'horizontal') {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.menubar.openTrigger(this.value(), 'first');
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.menubar.openTrigger(this.value(), 'last');
        return;
      }
    } else if (event.key === (dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight')) {
      event.preventDefault();
      this.menubar.openTrigger(this.value(), 'first');
      return;
    }

    // Trigger-row navigation (cross-axis to the open key, per APG).
    const action = resolveListNavigation(event, { orientation, dir });
    if (action) {
      event.preventDefault();
      this.menubar.navigateTriggers(this.#host.nativeElement, action);
      return;
    }

    // Typeahead among sibling triggers.
    this.menubar.handleTriggerTypeahead(event);
  }

  protected onFocus(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    // Roving tab stop follows focus — but focus alone never opens a menu.
    // Keyboard traversal across triggers (ArrowLeft / ArrowRight, typeahead)
    // only moves focus; opening is reserved for hover (pointerenter),
    // click, and the open keys. Cross-menu nav while a menu is open is driven
    // by the items, not by trigger focus.
    this.menubar.setFocusedTrigger(this.#host.nativeElement);
  }

  protected onPointerEnter(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.menubar.pointerEnterTrigger(this.value());
  }
}
