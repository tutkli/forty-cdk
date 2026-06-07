import { computed, Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectAccordionContext, injectAccordionItemContext } from './accordion-context';

/**
 * Header button for a `ForAccordionItem`. Apply on a `<button type="button">`
 * wrapped in a heading element (`<h2>`–`<h6>`) so APG landmark navigation
 * works.
 *
 * Handles ARIA wiring, click-to-toggle, and the recommended keyboard
 * navigation (ArrowDown / ArrowUp / Home / End).
 *
 * `aria-controls` is emitted only while the item is expanded — mirroring the
 * overlay triggers' open-only gating — so the reference never dangles at an
 * unmounted panel under the recommended `@if (item.expanded())` mount pattern.
 */
@Directive({
  selector: '[forAccordionTrigger]',
  exportAs: 'forAccordionTrigger',
  host: {
    '[id]': 'item.triggerId()',
    '[attr.aria-expanded]': 'item.expanded() ? "true" : "false"',
    '[attr.aria-controls]': 'item.expanded() ? item.contentId() : null',
    '[attr.aria-disabled]': 'ariaDisabled() ? "true" : null',
    '[attr.disabled]': 'item.disabled() ? "" : null',
    '[attr.data-state]': 'item.expanded() ? "open" : "closed"',
    '[attr.data-orientation]': 'parent.orientation()',
    '(click)': 'item.toggle()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForAccordionTrigger {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly parent = injectAccordionContext('ForAccordionTrigger');
  protected readonly item = injectAccordionItemContext('ForAccordionTrigger');

  /**
   * APG: aria-disabled is true only when the panel is open AND the accordion
   * disallows collapse. A real `disabled` item is reflected via the native
   * `disabled` attribute instead.
   */
  protected readonly ariaDisabled = computed(() => {
    if (this.item.disabled()) {
      return false;
    }
    return this.item.expanded() && !this.parent.canCollapse(this.item.value());
  });

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.item.disabled,
    };
    registerHandle(
      handle,
      (h) => this.parent.registerTrigger(h),
      (h) => this.parent.unregisterTrigger(h),
    );
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const action = resolveListNavigation(event, {
      orientation: this.parent.orientation(),
      dir: this.parent.dir(),
    });
    if (!action) {
      return;
    }
    event.preventDefault();
    this.parent.focusByOffset(this.#host.nativeElement, action);
  }
}
