import { booleanAttribute, Directive, input } from '@angular/core';

/**
 * Headless static separator implementing the
 * [WAI-ARIA Separator pattern](https://www.w3.org/WAI/ARIA/apg/patterns/separator/):
 * a non-focusable, semantic-only line that divides groups of content visually
 * and semantically. Set `decorative` so screen readers skip the line when the
 * surrounding layout already conveys the split.
 *
 * The focusable divider that resizes two panes is a separate primitive —
 * `[forPaneResizer]` — so a plain visual divider never pulls the drag /
 * keyboard-resize code in.
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
    '[attr.role]': 'roleAttr()',
    '[attr.aria-orientation]': 'ariaOrientationAttr()',
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
   * ARIA, so assistive tech treats surrounding content as a single flow. Use
   * when the line is redundant with adjacent semantics.
   */
  readonly decorative = input(false, { transform: booleanAttribute });

  protected roleAttr(): 'separator' | 'none' {
    return this.decorative() ? 'none' : 'separator';
  }

  protected ariaOrientationAttr(): 'horizontal' | 'vertical' | null {
    if (this.decorative()) {
      return null;
    }
    // Omit the attribute for `horizontal` (the ARIA default) to keep the
    // semantic separator minimal.
    return this.orientation() === 'vertical' ? 'vertical' : null;
  }
}
