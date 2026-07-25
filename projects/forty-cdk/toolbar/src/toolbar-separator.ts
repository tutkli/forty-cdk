import { booleanAttribute, computed, Directive, input } from '@angular/core';

import { injectToolbarContext } from './toolbar-context';

/**
 * Visual separator inside a toolbar. Defaults `orientation` to the opposite
 * of the toolbar's main axis (a vertical line in a horizontal toolbar, and
 * vice versa) — pass `orientation` explicitly to override.
 *
 * Reflects the same role / aria-orientation / data-orientation contract as
 * `ForSeparator`, but anchored to the toolbar's cross-axis so an unconfigured
 * separator renders perpendicular to the toolbar.
 */
@Directive({
  selector: '[forToolbarSeparator]',
  exportAs: 'forToolbarSeparator',
  host: {
    '[attr.role]': 'decorative() ? "none" : "separator"',
    '[attr.aria-orientation]': 'ariaOrientation()',
    '[attr.data-orientation]': 'effectiveOrientation()',
  },
})
export class ForToolbarSeparator {
  readonly #toolbar = injectToolbarContext('ForToolbarSeparator');

  /**
   * Axis the separator divides along. When omitted, falls back to the
   * cross-axis of the parent toolbar (horizontal toolbar → vertical
   * separator, and vice versa).
   */
  readonly orientation = input<'horizontal' | 'vertical' | undefined>(undefined);

  /**
   * When true, the separator is purely visual: it gets `role="none"` and no
   * `aria-orientation`, so assistive tech treats surrounding content as a
   * single flow.
   */
  readonly decorative = input(false, { transform: booleanAttribute });

  /**
   * Cross-axis of the parent toolbar — the orientation an unconfigured
   * separator inherits.
   */
  readonly defaultOrientation = computed<'horizontal' | 'vertical'>(() =>
    this.#toolbar.orientation() === 'vertical' ? 'horizontal' : 'vertical',
  );

  protected readonly effectiveOrientation = computed<'horizontal' | 'vertical'>(
    () => this.orientation() ?? this.defaultOrientation(),
  );

  protected ariaOrientation(): 'vertical' | null {
    if (this.decorative()) {
      return null;
    }
    return this.effectiveOrientation() === 'vertical' ? 'vertical' : null;
  }
}
