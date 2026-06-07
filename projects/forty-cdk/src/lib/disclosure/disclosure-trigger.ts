import { Directive } from '@angular/core';

import { injectDisclosureContext } from './disclosure-context';

/**
 * Trigger button for a `ForDisclosure`. Apply on a `<button type="button">`
 * so Enter/Space toggling come from native button behavior.
 *
 * `aria-controls` is emitted only while open — mirroring the overlay triggers'
 * open-only gating — so the reference never dangles at an unmounted panel
 * under the recommended `@if (open())` mount pattern.
 */
@Directive({
  selector: '[forDisclosureTrigger]',
  exportAs: 'forDisclosureTrigger',
  host: {
    '[id]': 'ctx.triggerId()',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.contentId() : null',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.disabled]': 'ctx.disabled() ? "" : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(click)': 'ctx.toggle()',
  },
})
export class ForDisclosureTrigger {
  protected readonly ctx = injectDisclosureContext('ForDisclosureTrigger');
}
