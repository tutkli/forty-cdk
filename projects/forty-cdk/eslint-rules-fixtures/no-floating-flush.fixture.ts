/**
 * Fixture for `forty-cdk/no-floating-flush`.
 *
 * A bare `flush()` / `flushPositioning()` / `nextMacrotask()` statement leaves
 * the returned `Promise<void>` un-awaited, so the async render drain escapes
 * the test and assertions can run against stale DOM. Specs must `await` every
 * such call. See CLAUDE.md > Testing notes > Test isolation — non-negotiables >
 * rule 12.
 *
 * This file exists to prove the rule fires; the three floating statements are
 * intentional violations. The `await`ed calls that follow are the correct
 * shape and must NOT be flagged.
 */

declare function flush(fixture?: unknown): Promise<void>;
declare function flushPositioning(fixture?: unknown): Promise<void>;
declare function nextMacrotask(): Promise<void>;

export async function bad(): Promise<void> {
  // Expected: 3× forty-cdk/no-floating-flush (the three floating statements).
  flush();
  flushPositioning();
  nextMacrotask();

  // Correct shape — awaited, never flagged.
  await flush();
  await flushPositioning();
  await nextMacrotask();
}
