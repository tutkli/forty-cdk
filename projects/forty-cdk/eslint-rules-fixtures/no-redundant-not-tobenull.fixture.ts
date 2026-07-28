/**
 * Fixture for `forty-cdk/no-redundant-not-tobenull`.
 *
 * `expect(x).not.toBeNull()` followed by `x!` is noise: the non-null
 * assertion already states the claim and throws on a null just as loudly.
 * See CLAUDE.md > Testing notes > Test isolation — non-negotiables > rule 10.
 *
 * This file exists to prove the rule fires; the two guarded-then-asserted
 * pairs are intentional violations. The standalone null-check that follows is
 * the correct shape (nothing is `!`-asserted afterwards) and must NOT be
 * flagged.
 */

declare function expect(actual: unknown): { not: { toBeNull(): void }; toBeNull(): void };
declare function query(selector: string): HTMLElement | null;

export function bad(): void {
  // Expected: 2× forty-cdk/no-redundant-not-tobenull.
  const content = query('[data-testid="content"]');
  expect(content).not.toBeNull();
  content!.focus();

  const trigger = query('[data-testid="trigger"]');
  expect(trigger).not.toBeNull();
  const label = trigger!.textContent;
  void label;
}

export function good(): void {
  // The assertion IS the test — nothing is `!`-asserted afterwards.
  const surface = query('[data-testid="surface"]');
  expect(surface).not.toBeNull();

  // A plain non-null assertion with no redundant guard in front of it.
  const other = query('[data-testid="other"]');
  other!.focus();
}
