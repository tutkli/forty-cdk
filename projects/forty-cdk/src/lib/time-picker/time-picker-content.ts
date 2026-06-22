import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle, injectModalShell, injectOverlayShell } from 'forty-cdk/core';
import { injectTimePickerContext } from './time-picker-context';

/**
 * The listbox surface of the time picker. Carries `role="listbox"`, is
 * portaled to `document.body`, and is positioned by `@floating-ui/dom`
 * against the trigger.
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap with `@if (open())` so `animate.enter` / `animate.leave` fire on the
 * natural mount cycle. While mounted, a `DismissableLayer` activates (Escape,
 * pointer-down outside, focus outside); the trigger element is exempt from
 * outside-pointer checks so trigger clicks toggle without dismissal racing.
 *
 * Initial focus is sent to the selected slot (`'selected'`), the first
 * enabled slot (`'first'`), or the last enabled slot (`'last'`) according to
 * the trigger's hint. On destroy, focus returns to the trigger when
 * `returnFocus` is true.
 */
@Directive({
  selector: '[forTimePickerContent]',
  exportAs: 'forTimePickerContent',
  host: {
    role: 'listbox',
    tabindex: '-1',
    '[id]': 'ctx.contentId()',
    '[attr.aria-labelledby]': 'ctx.ariaLabel() ? null : ctx.triggerId()',
    '[attr.aria-label]': 'ctx.ariaLabel()',
    '[attr.aria-modal]': 'ctx.modal() ? "true" : null',
    '[attr.aria-orientation]': 'ctx.orientation()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-orientation]': 'ctx.orientation()',
  },
})
export class ForTimePickerContent {
  protected readonly ctx = injectTimePickerContext('ForTimePickerContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const ctx = this.ctx;
    registerHandle(
      this.#host.nativeElement,
      (el) => ctx.registerContent(el),
      (el) => ctx.unregisterContent(el),
    );

    const focusInitial = (): boolean => {
      const target = ctx.initialFocus();
      if (target === 'selected') {
        return ctx.focusSelectedOption() || ctx.focusFirstEnabledOption();
      }
      if (target === 'last') {
        return ctx.focusLastEnabledOption();
      }
      return ctx.focusFirstEnabledOption();
    };

    if (ctx.modal()) {
      injectModalShell({
        modal: ctx.modal,
        returnFocus: ctx.returnFocus,
        initialFocus: {
          move: focusInitial,
          veto: () => ctx.emitAutoFocusOnOpen(),
        },
        autoFocusOnClose: () => (event) => {
          if (ctx.emitAutoFocusOnClose()) {
            event.preventDefault();
          }
        },
        dismiss: {
          dismissible: ctx.dismissible,
          requestClose: (reason) => {
            ctx.markTouched();
            ctx.closeMenu(reason);
          },
          emitEscapeKeyDown: (veto) => ctx.forwardEscapeKeyDown(veto),
          emitPointerDownOutside: (veto) => ctx.emitPointerDownOutside(veto),
          emitFocusOutside: (veto) => ctx.emitFocusOutside(veto),
          emitInteractOutside: (veto) => ctx.emitInteractOutside(veto),
        },
      });
      return;
    }

    injectOverlayShell({
      positioner: {
        kind: 'floating',
        reference: ctx.anchor,
        open: ctx.open,
        side: ctx.side,
        align: ctx.align,
        sideOffset: ctx.sideOffset,
        alignOffset: ctx.alignOffset,
        avoidCollisions: ctx.avoidCollisions,
        collisionPadding: ctx.collisionPadding,
        arrowPadding: ctx.arrowPadding,
        sticky: ctx.sticky,
        hideWhenDetached: ctx.hideWhenDetached,
        clipUntilPositioned: ctx.clipUntilPositioned,
      },
      dismiss: {
        dismissible: ctx.dismissible,
        requestClose: (reason) => {
          ctx.markTouched();
          ctx.closeMenu(reason);
        },
        emitEscapeKeyDown: (event) => ctx.emitEscapeKeyDown(event),
        emitPointerDownOutside: (veto) => ctx.emitPointerDownOutside(veto),
        emitFocusOutside: (veto) => ctx.emitFocusOutside(veto),
        emitInteractOutside: (veto) => ctx.emitInteractOutside(veto),
        exemptElements: () => {
          const t = ctx.trigger();
          return t ? [t] : [];
        },
      },
      initialFocus: {
        move: focusInitial,
        veto: () => ctx.emitAutoFocusOnOpen(),
      },
      returnFocus: {
        enabled: ctx.returnFocus,
        target: () => ctx.trigger(),
        veto: () => ctx.emitAutoFocusOnClose(),
        skip: () => ctx.lastCloseReason() === 'tab',
      },
    });
  }
}
