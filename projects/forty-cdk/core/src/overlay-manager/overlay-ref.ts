import { signal } from '@angular/core';

/**
 * The awaitable close payload resolved by `OverlayRef.closed` — the reason the
 * overlay closed plus the optional close result. Homogeneous with
 * `ForToastRef.closed` so all three programmatic overlay handles expose the
 * same `{ reason, result }` shape.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export interface OverlayCloseEvent<R, Reason> {
  /** Why the overlay closed (e.g. `'escape'`, `'closeButton'`, `'programmatic'`). */
  readonly reason: Reason;
  /** The close result passed to `close(result)`, or `undefined`. */
  readonly result: R | undefined;
}

/**
 * Shared handle returned by an imperative overlay manager's `open()`.
 * `ForDialogRef` / `ForDrawerRef` extend this verbatim to keep their public
 * class identity (and DI token) while the close engine lives here once.
 *
 * Both reactive (`isClosed`, `result`) and awaitable (`closed`) APIs are
 * exposed — pick what fits the call site. `R` is the close-result type and
 * `Reason` the close-reason union (`ForDialogCloseReason` /
 * `ForDrawerCloseReason`).
 *
 * Internal — not re-exported from `public-api.ts`; the public surface is
 * `ForDialogRef` / `ForDrawerRef`.
 */
export class OverlayRef<R = unknown, Reason = string> {
  readonly #result = signal<R | undefined>(undefined);
  readonly #closed = signal(false);

  /** Reactive: `true` once `close()` has been called. */
  readonly isClosed = this.#closed.asReadonly();

  /** Reactive: the close result. `undefined` while open. */
  readonly result = this.#result.asReadonly();

  /**
   * Awaitable: resolves with `{ reason, result }` the first time `close()`
   * runs. The reason distinguishes an explicit `close(result)` (the manager's
   * default reason, `'programmatic'`) from a dismiss channel (Escape, backdrop,
   * outside-pointer, close button), which a bare result cannot.
   */
  readonly closed: Promise<OverlayCloseEvent<R, Reason>>;

  #resolveClosed!: (event: OverlayCloseEvent<R, Reason>) => void;
  readonly #teardown: () => void;
  readonly #defaultReason: Reason;

  /** Internal composition surface (no semver guarantees). */
  constructor(teardown: () => void, defaultReason: Reason) {
    this.#teardown = teardown;
    this.#defaultReason = defaultReason;
    this.closed = new Promise((resolve) => {
      this.#resolveClosed = resolve;
    });
  }

  /**
   * Close the overlay, optionally returning a result. Idempotent — calling
   * twice is a no-op. `reason` defaults to the manager's default (`'programmatic'`
   * for a direct imperative close); the dismiss channels pass their own reason.
   */
  close(result?: R, reason: Reason = this.#defaultReason): void {
    if (this.#closed()) {
      return;
    }
    this.#result.set(result);
    this.#closed.set(true);
    this.#resolveClosed({ reason, result });
    this.#teardown();
  }
}
