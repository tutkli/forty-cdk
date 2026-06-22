import { computed, Directive, ElementRef, inject } from '@angular/core';

import { registerHandle, reflectDisabled, resolveListNavigation } from 'forty-cdk/core';
import { injectAccordionContext, injectAccordionItemContext } from './accordion-context';

/**
 * Header button for a `ForAccordionItem`. Apply on a `<button>` wrapped in a
 * heading element (`<h2>`–`<h6>`) so APG landmark navigation works. The
 * directive host-binds `type="button"` so a trigger inside a `<form>` never
 * submits it on toggle.
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
    type: 'button',
    '[id]': 'item.triggerId()',
    '[attr.aria-expanded]': 'item.expanded() ? "true" : "false"',
    '[attr.aria-controls]': 'item.expanded() ? item.contentId() : null',
    '[attr.aria-disabled]': 'ariaDisabled() ? "true" : null',
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
   * `disabled` attribute instead — the sanctioned exception in rule #561 (D2):
   * the trigger is a real single-purpose `<button>`, not a roving collection
   * item (every trigger stays independently in the Tab order; the arrow-key
   * navigation is an APG-optional enhancement layered on top, not a
   * roving-tabindex collection), so native `disabled` is correct here. The
   * button stays in the accessibility tree — screen readers still announce it
   * as unavailable in browse mode — while being dropped from the Tab order and
   * the arrow-key navigation (which `focusByOffset` already skips), keeping
   * disabled triggers uniformly unreachable. The APG Accordion pattern does not
   * require disabled headers to remain focusable.
   */
  protected readonly ariaDisabled = computed(() => {
    if (this.item.disabled()) {
      return false;
    }
    return this.item.expanded() && !this.parent.canCollapse(this.item.value());
  });

  constructor() {
    this.item.adoptTriggerId(this.#host.nativeElement);
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.item.disabled,
    };
    registerHandle(
      handle,
      (h) => this.parent.registerTrigger(h),
      (h) => this.parent.unregisterTrigger(h),
    );
    reflectDisabled(this.item.disabled);
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
