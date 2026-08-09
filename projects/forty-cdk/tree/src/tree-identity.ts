/**
 * Node-identity helpers shared by `ForTree`'s root, its selection engine and the
 * drag resolver. Every identity question the tree asks routes through the
 * consumer's `compareWith`; these exist so the hashed fast path for the default
 * comparator lives in one place instead of being re-derived per call site.
 *
 * Internal — not re-exported from `tree/public-api.ts`.
 */

/**
 * The default `ForTree.compareWith`: reference / primitive identity. Exported so
 * the helpers below can recognise "no comparator bound" by reference and hash
 * instead of scanning — a consumer passing their own `(a, b) => a === b` simply
 * takes the scanning path, which is correct either way.
 */
export const defaultTreeCompareWith = <T>(a: T, b: T): boolean => a === b;

/**
 * Builds a membership probe over `values`. Hashes under the default comparator —
 * the shape every string-valued tree is on — and falls back to a linear scan
 * under a consumer `compareWith`, which cannot be hashed.
 *
 * Use it when the same array is probed repeatedly (a cascade's descendant walk,
 * the visible-node fold); a single lookup uses `isInArray` from `forty-cdk/core`.
 */
export function treeMembership<T>(
  values: readonly T[],
  equals: (a: T, b: T) => boolean,
): (value: T) => boolean {
  if (equals === defaultTreeCompareWith) {
    const hashed = new Set(values);
    return (value) => hashed.has(value);
  }
  return (value) => values.some((candidate) => equals(candidate, value));
}

/** Immutable de-duplication of `values` under `equals`, preserving first-seen order. */
export function dedupeTreeValues<T>(values: readonly T[], equals: (a: T, b: T) => boolean): T[] {
  if (equals === defaultTreeCompareWith) {
    return [...new Set(values)];
  }
  const result: T[] = [];
  for (const value of values) {
    if (!result.some((candidate) => equals(candidate, value))) {
      result.push(value);
    }
  }
  return result;
}
