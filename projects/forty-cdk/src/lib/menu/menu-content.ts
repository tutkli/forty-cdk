import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
} from '@angular/core';

import { injectDismissableLayer } from '../_internal/dismissable-layer/dismissable-layer';
import { injectFloating } from '../_internal/floating/floating';
import { injectMenuContext } from './menu-context';

/**
 * The menu surface. Carries `role="menu"`, is portaled to `document.body`,
 * and is positioned by `@floating-ui/dom` against the registered anchor —
 * the trigger button for `[forDropdownMenu]`, or a virtual pointer element
 * for `[forContextMenu]`.
 *
 * The directive does not manage DOM presence — wrap with
 * `@if (open())` so `animate.enter` / `animate.leave` fire on the natural
 * mount cycle. While mounted, a `DismissableLayer` activates (Escape,
 * pointer-down outside, focus outside) and initial focus is sent to the
 * first or last menu item per the trigger's hint.
 *
 * The trigger element is exempt from the layer's outside-pointer checks,
 * so clicking the trigger again routes through its own toggle handler
 * without spuriously closing.
 */
@Directive({
  selector: '[forMenuContent]',
  exportAs: 'forMenuContent',
  host: {
    role: 'menu',
    '[id]': 'ctx.contentId()',
    '[attr.aria-labelledby]': 'ctx.triggerId()',
    '[attr.aria-label]': 'ctx.ariaLabel()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    tabindex: '-1',
  },
})
export class ForMenuContent {
  protected readonly ctx = injectMenuContext('ForMenuContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #dismissable = injectDismissableLayer();

  constructor() {
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
        // DropdownMenu's trigger is exempt (its own click handler toggles —
        // without exemption pointer-down-outside would race and double-close).
        // ContextMenu exempts nothing so left-clicks on the region close the
        // menu like any other outside click.
        exemptElements: () => this.ctx.dismissableExemptions(),
      });

      const focused =
        this.ctx.initialFocus() === 'last'
          ? this.ctx.focusLastEnabledItem()
          : this.ctx.focusFirstEnabledItem();
      if (!focused) {
        this.#host.nativeElement.focus();
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.#dismissable.deactivate();
      // Return focus *before* the portal helper removes the DOM node so
      // the trigger receives the focus event in a stable layout.
      if (this.ctx.returnFocus()) {
        this.ctx.trigger()?.focus();
      }
    });
  }
}
