import { Directive, input } from '@angular/core';

/**
 * Visual + semantic separator between menu items. Decorative — never
 * focused, never registers with the menu's item collection.
 */
@Directive({
  selector: '[forMenuSeparator]',
  host: {
    role: 'separator',
    '[attr.aria-orientation]': 'orientation()',
  },
})
export class ForMenuSeparator {
  /**
   * Axis the separator divides along, reflected to `aria-orientation`.
   * `horizontal` (default) splits items stacked vertically — the common case
   * in a vertical menu; `vertical` splits items laid out horizontally.
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}
