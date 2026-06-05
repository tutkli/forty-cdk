import { computed, Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectOverlayShell } from '../_internal/overlay-shell/overlay-shell';
import { injectComboboxContext } from './combobox-context';

/**
 * The listbox surface. Carries `role="listbox"`, is portaled to
 * `document.body`, and is positioned by `@floating-ui/dom` against the
 * input.
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap with `@if (open())` so `animate.enter` / `animate.leave` fire on
 * the natural mount cycle. While mounted, a `DismissableLayer` activates
 * for pointer-down outside / focus outside; the input element is exempt
 * from outside checks because it owns its own keydown handlers (Escape,
 * Tab) and outside-pointer dismissal would race with the input's focus.
 *
 * Focus stays in the input — this directive never moves DOM focus.
 * Active-option highlighting is driven by `aria-activedescendant` on the
 * input; the listbox surface itself sets `tabindex="-1"` so screen
 * readers don't try to land on it.
 *
 * The lifecycle (positioner + dismissable layer) is owned by the shared
 * `injectOverlayShell` helper. Combobox opts out of the shell's initial-
 * and return-focus bundles entirely (focus stays in the input throughout
 * the open lifecycle) and omits `emitEscapeKeyDown` from the dismiss
 * bundle (the input directive owns Escape because focus is on it).
 */
@Directive({
  selector: '[forComboboxContent]',
  exportAs: 'forComboboxContent',
  host: {
    role: 'listbox',
    tabindex: '-1',
    '[id]': 'ctx.contentId()',
    '[attr.aria-labelledby]': 'ctx.ariaLabel() ? null : ctx.inputId()',
    '[attr.aria-label]': 'ctx.ariaLabel()',
    '[attr.aria-multiselectable]': 'ctx.multiple() ? "true" : null',
    '[attr.aria-setsize]': 'ariaSetSize()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
  },
})
export class ForComboboxContent {
  protected readonly ctx = injectComboboxContext('ForComboboxContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Reflects `aria-setsize` when the consumer wires up `[totalCount]` for
   * virtualization. Falls back to `null` (omitted) otherwise — leaving the
   * default option-count semantics screen readers already infer.
   */
  protected readonly ariaSetSize = computed<string | null>(() => {
    const total = this.ctx.totalCount();
    return total === undefined ? null : String(total);
  });

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
        dismissible: this.ctx.dismissible,
        requestClose: (reason) => this.ctx.requestClose(reason),
        // Escape is handled by the input directive (focus stays in the
        // input, so Escape there shouldn't bubble through nested layers
        // before the input sees it). Omitted here intentionally.
        emitPointerDownOutside: (veto) => this.ctx.emitPointerDownOutside(veto),
        emitFocusOutside: (veto) => this.ctx.emitFocusOutside(veto),
        emitInteractOutside: (veto) => this.ctx.emitInteractOutside(veto),
        // The input owns the visible focus and toggles via its own click /
        // focus handlers. Without exemption pointer-down on the input would
        // race the dismissal layer.
        exemptElements: () => {
          const i = this.ctx.input();
          return i ? [i] : [];
        },
      },
      // No initialFocus / returnFocus — focus stays in the input across the
      // entire open lifecycle. The shell skips both side effects.
    });
  }
}
