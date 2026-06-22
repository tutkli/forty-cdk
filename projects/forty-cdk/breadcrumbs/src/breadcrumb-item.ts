import { booleanAttribute, Directive, input } from '@angular/core';

/**
 * A single link within a breadcrumb trail. Apply on an `<a>` so navigation is
 * native. Set `current` on the link that points to the page the user is on —
 * it reflects [`aria-current="page"`](https://www.w3.org/TR/wai-aria-1.2/#aria-current)
 * so assistive technology announces it as the current location.
 */
@Directive({
  selector: '[forBreadcrumbItem]',
  exportAs: 'forBreadcrumbItem',
  host: {
    '[attr.aria-current]': 'current() ? "page" : null',
  },
})
export class ForBreadcrumbItem {
  /**
   * Whether this item represents the page the user is currently on. The
   * current item reflects `aria-current="page"`; all others emit no
   * `aria-current` attribute.
   */
  readonly current = input(false, { transform: booleanAttribute });
}
