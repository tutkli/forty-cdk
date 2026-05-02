import { Directive } from '@angular/core';

import { injectDisclosureContext } from './disclosure-context';

/**
 * Disclosed content panel for a `ForDisclosure`. The directive does not
 * manage DOM presence — wrap with `@if (open())` so the panel mounts and
 * unmounts with the disclosure state, and use `animate.enter` /
 * `animate.leave` for transitions if desired.
 */
@Directive({
  selector: '[forDisclosureContent]',
  exportAs: 'forDisclosureContent',
  host: {
    '[id]': 'ctx.contentId()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
  },
})
export class ForDisclosureContent {
  protected readonly ctx = injectDisclosureContext('ForDisclosureContent');
}
