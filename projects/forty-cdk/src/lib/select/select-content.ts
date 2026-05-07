import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectDismissableLayer } from '../_internal/dismissable-layer/dismissable-layer';
import { injectFloating } from '../_internal/floating/floating';
import { injectItemAlignedPositioner } from '../_internal/floating/item-aligned';
import { injectPortal } from '../_internal/portal/portal';
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
    injectPortal();

    this.ctx.registerContent(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterContent(this.#host.nativeElement));

    // Static branch — `position` is read once on construction. Switching
    // modes at runtime would require re-creating the directive (mount /
    // unmount cycle), which is the expected pattern for primitives whose
    // positioning algorithm is structurally different.
    if (this.ctx.position() === 'item-aligned') {
      injectItemAlignedPositioner({
        reference: this.ctx.anchor,
        open: this.ctx.open,
        selectedOption: this.ctx.selectedOptionEl,
        collisionPadding: this.ctx.collisionPadding,
        portal: false,
      });
    } else {
      injectFloating({
        reference: this.ctx.anchor,
        open: this.ctx.open,
        placement: this.ctx.placement,
        side: this.ctx.side,
        align: this.ctx.align,
        offset: this.ctx.offset,
        sideOffset: this.ctx.sideOffset,
        alignOffset: this.ctx.alignOffset,
        avoidCollisions: this.ctx.avoidCollisions,
        collisionPadding: this.ctx.collisionPadding,
        arrowPadding: this.ctx.arrowPadding,
        sticky: this.ctx.sticky,
        hideWhenDetached: this.ctx.hideWhenDetached,
      });
    }

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

      // Consumers can veto the imperative focus move via `(autoFocusOnOpen)`.
      if (!this.ctx.emitAutoFocusOnOpen()) {
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
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.#dismissable.deactivate();
      // Return focus *before* the portal helper removes the DOM node so the
      // trigger receives the focus event in a stable layout. Skip on `'tab'`
      // closes — Tab already moved focus to the trigger and let the browser
      // advance from there; re-focusing would steal it back.
      // `(autoFocusOnClose)` lets the consumer veto the return-focus.
      const skipReturnFocus = this.ctx.emitAutoFocusOnClose();
      if (this.ctx.returnFocus() && !skipReturnFocus && this.ctx.lastCloseReason() !== 'tab') {
        this.ctx.trigger()?.focus();
      }
    });
  }
}
