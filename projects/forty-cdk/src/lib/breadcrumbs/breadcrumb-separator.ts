import { Directive } from '@angular/core';

/**
 * Decorative divider rendered between breadcrumb items (a `/`, `>`, chevron,
 * etc.). Reflects `aria-hidden="true"` so assistive technology skips it — the
 * trail's structure is already conveyed by the list and the links, making the
 * visual separator redundant in the accessibility tree.
 */
@Directive({
  selector: '[forBreadcrumbSeparator]',
  exportAs: 'forBreadcrumbSeparator',
  host: {
    'aria-hidden': 'true',
  },
})
export class ForBreadcrumbSeparator {}
