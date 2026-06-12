import { Directive, ElementRef, inject } from '@angular/core';

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
 */
@Directive({
  selector: '[forDisclosureContent]',
  exportAs: 'forDisclosureContent',
  host: {
    '[id]': 'ctx.contentId()',
    '[attr.aria-hidden]': 'ctx.open() ? null : "true"',
    '[attr.inert]': 'ctx.open() ? null : ""',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
  },
})
export class ForDisclosureContent {
  protected readonly ctx = injectDisclosureContext('ForDisclosureContent');

  constructor() {
    this.ctx.adoptContentId(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement);
  }
}
