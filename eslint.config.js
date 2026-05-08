// @ts-check

/**
 * ESLint flat config for forty-cdk.
 *
 * Codifies the non-negotiable rules from CLAUDE.md so they are enforced
 * mechanically instead of relying on review-time vigilance:
 *
 *   - No `@angular/cdk`, `@angular/material`, `@angular/aria` imports.
 *   - No `*ngIf` / `*ngFor` / `*ngSwitch` (use `@if` / `@for` / `@switch`).
 *   - No `@HostBinding` / `@HostListener` (use the `host: { ... }` block).
 *   - No `@Input()` / `@Output()` decorators (use `input()` / `output()` / `model()`).
 *   - No `NgModule` (the library is standalone-only).
 *   - No `zone.js` / `NgZone` (the library must run zoneless).
 *   - No class names ending in `Service`, `Component`, or `Directive`.
 *   - No filenames containing `.service.`, `.component.`, or `.directive.`.
 *   - All public selectors must use the `for-` prefix.
 */

const fs = require('node:fs');
const path = require('node:path');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * Tiny inline plugin holding rules that don't fit the off-the-shelf
 * AST-selector / no-restricted-imports machinery.
 *
 * @type {import('eslint').ESLint.Plugin}
 */
const fortyCdkPlugin = {
  meta: { name: 'forty-cdk', version: '0.0.1' },
  rules: {
    'no-suffixed-filenames': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid `.component.`, `.service.`, `.directive.` in filenames per CLAUDE.md.',
        },
        schema: [],
        messages: {
          forbidden:
            'Filenames must not contain `.component.`, `.service.`, or `.directive.`. Name files for what they represent (CLAUDE.md).',
        },
      },
      create(context) {
        return {
          Program(node) {
            const filename = context.filename || context.getFilename();
            const base = filename.split(/[\\/]/).pop() || '';
            if (/\.(component|service|directive)\./.test(base)) {
              context.report({ node, messageId: 'forbidden' });
            }
          },
        };
      },
    },

    // Enforces CLAUDE.md § "Defaults providers": every primitive folder under
    // projects/forty-cdk/src/lib/<name>/ that ships a <name>.ts root file must
    // also ship a sibling <name>-defaults.ts (empty stub or populated). Skips
    // _internal (and anything nested under it) and test-utils. Fires once per
    // primitive root file via a Program-level filesystem check.
    'require-defaults-sibling': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Each primitive must expose a sibling `<name>-defaults.ts` per CLAUDE.md § "Defaults providers".',
        },
        schema: [],
        messages: {
          missing:
            'Primitive `{{name}}` is missing the required `{{name}}-defaults.ts` sibling file (CLAUDE.md § "Defaults providers"). Even when there are no per-scope tunables yet, expose an empty stub so future additions don’t churn the public API.',
        },
      },
      create(context) {
        return {
          Program(node) {
            const filename = context.filename || context.getFilename();
            const dir = path.dirname(filename);
            const base = path.basename(filename, '.ts');
            const dirName = path.basename(dir);
            // Only fire on root primitive files: <dir>/<dir>.ts.
            if (base !== dirName) return;
            // Restrict to the library's primitive folder.
            const normalized = dir.replace(/\\/g, '/');
            if (!normalized.includes('/projects/forty-cdk/src/lib/')) return;
            // Skip cross-cutting helpers and test utilities.
            if (dirName === '_internal' || dirName === 'test-utils') return;
            if (normalized.includes('/_internal/')) return;
            const sibling = path.join(dir, `${dirName}-defaults.ts`);
            if (!fs.existsSync(sibling)) {
              context.report({
                node,
                loc: { line: 1, column: 0 },
                messageId: 'missing',
                data: { name: dirName },
              });
            }
          },
        };
      },
    },
  },
};

