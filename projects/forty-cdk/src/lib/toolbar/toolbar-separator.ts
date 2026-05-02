import { computed, Directive, inject } from '@angular/core';

import { ForSeparator } from '../separator/separator';
import { FOR_TOOLBAR_CONTEXT } from './toolbar-context';

/**
 * Visual separator inside a toolbar. Defaults `orientation` to the opposite
 * of the toolbar's main axis (a vertical line in a horizontal toolbar, and
 * vice versa) — pass `orientation` explicitly to override.
 *
 * Delegates the role / aria-orientation reflection to `ForSeparator` via
 * `hostDirectives` to avoid duplicating logic.
 */
@Directive({
  selector: '[forToolbarSeparator]',
  exportAs: 'forToolbarSeparator',
  hostDirectives: [
    {
      directive: ForSeparator,
      inputs: ['orientation', 'decorative'],
    },
  ],
})
export class ForToolbarSeparator {
  readonly #toolbar = inject(FOR_TOOLBAR_CONTEXT, { optional: true });
  protected readonly forSeparator = inject(ForSeparator, { self: true });

  /**
   * Default the separator's orientation to the cross-axis of the toolbar
   * (so it shows as a perpendicular divider). Consumers can still set
   * `orientation` explicitly on the host; the binding takes effect via
   * `ForSeparator`'s own input.
   */
  readonly defaultOrientation = computed<'horizontal' | 'vertical'>(() =>
    this.#toolbar?.orientation() === 'vertical' ? 'horizontal' : 'vertical',
  );

  constructor() {
    if (!this.#toolbar) {
      throw new Error(
        '[forty-cdk/toolbar] ForToolbarSeparator must be used inside a [forToolbar] element.',
      );
    }
  }
}
