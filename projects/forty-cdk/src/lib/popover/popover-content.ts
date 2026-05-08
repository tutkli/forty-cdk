import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectDismissableLayer } from '../_internal/dismissable-layer/dismissable-layer';
import { injectFloating } from '../_internal/floating/floating';
import { injectPopoverContext } from './popover-context';

/**
 * The popover surface. Carries `role="dialog"` (`aria-modal="false"`), is
 * portaled to `document.body`, and is positioned by `@floating-ui/dom`
 * against the registered `[forPopoverTrigger]`.
 *
 * The directive does not manage DOM presence — wrap with
 * `@if (popoverOpen())` so `animate.enter` / `animate.leave` fire on
 * the natural mount / unmount cycle. While mounted the directive
 * activates a `DismissableLayer` (Escape, pointer-down outside, focus
 * outside) and sends focus to the configured `initialFocus` target;
 * on unmount it returns focus to the trigger if `returnFocus` is on.
 *
 * The trigger is exempt from the layer's outside checks, so clicking
 * it again just toggles via the trigger directive — no double-close
 * race.
 */
@Directive({
  selector: '[forPopoverContent]',
  exportAs: 'forPopoverContent',
  host: {
    role: 'dialog',
    '[attr.aria-modal]': '"false"',
    '[id]': 'ctx.contentId()',
    '[attr.aria-label]': 'ctx.ariaLabel()',
    '[attr.aria-labelledby]': 'ctx.labelledBy()',
    '[attr.aria-describedby]': 'ctx.describedBy()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    tabindex: '-1',
  },
})
export class ForPopoverContent {
  protected readonly ctx = injectPopoverContext('ForPopoverContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #dismissable = injectDismissableLayer();

  constructor() {
    injectFloating({
      reference: this.ctx.reference,
      open: this.ctx.open,
      side: this.ctx.side,
      align: this.ctx.align,
      sideOffset: this.ctx.sideOffset,
      alignOffset: this.ctx.alignOffset,
      avoidCollisions: this.ctx.avoidCollisions,
      collisionPadding: this.ctx.collisionPadding,
      arrowPadding: this.ctx.arrowPadding,
      sticky: this.ctx.sticky,
      hideWhenDetached: this.ctx.hideWhenDetached,
      arrow: this.ctx.arrow,
    });

    afterNextRender(() => {
      this.#dismissable.activate({
        onEscapeKeyDown: (event) => this.ctx.emitEscapeKeyDown(event),
        onPointerDownOutside: (event) => this.ctx.emitPointerDownOutside(event),
        onFocusOutside: (event) => this.ctx.emitFocusOutside(event),
        onInteractOutside: (event) => this.ctx.emitInteractOutside(event),
        // The trigger lives outside the portaled content but is logically
        // "inside" the popover for outside-pointer / outside-focus checks
        // — without this, clicking the trigger to close would race with
        // its own toggle and you'd end up reopening immediately.
        exemptElements: () => {
          const trigger = this.ctx.trigger();
          return trigger ? [trigger] : [];
        },
      });

      // Send focus into the popover. Non-modal: no trap, so Tab is free
      // to move out (and `onFocusOutside` will fire and close unless
      // dismissible is off). Consumers can veto the imperative focus move
      // via `(autoFocusOnOpen)` (e.g. to keep focus on the input that
      // opened the popover).
      if (!this.ctx.emitAutoFocusOnOpen()) {
        const initial = this.ctx.initialFocus();
        const host = this.#host.nativeElement;
        if (initial === 'container') {
          host.focus();
        } else {
          const first = host.querySelector<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          );
          (first ?? host).focus();
        }
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.#dismissable.deactivate();
      // Return focus *before* the portal helper removes the DOM node so
      // the trigger receives the focus event in a stable layout.
      // `(autoFocusOnClose)` lets the consumer veto the return-focus.
      const skipReturnFocus = this.ctx.emitAutoFocusOnClose();
      if (this.ctx.returnFocus() && !skipReturnFocus) {
        this.ctx.trigger()?.focus();
      }
    });
  }
}
