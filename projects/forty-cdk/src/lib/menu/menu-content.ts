import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectOverlayShell } from '../_internal/overlay-shell/overlay-shell';
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
 *
 * The lifecycle (positioner + dismissable layer + initial focus + return
 * focus) is owned by the shared `injectOverlayShell` helper.
 */
@Directive({
  // The same directive serves submenu content too — the behavior is identical
  // (the injected ctx is the [forMenuSub] in that case). The extra selector is
  // an alias for template readability.
  selector: '[forMenuContent], [forMenuSubContent]',
  exportAs: 'forMenuContent',
  host: {
    role: 'menu',
    '[id]': 'ctx.contentId()',
    '[attr.aria-labelledby]': 'ctx.ariaLabel() ? null : ctx.triggerId()',
    '[attr.aria-label]': 'ctx.ariaLabel() || null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    tabindex: '-1',
  },
})
export class ForMenuContent {
  protected readonly ctx = injectMenuContext('ForMenuContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.ctx.registerContent(el),
      (el) => this.ctx.unregisterContent(el),
    );

    injectOverlayShell({
      positioner: {
        kind: 'floating',
        reference: this.ctx.anchor,
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
      },
      dismiss: {
        emitEscapeKeyDown: (event) => this.ctx.emitEscapeKeyDown(event),
        emitPointerDownOutside: (event) => this.ctx.emitPointerDownOutside(event),
        emitFocusOutside: (event) => this.ctx.emitFocusOutside(event),
        emitInteractOutside: (event) => this.ctx.emitInteractOutside(event),
        // DropdownMenu's trigger is exempt (its own click handler toggles —
        // without exemption pointer-down-outside would race and double-close).
        // ContextMenu exempts nothing so left-clicks on the region close the
        // menu like any other outside click.
        exemptElements: () => this.ctx.dismissableExemptions(),
      },
      // Primitive-owned move: focusFirstEnabledItem / focusLastEnabledItem
      // each return `true` on success. The shell falls back to focusing the
      // host element on miss, which mirrors the previous hand-rolled code.
      initialFocus: {
        move: () =>
          this.ctx.initialFocus() === 'last'
            ? this.ctx.focusLastEnabledItem()
            : this.ctx.focusFirstEnabledItem(),
        veto: () => this.ctx.emitAutoFocusOnOpen(),
      },
      returnFocus: {
        enabled: this.ctx.returnFocus,
        target: () => this.ctx.trigger(),
        // `(autoFocusOnClose)` lets the consumer veto the return-focus.
        veto: () => this.ctx.emitAutoFocusOnClose(),
      },
    });
  }
}
