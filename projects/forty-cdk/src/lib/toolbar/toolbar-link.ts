import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
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

  readonly tabindex = computed<-1 | 0>(() => {
    if (this.disabled() || !this.toolbar) {
      return this.disabled() ? -1 : 0;
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
