import { computed, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { ForDrawerScaleCoordinator } from 'forty-cdk/core';

/**
 * Marks the consumer's app-shell wrapper so {@link ForDrawer}'s
 * `scaleBackground` effect can transform the rest of the page when a
 * drawer opens — applied through Angular DI rather than a global selector.
 *
 * Apply on the element that contains everything the drawer should appear
 * to recede behind (typically the root shell). Reflects
 * `data-state="scaled"` while the effect is active and `"idle"` at rest
 * — useful for layering CSS styling without re-querying the coordinator.
 *
 * Only one wrapper may be registered at a time; mounting a second
 * `[forDrawerWrapper]` while another is alive throws. Drawers that opt
 * into `scaleBackground` without a registered wrapper are a no-op (no
 * effect applied) so test composition and partial consumer adoption
 * remain safe.
 */
@Directive({
  selector: '[forDrawerWrapper]',
  exportAs: 'forDrawerWrapper',
  host: {
    '[attr.data-state]': 'state()',
  },
})
export class ForDrawerWrapper {
  readonly #coordinator = inject(ForDrawerScaleCoordinator);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** `'scaled'` while the coordinator is applying the effect, otherwise `'idle'`. */
  readonly state = computed<'scaled' | 'idle'>(() =>
    this.#coordinator.active() ? 'scaled' : 'idle',
  );

  constructor() {
    const cleanup = this.#coordinator.registerWrapper(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(cleanup);
  }
}
