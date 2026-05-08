import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectOverlayShell } from '../_internal/overlay-shell/overlay-shell';
import type { OverlayShellPositionerConfig } from '../_internal/overlay-shell/overlay-shell';
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
 *
 * Positioning branches on `[forSelect].position`:
 * - `'popper'` (default) — standard `injectFloating` path with full Radix-style
 *   anchored placement (`side`, `align`, `sideOffset`, `alignOffset`, `flip`,
 *   `shift`, `arrow`, `hideWhenDetached`).
 * - `'item-aligned'` — `injectItemAlignedPositioner` overlays the listbox so
 *   the selected option's center aligns with the trigger's center. The
 *   anchored-placement inputs are documented as no-ops in this mode.
 *
 * The lifecycle (positioner + dismissable layer + initial focus + return
 * focus) is owned by the shared `injectOverlayShell` helper.
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

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.ctx.registerContent(el),
      (el) => this.ctx.unregisterContent(el),
    );

    // Static branch — `position` is read once on construction. Switching
    // modes at runtime would require re-creating the directive (mount /
    // unmount cycle), which is the expected pattern for primitives whose
    // positioning algorithm is structurally different.
    const positioner: OverlayShellPositionerConfig =
      this.ctx.position() === 'item-aligned'
        ? {
            kind: 'item-aligned',
            reference: this.ctx.anchor,
            open: this.ctx.open,
            selectedOption: this.ctx.selectedOptionEl,
            collisionPadding: this.ctx.collisionPadding,
          }
        : {
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
          };

    injectOverlayShell({
      positioner,
      dismiss: {
        emitEscapeKeyDown: (event) => this.ctx.emitEscapeKeyDown(event),
        emitPointerDownOutside: (event) => this.ctx.emitPointerDownOutside(event),
        emitFocusOutside: (event) => this.ctx.emitFocusOutside(event),
        emitInteractOutside: (event) => this.ctx.emitInteractOutside(event),
        // Trigger button is exempt — its own click handler toggles open/close;
        // without exemption pointer-down-outside would race and double-close.
        exemptElements: () => {
          const t = this.ctx.trigger();
          return t ? [t] : [];
        },
      },
      // Primitive-owned focus algorithm. `'selected'` falls back to first
      // when no option is selected, mirroring the previous code.
      initialFocus: {
        move: () => {
          const target = this.ctx.initialFocus();
          if (target === 'selected') {
            return this.ctx.focusSelectedOption() || this.ctx.focusFirstEnabledOption();
          }
          if (target === 'last') {
            return this.ctx.focusLastEnabledOption();
          }
          return this.ctx.focusFirstEnabledOption();
        },
        veto: () => this.ctx.emitAutoFocusOnOpen(),
      },
      returnFocus: {
        enabled: this.ctx.returnFocus,
        target: () => this.ctx.trigger(),
        // `(autoFocusOnClose)` lets the consumer veto the return-focus.
        veto: () => this.ctx.emitAutoFocusOnClose(),
        // Skip on `'tab'` closes — Tab already moved focus to the trigger
        // and let the browser advance from there; re-focusing would steal
        // it back.
        skip: () => this.ctx.lastCloseReason() === 'tab',
      },
    });
  }
}
