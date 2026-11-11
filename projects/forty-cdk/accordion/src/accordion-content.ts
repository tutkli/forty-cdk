import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import {
  HIDDEN_UNTIL_FOUND,
  hostLabelledBy,
  keepHiddenUntilFound,
  registerHandle,
} from 'forty-cdk/core';
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
 * Set `hiddenUntilFound` on a mounted panel to hide it with
 * `hidden="until-found"` instead, so find-in-page can reach its text and open it.
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
    '[attr.hidden]': 'untilFound() ? hiddenValue : null',
    '[attr.aria-hidden]': 'item.expanded() || hiddenUntilFound() ? null : "true"',
    '[attr.inert]': 'item.expanded() || hiddenUntilFound() ? null : ""',
    '[attr.data-state]': 'item.expanded() ? "open" : "closed"',
    '[attr.data-disabled]': 'item.disabled() ? "" : null',
    '[attr.data-orientation]': 'parent.orientation()',
    '(beforematch)': 'onBeforeMatch()',
  },
})
export class ForAccordionContent {
  private readonly parent = injectAccordionContext('ForAccordionContent');
  private readonly item = injectAccordionItemContext('ForAccordionContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * When set, a collapsed panel is hidden with `hidden="until-found"` in place of
   * `aria-hidden` + `inert`, and a find-in-page match or fragment navigation inside it
   * expands the item as a trigger click would. A disabled item stays collapsed. Closing
   * is instant, so the opt-in rules out an exit animation.
   */
  readonly hiddenUntilFound = input(false, { transform: booleanAttribute });

  private readonly hiddenValue = HIDDEN_UNTIL_FOUND;

  private readonly untilFound = computed(() => this.hiddenUntilFound() && !this.item.expanded());

  private readonly labelledBy = hostLabelledBy(() => this.item.triggerId());

  constructor() {
    this.item.adoptContentId(this.#host);
    registerHandle(
      this.item,
      (item) => this.parent.registerContent(item),
      (item) => this.parent.unregisterContent(item),
    );
  }

  private onBeforeMatch(): void {
    if (!this.untilFound()) {
      return;
    }
    this.item.toggle();
    if (this.untilFound()) {
      keepHiddenUntilFound(this.#host, () => this.untilFound());
    }
  }
}
