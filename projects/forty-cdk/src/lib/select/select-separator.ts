import { Directive } from '@angular/core';

/**
 * Decorative separator between options or groups inside a
 * `[forSelectContent]`. Carries `role="separator"` and is intentionally not
 * registered with the listbox's option collection, so keyboard navigation
 * and typeahead skip it automatically.
 */
@Directive({
  selector: '[forSelectSeparator]',
  exportAs: 'forSelectSeparator',
  host: {
    role: 'separator',
    'aria-orientation': 'horizontal',
  },
})
export class ForSelectSeparator {}
