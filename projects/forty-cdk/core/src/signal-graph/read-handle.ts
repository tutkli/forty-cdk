/**
 * Whether `error` is the NG0950 `RuntimeError(-950)` Angular throws when an
 * `input.required` is read before its binding is written. Detected via the
 * stable numeric `code` rather than the message text (stripped in production
 * builds). Returns `false` for any other throw, including non-`Error` values.
 */
export function isRequiredInputUnset(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as Error & { code?: unknown }).code;
  return typeof code === 'number' && Math.abs(code) === 950;
}

/**
 * Read a handle's inputs inside a snapshot fold, tolerating the NG0950 thrown
 * while a statically-rendered option is in the gap between registering (its
 * constructor, during the content view's *creation* pass) and having its
 * `input.required` binding written (that view's *update* pass). A fold-priming
 * effect flush runs in that gap, so a static option above a `@for` list would
 * otherwise hard-crash on open.
 *
 * Returns `null` in that window; the caller skips the handle for this fold. The
 * required-input signal's producer is accessed *before* the read throws, so the
 * dependency is still tracked: writing the binding marks the fold's
 * `linkedSignal` dirty and it re-runs, folding the handle in once its value is
 * set. Any non-NG0950 error propagates unchanged.
 */
export function tryReadHandle<R>(read: () => R): R | null;
/**
 * Sentinel overload: return `sentinel` instead of `null` in the NG0950 window.
 * Lets a caller distinguish "input unset" from a legitimately-`null` read value
 * (e.g. `ForSelect`, whose option value may be `null`, folds on a private
 * `NO_VALUE` symbol). Any non-NG0950 error still propagates unchanged.
 *
 * @param read The handle read to attempt.
 * @param sentinel The value to return when the read throws NG0950.
 */
export function tryReadHandle<R, S>(read: () => R, sentinel: S): R | S;
export function tryReadHandle<R, S>(read: () => R, ...rest: [S] | []): R | S | null {
  try {
    return read();
  } catch (error) {
    if (isRequiredInputUnset(error)) {
      return rest.length > 0 ? (rest[0] as S) : null;
    }
    throw error;
  }
}
