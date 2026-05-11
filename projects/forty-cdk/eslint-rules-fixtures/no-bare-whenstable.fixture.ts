/**
 * Fixture for `forty-cdk/no-bare-whenstable`.
 *
 * Calling `fixture.whenStable()` directly outside `test-utils/flush.ts` is
 * forbidden — specs must `await flush(fixture)` so the canonical drain shape
 * stays in one place. See CLAUDE.md > Testing notes > Test isolation —
 * non-negotiables > rule 7.
 *
 * This file exists to prove the rule fires; the violation below is
 * intentional and is the only thing this file does.
 */

export async function bad(fixture: { whenStable(): Promise<void> }): Promise<void> {
  // Expected: 1× forty-cdk/no-bare-whenstable
  await fixture.whenStable();
}
