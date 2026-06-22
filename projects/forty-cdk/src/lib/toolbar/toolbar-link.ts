import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle, resolveListNavigation } from 'forty-cdk/core';
import { FOR_TOOLBAR_CONTEXT } from './toolbar-context';

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
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-orientation]': 'toolbar?.orientation()',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
    '(click)': 'onClick($event)',
  },
})
export class ForToolbarLink {
  protected readonly toolbar = inject(FOR_TOOLBAR_CONTEXT, { optional: true });
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * When true the link is announced as disabled and clicks are suppressed.
   * Native `<a>` doesn't have a `disabled` attribute — we rely on
   * `aria-disabled` and prevent navigation in the click handler.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Tabindex per APG: once any toolbar item has been focused, the roving
   * tracker owns the tab stop so re-entry restores the last focused item;
   * before that, fall back to the first-enabled entry point. Disabled links
   * are always -1; a link used outside a toolbar keeps its natural 0.
   */
  readonly tabindex = computed<-1 | 0>(() => {
    if (this.disabled() || !this.toolbar) {
      return this.disabled() ? -1 : 0;
    }
    if (this.toolbar.roving.hasActive()) {
      return this.toolbar.roving.tabindexFor(this.#host.nativeElement);
    }
    return this.toolbar.isFirstFocusableItem(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    if (!this.toolbar) {
      throw new Error(
        '[forty-cdk/toolbar] ForToolbarLink must be used inside a [forToolbar] element.',
      );
    }
    const toolbar = this.toolbar;
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.disabled,
    };
    registerHandle(
      handle,
      (h) => toolbar.registerItem(h),
      (h) => toolbar.unregisterItem(h),
    );
  }

  protected onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
    }
  }

  protected onFocus(): void {
    if (this.disabled() || !this.toolbar) {
      return;
    }
    this.toolbar.roving.setActive(this.#host.nativeElement);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.disabled() || !this.toolbar) {
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
