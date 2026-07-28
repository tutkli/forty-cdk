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
    // The six rules below codify the test-isolation invariants documented
    // in `CLAUDE.md` → "Testing notes" → "Test isolation — non-negotiables"
    // (the twelve numbered items immediately under that heading). Without
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
    // Refs: tutkli/forty-cdk#230, tutkli/forty-cdk#1154
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

    // Rule 6 — `forty-cdk/no-floating-flush`.
    //
    // Forbids a *floating* (un-awaited) call to one of the async render
    // waiters — `flush(fixture)`, `flushPositioning(fixture)`, or
    // `nextMacrotask()` — whether the free function imported from
    // `test-utils/flush.ts` or the `flush` method destructured from
    // `renderHost()`. All three are `() => Promise<void>`: a bare `flush();`
    // statement runs only the initial synchronous `detectChanges()` and lets
    // the async drain (`whenStable` → macrotask → second `detectChanges`, plus
    // `afterNextRender` / floating-ui positioning side effects) escape the test
    // boundary, so assertions can pass against stale DOM. Every call must be
    // `await`ed (or otherwise consumed — returned, `void`-ed, chained,
    // assigned).
    //
    // "Floating" is detected structurally: the call is the whole expression of
    // an `ExpressionStatement`. `await flush()` (parent `AwaitExpression`),
    // `return flush()`, `const p = flush()`, `void flush()`, and
    // `flush().then(...)` are all consumed and never flagged. Scoped to
    // `*.spec.ts` (plus this rule's own fixture) — in specs the flush family is
    // unambiguously the async render waiter.
    //
    // See: CLAUDE.md > Testing notes > Test isolation — non-negotiables > rule 12
    // Cross-link: https://github.com/tutkli/forty-cdk/blob/main/CLAUDE.md#test-isolation--non-negotiables
    // Refs: tutkli/forty-cdk#1154
    'no-floating-flush': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid floating (un-awaited) `flush()` / `flushPositioning()` / `nextMacrotask()` calls in specs — the returned Promise must be awaited.',
        },
        schema: [],
        messages: {
          floating:
            'Un-awaited `{{ name }}(…)`. It returns `Promise<void>`; a bare call runs only the initial synchronous `detectChanges()` and lets the async drain (`whenStable` → macrotask → second `detectChanges`, `afterNextRender`, positioning) escape the test — assertions may pass against stale DOM. Prefix it with `await` (and mark the enclosing callback `async`). (CLAUDE.md § "Test isolation — non-negotiables" rule 12.)',
        },
      },
      create(context) {
        const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
        // In specs the flush family is unambiguously the async render waiter.
        // The rule's own fixture (a `.fixture.ts`, linted via
        // `pnpm lint:rule-fixtures`) is included so the rule is proven to fire.
        const isSpec = filename.endsWith('.spec.ts');
        const isOwnFixture = filename.endsWith(
          '/eslint-rules-fixtures/no-floating-flush.fixture.ts',
        );
        if (!isSpec && !isOwnFixture) {
          return {};
        }
        const WAITERS = new Set(['flush', 'flushPositioning', 'nextMacrotask']);
        function calleeName(callee) {
          if (callee.type === 'Identifier') {
            return callee.name;
          }
          if (
            callee.type === 'MemberExpression' &&
            !callee.computed &&
            callee.property.type === 'Identifier'
          ) {
            return callee.property.name;
          }
          return null;
        }
        return {
          CallExpression(node) {
            const name = calleeName(node.callee);
            if (!name || !WAITERS.has(name)) {
              return;
            }
            if (node.parent && node.parent.type === 'ExpressionStatement') {
              context.report({ node, messageId: 'floating', data: { name } });
            }
          },
        };
      },
    },

    // Rule 8 — `forty-cdk/no-redundant-not-tobenull`.
    //
    // Forbids `expect(x).not.toBeNull()` when the very next statements go on
    // to write `x!` anyway. The non-null assertion already tells the reader
    // (and the compiler) what the author knows, and the `!` fails the test
    // just as loudly on a null — with a clearer stack. The extra `expect` is
    // pure noise, and it accumulated to 45 sites across 12 specs before this
    // rule existed, which is the point: a convention documented only in prose
    // decays.
    //
    // Detection is deliberately narrow, so the rule never fires on a genuine
    // null-check: only when the SAME identifier appears with a `!` inside the
    // following few statements of the same block. An `expect(x).not.toBeNull()`
    // that is the whole point of the test (no `!` follows) stays legal.
    //
    // See: CLAUDE.md > Testing notes > Test isolation — non-negotiables > rule 10
    // Cross-link: https://github.com/tutkli/forty-cdk/blob/main/CLAUDE.md#test-isolation--non-negotiables
    // Refs: tutkli/forty-cdk#1397
    'no-redundant-not-tobenull': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid `expect(x).not.toBeNull()` immediately followed by a non-null assertion on the same identifier — the `!` already carries the claim.',
        },
        schema: [],
        messages: {
          redundant:
            '`expect({{ name }}).not.toBeNull()` is redundant: the following `{{ name }}!` already asserts non-nullness to both the reader and the compiler, and throws on a null just as loudly. Drop the assertion. (CLAUDE.md § "Test isolation — non-negotiables" rule 10.)',
        },
      },
      create(context) {
        const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
        const isSpec = filename.endsWith('.spec.ts');
        const isOwnFixture = filename.endsWith(
          '/eslint-rules-fixtures/no-redundant-not-tobenull.fixture.ts',
        );
        if (!isSpec && !isOwnFixture) {
          return {};
        }
        // How many following statements count as "immediately after". Wide
        // enough for an arrange/act pair between the guard and its use,
        // narrow enough that an unrelated later `x!` doesn't retro-flag a
        // legitimate null-check.
        const LOOKAHEAD = 6;
        const sourceCode = context.sourceCode ?? context.getSourceCode();

        // `expect(<Identifier>).not.toBeNull()` → the identifier's name.
        function guardedIdentifier(node) {
          const callee = node.callee;
          if (
            callee.type !== 'MemberExpression' ||
            callee.computed ||
            callee.property.type !== 'Identifier' ||
            callee.property.name !== 'toBeNull'
          ) {
            return null;
          }
          const notMember = callee.object;
          if (
            notMember.type !== 'MemberExpression' ||
            notMember.computed ||
            notMember.property.type !== 'Identifier' ||
            notMember.property.name !== 'not'
          ) {
            return null;
          }
          const expectCall = notMember.object;
          if (
            expectCall.type !== 'CallExpression' ||
            expectCall.callee.type !== 'Identifier' ||
            expectCall.callee.name !== 'expect' ||
            expectCall.arguments.length !== 1 ||
            expectCall.arguments[0].type !== 'Identifier'
          ) {
            return null;
          }
          return expectCall.arguments[0].name;
        }

        function followingStatements(node) {
          let statement = node;
          while (statement.parent && statement.parent.type !== 'BlockStatement') {
            statement = statement.parent;
          }
          const block = statement.parent;
          if (!block || !Array.isArray(block.body)) {
            return [];
          }
          const index = block.body.indexOf(statement);
          if (index < 0) {
            return [];
          }
          return block.body.slice(index + 1, index + 1 + LOOKAHEAD);
        }

        return {
          CallExpression(node) {
            const name = guardedIdentifier(node);
            if (name === null) {
              return;
            }
            for (const statement of followingStatements(node)) {
              const text = sourceCode.getText(statement);
              if (new RegExp(`\\b${name}!`).test(text)) {
                context.report({ node, messageId: 'redundant', data: { name } });
                return;
              }
            }
          },
        };
      },
    },

    // Rule 7 — `forty-cdk/require-overlay-cleanup`.
    //
    // A spec that mounts a primitive which portals content to `document.body`
    // must call `afterEachOverlayCleanup()` (from
    // `projects/forty-cdk/src/test-utils/overlay-cleanup.ts`) at least once in
    // the file. That helper is a leak detector for the failing-mid-render
    // path: if a test throws between `open.set(true)` and the
    // `afterNextRender` that inserts/removes the portaled node, the orphan can
    // survive into the next spec and bleed stale ARIA. The happy path never
    // exercises it, so a silently-omitted call reads as "isolated" when it
    // isn't (tooltip.spec had 22 portaling `describe` blocks missing the call
    // before #1155).
    //
    // Detection is import-driven and file-level (the coarse, robust option
    // recommended by #1256): if the file imports one of the maintained
    // portaling symbols below as a value, it must call
    // `afterEachOverlayCleanup()` somewhere in the file. Keying on the
    // *content* directive (`ForPopoverContent`, …) or the imperative *manager*
    // (`ForDialogManager`, …) — NOT the root coordinator (`ForPopover`,
    // `ForSelect`, …) — is deliberate: contract specs import the root to reach
    // the primitive WITHOUT opening the portaled surface (positioning inputs,
    // disabled reflection, form-field wiring), so keying on roots would
    // false-positive on them. Importing the content directive / manager is the
    // unambiguous signal that the spec renders a surface that portals to the
    // body.
    //
    // The SSR smoke suite (`src/lib/ssr/ssr.spec.ts`) is exempt: it forces
    // `PLATFORM_ID` to the server id so `afterNextRender` never fires and
    // nothing portals — asserting `<body>` is untouched IS its contract, so it
    // imports every overlay piece yet must not call the cleanup helper.
    //
    // See: CLAUDE.md > Testing notes > Test isolation — non-negotiables > rule 5
    // Cross-link: https://github.com/tutkli/forty-cdk/blob/main/CLAUDE.md#test-isolation--non-negotiables
    // Refs: tutkli/forty-cdk#1155, tutkli/forty-cdk#1256
    'require-overlay-cleanup': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'A spec importing a portaling overlay primitive must call `afterEachOverlayCleanup()` (from `test-utils/overlay-cleanup.ts`).',
        },
        schema: [],
        messages: {
          missing:
            'This spec imports the portaling overlay primitive `{{ symbol }}` but never calls `afterEachOverlayCleanup()`. A test that throws mid-render can orphan the portaled node and leak stale ARIA into the next spec. Call `afterEachOverlayCleanup()` (from `projects/forty-cdk/src/test-utils/overlay-cleanup.ts`) once at the top of each portaling `describe`. (CLAUDE.md § "Test isolation — non-negotiables" rule 5.)',
        },
      },
      create(context) {
        const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
        // In specs the flush family / overlay pieces are unambiguous. The
        // rule's own fixture (a `.fixture.ts`, linted via
        // `pnpm lint:rule-fixtures`) is included so the rule is proven to fire.
        const isSpec = filename.endsWith('.spec.ts');
        const isOwnFixture = filename.endsWith(
          '/eslint-rules-fixtures/require-overlay-cleanup.fixture.ts',
        );
        if (!isSpec && !isOwnFixture) {
          return {};
        }
        // The SSR smoke suite renders server-side (`PLATFORM_ID` = server), so
        // `afterNextRender` never fires and no overlay portals to the body —
        // asserting `<body>` is untouched IS its contract. It imports every
        // overlay piece yet must NOT call the cleanup helper.
        if (filename.endsWith('/projects/forty-cdk/src/lib/ssr/ssr.spec.ts')) {
          return {};
        }
        // Maintained allowlist of symbols whose import means the spec renders a
        // surface that portals to `document.body`: the content directive of
        // each anchored / free-floating overlay, plus the imperative managers
        // (whose specs import the manager, not the directive). Keep in sync
        // with the overlay primitives that portal (see
        // `test-utils/overlay-cleanup.ts`).
        const PORTALING_SYMBOLS = new Set([
          'ForDialog',
          'ForDialogManager',
          'ForDrawer',
          'ForDrawerManager',
          'ForPopoverContent',
          'ForTooltipContent',
          'ForHoverCardContent',
          'ForMenuContent',
          'ForSelectContent',
          'ForComboboxContent',
          'ForDatePickerContent',
          'ForTimePickerContent',
          'ForToast',
          'ForToastManager',
        ]);
        const imported = [];
        let hasCleanupCall = false;
        return {
          ImportDeclaration(node) {
            // Type-only imports mount nothing — `import type { ForDialog }`
            // never renders the overlay, so it can't leak. Skip them.
            if (node.importKind === 'type') return;
            for (const spec of node.specifiers) {
              if (spec.type !== 'ImportSpecifier') continue;
              if (spec.importKind === 'type') continue;
              const name = spec.imported.type === 'Identifier' ? spec.imported.name : null;
              if (name && PORTALING_SYMBOLS.has(name)) {
                imported.push({ symbol: name, node: spec });
              }
            }
          },
          CallExpression(node) {
            const callee = node.callee;
            if (callee.type === 'Identifier' && callee.name === 'afterEachOverlayCleanup') {
              hasCleanupCall = true;
            }
          },
          'Program:exit'() {
            if (hasCleanupCall || imported.length === 0) return;
            const first = imported[0];
            context.report({
              node: first.node,
              messageId: 'missing',
              data: { symbol: first.symbol },
            });
          },
        };
      },
    },

    // Enforces CLAUDE.md § "Defaults providers": a primitive must ship a
    // sibling <name>-defaults.ts ONLY when it actually consumes scoped
    // defaults — i.e. some non-defaults source file in the entry's src/
    // injects the `FOR_<PRIMITIVE>_DEFAULTS` token. Primitives with no
    // per-scope tunables omit the file entirely (no empty stub). Recognises
    // both library layouts:
    //   - per-entry-point:  projects/forty-cdk/<entry>/src/<entry>.ts
    //   - legacy folder:    projects/forty-cdk/src/lib/<name>/<name>.ts
    // In the per-entry-point layout the primitive name is the entry-point
    // folder (the segment before /src/), NOT the immediate parent dir (which
    // is `src`). The `core` entry holds the cross-cutting utilities (the former
    // `_internal`) and is exempt, as are `_internal`/`test-utils`. A dedicated
    // fixture (require-defaults-sibling.fixture.ts) references its derived
    // token with no sibling present, so it exercises the rule under
    // `pnpm lint:rule-fixtures`. Fires once per primitive root file via a
    // Program-level filesystem check.
    'require-defaults-sibling': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'A primitive that injects `FOR_<PRIMITIVE>_DEFAULTS` must expose a sibling `<name>-defaults.ts` per CLAUDE.md § "Defaults providers".',
        },
        schema: [],
        messages: {
          missing:
            'Primitive `{{name}}` injects `{{token}}` but the required `{{name}}-defaults.ts` sibling file is missing (CLAUDE.md § "Defaults providers"). Add the sibling declaring `provideFor<Primitive>Defaults` + `{{token}}`.',
        },
      },
      create(context) {
        // Resolves `{ primitive, dir }` for a primitive *root* file, or null.
        // The primitive name is the entry-point folder (the segment before
        // /src/) for the per-entry-point layout, or the folder name for the
        // legacy layout. The `core` entry (former `_internal`) is never a
        // primitive with a defaults provider.
        function primitiveRootOf(normalized, dir) {
          const entry = normalized.match(/\/projects\/forty-cdk\/([^/]+)\/src\/([^/]+)\.ts$/);
          if (entry && entry[1] === entry[2]) {
            return entry[1] === 'core' ? null : { primitive: entry[1], dir };
          }
          const legacy = normalized.match(/\/projects\/forty-cdk\/src\/lib\/([^/]+)\/([^/]+)\.ts$/);
          if (legacy && legacy[1] === legacy[2]) {
            return { primitive: legacy[1], dir };
          }
          return null;
        }
        // Derives the scoped-defaults token name from a kebab-case primitive
        // name: `date-picker` → `FOR_DATE_PICKER_DEFAULTS`.
        function tokenNameOf(primitive) {
          return `FOR_${primitive.replace(/-/g, '_').toUpperCase()}_DEFAULTS`;
        }
        // True when any sibling `.ts` source in `dir` (excluding the defaults
        // file itself and spec files) references the token.
        function anySiblingInjectsToken(dir, primitive, token) {
          let entries;
          try {
            entries = fs.readdirSync(dir);
          } catch {
            return false;
          }
          const defaultsFile = `${primitive}-defaults.ts`;
          for (const name of entries) {
            if (!name.endsWith('.ts')) continue;
            if (name === defaultsFile) continue;
            if (name.endsWith('.spec.ts')) continue;
            let source;
            try {
              source = fs.readFileSync(path.join(dir, name), 'utf8');
            } catch {
              continue;
            }
            if (source.includes(token)) return true;
          }
          return false;
        }
        return {
          Program(node) {
            const filename = context.filename || context.getFilename();
            const dir = path.dirname(filename);
            const normalized = filename.replace(/\\/g, '/');
            // Skip cross-cutting helpers and test utilities.
            if (normalized.includes('/_internal/') || normalized.includes('/test-utils/')) {
              return;
            }
            let info;
            if (normalized.includes('/projects/forty-cdk/eslint-rules-fixtures/')) {
              // Scope the fixtures carve-out to the one fixture that exercises
              // this rule, so the other fixtures (which target other rules) do
              // not trip this Program-level filesystem check.
              const base = path.basename(filename, '.ts');
              if (base !== 'require-defaults-sibling.fixture') return;
              info = { primitive: base, dir };
            } else {
              info = primitiveRootOf(normalized, dir);
            }
            if (!info) return;
            const token = tokenNameOf(info.primitive);
            // Only require the sibling when the primitive actually consumes
            // scoped defaults (some non-defaults source injects the token).
            if (!anySiblingInjectsToken(info.dir, info.primitive, token)) return;
            const sibling = path.join(info.dir, `${info.primitive}-defaults.ts`);
            if (!fs.existsSync(sibling)) {
              context.report({
                node,
                loc: { line: 1, column: 0 },
                messageId: 'missing',
                data: { name: info.primitive, token },
              });
            }
          },
        };
      },
    },

    // Companion (reverse direction) of `require-defaults-sibling`: flags a
    // `<name>-defaults.ts` sibling whose exported defaults token is never
    // injected by a non-defaults, non-spec source file in the same entry — a
    // dead defaults file that still enlarges the public API (token + provider +
    // interface) with nothing consuming it. `require-defaults-sibling` closes
    // the "primitive injects the token but the file is missing" direction; this
    // rule closes the "file ships but nothing injects the token" direction
    // (#1258 inverted the former and left the latter unguarded).
    //
    // The token identifier is read from the defaults file's own exports (the
    // `export const FOR_<X> = token;` shape from `createDefaults`, or a bare
    // `= new InjectionToken(...)`) rather than derived from the primitive name,
    // so it stays correct for secondary defaults files that don't match the
    // entry name (`date-picker/src/date-range-picker-defaults.ts` exports
    // `FOR_DATE_RANGE_PICKER_DEFAULTS`). Recognises both library layouts:
    //   - per-entry-point:  projects/forty-cdk/<entry>/src/<name>-defaults.ts
    //   - legacy folder:    projects/forty-cdk/src/lib/<name>/<name>-defaults.ts
    // The `core` entry holds the cross-cutting utilities and is exempt, as are
    // `_internal` / `test-utils`. A file exporting no defaults token is out of
    // scope (nothing to consume). The entry barrel (`public-api.ts`, or the
    // legacy `index.ts`) is NOT counted as a consumer: every shipping entry
    // re-exports its token there, but re-exporting is not injecting — counting
    // it would neutralize the rule, since a dead-but-public defaults file is by
    // definition re-exported from the barrel. The dedicated fixture
    // (no-unused-defaults-sibling.fixture.ts) sits next to a support
    // `public-api.ts` that re-exports its token, so `pnpm lint:rule-fixtures`
    // proves the fixture still fires despite the barrel re-export (i.e. proves
    // the carve-out). Fires once per orphaned defaults file via a Program-level
    // filesystem check.
    //
    // Refs: tutkli/forty-cdk#1262 (reverse of #1258, part of #1157).
    'no-unused-defaults-sibling': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'A `<name>-defaults.ts` sibling whose defaults token is never injected in its own entry is dead weight — remove it or inject the token (reverse of `require-defaults-sibling`; CLAUDE.md § "Defaults providers").',
        },
        schema: [],
        messages: {
          unused:
            'The defaults file `{{ name }}-defaults.ts` exports `{{ token }}` but no non-defaults, non-spec sibling in its entry ever injects it — a dead defaults file that still enlarges the public API (token + provider + interface). Remove it, or inject the token where the scoped defaults are read (CLAUDE.md § "Defaults providers").',
        },
      },
      create(context) {
        const filename = context.filename || context.getFilename();
        const normalized = filename.replace(/\\/g, '/');
        const dir = path.dirname(filename);
        // Skip cross-cutting helpers and test utilities.
        if (normalized.includes('/_internal/') || normalized.includes('/test-utils/')) {
          return {};
        }
        // Resolve the primitive name (for the message) and confirm this file is a
        // `<name>-defaults.ts` sibling we must check. In the fixtures directory
        // the check is scoped to the one fixture that exercises this rule so the
        // other fixtures (which target other rules) don't trip it.
        let name;
        if (normalized.includes('/projects/forty-cdk/eslint-rules-fixtures/')) {
          const base = path.basename(filename, '.ts');
          if (base !== 'no-unused-defaults-sibling.fixture') return {};
          name = base;
        } else {
          const entry = normalized.match(
            /\/projects\/forty-cdk\/([^/]+)\/src\/([^/]+)-defaults\.ts$/,
          );
          const legacy = normalized.match(
            /\/projects\/forty-cdk\/src\/lib\/[^/]+\/([^/]+)-defaults\.ts$/,
          );
          if (entry && entry[1] !== 'core') {
            name = entry[2];
          } else if (legacy) {
            name = legacy[1];
          } else {
            return {};
          }
        }
        // The exported defaults token(s) this file declares — read from the file
        // itself so the check doesn't assume the `FOR_<PRIMITIVE>_DEFAULTS`
        // naming convention.
        const tokenNames = [];
        function isTokenInit(init) {
          if (!init) return false;
          if (init.type === 'Identifier' && init.name === 'token') return true;
          return (
            init.type === 'NewExpression' &&
            init.callee.type === 'Identifier' &&
            init.callee.name === 'InjectionToken'
          );
        }
        // True when a non-defaults, non-spec sibling `.ts` source references any
        // of this file's exported tokens.
        //
        // The entry barrel (`public-api.ts`, or the legacy `index.ts`) is
        // excluded: it re-exports `FOR_<PRIMITIVE>_DEFAULTS` by name in every
        // shipping entry, but a re-export is not an injection — nothing consumes
        // the token there, it is merely re-exposed. Counting the barrel would
        // neutralize this rule entirely, because a dead-but-public defaults file
        // (the exact case it targets — one that "still enlarges the public API")
        // is by definition re-exported from the barrel. See #1262.
        const BARRELS = new Set(['public-api.ts', 'index.ts']);
        function anySiblingInjectsToken() {
          let entries;
          try {
            entries = fs.readdirSync(dir);
          } catch {
            return false;
          }
          const self = path.basename(filename);
          for (const entryName of entries) {
            if (!entryName.endsWith('.ts')) continue;
            if (entryName === self) continue;
            if (entryName.endsWith('.spec.ts')) continue;
            if (BARRELS.has(entryName)) continue;
            let source;
            try {
              source = fs.readFileSync(path.join(dir, entryName), 'utf8');
            } catch {
              continue;
            }
            if (tokenNames.some((token) => source.includes(token))) return true;
          }
          return false;
        }
        return {
          ExportNamedDeclaration(node) {
            if (!node.declaration || node.declaration.type !== 'VariableDeclaration') return;
            for (const decl of node.declaration.declarations) {
              if (decl.id.type === 'Identifier' && isTokenInit(decl.init)) {
                tokenNames.push(decl.id.name);
              }
            }
          },
          'Program:exit'(node) {
            // No exported token → nothing to consume; out of this rule's scope.
            if (tokenNames.length === 0) return;
            if (anySiblingInjectsToken()) return;
            context.report({
              node,
              loc: { line: 1, column: 0 },
              messageId: 'unused',
              data: { name, token: tokenNames.join(', ') },
            });
          },
        };
      },
    },

    // Enforces CLAUDE.md § "Form primitives use Signal Forms": every concrete
    // class implementing `FormValueControl` or `FormCheckboxControl` must ship
    // a sibling `<name>-host-directive.ts` (the
    // `FOR_<PRIMITIVE>_HOST_DIRECTIVE_INPUTS` / `_OUTPUTS` tuples from
    // tutkli/forty-cdk#645 / PR #652), re-exported from the primitive barrel
    // (`public-api.ts` in the per-entry-point layout, `index.ts` in the legacy
    // layout). Scoped to the library sources under both layouts:
    //   - per-entry-point:  projects/forty-cdk/<entry>/src/**
    //   - legacy folder:    projects/forty-cdk/src/lib/**
    // The `core` entry (former `_internal`) is exempt, as are `_internal` /
    // `test-utils`. Mirrors `require-defaults-sibling`, with two deliberate
    // differences:
    //   - It keys on the *file* declaring the class, not the entry root —
    //     one entry may ship several form controls (`input/` has `input.ts`
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
            'The sibling `{{ sibling }}` exists but the primitive barrel (`public-api.ts`) does not re-export it. Add the `FOR_<PRIMITIVE>_HOST_DIRECTIVE_INPUTS` / `_OUTPUTS` re-export so consumers can reach the tuples (tutkli/forty-cdk#645).',
        },
      },
      create(context) {
        const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
        // Match both layouts: per-entry-point (projects/forty-cdk/<entry>/src/**)
        // and the legacy folder layout (projects/forty-cdk/src/lib/**).
        const inLib =
          /\/projects\/forty-cdk\/[^/]+\/src\//.test(filename) ||
          filename.includes('/projects/forty-cdk/src/lib/');
        const inFixtures = filename.includes('/projects/forty-cdk/eslint-rules-fixtures/');
        if (!inLib && !inFixtures) return {};
        // `core` is the cross-cutting utilities entry (former `_internal`); its
        // shared form-control bases are abstract and own no host-directive
        // sibling.
        if (
          filename.endsWith('.spec.ts') ||
          /\/projects\/forty-cdk\/core\/src\//.test(filename) ||
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
            // The barrel is `public-api.ts` in the per-entry-point layout and
            // `index.ts` in the legacy layout; check whichever exists.
            const barrel = [path.join(dir, 'public-api.ts'), path.join(dir, 'index.ts')].find(
              (candidate) => fs.existsSync(candidate),
            );
            if (barrel && !fs.readFileSync(barrel, 'utf8').includes(`./${base}-host-directive`)) {
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
    // interface are public. This rule forbids any primitive barrel from
    // re-exporting a helper named `inject<Anything>Context`, mirroring the
    // `require-defaults-sibling` shape: a barrel-scoped check over the file's
    // `export` declarations. Recognises both library layouts:
    //   - per-entry-point:  projects/forty-cdk/<entry>/src/public-api.ts
    //   - legacy folder:    projects/forty-cdk/src/lib/<name>/index.ts
    // The `core` entry (former `_internal`) is exempt — its barrel is the
    // internal shared surface and deliberately re-exports internal helpers with
    // no semver guarantee — as are `_internal` / `test-utils`. Sibling pieces
    // still import the helper directly from the relative context module
    // (`./<name>-context`); only the public barrel surface is constrained.
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
        // Only constrain primitive barrels. Recognise both library layouts:
        //   - per-entry-point:  projects/forty-cdk/<entry>/src/public-api.ts
        //   - legacy folder:    projects/forty-cdk/src/lib/<name>/index.ts
        const perEntry = /\/projects\/forty-cdk\/([^/]+)\/src\/public-api\.ts$/.exec(filename);
        const isLegacyBarrel = /\/projects\/forty-cdk\/src\/lib\/[^/]+\/index\.ts$/.test(filename);
        if (!perEntry && !isLegacyBarrel) {
          return {};
        }
        // `_internal` and `test-utils` are not part of the public surface
        // contract; in the per-entry-point layout the former `_internal` is the
        // `core` entry (its barrel deliberately re-exports internal helpers with
        // no semver guarantee), so it is exempt too.
        if (
          (perEntry && perEntry[1] === 'core') ||
          filename.includes('/_internal/') ||
          filename.includes('/test-utils/')
        ) {
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

    // `forty-cdk/require-sanctioned-effect-marker`.
    //
    // The companion to `no-effect-state-propagation` above, and the mechanical
    // half of CLAUDE.md's "never propagate state inside `effect()`" rule. That
    // rule only catches the *same* signal being read and written; a write to a
    // *different* signal — the shape `element-size` and
    // `force-close-when-disabled` both need — passes it silently, which is how
    // the carve-outs accumulated with nothing but prose to justify them.
    //
    // Every `.set(…)` / `.update(…)` inside an `effect()` callback in library
    // source must therefore be licensed by the canonical marker comment placed
    // immediately above the `effect(` call:
    //
    //   // @sanctioned-effect(external-source): mirrors a ResizeObserver, so no
    //   // read in this effect can depend on the written signal.
    //   effect(() => { out.set(measure(el)); });
    //
    // The invariant name in parentheses is what a reviewer verifies and what a
    // future refactor must preserve; the sentence after the colon names the
    // mechanism. `grep @sanctioned-effect` is then the library's complete
    // carve-out ledger (two sites today).
    //
    // Deliberate design notes:
    //   - Keyed on the method *name* (`set` / `update`), so a `Map.set` inside
    //     an effect trips it too. That false positive is loud and cheap to
    //     resolve; a rule that tried to prove signal-ness would miss the real
    //     thing. DOM writes (`setAttribute`, `toggleAttribute`,
    //     `style.setProperty`, `el.value = …`) are what `effect()` is for and
    //     never match.
    //   - Does not descend into nested function scopes, matching
    //     `no-effect-state-propagation`: a write inside an observer callback
    //     runs outside the effect's reactive run. The consequence is that a
    //     write one hoisted-helper call away (as in `element-size`) is invisible
    //     to the lint — the marker is still required there by convention so the
    //     grep ledger stays complete.
    //   - A marker licenses only the effect it sits on. A bare
    //     `@sanctioned-effect` with no invariant / no rationale is reported as
    //     malformed rather than accepted.
    //
    // See: CLAUDE.md > conventions > "The sanctioned-effect marker".
    // Fixture: `projects/forty-cdk/eslint-rules-fixtures/require-sanctioned-effect-marker.fixture.ts`.
    'require-sanctioned-effect-marker': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Every signal write inside an `effect()` must carry the canonical `@sanctioned-effect(<invariant>): <why>` marker comment (CLAUDE.md § "The sanctioned-effect marker").',
        },
        schema: [],
        messages: {
          missingMarker:
            'Unmarked signal write inside `effect()`: `{{ signal }}.{{ method }}(…)`. `effect()` is for side effects that escape the reactive graph — derive state with `computed()` / `linkedSignal()` / `resource()` / `toSignal()` instead. If the write is genuinely sanctioned, license it with a marker comment directly above the `effect(` call: `// @sanctioned-effect(<invariant>): <why the write cannot cycle>`. (CLAUDE.md § "The sanctioned-effect marker".)',
          malformedMarker:
            'Malformed `@sanctioned-effect` marker. The shape is `// @sanctioned-effect(<invariant>): <why the write cannot cycle>` — a kebab-case invariant name in parentheses (e.g. `external-source`, `untracked-read`) and a one-sentence rationale after the colon. The name is what a reviewer verifies and what a refactor must preserve. (CLAUDE.md § "The sanctioned-effect marker".)',
        },
      },
      create(context) {
        const sourceCode = context.sourceCode || context.getSourceCode();
        const MARKER = /@sanctioned-effect/;
        const WELL_FORMED = /@sanctioned-effect\([a-z][a-z0-9-]*\)\s*:\s*\S/;
        // How many lines above the `effect(` call the marker may sit. A
        // multi-line rationale is normal, so this is a small window rather
        // than "the previous line" exactly.
        const MARKER_WINDOW = 6;

        /** Collects `.set(…)` / `.update(…)` calls in the callback's own scope. */
        function writesIn(fnNode) {
          const writes = [];
          const stack = [fnNode.body];
          while (stack.length) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;
            if (Array.isArray(node)) {
              for (const item of node) stack.push(item);
              continue;
            }
            if (!node.type) continue;
            if (
              node !== fnNode &&
              (node.type === 'FunctionExpression' ||
                node.type === 'ArrowFunctionExpression' ||
                node.type === 'FunctionDeclaration')
            ) {
              continue;
            }
            if (
              node.type === 'CallExpression' &&
              node.callee.type === 'MemberExpression' &&
              !node.callee.computed &&
              node.callee.property.type === 'Identifier' &&
              (node.callee.property.name === 'set' || node.callee.property.name === 'update')
            ) {
              writes.push({
                node,
                signal: sourceCode.getText(node.callee.object),
                method: node.callee.property.name,
              });
            }
            for (const key in node) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              stack.push(node[key]);
            }
          }
          return writes;
        }

        /**
         * The `@sanctioned-effect` comment covering `node`, or `null`. Matched
         * by proximity (any comment ending within `MARKER_WINDOW` lines above
         * the call) rather than by AST attachment, so it works whether the
         * `effect(` call is a bare statement, an assignment, or nested in a
         * constructor body.
         */
        function markerFor(node) {
          const line = node.loc.start.line;
          for (const comment of sourceCode.getAllComments()) {
            if (!MARKER.test(comment.value)) continue;
            const end = comment.loc.end.line;
            if (end <= line && line - end <= MARKER_WINDOW) {
              return comment;
            }
          }
          return null;
        }

        return {
          CallExpression(node) {
            if (node.callee.type !== 'Identifier' || node.callee.name !== 'effect') return;
            const callback = node.arguments[0];
            if (
              !callback ||
              (callback.type !== 'ArrowFunctionExpression' &&
                callback.type !== 'FunctionExpression')
            ) {
              return;
            }
            const writes = writesIn(callback);
            if (writes.length === 0) return;

            const marker = markerFor(node);
            if (marker && WELL_FORMED.test(marker.value)) return;
            if (marker) {
              context.report({ node: marker, messageId: 'malformedMarker' });
              return;
            }
            for (const write of writes) {
              context.report({
                node: write.node,
                messageId: 'missingMarker',
                data: { signal: write.signal, method: write.method },
              });
            }
          },
        };
      },
    },

    // Mechanizes the #695 footgun: any control wiring `injectHiddenInput` is a
    // form-value control that can sit inside a disabled `[forFieldset]`, so the
    // hidden `<input>` it spawns must reflect `effectiveDisabled` — the signal
    // that folds in the fieldset's disabled state — never the raw `disabled`
    // input. #695 fixed `[forNumberInput]` / `[forSlider]` passing the raw
    // `disabled`, which left the hidden `<input>` submitting its value inside a
    // disabled fieldset; #728 added a DOM contract spec, but only for the
    // primitives it enumerates. This rule catches the regression at author time
    // for every primitive, current and future.
    //
    // Semantics — unconditional on the call (no "class declares
    // `effectiveDisabled`" precondition):
    //   - Fires on every `injectHiddenInput({ … disabled: <expr> … })` call
    //     whose `disabled` value does NOT reference an `effectiveDisabled`
    //     member anywhere in its expression. This also covers controls that
    //     *inherit* `effectiveDisabled` from `FormUiControlBase` (checkbox,
    //     switch, toggle, toggle-group, radio-group, …) and never declare it
    //     in their own body — the previous "class declares it" gate left those
    //     unchecked.
    //   - The `disabled` value is considered correct when it references an
    //     `effectiveDisabled` member anywhere in its expression
    //     (`this.effectiveDisabled`, the shorthand `effectiveDisabled`,
    //     `computed(() => this.effectiveDisabled() || this.readonly())`, …).
    //
    // The `injectHiddenInput` test harness in `hidden-input.spec.ts` exercises
    // the helper itself with a bare `disabled` and is exempt via the spec /
    // test-utility relaxation block below.
    //
    // Fixture: `projects/forty-cdk/eslint-rules-fixtures/hidden-input-effective-disabled.fixture.ts`.
    //
    // Refs: tutkli/forty-cdk#695, tutkli/forty-cdk#728, tutkli/forty-cdk#741
    'hidden-input-effective-disabled': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Every `injectHiddenInput` call must pass `effectiveDisabled` (not the raw `disabled`) as its `disabled`, otherwise the control’s value submits inside a disabled `[forFieldset]` (tutkli/forty-cdk#695).',
        },
        schema: [],
        messages: {
          rawDisabled:
            '`injectHiddenInput({ … disabled: … })` must pass `effectiveDisabled` (not the raw `disabled`), otherwise the control’s value submits inside a disabled `[forFieldset]`. Pass `disabled: this.effectiveDisabled`. (tutkli/forty-cdk#695.)',
        },
      },
      create(context) {
        // True when the subtree references an `effectiveDisabled` member —
        // either the shorthand `effectiveDisabled` identifier or a non-computed
        // `…​.effectiveDisabled` member access. Covers `this.effectiveDisabled`,
        // `effectiveDisabled`, and wrapped forms like
        // `computed(() => this.effectiveDisabled())`.
        function referencesEffectiveDisabled(node) {
          const stack = [node];
          while (stack.length) {
            const current = stack.pop();
            if (!current || typeof current !== 'object') continue;
            if (Array.isArray(current)) {
              for (const item of current) stack.push(item);
              continue;
            }
            if (!current.type) continue;
            if (
              current.type === 'MemberExpression' &&
              !current.computed &&
              current.property.type === 'Identifier' &&
              current.property.name === 'effectiveDisabled'
            ) {
              return true;
            }
            if (current.type === 'Identifier' && current.name === 'effectiveDisabled') {
              return true;
            }
            for (const key in current) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              stack.push(current[key]);
            }
          }
          return false;
        }
        return {
          CallExpression(node) {
            if (node.callee.type !== 'Identifier' || node.callee.name !== 'injectHiddenInput') {
              return;
            }
            const config = node.arguments[0];
            if (!config || config.type !== 'ObjectExpression') return;
            const disabledProp = config.properties.find(
              (p) =>
                p.type === 'Property' &&
                !p.computed &&
                ((p.key.type === 'Identifier' && p.key.name === 'disabled') ||
                  (p.key.type === 'Literal' && p.key.value === 'disabled')),
            );
            if (!disabledProp) return;
            if (referencesEffectiveDisabled(disabledProp.value)) return;
            context.report({ node: disabledProp, messageId: 'rawDisabled' });
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
      '**/*.generated.ts',
      // Local tooling scratch (workflow scripts, agent helpers) — gitignored,
      // never shipped, and not authored against the library's lint rules.
      '.claude/**',
      'plans/**',
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
        // ---- `type="button"` is a host *binding*, never a static host attribute ----
        // A static host attribute is stamped onto whatever element the consumer
        // picked (`type` is invalid on `<div>` / `<span>`) *and* loses to a
        // consumer's own static `type="submit"`, which is how 46 pieces came to
        // document submit protection they did not have (tutkli/forty-cdk#1512).
        // The seam is `hostButtonType()` from `forty-cdk/core`, host-bound as
        // `'[attr.type]': 'buttonType()'`: `'button'` on a native `<button>`
        // host, `null` on anything else, and it wins over the consumer's value.
        {
          selector:
            'Property:matches([key.name="host"], [key.value="host"]) > ObjectExpression > Property:matches([key.name="type"], [key.value="type"])[value.value="button"]',
          message:
            'A static `type: "button"` host attribute is banned: it is invalid on a non-button host and a consumer `type="submit"` beats it. Use the `hostButtonType()` core seam host-bound as `\'[attr.type]\': \'buttonType()\'` (CLAUDE.md § "Forcing `type=\\"button\\"`").',
        },
      ],

      // ---- Filename convention ----
      'forty-cdk/no-suffixed-filenames': 'error',

      // ---- Defaults stub convention (CLAUDE.md § "Defaults providers") ----
      'forty-cdk/require-defaults-sibling': 'error',
      // ---- Reverse: no `<name>-defaults.ts` whose token nothing injects (#1262) ----
      'forty-cdk/no-unused-defaults-sibling': 'error',

      // ---- Host-directive tuples for form primitives (tutkli/forty-cdk#645, #663) ----
      'forty-cdk/require-host-directive-sibling': 'error',

      // ---- Context-injection helpers are internal (tutkli/forty-cdk#584, D8) ----
      // Primitive barrels expose only the token + context interface; the
      // `injectXContext` helper must never be re-exported from `index.ts`.
      'forty-cdk/no-barrel-inject-context-export': 'error',

      // ---- No state propagation inside effect() (CLAUDE.md § "Never
      // propagate state inside `effect()`"). ----
      'forty-cdk/no-effect-state-propagation': 'error',
      // ---- …and every signal write that *is* sanctioned carries the canonical
      // marker naming the invariant that makes it safe (tutkli/forty-cdk#1401
      // item 3; CLAUDE.md § "The sanctioned-effect marker"). ----
      'forty-cdk/require-sanctioned-effect-marker': 'error',

      // ---- injectHiddenInput must pass `effectiveDisabled`, not raw
      // `disabled`, when the control folds in fieldset-disabled
      // (tutkli/forty-cdk#695, #728, #741). ----
      'forty-cdk/hidden-input-effective-disabled': 'error',

      // ---- Test isolation invariants (see @forty-cdk-test-isolation-rules
      // block above; CLAUDE.md § "Test isolation — non-negotiables"). ----
      'forty-cdk/no-bare-whenstable': 'error',
      'forty-cdk/no-prototype-rect-stub': 'error',
      'forty-cdk/observer-polyfill-must-restore': 'error',
      'forty-cdk/scoped-fake-timers': 'warn',
      'forty-cdk/no-directive-internal-signal-read': 'error',
      'forty-cdk/no-floating-flush': 'error',
      'forty-cdk/require-overlay-cleanup': 'error',
      'forty-cdk/no-redundant-not-tobenull': 'error',

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
      // Output names must not collide with native DOM event names: a collision
      // (`close` / `select` / `resize` / `drag`, …) trips this rule on any
      // consumer re-exposing the output via `hostDirectives` (even aliased),
      // defeating the sanctioned wrapping story (#814). Enabled so the
      // library's own outputs stay off the native-event set.
      '@angular-eslint/no-output-native': 'error',
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
      // The `injectHiddenInput` test harness (hidden-input.spec.ts) drives the
      // helper directly with a bare `disabled` — it is not a shipped form-value
      // control, so the `effectiveDisabled` fieldset contract does not apply.
      'forty-cdk/hidden-input-effective-disabled': 'off',
      // The sanctioned-effect ledger governs shipped library source. A spec or
      // test utility that drives an `effect()` writing a signal is exercising
      // the reactive graph, not shipping a carve-out consumers inherit.
      'forty-cdk/require-sanctioned-effect-marker': 'off',
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
      // Dev/CI-only app: nothing here ships, so it owes no carve-out ledger.
      'forty-cdk/require-sanctioned-effect-marker': 'off',
    },
  },

  {
    files: ['projects/forty-cdk-playground/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',
      '@angular-eslint/template/elements-content': 'off',
      'forty-cdk/require-sanctioned-effect-marker': 'off',
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
      // Off by default here: the `no-effect-state-propagation` fixture writes
      // signals inside `effect()` on purpose, and the "exactly one rule per
      // fixture" invariant this directory documents would break if a second
      // rule fired on it. Re-enabled below for this rule's own fixture.
      'forty-cdk/require-sanctioned-effect-marker': 'off',
    },
  },

  {
    files: ['projects/forty-cdk/eslint-rules-fixtures/require-sanctioned-effect-marker.fixture.ts'],
    rules: {
      'forty-cdk/require-sanctioned-effect-marker': 'error',
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
