import { Directive, ElementRef, inject } from '@angular/core';

import {
  registerHandle,
  hostLabelledBy,
  injectModalShell,
  injectOverlayShell,
} from 'forty-cdk/core';
import { injectDatePickerContext } from './date-picker-context';

/**
 * The date-picker surface. Carries `role="dialog"`, is portaled to
 * `document.body`, and wraps the projected `ForCalendar`. It defers all of its
 * lifecycle to one of the two shared shells, picked once on construction from
 * `[forDatePicker].modal`:
 *
 * - **non-modal (default)** — `injectOverlayShell` anchors the surface to the
 *   trigger via `@floating-ui/dom`, activates a `DismissableLayer` (Escape,
 *   pointer-down outside, focus outside), moves focus to the calendar's roving
 *   cell on open, and returns focus to the trigger on close.
 * - **modal** — `injectModalShell` traps focus, inerts the background, and
 *   locks body scroll (a centered dialog the consumer positions with CSS, not
 *   trigger-anchored). Same Escape / outside-pointer dismiss and return-focus.
 *
 * The mode is read in the constructor rather than reactively because the two
 * shells are structurally different and switching at runtime would require a
 * remount. This is reliable: the surface mounts lazily (the consumer wraps it
 * with `@if (open())`), well after the root's `modal` input has settled.
 *
 * Mount/unmount of the surface is the consumer's responsibility — wrap with
 * `@if (open())` so `animate.enter` / `animate.leave` fire on the natural
 * mount cycle.
 */
@Directive({
  selector: '[forDatePickerContent]',
  exportAs: 'forDatePickerContent',
  host: {
    role: 'dialog',
    tabindex: '-1',
    '[id]': 'ctx.contentId()',
    '[attr.aria-label]': 'ctx.ariaLabel()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-modal]': 'ctx.modal() ? "true" : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
  },
})
export class ForDatePickerContent {
  protected readonly ctx = injectDatePickerContext('ForDatePickerContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly labelledBy = hostLabelledBy(() =>
    this.ctx.ariaLabel() ? null : this.ctx.triggerId(),
  );

  constructor() {
    const ctx = this.ctx;
    registerHandle(
      this.#host.nativeElement,
      (el) => ctx.registerContent(el),
      (el) => ctx.unregisterContent(el),
    );

    if (ctx.modal()) {
      injectModalShell({
        modal: ctx.modal,
        returnFocus: ctx.returnFocus,
        // Land on the calendar's active cell with a first-focusable fallback,
        // matching the non-modal path below — both modes focus the same cell.
        initialFocus: {
          move: () => ctx.focusCalendarCell(),
          veto: () => ctx.emitAutoFocusOnOpen(),
        },
        autoFocusOnOpen: () => (event) => {
          if (ctx.emitAutoFocusOnOpen()) {
            event.preventDefault();
          }
        },
        autoFocusOnClose: () => (event) => {
          if (ctx.emitAutoFocusOnClose()) {
            event.preventDefault();
          }
        },
        dismiss: {
          dismissible: ctx.dismissible,
          requestClose: () => ctx.requestClose(),
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
        reference: ctx.reference,
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
      },
      dismiss: {
        dismissible: ctx.dismissible,
        requestClose: () => ctx.requestClose(),
        emitEscapeKeyDown: (event) => ctx.emitEscapeKeyDown(event),
        emitPointerDownOutside: (veto) => ctx.emitPointerDownOutside(veto),
        emitFocusOutside: (veto) => ctx.emitFocusOutside(veto),
        emitInteractOutside: (veto) => ctx.emitInteractOutside(veto),
        // Trigger is exempt — its own click toggles open/close; without
        // exemption pointer-down-outside would race and double-close.
        exemptElements: () => {
          const trigger = ctx.trigger();
          return trigger ? [trigger] : [];
        },
      },
      // Move focus to the calendar's roving cell on open; the shell falls back
      // to the first focusable descendant when no cell is found.
      initialFocus: {
        move: () => ctx.focusCalendarCell(),
        veto: () => ctx.emitAutoFocusOnOpen(),
      },
      returnFocus: {
        enabled: ctx.returnFocus,
        target: () => ctx.trigger(),
        veto: () => ctx.emitAutoFocusOnClose(),
      },
    });
  }
}
