import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectMenuContext } from './menu-context';
import { handleMenuHorizontalArrow } from './menu-horizontal-arrow';

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
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
  },
})
export class ForMenuItem {
  protected readonly ctx = injectMenuContext('ForMenuItem');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

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

  readonly #highlighted = signal(false);
  /** True while this item has DOM focus. Reflected as `data-highlighted`. */
  readonly highlighted = this.#highlighted.asReadonly();

  /**
   * Fires on click / Enter / Space activation. The event is a `CustomEvent`;
   * call `event.preventDefault()` to keep the menu open after activation.
   */
  readonly select = output<Event>();

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.effectiveDisabled,
      textValue: this.textValue,
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

  protected onFocus(): void {
    this.#highlighted.set(true);
  }

  protected onBlur(): void {
    this.#highlighted.set(false);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    // ArrowLeft / ArrowRight: inside a submenu, close-submenu key collapses
    // one level; in the top menu of a menubar, both arrows switch to the
    // previous / next sibling menu.
    if (handleMenuHorizontalArrow(event, this.ctx)) {
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
