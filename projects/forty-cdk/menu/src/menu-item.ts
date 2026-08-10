import { booleanAttribute, computed, Directive, input, output } from '@angular/core';

import { hostButtonType, emitVetoableEvent, type VetoableEvent } from 'forty-cdk/core';
import { injectMenuContext } from 'forty-cdk/core-overlay';
import { createMenuItemInteraction } from './menu-item-interaction';

/**
 * A single action inside `[forMenuContent]`. Apply on a `<button>` so
 * Space / Enter activation come from native button semantics.
 *
 * Activation emits `(activate)` and then closes the menu. To keep the menu
 * open after activation (e.g. the action toggled something the user
 * wants to refine), call `event.preventDefault()` on the emitted event.
 *
 * Disabled items are skipped by arrow-key navigation, typeahead, and
 * Home/End, and ignore pointer hover, but stay in the DOM carrying
 * `aria-disabled="true"` (never the native `disabled` attribute) so assistive
 * tech can still perceive and announce them.
 */
@Directive({
  selector: '[forMenuItem]',
  exportAs: 'forMenuItem',
  host: {
    role: 'menuitem',
    '[attr.type]': 'buttonType()',
    tabindex: '-1',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'interaction.onFocus()',
    '(blur)': 'interaction.onBlur()',
    '(pointermove)': 'interaction.onPointerMove($event)',
  },
})
export class ForMenuItem {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectMenuContext('ForMenuItem');

  /** Per-item disabled, in addition to the menu's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Override the string used for typeahead matching. Defaults to `''`,
   * which falls back to the item's `textContent`. Set this when the item
   * DOM contains icons, kbd hints, or other text that shouldn't bleed
   * into the match — e.g. `<button forMenuItem textValue="New file">…</button>`
   * for an item rendered as `New file ⌘N`.
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
    if (this.ctx.handleTypeahead(event) && event.key === ' ') {
      event.preventDefault();
    }
  }
}
