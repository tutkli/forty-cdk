import { Directive, input } from '@angular/core';

/**
 * Visual separator between options or groups inside a `[forSelectContent]`. Keyboard
 * navigation and typeahead skip it. It is always presentational (`role="none"`, no
 * `aria-orientation`), because a `role="listbox"` may own only `option` and `group`
 * children: wrap related options in a `[forSelectGroup]` with a group label when the split
 * must be announced.
 */
@Directive({
  selector: '[forSelectSeparator]',
  exportAs: 'forSelectSeparator',
  host: {
    role: 'none',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class ForSelectSeparator {
  /**
   * Axis the separator divides along, reflected to `data-orientation` for styling.
   * `horizontal` (default) splits options stacked vertically, the common case in a
   * listbox; `vertical` splits options laid out horizontally.
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}
