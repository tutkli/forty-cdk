import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
} from '@angular/core';

import { injectDismissableLayer } from '../_internal/dismissable-layer/dismissable-layer';
import { injectFloating } from '../_internal/floating/floating';
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
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
  },
})
export class ForComboboxContent {
  protected readonly ctx = injectComboboxContext('ForComboboxContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #dismissable = injectDismissableLayer();

  constructor() {
    this.ctx.registerContent(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterContent(this.#host.nativeElement));

    injectFloating({
      reference: this.ctx.anchor,
      open: this.ctx.open,
      placement: this.ctx.placement,
      offset: this.ctx.offset,
    });

    afterNextRender(() => {
      this.#dismissable.activate({
        // Escape is handled by the input directive (focus stays in the
        // input, so Escape there shouldn't bubble through nested layers
        // before the input sees it).
        onPointerDownOutside: (event) => this.ctx.emitPointerDownOutside(event),
        onFocusOutside: (event) => this.ctx.emitFocusOutside(event),
        onInteractOutside: (event) => this.ctx.emitInteractOutside(event),
        // The input owns the visible focus and toggles via its own click /
        // focus handlers. Without exemption pointer-down on the input would
        // race the dismissal layer.
        exemptElements: () => {
          const i = this.ctx.input();
          return i ? [i] : [];
        },
      });
    });

    inject(DestroyRef).onDestroy(() => {
      this.#dismissable.deactivate();
    });
  }
}
