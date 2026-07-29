import { Directive, signal } from '@angular/core';
import { injectDismissibleLayer } from 'forty-cdk/core';

/**
 * Stands in for a second overlay stacked over the primitive under test — a
 * HoverCard-like interactive Escape-only surface (`channels: []`) or a real
 * dismissible layer (`channels: ['pointer', 'focus']`) — so the stack-aware
 * containment and per-channel routing `DismissibleLayerStack` owns can be
 * driven from a spec without composing a whole second primitive.
 *
 * Stamp it on a sibling element of the primitive's root, then arm it from the
 * test. Activation is imperative because the stack orders standalone layers by
 * activation order: the surface has to arm *after* the primitive opened to sit
 * above it.
 *
 * Internal to the test suite — never re-exported from `public-api.ts`.
 */
@Directive({ selector: '[testStackedLayer]' })
export class TestStackedLayer {
  readonly #layer = injectDismissibleLayer();

  /** How many times this layer was told focus landed outside it. */
  readonly focusOutside = signal(0);

  /** Pushes the layer on top of the stack, owning `channels`. */
  stack(channels: readonly ('pointer' | 'focus')[]): void {
    this.#layer.activate({
      channels,
      onFocusOutside: () => this.focusOutside.set(this.focusOutside() + 1),
    });
  }

  /** Removes the layer from the stack. */
  unstack(): void {
    this.#layer.deactivate();
  }
}
