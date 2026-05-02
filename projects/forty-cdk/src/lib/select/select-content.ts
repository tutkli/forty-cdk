import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
} from '@angular/core';

import { injectDismissableLayer } from '../_internal/dismissable-layer/dismissable-layer';
import { injectFloating } from '../_internal/floating/floating';
import { injectSelectContext } from './select-context';

/**
 * The listbox surface. Carries `role="listbox"`, is portaled to
 * `document.body`, and is positioned by `@floating-ui/dom` against the
 * trigger.
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap with `@if (open())` so `animate.enter` / `animate.leave` fire on the
 * natural mount cycle. While mounted, a `DismissableLayer` activates
 * (Escape, pointer-down outside, focus outside); the trigger element is
 * exempt from outside-pointer checks so trigger clicks toggle without
 * dismissal racing.
 *
 * Initial focus is sent to the selected option (`'selected'`), the first
 * enabled option (`'first'`), or the last enabled option (`'last'`)
 * according to the trigger's hint. On destroy, focus returns to the
 * trigger when `returnFocus` is true.
 */
@Directive({
  selector: '[forSelectContent]',
  exportAs: 'forSelectContent',
  host: {
    role: 'listbox',
    tabindex: '-1',
    '[id]': 'ctx.contentId()',
    '[attr.aria-labelledby]': 'ctx.ariaLabel() ? null : ctx.triggerId()',
    '[attr.aria-label]': 'ctx.ariaLabel()',
    '[attr.aria-multiselectable]': 'ctx.multiple() ? "true" : null',
    '[attr.aria-orientation]': 'ctx.orientation()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-orientation]': 'ctx.orientation()',
  },
})
export class ForSelectContent {
  protected readonly ctx = injectSelectContext('ForSelectContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #dismissable = injectDismissableLayer();

  constructor() {
    this.ctx.registerContent(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterContent(this.#host.nativeElement));

    injectFloating({
      reference: this.ctx.anchor,
      open: this.ctx.open,
      placement: this.ctx.placement,
      offset: this.ctx.offset,
    });

    afterNextRender(() => {
      this.#dismissable.activate({
        onEscapeKeyDown: (event) => this.ctx.emitEscapeKeyDown(event),
        onPointerDownOutside: (event) => this.ctx.emitPointerDownOutside(event),
        onFocusOutside: (event) => this.ctx.emitFocusOutside(event),
        onInteractOutside: (event) => this.ctx.emitInteractOutside(event),
        // Trigger button is exempt — its own click handler toggles open/close;
        // without exemption pointer-down-outside would race and double-close.
        exemptElements: () => {
          const t = this.ctx.trigger();
          return t ? [t] : [];
        },
      });

      const target = this.ctx.initialFocus();
      let focused = false;
      if (target === 'selected') {
        focused = this.ctx.focusSelectedOption() || this.ctx.focusFirstEnabledOption();
      } else if (target === 'last') {
        focused = this.ctx.focusLastEnabledOption();
      } else {
        focused = this.ctx.focusFirstEnabledOption();
      }
      if (!focused) {
        this.#host.nativeElement.focus();
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.#dismissable.deactivate();
      // Return focus *before* the portal helper removes the DOM node so the
      // trigger receives the focus event in a stable layout.
      if (this.ctx.returnFocus()) {
        this.ctx.trigger()?.focus();
      }
    });
  }
}
