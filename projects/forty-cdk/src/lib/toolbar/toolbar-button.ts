import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { FOR_TOOLBAR_CONTEXT } from './toolbar-context';

/**
 * Plain push button inside `[forToolbar]`. Apply on `<button>` so Enter /
 * Space activate via native semantics. The directive forces `type="button"`
 * to avoid accidental form submission inside a `<form>`.
 */
@Directive({
  selector: '[forToolbarButton]',
  exportAs: 'forToolbarButton',
  host: {
    type: 'button',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-orientation]': 'toolbar?.orientation()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForToolbarButton {
  protected readonly toolbar = inject(FOR_TOOLBAR_CONTEXT, { optional: true });
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Per-item disabled (in addition to the toolbar's `disabled`). */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly effectiveDisabled = computed(
    () => this.disabled() || (this.toolbar?.disabled() ?? false),
  );

  readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled() || !this.toolbar) {
      return this.effectiveDisabled() ? -1 : 0;
    }
    return this.toolbar.isFirstFocusableItem(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    if (!this.toolbar) {
      throw new Error(
        '[forty-cdk/toolbar] ForToolbarButton must be used inside a [forToolbar] element.',
      );
    }
    const toolbar = this.toolbar;
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.effectiveDisabled,
    };
    registerHandle(
      handle,
      (h) => toolbar.registerItem(h),
      (h) => toolbar.unregisterItem(h),
    );
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || !this.toolbar) {
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
