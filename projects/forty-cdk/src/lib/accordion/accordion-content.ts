import { Directive } from '@angular/core';

import {
  injectAccordionContext,
  injectAccordionItemContext,
} from './accordion-context';

/**
 * Panel revealed by a `ForAccordionTrigger`. The directive does not manage
 * DOM presence — wrap with `@if (item.expanded())` so panels mount and
 * unmount with the expanded state and `animate.enter` / `animate.leave`
 * work natively.
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
    '[attr.data-orientation]': 'parent.orientation()',
  },
})
export class ForAccordionContent {
  protected readonly parent = injectAccordionContext('ForAccordionContent');
  protected readonly item = injectAccordionItemContext('ForAccordionContent');
}
