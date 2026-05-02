import { Directive } from '@angular/core';

import { injectDisclosureContext } from './disclosure-context';

/**
 * Disclosed content panel for a `ForDisclosure`. Hidden via the native
 * `hidden` attribute when closed; the consumer styles transitions off
 * `data-state="open|closed"` if needed.
 */
@Directive({
  selector: '[forDisclosureContent]',
  exportAs: 'forDisclosureContent',
  host: {
    '[id]': 'ctx.contentId()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '[attr.hidden]': 'ctx.open() ? null : ""',
  },
})
export class ForDisclosureContent {
  protected readonly ctx = injectDisclosureContext('ForDisclosureContent');
}
