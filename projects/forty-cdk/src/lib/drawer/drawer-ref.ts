import { signal } from '@angular/core';

/**
 * Handle returned by `ForDrawerManager.open()`. Inject inside the opened
 * component to drive close imperatively. Both reactive (`isClosed`, `result`)
 * and awaitable (`closed`) APIs are exposed — pick what fits the call site.
 *
 * `R` is the close-result type. Default `unknown`; specify it on
 * `manager.open<C, R>(...)` to get type safety.
 */
export class ForDrawerRef<R = unknown> {
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
   * Close the drawer, optionally returning a result. Idempotent — calling
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
