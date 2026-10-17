/**
 * Fixture for `forty-cdk/no-unused-defaults-sibling`.
 *
 * The reverse companion of `require-defaults-sibling`: a `<name>-defaults.ts`
 * that exports a defaults token which no non-defaults, non-spec sibling in the
 * same entry ever injects is dead weight — it still enlarges the public API
 * (token + provider + interface) with nothing consuming it. This fixture
 * exports such a token with no sibling referencing it, so the rule fires once.
 * The token is built with `new InjectionToken(…)`, the only initializer the rule
 * reads as a token, exactly as every shipped defaults file declares it. The
 * rule's fixtures carve-out scopes the check to this one file, and the sibling
 * `public-api.ts` re-exports the token, so the report also proves the barrel
 * carve-out. See tutkli/forty-cdk#1262, #1157 and
 * .claude/rules/conventions.md § "Defaults providers".
 */

declare class InjectionToken<T> {
  constructor(description: string);
  readonly type?: T;
}

// Expected: 1× forty-cdk/no-unused-defaults-sibling
export const FOR_NO_UNUSED_DEFAULTS_SIBLING_FIXTURE_DEFAULTS = new InjectionToken<unknown>(
  'FOR_NO_UNUSED_DEFAULTS_SIBLING_FIXTURE_DEFAULTS',
);
