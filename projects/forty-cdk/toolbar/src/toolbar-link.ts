import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle, navigateFromRovingItem } from 'forty-cdk/core';
import { injectToolbarContext } from './toolbar-context';

/**
 * Hyperlink inside `[forToolbar]`. Apply on `<a>`. Honors the toolbar's
 * roving tabindex and arrow-key navigation; `Enter` follows the link via
 * native semantics.
 */
@Directive({
  selector: '[forToolbarLink]',
  exportAs: 'forToolbarLink',
  host: {
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-orientation]': 'toolbar.orientation()',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
    '(click)': 'onClick($event)',
    '(auxclick)': 'onAuxClick($event)',
  },
})
export class ForToolbarLink {
  private readonly toolbar = injectToolbarContext('ForToolbarLink');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Per-item disabled (in addition to the toolbar's `disabled`). The link is
   * announced as `aria-disabled`, and neither a click nor a middle-click
   * follows its `href`.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether the link is effectively disabled — its own `disabled` input or the
   * surrounding `[forToolbar]`'s `disabled`. Drives `aria-disabled`,
   * `data-disabled`, the roving tab stop, and activation suppression.
   */
  readonly effectiveDisabled = computed(() => this.disabled() || this.toolbar.disabled());

  /**
   * Tabindex per APG: once any toolbar item has been focused, the roving
   * tracker owns the tab stop so re-entry restores the last focused item;
   * before that, fall back to the first-enabled entry point. Disabled links
   * are always -1: they never own the toolbar's single Tab stop, and the arrow
   * keys, Home and End skip them. They keep DOM focusability, so a link
   * disabled while focused can still be left with the arrow keys.
   */
  readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    if (this.toolbar.roving.hasActive()) {
      return this.toolbar.roving.tabindexFor(this.#host.nativeElement);
    }
    return this.toolbar.isFirstFocusableItem(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.effectiveDisabled,
    };
    registerHandle(
      handle,
      (h) => this.toolbar.registerItem(h),
      (h) => this.toolbar.unregisterItem(h),
    );
  }

  private onClick(event: MouseEvent): void {
    if (this.effectiveDisabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  private onAuxClick(event: MouseEvent): void {
    if (event.button === 1) {
      this.onClick(event);
    }
  }

  private onFocus(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.toolbar.roving.setActive(this.#host.nativeElement);
  }

  private onKeyDown(event: KeyboardEvent): void {
    navigateFromRovingItem(event, {
      groupDisabled: this.toolbar.disabled(),
      orientation: this.toolbar.orientation(),
      dir: this.toolbar.dir(),
      navigate: (action) => this.toolbar.navigate(this.#host.nativeElement, action),
    });
  }
}