module.exports = tseslint.config(
  // ---------- Global ignores ----------
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.angular/**',
      'coverage/**',
      '.audit-issues/**',
      'projects/**/dist/**',
    ],
  },

  // ---------- TypeScript source files ----------
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    plugins: { 'forty-cdk': fortyCdkPlugin },
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // ---- Angular rules that conflict with forty-cdk's naming convention ----
      // CLAUDE.md bans the type suffix entirely; we forbid it via no-restricted-syntax below.
      '@angular-eslint/component-class-suffix': 'off',
      '@angular-eslint/directive-class-suffix': 'off',
      // We rely on attribute-aliased input()/output(); aliases are intentional, not a smell.
      '@angular-eslint/no-input-rename': 'off',
      '@angular-eslint/no-output-rename': 'off',
      // Lifecycle interface implementation isn't a hard rule for headless primitives.
      '@angular-eslint/use-lifecycle-interface': 'off',

      // ---- Selector convention: `for-` prefix everywhere ----
      '@angular-eslint/component-selector': [
        'error',
        { type: ['element', 'attribute'], prefix: 'for', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'for', style: 'camelCase' },
      ],

      // ---- Banned imports ----
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/cdk',
              message: 'Banned by CLAUDE.md — implement primitives in-house.',
            },
            { name: '@angular/material', message: 'Banned by CLAUDE.md.' },
            { name: '@angular/aria', message: 'Banned by CLAUDE.md.' },
            {
              name: 'zone.js',
              message: 'Banned by CLAUDE.md — the library must run zoneless.',
            },
            {
              name: 'zone.js/testing',
              message: 'Banned by CLAUDE.md — the library must run zoneless.',
            },
          ],
          patterns: [
            {
              group: ['@angular/cdk/*'],
              message: 'Banned by CLAUDE.md — implement primitives in-house.',
            },
            { group: ['@angular/material/*'], message: 'Banned by CLAUDE.md.' },
            { group: ['@angular/aria/*'], message: 'Banned by CLAUDE.md.' },
            {
              group: ['zone.js', 'zone.js/*'],
              message: 'Banned by CLAUDE.md — the library must run zoneless.',
            },
          ],
        },
      ],

      // ---- Banned syntax (decorators, NgModule, NgZone, type-suffixed class names) ----
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Decorator[expression.callee.name="HostBinding"], Decorator[expression.callee.name="HostListener"]',
          message:
            'Use the `host: { ... }` block in @Component / @Directive metadata instead of @HostBinding / @HostListener (CLAUDE.md).',
        },
        {
          selector:
            'Decorator[expression.callee.name="Input"], Decorator[expression.callee.name="Output"]',
          message:
            'Use signal-based input() / input.required() / output() / model() instead of @Input() / @Output() decorators (CLAUDE.md).',
        },
        {
          selector: 'Decorator[expression.callee.name="NgModule"]',
          message: 'NgModule is banned. forty-cdk is standalone-only (CLAUDE.md).',
        },
        {
          selector: 'ClassDeclaration[id.name=/(Service|Component|Directive)$/]',
          message:
            'Class names must not end in `Service`, `Component`, or `Directive`. Name classes for what they represent (CLAUDE.md).',
        },
        {
          selector: 'ImportSpecifier[imported.name="NgZone"]',
          message: 'NgZone is banned. forty-cdk must run zoneless (CLAUDE.md).',
        },
        {
          selector: 'ImportSpecifier[imported.name="NgModule"]',
          message: 'NgModule is banned. forty-cdk is standalone-only (CLAUDE.md).',
        },
        // ---- ARIA truthy-only attributes must be `null` when false, not `"false"` ----
        // Per CLAUDE.md § "ARIA state attribute emission", these attributes default to
        // their falsy state when absent; emitting `aria-required="false"` (etc.) forces
        // consumers to write `[aria-required="false"]` selectors that fight the spec.
        // Canonical Angular host binding: `'[attr.aria-disabled]': 'disabled() ? "true" : null'`.
        // This selector matches a Property whose key is the host-binding for one of the
        // truthy-only attributes (string literal `[attr.aria-<name>]`) and whose value
        // string contains the literal `"false"` (the wrong falsy branch).
        {
          selector:
            'Property[key.value=/^\\[attr\\.aria-(disabled|readonly|required|invalid|busy|modal|haspopup|multiselectable)\\]$/][value.value=/"false"/]',
          message:
            'ARIA truthy-only attributes must be `null` when false, not `"false"`. Use `cond() ? "true" : null` (CLAUDE.md § "ARIA state attribute emission").',
        },
      ],

      // ---- Filename convention ----
      'forty-cdk/no-suffixed-filenames': 'error',

      // ---- Defaults stub convention (CLAUDE.md § "Defaults providers") ----
      'forty-cdk/require-defaults-sibling': 'error',

      // ---- SSR safety: ban raw `document` / `window` globals in library code ----
      // Use `inject(DOCUMENT)` and `document.defaultView` instead so the
      // library renders correctly under `provideServerRendering()`. Specs
      // and test-utils are exempt below.
      'no-restricted-globals': [
        'error',
        {
          name: 'document',
          message:
            'SSR-unsafe. Inject `DOCUMENT` from `@angular/core` (or `@angular/common`) instead.',
        },
        {
          name: 'window',
          message:
            'SSR-unsafe. Read it via `inject(DOCUMENT).defaultView` (or gate with `isPlatformBrowser`) instead.',
        },
      ],

      // ---- typescript-eslint hardening ----
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Allow `_`-prefixed unused parameters (canonical "intentionally unused").
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // ---- Angular rules CLAUDE.md overrides ----
      // CLAUDE.md endorses verb-named outputs (`select`, `close`, `resize`) even
      // when they collide with native DOM events — collisions are harmless on
      // directives that do not emit those DOM events on their host element.
      '@angular-eslint/no-output-native': 'off',
      // `onX` output names are still banned (React idiom, CLAUDE.md output rule).
      '@angular-eslint/no-output-on-prefix': 'error',
    },
  },

  // ---------- Spec / test-utility relaxations ----------
  {
    files: ['**/*.spec.ts', '**/test-utils/**/*.ts'],
    rules: {
      // Test harness components don't need to follow the public selector convention.
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',
      // Tests sometimes need explicit `any` for intentionally-broken inputs.
      '@typescript-eslint/no-explicit-any': 'off',
      // Loosen unused checks — specs frequently destructure for asserts only.
      '@typescript-eslint/no-unused-vars': 'off',
      // Specs render bare `<button forX>` triggers as harness fixtures; their
      // "content" is the directive being exercised, not user-visible text.
      '@angular-eslint/template/elements-content': 'off',
      // Specs run under jsdom and freely poke at `document` to set up
      // fixtures or assert on the rendered DOM.
      'no-restricted-globals': 'off',
    },
  },

  // ---------- E2E harness app (projects/forty-cdk-harness) ----------
  // The harness is a tiny Angular application that mounts each primitive on
  // its own route so Playwright can drive real-browser focus/keyboard tests.
  // It is dev/CI-only; nothing in it ships to consumers, so the public-API
  // conventions don't apply.
  {
    files: ['projects/forty-cdk-harness/**/*.ts'],
    rules: {
      // The harness uses the default `app-` prefix Angular CLI generated.
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',
      // Harness fixtures often render bare buttons whose "content" is the
      // directive being exercised, not user-visible copy.
      '@angular-eslint/template/elements-content': 'off',
    },
  },

  // ---------- Playwright E2E specs + root config ----------
  // These run inside @playwright/test (Node + browser), not Angular. They
  // freely poke at `document`/`window` via page.evaluate, and there is no
  // SSR concern. They also live outside any Angular tsconfig project, so
  // disable typed linting to avoid adding them to a project just for ESLint.
  {
    files: ['projects/forty-cdk-harness/e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: null,
      },
    },
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
      'forty-cdk/no-suffixed-filenames': 'off',
    },
  },

  // ---------- HTML templates ----------
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // Hard-ban `*ngIf` / `*ngFor` / `*ngSwitch` in favour of `@if` / `@for` / `@switch`.
      '@angular-eslint/template/prefer-control-flow': 'error',
    },
  },

  // ---------- Inline templates extracted from spec files ----------
  // The angular-eslint processor extracts inline `template:` strings into virtual
  // files appended as a sub-path of the parent .ts file (e.g.
  // `…/switch.spec.ts/1_inline-template-switch.spec.ts-1.component.html`). We
  // mirror the spec relaxations so harness templates that render bare `<button
  // forX>` triggers (no visible text) don't trip a11y rules meant for
  // production HTML.
  {
    files: ['**/*.spec.ts/**/*.html'],
    rules: {
      '@angular-eslint/template/elements-content': 'off',
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/label-has-associated-control': 'off',
      '@angular-eslint/template/role-has-required-aria': 'off',
    },
  },
);
