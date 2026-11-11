import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { HIDDEN_UNTIL_FOUND, keepHiddenUntilFound, registerHandle } from 'forty-cdk/core';
import { injectDisclosureContext } from './disclosure-context';

/**
 * Disclosed content panel for a `ForDisclosure`. The directive does not
 * manage DOM presence — wrap with `@if (open())` so the panel mounts and
 * unmounts with the disclosure state, and use `animate.enter` /
 * `animate.leave` for transitions if desired. If the consumer prefers to
 * keep the panel mounted (for CSS-only transitions or to preserve internal
 * state), the directive reflects `aria-hidden="true"` and `inert` while
 * closed so the panel is removed from the accessibility tree and focus
 * order automatically.
 *
 * Set `hiddenUntilFound` on a mounted panel to hide it with
 * `hidden="until-found"` instead, so find-in-page can reach its text and open it.
 */
@Directive({
  selector: '[forDisclosureContent]',
  exportAs: 'forDisclosureContent',
  host: {
    '[id]': 'ctx.contentId()',
    '[attr.hidden]': 'untilFound() ? hiddenValue : null',
    '[attr.aria-hidden]': 'ctx.open() || hiddenUntilFound() ? null : "true"',
    '[attr.inert]': 'ctx.open() || hiddenUntilFound() ? null : ""',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(beforematch)': 'onBeforeMatch()',
  },
})
export class ForDisclosureContent {
  private readonly ctx = injectDisclosureContext('ForDisclosureContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * When set, a closed panel is hidden with `hidden="until-found"` in place of
   * `aria-hidden` + `inert`, and a find-in-page match or fragment navigation inside it
   * opens the disclosure as a trigger click would. A disabled disclosure stays closed.
   * Closing is instant, so the opt-in rules out an exit animation.
   */
  readonly hiddenUntilFound = input(false, { transform: booleanAttribute });

  private readonly hiddenValue = HIDDEN_UNTIL_FOUND;

  private readonly untilFound = computed(() => this.hiddenUntilFound() && !this.ctx.open());

  constructor() {
    this.ctx.adoptContentId(this.#host);
    registerHandle(
      this.#host,
      (el) => this.ctx.registerContent(el),
      (el) => this.ctx.unregisterContent(el),
    );
  }

  private onBeforeMatch(): void {
    if (!this.untilFound()) {
      return;
    }
    this.ctx.toggle();
    if (this.untilFound()) {
      keepHiddenUntilFound(this.#host, () => this.untilFound());
    }
  }
}
