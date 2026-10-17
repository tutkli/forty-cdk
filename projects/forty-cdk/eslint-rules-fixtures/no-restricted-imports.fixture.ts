/**
 * Fixture for the config-level `no-restricted-imports` bans in `eslint.config.js`.
 *
 * The fixtures override switches `no-restricted-imports` off for this
 * directory, so this fixture is
 * Linted as `projects/forty-cdk/core/src/no-restricted-imports.ts`
 * under the real config instead. Each banned path and pattern fires once.
 */

// Expected: 1× no-restricted-imports — `@angular/cdk`.
import '@angular/cdk';
// Expected: 1× no-restricted-imports — the `@angular/cdk/*` pattern.
import '@angular/cdk/a11y';
// Expected: 1× no-restricted-imports — `@angular/material`.
import '@angular/material';
// Expected: 1× no-restricted-imports — the `@angular/material/*` pattern.
import '@angular/material/button';
// Expected: 1× no-restricted-imports — `@angular/aria`.
import '@angular/aria';
// Expected: 1× no-restricted-imports — the `@angular/aria/*` pattern.
import '@angular/aria/menu';
// Expected: 2× no-restricted-imports — `zone.js`, as a path and as a pattern.
import 'zone.js';
// Expected: 2× no-restricted-imports — `zone.js/testing`, as a path and as a pattern.
import 'zone.js/testing';
// Expected: 1× no-restricted-imports — the `zone.js/*` pattern.
import 'zone.js/plugins/zone-error';

// Allowed: the framework itself.
import '@angular/core';
