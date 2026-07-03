import {
  booleanAttribute,
  computed,
  Directive,
  InjectionToken,
  input,
  output,
} from '@angular/core';

import {
  createVetoableEvent,
  emitVetoableEvent,
  type VetoableEvent,
  injectMenuContext,
} from 'forty-cdk/core';
import { createMenuItemInteraction } from './menu-item-interaction';
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
    '(focus)': 'interaction.onFocus()',
    '(blur)': 'interaction.onBlur()',
    '(pointermove)': 'interaction.onPointerMove($event)',
  },
})
export class ForMenuRadioItem {
  protected readonly menu = injectMenuContext('ForMenuRadioItem');
  protected readonly group = injectMenuRadioGroupContext('ForMenuRadioItem');

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

  protected readonly interaction = createMenuItemInteraction({
    ctx: this.menu,
    effectiveDisabled: this.effectiveDisabled,
    textValue: this.textValue,
  });

  /**
   * True while this item is the active keyboard candidate or hovered by the
   * pointer. Reflected as `data-highlighted`.
   */
  readonly highlighted = this.interaction.highlighted;

  /**
   * Fires on click / Enter / Space activation. Call `preventDefault()`
   * on the emitted veto to keep the menu open after activation.
   */
  readonly activate = output<VetoableEvent>();

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.group.select(this.value());
    if (!emitVetoableEvent(this.activate)) {
      this.menu.closeMenu('select');
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (this.interaction.handleNavigation(event)) {
      return;
    }
    // APG menubar guidance: Space sets the group value without closing the
    // menu (Enter and click still close via native button activation).
    // preventDefault here suppresses the browser-synthesized click.
    if (event.key === ' ') {
      event.preventDefault();
      if (this.menu.handleTypeahead(event)) {
        return;
      }
      this.group.select(this.value());
      this.activate.emit(createVetoableEvent());
      return;
    }
    this.menu.handleTypeahead(event);
  }
}
