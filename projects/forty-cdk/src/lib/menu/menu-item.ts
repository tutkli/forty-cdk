import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectMenuContext } from './menu-context';

/**
 * A single action inside `[forMenuContent]`. Apply on a `<button>` so
 * Space / Enter activation come from native button semantics.
 *
 * Activation emits `(select)` and then closes the menu. To keep the menu
 * open after activation (e.g. the action toggled something the user
 * wants to refine), call `event.preventDefault()` on the emitted event.
 *
 * Disabled items remain in the tab/focus rotation (per APG) so screen
 * readers can announce them — `aria-disabled="true"` rather than the
 * native `disabled` attribute.
 */
@Directive({
  selector: '[forMenuItem]',
  exportAs: 'forMenuItem',
  host: {
    role: 'menuitem',
    type: 'button',
    tabindex: '-1',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForMenuItem {
  protected readonly ctx = injectMenuContext('ForMenuItem');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Per-item disabled, in addition to the menu's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx.disabled());

  /**
   * Fires on click / Enter / Space activation. The event is a `CustomEvent`;
   * call `event.preventDefault()` to keep the menu open after activation.
   */
  readonly select = output<Event>();

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.effectiveDisabled,
    };
    this.ctx.registerItem(handle);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterItem(handle));
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const event = new CustomEvent('forMenuItemSelect', { cancelable: true });
    this.select.emit(event);
    if (!event.defaultPrevented) {
      this.ctx.closeMenu('select');
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const action = resolveListNavigation(event, { orientation: 'vertical' });
    if (action) {
      event.preventDefault();
      this.ctx.navigate(this.#host.nativeElement, action);
      return;
    }
    if (event.key === 'Tab') {
      // Per APG: Tab closes the menu. preventDefault so focus return to the
      // trigger isn't fighting the browser's Tab advancement.
      event.preventDefault();
      this.ctx.closeMenu('tab');
      return;
    }
    this.ctx.handleTypeahead(event);
  }
}
