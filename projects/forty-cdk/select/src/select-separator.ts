import { booleanAttribute, Directive, input } from '@angular/core';

/**
 * Visual + semantic separator between options or groups inside a
 * `[forSelectContent]`. Carries `role="separator"` and is intentionally not
 * registered with the listbox's option collection, so keyboard navigation
 * and typeahead skip it automatically. Set `decorative` when the surrounding
 * options already convey the split and the line should be skipped by
 * assistive tech.
 */
@Directive({
  selector: '[forSelectSeparator]',
  exportAs: 'forSelectSeparator',
  host: {
    '[attr.role]': 'roleAttr()',
    '[attr.aria-orientation]': 'ariaOrientationAttr()',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class ForSelectSeparator {
  /**
   * Axis the separator divides along, always reflected to `data-orientation`
   * and reflected to `aria-orientation` only for `vertical` (`horizontal` is
   * the ARIA default and is omitted). `horizontal` (default) splits options
   * stacked vertically — the common case in a listbox; `vertical` splits
   * options laid out horizontally.
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * When true, the separator is purely visual: it gets `role="none"` and no
   * `aria-orientation`, so assistive tech treats the surrounding options as a
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
