import { Directive } from '@angular/core';

import { injectDisclosureContext } from './disclosure-context';

/**
 * Trigger button for a `ForDisclosure`. Apply on a `<button type="button">`
 * so Enter/Space toggling come from native button behavior.
 */
@Directive({
  selector: '[forDisclosureTrigger]',
  exportAs: 'forDisclosureTrigger',
  host: {
    '[id]': 'ctx.triggerId()',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.contentId()',
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
