/**
 * Fixture for `forty-cdk/no-unused-defaults-sibling`.
 *
 * The reverse companion of `require-defaults-sibling`: a `<name>-defaults.ts`
 * that exports a defaults token which no non-defaults, non-spec sibling in the
 * same entry ever injects is dead weight — it still enlarges the public API
 * (token + provider + interface) with nothing consuming it. This fixture
 * exports such a token with no sibling referencing it, so the rule fires once.
 * The rule's fixtures carve-out scopes the check to this one file. See
 * tutkli/forty-cdk#1262, #1157 and CLAUDE.md > "Defaults providers".
 */

// Expected: 1× forty-cdk/no-unused-defaults-sibling
declare const token: unknown;

export const FOR_NO_UNUSED_DEFAULTS_SIBLING_FIXTURE_DEFAULTS = token;
