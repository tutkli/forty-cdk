import { Directive, ElementRef, inject } from '@angular/core';

import { injectAccordionContext, injectAccordionItemContext } from './accordion-context';

/**
 * Panel revealed by a `ForAccordionTrigger`. The directive does not manage
 * DOM presence — wrap with `@if (item.expanded())` so panels mount and
 * unmount with the expanded state and `animate.enter` / `animate.leave`
 * work natively. If the consumer prefers to keep the panel mounted (for
 * CSS-only transitions or to preserve internal state), the directive
 * reflects `aria-hidden="true"` and `inert` while closed so the panel is
 * removed from the accessibility tree and focus order automatically.
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
    '[attr.aria-hidden]': 'item.expanded() ? null : "true"',
    '[attr.inert]': 'item.expanded() ? null : ""',
    '[attr.data-state]': 'item.expanded() ? "open" : "closed"',
    '[attr.data-orientation]': 'parent.orientation()',
  },
})
export class ForAccordionContent {
  protected readonly parent = injectAccordionContext('ForAccordionContent');
  protected readonly item = injectAccordionItemContext('ForAccordionContent');

  constructor() {
    this.item.adoptContentId(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement);
  }
}
