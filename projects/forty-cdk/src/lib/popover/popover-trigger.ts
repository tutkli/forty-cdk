import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import { injectPopoverContext } from './popover-context';

/**
 * Button that toggles the popover when clicked. Apply on a focusable
 * element — preferably a `<button>` — so keyboard users can reach it.
 *
 * Wires `aria-expanded`, `aria-controls`, and `aria-haspopup="dialog"`,
 * registers the host as the floating-ui anchor, and toggles the open
 * state on click. The trigger is exempt from the dismissable layer's
 * outside-pointer / outside-focus checks so its own click never
 * spuriously closes the popover.
 *
 * Disabling: the trigger merges its own `disabled` input OR the root's
 * `disabled` into `effectiveDisabled`, which drives the native `disabled`
 * attribute, `aria-disabled`, `data-disabled`, and the click guard.
 */
@Directive({
  selector: '[forPopoverTrigger]',
  exportAs: 'forPopoverTrigger',
  host: {
    type: 'button',
    '[id]': 'ctx.triggerId()',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.contentId() : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '(click)': 'onClick()',
  },
})
export class ForPopoverTrigger {
  protected readonly ctx = injectPopoverContext('ForPopoverTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Disables this trigger only, in addition to the root's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Whether the trigger is disabled — its own `disabled` input OR the root's. */
  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx.disabled());

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.ctx.registerTrigger(el),
      (el) => this.ctx.unregisterTrigger(el),
    );
    reflectDisabled(this.effectiveDisabled);
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.ctx.toggle();
  }
}
