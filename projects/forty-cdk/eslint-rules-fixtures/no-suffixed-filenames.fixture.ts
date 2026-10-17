/**
 * Fixture for `forty-cdk/no-suffixed-filenames`.
 *
 * The rule reads the file name, not the source, so this fixture is
 * Linted as `projects/forty-cdk/core/src/no-suffixed-filenames.component.ts`
 * under the real config: a library file whose name carries the `.component.`
 * type suffix CLAUDE.md bans. The name is the whole violation, so the body
 * below is compliant on purpose.
 */

// Expected: 1× forty-cdk/no-suffixed-filenames
export const fixture = true;
