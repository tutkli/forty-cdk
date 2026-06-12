import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
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
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-orientation]': 'toolbar?.orientation()',
    '(focus)': 'onFocus()',
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

  /**
   * Tabindex per APG: once any toolbar item has been focused, the roving
   * tracker owns the tab stop so re-entry restores the last focused item;
   * before that, fall back to the first-enabled entry point. Disabled items
   * are always -1; a button used outside a toolbar keeps its natural 0.
   */
  readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled() || !this.toolbar) {
      return this.effectiveDisabled() ? -1 : 0;
    }
    if (this.toolbar.roving.hasActive()) {
      return this.toolbar.roving.tabindexFor(this.#host.nativeElement);
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
    reflectDisabled(this.effectiveDisabled);
  }

  protected onFocus(): void {
    if (this.effectiveDisabled() || !this.toolbar) {
      return;
    }
    this.toolbar.roving.setActive(this.#host.nativeElement);
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
