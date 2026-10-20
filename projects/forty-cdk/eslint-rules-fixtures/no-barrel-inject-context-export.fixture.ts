/**
 * Fixture for `forty-cdk/no-barrel-inject-context-export`.
 *
 * A primitive's `inject<Name>Context` helper is internal: only the
 * `FOR_<PRIMITIVE>_CONTEXT` token and the context interface are public. The
 * rule constrains primitive barrels alone, so this fixture is
 * Linted as `projects/forty-cdk/zzz-rule-fixture/src/public-api.ts`
 * under the real config. See tutkli/forty-cdk#584 (D8) and
 * .claude/rules/conventions.md § "Context exports — what's public".
 */

// Expected: 1× forty-cdk/no-barrel-inject-context-export
export { injectZzzContext } from './zzz-context';

// Expected: 1× forty-cdk/no-barrel-inject-context-export — the exported name is what leaks.
export { resolveZzz as injectZzzItemContext } from './zzz-item-context';

// Allowed: the token and the context interface are the public surface.
export { FOR_ZZZ_CONTEXT, type ForZzzContext } from './zzz-context';

// Expected: 1× forty-cdk/no-barrel-inject-context-export
export * from './zzz-context';

// Expected: 1× forty-cdk/no-barrel-inject-context-export
export * as zzzPanelContext from './zzz-panel-context';

// Expected: 1× forty-cdk/no-barrel-inject-context-export
export function injectZzzRootContext(): void {}

// Expected: 1× forty-cdk/no-barrel-inject-context-export
export const injectZzzTriggerContext = (): void => undefined;
