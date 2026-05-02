import { signal } from '@angular/core';

import type { ForToastCloseReason, ForToastConfig } from './toast-context';

/**
 * Handle returned by `ForToastManager.show()`. Drives `dismiss()` /
 * `update()` imperatively from anywhere. Both reactive (`isClosed`) and
 * awaitable (`closed`) APIs are exposed — pick what fits the call site.
 *
 * `R` is the close-result type, settable via `dismiss(reason, value)`.
 * Default `unknown`; specify on `manager.show<R, D>(...)` for type safety.
 */
export class ForToastRef<R = unknown, D = unknown> {
  readonly #closed = signal(false);
  readonly #result = signal<R | undefined>(undefined);
  readonly #config = signal<ForToastConfig<D>>({});

  /** Reactive: `true` once `dismiss()` has been called. */
  readonly isClosed = this.#closed.asReadonly();
  /** Reactive: the close result, populated on `dismiss(reason, value)`. */
  readonly result = this.#result.asReadonly();
  /** Reactive: the toast's current config (mutable via `update()`). */
  readonly config = this.#config.asReadonly();

  /** Awaitable: resolves with `{ reason, result }` the first time `dismiss()` runs. */
  readonly closed: Promise<{ reason: ForToastCloseReason; result: R | undefined }>;

  #resolveClosed!: (r: { reason: ForToastCloseReason; result: R | undefined }) => void;
  readonly #teardown: (reason: ForToastCloseReason) => void;

  /** @internal */
  constructor(initialConfig: ForToastConfig<D>, teardown: (reason: ForToastCloseReason) => void) {
    this.#config.set(initialConfig);
    this.#teardown = teardown;
    this.closed = new Promise((resolve) => {
      this.#resolveClosed = resolve;
    });
  }

  /**
   * Dismiss the toast, optionally returning a result. Idempotent — calling
   * twice is a no-op. Reason defaults to `'programmatic'`.
   */
  dismiss(reason: ForToastCloseReason = 'programmatic', result?: R): void {
    if (this.#closed()) {
      return;
    }
    this.#closed.set(true);
    this.#result.set(result);
    this.#resolveClosed({ reason, result });
    this.#teardown(reason);
  }

  /**
   * Mutate the toast in-place (e.g. to update text on long-running
   * operations: "Saving…" → "Saved"). No-op once dismissed.
   */
  update(patch: Partial<ForToastConfig<D>>): void {
    if (this.#closed()) {
      return;
    }
    this.#config.update((current) => ({ ...current, ...patch }));
  }
}
