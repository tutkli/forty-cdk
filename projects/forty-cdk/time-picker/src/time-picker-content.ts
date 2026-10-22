import { Directive, ElementRef, inject, type Signal, signal } from '@angular/core';

import {
  registerHandle,
  hostAriaLabel,
  hostLabelledBy,
  injectFieldLabelExemption,
  pressFocusesDescendant,
  preventPointerFocus,
  FOR_FIELD_ANCHOR_CONTEXT,
  FOR_FIELD_CONTEXT,
} from 'forty-cdk/core';
import { injectModalShell, warnIfMountedWhileClosed } from 'forty-cdk/core-overlay';
import { injectOverlayShell } from 'forty-cdk/core-anchored';
import { injectTimePickerContext } from './time-picker-context';

/**
 * The listbox surface of the time picker. Carries `role="listbox"`, is
 * portaled to `document.body`, and is positioned by `@floating-ui/dom`
 * against the trigger.
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap with `@if (open())` so `animate.enter` / `animate.leave` fire on the
 * natural mount cycle. While mounted it dismisses on Escape, pointer-down
 * outside or focus outside; the trigger element is exempt from outside-pointer
 * checks so trigger clicks toggle without dismissal racing.
 *
 * Initial focus is sent to the selected slot (`'selected'`), the first
 * enabled slot (`'first'`), or the last enabled slot (`'last'`) according to
 * the trigger's hint, and that slot is scrolled into view once the surface has
 * been positioned. On destroy, focus returns to the trigger when
 * `returnFocus` is true, except after an outside close, where focus stays
 * where the interaction moved it. A Tab that leaves the surface from anything
 * that is not a slot continues from the trigger.
 *
 * A mouse press on the surface that lands on no focusable element of its own
 * (padding, a heading) is cancelled, so focus stays on the slot that held
 * it and the arrow keys keep working; a press on a slot still focuses it, and a
 * press on another focusable descendant takes focus wherever the browser puts it.
 *
 * In modal mode, modality is conveyed behaviorally — by the `inert` siblings
 * the shell applies — and reflected as `data-modal` for styling. `aria-modal`
 * is not emitted: `role="listbox"` does not support it, so the
 * attribute would be an `aria-allowed-attr` violation that announces nothing.
 *
 * A field boundary: a control inside it never registers with an ancestor
 * `[forField]`, and a `[forField]` inside it still wires its own control.
 */
@Directive({
  selector: '[forTimePickerContent]',
  exportAs: 'forTimePickerContent',
  host: {
    role: 'listbox',
    tabindex: '-1',
    '[id]': 'ctx.overlay.contentId()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-orientation]': 'ctx.orientation()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-orientation]': 'ctx.orientation()',
    '[attr.data-modal]': 'modal() ? "" : null',
    '(pointerleave)': 'onPointerLeave()',
  },
  providers: [
    { provide: FOR_FIELD_CONTEXT, useValue: null },
    { provide: FOR_FIELD_ANCHOR_CONTEXT, useValue: null },
  ],
})
export class ForTimePickerContent {
  private readonly ctx = injectTimePickerContext('ForTimePickerContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly modal: Signal<boolean>;

  private readonly resolvedAriaLabel = hostAriaLabel(() => this.ctx.ariaLabel());

  private readonly labelledBy = hostLabelledBy(() =>
    this.resolvedAriaLabel() ? null : this.ctx.overlay.triggerId(),
  );

  constructor() {
    const ctx = this.ctx;
    const host = this.#host.nativeElement;
    registerHandle(
      host,
      (el) => ctx.overlay.registerContent(el),
      (el) => ctx.overlay.unregisterContent(el),
    );
    preventPointerFocus((event) => !pressFocusesDescendant(event, host));

    warnIfMountedWhileClosed({
      primitive: 'time-picker',
      piece: '[forTimePickerContent]',
      condition: 'picker.open()',
      open: ctx.open,
    });

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
      this.modal = injectModalShell({
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
            ctx.overlay.closeOverlay(reason);
          },
          emitEscapeKeyDown: (veto) => ctx.overlay.forwardEscapeKeyDown(veto),
          emitPointerDownOutside: (veto) => ctx.overlay.emitPointerDownOutside(veto),
          emitFocusOutside: (veto) => ctx.overlay.emitFocusOutside(veto),
          emitInteractOutside: (veto) => ctx.overlay.emitInteractOutside(veto),
        },
      }).modal;
      this.#publishModal();
      return;
    }

    this.modal = signal(false).asReadonly();
    this.#publishModal();
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
        sticky: ctx.sticky,
        hideWhenDetached: ctx.hideWhenDetached,
        clipUntilPositioned: ctx.clipUntilPositioned,
        onFirstPosition: () => ctx.revealInitialFocus(),
      },
      dismiss: {
        dismissible: ctx.dismissible,
        requestClose: (reason) => {
          ctx.markTouched();
          ctx.overlay.closeOverlay(reason);
        },
        emitEscapeKeyDown: (event) => ctx.overlay.emitEscapeKeyDown(event),
        emitPointerDownOutside: (veto) => ctx.overlay.emitPointerDownOutside(veto),
        emitFocusOutside: (veto) => ctx.overlay.emitFocusOutside(veto),
        emitInteractOutside: (veto) => ctx.overlay.emitInteractOutside(veto),
        exemptElements: injectFieldLabelExemption(() => {
          const t = ctx.overlay.trigger();
          return t ? [t] : [];
        }),
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
      tabOut: ctx.tabOut,
    });
  }

  #publishModal(): void {
    const ctx = this.ctx;
    registerHandle(
      this.modal,
      (modal) => ctx.registerContentModal(modal),
      (modal) => ctx.unregisterContentModal(modal),
    );
  }

  private onPointerLeave(): void {
    this.ctx.releasePointerHighlight();
  }
}
