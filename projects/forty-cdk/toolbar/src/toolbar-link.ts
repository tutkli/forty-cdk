import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle, resolveListNavigation } from 'forty-cdk/core';
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
  },
})
export class ForToolbarLink {
  protected readonly toolbar = injectToolbarContext('ForToolbarLink');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Per-item disabled (in addition to the toolbar's `disabled`). Native `<a>`
   * has no `disabled` attribute — we rely on `aria-disabled` and prevent
   * navigation in the click handler.
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
   * are always -1 — they stay arrow-reachable and focusable, they just never
   * own the toolbar's single Tab stop.
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

  protected onClick(event: MouseEvent): void {
    if (this.effectiveDisabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  protected onFocus(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.toolbar.roving.setActive(this.#host.nativeElement);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const action = resolveListNavigation(event, {
      orientation: this.toolbar.orientation(),
      dir: this.toolbar.dir(),
    });
    if (!action) {
      return;
    }
    event.preventDefault();
    this.toolbar.navigate(this.#host.nativeElement, action);
  }
}
