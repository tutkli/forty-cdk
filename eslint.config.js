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

    // ====================================================================
    // @forty-cdk-test-isolation-rules
    //
    // The five rules below codify the test-isolation invariants documented
    // in `CLAUDE.md` → "Testing notes" → "Test isolation — non-negotiables"
    // (the eleven numbered items immediately under that heading). Without
    // mechanical enforcement those invariants decay back into PR-review
    // knowledge — the audit that surfaced them (May 11, 2026) already had
    // to remove regressions from each category.
    //
    // Cross-link (every rule below repeats this anchor in its messages):
    //   https://github.com/tutkli/forty-cdk/blob/main/CLAUDE.md#test-isolation--non-negotiables
    //
    // Style match: each rule keeps the same shape as the original
    // `require-defaults-sibling` above — inline `meta` + a single AST
    // selector (or a tiny `create()`) — so the plugin stays dependency-free
    // and the file remains the single source of truth for forty-cdk's
    // lint policy. Fixtures that intentionally violate each rule live at
    // `projects/forty-cdk/eslint-rules-fixtures/<rule>.fixture.ts`.
    //
    // Refs: tutkli/forty-cdk#230
    // ====================================================================

    // Rule 1 — `forty-cdk/no-bare-whenstable`.
    //
    // Forbids `fixture.whenStable()` (and aliases — any `X.whenStable()` call
    // expression) outside the canonical waiter in
    // `projects/forty-cdk/src/test-utils/flush.ts`. Every spec must `await
    // flush(fixture)` instead so the underlying drain shape
    // (`detectChanges → whenStable → macrotask → detectChanges`) can evolve
    // without churning every spec.
    //
    // See: CLAUDE.md > Testing notes > Test isolation — non-negotiables > rule 7
    // Cross-link: https://github.com/tutkli/forty-cdk/blob/main/CLAUDE.md#test-isolation--non-negotiables
    'no-bare-whenstable': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid `fixture.whenStable()` outside `test-utils/flush.ts`; specs must `await flush(fixture)`.',
        },
        schema: [],
        messages: {
          forbidden:
            'Do not call `whenStable()` directly in specs. Use `await flush(fixture)` from `projects/forty-cdk/src/test-utils/flush.ts` — it owns the drain shape and may evolve without churning every spec. (CLAUDE.md § "Test isolation — non-negotiables" rule 7.)',
        },
      },
      create(context) {
        const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
        // The canonical waiter itself is the only place where `whenStable()`
        // may be invoked directly.
        if (filename.endsWith('/projects/forty-cdk/src/test-utils/flush.ts')) {
          return {};
        }
        return {
          CallExpression(node) {
            const callee = node.callee;
            if (
              callee.type === 'MemberExpression' &&
              !callee.computed &&
              callee.property.type === 'Identifier' &&
              callee.property.name === 'whenStable'
            ) {
              context.report({ node, messageId: 'forbidden' });
            }
          },
        };
      },
    },

    // Rule 2 — `forty-cdk/no-prototype-rect-stub`.
    //
    // Forbids prototype-level layout patches:
    //   - `Element.prototype.getBoundingClientRect = …`
    //   - `HTMLElement.prototype.offsetWidth = …` (and `offsetHeight`,
    //     `clientWidth`, `clientHeight`, `scrollWidth`, `scrollHeight`)
    //   - `Object.defineProperty(Element.prototype, 'getBoundingClientRect', …)`
    //     and the same `defineProperty` form for any of the layout
    //     properties above.
    //
    // jsdom returns zero for every layout API, and patching a single
    // prototype is cross-platform fragile (Linux jsdom defines the
    // descriptor on `HTMLElement.prototype`, macOS/Windows on
    // `Element.prototype` — see #193). Geometry assertions belong in
    // Playwright; the Vitest layer asserts wiring only.
    //
    // See: CLAUDE.md > Testing notes > Test isolation — non-negotiables > rule 8
    // Cross-link: https://github.com/tutkli/forty-cdk/blob/main/CLAUDE.md#test-isolation--non-negotiables
    // Refs: tutkli/forty-cdk#193, tutkli/forty-cdk#195
    'no-prototype-rect-stub': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid prototype-level layout stubs (`*.prototype.getBoundingClientRect`, `offsetWidth`, etc.). Geometry runs in Playwright.',
        },
        schema: [],
        messages: {
          forbiddenAssignment:
            'Do not stub `*.prototype.{{ prop }}` — jsdom returns zero for layout APIs and prototype patches are cross-platform fragile (Linux defines the descriptor on `HTMLElement.prototype`, macOS/Windows on `Element.prototype` — see #193). Move geometry assertions to Playwright. (CLAUDE.md § "Test isolation — non-negotiables" rule 8.)',
          forbiddenDefineProperty:
            'Do not `Object.defineProperty(*.prototype, "{{ prop }}", …)` — jsdom returns zero for layout APIs and prototype patches are cross-platform fragile (see #193). Move geometry assertions to Playwright. (CLAUDE.md § "Test isolation — non-negotiables" rule 8.)',
        },
      },
      create(context) {
        const LAYOUT_PROPS = new Set([
          'getBoundingClientRect',
          'getClientRects',
          'offsetWidth',
          'offsetHeight',
          'offsetLeft',
          'offsetTop',
          'clientWidth',
          'clientHeight',
          'clientLeft',
          'clientTop',
          'scrollWidth',
          'scrollHeight',
        ]);
        // Match the left-hand of `X.prototype.<layout> = …` or
        // `X.prototype['<layout>'] = …`.
        function isPrototypeLayoutAccess(node) {
          if (node.type !== 'MemberExpression') return null;
          // node is e.g. (Element.prototype).getBoundingClientRect
          const propName =
            !node.computed && node.property.type === 'Identifier'
              ? node.property.name
              : node.property.type === 'Literal' && typeof node.property.value === 'string'
                ? node.property.value
                : null;
          if (!propName || !LAYOUT_PROPS.has(propName)) return null;
          const obj = node.object;
          if (
            obj.type === 'MemberExpression' &&
            !obj.computed &&
            obj.property.type === 'Identifier' &&
            obj.property.name === 'prototype'
          ) {
            return propName;
          }
          return null;
        }
        return {
          AssignmentExpression(node) {
            const prop = isPrototypeLayoutAccess(node.left);
            if (prop) {
              context.report({
                node,
                messageId: 'forbiddenAssignment',
                data: { prop },
              });
            }
          },
          CallExpression(node) {
            // Object.defineProperty(<X>.prototype, '<layoutProp>', …)
            const callee = node.callee;
            if (
              callee.type !== 'MemberExpression' ||
              callee.computed ||
              callee.property.type !== 'Identifier' ||
              callee.property.name !== 'defineProperty' ||
              callee.object.type !== 'Identifier' ||
              callee.object.name !== 'Object'
            ) {
              return;
            }
            const [target, key] = node.arguments;
            if (!target || !key) return;
            // target must be `<X>.prototype`
            if (
              target.type !== 'MemberExpression' ||
              target.computed ||
              target.property.type !== 'Identifier' ||
              target.property.name !== 'prototype'
            ) {
              return;
            }
            const keyName =
              key.type === 'Literal' && typeof key.value === 'string' ? key.value : null;
            if (keyName && LAYOUT_PROPS.has(keyName)) {
              context.report({
                node,
                messageId: 'forbiddenDefineProperty',
                data: { prop: keyName },
              });
            }
          },
        };
      },
    },

    // Rule 3 — `forty-cdk/observer-polyfill-must-restore`.
    //
    // If a spec file assigns to `globalThis.ResizeObserver` (or
    // `IntersectionObserver`, `MutationObserver`, `fetch`, `matchMedia`) at
    // top level, in a `beforeAll`, or in a `beforeEach`, it must also
    // restore the global — either:
    //   - an `afterAll` that `delete`s the global (when the spec installed
    //     a polyfill on top of jsdom's missing global), or
    //   - a paired `beforeEach` capture + `afterEach` restore (when the
    //     spec swaps the global per test).
    //
    // Prefer the `installObserverPolyfills()` helper in
    // `projects/forty-cdk/src/test-utils/observers.ts`, which already pairs
    // install with restore and is a no-op for cases where jsdom already
    // ships the global.
    //
    // See: CLAUDE.md > Testing notes > Test isolation — non-negotiables > rule 2
    // Cross-link: https://github.com/tutkli/forty-cdk/blob/main/CLAUDE.md#test-isolation--non-negotiables
    'observer-polyfill-must-restore': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'A spec that installs a global polyfill (`globalThis.X = …`) must restore it via `afterAll`/`afterEach`.',
        },
        schema: [],
        messages: {
          unrestored:
            'Spec installs `globalThis.{{ name }}` but does not restore it. Pair with `afterEach`/`afterAll` (capture before, restore after) or use `installObserverPolyfills()` from `test-utils/observers.ts`. (CLAUDE.md § "Test isolation — non-negotiables" rule 2.)',
        },
      },
      create(context) {
        const POLYFILL_TARGETS = new Set([
          'ResizeObserver',
          'IntersectionObserver',
          'MutationObserver',
          'fetch',
          'matchMedia',
        ]);
        // The helper file owns its own install/restore contract and is exempt.
        const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
        if (filename.endsWith('/projects/forty-cdk/src/test-utils/observers.ts')) {
          return {};
        }
        const installs = new Map(); // name -> node[]
        let sourceText = '';
        function recordInstall(name, node) {
          if (!installs.has(name)) installs.set(name, []);
          installs.get(name).push(node);
        }
        // Unwrap (globalThis as ...).X / (globalThis as unknown as { ... }).X /
        // (<paren-cast>).X — TypeScript `as` casts surface as `TSAsExpression`
        // in the AST. Returns the rightmost member-expression access of
        // `globalThis` (or its alias), or null.
        function unwrapCasts(node) {
          while (node && (node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion')) {
            node = node.expression;
          }
          return node;
        }
        function memberAccessOfGlobal(node) {
          // node should be a MemberExpression whose object resolves to
          // `globalThis` (or `window`, `global`) — possibly wrapped in
          // `as`/`as unknown as`/`as any` casts.
          if (!node || node.type !== 'MemberExpression') return null;
          const obj = unwrapCasts(node.object);
          if (!obj) return null;
          const isGlobalLike =
            obj.type === 'Identifier' &&
            (obj.name === 'globalThis' || obj.name === 'window' || obj.name === 'global');
          if (!isGlobalLike) return null;
          if (!node.computed && node.property.type === 'Identifier') {
            return node.property.name;
          }
          if (
            node.computed &&
            node.property.type === 'Literal' &&
            typeof node.property.value === 'string'
          ) {
            return node.property.value;
          }
          return null;
        }
        return {
          Program(node) {
            sourceText = context.sourceCode
              ? context.sourceCode.getText(node)
              : context.getSourceCode().getText(node);
          },
          AssignmentExpression(node) {
            // (globalThis as …).X = … or globalThis.X = …
            const left = node.left;
            const target = unwrapCasts(left);
            const name = memberAccessOfGlobal(target);
            if (name && POLYFILL_TARGETS.has(name)) {
              recordInstall(name, node);
            }
          },
          'Program:exit'() {
            if (installs.size === 0) return;
            for (const [name, nodes] of installs) {
              // A "restore" is any of:
              //   - `delete globalThis.<name>` / `delete (globalThis as …).<name>`
              //   - a sibling reassignment back from a captured original
              //     (best signalled by a literal restore call inside an
              //     `afterEach`/`afterAll`). We detect either pattern by
              //     scanning the source text for `afterEach(` or `afterAll(`
              //     plus a reassignment of the same name — strict-enough
              //     heuristic for the patterns observed in the codebase
              //     (capture in `beforeEach`, restore in `afterEach`).
              const hasDelete = new RegExp(
                String.raw`delete\s+\(?\s*\(?\s*(?:globalThis|window|global)\b[^)]*\)?[^.\[]*[.\[]\s*['"]?${name}\b`,
              ).test(sourceText);
              const hasAfterHookRestore =
                /\bafter(?:Each|All)\s*\(/.test(sourceText) &&
                new RegExp(
                  String.raw`(?:globalThis|window|global)\b[^=;]*[.\[]\s*['"]?${name}\b['"]?\]?\s*=`,
                  'g',
                ).test(sourceText) &&
                // Ensure there are at least 2 assignments to this name (the
                // install + the restore). The install we already captured;
                // any second assignment under an `after*` hook counts.
                (
                  sourceText.match(
                    new RegExp(
                      String.raw`(?:globalThis|window|global)\b[^=;]*[.\[]\s*['"]?${name}\b['"]?\]?\s*=`,
                      'g',
                    ),
                  ) || []
                ).length >= 2;
              if (!hasDelete && !hasAfterHookRestore) {
                for (const n of nodes) {
                  context.report({ node: n, messageId: 'unrestored', data: { name } });
                }
              }
            }
          },
        };
      },
    },

    // Rule 4 — `forty-cdk/scoped-fake-timers` (warn, not error).
    //
    // The audit's literal phrasing is "warn when `vi.useFakeTimers()`
    // appears in a top-level `beforeEach` outside a `describe('… timers …')`
    // / `describe('… delay …')` block." That predicate would flag two
    // currently-merged spec files (`avatar.spec.ts`, `typeahead.spec.ts`)
    // whose outer describe names are `'ForAvatar'` / `'Typeahead'` — those
    // files already pair install with restore, which is the real isolation
    // invariant. We scope the rule down to the underlying contract:
    //
    //   Warn when `vi.useFakeTimers()` appears inside a `beforeEach` /
    //   `beforeAll` callback whose enclosing `describe` does NOT have a
    //   matching `afterEach` / `afterAll` that calls `vi.useRealTimers()`.
    //
    // That's the property the audit's H3 finding actually penalised
    // (install-without-restore leaks timers across specs). The narrower
    // "scope to a delay-named describe" guidance is documentation, not a
    // mechanical rule.
    //
    // See: CLAUDE.md > Testing notes > Test isolation — non-negotiables > rule 1
    // Cross-link: https://github.com/tutkli/forty-cdk/blob/main/CLAUDE.md#test-isolation--non-negotiables
    'scoped-fake-timers': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Warn when `vi.useFakeTimers()` in a `before*` hook is not paired with `vi.useRealTimers()` in a sibling `after*` hook.',
        },
        schema: [],
        messages: {
          unpaired:
            '`vi.useFakeTimers()` in a `{{ hook }}` hook is not paired with a sibling `vi.useRealTimers()` call in `afterEach` / `afterAll` of the same `describe`. Pair install with restore — an inline restore at the end of an `it` leaks if the test throws first. (CLAUDE.md § "Test isolation — non-negotiables" rule 1.)',
        },
      },
      create(context) {
        // Walk the spec source: each `describe()` callback opens a scope.
        // A scope owns its direct `beforeEach`/`beforeAll`/`afterEach`/
        // `afterAll` hooks (children of its body, not nested describes).
        function getCalleeName(callee) {
          if (callee.type === 'Identifier') return callee.name;
          if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
            return callee.property.name;
          }
          return null;
        }
        function isViCall(call, method) {
          if (call.type !== 'CallExpression') return false;
          const c = call.callee;
          return (
            c.type === 'MemberExpression' &&
            !c.computed &&
            c.object.type === 'Identifier' &&
            c.object.name === 'vi' &&
            c.property.type === 'Identifier' &&
            c.property.name === method
          );
        }
        // Recursively scan a function body for any direct CallExpression
        // matching vi.<method>() — stops descending into nested
        // FunctionExpression / ArrowFunctionExpression bodies that belong
        // to a child describe / it / beforeEach so we count the hook's own
        // calls only.
        function bodyContainsViCall(fnNode, method) {
          if (!fnNode || !fnNode.body) return false;
          const stack = [fnNode.body];
          while (stack.length) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;
            if (Array.isArray(node)) {
              for (const item of node) stack.push(item);
              continue;
            }
            if (
              node.type === 'CallExpression' &&
              isViCall(node, method) &&
              node.arguments.length === 0
            ) {
              return true;
            }
            // Don't descend into nested describe/it/before/after callback
            // bodies — they own their own pairing contract.
            if (
              node.type === 'CallExpression' &&
              [
                'describe',
                'it',
                'test',
                'beforeEach',
                'beforeAll',
                'afterEach',
                'afterAll',
              ].includes(getCalleeName(node.callee) || '')
            ) {
              // Skip — its hooks are checked when we visit its describe.
              continue;
            }
            for (const key in node) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              stack.push(node[key]);
            }
          }
          return false;
        }
        // Direct-child statements of a describe callback's body: hook calls.
        function collectDirectHookCalls(describeCallbackNode) {
          if (!describeCallbackNode || !describeCallbackNode.body) return [];
          const stmts =
            describeCallbackNode.body.type === 'BlockStatement'
              ? describeCallbackNode.body.body
              : [describeCallbackNode.body];
          const hooks = [];
          for (const stmt of stmts) {
            if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
              const name = getCalleeName(stmt.expression.callee);
              if (
                name === 'beforeEach' ||
                name === 'beforeAll' ||
                name === 'afterEach' ||
                name === 'afterAll'
              ) {
                hooks.push({ name, call: stmt.expression });
              }
            }
          }
          return hooks;
        }
        function checkDescribeScope(callbackNode) {
          if (!callbackNode) return;
          const hooks = collectDirectHookCalls(callbackNode);
          const installs = [];
          let restores = false;
          for (const h of hooks) {
            const cb = h.call.arguments[0];
            if (!cb) continue;
            if (h.name === 'beforeEach' || h.name === 'beforeAll') {
              if (bodyContainsViCall(cb, 'useFakeTimers')) {
                installs.push({ hook: h.name, node: h.call });
              }
            } else if (h.name === 'afterEach' || h.name === 'afterAll') {
              if (bodyContainsViCall(cb, 'useRealTimers')) {
                restores = true;
              }
            }
          }
          if (installs.length > 0 && !restores) {
            for (const i of installs) {
              context.report({
                node: i.node,
                messageId: 'unpaired',
                data: { hook: i.hook },
              });
            }
          }
        }
        // Visit every describe() CallExpression and check its direct hooks.
        return {
          CallExpression(node) {
            if (getCalleeName(node.callee) !== 'describe') return;
            const cb = node.arguments[1];
            if (
              !cb ||
              (cb.type !== 'FunctionExpression' && cb.type !== 'ArrowFunctionExpression')
            ) {
              return;
            }
            checkDescribeScope(cb);
          },
        };
      },
    },

    // Rule 5 — `forty-cdk/no-directive-internal-signal-read`.
    //
    // Forbids reading directive internal signals from a spec — the
    // contract is the DOM (ARIA, `data-state`, `data-side`, focus, host
    // classes), not the directive's private signal shape. The literal
    // pattern targeted is the chained call:
    //
    //   fixture.componentRef.injector.get(ForFoo).someSignal()
    //
    // ...where the result of `injector.get(For<X>)` is immediately invoked
    // as a property access ending in `()`. Imperative method calls
    // (`directive.close()`) on a stored variable are intentionally NOT
    // flagged — they remain allowed per the audit's H6 finding.
    //
    // See: CLAUDE.md > Testing notes > Test isolation — non-negotiables > rule 6
    // Cross-link: https://github.com/tutkli/forty-cdk/blob/main/CLAUDE.md#test-isolation--non-negotiables
    'no-directive-internal-signal-read': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid `injector.get(For<X>).signal()` inline chains in specs — assert against the DOM instead.',
        },
        schema: [],
        messages: {
          forbidden:
            'Do not read directive internal signals from a spec — assert against the rendered DOM (ARIA, `data-state`, focus, host classes) instead. The chained pattern `.injector.get({{ token }}).{{ accessor }}()` locks the directive\'s private shape into the spec. (CLAUDE.md § "Test isolation — non-negotiables" rule 6.)',
        },
      },
      create(context) {
        // Match: <anything>.injector.get(For…)  .<accessor>()
        // i.e. a CallExpression whose callee is a MemberExpression whose
        // object is itself a CallExpression to `…injector.get(For<X>)`.
        function isInjectorGetOfForToken(call) {
          if (call.type !== 'CallExpression') return null;
          const c = call.callee;
          if (
            c.type !== 'MemberExpression' ||
            c.computed ||
            c.property.type !== 'Identifier' ||
            c.property.name !== 'get' ||
            c.object.type !== 'MemberExpression' ||
            c.object.computed ||
            c.object.property.type !== 'Identifier' ||
            c.object.property.name !== 'injector'
          ) {
            return null;
          }
          const arg = call.arguments[0];
          if (arg && arg.type === 'Identifier' && /^For[A-Z]/.test(arg.name)) {
            return arg.name;
          }
          return null;
        }
        return {
          CallExpression(node) {
            const outer = node;
            const callee = outer.callee;
            if (
              callee.type !== 'MemberExpression' ||
              callee.computed ||
              callee.property.type !== 'Identifier'
            ) {
              return;
            }
            const accessor = callee.property.name;
            const token = isInjectorGetOfForToken(callee.object);
            if (token) {
              context.report({
                node: outer,
                messageId: 'forbidden',
                data: { token, accessor },
              });
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

    // Enforces CLAUDE.md § "Form primitives use Signal Forms": every concrete
    // class under projects/forty-cdk/src/lib/** implementing `FormValueControl`
    // or `FormCheckboxControl` must ship a sibling `<name>-host-directive.ts`
    // (the `FOR_<PRIMITIVE>_HOST_DIRECTIVE_INPUTS` / `_OUTPUTS` tuples from
    // tutkli/forty-cdk#645 / PR #652), re-exported from the primitive barrel.
    // Mirrors `require-defaults-sibling`, with two deliberate differences:
    //   - It keys on the *file* declaring the class, not the folder root —
    //     one folder may ship several form controls (`input/` has `input.ts`
    //     + `textarea.ts`, `toggle/` has `toggle.ts` + `toggle-group.ts`).
    //   - Abstract classes are skipped: `TextValueControlBase` implements
    //     `FormValueControl<string>` as shared wiring, and the concrete
    //     subclasses own the sibling contract.
    // The `eslint-rules-fixtures` directory is deliberately kept in scope so
    // `pnpm lint:rule-fixtures` proves the rule fires (the sibling never
    // exists there). Fixture: `projects/forty-cdk/eslint-rules-fixtures/require-host-directive-sibling.fixture.ts`.
    //
    // Refs: tutkli/forty-cdk#663
    'require-host-directive-sibling': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Each form-value primitive (`implements FormValueControl` / `FormCheckboxControl`) must expose a sibling `<name>-host-directive.ts` re-exported from its barrel (tutkli/forty-cdk#645).',
        },
        schema: [],
        messages: {
          missingSibling:
            'Class `{{ className }}` implements `{{ contract }}` but the sibling `{{ sibling }}` file is missing. Every form-value primitive ships the `FOR_<PRIMITIVE>_HOST_DIRECTIVE_INPUTS` / `_OUTPUTS` tuples so wrapper components re-expose the full surface without hand-maintaining the list (tutkli/forty-cdk#645, docs/wrapping-form-primitives.md).',
          missingBarrelExport:
            'The sibling `{{ sibling }}` exists but the primitive barrel (`index.ts`) does not re-export it. Add the `FOR_<PRIMITIVE>_HOST_DIRECTIVE_INPUTS` / `_OUTPUTS` re-export so consumers can reach the tuples (tutkli/forty-cdk#645).',
        },
      },
      create(context) {
        const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
        const inLib = filename.includes('/projects/forty-cdk/src/lib/');
        const inFixtures = filename.includes('/projects/forty-cdk/eslint-rules-fixtures/');
        if (!inLib && !inFixtures) return {};
        if (
          filename.endsWith('.spec.ts') ||
          filename.includes('/_internal/') ||
          filename.includes('/test-utils/')
        ) {
          return {};
        }
        const CONTRACTS = new Set(['FormValueControl', 'FormCheckboxControl']);
        // Resolves the contract name from one `implements` entry. Handles the
        // direct form (`implements FormValueControl<T>`) and wrapped type
        // references (`implements Omit<FormValueControl<T>, 'min' | 'max'>`,
        // the ForSlider shape) by scanning the entry's type arguments for a
        // reference to either contract.
        function contractOf(entry) {
          if (entry.expression.type === 'Identifier' && CONTRACTS.has(entry.expression.name)) {
            return entry.expression.name;
          }
          const stack = [entry.typeArguments];
          while (stack.length) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;
            if (Array.isArray(node)) {
              for (const item of node) stack.push(item);
              continue;
            }
            if (!node.type) continue;
            if (
              node.type === 'TSTypeReference' &&
              node.typeName.type === 'Identifier' &&
              CONTRACTS.has(node.typeName.name)
            ) {
              return node.typeName.name;
            }
            for (const key in node) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              stack.push(node[key]);
            }
          }
          return null;
        }
        return {
          ClassDeclaration(node) {
            if (node.abstract || !node.id) return;
            let contract = null;
            for (const entry of node.implements ?? []) {
              contract = contractOf(entry);
              if (contract) break;
            }
            if (!contract) return;
            const dir = path.dirname(filename);
            const base = path.basename(filename, '.ts');
            const sibling = `${base}-host-directive.ts`;
            if (!fs.existsSync(path.join(dir, sibling))) {
              context.report({
                node: node.id,
                messageId: 'missingSibling',
                data: { className: node.id.name, contract, sibling },
              });
              return;
            }
            const barrel = path.join(dir, 'index.ts');
            if (
              fs.existsSync(barrel) &&
              !fs.readFileSync(barrel, 'utf8').includes(`./${base}-host-directive`)
            ) {
              context.report({
                node: node.id,
                messageId: 'missingBarrelExport',
                data: { sibling },
              });
            }
          },
        };
      },
    },

    // Enforces CLAUDE.md § "Context injection helpers are internal": a
    // primitive's `injectXContext(piece)` helper is implementation detail —
    // it takes a directive-name string purely for error messages and exists
    // so sibling pieces of the same primitive can read the shared context.
    // Only the `InjectionToken` (`FOR_<PRIMITIVE>_CONTEXT`) and the context
    // interface are public. This rule forbids any primitive barrel
    // (`projects/forty-cdk/src/lib/<name>/index.ts`) from re-exporting a
    // helper named `inject<Anything>Context`, mirroring the
    // `require-defaults-sibling` shape: an `index.ts`-scoped check over the
    // file's `export` declarations. Sibling pieces still import the helper
    // directly from the relative context module (`./<name>-context`); only
    // the public barrel surface is constrained.
    //
    // Decision D8 (tutkli/forty-cdk#584): unexport `injectXContext` from
    // every barrel; expose only the token + context interface publicly.
    'no-barrel-inject-context-export': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Primitive barrels must not re-export `injectXContext` helpers — they are internal; expose only the token + context interface (tutkli/forty-cdk#584, D8).',
        },
        schema: [],
        messages: {
          forbidden:
            'Do not export the context-injection helper `{{ name }}` from a primitive barrel — it is internal (it takes a directive-name string purely for error messages). Expose only the `InjectionToken` (`FOR_<PRIMITIVE>_CONTEXT`) and the context `interface`; sibling pieces import the helper directly from `./<name>-context`. (tutkli/forty-cdk#584, D8.)',
        },
      },
      create(context) {
        const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
        // Only constrain primitive barrels: <lib>/<name>/index.ts. _internal
        // and test-utils are not part of the public surface contract.
        if (!/\/projects\/forty-cdk\/src\/lib\/[^/]+\/index\.ts$/.test(filename)) {
          return {};
        }
        if (filename.includes('/_internal/') || filename.includes('/test-utils/')) {
          return {};
        }
        const isInjectContextName = (name) =>
          typeof name === 'string' && /^inject[A-Z]\w*Context$/.test(name);
        const reportSpecifier = (spec) => {
          // For `export { injectFooContext }` / `export { x as injectFooContext }`
          // the *exported* name is what leaks onto the barrel surface.
          const exported = spec.exported;
          const exportedName =
            exported.type === 'Identifier'
              ? exported.name
              : exported.type === 'Literal'
                ? exported.value
                : null;
          const localName = spec.local && spec.local.type === 'Identifier' ? spec.local.name : null;
          const name = isInjectContextName(exportedName)
            ? exportedName
            : isInjectContextName(localName)
              ? localName
              : null;
          if (name) {
            context.report({ node: spec, messageId: 'forbidden', data: { name } });
          }
        };
        return {
          ExportNamedDeclaration(node) {
            for (const spec of node.specifiers) {
              if (spec.type === 'ExportSpecifier') reportSpecifier(spec);
            }
          },
        };
      },
    },

    // Mechanizes CLAUDE.md's most-emphasized rule — "Never propagate state
    // inside `effect()`". Flags an `effect(() => …)` whose synchronous body
    // both *reads* a signal reactively and *writes* the same signal via
    // `.set(…)` / `.update(…)`. That read-and-write pattern is the canonical
    // state-propagation anti-pattern: it derives state from a signal inside
    // the effect and feeds it back, creating implicit cycles, double
    // change-detection passes, and ordering bugs. Use `computed()` /
    // `linkedSignal()` instead (CLAUDE.md § "Never propagate state inside
    // `effect()`").
    //
    // Scope and escape hatches (kept deliberately narrow to avoid false
    // positives on legitimate bridge effects):
    //   - Only the effect callback's *own* synchronous statements are
    //     inspected. Reads / writes inside nested function expressions (a
    //     `ResizeObserver` / event callback, a `queueMicrotask`, etc.) fire
    //     outside the reactive scope, so they are not counted.
    //   - A read wrapped in `untracked(() => sig())` is the documented escape
    //     hatch for genuinely needing the current value without subscribing —
    //     such reads are ignored, so pairing `untracked()` reads with writes
    //     does not trip the rule.
    //   - Writes are matched by callee shape (`<base>.set` / `<base>.update`);
    //     a write only fires the rule when `<base>` is also read as `<base>()`
    //     in a tracked position in the same callback.
    //
    // The synthetic violation in the acceptance criteria —
    // `effect(() => { s.set(s() + 1) })` — is exactly the read-and-write the
    // rule flags. Fixture: `projects/forty-cdk/eslint-rules-fixtures/no-effect-state-propagation.fixture.ts`.
    //
    // Refs: tutkli/forty-cdk#509
    'no-effect-state-propagation': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid reading and writing the same signal inside an `effect()` callback (state propagation). Use `computed()` / `linkedSignal()` instead (CLAUDE.md § "Never propagate state inside `effect()`").',
        },
        schema: [],
        messages: {
          forbidden:
            'Do not propagate state inside `effect()`: the same signal (`{{ signal }}`) is read reactively and written via `.set`/`.update` in this effect. This creates implicit cycles, double change-detection, and ordering bugs. Derive it with `computed()` / `linkedSignal()` instead, or wrap the read in `untracked()` if you genuinely need the current value (CLAUDE.md § "Never propagate state inside `effect()`").',
        },
      },
      create(context) {
        const sourceCode = context.sourceCode || context.getSourceCode();
        // A stable key for the signal expression being read / written, so
        // `this.#activeId` reads pair with `this.#activeId.set(…)` writes and
        // `count` pairs with `count.set(…)`. Source text is exact enough for
        // the member / identifier shapes signals take.
        function exprKey(node) {
          return sourceCode.getText(node);
        }
        // Walk a callback's *own* body, collecting tracked reads and writes
        // without descending into nested function scopes or `untracked(…)`.
        function analyzeCallback(fnNode) {
          const trackedReads = new Map(); // key -> first read node
          const writes = []; // { key, node }
          const stack = [fnNode.body];
          while (stack.length) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;
            if (Array.isArray(node)) {
              for (const item of node) stack.push(item);
              continue;
            }
            if (!node.type) continue;
            // Do not descend into nested function scopes — their reads / writes
            // run outside this effect's reactive run (observer callbacks, etc.).
            if (
              node !== fnNode &&
              (node.type === 'FunctionExpression' ||
                node.type === 'ArrowFunctionExpression' ||
                node.type === 'FunctionDeclaration')
            ) {
              continue;
            }
            if (node.type === 'CallExpression') {
              const callee = node.callee;
              // `untracked(() => …)` — the documented escape hatch. Skip the
              // whole subtree; the read inside is intentionally not tracked.
              if (callee.type === 'Identifier' && callee.name === 'untracked') {
                continue;
              }
              // Write: `<base>.set(…)` / `<base>.update(…)`.
              if (
                callee.type === 'MemberExpression' &&
                !callee.computed &&
                callee.property.type === 'Identifier' &&
                (callee.property.name === 'set' || callee.property.name === 'update')
              ) {
                writes.push({ key: exprKey(callee.object), node });
                // Still descend into the arguments — a read may live there.
                for (const arg of node.arguments) stack.push(arg);
                continue;
              }
              // Tracked read: a zero-argument call `<sig>()` whose callee is an
              // identifier or member access (`count()`, `this.#activeId()`).
              if (
                node.arguments.length === 0 &&
                (callee.type === 'Identifier' || callee.type === 'MemberExpression')
              ) {
                const key = exprKey(callee);
                if (!trackedReads.has(key)) {
                  trackedReads.set(key, node);
                }
                // A read has no children worth scanning for this rule.
                continue;
              }
            }
            for (const key in node) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              stack.push(node[key]);
            }
          }
          return { trackedReads, writes };
        }
        return {
          CallExpression(node) {
            const callee = node.callee;
            if (callee.type !== 'Identifier' || callee.name !== 'effect') return;
            const cb = node.arguments[0];
            if (
              !cb ||
              (cb.type !== 'ArrowFunctionExpression' && cb.type !== 'FunctionExpression')
            ) {
              return;
            }
            const { trackedReads, writes } = analyzeCallback(cb);
            const reported = new Set();
            for (const write of writes) {
              if (trackedReads.has(write.key) && !reported.has(write.key)) {
                reported.add(write.key);
                context.report({
                  node: write.node,
                  messageId: 'forbidden',
                  data: { signal: write.key },
                });
              }
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
      // Local tooling scratch (workflow scripts, agent helpers) — gitignored,
      // never shipped, and not authored against the library's lint rules.
      '.claude/**',
      'projects/**/dist/**',
      // ESLint rule fixtures intentionally violate exactly one forty-cdk/*
      // test-isolation rule each (see `@forty-cdk-test-isolation-rules` block
      // below + `projects/forty-cdk/eslint-rules-fixtures/README.md`). They
      // must NOT be included in the default `pnpm lint` run — they would
      // always fail. Use `pnpm lint:rule-fixtures` to confirm each rule
      // still fires on its fixture.
      'projects/forty-cdk/eslint-rules-fixtures/**',
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

      // ---- Host-directive tuples for form primitives (tutkli/forty-cdk#645, #663) ----
      'forty-cdk/require-host-directive-sibling': 'error',

      // ---- Context-injection helpers are internal (tutkli/forty-cdk#584, D8) ----
      // Primitive barrels expose only the token + context interface; the
      // `injectXContext` helper must never be re-exported from `index.ts`.
      'forty-cdk/no-barrel-inject-context-export': 'error',

      // ---- No state propagation inside effect() (CLAUDE.md § "Never
      // propagate state inside `effect()`"). ----
      'forty-cdk/no-effect-state-propagation': 'error',

      // ---- Test isolation invariants (see @forty-cdk-test-isolation-rules
      // block above; CLAUDE.md § "Test isolation — non-negotiables"). ----
      'forty-cdk/no-bare-whenstable': 'error',
      'forty-cdk/no-prototype-rect-stub': 'error',
      'forty-cdk/observer-polyfill-must-restore': 'error',
      'forty-cdk/scoped-fake-timers': 'warn',
      'forty-cdk/no-directive-internal-signal-read': 'error',

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

  {
    files: ['projects/forty-cdk-playground/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',
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
      // The Vitest-focused test-isolation invariants don't apply to
      // Playwright E2E specs: those run in real browsers (no jsdom
      // polyfill leakage between specs), use Playwright `BrowserContext`
      // lifecycles rather than Vitest hooks, and `addInitScript` writes to
      // `window` inside the browser process — not the worker globalThis.
      'forty-cdk/no-bare-whenstable': 'off',
      'forty-cdk/no-prototype-rect-stub': 'off',
      'forty-cdk/observer-polyfill-must-restore': 'off',
      'forty-cdk/scoped-fake-timers': 'off',
      'forty-cdk/no-directive-internal-signal-read': 'off',
    },
  },

  // ---------- ESLint rule fixtures (typed-parsing override) ----------
  // The fixtures are listed in the top-level `ignores` block so `pnpm lint`
  // skips them by default (each one intentionally violates exactly one
  // `forty-cdk/*` test-isolation rule). This override exists for the
  // explicit `pnpm lint:rule-fixtures` script: it disables typed linting
  // (the fixtures live outside every Angular tsconfig project) and turns
  // off rules that would otherwise drown each fixture in unrelated errors,
  // leaving only the one `forty-cdk/*` rule the fixture is exercising.
  {
    files: ['projects/forty-cdk/eslint-rules-fixtures/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: null,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  // ---------- Repo-root Vitest config ----------
  // Loaded by the `@angular/build:unit-test` builder via `runnerConfig: true`.
  // Lives outside any Angular tsconfig project (the library's tsconfig.spec.json
  // only includes `src/**`), so disable typed linting to avoid adding it to a
  // project just for ESLint — matching the playwright.config.ts treatment above.
  {
    files: ['vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: null,
      },
    },
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // ---------- HTML templates ----------
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
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
