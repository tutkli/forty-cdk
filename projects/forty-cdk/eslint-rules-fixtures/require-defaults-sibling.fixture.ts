/**
 * Fixture for `forty-cdk/require-defaults-sibling`.
 *
 * A primitive root file must ship a sibling `<name>-defaults.ts` carrying the
 * `provideFor<Primitive>Defaults` / `FOR_<PRIMITIVE>_DEFAULTS` contract. No
 * `require-defaults-sibling.fixture-defaults.ts` exists next to this file, so
 * the rule fires once on this fixture. See tutkli/forty-cdk#584 and CLAUDE.md
 * > "Defaults providers".
 */

// Expected: 1× forty-cdk/require-defaults-sibling
export const requireDefaultsSiblingFixture = true;
