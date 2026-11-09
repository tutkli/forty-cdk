import { Injectable } from '@angular/core';

/**
 * Answers whether an `Escape` pressed inside a node belongs to an overlay layered above it.
 *
 * A widget that consumes `Escape` itself (a grid cell leaving interaction mode) asks first, so a
 * dismissible layer stacked over it (a tooltip on the cell's widget) is dismissed instead. The
 * dismissible-layer stack registers the query when it is created; with no stack there is no layer,
 * and the answer is `false`. Living in `forty-cdk/core` lets an entry point ask without importing
 * the overlay machinery.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own entry points, with
 * no semver guarantee.
 */
@Injectable({ providedIn: 'root' })
export class EscapeArbiter {
  #query: ((node: Node) => boolean) | null = null;

  /**
   * Installs the query {@link hasEscapeLayerAbove} delegates to, replacing any earlier one.
   * Returns a function that removes it again.
   */
  register(query: (node: Node) => boolean): () => void {
    this.#query = query;
    return () => {
      if (this.#query === query) {
        this.#query = null;
      }
    };
  }

  /**
   * Whether an active layer sits above every layer containing `node`, so the stack would hand it
   * an `Escape` pressed inside `node`.
   */
  hasEscapeLayerAbove(node: Node): boolean {
    return this.#query?.(node) ?? false;
  }
}
