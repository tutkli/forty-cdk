import { Directive, ElementRef, inject } from '@angular/core';

import {
  registerHandle,
  hostAriaLabel,
  hostLabelledBy,
  injectModalShell,
  injectOverlayShell,
} from 'forty-cdk/core';
import { injectTimePickerContext } from './time-picker-context';

/**
 * The listbox surface of the time picker. Carries `role="listbox"`, is
 * portaled to `document.body`, and is positioned by `@floating-ui/dom`
 * against the trigger.
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap with `@if (open())` so `animate.enter` / `animate.leave` fire on the
 * natural mount cycle. While mounted, a `DismissibleLayer` activates (Escape,
 * pointer-down outside, focus outside); the trigger element is exempt from
 * outside-pointer checks so trigger clicks toggle without dismissal racing.
 *
 * Initial focus is sent to the selected slot (`'selected'`), the first
 * enabled slot (`'first'`), or the last enabled slot (`'last'`) according to
 * the trigger's hint. On destroy, focus returns to the trigger when
 * `returnFocus` is true.
 *
 * In modal mode, modality is conveyed behaviorally — by the `inert` siblings
 * the shell applies — and reflected as `data-modal` for styling. `aria-modal`
 * is deliberately not emitted: `role="listbox"` does not support it, so the
 * attribute would be an `aria-allowed-attr` violation that announces nothing.
 */
@Directive({
  selector: '[forTimePickerContent]',
  exportAs: 'forTimePickerContent',
  host: {
    role: 'listbox',
    tabindex: '-1',
    '[id]': 'ctx.overlay.contentId()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-orientation]': 'ctx.orientation()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-orientation]': 'ctx.orientation()',
    '[attr.data-modal]': 'ctx.modal() ? "" : null',
  },
})
export class ForTimePickerContent {
  protected readonly ctx = injectTimePickerContext('ForTimePickerContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ctx.ariaLabel());

  protected readonly labelledBy = hostLabelledBy(() =>
    this.resolvedAriaLabel() ? null : this.ctx.overlay.triggerId(),
  );

  constructor() {
    const ctx = this.ctx;
    registerHandle(
      this.#host.nativeElement,
      (el) => ctx.overlay.registerContent(el),
      (el) => ctx.overlay.unregisterContent(el),
    );

    const focusInitial = (): boolean => {
      const target = ctx.overlay.initialFocus();
      if (target === 'selected') {
        return ctx.focusSelectedOption() || ctx.overlay.focusFirstEnabledOption();
      }
      if (target === 'last') {
        return ctx.overlay.focusLastEnabledOption();
      }
      return ctx.overlay.focusFirstEnabledOption();
    };

    if (ctx.modal()) {
      injectModalShell({
        modal: ctx.modal,
        returnFocus: ctx.returnFocus,
        initialFocus: {
          move: focusInitial,
          veto: () => ctx.overlay.emitAutoFocusOnOpen(),
        },
        autoFocusOnClose: () => (event) => {
          if (ctx.overlay.emitAutoFocusOnClose()) {
            event.preventDefault();
          }
        },
        dismiss: {
          dismissible: ctx.dismissible,
          requestClose: (reason) => {
            ctx.markTouched();
            ctx.overlay.closeMenu(reason);
          },
          emitEscapeKeyDown: (veto) => ctx.overlay.forwardEscapeKeyDown(veto),
          emitPointerDownOutside: (veto) => ctx.overlay.emitPointerDownOutside(veto),
          emitFocusOutside: (veto) => ctx.overlay.emitFocusOutside(veto),
          emitInteractOutside: (veto) => ctx.overlay.emitInteractOutside(veto),
        },
      });
      return;
    }

    injectOverlayShell({
      positioner: {
        kind: 'floating',
        reference: ctx.overlay.anchor,
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
          ctx.overlay.closeMenu(reason);
        },
        emitEscapeKeyDown: (event) => ctx.overlay.emitEscapeKeyDown(event),
        emitPointerDownOutside: (veto) => ctx.overlay.emitPointerDownOutside(veto),
        emitFocusOutside: (veto) => ctx.overlay.emitFocusOutside(veto),
        emitInteractOutside: (veto) => ctx.overlay.emitInteractOutside(veto),
        exemptElements: () => {
          const t = ctx.overlay.trigger();
          return t ? [t] : [];
        },
      },
      initialFocus: {
        move: focusInitial,
        veto: () => ctx.overlay.emitAutoFocusOnOpen(),
      },
      returnFocus: {
        enabled: ctx.returnFocus,
        target: () => ctx.overlay.trigger(),
        veto: () => ctx.overlay.emitAutoFocusOnClose(),
        skip: () => ctx.overlay.lastCloseReason() === 'tab',
      },
    });
  }
}
