import { booleanAttribute, Directive, input } from '@angular/core';

/**
 * Headless separator implementing the
 * [WAI-ARIA Separator pattern](https://www.w3.org/WAI/ARIA/apg/patterns/separator/)
 * (static variant — non-focusable, non-draggable).
 *
 * Use to divide groups of content visually and semantically. When the line
 * carries no information beyond what the surrounding layout already conveys
 * (e.g. a hairline between menu groups that already have headings), set
 * `decorative` so screen readers skip it.
 *
 * @example
 * ```html
 * <hr forSeparator />
 * <div forSeparator orientation="vertical"></div>
 * <span forSeparator decorative></span>
 * ```
 */
@Directive({
  selector: '[forSeparator]',
  exportAs: 'forSeparator',
  host: {
    '[attr.role]': 'decorative() ? "none" : "separator"',
    '[attr.aria-orientation]': 'ariaOrientation()',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class ForSeparator {
  /**
   * Axis the separator divides along. `horizontal` splits content stacked
   * vertically; `vertical` splits content arranged horizontally. Defaults to
   * `horizontal`, matching the `<hr>` element.
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * When true, the separator is purely visual: it gets `role="none"` and no
   * `aria-orientation`, so assistive tech treats surrounding content as a
   * single flow. Use when the line is redundant with adjacent semantics.
   */
  readonly decorative = input(false, { transform: booleanAttribute });

  protected ariaOrientation(): 'vertical' | null {
    if (this.decorative()) {
      return null;
    }
    return this.orientation() === 'vertical' ? 'vertical' : null;
  }
}
