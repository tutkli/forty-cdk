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

import { registerHandle } from '../_internal/collection/register-handle';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
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
 * Keyboard:
 * - **Click / Enter / Space** — toggle this trigger's menu (focus first item on open).
 * - **ArrowDown** — open and focus first item.
 * - **ArrowUp** — open and focus last item.
 * - **ArrowLeft / ArrowRight** — move focus across sibling triggers (RTL inverts).
 * - **Home / End** — jump to first / last enabled trigger.
 * - **Typeahead** — printable keys focus the first sibling trigger whose label
 *   starts with the buffered string.
 *
 * While some other trigger's menu is open, hovering or focusing this trigger
 * opens it immediately (no delay) — Radix-style "first open is intentional,
 * subsequent are hover".
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
    '[attr.disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-orientation]': 'menubar.orientation()',
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

  /** Manual `aria-label` on `[forMenuContent]` when the trigger isn't a meaningful name. */
  readonly ariaLabel = input<string | null>(null);

  readonly triggerId = signal(this.#idGen.next('for-menubar-trigger'));
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
      ariaLabel: this.ariaLabel,
    };
    registerHandle(
      handle,
      (h) => this.menubar.registerTrigger(h),
      (h) => this.menubar.unregisterTrigger(h),
    );
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (this.isOpen()) {
      this.menubar.closeOpen();
    } else {
      this.menubar.openTrigger(this.value(), 'first');
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    // Open / focus-on-open first.
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.menubar.openTrigger(this.value(), 'first');
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.menubar.openTrigger(this.value(), 'last');
      return;
    }

    // Trigger-row navigation (cross-axis to the open key, per APG).
    const action = resolveListNavigation(event, {
      orientation: this.menubar.orientation(),
      dir: this.menubar.dir(),
    });
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
    // Roving tab stop follows focus.
    this.menubar.setFocusedTrigger(this.#host.nativeElement);
    // Hover-after-open semantics: while some menu is open, focusing a
    // sibling trigger opens it. While nothing's open, focus alone does
    // not auto-open (Radix-aligned).
    this.menubar.pointerEnterTrigger(this.value());
  }

  protected onPointerEnter(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.menubar.pointerEnterTrigger(this.value());
  }
}
