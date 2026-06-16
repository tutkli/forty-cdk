import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  InjectionToken,
  input,
  output,
  signal,
} from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  createVetoableEvent,
  emitVetoableEvent,
  type VetoableEvent,
} from '../_internal/vetoable-event/vetoable-event';
import { injectMenuContext } from '../_internal/menu-overlay/menu-context';
import { handleMenuHorizontalArrow } from './menu-horizontal-arrow';
import { handleMenuTabOut } from './menu-tab-out';
import { injectMenuRadioGroupContext } from './menu-radio-group-context';

/**
 * Injection key the `[forMenuItemIndicator]` uses to resolve a parent radio
 * item, decoupled from the concrete `ForMenuRadioItem` class.
 * `ForMenuRadioItem` provides itself under this token, so a design system
 * wrapping the item by subclassing re-points it at the subclass with a single
 * provider (`{ provide: FOR_MENU_RADIO_ITEM, useExisting: MtxMenuRadioItem }`)
 * and the indicator keeps resolving — see `docs/wrapping-form-primitives.md`.
 */
export const FOR_MENU_RADIO_ITEM = new InjectionToken<ForMenuRadioItem>('FOR_MENU_RADIO_ITEM');

/**
 * One radio option inside `[forMenuRadioGroup]`. Click and Enter set the
 * group's `value` to this item's `value`, emit `(activate)`, and close the
 * menu — call `event.preventDefault()` on the emitted event to keep the
 * menu open. Per APG, **Space** sets the value and emits `(activate)`
 * without closing the menu.
 */
@Directive({
  selector: '[forMenuRadioItem]',
  exportAs: 'forMenuRadioItem',
  providers: [{ provide: FOR_MENU_RADIO_ITEM, useExisting: ForMenuRadioItem }],
  host: {
    role: 'menuitemradio',
    type: 'button',
    tabindex: '-1',
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(pointermove)': 'onPointerMove($event)',
  },
})
export class ForMenuRadioItem {
  protected readonly menu = injectMenuContext('ForMenuRadioItem');
  protected readonly group = injectMenuRadioGroupContext('ForMenuRadioItem');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Identifier added to / read from the radio group's `value`. Required. */
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Override the string used for typeahead matching. Defaults to `''`,
   * which falls back to the item's `textContent`. See `[forMenuItem]`
   * for the rationale.
   */
  readonly textValue = input<string>('');

  readonly checked = computed(() => this.group.isSelected(this.value()));

  readonly effectiveDisabled = computed(() => this.disabled() || this.menu.disabled());

  readonly #highlighted = signal(false);
  /**
   * True while this item is the active keyboard candidate or hovered by the
   * pointer. Set on keyboard-driven focus and on `pointermove` (hover follows
   * the pointer), cleared on `blur` and when the pointer leaves the surface.
   * The programmatic initial focus of a pointer-driven open lands without a
   * highlight until the pointer moves onto the item or keyboard navigation
   * begins. Reflected as `data-highlighted`.
   */
  readonly highlighted = this.#highlighted.asReadonly();

  #suppressNextFocusHighlight = false;

  /**
   * Fires on click / Enter / Space activation. Call `preventDefault()`
   * on the emitted veto to keep the menu open after activation.
   */
  readonly activate = output<VetoableEvent>();

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.effectiveDisabled,
      textValue: this.textValue,
      suppressHighlightOnNextFocus: () => {
        this.#suppressNextFocusHighlight = true;
      },
      clearHighlight: () => {
        this.#highlighted.set(false);
      },
    };
    registerHandle(
      handle,
      (h) => this.menu.registerItem(h),
      (h) => this.menu.unregisterItem(h),
    );
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.group.select(this.value());
    if (!emitVetoableEvent(this.activate)) {
      this.menu.closeMenu('select');
    }
  }

  protected onFocus(): void {
    if (this.#suppressNextFocusHighlight) {
      this.#suppressNextFocusHighlight = false;
      return;
    }
    this.#highlighted.set(true);
  }

  protected onBlur(): void {
    this.#suppressNextFocusHighlight = false;
    this.#highlighted.set(false);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (event.pointerType !== '' && event.pointerType !== 'mouse') {
      return;
    }
    if (this.effectiveDisabled()) {
      return;
    }
    const host = this.#host.nativeElement;
    if (host.ownerDocument.activeElement !== host) {
      host.focus({ preventScroll: true });
    }
    this.#highlighted.set(true);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (handleMenuHorizontalArrow(event, this.menu)) {
      return;
    }
    // APG menubar guidance: Space sets the group value without closing the
    // menu (Enter and click still close via native button activation).
    // preventDefault here suppresses the browser-synthesized click.
    if (event.key === ' ') {
      event.preventDefault();
      this.group.select(this.value());
      this.activate.emit(createVetoableEvent());
      return;
    }
    const action = resolveListNavigation(event, { orientation: 'vertical' });
    if (action) {
      event.preventDefault();
      this.menu.navigate(this.#host.nativeElement, action);
      return;
    }
    if (event.key === 'Tab') {
      handleMenuTabOut(this.menu);
      return;
    }
    this.menu.handleTypeahead(event);
  }
}
