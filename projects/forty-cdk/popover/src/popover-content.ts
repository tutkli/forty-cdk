import { Directive, ElementRef, inject } from '@angular/core';

import { hostAriaLabel, hostDescribedBy, hostLabelledBy } from 'forty-cdk/core';
import {
  toFloatingPositioner,
  injectOverlayShell,
  warnIfMountedWhileClosed,
} from 'forty-cdk/core-overlay';
import { injectPopoverContext } from './popover-context';

/**
 * The popover surface. Carries `role="dialog"` (non-modal — `aria-modal` is absent per APG), is
 * portaled to `document.body`, and is positioned by `@floating-ui/dom`
 * against the registered `[forPopoverTrigger]`.
 *
 * The directive does not manage DOM presence — wrap with
 * `@if (popoverOpen())` so `animate.enter` / `animate.leave` fire on
 * the natural mount / unmount cycle. While mounted the directive
 * activates a `DismissibleLayer` (Escape, pointer-down outside, focus
 * outside) and sends focus to the configured `initialFocus` target;
 * on unmount it returns focus to the trigger if `returnFocus` is on.
 *
 * The trigger is exempt from the layer's outside checks, so clicking
 * it again just toggles via the trigger directive — no double-close
 * race.
 *
 * The lifecycle (positioner + dismissible layer + initial focus + return
 * focus) is owned by the shared `injectOverlayShell` helper. The shell's
 * `'first'` mode routes through the same `findFirstFocusable` helper used
 * by `FocusTrap`, dropping the local focusable-selector copy that this
 * directive carried before.
 */
@Directive({
  selector: '[forPopoverContent]',
  exportAs: 'forPopoverContent',
  host: {
    role: 'dialog',
    '[id]': 'ctx.contentId()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-reduced-motion]': 'ctx.reducedMotion() ? "" : null',
    tabindex: '-1',
  },
})
export class ForPopoverContent {
  protected readonly ctx = injectPopoverContext('ForPopoverContent');

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ctx.ariaLabel());
  protected readonly labelledBy = hostLabelledBy(() => this.ctx.labelledBy());
  protected readonly describedBy = hostDescribedBy(() => this.ctx.describedBy());

  constructor() {
    this.ctx.adoptContentId(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement);
    warnIfMountedWhileClosed({
      primitive: 'popover',
      piece: '[forPopoverContent]',
      condition: 'popover.open()',
      open: this.ctx.open,
    });
    injectOverlayShell({
      positioner: toFloatingPositioner(this.ctx, this.ctx.reference),
      dismiss: {
        dismissible: this.ctx.dismissible,
        requestClose: (reason) => this.ctx.requestClose(reason),
        emitEscapeKeyDown: (event) => this.ctx.emitEscapeKeyDown(event),
        emitPointerDownOutside: (veto) => this.ctx.emitPointerDownOutside(veto),
        emitFocusOutside: (veto) => this.ctx.emitFocusOutside(veto),
        emitInteractOutside: (veto) => this.ctx.emitInteractOutside(veto),
        // The trigger lives outside the portaled content but is logically
        // "inside" the popover for outside-pointer / outside-focus checks
        // — without this, clicking the trigger to close would race with
        // its own toggle and you'd end up reopening immediately.
        exemptElements: () => {
          const trigger = this.ctx.trigger();
          return trigger ? [trigger] : [];
        },
      },
      // `initialFocus()` is read once when the content mounts. The directive
      // re-mounts on every open (consumer wraps with `@if(open())`), so the
      // value is fresh each time.
      initialFocus: {
        move: this.ctx.initialFocus() === 'container' ? 'container' : 'first',
        veto: () => this.ctx.emitAutoFocusOnOpen(),
      },
      returnFocus: {
        enabled: this.ctx.returnFocus,
        target: () => this.ctx.trigger(),
        // `(autoFocusOnClose)` lets the consumer veto the return-focus.
        veto: () => this.ctx.emitAutoFocusOnClose(),
        skip: () => {
          const reason = this.ctx.lastCloseReason();
          return reason === 'pointerDownOutside' || reason === 'focusOutside';
        },
      },
    });
  }
}
