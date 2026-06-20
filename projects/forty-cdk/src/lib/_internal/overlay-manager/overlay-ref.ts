import { signal } from '@angular/core';

/**
 * Shared handle returned by an imperative overlay manager's `open()`.
 * `ForDialogRef` / `ForDrawerRef` extend this verbatim to keep their public
 * class identity (and DI token) while the close engine lives here once.
 *
 * Both reactive (`isClosed`, `result`) and awaitable (`closed`) APIs are
 * exposed — pick what fits the call site. `R` is the close-result type.
 *
 * Internal — not re-exported from `public-api.ts`; the public surface is
 * `ForDialogRef` / `ForDrawerRef`.
 */
export class OverlayRef<R = unknown> {
  readonly #result = signal<R | undefined>(undefined);
  readonly #closed = signal(false);

  /** Reactive: `true` once `close()` has been called. */
  readonly isClosed = this.#closed.asReadonly();

  /** Reactive: the close result. `undefined` while open. */
  readonly result = this.#result.asReadonly();

  /** Awaitable: resolves with the close result the first time `close()` runs. */
  readonly closed: Promise<R | undefined>;

  #resolveClosed!: (r: R | undefined) => void;
  readonly #teardown: () => void;

  /** @internal */
  constructor(teardown: () => void) {
    this.#teardown = teardown;
    this.closed = new Promise((resolve) => {
      this.#resolveClosed = resolve;
    });
  }

  /**
   * Close the overlay, optionally returning a result. Idempotent — calling
   * twice is a no-op.
   */
  close(result?: R): void {
    if (this.#closed()) {
      return;
    }
    this.#result.set(result);
    this.#closed.set(true);
    this.#resolveClosed(result);
    this.#teardown();
  }
}
