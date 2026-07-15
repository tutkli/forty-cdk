/**
 * Support file for `no-unused-defaults-sibling.fixture.ts` — NOT itself a rule
 * fixture (it violates nothing on its own).
 *
 * It models the entry-point barrel every shipping primitive has: a
 * `<primitive>/src/public-api.ts` that re-exports its `FOR_<PRIMITIVE>_DEFAULTS`
 * token by name. A barrel re-export is *not* an injection — nothing consumes
 * the token, it is merely re-exposed — so the rule must ignore `public-api.ts`
 * (and the legacy `index.ts` barrel) when deciding whether a defaults file is
 * dead. Without that carve-out this re-export would silence the fixture, which
 * is exactly the false-negative the rule guards against: a dead-but-public
 * defaults file is, by definition, re-exported from the barrel.
 *
 * See tutkli/forty-cdk#1262 and CLAUDE.md > "Defaults providers".
 */

export { FOR_NO_UNUSED_DEFAULTS_SIBLING_FIXTURE_DEFAULTS } from './no-unused-defaults-sibling.fixture';
