import { Directive } from '@angular/core';

/**
 * Decorative separator between options or groups inside a
 * `[forComboboxContent]`. Carries `role="separator"` and is intentionally
 * not registered with the listbox's option collection, so keyboard
 * navigation skips it automatically.
 */
@Directive({
  selector: '[forComboboxSeparator]',
  exportAs: 'forComboboxSeparator',
  host: {
    role: 'separator',
    'aria-orientation': 'horizontal',
  },
})
export class ForComboboxSeparator {}
