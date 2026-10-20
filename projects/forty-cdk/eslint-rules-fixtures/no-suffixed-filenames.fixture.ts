/**
 * Fixture for `forty-cdk/no-suffixed-filenames`.
 *
 * The rule reads the file name, not the source, so this fixture is linted
 * under the real config once per banned type suffix, each a file CLAUDE.md
 * would reject:
 *
 * Linted as `projects/forty-cdk/core/src/no-suffixed-filenames.component.ts`
 * Linted as `projects/forty-cdk/core/src/no-suffixed-filenames.service.ts`
 * Linted as `projects/forty-cdk/core/src/no-suffixed-filenames.directive.ts`
 * Linted as `projects/forty-cdk/core/src/no-suffixed-filenames.pipe.ts`
 * Linted as `projects/forty-cdk/core/src/no-suffixed-filenames.module.ts`
 * Linted as `projects/forty-cdk/core/src/no-suffixed-filenames.guard.ts`
 * Linted as `projects/forty-cdk/core/src/no-suffixed-filenames.interceptor.ts`
 * Linted as `projects/forty-cdk/core/src/no-suffixed-filenames.resolver.ts`
 * Linted as `projects/forty-cdk-harness/src/app/no-suffixed-filenames.component.html`
 *
 * The name is the whole violation, so the body below is compliant on purpose,
 * and it parses as plain template text under the `.html` path.
 */

// Expected: 1× forty-cdk/no-suffixed-filenames
export const fixture = true;
