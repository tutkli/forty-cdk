import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';

import {
  registerHandle,
  type FloatingAlign,
  type FloatingSide,
  hostId,
  IdGenerator,
  resolveListNavigation,
  type MenuActivationModality,
} from 'forty-cdk/core';
import { injectMenubarContext } from './menubar-context';

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
 * open.
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
 * Pointer-driven opens (click — detected by the `pointerdown` preceding it —
 * and hover-after-open) move focus to the menu's first item without
 * highlighting it; keyboard activation (Enter / Space / ArrowDown / ArrowUp)
 * highlights the focused item.
 */
@Directive({
  selector: '[forMenubarTrigger]',
  exportAs: 'forMenubarTrigger',
  host: {
    role: 'menuitem',
    type: 'button',
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
export class ForMenubarTrigger {
  protected readonly menubar = injectMenubarContext('ForMenubarTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #idGen = inject(IdGenerator);
  #pointerActivation = false;

  /** Identifies this trigger in the menubar's `value` model. */
  readonly value = input.required<string>();

  /** Per-trigger disabled, in addition to the menubar's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  // -- Floating-ui inputs (forwarded to the multiplexed [forMenuContent]) --

  /** Anchor side. Default `'bottom'`. */
  readonly side = input<FloatingSide | undefined>('bottom');
  /** Alignment along `side`. Default `'start'`. */
  readonly align = input<FloatingAlign | undefined>('start');
  /** Gap (px) along the main axis. Default `4`. */
  readonly sideOffset = input(4, { transform: numberAttribute });
  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });
  readonly avoidCollisions = input(true, { transform: booleanAttribute });
  readonly collisionPadding = input(8, { transform: numberAttribute });
  readonly arrowPadding = input(0, { transform: numberAttribute });
  readonly sticky = input<'partial' | 'always' | false>('partial');
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /**
   * When `true` (default), the content is clipped until floating-ui resolves
   * its first position, preventing a flash at the viewport corner. Set to
   * `false` so a dramatic `animate.enter` plays from its first frame (the
   * surface may flash briefly at the unresolved position while positioning
   * computes).
   */
  readonly clipUntilPositioned = input(true, { transform: booleanAttribute });

  /** Manual `aria-label` on `[forMenuContent]` when the trigger isn't a meaningful name. */
  readonly ariaLabel = input<string | null>(null);

  readonly triggerId = hostId('for-menubar-trigger');
  readonly contentId = signal(this.#idGen.next('for-menubar-content'));

  readonly effectiveDisabled = computed(() => this.disabled() || this.menubar.disabled());

  protected readonly isOpen = computed(() => this.menubar.value() === this.value());

  protected readonly tabindex = computed<0 | -1>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    return this.menubar.tabindexFor(this.#host.nativeElement);
  });

  constructor() {
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
      collisionPadding: this.collisionPadding,
      arrowPadding: this.arrowPadding,
      sticky: this.sticky,
      hideWhenDetached: this.hideWhenDetached,
      clipUntilPositioned: this.clipUntilPositioned,
      ariaLabel: this.ariaLabel,
    };
    registerHandle(
      handle,
      (h) => this.menubar.registerTrigger(h),
      (h) => this.menubar.unregisterTrigger(h),
    );
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
