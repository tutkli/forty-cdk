/**
 * Fixture for `forty-cdk/require-defaults-sibling`.
 *
 * A primitive that injects `FOR_<PRIMITIVE>_DEFAULTS` must ship a sibling
 * `<name>-defaults.ts` carrying the `provideFor<Primitive>Defaults` /
 * `FOR_<PRIMITIVE>_DEFAULTS` contract. This fixture references the token the
 * rule derives from its own basename (`require-defaults-sibling.fixture` →
 * `FOR_REQUIRE_DEFAULTS_SIBLING.FIXTURE_DEFAULTS`) while no matching
 * `-defaults.ts` sibling exists next to it, so the rule fires once. See
 * tutkli/forty-cdk#584, #1157 and CLAUDE.md > "Defaults providers".
 */

// Expected: 1× forty-cdk/require-defaults-sibling
declare function inject<T>(token: T): T;
declare const FOR_REQUIRE_DEFAULTS_SIBLING: { FIXTURE_DEFAULTS: unknown };

export const requireDefaultsSiblingFixture = inject(FOR_REQUIRE_DEFAULTS_SIBLING.FIXTURE_DEFAULTS);
