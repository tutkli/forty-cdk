import { booleanAttribute, Directive, input } from '@angular/core';

/**
 * Visual + semantic separator between menu items. Never focused, never
 * registers with the menu's item collection, so keyboard navigation and
 * typeahead skip it automatically. Set `decorative` when the surrounding items
 * already convey the split and the line should be skipped by assistive tech.
 */
@Directive({
  selector: '[forMenuSeparator]',
  exportAs: 'forMenuSeparator',
  host: {
    '[attr.role]': 'roleAttr()',
    '[attr.aria-orientation]': 'ariaOrientationAttr()',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class ForMenuSeparator {
  /**
   * Axis the separator divides along, always reflected to `data-orientation`
   * and reflected to `aria-orientation` only for `vertical` (`horizontal` is
   * the ARIA default and is omitted). `horizontal` (default) splits items
   * stacked vertically — the common case in a vertical menu; `vertical` splits
   * items laid out horizontally.
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * When true, the separator is purely visual: it gets `role="none"` and no
   * `aria-orientation`, so assistive tech treats the surrounding items as a
   * single flow. `data-orientation` is still reflected for styling.
   */
  readonly decorative = input(false, { transform: booleanAttribute });

  protected roleAttr(): 'separator' | 'none' {
    return this.decorative() ? 'none' : 'separator';
  }

  protected ariaOrientationAttr(): 'vertical' | null {
    if (this.decorative()) {
      return null;
    }
    return this.orientation() === 'vertical' ? 'vertical' : null;
  }
}
