import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { hostButtonType, registerHandle, resolveListNavigation } from 'forty-cdk/core';
import { injectToolbarContext } from './toolbar-context';

/**
 * Plain push button inside `[forToolbar]`. Apply on `<button>` so Enter /
 * Space activate via native semantics. On a native `<button>` host the directive
 * forces `type="button"` — through a host binding, so a consumer `type="submit"`
 * is overridden — to avoid accidental form submission inside a `<form>`; any
 * other host element gets no `type` attribute, which is not valid there.
 */
@Directive({
  selector: '[forToolbarButton]',
  exportAs: 'forToolbarButton',
  host: {
    '[attr.type]': 'buttonType()',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-orientation]': 'toolbar.orientation()',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
    '(click)': 'onClick($event)',
  },
})
export class ForToolbarButton {
  protected readonly buttonType = hostButtonType();

  protected readonly toolbar = injectToolbarContext('ForToolbarButton');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Per-item disabled (in addition to the toolbar's `disabled`). */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether the button is effectively disabled — its own `disabled` input or
   * the surrounding `[forToolbar]`'s `disabled`. Drives `aria-disabled`,
   * `data-disabled`, the roving tab stop, and activation suppression.
   */
  readonly effectiveDisabled = computed(() => this.disabled() || this.toolbar.disabled());

  /**
   * Tabindex per APG: once any toolbar item has been focused, the roving
   * tracker owns the tab stop so re-entry restores the last focused item;
   * before that, fall back to the first-enabled entry point. Disabled items
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
