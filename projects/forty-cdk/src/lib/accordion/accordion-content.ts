import { Directive } from '@angular/core';

import { injectAccordionItemContext } from './accordion-context';

/**
 * Panel revealed by a `ForAccordionTrigger`. Hidden via the native `hidden`
 * attribute when closed and labelled by the trigger via `aria-labelledby`.
 *
 * APG note: `role="region"` adds the panel to the landmark navigation tree.
 * If the accordion has 6+ simultaneously expandable panels, consider not
 * using region — the directive will gain an opt-out input when this comes up
 * in real usage.
 */
@Directive({
  selector: '[forAccordionContent]',
  exportAs: 'forAccordionContent',
  host: {
    '[id]': 'item.contentId()',
    '[attr.role]': '"region"',
    '[attr.aria-labelledby]': 'item.triggerId()',
    '[attr.data-state]': 'item.expanded() ? "open" : "closed"',
    '[attr.hidden]': 'item.expanded() ? null : ""',
  },
})
export class ForAccordionContent {
  protected readonly item = injectAccordionItemContext('ForAccordionContent');
}
