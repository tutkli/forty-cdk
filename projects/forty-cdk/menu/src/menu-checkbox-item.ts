import {
  booleanAttribute,
  computed,
  Directive,
  InjectionToken,
  input,
  model,
  output,
} from '@angular/core';

import {
  createVetoableEvent,
  emitVetoableEvent,
  type VetoableEvent,
  injectMenuContext,
} from 'forty-cdk/core';
import { createMenuItemInteraction } from './menu-item-interaction';

/**
 * Injection key the `[forMenuItemIndicator]` uses to resolve a parent
 * checkbox item, decoupled from the concrete `ForMenuCheckboxItem` class.
 * `ForMenuCheckboxItem` provides itself under this token, so a design system
 * wrapping the item by subclassing re-points it at the subclass with a single
 * provider (`{ provide: FOR_MENU_CHECKBOX_ITEM, useExisting: MtxMenuCheckboxItem }`)
 * and the indicator keeps resolving — see `docs/wrapping-form-primitives.md`.
 */
export const FOR_MENU_CHECKBOX_ITEM = new InjectionToken<ForMenuCheckboxItem>(
  'FOR_MENU_CHECKBOX_ITEM',
);

/**
 * Tri-state-free checkbox item. Click and Enter toggle `checked`, emit
 * `(activate)`, and close the menu — `event.preventDefault()` on the emitted
 * event keeps the menu open. Per APG, **Space** toggles `checked` and
 * emits `(activate)` without closing the menu, so users can flip several
 * options in one open without consumer glue.
 */
@Directive({
  selector: '[forMenuCheckboxItem]',
  exportAs: 'forMenuCheckboxItem',
  providers: [{ provide: FOR_MENU_CHECKBOX_ITEM, useExisting: ForMenuCheckboxItem }],
  host: {
    role: 'menuitemcheckbox',
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
export class ForMenuCheckboxItem {
  protected readonly ctx = injectMenuContext('ForMenuCheckboxItem');

  /** Two-way bindable. */
  readonly checked = model<boolean>(false);
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Override the string used for typeahead matching. Defaults to `''`,
   * which falls back to the item's `textContent`. See `[forMenuItem]`
   * for the rationale.
   */
  readonly textValue = input<string>('');

  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx.disabled());

  protected readonly interaction = createMenuItemInteraction({
    ctx: this.ctx,
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
    this.checked.update((v) => !v);
    if (!emitVetoableEvent(this.activate)) {
      this.ctx.closeMenu('select');
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (this.interaction.handleNavigation(event)) {
      return;
    }
    // APG menubar guidance: Space toggles checked without closing the menu
    // (Enter and click still close via native button activation). preventDefault
    // here suppresses the browser-synthesized click so the menu stays open.
    if (event.key === ' ') {
      event.preventDefault();
      if (this.ctx.handleTypeahead(event)) {
        return;
      }
      this.checked.update((v) => !v);
      this.activate.emit(createVetoableEvent());
      return;
    }
    this.ctx.handleTypeahead(event);
  }
}
