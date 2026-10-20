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
 *   - No `ControlValueAccessor` / `NG_VALUE_ACCESSOR` (form primitives use Signal Forms).
 *   - No value import of an optional peer from library source, outside the
 *     entry point that owns it.
 *   - No `zone.js` / `NgZone` (the library must run zoneless).
 *     The four `@angular/core` names above are banned at the import, so an
 *     alias, a namespace import or a re-export cannot route around them.
 *   - No class names ending in `Service`, `Component`, or `Directive`.
 *   - No filenames carrying a type suffix (`.component.`, `.service.`,
 *     `.directive.`, `.pipe.`, `.module.`, `.guard.`, `.interceptor.`,
 *     `.resolver.`).
 *   - All public selectors must use the `for-` prefix.
 */

const fs = require('node:fs');
const path = require('node:path');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * The entry points that ship forty-cdk's internal tier rather than a primitive:
 * `forty-cdk/core` and the overlay slice
 * [#1723](https://github.com/tutkli/forty-cdk/issues/1723) cut it into. Neither
 * is consumer-facing, so the rules below that key on "is this a primitive"
 * exempt both.
 */
const INTERNAL_TIER_ENTRY_POINTS = new Set(['core', 'core-overlay']);

const NON_SHIPPING_LIBRARY_SOURCES = [
  '**/*.spec.ts',
  '**/test-utils/**/*.ts',
  'projects/forty-cdk/src/lib/ssr/fixtures/**/*.ts',
  'projects/forty-cdk/src/lib/static-adoption/fixtures/**/*.ts',
];

const OPTIONAL_PEER_ENTRY_POINTS = { '@internationalized/date': 'internationalized-date' };

const OPTIONAL_PEERS = Object.entries(
  require('./projects/forty-cdk/package.json').peerDependenciesMeta ?? {},
)
  .filter(([, meta]) => meta.optional)
  .map(([name]) => name);

/** @param {string | null} owned */
function optionalPeerValueImportBan(owned) {
  const patterns = OPTIONAL_PEERS.filter((peer) => peer !== owned).map((peer) => {
    const owner = OPTIONAL_PEER_ENTRY_POINTS[peer];
    return {
      group: [peer, `${peer}/*`],
      allowTypeImports: true,
      message:
        `\`${peer}\` is an optional peer, so a value import from it fails the build of every consumer who did not install it. ` +
        `Import its types with \`import type\`${owner ? `, and keep its values in \`forty-cdk/${owner}\`` : ''} ` +
        '(CLAUDE.md § "Optional peers must never be imported by value from an entry point that consumers who lack that peer will load").',
    };
  });
  return ['error', { patterns }];
}

/**
 * ARIA 1.2 global states and properties — supported by every role, so they
 * never need a per-role table entry.
 *
 * https://www.w3.org/TR/wai-aria-1.2/#global_states
 */
const GLOBAL_ARIA_PROPERTIES = new Set([
  'aria-atomic',
  'aria-busy',
  'aria-controls',
  'aria-current',
  'aria-describedby',
  'aria-details',
  'aria-disabled',
  'aria-dropeffect',
  'aria-errormessage',
  'aria-flowto',
  'aria-grabbed',
  'aria-haspopup',
  'aria-hidden',
  'aria-invalid',
  'aria-keyshortcuts',
  'aria-label',
  'aria-labelledby',
  'aria-live',
  'aria-owns',
  'aria-relevant',
  'aria-roledescription',
]);

/**
 * Role → non-global states and properties the role supports, including the
 * ones it inherits from its superclass roles, transcribed from
 * https://www.w3.org/TR/wai-aria-1.2/#role_definitions.
 *
 * Only the roles the library actually emits are listed. A role missing from
 * this table is skipped by `aria-attr-allowed-on-role` rather than reported,
 * so a primitive reaching for a new role can never fail the build before its
 * row is transcribed.
 */
const ROLE_SUPPORTED_ARIA_PROPERTIES = {
  alert: [],
  button: ['aria-expanded', 'aria-pressed'],
  checkbox: ['aria-checked', 'aria-expanded', 'aria-readonly', 'aria-required'],
  columnheader: [
    'aria-colindex',
    'aria-colspan',
    'aria-expanded',
    'aria-readonly',
    'aria-required',
    'aria-rowindex',
    'aria-rowspan',
    'aria-selected',
    'aria-sort',
  ],
  combobox: [
    'aria-activedescendant',
    'aria-autocomplete',
    'aria-expanded',
    'aria-readonly',
    'aria-required',
  ],
  dialog: ['aria-modal'],
  grid: [
    'aria-activedescendant',
    'aria-colcount',
    'aria-multiselectable',
    'aria-readonly',
    'aria-rowcount',
  ],
  gridcell: [
    'aria-colindex',
    'aria-colspan',
    'aria-expanded',
    'aria-readonly',
    'aria-required',
    'aria-rowindex',
    'aria-rowspan',
    'aria-selected',
  ],
  group: ['aria-activedescendant'],
  listbox: [
    'aria-activedescendant',
    'aria-expanded',
    'aria-multiselectable',
    'aria-orientation',
    'aria-readonly',
    'aria-required',
  ],
  menu: ['aria-activedescendant', 'aria-orientation'],
  menubar: ['aria-activedescendant', 'aria-orientation'],
  menuitem: ['aria-expanded', 'aria-posinset', 'aria-setsize'],
  menuitemcheckbox: [
    'aria-checked',
    'aria-expanded',
    'aria-posinset',
    'aria-readonly',
    'aria-required',
    'aria-setsize',
  ],
  menuitemradio: [
    'aria-checked',
    'aria-expanded',
    'aria-posinset',
    'aria-readonly',
    'aria-required',
    'aria-setsize',
  ],
  meter: ['aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext'],
  navigation: [],
  option: ['aria-checked', 'aria-posinset', 'aria-selected', 'aria-setsize'],
  progressbar: ['aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext'],
  radio: ['aria-checked', 'aria-posinset', 'aria-setsize'],
  radiogroup: ['aria-activedescendant', 'aria-orientation', 'aria-readonly', 'aria-required'],
  region: [],
  row: [
    'aria-activedescendant',
    'aria-colindex',
    'aria-expanded',
    'aria-level',
    'aria-posinset',
    'aria-rowindex',
    'aria-selected',
    'aria-setsize',
  ],
  rowgroup: [],
  searchbox: [
    'aria-activedescendant',
    'aria-autocomplete',
    'aria-multiline',
    'aria-placeholder',
    'aria-readonly',
    'aria-required',
  ],
  separator: [
    'aria-orientation',
    'aria-valuemax',
    'aria-valuemin',
    'aria-valuenow',
    'aria-valuetext',
  ],
  slider: [
    'aria-orientation',
    'aria-readonly',
    'aria-valuemax',
    'aria-valuemin',
    'aria-valuenow',
    'aria-valuetext',
  ],
  spinbutton: [
    'aria-activedescendant',
    'aria-readonly',
    'aria-required',
    'aria-valuemax',
    'aria-valuemin',
    'aria-valuenow',
    'aria-valuetext',
  ],
  status: [],
  switch: ['aria-checked', 'aria-expanded', 'aria-readonly', 'aria-required'],
  tab: ['aria-expanded', 'aria-posinset', 'aria-selected', 'aria-setsize'],
  tablist: ['aria-activedescendant', 'aria-multiselectable', 'aria-orientation'],
  tabpanel: [],
  textbox: [
    'aria-activedescendant',
    'aria-autocomplete',
    'aria-multiline',
    'aria-placeholder',
    'aria-readonly',
    'aria-required',
  ],
  toolbar: ['aria-activedescendant', 'aria-orientation'],
  tooltip: [],
  tree: ['aria-activedescendant', 'aria-multiselectable', 'aria-orientation', 'aria-required'],
  treeitem: [
    'aria-checked',
    'aria-expanded',
    'aria-level',
    'aria-posinset',
    'aria-selected',
    'aria-setsize',
  ],
};

/**
 * The `ClassBody` lexically enclosing `node`, or `null`. Used to resolve a
 * `this.#helper()` call an `effect()` callback makes against the class the
 * effect is declared in — arrow callbacks keep the class's `this`.
 *
 * @param {import('estree').Node & { parent?: unknown }} node
 */
function enclosingClassBody(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'ClassBody') return current;
  }
  return null;
}

/**
 * The body of a function bound to `identifier` in an enclosing scope, or `null`
 * when the name is not a same-file function (an import, an ambient `declare`,
 * a plain value). Covers both `function helper() {}` and
 * `const helper = () => {}`.
 *
 * @param {import('estree').Identifier} identifier
 * @param {import('eslint').SourceCode} sourceCode
 */
function localFunctionBody(identifier, sourceCode) {
  for (let scope = sourceCode.getScope(identifier); scope; scope = scope.upper) {
    const variable = scope.set.get(identifier.name);
    if (!variable) continue;
    for (const def of variable.defs) {
      const declaration = def.node;
      if (declaration.type === 'FunctionDeclaration' && declaration.body) {
        return declaration.body;
      }
      if (
        declaration.type === 'VariableDeclarator' &&
        declaration.init &&
        (declaration.init.type === 'ArrowFunctionExpression' ||
          declaration.init.type === 'FunctionExpression') &&
        declaration.init.body
      ) {
        return declaration.init.body;
      }
    }
    return null;
  }
  return null;
}

/**
 * Resolves a call an `effect()` callback makes to a helper declared in the
 * **same file**, returning `{ name, body }` — or `null` when the callee is not
 * a resolvable same-file helper.
 *
 * Two shapes resolve: a method or arrow-valued field reached through `this`
 * (`this.#sync()`, `this.sync()`), and a function bound in an enclosing scope
 * (`sync()`). Anything else — a method on an injected collaborator, an imported
 * function — stays opaque by design: see the "one level, same file" note on
 * `no-effect-state-propagation` for why that boundary is where a lint rule
 * stops and a type-aware whole-program pass would begin.
 *
 * @param {import('estree').CallExpression & { parent?: unknown }} callNode
 * @param {import('eslint').SourceCode} sourceCode
 */
function resolveSameFileHelper(callNode, sourceCode) {
  const callee = callNode.callee;
  if (callee.type === 'Identifier') {
    const body = localFunctionBody(callee, sourceCode);
    return body ? { name: `${callee.name}()`, body } : null;
  }
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.object.type !== 'ThisExpression' ||
    (callee.property.type !== 'Identifier' && callee.property.type !== 'PrivateIdentifier')
  ) {
    return null;
  }
  const classBody = enclosingClassBody(callNode);
  if (!classBody) return null;
  const name = `${sourceCode.getText(callee)}()`;
  for (const member of classBody.body) {
    if (member.computed || member.static || !member.key) continue;
    if (member.key.type !== callee.property.type || member.key.name !== callee.property.name) {
      continue;
    }
    if (member.type === 'MethodDefinition' && member.value && member.value.body) {
      return { name, body: member.value.body };
    }
    if (
      member.type === 'PropertyDefinition' &&
      member.value &&
      (member.value.type === 'ArrowFunctionExpression' ||
        member.value.type === 'FunctionExpression') &&
      member.value.body
    ) {
      return { name, body: member.value.body };
    }
  }
  return null;
}

const SYNCHRONOUS_CALLBACK_METHODS = new Set([
  'every',
  'filter',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
  'flatMap',
  'forEach',
  'map',
  'reduce',
  'reduceRight',
  'some',
]);

const SANCTIONED_MARKER_WINDOW = 6;

/** @param {import('estree').Node} node */
function isInlineFunction(node) {
  return node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression';
}

/**
 * The inline functions `callNode` runs before it returns, and therefore inside
 * the reactive run of an effect that makes the call: the callbacks passed to
 * `untracked(…)` or to an array iteration method, and the function an IIFE
 * invokes. Any other nested function (an observer, a timer, a listener) runs
 * outside that run, which is why the `effect()` rule family skips it.
 *
 * @param {import('estree').CallExpression} callNode
 */
function synchronousCallbacks(callNode) {
  const callee = callNode.callee;
  if (isInlineFunction(callee)) return [callee];
  const runsItsArguments =
    (callee.type === 'Identifier' && callee.name === 'untracked') ||
    (callee.type === 'MemberExpression' &&
      !callee.computed &&
      callee.property.type === 'Identifier' &&
      SYNCHRONOUS_CALLBACK_METHODS.has(callee.property.name));
  return runsItsArguments ? callNode.arguments.filter(isInlineFunction) : [];
}

/**
 * The callbacks an `effect(…)` or `afterRenderEffect(…)` call runs as a
 * reactive context: its function argument, or every phase function of
 * `afterRenderEffect`'s phase object. Empty for any other call.
 *
 * @param {import('estree').CallExpression} callNode
 */
function reactiveCallbacks(callNode) {
  const callee = callNode.callee;
  if (
    callee.type !== 'Identifier' ||
    (callee.name !== 'effect' && callee.name !== 'afterRenderEffect')
  ) {
    return [];
  }
  const spec = callNode.arguments[0];
  if (!spec) return [];
  if (isInlineFunction(spec)) return [spec];
  if (callee.name === 'afterRenderEffect' && spec.type === 'ObjectExpression') {
    return spec.properties
      .filter((property) => property.type === 'Property' && isInlineFunction(property.value))
      .map((property) => property.value);
  }
  return [];
}

/**
 * The `@sanctioned-effect` / `@sanctioned-pull` line comment licensing the
 * effect `callNode` creates, or `null`. Only the comments directly above the
 * statement holding the call are candidates, so a marker cannot reach past the
 * effect it sits on to license the next one, however short that one is; the
 * line window keeps "directly above" literal across blank lines. Only a line
 * comment whose text starts with the phrase counts: a block comment quoting the
 * marker, or prose mentioning it mid-sentence, documents the ledger rather than
 * joining it.
 *
 * @param {import('estree').CallExpression & { parent?: unknown }} callNode
 * @param {import('eslint').SourceCode} sourceCode
 * @param {RegExp} pattern
 */
function sanctionedMarkerFor(callNode, sourceCode, pattern) {
  let anchor = callNode;
  for (let current = callNode.parent; current; current = current.parent) {
    if (isInlineFunction(current) || current.type === 'FunctionDeclaration') break;
    if (
      current.type === 'ExpressionStatement' ||
      current.type === 'VariableDeclaration' ||
      current.type === 'PropertyDefinition' ||
      current.type === 'ReturnStatement'
    ) {
      anchor = current.parent?.type === 'ExportNamedDeclaration' ? current.parent : current;
      break;
    }
  }
  const line = anchor.loc.start.line;
  for (const comment of sourceCode.getCommentsBefore(anchor)) {
    if (comment.type !== 'Line' || !pattern.test(comment.value)) continue;
    const end = comment.loc.end.line;
    if (end <= line && line - end <= SANCTIONED_MARKER_WINDOW) {
      return comment;
    }
  }
  return null;
}

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
            'Forbid a type suffix (`.component.`, `.service.`, `.pipe.`, …) in filenames per CLAUDE.md.',
        },
        schema: [],
        messages: {
          forbidden:
            'Filenames must not carry a type suffix (`.component.`, `.service.`, `.directive.`, `.pipe.`, `.module.`, `.guard.`, `.interceptor.`, `.resolver.`). Name files for what they represent (CLAUDE.md).',
        },
      },
      create(context) {
        return {
          Program(node) {
            const filename = context.filename;
            const base = filename.split(/[\\/]/).pop() || '';
            if (
              /\.(component|service|directive|pipe|module|guard|interceptor|resolver)\./.test(base)
            ) {
              context.report({ node, messageId: 'forbidden' });
            }
          },
        };
      },
    },

    // ====================================================================
    // @forty-cdk-test-isolation-rules
    //
    // The ten rules below codify the test-isolation invariants documented
    // in `.claude/rules/testing.md` § "Test isolation — non-negotiables"
    // (the fourteen numbered items immediately under that heading). Without
    // mechanical enforcement those invariants decay back into PR-review
    // knowledge — the audit that surfaced them (May 11, 2026) already had
    // to remove regressions from each category.
    //
    // Cross-link (every rule below cites this section in its messages):
    //   .claude/rules/testing.md#test-isolation--non-negotiables
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
    // See: .claude/rules/testing.md § "Test isolation — non-negotiables" rule 7
    // Cross-link: .claude/rules/testing.md#test-isolation--non-negotiables
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
            'Do not call `whenStable()` directly in specs. Use `await flush(fixture)` from `projects/forty-cdk/src/test-utils/flush.ts` — it owns the drain shape and may evolve without churning every spec. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 7.)',
        },
      },
      create(context) {
        const filename = context.filename.replace(/\\/g, '/');
        // The canonical waiters are the only places where `whenStable()` may be
        // invoked directly: `flush.ts` owns the `ComponentFixture` drain, and
        // `hydration.ts` owns the `ApplicationRef` one (a real SSR → hydration
        // round trip bootstraps an application, so there is no fixture to flush
        // — see tutkli/forty-cdk#1582).
        if (
          filename.endsWith('/projects/forty-cdk/src/test-utils/flush.ts') ||
          filename.endsWith('/projects/forty-cdk/src/test-utils/hydration.ts')
        ) {
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
    // Forbids prototype-level layout patches, in every spelling:
    //   - `Element.prototype.getBoundingClientRect = …`
    //   - `HTMLElement.prototype.offsetWidth = …` (and `offsetHeight`,
    //     `clientWidth`, `clientHeight`, `scrollWidth`, `scrollHeight`)
    //   - `Object.defineProperty(Element.prototype, 'getBoundingClientRect', …)`,
    //     `Reflect.defineProperty(…)` and `Object.defineProperties(X.prototype,
    //     { offsetHeight: … })` for any of the layout properties above
    //   - Vitest's `vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get')`
    //
    // jsdom returns zero for every layout API, and patching a single
    // prototype is cross-platform fragile (Linux jsdom defines the
    // descriptor on `HTMLElement.prototype`, macOS/Windows on
    // `Element.prototype` — see #193). Geometry assertions belong in
    // Playwright; the Vitest layer asserts wiring only.
    //
    // See: .claude/rules/testing.md § "Test isolation — non-negotiables" rule 8
    // Cross-link: .claude/rules/testing.md#test-isolation--non-negotiables
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
            'Do not stub `*.prototype.{{ prop }}` — jsdom returns zero for layout APIs and prototype patches are cross-platform fragile (Linux defines the descriptor on `HTMLElement.prototype`, macOS/Windows on `Element.prototype` — see #193). Move geometry assertions to Playwright. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 8.)',
          forbiddenCall:
            'Do not patch `*.prototype.{{ prop }}` through `{{ call }}(…)` — jsdom returns zero for layout APIs and prototype patches are cross-platform fragile (see #193). Move geometry assertions to Playwright, or stub the one element whose wiring the test exercises and assert only call counts. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 8.)',
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
        const KEYED_CALLS = new Set([
          'Object.defineProperty',
          'Reflect.defineProperty',
          'vi.spyOn',
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
          return isPrototype(node.object) ? propName : null;
        }
        function isPrototype(node) {
          return (
            node?.type === 'MemberExpression' &&
            !node.computed &&
            node.property.type === 'Identifier' &&
            node.property.name === 'prototype'
          );
        }
        function calleeName(callee) {
          if (
            callee.type !== 'MemberExpression' ||
            callee.computed ||
            callee.object.type !== 'Identifier' ||
            callee.property.type !== 'Identifier'
          ) {
            return null;
          }
          return `${callee.object.name}.${callee.property.name}`;
        }
        function stringKey(node) {
          if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
          if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
            return node.quasis[0].value.cooked;
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
            const call = calleeName(node.callee);
            const [target, key] = node.arguments;
            if (!call || !isPrototype(target)) return;
            if (KEYED_CALLS.has(call)) {
              const prop = stringKey(key);
              if (prop && LAYOUT_PROPS.has(prop)) {
                context.report({ node, messageId: 'forbiddenCall', data: { prop, call } });
              }
              return;
            }
            if (call !== 'Object.defineProperties' || key?.type !== 'ObjectExpression') return;
            for (const property of key.properties) {
              if (property.type !== 'Property') continue;
              const prop =
                !property.computed && property.key.type === 'Identifier'
                  ? property.key.name
                  : stringKey(property.key);
              if (prop && LAYOUT_PROPS.has(prop)) {
                context.report({
                  node: property,
                  messageId: 'forbiddenCall',
                  data: { prop, call },
                });
              }
            }
          },
        };
      },
    },

    // Rule 3 — `forty-cdk/observer-polyfill-must-restore`.
    //
    // If a spec installs `globalThis.ResizeObserver` (or
    // `IntersectionObserver`, `MutationObserver`, `fetch`, `matchMedia`) — by
    // assignment or by `Object.defineProperty` / `Reflect.defineProperty` —
    // it must also restore the global, and the restore must run after it:
    //   - in an `afterEach` / `afterAll` of the install's own `describe`, an
    //     enclosing one, or the file, or
    //   - in the `finally` of a `try` around the install.
    // A restore is a `delete`, a `defineProperty`, or an assignment. jsdom
    // ships no `ResizeObserver`, `IntersectionObserver` or `matchMedia`, so
    // for those an assignment counts only when an existence check guards it
    // and its other branch `delete`s the global: an unconditional write-back
    // of the `undefined` capture leaves the key in `globalThis` for the next
    // spec file in the worker, and is reported on its own.
    //
    // Prefer `vi.stubGlobal`, which the setup file unstubs after every test,
    // or the `installObserverPolyfills()` helper in `forty-cdk/testing`,
    // which already pairs install with restore and is a no-op for cases
    // where jsdom already ships the global.
    //
    // See: .claude/rules/testing.md § "Test isolation — non-negotiables" rule 2
    // Cross-link: .claude/rules/testing.md#test-isolation--non-negotiables
    'observer-polyfill-must-restore': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'A spec that installs a global polyfill (`globalThis.X = …`) must restore it in an `afterEach` / `afterAll` of its scope, or in a `finally`.',
        },
        schema: [],
        messages: {
          unrestored:
            'Spec installs `globalThis.{{ name }}` but nothing restores it after it runs. Prefer `vi.stubGlobal(\'{{ name }}\', …)`, which the setup file unstubs after every test; otherwise `delete` the global in an `afterEach` / `afterAll` of the same `describe` when it was absent (restore the captured original only when it existed), or use `installObserverPolyfills()` from `forty-cdk/testing`. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 2.)',
          unguardedRestore:
            'jsdom ships no `{{ name }}`, so writing a captured original back assigns `undefined` and leaves the key in `globalThis` for the next spec file in the worker. Use `vi.stubGlobal(\'{{ name }}\', …)`, or guard the write-back with an existence check whose other branch `delete`s the global. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 2.)',
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
        const ABSENT_UNDER_JSDOM = new Set([
          'ResizeObserver',
          'IntersectionObserver',
          'matchMedia',
        ]);
        const AFTER_HOOKS = new Set(['afterEach', 'afterAll']);
        const SCOPED_CALLS = new Set([
          'describe',
          'it',
          'test',
          'beforeEach',
          'beforeAll',
          'afterEach',
          'afterAll',
        ]);
        // The helper file owns its own install/restore contract and is exempt.
        const filename = context.filename.replace(/\\/g, '/');
        if (filename.endsWith('/projects/forty-cdk/testing/src/observers.ts')) {
          return {};
        }
        // Unwrap (globalThis as ...).X / (globalThis as unknown as { ... }).X /
        // (<paren-cast>).X — TypeScript `as` casts surface as `TSAsExpression`
        // in the AST.
        function unwrapCasts(node) {
          while (
            node &&
            (node.type === 'TSAsExpression' ||
              node.type === 'TSTypeAssertion' ||
              node.type === 'TSNonNullExpression')
          ) {
            node = node.expression;
          }
          return node;
        }
        function isGlobalObject(node) {
          const obj = unwrapCasts(node);
          return (
            obj?.type === 'Identifier' &&
            (obj.name === 'globalThis' || obj.name === 'window' || obj.name === 'global')
          );
        }
        function stringKey(node) {
          if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
          if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
            return node.quasis[0].value.cooked;
          }
          return null;
        }
        function globalMemberName(node) {
          const member = unwrapCasts(node);
          if (!member || member.type !== 'MemberExpression' || !isGlobalObject(member.object)) {
            return null;
          }
          const name =
            !member.computed && member.property.type === 'Identifier'
              ? member.property.name
              : stringKey(member.property);
          return name && POLYFILL_TARGETS.has(name) ? name : null;
        }
        function definedGlobalName(call) {
          const callee = call.callee;
          if (
            callee.type !== 'MemberExpression' ||
            callee.computed ||
            callee.object.type !== 'Identifier' ||
            !['Object', 'Reflect'].includes(callee.object.name) ||
            callee.property.type !== 'Identifier' ||
            callee.property.name !== 'defineProperty'
          ) {
            return null;
          }
          const [target, key] = call.arguments;
          const name = isGlobalObject(target) ? stringKey(key) : null;
          return name && POLYFILL_TARGETS.has(name) ? name : null;
        }
        function rootName(callee) {
          let node = callee;
          while (node.type === 'MemberExpression' || node.type === 'CallExpression') {
            node = node.type === 'MemberExpression' ? node.object : node.callee;
          }
          return node.type === 'Identifier' ? node.name : null;
        }
        function callbackCall(fn) {
          const call = fn.parent;
          if (
            (fn.type !== 'FunctionExpression' && fn.type !== 'ArrowFunctionExpression') ||
            call?.type !== 'CallExpression' ||
            !call.arguments.includes(fn)
          ) {
            return null;
          }
          return rootName(call.callee);
        }
        function contains(outer, inner) {
          return outer.range[0] <= inner.range[0] && inner.range[1] <= outer.range[1];
        }
        function deletesGlobal(root, name) {
          const stack = [root];
          while (stack.length) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;
            if (Array.isArray(node)) {
              for (const item of node) stack.push(item);
              continue;
            }
            if (
              node.type === 'UnaryExpression' &&
              node.operator === 'delete' &&
              globalMemberName(node.argument) === name
            ) {
              return true;
            }
            for (const key in node) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              stack.push(node[key]);
            }
          }
          return false;
        }
        function isGuardedWriteBack(node, name, ancestors) {
          let child = node;
          for (let i = ancestors.length - 1; i >= 0; i--) {
            const ancestor = ancestors[i];
            if (ancestor.type === 'IfStatement' && ancestor.test !== child) {
              const other =
                ancestor.consequent === child ? ancestor.alternate : ancestor.consequent;
              if (other && deletesGlobal(other, name)) return true;
            }
            if (callbackCall(ancestor)) return false;
            child = ancestor;
          }
          return false;
        }
        function locate(node) {
          const ancestors = context.sourceCode.getAncestors(node);
          const scopes = [];
          let restore = null;
          let inFunction = false;
          let inScopedCall = false;
          let child = node;
          for (let i = ancestors.length - 1; i >= 0; i--) {
            const ancestor = ancestors[i];
            if (!restore && ancestor.type === 'TryStatement' && ancestor.finalizer === child) {
              restore = { kind: 'finally', block: ancestor.block };
            }
            if (
              ancestor.type === 'FunctionExpression' ||
              ancestor.type === 'ArrowFunctionExpression' ||
              ancestor.type === 'FunctionDeclaration'
            ) {
              inFunction = true;
              const called = callbackCall(ancestor);
              if (SCOPED_CALLS.has(called)) inScopedCall = true;
              if (!restore && AFTER_HOOKS.has(called)) {
                restore = { kind: 'after', hook: ancestor.parent };
              }
              if (called === 'describe') scopes.push(ancestor);
            }
            if (ancestor.type === 'Program') scopes.push(ancestor);
            child = ancestor;
          }
          return { ancestors, scopes, restore, inHelper: inFunction && !inScopedCall };
        }
        function hookScope(hook) {
          const ancestors = context.sourceCode.getAncestors(hook);
          for (let i = ancestors.length - 1; i >= 0; i--) {
            const ancestor = ancestors[i];
            if (ancestor.type === 'Program' || callbackCall(ancestor) === 'describe')
              return ancestor;
          }
          return null;
        }
        const installs = [];
        const restores = [];
        function record(name, node, isDelete) {
          const where = locate(node);
          if (!where.restore) {
            if (!isDelete) installs.push({ name, node, ...where });
            return;
          }
          const unguarded =
            !isDelete &&
            node.type === 'AssignmentExpression' &&
            ABSENT_UNDER_JSDOM.has(name) &&
            !isGuardedWriteBack(node, name, where.ancestors);
          restores.push({
            name,
            node,
            unguarded,
            kind: where.restore.kind,
            scope: where.restore.kind === 'after' ? hookScope(where.restore.hook) : null,
            block: where.restore.block ?? null,
          });
        }
        function applies(restore, install) {
          if (restore.name !== install.name) return false;
          if (restore.kind === 'finally') return contains(restore.block, install.node);
          return install.inHelper || install.scopes.includes(restore.scope);
        }
        return {
          AssignmentExpression(node) {
            const name = globalMemberName(node.left);
            if (name) record(name, node, false);
          },
          UnaryExpression(node) {
            if (node.operator !== 'delete') return;
            const name = globalMemberName(node.argument);
            if (name) record(name, node, true);
          },
          CallExpression(node) {
            const name = definedGlobalName(node);
            if (name) record(name, node, false);
          },
          'Program:exit'() {
            for (const restore of restores) {
              if (restore.unguarded) {
                context.report({
                  node: restore.node,
                  messageId: 'unguardedRestore',
                  data: { name: restore.name },
                });
              }
            }
            for (const install of installs) {
              const applying = restores.filter((restore) => applies(restore, install));
              if (applying.length === 0) {
                context.report({
                  node: install.node,
                  messageId: 'unrestored',
                  data: { name: install.name },
                });
              }
            }
          },
        };
      },
    },

    // Rule 4 — `forty-cdk/scoped-fake-timers`.
    //
    // The audit's literal phrasing is "warn when `vi.useFakeTimers()`
    // appears in a top-level `beforeEach` outside a `describe('… timers …')`
    // / `describe('… delay …')` block." That predicate would flag two
    // currently-merged spec files (`avatar.spec.ts`, `typeahead.spec.ts`)
    // whose outer describe names are `'ForAvatar'` / `'Typeahead'` — those
    // files already pair install with restore, which is the real isolation
    // invariant. We scope the rule down to the underlying contract: every
    // `vi.useFakeTimers(…)`, whatever its arguments, is undone by a
    // `vi.useRealTimers()` that still runs when a test throws.
    //
    //   - An install in a `beforeEach` / `beforeAll` needs an `afterEach` /
    //     `afterAll` calling `vi.useRealTimers()` in the same scope: its
    //     `describe`, or the file for a file-level hook.
    //   - An install inside an `it` / `test` needs that restore in an
    //     enclosing `describe` or at file level, or a `try` around the
    //     install whose `finally` restores. An inline restore on the test's
    //     last line is skipped when the test throws first.
    //
    // See: .claude/rules/testing.md § "Test isolation — non-negotiables" rule 1
    // Cross-link: .claude/rules/testing.md#test-isolation--non-negotiables
    'scoped-fake-timers': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Require every `vi.useFakeTimers(…)` to be undone by a `vi.useRealTimers()` in an `after*` hook of its scope, or in the `finally` of a `try` around it.',
        },
        schema: [],
        messages: {
          unpaired:
            '`vi.useFakeTimers()` in a `{{ hook }}` hook is not paired with a `vi.useRealTimers()` call in an `afterEach` / `afterAll` of the same `describe` (or of the file, for a file-level hook). Pair install with restore — an inline restore at the end of an `it` leaks if the test throws first. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 1.)',
          unpairedInTest:
            '`vi.useFakeTimers()` inside an `it` / `test` is not undone by a `vi.useRealTimers()` in an `afterEach` / `afterAll` of an enclosing `describe` or of the file, nor in the `finally` of a `try` around it. A restore on the last line of the test is skipped when the test throws first, and every later test in the worker inherits the fake clock. Restore in `afterEach`. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 1.)',
        },
      },
      create(context) {
        const HOOKS = new Set(['beforeEach', 'beforeAll', 'afterEach', 'afterAll']);
        const TESTS = new Set(['it', 'test']);
        const DESCRIBE = new Set(['describe']);
        function rootName(callee) {
          let node = callee;
          while (node.type === 'MemberExpression' || node.type === 'CallExpression') {
            node = node.type === 'MemberExpression' ? node.object : node.callee;
          }
          return node.type === 'Identifier' ? node.name : null;
        }
        function isFunction(node) {
          return (
            !!node &&
            (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression')
          );
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
        function containsViCall(root, method) {
          const stack = [root];
          while (stack.length) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;
            if (Array.isArray(node)) {
              for (const item of node) stack.push(item);
              continue;
            }
            if (node.type === 'CallExpression') {
              if (isViCall(node, method)) return true;
              const name = rootName(node.callee);
              if (DESCRIBE.has(name) || TESTS.has(name) || HOOKS.has(name)) continue;
            }
            for (const key in node) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              stack.push(node[key]);
            }
          }
          return false;
        }
        function directHooks(scope) {
          const stmts =
            scope.type === 'Program'
              ? scope.body
              : scope.body.type === 'BlockStatement'
                ? scope.body.body
                : [scope.body];
          const hooks = [];
          for (const stmt of stmts) {
            if (stmt.type !== 'ExpressionStatement' || stmt.expression.type !== 'CallExpression') {
              continue;
            }
            const callee = stmt.expression.callee;
            if (callee.type === 'Identifier' && HOOKS.has(callee.name)) {
              hooks.push({ name: callee.name, call: stmt.expression });
            }
          }
          return hooks;
        }
        function restoresTimers(scope) {
          return directHooks(scope).some(
            (h) =>
              (h.name === 'afterEach' || h.name === 'afterAll') &&
              h.call.arguments[0] &&
              containsViCall(h.call.arguments[0], 'useRealTimers'),
          );
        }
        function checkScope(scope) {
          const installs = directHooks(scope).filter(
            (h) =>
              (h.name === 'beforeEach' || h.name === 'beforeAll') &&
              h.call.arguments[0] &&
              containsViCall(h.call.arguments[0], 'useFakeTimers'),
          );
          if (installs.length === 0 || restoresTimers(scope)) return;
          for (const i of installs) {
            context.report({ node: i.call, messageId: 'unpaired', data: { hook: i.name } });
          }
        }
        function isCallbackOf(fn, names) {
          const call = fn.parent;
          return (
            isFunction(fn) &&
            call?.type === 'CallExpression' &&
            call.arguments.includes(fn) &&
            names.has(rootName(call.callee))
          );
        }
        function checkTestInstall(node) {
          const ancestors = context.sourceCode.getAncestors(node);
          let inTest = false;
          for (let i = ancestors.length - 1; i >= 0; i--) {
            const ancestor = ancestors[i];
            const child = ancestors[i + 1] ?? node;
            if (!inTest) {
              if (
                ancestor.type === 'TryStatement' &&
                ancestor.block === child &&
                ancestor.finalizer &&
                containsViCall(ancestor.finalizer, 'useRealTimers')
              ) {
                return;
              }
              if (isCallbackOf(ancestor, HOOKS)) return;
              if (isCallbackOf(ancestor, TESTS)) inTest = true;
              continue;
            }
            if (
              (ancestor.type === 'Program' || isCallbackOf(ancestor, DESCRIBE)) &&
              restoresTimers(ancestor)
            ) {
              return;
            }
          }
          if (inTest) context.report({ node, messageId: 'unpairedInTest' });
        }
        return {
          Program(node) {
            checkScope(node);
          },
          CallExpression(node) {
            if (isViCall(node, 'useFakeTimers')) {
              checkTestInstall(node);
              return;
            }
            if (rootName(node.callee) !== 'describe') return;
            const cb = node.arguments[1];
            if (isFunction(cb)) checkScope(cb);
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
    // See: .claude/rules/testing.md § "Test isolation — non-negotiables" rule 6
    // Cross-link: .claude/rules/testing.md#test-isolation--non-negotiables
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
            'Do not read directive internal signals from a spec — assert against the rendered DOM (ARIA, `data-state`, focus, host classes) instead. The chained pattern `.injector.get({{ token }}).{{ accessor }}()` locks the directive\'s private shape into the spec. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 6.)',
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
    // waiters — `flush(fixture)`, `flushPositioning(fixture)`,
    // `nextMacrotask()`, or `settleHydration(appRef)` (the `ApplicationRef`
    // drain a real SSR → hydration round trip needs, `test-utils/hydration.ts`)
    // — whether the free function imported from
    // `test-utils/flush.ts` or the `flush` method destructured from
    // `renderHost()`. All are `() => Promise<void>`: a bare `flush();`
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
    // See: .claude/rules/testing.md § "Test isolation — non-negotiables" rule 12
    // Cross-link: .claude/rules/testing.md#test-isolation--non-negotiables
    // Refs: tutkli/forty-cdk#1154
    'no-floating-flush': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid floating (un-awaited) `flush()` / `flushPositioning()` / `nextMacrotask()` / `settleHydration()` calls in specs — the returned Promise must be awaited.',
        },
        schema: [],
        messages: {
          floating:
            'Un-awaited `{{ name }}(…)`. It returns `Promise<void>`; a bare call runs only the initial synchronous `detectChanges()` and lets the async drain (`whenStable` → macrotask → second `detectChanges`, `afterNextRender`, positioning) escape the test — assertions may pass against stale DOM. Prefix it with `await` (and mark the enclosing callback `async`). (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 12.)',
        },
      },
      create(context) {
        const filename = context.filename.replace(/\\/g, '/');
        // In specs the flush family is unambiguously the async render waiter.
        // The rule's own fixture (a `.fixture.ts`, linted via
        // `pnpm check:rule-fixtures`) is included so the rule is proven to fire.
        const isSpec = filename.endsWith('.spec.ts');
        const isOwnFixture = filename.endsWith(
          '/eslint-rules-fixtures/no-floating-flush.fixture.ts',
        );
        if (!isSpec && !isOwnFixture) {
          return {};
        }
        const WAITERS = new Set(['flush', 'flushPositioning', 'nextMacrotask', 'settleHydration']);
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
    // See: .claude/rules/testing.md § "Test isolation — non-negotiables" rule 10
    // Cross-link: .claude/rules/testing.md#test-isolation--non-negotiables
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
            '`expect({{ name }}).not.toBeNull()` is redundant: the following `{{ name }}!` already asserts non-nullness to both the reader and the compiler, and throws on a null just as loudly. Drop the assertion. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 10.)',
        },
      },
      create(context) {
        const filename = context.filename.replace(/\\/g, '/');
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
        const sourceCode = context.sourceCode;

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
    // the file. That helper runs after the `TestBed` teardown, fails a passing
    // test whose destroy hooks left a portaled node or a scroll lock behind,
    // and scrubs the residue either way: if a test throws between
    // `open.set(true)` and the `afterNextRender` that inserts/removes the
    // portaled node, the orphan would otherwise survive into the next spec
    // and bleed stale ARIA. A silently-omitted call leaves both a broken
    // destroy path and that orphan unreported (tooltip.spec had 22 portaling
    // `describe` blocks missing the call before #1155).
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
    // See: .claude/rules/testing.md § "Test isolation — non-negotiables" rule 5
    // Cross-link: .claude/rules/testing.md#test-isolation--non-negotiables
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
            'This spec imports the portaling overlay primitive `{{ symbol }}` but never calls `afterEachOverlayCleanup()`. A test that throws mid-render can orphan the portaled node and leak stale ARIA into the next spec. Call `afterEachOverlayCleanup()` (from `projects/forty-cdk/src/test-utils/overlay-cleanup.ts`) once at the top of each portaling `describe`. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 5.)',
        },
      },
      create(context) {
        const filename = context.filename.replace(/\\/g, '/');
        // In specs the flush family / overlay pieces are unambiguous. The
        // rule's own fixture (a `.fixture.ts`, linted via
        // `pnpm check:rule-fixtures`) is included so the rule is proven to fire.
        const isSpec = filename.endsWith('.spec.ts');
        const isOwnFixture = filename.endsWith(
          '/eslint-rules-fixtures/require-overlay-cleanup.fixture.ts',
        );
        if (!isSpec && !isOwnFixture) {
          return {};
        }
        // The SSR smoke suite renders server-side (`PLATFORM_ID` = server), so
        // `afterNextRender` never fires and no overlay portals to the body —
        // asserting `<body>` is untouched IS its contract, so it must NOT call
        // the cleanup helper. Its overlay imports moved to `ssr/fixtures/*.ts`
        // with #1594 (not specs, so already out of scope); the exemption stays
        // as the guard for the day an assertion pulls one back in here.
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

    // Rule 9 — `forty-cdk/no-bare-detect-changes`.
    //
    // The companion to rule 6 (`no-floating-flush`), covering the other half of
    // the waiter contract: that rule makes sure a `flush()` that IS written gets
    // awaited, this one makes sure a `detectChanges()` is not standing in for a
    // `flush()` that was never written. #1596 audited all 739 bare
    // `detectChanges()` calls in the suite and the split is the point: 736 of
    // them assert on DOM the synchronous render itself produces (a host or
    // template binding, an ARIA attribute, `data-state`, a body child appended
    // by the imperative handler that ran a line earlier), and are legitimately
    // served by `detectChanges()`. Blanket-banning the call would therefore mean
    // ~736 escape-hatch markers, and a 736-entry ledger is not a ledger — the
    // `@sanctioned-*` families in this repo work precisely because grepping one
    // returns four or six sites a reviewer can actually read.
    //
    // So the rule keys on the *pairing* that is unsafe rather than on the call:
    // a `detectChanges()` whose following statements assert on DOM that only a
    // promise-chained hop can produce. That set is not invented here — it is the
    // one `flushPositioning`'s own JSDoc names ("any spec that asserts on inline
    // `translate` / `--for-*` styles, transforms, or `data-side` reflection on
    // portaled overlays"), because `@floating-ui/dom`'s `computePosition`
    // resolves across several microtask hops and `autoUpdate`'s RAF polyfill in
    // jsdom is a `setTimeout`. A synchronous `detectChanges()` runs the render
    // and returns before any of it lands, so the assertion reads the *previous*
    // position — or the anti-flash baseline — and passes for a reason production
    // never provides.
    //
    // Detection deliberately scans the whole window rather than only the lines
    // carrying `expect(`, so aliasing the value out first
    // (`const t = el.style.translate;` … `expect(t)`) does not evade it. That
    // widens the rule to a setup read followed by an unrelated assertion, which
    // is the cheap direction to be wrong in: the report is loud, and the marker
    // below resolves it in one line.
    //
    // The escape hatch is the family's canonical shape — a line comment whose
    // text *starts* with `@sanctioned-sync-render(<subject>): <why>`, anchored
    // to the comments directly above the call (#1606's anchoring, so a JSDoc
    // block quoting the phrase licenses nothing — and, unlike its siblings, a
    // marker cannot reach past intervening code to license a second, unrelated
    // `detectChanges()` a few lines below it). It exists because the un-drained
    // render is sometimes the *subject* of the test:
    // `core-overlay/floating/floating.spec.ts` asserts that a config change re-arms the
    // `clip-path` baseline at the retained stale position *before* the new
    // position resolves, which is observable only without the drain. Those three
    // sites are the whole ledger today.
    //
    // See: .claude/rules/testing.md § "Test isolation — non-negotiables" rule 14
    // Cross-link: .claude/rules/testing.md#test-isolation--non-negotiables
    // Refs: tutkli/forty-cdk#1596, tutkli/forty-cdk#1154
    'no-bare-detect-changes': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid a bare `detectChanges()` before an assertion on promise-chained positioning output (`translate` / `clip-path` / `data-side` / the positioners’ `--for-*` properties) — those need `await flushPositioning(fixture)`.',
        },
        schema: [],
        messages: {
          stale:
            'This `detectChanges()` is followed by an assertion on {{ mark }}, which `@floating-ui/dom` writes across several promise / RAF hops — the synchronous render returns before any of it lands, so the assertion reads the previous position and passes for a reason production never provides. Use `await flushPositioning(fixture)` instead. If the *un-drained* render is the subject of the test, license it with a marker comment directly above the call: `// @sanctioned-sync-render(<subject>): <why the pre-drain state is what is being asserted>`. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 14.)',
          malformedMarker:
            'Malformed `@sanctioned-sync-render` marker. The shape is `// @sanctioned-sync-render(<subject>): <why the pre-drain state is what is being asserted>` — a kebab-case subject name in parentheses (e.g. `clip-path-baseline`) and a one-sentence rationale after the colon. The subject names what the un-drained render is asserting, which is what a reviewer verifies. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 14.)',
        },
      },
      create(context) {
        const filename = context.filename.replace(/\\/g, '/');
        // Scoped to specs, which is also what keeps `test-utils/` out by
        // construction rather than by an exemption list: `flush.ts` owns the
        // drain shape and `render.ts` renders the fixture once on mount, and
        // neither is a `.spec.ts`. The rule's own fixture (a `.fixture.ts`,
        // linted via `pnpm check:rule-fixtures`) is included so it is proven to
        // fire.
        const isSpec = filename.endsWith('.spec.ts');
        const isOwnFixture = filename.endsWith(
          '/eslint-rules-fixtures/no-bare-detect-changes.fixture.ts',
        );
        if (!isSpec && !isOwnFixture) {
          return {};
        }
        // Each mark is DOM only `computePosition` / `autoUpdate` can produce.
        // The two anti-flash marks (`translate`, `clip-path`) are what
        // `flushPositioning` itself polls for; the `--for-*` set is the
        // positioners' output vocabulary (the six `--for-floating-*`
        // properties of the shared positioner family); `data-side`
        // / `data-placement` is the resolved-placement reflection.
        const DEFERRED_MARKS = [
          { re: /\.style\.translate\b/, mark: 'the positioner’s inline `translate`' },
          { re: /\.style\.clipPath\b/, mark: 'the anti-flash `clip-path` baseline' },
          {
            re: /getPropertyValue\(\s*['"`](?:translate|clip-path)['"`]/,
            mark: 'the positioner’s `translate` / `clip-path`',
          },
          {
            re: /--for-floating-(?:anchor-(?:width|height)|available-(?:width|height)|arrow-offset|content-transform-origin)/,
            mark: 'a positioner-written `--for-*` custom property',
          },
          { re: /\bdata-side\b/, mark: '`data-side` placement reflection' },
          {
            re: /dataset(?:\.|\[\s*['"`])(?:side|placement)/,
            mark: 'the resolved-placement `dataset` entry',
          },
        ];
        // A statement mentioning one of the waiters ends the window: whatever
        // follows it is drained by construction. Kept in sync with
        // `no-floating-flush`'s set.
        const WAITER = /\b(?:flush|flushPositioning|nextMacrotask|settleHydration)\s*\(/;
        // How many following statements count as "before the assertion". Wide
        // enough for a query/alias pair between the render and its assertions,
        // narrow enough that a later unrelated positioning assertion in the same
        // block does not retro-flag a render that a waiter already followed.
        const LOOKAHEAD = 10;
        const MARKER = /^\s*@sanctioned-sync-render/;
        const WELL_FORMED = /@sanctioned-sync-render\([a-z][a-z0-9-]*\)\s*:\s*\S/;
        const MARKER_WINDOW = 6;
        const sourceCode = context.sourceCode;

        function isDetectChangesStatement(statement) {
          if (statement.type !== 'ExpressionStatement') {
            return false;
          }
          const call = statement.expression;
          return (
            call.type === 'CallExpression' &&
            call.callee.type === 'MemberExpression' &&
            !call.callee.computed &&
            call.callee.property.type === 'Identifier' &&
            call.callee.property.name === 'detectChanges'
          );
        }

        /**
         * The statements between this `detectChanges()` and whatever next drains
         * the pipeline: siblings in the same block, stopping at the next
         * `detectChanges()` or at any statement invoking a waiter.
         */
        function windowAfter(statement) {
          const block = statement.parent;
          if (!block || !Array.isArray(block.body)) {
            return [];
          }
          const index = block.body.indexOf(statement);
          if (index < 0) {
            return [];
          }
          const following = [];
          for (const next of block.body.slice(index + 1, index + 1 + LOOKAHEAD)) {
            if (isDetectChangesStatement(next) || WAITER.test(sourceCode.getText(next))) {
              break;
            }
            following.push(next);
          }
          return following;
        }

        /**
         * The `@sanctioned-sync-render` comment covering `node`, or `null`.
         * Only a *line* comment whose text starts with the phrase is a marker,
         * mirroring the sanctioned-effect / sanctioned-pull anchoring so a block
         * comment quoting it documents the ledger rather than joining it (#1606).
         *
         * The candidate set is `getCommentsBefore` — the comments between the
         * previous token and this statement — rather than every comment in the
         * file within `MARKER_WINDOW` lines, as for its effect-marker siblings
         * (`sanctionedMarkerFor`). A `detectChanges()` is one line, so two
         * reportable calls fit inside the window trivially (`floating.spec.ts`
         * already has marker → call → two assertions) and a file-wide scan would
         * let the first one's marker license the second silently. Adjacency is
         * structural, so nothing here can reach across the code in between; the
         * line window still applies, keeping "immediately above" literal when
         * blank lines separate the comment from the call.
         */
        function markerFor(node) {
          const line = node.loc.start.line;
          for (const comment of sourceCode.getCommentsBefore(node)) {
            if (comment.type !== 'Line' || !MARKER.test(comment.value)) continue;
            const end = comment.loc.end.line;
            if (end <= line && line - end <= MARKER_WINDOW) {
              return comment;
            }
          }
          return null;
        }

        return {
          ExpressionStatement(statement) {
            if (!isDetectChangesStatement(statement)) {
              return;
            }
            const following = windowAfter(statement);
            if (following.length === 0) {
              return;
            }
            const text = following.map((node) => sourceCode.getText(node)).join('\n');
            if (!/\bexpect\s*\(/.test(text)) {
              return;
            }
            const hit = DEFERRED_MARKS.find((candidate) => candidate.re.test(text));
            if (!hit) {
              return;
            }
            const marker = markerFor(statement);
            if (marker && WELL_FORMED.test(marker.value)) {
              return;
            }
            if (marker) {
              context.report({ node: marker, messageId: 'malformedMarker' });
              return;
            }
            context.report({
              node: statement.expression,
              messageId: 'stale',
              data: { mark: hit.mark },
            });
          },
        };
      },
    },

    // Rule 10 — `forty-cdk/no-async-tothrow`.
    //
    // Forbids an `async` callback handed straight to `expect(…)` and matched
    // with `toThrow` / `toThrowError`, plain or behind `.not`. Both matchers
    // invoke the callback and catch only a synchronous throw; an `async`
    // function never throws — it returns a rejected Promise — so the assertion
    // passes whatever the body does, and nothing awaits the body, which keeps
    // running after the test has returned. #1963 shipped both halves at once:
    // two such wrappers in `scroll-area.spec.ts` drained `flush` inside later
    // tests against a torn-down `TestBed`, and the `NG0406` landed on the wrong
    // `it`.
    //
    // It completes the two guards rule 12 already names. `no-floating-flush`
    // cannot see this shape — every `flush` inside the wrapper *is* awaited;
    // what floats is the callback one level up — and `flush`'s
    // destroyed-`ApplicationRef` guard turns the escape red only when the
    // escaped body happens to contain a drain. Around anything else the wrapper
    // stays green and asserts nothing.
    //
    // Detection is syntactic, like its siblings, and three limits follow from
    // that rather than being chased with type information:
    //   1. an async function passed by reference (`expect(someAsyncFn)`) is not
    //      seen;
    //   2. a non-`async` callback returning a Promise
    //      (`expect(() => somePromiseFn())`) is deliberately not reported — it
    //      still catches a synchronous throw, so it is weak, not vacuous;
    //   3. `toThrow` on a synchronous callback is the correct shape and is
    //      never reported.
    // `rejects` between `expect(…)` and the matcher is the replacement, not a
    // violation, so that chain is never inspected.
    //
    // See: .claude/rules/testing.md § "Test isolation — non-negotiables" rule 12
    // Cross-link: .claude/rules/testing.md#test-isolation--non-negotiables
    // Refs: tutkli/forty-cdk#1999, tutkli/forty-cdk#1963, tutkli/forty-cdk#1154
    'no-async-tothrow': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid an `async` callback in `expect(…).toThrow()` / `.toThrowError()` — it rejects instead of throwing, so the matcher cannot fail and the un-awaited body escapes the test.',
        },
        schema: [],
        messages: {
          vacuous:
            '`expect(async …).{{ matcher }}(…)` cannot fail: an `async` callback returns a rejected Promise instead of throwing, `{{ matcher }}` catches only a synchronous throw, and nothing awaits the body, so it keeps running into later tests. If a rejection is the claim, write `await expect(fn()).rejects.{{ matcher }}(…)`; otherwise drop the wrapper and `await` the body directly, so a throw fails the test on its own. (.claude/rules/testing.md § "Test isolation — non-negotiables" rule 12.)',
        },
      },
      create(context) {
        const filename = context.filename.replace(/\\/g, '/');
        const isSpec = filename.endsWith('.spec.ts');
        const isOwnFixture = filename.endsWith(
          '/eslint-rules-fixtures/no-async-tothrow.fixture.ts',
        );
        if (!isSpec && !isOwnFixture) {
          return {};
        }
        const MATCHERS = new Set(['toThrow', 'toThrowError']);

        function isNamedMember(node, name) {
          return (
            node.type === 'MemberExpression' &&
            !node.computed &&
            node.property.type === 'Identifier' &&
            node.property.name === name
          );
        }

        return {
          CallExpression(node) {
            const callee = node.callee;
            if (
              callee.type !== 'MemberExpression' ||
              callee.computed ||
              callee.property.type !== 'Identifier' ||
              !MATCHERS.has(callee.property.name)
            ) {
              return;
            }
            const subject = isNamedMember(callee.object, 'not')
              ? callee.object.object
              : callee.object;
            if (
              subject.type !== 'CallExpression' ||
              subject.callee.type !== 'Identifier' ||
              subject.callee.name !== 'expect'
            ) {
              return;
            }
            const actual = subject.arguments[0];
            if (
              !actual ||
              (actual.type !== 'ArrowFunctionExpression' && actual.type !== 'FunctionExpression') ||
              !actual.async
            ) {
              return;
            }
            context.report({
              node,
              messageId: 'vacuous',
              data: { matcher: callee.property.name },
            });
          },
        };
      },
    },

    // Enforces .claude/rules/conventions.md § "Defaults providers": a primitive must ship a
    // <name>-defaults.ts in forty-cdk/defaults ONLY when it actually consumes scoped
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
    // `pnpm check:rule-fixtures`. Fires once per primitive root file via a
    // Program-level filesystem check.
    'require-defaults-sibling': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'A primitive that injects `FOR_<PRIMITIVE>_DEFAULTS` must have a `<name>-defaults.ts` in `forty-cdk/defaults` per .claude/rules/conventions.md § "Defaults providers".',
        },
        schema: [],
        messages: {
          missing:
            'Primitive `{{name}}` injects `{{token}}` but the required `{{name}}-defaults.ts` is missing from `projects/forty-cdk/defaults/src/` (.claude/rules/conventions.md § "Defaults providers"). Add it there, declaring `provideFor<Primitive>Defaults` + `{{token}}`.',
        },
      },
      create(context) {
        // Resolves `{ primitive, dir }` for a primitive *root* file, or null.
        // The primitive name is the entry-point folder (the segment before
        // /src/) for the per-entry-point layout, or the folder name for the
        // legacy layout. Neither internal-tier entry point is ever a
        // primitive with a defaults provider.
        function primitiveRootOf(normalized, dir) {
          const entry = normalized.match(/\/projects\/forty-cdk\/([^/]+)\/src\/([^/]+)\.ts$/);
          if (entry && entry[1] === entry[2]) {
            return INTERNAL_TIER_ENTRY_POINTS.has(entry[1]) || entry[1] === 'defaults'
              ? null
              : {
                  primitive: entry[1],
                  dir,
                  defaultsDir: path.join(dir, '..', '..', 'defaults', 'src'),
                };
          }
          const legacy = normalized.match(/\/projects\/forty-cdk\/src\/lib\/([^/]+)\/([^/]+)\.ts$/);
          if (legacy && legacy[1] === legacy[2]) {
            return { primitive: legacy[1], dir, defaultsDir: dir };
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
            const filename = context.filename;
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
              info = { primitive: base, dir, defaultsDir: dir };
            } else {
              info = primitiveRootOf(normalized, dir);
            }
            if (!info) return;
            const token = tokenNameOf(info.primitive);
            // Only require the sibling when the primitive actually consumes
            // scoped defaults (some non-defaults source injects the token).
            if (!anySiblingInjectsToken(info.dir, info.primitive, token)) return;
            const sibling = path.join(info.defaultsDir, `${info.primitive}-defaults.ts`);
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
    // injected by a non-defaults, non-spec source file in any primitive entry — a
    // dead defaults file that still enlarges the public API (token + provider +
    // interface) with nothing consuming it. `require-defaults-sibling` closes
    // the "primitive injects the token but the file is missing" direction; this
    // rule closes the "file ships but nothing injects the token" direction
    // (#1258 inverted the former and left the latter unguarded).
    //
    // The token identifier is read from the defaults file's own exports (its
    // `export const FOR_<X> = new InjectionToken(...)` declaration) rather than derived from the primitive name,
    // so it stays correct for secondary defaults files that don't match the
    // entry name (`defaults/src/date-range-picker-defaults.ts` exports
    // `FOR_DATE_RANGE_PICKER_DEFAULTS`). Recognises both library layouts:
    //   - defaults entry:   projects/forty-cdk/defaults/src/<name>-defaults.ts
    //   - legacy folder:    projects/forty-cdk/src/lib/<name>/<name>-defaults.ts
    // The `core` entry holds the cross-cutting utilities and is exempt, as are
    // `_internal` / `test-utils`. A file exporting no defaults token is out of
    // scope (nothing to consume). The entry barrel (`public-api.ts`, or the
    // legacy `index.ts`) is NOT counted as a consumer: every shipping entry
    // re-exports its token there, but re-exporting is not injecting — counting
    // it would neutralize the rule, since a dead-but-public defaults file is by
    // definition re-exported from the barrel. The dedicated fixture
    // (no-unused-defaults-sibling.fixture.ts) sits next to a support
    // `public-api.ts` that re-exports its token, so `pnpm check:rule-fixtures`
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
            'A `<name>-defaults.ts` sibling whose defaults token is never injected in its own entry is dead weight — remove it or inject the token (reverse of `require-defaults-sibling`; .claude/rules/conventions.md § "Defaults providers").',
        },
        schema: [],
        messages: {
          unused:
            'The defaults file `{{ name }}-defaults.ts` exports `{{ token }}` but no non-spec source of any primitive entry ever injects it — a dead defaults file that still enlarges the public API (token + provider + interface). Remove it, or inject the token where the scoped defaults are read (.claude/rules/conventions.md § "Defaults providers").',
        },
      },
      create(context) {
        const filename = context.filename;
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
          if (entry && entry[1] === 'defaults') {
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
        function consumerDirs() {
          if (!normalized.includes('/projects/forty-cdk/defaults/src/')) return [dir];
          const libDir = path.join(dir, '..', '..');
          let entries;
          try {
            entries = fs.readdirSync(libDir);
          } catch {
            return [];
          }
          return entries
            .filter((entry) => entry !== 'defaults' && !INTERNAL_TIER_ENTRY_POINTS.has(entry))
            .map((entry) => path.join(libDir, entry, 'src'));
        }
        function anySiblingInjectsToken() {
          const self = path.resolve(filename);
          for (const consumerDir of consumerDirs()) {
            let entries;
            try {
              entries = fs.readdirSync(consumerDir);
            } catch {
              continue;
            }
            for (const entryName of entries) {
              if (!entryName.endsWith('.ts')) continue;
              if (path.resolve(consumerDir, entryName) === self) continue;
              if (entryName.endsWith('.spec.ts')) continue;
              if (BARRELS.has(entryName)) continue;
              let source;
              try {
                source = fs.readFileSync(path.join(consumerDir, entryName), 'utf8');
              } catch {
                continue;
              }
              if (tokenNames.some((token) => source.includes(token))) return true;
            }
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
    // `pnpm check:rule-fixtures` proves the rule fires (the sibling never
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
        const filename = context.filename.replace(/\\/g, '/');
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
        // references (`implements Omit<FormValueControl<T>, 'min' | 'max'>`)
        // by scanning the entry's type arguments for a
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

    // Enforces .claude/rules/conventions.md § "Context exports — what's public": a
    // primitive's `injectXContext(piece)` helper is implementation detail —
    // it takes a directive-name string purely for error messages and exists
    // so sibling pieces of the same primitive can read the shared context.
    // Only the `InjectionToken` (`FOR_<PRIMITIVE>_CONTEXT`) and the context
    // interface are public. This rule forbids any primitive barrel from
    // re-exporting a helper named `inject<Anything>Context` (by name, by an
    // exported declaration, or wholesale through `export *` of a `*-context`
    // module), mirroring the `require-defaults-sibling` shape: a barrel-scoped
    // check over the file's `export` declarations. Recognises both library layouts:
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
          exportAll:
            "`export * from '{{ source }}'` re-exports the context module wholesale, `inject<Name>Context` helper included, which is internal. Re-export the `InjectionToken` (`FOR_<PRIMITIVE>_CONTEXT`) and the context `interface` by name. (tutkli/forty-cdk#584, D8.)",
        },
      },
      create(context) {
        const filename = context.filename.replace(/\\/g, '/');
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
        // internal tier (`core` plus `core-overlay`, whose barrels deliberately
        // re-export internal helpers with no semver guarantee — `core-overlay`
        // publishes `injectMenuContext` because `forty-cdk/menu`'s pieces reach
        // it across an entry-point boundary), so both are exempt too.
        if (
          (perEntry && INTERNAL_TIER_ENTRY_POINTS.has(perEntry[1])) ||
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
        const declaredNames = (declaration) => {
          if (!declaration) return [];
          if (declaration.type === 'FunctionDeclaration' && declaration.id) {
            return [declaration.id];
          }
          if (declaration.type === 'VariableDeclaration') {
            return declaration.declarations
              .map((declarator) => declarator.id)
              .filter((id) => id.type === 'Identifier');
          }
          return [];
        };
        return {
          ExportNamedDeclaration(node) {
            for (const spec of node.specifiers) {
              if (spec.type === 'ExportSpecifier') reportSpecifier(spec);
            }
            for (const id of declaredNames(node.declaration)) {
              if (isInjectContextName(id.name)) {
                context.report({ node: id, messageId: 'forbidden', data: { name: id.name } });
              }
            }
          },
          ExportAllDeclaration(node) {
            const source = node.source.value;
            if (typeof source === 'string' && /-context(?:\.ts)?$/.test(source)) {
              context.report({ node, messageId: 'exportAll', data: { source } });
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
    //   - Only what runs synchronously inside the effect's reactive run is
    //     inspected: the callback's own statements, plus the callbacks of
    //     `untracked(…)`, of an array iteration method (`forEach`, `map`,
    //     `filter`, …) and of an IIFE (#2378). Reads / writes inside any other
    //     nested function (a `ResizeObserver` / event callback, a
    //     `queueMicrotask`, etc.) fire outside the reactive scope, so they are
    //     not counted.
    //   - A read wrapped in `untracked(() => sig())` is the documented escape
    //     hatch for genuinely needing the current value without subscribing —
    //     such reads are ignored, so pairing `untracked()` reads with writes
    //     does not trip the rule. A *write* inside `untracked()` is not hidden:
    //     it still notifies the effect, so `const v = s(); untracked(() =>
    //     s.set(v + 1))` is the same cycle as `s.set(s() + 1)`.
    //   - `afterRenderEffect()` is a reactive context too, so its callback — or
    //     every phase of its phase object, analyzed together — is checked the
    //     same way, here and in the two marker rules below.
    //   - Writes are matched by callee shape (`<base>.set` / `<base>.update`)
    //     and by arity — one argument only, since `WritableSignal.set(v)` takes
    //     one and `Map.set(k, v)` takes two (#1606). Here that condition is
    //     defence in depth rather than a fix: the pairing below already spares a
    //     plain collection, which is never read as `<base>()`. It is shared with
    //     the two marker rules so "signal write" means one thing family-wide.
    //   - A write only fires the rule when `<base>` is also read as `<base>()`
    //     in a tracked position in the same callback.
    //
    // Helper resolution is **same-file and one level deep** (#1575). A cycle
    // assembled across a helper call used to be entirely invisible: not just the
    // write, but the *read* too, and therefore the pairing the rule keys on — an
    // `effect(() => this.#sync())` looked like an effect touching no signal at
    // all, which is how #1572 shipped a synchronous self-retriggering effect
    // through a green `pnpm lint`. So when the callback calls a helper whose
    // declaration is resolvable in the same file — a method or arrow-valued
    // field on `this`, or a function bound in an enclosing scope — that body is
    // analyzed too (with the same nested-scope and `untracked()` treatment) and
    // its reads / writes merged into the effect's sets before pairing.
    //
    // The residual gap is deliberate and worth stating rather than assuming
    // closed: resolution does **not** follow a call into another file, so a
    // method on an injected collaborator stays opaque — the #1572 cycle itself
    // lived in `core-overlay/menu-overlay/menu-opener-registry.ts`, one file away from
    // the trigger's effect, and would still slip through. Same-file, one level
    // is the version that stays a lint rule instead of becoming a type-aware
    // whole-program pass, and it catches the far more common in-file shape.
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
          forbiddenViaHelper:
            'Do not propagate state inside `effect()`: the same signal (`{{ signal }}`) is read reactively and written via `.set`/`.update` once `{{ helper }}` is followed. The effect therefore depends on the signal it writes and re-triggers itself — a synchronous cycle that hangs the caller with no stack trace. Derive it with `computed()` / `linkedSignal()` instead, or wrap the read in `untracked()` if you genuinely need the current value (CLAUDE.md § "Never propagate state inside `effect()`").',
        },
      },
      create(context) {
        const sourceCode = context.sourceCode;
        // A stable key for the signal expression being read / written, so
        // `this.#activeId` reads pair with `this.#activeId.set(…)` writes and
        // `count` pairs with `count.set(…)`. Source text is exact enough for
        // the member / identifier shapes signals take.
        function exprKey(node) {
          return sourceCode.getText(node);
        }
        // Walk function bodies, collecting tracked reads, writes, and the
        // same-file helper calls worth following. Nested functions are skipped
        // unless they run synchronously inside the effect (`synchronousCallbacks`).
        // Everything reached through `untracked(…)` is walked with `untracked`
        // set: its reads are not tracked, but its writes still notify the effect.
        // `followHelpers` is false for a helper's own body, which is what bounds
        // resolution to one level.
        function collect(bodyNode, followHelpers) {
          const trackedReads = new Map(); // key -> first read node
          const writes = []; // { key, node }
          const helperCalls = []; // { name, body, node, untracked }
          const synchronous = new Map();
          const stack = [[bodyNode, false]];
          while (stack.length) {
            const [node, untracked] = stack.pop();
            if (!node || typeof node !== 'object') continue;
            if (Array.isArray(node)) {
              for (const item of node) stack.push([item, untracked]);
              continue;
            }
            if (!node.type) continue;
            if (
              node.type === 'FunctionExpression' ||
              node.type === 'ArrowFunctionExpression' ||
              node.type === 'FunctionDeclaration'
            ) {
              if (synchronous.has(node)) stack.push([node.body, synchronous.get(node)]);
              continue;
            }
            if (node.type === 'CallExpression') {
              const callee = node.callee;
              // `untracked(() => …)` — the documented escape hatch for a read.
              // It hides the reads inside it, not the writes.
              const untrackedCall = callee.type === 'Identifier' && callee.name === 'untracked';
              for (const callback of synchronousCallbacks(node)) {
                synchronous.set(callback, untracked || untrackedCall);
              }
              if (untrackedCall) {
                for (const arg of node.arguments) stack.push([arg, true]);
                continue;
              }
              // Write: `<base>.set(…)` / `<base>.update(…)`.
              if (
                callee.type === 'MemberExpression' &&
                !callee.computed &&
                callee.property.type === 'Identifier' &&
                (callee.property.name === 'set' || callee.property.name === 'update')
              ) {
                if (node.arguments.length === 1) {
                  writes.push({ key: exprKey(callee.object), node });
                }
                // Still descend into the arguments — a read may live there.
                for (const arg of node.arguments) stack.push([arg, untracked]);
                continue;
              }
              // A same-file helper the effect delegates to. Resolved before the
              // read branch below, because a zero-argument helper call is
              // syntactically indistinguishable from a signal read — a name that
              // resolves to a function declaration is the helper, not a signal.
              const helper = followHelpers ? resolveSameFileHelper(node, sourceCode) : null;
              if (helper) {
                helperCalls.push({ ...helper, node, untracked });
                for (const arg of node.arguments) stack.push([arg, untracked]);
                continue;
              }
              // Tracked read: a zero-argument call `<sig>()` whose callee is an
              // identifier or member access (`count()`, `this.#activeId()`).
              if (
                node.arguments.length === 0 &&
                (callee.type === 'Identifier' || callee.type === 'MemberExpression')
              ) {
                const key = exprKey(callee);
                if (!untracked && !trackedReads.has(key)) {
                  trackedReads.set(key, node);
                }
                // A read has no children worth scanning for this rule.
                continue;
              }
            }
            for (const key in node) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              stack.push([node[key], untracked]);
            }
          }
          return { trackedReads, writes, helperCalls };
        }
        // The effect's own reads / writes, merged with those of every same-file
        // helper it calls. A merged entry remembers the helper it came from and
        // is anchored on the call site, so the report lands on the effect the
        // reader has to fix and names the helper that completes the cycle. A
        // helper called inside `untracked(…)` contributes its writes only.
        function analyzeCallbacks(callbacks) {
          const own = collect(
            callbacks.map((callback) => callback.body),
            true,
          );
          const trackedReads = new Map();
          for (const [key, node] of own.trackedReads) {
            trackedReads.set(key, { node, helper: null });
          }
          const writes = own.writes.map((write) => ({ ...write, helper: null }));
          const analyzed = { tracked: new Set(), untracked: new Set() };
          for (const call of own.helperCalls) {
            const seen = call.untracked ? analyzed.untracked : analyzed.tracked;
            if (seen.has(call.body)) continue;
            seen.add(call.body);
            const inner = collect(call.body, false);
            if (!call.untracked) {
              for (const key of inner.trackedReads.keys()) {
                if (!trackedReads.has(key)) {
                  trackedReads.set(key, { node: call.node, helper: call.name });
                }
              }
            }
            for (const write of inner.writes) {
              writes.push({ key: write.key, node: call.node, helper: call.name });
            }
          }
          return { trackedReads, writes };
        }
        return {
          CallExpression(node) {
            const callbacks = reactiveCallbacks(node);
            if (callbacks.length === 0) return;
            const { trackedReads, writes } = analyzeCallbacks(callbacks);
            const reported = new Set();
            for (const write of writes) {
              const read = trackedReads.get(write.key);
              if (!read || reported.has(write.key)) continue;
              reported.add(write.key);
              const helper = write.helper ?? read.helper;
              context.report({
                node: write.node,
                messageId: helper ? 'forbiddenViaHelper' : 'forbidden',
                data: { signal: write.key, helper },
              });
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
    //   - Keyed on the method *name* (`set` / `update`) plus its **arity**: only
    //     a one-argument call counts, because `WritableSignal.set(v)` takes one
    //     and `Map.set(k, v)` takes two (#1606). Arity is the whole of the
    //     signal-ness test the family performs — a rule that tried to *prove*
    //     signal-ness would need type information and would miss the real thing —
    //     so a one-argument `.set(…)` on a plain receiver still trips it. That
    //     residual false positive is loud and cheap to resolve here: the marker
    //     the author was already writing clears it. DOM writes (`setAttribute`,
    //     `toggleAttribute`, `style.setProperty`, `el.value = …`) are what
    //     `effect()` is for and never match.
    //   - Descends into a nested function only when it runs synchronously
    //     inside the effect (`untracked(…)`, an array iteration callback, an
    //     IIFE), matching `no-effect-state-propagation`: a write inside an
    //     observer callback runs outside the effect's reactive run, while one
    //     wrapped in `untracked()` is still state propagation and still needs
    //     the marker (#2378).
    //   - Follows a call to a helper declared in the **same file**, one level
    //     deep, exactly as `no-effect-state-propagation` does (#1575), so the
    //     write one hoisted-helper call away that `element-size` makes is now
    //     covered by the lint rather than by convention alone. The residual gap
    //     is the same one: a call into another file is not followed, so the
    //     marker is still required by convention there for `grep
    //     @sanctioned-effect` to stay the complete ledger.
    //   - A marker licenses only the effect it sits on. Its candidates are the
    //     comments directly above the statement holding the `effect(` call
    //     (`getCommentsBefore`), within six lines, so it cannot reach past the
    //     preceding effect: two one-line effects fit inside any line window,
    //     and a file-wide proximity scan let one marker license both (#2378). A
    //     bare `@sanctioned-effect` with no invariant / no rationale is
    //     reported as malformed rather than accepted.
    //   - Only a **line comment whose text starts with the phrase** is a marker,
    //     so a JSDoc block quoting `@sanctioned-effect(<invariant>)` — the shape
    //     conventions.md asks prose to avoid precisely so the `grep` ledger
    //     stays honest — cannot license the effect below it. Documenting the
    //     ledger must not join it.
    //
    // See: .claude/rules/conventions.md § "The sanctioned-effect marker".
    // Fixture: `projects/forty-cdk/eslint-rules-fixtures/require-sanctioned-effect-marker.fixture.ts`.
    'require-sanctioned-effect-marker': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Every signal write inside an `effect()` must carry the canonical `@sanctioned-effect(<invariant>): <why>` marker comment (.claude/rules/conventions.md § "The sanctioned-effect marker").',
        },
        schema: [],
        messages: {
          missingMarker:
            'Unmarked signal write inside `effect()`: `{{ signal }}.{{ method }}(…)`. `effect()` is for side effects that escape the reactive graph — derive state with `computed()` / `linkedSignal()` / `resource()` / `toSignal()` instead. If the write is genuinely sanctioned, license it with a marker comment directly above the `effect(` call: `// @sanctioned-effect(<invariant>): <why the write cannot cycle>`. (.claude/rules/conventions.md § "The sanctioned-effect marker".)',
          missingMarkerViaHelper:
            'Unmarked signal write inside `effect()`: `{{ helper }}` writes `{{ signal }}.{{ method }}(…)`. `effect()` is for side effects that escape the reactive graph — derive state with `computed()` / `linkedSignal()` / `resource()` / `toSignal()` instead. If the write is genuinely sanctioned, license it with a marker comment directly above the `effect(` call: `// @sanctioned-effect(<invariant>): <why the write cannot cycle>`. (.claude/rules/conventions.md § "The sanctioned-effect marker".)',
          malformedMarker:
            'Malformed `@sanctioned-effect` marker. The shape is `// @sanctioned-effect(<invariant>): <why the write cannot cycle>` — a kebab-case invariant name in parentheses (e.g. `external-source`, `untracked-read`) and a one-sentence rationale after the colon. The name is what a reviewer verifies and what a refactor must preserve. (.claude/rules/conventions.md § "The sanctioned-effect marker".)',
        },
      },
      create(context) {
        const sourceCode = context.sourceCode;
        const MARKER = /^\s*@sanctioned-effect/;
        const WELL_FORMED = /@sanctioned-effect\([a-z][a-z0-9-]*\)\s*:\s*\S/;

        /**
         * Collects `.set(…)` / `.update(…)` calls in function bodies, plus the
         * same-file helper calls worth following. A nested function is walked
         * only when it runs synchronously inside the effect. `followHelpers` is
         * false for a helper's own body, which is what bounds resolution to one
         * level.
         */
        function collect(bodyNode, followHelpers) {
          const writes = [];
          const helperCalls = [];
          const synchronous = new Set();
          const stack = [bodyNode];
          while (stack.length) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;
            if (Array.isArray(node)) {
              for (const item of node) stack.push(item);
              continue;
            }
            if (!node.type) continue;
            if (
              node.type === 'FunctionExpression' ||
              node.type === 'ArrowFunctionExpression' ||
              node.type === 'FunctionDeclaration'
            ) {
              if (synchronous.has(node)) stack.push(node.body);
              continue;
            }
            if (node.type === 'CallExpression') {
              for (const callback of synchronousCallbacks(node)) synchronous.add(callback);
              if (
                node.callee.type === 'MemberExpression' &&
                !node.callee.computed &&
                node.callee.property.type === 'Identifier' &&
                (node.callee.property.name === 'set' || node.callee.property.name === 'update')
              ) {
                if (node.arguments.length === 1) {
                  writes.push({
                    node,
                    signal: sourceCode.getText(node.callee.object),
                    method: node.callee.property.name,
                  });
                }
              } else if (followHelpers) {
                const helper = resolveSameFileHelper(node, sourceCode);
                if (helper) helperCalls.push({ ...helper, node });
              }
            }
            for (const key in node) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              stack.push(node[key]);
            }
          }
          return { writes, helperCalls };
        }

        /**
         * The effect's own signal writes, merged with those of every same-file
         * helper it calls. A helper's write is anchored on the call site, so the
         * report lands on the effect the marker would license and names the
         * helper that performs the write.
         */
        function writesIn(callbacks) {
          const own = collect(
            callbacks.map((callback) => callback.body),
            true,
          );
          const writes = own.writes.map((write) => ({ ...write, helper: null }));
          const analyzed = new Set();
          for (const call of own.helperCalls) {
            if (analyzed.has(call.body)) continue;
            analyzed.add(call.body);
            for (const write of collect(call.body, false).writes) {
              writes.push({ ...write, node: call.node, helper: call.name });
            }
          }
          return writes;
        }

        return {
          CallExpression(node) {
            const callbacks = reactiveCallbacks(node);
            if (callbacks.length === 0) return;
            const writes = writesIn(callbacks);
            if (writes.length === 0) return;

            const marker = sanctionedMarkerFor(node, sourceCode, MARKER);
            if (marker && WELL_FORMED.test(marker.value)) return;
            if (marker) {
              context.report({ node: marker, messageId: 'malformedMarker' });
              return;
            }
            const reported = new Set();
            for (const write of writes) {
              const key = `${write.node.range[0]}:${write.signal}.${write.method}`;
              if (reported.has(key)) continue;
              reported.add(key);
              context.report({
                node: write.node,
                messageId: write.helper ? 'missingMarkerViaHelper' : 'missingMarker',
                data: { signal: write.signal, method: write.method, helper: write.helper },
              });
            }
          },
        };
      },
    },

    // `forty-cdk/require-sanctioned-pull-marker`.
    //
    // The third rule of the `effect()` family, and the one that governs the
    // *other* thing an effect is used for when it should not be: a **pull** —
    // reading a lazy store purely so that its computation runs while a transient
    // source is observable. `#1580` AC3 asked for a library with no such effect
    // at all, which a fold over a transient source cannot give: the mounted
    // option / item window only exists while the consumer's `@if` keeps it
    // rendered, and a lazy derivation only ever observes its source at the
    // moment something reads it, so a window that mounts and unmounts with no
    // reader is lost with no trace (#1518 is the same mechanism seen from the
    // `previous` slot). The pull is therefore load-bearing, and the resolution
    // is the one this repo already uses for the other unavoidable-effect family:
    // one canonical marker, mechanically enforced.
    //
    //   // @sanctioned-pull(navigator-position-map): the rendered window is
    //   // transient, so a window nothing reads during is lost to the lazy fold.
    //   effect(() => { runVirtualizedNavigatorBridge({ … }); });
    //
    // The store name in parentheses is what a reviewer verifies — deleting the
    // pull breaks nothing any type or signature can see, and the failure is
    // silent and downstream (a label falls back to its serialized form value,
    // off-window navigation stops resolving) — and `grep @sanctioned-pull` is
    // the library's complete pull ledger, mirrored into the generated matrices
    // in `.claude/rules/conventions.md`.
    //
    // The second half of the rule is a conservative proxy for the invariant
    // #1600 had to discover by hand: **a pull must not widen the tracked set of
    // a write that shares its effect.** A pull drags the store's own sources into
    // the effect, so pulling the label cache — which reads the selection —
    // inside the auto-highlight bridge made every commit of `value` re-run that
    // bridge's activedescendant write and `scrollIntoView`; a hover-then-click
    // could scroll the listbox to the hovered option. Judging that overlap is
    // beyond a syntactic rule, so what it enforces instead is the stricter shape:
    // a one-argument `.set(` / `.update(` in the same effect body as a pull is an
    // error outright, not something a marker can license. Split the effect; do
    // not widen the rule.
    //
    // The one shipped pull that does share its effect with writes is Combobox's
    // (`runAutoHighlightBridge` primes the position map, then writes
    // activedescendant through `tryResolvePending` / `seedFromIndexedSnapshot`),
    // and it passes only because those writes are cross-file. It is safe for the
    // reason the proxy cannot check: the position map's sources are the ones that
    // bridge already tracks through its own `items()` read, so the pull widens
    // nothing. See the conventions section for the argument a new instance owes.
    //
    // Deliberate design notes:
    //   - A pull is a zero-or-more-argument call to a `PULL_METHODS` member
    //     (`prime`) or to one of the `PULL_RUNNERS` free functions. The runners
    //     exist because #1602 collapsed the four identical position-map effects
    //     into `runVirtualizedNavigatorBridge` in `forty-cdk/core`: the pull is
    //     then one file away, and cross-file resolution is precisely the gap the
    //     sibling rules leave open. Naming the runners keeps those four sites
    //     mechanically enforced instead of convention-only, and the list is
    //     short by construction — a helper earns a place on it only by existing
    //     to run a pull.
    //   - Write detection matches `require-sanctioned-effect-marker` exactly
    //     (method name `set` / `update`, one-argument calls only, descent into
    //     synchronous callbacks only, same-file helpers followed one level deep), so
    //     the residual gap is the same: a write behind a cross-file collaborator
    //     call is invisible. That gap is what the Combobox bridge above sits in,
    //     and `tryResolvePending` is built for it on purpose — its write is the
    //     pull's own settled result, not foreign state riding along.
    //   - The arity condition arrived here first (#1606) and is now the family's,
    //     because "what counts as a signal write" has to mean one thing across
    //     the three rules. `WritableSignal.set(v)` takes one argument and
    //     `Map.set(k, v)` takes two, so arity is a free signal on the commonest
    //     false positive, and the `signal.set(a, b)` typo it misses is a compile
    //     error anyway. Do not push further with type information — that would
    //     make the whole family type-aware.
    //   - The residual false positive is a one-argument `.set(` / `.update(` on
    //     a non-signal receiver, and its sanctioned resolution is an
    //     `eslint-disable-next-line` on the **write** line — not above the
    //     `effect(` — plus a comment naming the receiver. Two things keep that
    //     directive from carrying the marker requirement off with it. The write
    //     branch reports *without returning*, so a suppressed misread still
    //     leaves the marker check to run; while it returned, silencing the one
    //     silenced the other, which is the missing ledger entry #1606 names. The
    //     visible cost is that an unmarked pull beside a genuine write now names
    //     both faults at once. That is not two minds about the same effect: the
    //     advice is sequential — split it, and the read-only half keeping the
    //     pull is what then takes the marker. And
    //     the write branch anchors on the write **itself** — inside the helper
    //     body when a same-file helper is what brought it in, never on the call
    //     site, which is the node the marker branches use. Fold a helper's
    //     writes onto its call site instead and the two branches collapse onto
    //     one line, where the documented directive silences both and reports no
    //     unused-directive warning to say so; the author has no other move
    //     either, because a disable inside the helper would suppress nothing.
    //   - A marker licenses only the effect it sits on, anchored exactly like
    //     the sibling's on the comments directly above the statement holding the
    //     `effect(` call, and a bare `@sanctioned-pull` with no store / no
    //     rationale is malformed. As with the sibling, only a line comment whose
    //     text starts with the phrase counts, so a JSDoc block quoting the marker
    //     cannot license the effect below it.
    //
    // See: .claude/rules/conventions.md § "The sanctioned-pull marker".
    // Fixture: `projects/forty-cdk/eslint-rules-fixtures/require-sanctioned-pull-marker.fixture.ts`.
    //
    // Refs: tutkli/forty-cdk#1602, #1580, #1600, #1606
    'require-sanctioned-pull-marker': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Every pull of a lazy store inside an `effect()` must carry the canonical `@sanctioned-pull(<store>): <why>` marker, and must not share the effect with a signal write (.claude/rules/conventions.md § "The sanctioned-pull marker").',
        },
        schema: [],
        messages: {
          missingMarker:
            'Unmarked pull inside `effect()`: `{{ store }}`. An effect that exists to force a lazy store to run is load-bearing in a way nothing else can see — deleting it fails silently and downstream. License it with a marker comment directly above the `effect(` call: `// @sanctioned-pull(<store>): <why the source is transient>`, and keep the effect read-only. (.claude/rules/conventions.md § "The sanctioned-pull marker".)',
          missingMarkerViaHelper:
            'Unmarked pull inside `effect()`: `{{ helper }}` pulls `{{ store }}`. An effect that exists to force a lazy store to run is load-bearing in a way nothing else can see — deleting it fails silently and downstream. License it with a marker comment directly above the `effect(` call: `// @sanctioned-pull(<store>): <why the source is transient>`, and keep the effect read-only. (.claude/rules/conventions.md § "The sanctioned-pull marker".)',
          malformedMarker:
            'Malformed `@sanctioned-pull` marker. The shape is `// @sanctioned-pull(<store>): <why the source is transient>` — a kebab-case store name in parentheses (e.g. `label-cache-window`, `navigator-position-map`) and a one-sentence rationale after the colon. The name is what a reviewer verifies and what a refactor must preserve. (.claude/rules/conventions.md § "The sanctioned-pull marker".)',
          pullWithWrite:
            'A pull (`{{ store }}`) shares this `effect()` with the signal write `{{ signal }}.{{ method }}(…)`. The pull drags its own tracked set into the effect, so the write re-runs on every change the *store* depends on — which is how a hover-then-click came to scroll a listbox (#1600). If `{{ signal }}` is a signal, split the pull into its own read-only effect; no marker licenses this. If `{{ signal }}` is *not* a signal — a scratch `Map`, a `WeakMap` cache, any plain object with a one-argument `{{ method }}(…)` — the rule has misread it: it cannot tell the two apart without type information, so keep the `@sanctioned-pull` marker and silence this line alone with `// eslint-disable-next-line forty-cdk/require-sanctioned-pull-marker`, naming the receiver in a comment. (.claude/rules/conventions.md § "The sanctioned-pull marker".)',
        },
      },
      create(context) {
        const sourceCode = context.sourceCode;
        // Members whose call *is* the pull, and the free functions that exist to
        // run one on the caller's behalf. See the design notes above for why the
        // second list is named rather than resolved.
        const PULL_METHODS = new Set(['prime']);
        const PULL_RUNNERS = new Set(['runAutoHighlightBridge', 'runVirtualizedNavigatorBridge']);
        const MARKER = /^\s*@sanctioned-pull/;
        const WELL_FORMED = /@sanctioned-pull\([a-z][a-z0-9-]*\)\s*:\s*\S/;

        /**
         * Collects the pulls and signal writes of function bodies, plus the
         * same-file helper calls worth following. A nested function is walked
         * only when it runs synchronously inside the effect. `followHelpers` is
         * false for a helper's own body, which is what bounds resolution to one
         * level.
         */
        function collect(bodyNode, followHelpers) {
          const pulls = [];
          const writes = [];
          const helperCalls = [];
          const synchronous = new Set();
          const stack = [bodyNode];
          while (stack.length) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;
            if (Array.isArray(node)) {
              for (const item of node) stack.push(item);
              continue;
            }
            if (!node.type) continue;
            if (
              node.type === 'FunctionExpression' ||
              node.type === 'ArrowFunctionExpression' ||
              node.type === 'FunctionDeclaration'
            ) {
              if (synchronous.has(node)) stack.push(node.body);
              continue;
            }
            if (node.type === 'CallExpression') {
              for (const callback of synchronousCallbacks(node)) synchronous.add(callback);
              const callee = node.callee;
              const member =
                callee.type === 'MemberExpression' &&
                !callee.computed &&
                callee.property.type === 'Identifier'
                  ? callee.property.name
                  : null;
              if (member !== null && PULL_METHODS.has(member)) {
                pulls.push({ node, store: `${sourceCode.getText(callee.object)}.${member}()` });
              } else if (callee.type === 'Identifier' && PULL_RUNNERS.has(callee.name)) {
                pulls.push({ node, store: `${callee.name}()` });
              } else if (member === 'set' || member === 'update') {
                if (node.arguments.length === 1) {
                  writes.push({
                    node,
                    signal: sourceCode.getText(callee.object),
                    method: member,
                  });
                }
              } else if (followHelpers) {
                const helper = resolveSameFileHelper(node, sourceCode);
                if (helper) helperCalls.push({ ...helper, node });
              }
            }
            for (const key in node) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              stack.push(node[key]);
            }
          }
          return { pulls, writes, helperCalls };
        }

        /**
         * The effect's own pulls / writes, merged with those of every same-file
         * helper it calls. A helper's pulls are anchored on the call site, so the
         * report lands on the effect a marker would license; its writes keep the
         * node they were found on, so the two branches never share a line and the
         * documented disable stays scoped to the misread write.
         */
        function analyzeCallbacks(callbacks) {
          const own = collect(
            callbacks.map((callback) => callback.body),
            true,
          );
          const pulls = own.pulls.map((pull) => ({ ...pull, helper: null }));
          const writes = [...own.writes];
          const analyzed = new Set();
          for (const call of own.helperCalls) {
            if (analyzed.has(call.body)) continue;
            analyzed.add(call.body);
            const inner = collect(call.body, false);
            for (const pull of inner.pulls) {
              pulls.push({ store: pull.store, node: call.node, helper: call.name });
            }
            for (const write of inner.writes) {
              writes.push(write);
            }
          }
          return { pulls, writes };
        }

        return {
          CallExpression(node) {
            const callbacks = reactiveCallbacks(node);
            if (callbacks.length === 0) return;
            const { pulls, writes } = analyzeCallbacks(callbacks);
            if (pulls.length === 0) return;

            if (writes.length > 0) {
              const write = writes[0];
              context.report({
                node: write.node,
                messageId: 'pullWithWrite',
                data: { store: pulls[0].store, signal: write.signal, method: write.method },
              });
            }

            const marker = sanctionedMarkerFor(node, sourceCode, MARKER);
            if (marker && WELL_FORMED.test(marker.value)) return;
            if (marker) {
              context.report({ node: marker, messageId: 'malformedMarker' });
              return;
            }
            const reported = new Set();
            for (const pull of pulls) {
              if (reported.has(pull.store)) continue;
              reported.add(pull.store);
              context.report({
                node: pull.node,
                messageId: pull.helper ? 'missingMarkerViaHelper' : 'missingMarker',
                data: { store: pull.store, helper: pull.helper },
              });
            }
          },
        };
      },
    },

    // `forty-cdk/no-assertion-only-effect`.
    //
    // The fourth rule of the `effect()` family, and the one about an effect that
    // neither writes nor pulls: an `effect()` whose whole body is a `throw` or an
    // `assert*` call — `effect()` used as a **validation channel**.
    //
    // It does not work, and the way it fails is silent. A throw inside an effect
    // never reaches the code that caused it: Angular routes it to the
    // application `ErrorHandler`, so the consumer gets a console entry whose
    // stack is the effect scheduler rather than the binding at fault, the effect
    // re-throws on every re-run, and an app with its own `ErrorHandler` swallows
    // it entirely. That is how `selectionFollowsFocus` + virtualization reached
    // production on Select / Listbox / Tree as *silently degraded keyboard
    // behaviour*: focus stopped carrying selection and nobody was told (#1583).
    //
    // The resolution is always the same shape — move the invariant to its
    // **point of use**, where a throw is attributable to a real call:
    //
    //   // before: unattributable, re-throws forever
    //   effect(() => { if (a() && b()) throw new Error('[forty-cdk/x] …'); });
    //
    //   // after: thrown from the move the combination degrades
    //   protected onHostKeyDown(event: KeyboardEvent): void {
    //     if (action) { this.#assertXSupported(); … }
    //   }
    //
    // Be precise about what the move buys, because it is not all three faults.
    // The attributable stack and the end of the perpetual re-throw are
    // unconditional. Whether the consumer can *catch* the error depends on the
    // shape of the point of use: a derivation read during the render (a
    // `computed`, as in `ForTableBody.track` / `DateFieldEngine.specs`) aborts
    // the render, so `detectChanges()` re-raises it and a consumer `try` sees
    // it; an **event handler** does not, because Angular wraps host listeners
    // and routes their throws to the same `ErrorHandler` an effect's go to —
    // which is exactly why the Select / Listbox / Tree specs capture through a
    // real `ErrorHandler` rather than asserting `.toThrow()`. Do not read this
    // rule as "the point of use makes the throw reach the consumer"; read it as
    // "the point of use makes the throw attributable and one-shot, and reaches
    // the consumer wherever the point of use is a render-time derivation".
    //
    // Deliberate design notes:
    //   - "Assertion-only" is a body made of nothing but `throw`s, calls to an
    //     `assert*` / `throw*` function (bare, `this.`-qualified, or private),
    //     the `if` / block scaffolding around them, bare early `return`s, and the
    //     `const` reads that gather the values being asserted. One statement of
    //     real work — a DOM write, a signal read fed to something else — and the
    //     effect is a side-effect effect the rule leaves alone. `assert*` beside
    //     real work is therefore fine: `[forTableColumnResizer]` asserts its
    //     column name inside the effect that publishes the width var, which *is*
    //     the point of use.
    //   - **The exemption is a condition, not a path list**: an `effect()` inside
    //     a function whose own name starts with `assert` is a reusable assertion
    //     *scheduler*, and the naming is the contract. `assertInputBound`
    //     (`forty-cdk/core`) is the one instance and the shape #1601 sanctioned:
    //     it asserts that a piece's binding was ever written, which is
    //     observable only *after* the update pass, so it has no point of use to
    //     move to — the effect is the earliest read, not a stand-in for one.
    //     Anything else with a point of use must use it.
    //   - Like its siblings the rule is syntactic and does not resolve helpers
    //     across files: an effect whose body is one call to a collaborator's
    //     `validate()` is invisible to it. Naming assertion helpers `assert*` /
    //     `throw*` is what keeps that gap small.
    //
    // See: .claude/rules/conventions.md § "Assertions are dev-gated and live at the
    // point of use".
    // Fixture: `projects/forty-cdk/eslint-rules-fixtures/no-assertion-only-effect.fixture.ts`.
    //
    // Refs: tutkli/forty-cdk#1583, #1601
    'no-assertion-only-effect': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'An `effect()` must not be used as a validation channel: a body that only throws or calls `assert*` belongs at the invariant\'s point of use (.claude/rules/conventions.md § "Assertions are dev-gated and live at the point of use").',
        },
        schema: [],
        messages: {
          assertionOnly:
            'This `effect()` is a validation channel: its whole body is `{{ what }}`. A throw inside an `effect` never reaches the code that caused it — Angular routes it to the application `ErrorHandler`, so the stack names the scheduler rather than the binding at fault, the effect re-throws on every re-run, and a consumer with their own `ErrorHandler` sees nothing. Move the invariant to its point of use (the move / derivation that the invalid combination degrades) and throw from a dev-gated `assert*` helper there — from **every** such point, not just the first one you find. A render-time derivation additionally aborts the render, so the consumer can catch it; an event handler still routes to the `ErrorHandler`, and what you gain there is the attributable stack and the end of the re-throw. (.claude/rules/conventions.md § "Assertions are dev-gated and live at the point of use".)',
        },
      },
      create(context) {
        const ASSERT_CALLEE = /^[#]?(assert|throw)[A-Z]/;

        /** The callee's name for an `assert*` / `throw*` call, else `null`. */
        function assertionCallName(expression) {
          if (expression.type !== 'CallExpression') {
            return null;
          }
          const callee = expression.callee;
          if (callee.type === 'Identifier') {
            return ASSERT_CALLEE.test(callee.name) ? callee.name : null;
          }
          if (callee.type === 'MemberExpression' && !callee.computed) {
            const property = callee.property;
            const name =
              property.type === 'PrivateIdentifier'
                ? `#${property.name}`
                : property.type === 'Identifier'
                  ? property.name
                  : null;
            return name && ASSERT_CALLEE.test(name) ? name : null;
          }
          return null;
        }

        /**
         * Classifies a statement list into one of three outcomes, kept distinct
         * because conflating the last two is how a `{ return; }` dev guard reads
         * as real work: `false` — the body does work that is not assertion;
         * `null` — assertion-free but inert (guards, reads); a string naming
         * what was asserted (`'a throw'`, `'assertX(…)'`) otherwise.
         */
        function classify(statements) {
          let found = null;
          for (const statement of statements) {
            switch (statement.type) {
              case 'ThrowStatement':
                found ??= 'a throw';
                break;
              case 'EmptyStatement':
                break;
              case 'ReturnStatement':
                if (statement.argument) return false;
                break;
              case 'VariableDeclaration':
                break;
              case 'BlockStatement': {
                const inner = classify(statement.body);
                if (inner === false) return false;
                found ??= inner;
                break;
              }
              case 'IfStatement': {
                const branches = [statement.consequent, statement.alternate].filter(Boolean);
                for (const branch of branches) {
                  const inner = classify([branch]);
                  if (inner === false) return false;
                  found ??= inner;
                }
                break;
              }
              case 'ExpressionStatement': {
                const name = assertionCallName(statement.expression);
                if (name === null) return false;
                found ??= `${name}(…)`;
                break;
              }
              default:
                return false;
            }
          }
          return found;
        }

        /**
         * Whether the `effect(` sits inside a function whose own name starts with
         * `assert` — a reusable assertion scheduler rather than a primitive's
         * inline validation channel. See the design notes above.
         */
        function insideAssertionHelper(node) {
          for (let current = node.parent; current; current = current.parent) {
            let name = null;
            if (current.type === 'FunctionDeclaration' || current.type === 'FunctionExpression') {
              name = current.id?.name ?? null;
            } else if (current.type !== 'ArrowFunctionExpression') {
              continue;
            }
            const parent = current.parent;
            if (name === null && parent) {
              if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
                name = parent.id.name;
              } else if (
                (parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') &&
                !parent.computed
              ) {
                name = parent.key.type === 'Identifier' ? parent.key.name : null;
              }
            }
            if (name !== null && /^assert[A-Z]/.test(name)) {
              return true;
            }
          }
          return false;
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
            const statements =
              callback.body.type === 'BlockStatement'
                ? callback.body.body
                : [{ type: 'ExpressionStatement', expression: callback.body }];
            const what = classify(statements);
            if (typeof what !== 'string' || insideAssertionHelper(node)) return;
            context.report({ node, messageId: 'assertionOnly', data: { what } });
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
    //   - Fires when the config has no `disabled` at all, since the property is
    //     optional and its absence is the most complete form of the footgun.
    //   - The config is read from the object literal passed in, or from a
    //     `const` bound to one in the same function; any other argument fires,
    //     because its `disabled` cannot be checked.
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
          missingDisabled:
            '`injectHiddenInput` is called without a `disabled`, so the control’s value submits inside a disabled `[forFieldset]`. Pass `disabled: this.effectiveDisabled`. (tutkli/forty-cdk#695.)',
          opaqueConfig:
            '`injectHiddenInput` must receive an object literal, or a `const` bound to one in the same function, so its `disabled` can be checked: a config built anywhere else can omit `effectiveDisabled`, and the control’s value then submits inside a disabled `[forFieldset]`. (tutkli/forty-cdk#695.)',
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
        function resolveConfigLiteral(argument, call) {
          if (!argument) return null;
          if (argument.type === 'ObjectExpression') return argument;
          if (argument.type !== 'Identifier') return null;
          const callScope = context.sourceCode.getScope(call);
          let scope = callScope;
          let variable = null;
          while (scope && !variable) {
            variable = scope.set.get(argument.name) ?? null;
            scope = scope.upper;
          }
          if (!variable || variable.scope.variableScope !== callScope.variableScope) return null;
          if (variable.defs.length !== 1) return null;
          const [definition] = variable.defs;
          if (
            definition.type !== 'Variable' ||
            definition.parent.kind !== 'const' ||
            definition.node.init?.type !== 'ObjectExpression'
          ) {
            return null;
          }
          return definition.node.init;
        }
        return {
          CallExpression(node) {
            if (node.callee.type !== 'Identifier' || node.callee.name !== 'injectHiddenInput') {
              return;
            }
            const argument = node.arguments[0];
            const config = resolveConfigLiteral(argument, node);
            if (!config) {
              context.report({ node: argument ?? node, messageId: 'opaqueConfig' });
              return;
            }
            const disabledProp = config.properties.find(
              (p) =>
                p.type === 'Property' &&
                !p.computed &&
                ((p.key.type === 'Identifier' && p.key.name === 'disabled') ||
                  (p.key.type === 'Literal' && p.key.value === 'disabled')),
            );
            if (!disabledProp) {
              context.report({ node: argument, messageId: 'missingDisabled' });
              return;
            }
            if (referencesEffectiveDisabled(disabledProp.value)) return;
            context.report({ node: disabledProp, messageId: 'rawDisabled' });
          },
        };
      },
    },

    // Enforces .claude/rules/conventions.md § "ARIA state attribute emission" / `.claude/rules/conventions.md` §
    // "the truthy-only rule governs the *value*, not the *applicability*":
    // emitting an `aria-*` property on a role that does not support it is an
    // `aria-allowed-attr` violation. The state is simply not conveyed — the
    // attribute lands in the DOM, automated a11y tooling flags it, and the
    // primitive silently has no ARIA channel for the state it thinks it
    // announced. Both known instances (`aria-readonly` on nine hosts,
    // tutkli/forty-cdk#1472; on `[forRadio]`, #1393 item 13) were found by
    // hand, after passing tests had already pinned the invalid emission.
    //
    // The check is mechanical because the shape is uniform: a directive's
    // `host` block carries the literal `role: '<name>'` and the
    // `'[attr.aria-*]'` bindings in the same object literal, in the same file.
    //
    // Semantics:
    //   - Only `@Component` / `@Directive` decorators with an inline `host`
    //     object literal are considered.
    //   - The role comes from a static `role: '<name>'` in that `host` block,
    //     or — when there is none — from the element the selector pins, for
    //     the two elements whose role is statically decidable regardless of
    //     attributes: `<button>` (`button`) and `<textarea>` (`textbox`).
    //     `input[…]` and `select[…]` are deliberately absent: their role
    //     depends on `type` / `multiple` / `size`, which the selector does not
    //     constrain.
    //   - A `'[attr.role]'` binding skips the host — a dynamic role cannot be
    //     resolved statically — unless its expression is a single quoted
    //     string literal (`'"region"'`), which counts as a static role.
    //   - ARIA 1.2 global properties (`aria-label`, `aria-disabled`,
    //     `aria-busy`, …) are supported on every role and are never reported.
    //   - A role absent from `ROLE_SUPPORTED_ARIA_PROPERTIES` is skipped, so a
    //     primitive reaching for a new role cannot fail the build before its
    //     row is transcribed.
    //
    // The rule reports only: the correct resolution is a judgement call (drop
    // the emission and keep the `data-*` hook, or move it to the piece whose
    // role supports it), so there is no autofix.
    //
    // Fixture: `projects/forty-cdk/eslint-rules-fixtures/aria-attr-allowed-on-role.fixture.ts`.
    //
    // Refs: tutkli/forty-cdk#1476, #1472, #1393
    'aria-attr-allowed-on-role': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid aria-* host bindings on a role that does not support them (aria-allowed-attr).',
        },
        schema: [],
        messages: {
          unsupported:
            '`{{attr}}` is not a supported property of `role="{{role}}"`. ' +
            'Drop the emission (keep the `data-*` hook) or move it to the piece whose role supports it.',
        },
      },
      create(context) {
        const IMPLICIT_ROLE_BY_ELEMENT = { button: 'button', textarea: 'textbox' };

        function staticString(node) {
          return node && node.type === 'Literal' && typeof node.value === 'string'
            ? node.value
            : null;
        }
        function keyOf(property) {
          if (property.type !== 'Property' || property.computed) return null;
          if (property.key.type === 'Identifier') return property.key.name;
          if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
            return property.key.value;
          }
          return null;
        }
        function findProperty(objectExpression, name) {
          return objectExpression.properties.find((p) => keyOf(p) === name) ?? null;
        }
        // Resolves the implicit role only when every branch of a grouped
        // selector pins the same statically-decidable element; anything else
        // (a bare attribute selector, a custom element, a mixed group) leaves
        // the role unknown.
        function implicitRoleFromSelector(selector) {
          const branches = selector
            .split(',')
            .map((branch) => branch.trim())
            .filter(Boolean);
          if (!branches.length) return null;
          let resolved = null;
          for (const branch of branches) {
            const element = /^([a-z][a-z0-9-]*)/.exec(branch);
            const role = element ? IMPLICIT_ROLE_BY_ELEMENT[element[1]] : undefined;
            if (!role || (resolved !== null && resolved !== role)) return null;
            resolved = role;
          }
          return resolved;
        }
        return {
          Decorator(node) {
            const call = node.expression;
            if (call.type !== 'CallExpression' || call.callee.type !== 'Identifier') return;
            if (call.callee.name !== 'Component' && call.callee.name !== 'Directive') return;
            const metadata = call.arguments[0];
            if (!metadata || metadata.type !== 'ObjectExpression') return;
            const hostProperty = findProperty(metadata, 'host');
            if (!hostProperty || hostProperty.value.type !== 'ObjectExpression') return;
            const host = hostProperty.value;
            const boundRoleProperty = findProperty(host, '[attr.role]');
            const roleProperty = boundRoleProperty ?? findProperty(host, 'role');
            let role = roleProperty ? staticString(roleProperty.value) : null;
            if (boundRoleProperty && role !== null) {
              const constant = /^\s*(['"])([^'"]*)\1\s*$/.exec(role);
              role = constant ? constant[2] : null;
            }
            if (roleProperty && role === null) return;
            if (role === null) {
              const selectorProperty = findProperty(metadata, 'selector');
              const selector = selectorProperty ? staticString(selectorProperty.value) : null;
              role = selector === null ? null : implicitRoleFromSelector(selector);
            }
            if (role === null) return;
            role = role.trim();
            if (!Object.prototype.hasOwnProperty.call(ROLE_SUPPORTED_ARIA_PROPERTIES, role)) return;
            const supported = new Set(ROLE_SUPPORTED_ARIA_PROPERTIES[role]);

            for (const property of host.properties) {
              const key = keyOf(property);
              if (key === null) continue;
              const bound = /^\[attr\.(aria-[a-z-]+)\]$/.exec(key);
              const attr = bound ? bound[1] : /^aria-[a-z-]+$/.test(key) ? key : null;
              if (attr === null) continue;
              if (GLOBAL_ARIA_PROPERTIES.has(attr) || supported.has(attr)) continue;
              context.report({ node: property, messageId: 'unsupported', data: { attr, role } });
            }
          },
        };
      },
    },

    // Enforces `.claude/rules/conventions.md` § "the two channels are mutually
    // exclusive": a host that reflects its disabled state through the native
    // `disabled` attribute must not also emit `aria-disabled` for that same
    // state. The HTML attribute already maps to the unavailable state through
    // HTML-AAM, so the ARIA copy is read by nothing and leaves consumers two
    // selectors for one condition (tutkli/forty-cdk#1455, #1550).
    //
    // The rule became mechanisable only once #1550 closed the six native
    // form-element hosts: while they emitted both, no syntactic scan could
    // tell them from a trigger without a hand-maintained allowlist. It now
    // needs none, because the exemption is expressed as a condition:
    //
    //   - Only `@Component` / `@Directive` decorators with an inline `host`
    //     object literal carrying an `'[attr.aria-disabled]'` binding are
    //     considered.
    //   - The native channel is a `reflectDisabled(<signal>)` call anywhere in
    //     the decorated class body; the argument is normalized to its access
    //     path (`this.ctx.effectiveDisabled` → `ctx.effectiveDisabled`).
    //   - The binding is reported only when its expression references one of
    //     those very paths — i.e. the ARIA attribute restates the signal the
    //     native attribute already carries.
    //
    // That condition is what exempts the two legitimate doublers, by
    // construction rather than by name: `[forAccordionTrigger]` reflects
    // `item.disabled` natively while its `aria-disabled` reads `ariaDisabled()`
    // (the APG "expanded panel that refuses to collapse" state), and
    // `[forFieldset]` reflects `nativeDisabled` while its ARIA branch reads
    // `!isNativeFieldset && disabled()` — a host that by definition never
    // takes the native attribute.
    //
    // Two shapes stay out of reach, both guarded instead by the `disabled`
    // branch of `assertFormControlContract`: `[forOtpInput]` writes both
    // channels imperatively (`toggleAttribute('disabled', …)` next to
    // `setAttr(el, 'aria-disabled', …)`) onto an injected input, which no host
    // block sees; and `[forInput]` / `[forTextarea]` / `[forSearch]` call
    // `reflectDisabled` from `TextValueControlBase` rather than their own
    // bodies, so a single-file scan cannot see their native channel. Catching
    // the shape people actually write beats catching nothing.
    //
    // The rule reports only: dropping the emission vs. re-expressing the ARIA
    // condition is a judgement call, so there is no autofix.
    //
    // Fixture: `projects/forty-cdk/eslint-rules-fixtures/no-doubled-disabled-reflection.fixture.ts`.
    //
    // Refs: tutkli/forty-cdk#1550, #1455, #561
    'no-doubled-disabled-reflection': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid an `aria-disabled` host binding that restates the signal the same class reflects through the native `disabled` attribute.',
        },
        schema: [],
        messages: {
          doubled:
            '`aria-disabled` restates `{{signal}}`, which this class already reflects through the native `disabled` attribute. ' +
            'Drop the binding — the native attribute exposes the state through HTML-AAM and `data-disabled=""` stays as the styling hook. (tutkli/forty-cdk#1550.)',
        },
      },
      create(context) {
        function keyOf(property) {
          if (property.type !== 'Property' || property.computed) return null;
          if (property.key.type === 'Identifier') return property.key.name;
          if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
            return property.key.value;
          }
          return null;
        }
        function findProperty(objectExpression, name) {
          return objectExpression.properties.find((p) => keyOf(p) === name) ?? null;
        }
        // Normalizes a signal reference to a dotted access path, dropping a
        // leading `this` so it lines up with the template syntax used inside a
        // host binding string: `this.ctx.effectiveDisabled` → `ctx.effectiveDisabled`.
        function accessPath(node) {
          const parts = [];
          let current = node;
          while (current && current.type === 'MemberExpression' && !current.computed) {
            if (current.property.type !== 'Identifier') return null;
            parts.unshift(current.property.name);
            current = current.object;
          }
          if (!current) return null;
          if (current.type === 'ThisExpression') return parts.length ? parts.join('.') : null;
          if (current.type === 'Identifier') {
            parts.unshift(current.name);
            return parts.join('.');
          }
          return null;
        }
        function nativelyReflectedSignals(classNode) {
          const paths = new Set();
          const stack = [classNode.body];
          while (stack.length) {
            const current = stack.pop();
            if (!current || typeof current !== 'object') continue;
            if (Array.isArray(current)) {
              for (const item of current) stack.push(item);
              continue;
            }
            if (!current.type) continue;
            if (
              current.type === 'CallExpression' &&
              current.callee.type === 'Identifier' &&
              current.callee.name === 'reflectDisabled'
            ) {
              const path = accessPath(current.arguments[0]);
              if (path !== null) paths.add(path);
            }
            for (const key in current) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              stack.push(current[key]);
            }
          }
          return paths;
        }
        // Access paths read by a host-binding expression, with string literals
        // stripped first so a `"true"` value never reads as an identifier.
        function referencedPaths(expression) {
          const withoutLiterals = expression.replace(/'[^']*'|"[^"]*"/g, ' ');
          return withoutLiterals.match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g) ?? [];
        }
        return {
          Decorator(node) {
            const call = node.expression;
            if (call.type !== 'CallExpression' || call.callee.type !== 'Identifier') return;
            if (call.callee.name !== 'Component' && call.callee.name !== 'Directive') return;
            const metadata = call.arguments[0];
            if (!metadata || metadata.type !== 'ObjectExpression') return;
            const hostProperty = findProperty(metadata, 'host');
            if (!hostProperty || hostProperty.value.type !== 'ObjectExpression') return;
            const binding = findProperty(hostProperty.value, '[attr.aria-disabled]');
            if (!binding) return;
            const expression =
              binding.value.type === 'Literal' && typeof binding.value.value === 'string'
                ? binding.value.value
                : null;
            if (expression === null) return;
            const classNode = node.parent;
            if (!classNode || !classNode.body) return;

            const reflected = nativelyReflectedSignals(classNode);
            if (!reflected.size) return;
            const doubled = referencedPaths(expression).find((path) => reflected.has(path));
            if (doubled === undefined) return;
            context.report({ node: binding, messageId: 'doubled', data: { signal: doubled } });
          },
        };
      },
    },

    // Enforces `.claude/rules/conventions.md` § "A live region declares exactly
    // one channel": a host carrying a live `role` must not restate the
    // `aria-live` / `aria-atomic` values that role already implies. The role
    // and the attribute pair are two spellings of the same semantics, so a
    // host declaring both leaves a reader with no way to tell which one the
    // primitive means (tutkli/forty-cdk#1598 item 2, #1626).
    //
    // Semantics — the same host-block scan as `aria-attr-allowed-on-role`:
    //   - Only `@Component` / `@Directive` decorators with an inline `host`
    //     object literal are considered.
    //   - The role comes from a static `role: '<name>'` in that block. A
    //     `'[attr.role]'` binding skips the host: a bound role is a switch,
    //     not a declaration, which is exactly what exempts `[forToast]` by
    //     construction — it flips between `status` / `alert` while its bound
    //     `aria-live` goes to `off` for every variant announced through
    //     `LiveAnnouncer`.
    //   - Only a *static* `aria-live` / `aria-atomic` whose literal value
    //     equals the one the role implies is reported. A bound attribute is a
    //     switch, and a static value that *differs* from the implied one is a
    //     deliberate override (`role="log"` + `aria-atomic="true"`), not a
    //     doubling.
    //   - A role absent from `ROLE_IMPLIED_LIVE_REGION` is skipped, so a
    //     primitive reaching for a new live role cannot fail the build before
    //     its row is transcribed.
    //
    // The rule reports only: which channel survives is a judgement call the
    // JSDoc has to record either way — the role is read reliably when a region
    // is inserted with its text already present, the attribute pair suits a
    // region that exists, empty, before its text changes.
    //
    // Fixture: `projects/forty-cdk/eslint-rules-fixtures/no-doubled-live-region-channel.fixture.ts`.
    //
    // Refs: tutkli/forty-cdk#1626, #1598
    'no-doubled-live-region-channel': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid a static `aria-live` / `aria-atomic` host attribute that restates what the host’s live `role` already implies.',
        },
        schema: [],
        messages: {
          doubled:
            '`{{attr}}="{{value}}"` is what `role="{{role}}"` already implies, so this host declares its live-region semantics twice. ' +
            'Keep one channel and say why in the JSDoc: the role (read reliably when the region is inserted with its text already present) ' +
            'or the `aria-live` + `aria-atomic` pair (for a region that exists, empty, before its text changes). (tutkli/forty-cdk#1626.)',
        },
      },
      create(context) {
        // Implicit `aria-live` / `aria-atomic` values of the ARIA 1.2 live
        // roles (https://www.w3.org/TR/wai-aria-1.2/#alert, #log, #marquee,
        // #status, #timer).
        const ROLE_IMPLIED_LIVE_REGION = {
          alert: { 'aria-live': 'assertive', 'aria-atomic': 'true' },
          log: { 'aria-live': 'polite', 'aria-atomic': 'false' },
          marquee: { 'aria-live': 'off', 'aria-atomic': 'false' },
          status: { 'aria-live': 'polite', 'aria-atomic': 'true' },
          timer: { 'aria-live': 'off', 'aria-atomic': 'false' },
        };

        function staticString(node) {
          return node && node.type === 'Literal' && typeof node.value === 'string'
            ? node.value
            : null;
        }
        function keyOf(property) {
          if (property.type !== 'Property' || property.computed) return null;
          if (property.key.type === 'Identifier') return property.key.name;
          if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
            return property.key.value;
          }
          return null;
        }
        function findProperty(objectExpression, name) {
          return objectExpression.properties.find((p) => keyOf(p) === name) ?? null;
        }
        return {
          Decorator(node) {
            const call = node.expression;
            if (call.type !== 'CallExpression' || call.callee.type !== 'Identifier') return;
            if (call.callee.name !== 'Component' && call.callee.name !== 'Directive') return;
            const metadata = call.arguments[0];
            if (!metadata || metadata.type !== 'ObjectExpression') return;
            const hostProperty = findProperty(metadata, 'host');
            if (!hostProperty || hostProperty.value.type !== 'ObjectExpression') return;
            const host = hostProperty.value;
            if (findProperty(host, '[attr.role]')) return;

            const roleProperty = findProperty(host, 'role');
            const role = roleProperty ? staticString(roleProperty.value)?.trim() : null;
            if (!role) return;
            const implied = Object.prototype.hasOwnProperty.call(ROLE_IMPLIED_LIVE_REGION, role)
              ? ROLE_IMPLIED_LIVE_REGION[role]
              : null;
            if (implied === null) return;

            for (const attr of ['aria-live', 'aria-atomic']) {
              const property = findProperty(host, attr);
              if (!property) continue;
              const value = staticString(property.value)?.trim();
              if (value !== implied[attr]) continue;
              context.report({ node: property, messageId: 'doubled', data: { attr, value, role } });
            }
          },
        };
      },
    },

    'namespaced-css-custom-property': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid a raw `--for-*` custom property name in a string the compiler does not rewrite, so every name follows `provideCssVarNamespacing()`.',
        },
        schema: [],
        messages: {
          raw:
            'This string names a `--for-*` custom property the compiler never sees, so it keeps the raw name while the host bindings and the consumer’s component styles are namespaced under `provideCssVarNamespacing()`. ' +
            'Resolve the name through `inject(CssVarNamespacer).namespace(…)` from `@angular/platform-browser`, or publish it with a `[style.--for-…]` host binding. (tutkli/forty-cdk#2480.)',
        },
      },
      create(context) {
        const RAW_NAME = /^--for-/;
        const RAW_VAR = /var\(\s*--for-/;
        function isNamespaced(node) {
          const parent = node.parent;
          return (
            parent?.type === 'CallExpression' &&
            parent.arguments[0] === node &&
            parent.callee.type === 'MemberExpression' &&
            !parent.callee.computed &&
            parent.callee.property.type === 'Identifier' &&
            parent.callee.property.name === 'namespace'
          );
        }
        return {
          Literal(node) {
            if (typeof node.value !== 'string') return;
            if (RAW_VAR.test(node.value) || (RAW_NAME.test(node.value) && !isNamespaced(node))) {
              context.report({ node, messageId: 'raw' });
            }
          },
          TemplateLiteral(node) {
            if (node.parent?.type === 'TaggedTemplateExpression') return;
            const head = node.quasis[0].value.raw;
            if (
              node.quasis.some((quasi) => RAW_VAR.test(quasi.value.raw)) ||
              (RAW_NAME.test(head) && !isNamespaced(node))
            ) {
              context.report({ node, messageId: 'raw' });
            }
          },
        };
      },
    },

    'no-runtime-dev-mode-check': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid `isDevMode()` in library source, so every dev-only branch folds away in a consumer production build.',
        },
        schema: [],
        messages: {
          runtime:
            '`isDevMode()` is a runtime call a bundler cannot evaluate, so every branch it gates ships in a consumer’s production build and never runs. ' +
            "Gate inline on `typeof ngDevMode === 'undefined' || ngDevMode` (or `typeof ngDevMode !== 'undefined' && !ngDevMode` for an early return), which the Angular CLI folds to a constant. " +
            '(.claude/rules/conventions.md § "Assertions are dev-gated and live at the point of use"; tutkli/forty-cdk#2584.)',
        },
      },
      create(context) {
        return {
          'ImportDeclaration[source.value="@angular/core"] > ImportSpecifier[imported.name="isDevMode"]'(
            node,
          ) {
            context.report({ node, messageId: 'runtime' });
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
      'out-tsc/**',
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
      // always fail. Use `pnpm check:rule-fixtures` to confirm each rule
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
              name: '@angular/core',
              importNames: ['Input', 'Output'],
              message:
                'Use signal-based input() / input.required() / output() / model() instead of @Input() / @Output() decorators (CLAUDE.md).',
            },
            {
              name: '@angular/core',
              importNames: ['HostBinding', 'HostListener'],
              message:
                'Use the `host: { ... }` block in @Component / @Directive metadata instead of @HostBinding / @HostListener (CLAUDE.md).',
            },
            {
              name: '@angular/core',
              importNames: ['NgModule'],
              message: 'NgModule is banned. forty-cdk is standalone-only (CLAUDE.md).',
            },
            {
              name: '@angular/core',
              importNames: ['NgZone'],
              message: 'NgZone is banned. forty-cdk must run zoneless (CLAUDE.md).',
            },
            {
              name: '@angular/forms',
              importNames: ['ControlValueAccessor', 'NG_VALUE_ACCESSOR'],
              message:
                'ControlValueAccessor / NG_VALUE_ACCESSOR are banned: a form primitive implements the matching `@angular/forms/signals` interface so `[formField]` wires it (CLAUDE.md § "Form primitives use Signal Forms, never ControlValueAccessor").',
            },
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

      // ---- Banned syntax (decorators, NgModule, dynamic imports, type-suffixed class names) ----
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
          selector:
            ':matches(ClassDeclaration, ClassExpression)[id.name=/(Service|Component|Directive)$/], VariableDeclarator[id.name=/(Service|Component|Directive)$/][init.type="ClassExpression"]',
          message:
            'Class names must not end in `Service`, `Component`, or `Directive`. Name classes for what they represent (CLAUDE.md).',
        },
        {
          selector:
            'ImportExpression[source.value=/^(@angular\\/(cdk|material|aria)|zone\\.js)(\\/|$)/]',
          message:
            'Banned by CLAUDE.md — a dynamic `import()` of `@angular/cdk`, `@angular/material`, `@angular/aria` or `zone.js` loads the package as surely as a static one.',
        },
        // ---- ARIA truthy-only attributes must be `null` when false, not `"false"` ----
        // Per .claude/rules/conventions.md § "ARIA state attribute emission", these attributes default to
        // their falsy state when absent; emitting `aria-required="false"` (etc.) forces
        // consumers to write `[aria-required="false"]` selectors that fight the spec.
        // Canonical Angular host binding: `'[attr.aria-disabled]': 'disabled() ? "true" : null'`.
        // The first selector matches a Property whose key is the host-binding for one of
        // the truthy-only attributes (string literal `[attr.aria-<name>]`) and whose value
        // string holds a quoted `false` in either quote style (the wrong falsy branch).
        // The second matches the same keys when the value names no `null` at all: Angular
        // removes an attribute only for `null` / `undefined` and stringifies `false`, so a
        // bare boolean binding renders `"false"` too. `aria-haspopup` is left out of the
        // second because its token form (`'"menu"'`) is always present.
        {
          selector:
            'Property[key.value=/^\\[attr\\.aria-(disabled|readonly|required|invalid|busy|modal|haspopup|multiselectable)\\]$/][value.value=/[\'"]false[\'"]/]',
          message:
            'ARIA truthy-only attributes must be `null` when false, not `"false"`. Use `cond() ? "true" : null` (.claude/rules/conventions.md § "ARIA state attribute emission").',
        },
        {
          selector:
            'Property[key.value=/^\\[attr\\.aria-(disabled|readonly|required|invalid|busy|modal|multiselectable)\\]$/][value.type="Literal"][value.value!=/null|[\'"]false[\'"]/]',
          message:
            'ARIA truthy-only attributes must bind `null` on their falsy branch: Angular stringifies `false`, so a bare boolean binding renders `"false"`. Use `cond() ? "true" : null` (.claude/rules/conventions.md § "ARIA state attribute emission").',
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
            'A static `type: "button"` host attribute is banned: it is invalid on a non-button host and a consumer `type="submit"` beats it. Use the `hostButtonType()` core seam host-bound as `\'[attr.type]\': \'buttonType()\'` (.claude/rules/conventions.md § "Forcing type=button").',
        },
        {
          selector:
            'TryStatement[handler][block.body.length=1] > .block CallExpression[callee.name="inject"]:not(:matches(ArrowFunctionExpression, FunctionExpression) > CallExpression)',
          message:
            'A `try` / `catch` around a lone `inject(…)` to detect an injection context is banned: the catch is unbounded, so it also swallows a genuine DI failure from that call, and Angular 22 exports no predicate to replace it (`isInInjectionContext` is internal; `assertInInjectionContext` throws). Require the context and let `inject` raise NG0203, or take the dependency as a parameter (tutkli/forty-cdk#1585).',
        },
      ],

      // ---- Filename convention ----
      'forty-cdk/no-suffixed-filenames': 'error',

      // ---- Defaults stub convention (.claude/rules/conventions.md § "Defaults providers") ----
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
      // item 3; .claude/rules/conventions.md § "The sanctioned-effect marker"). ----
      'forty-cdk/require-sanctioned-effect-marker': 'error',
      // ---- …and the pull half: an effect that exists to force a lazy store to
      // run names the store it primes and stays read-only
      // (tutkli/forty-cdk#1602; .claude/rules/conventions.md § "The sanctioned-pull marker"). ----
      'forty-cdk/require-sanctioned-pull-marker': 'error',
      // ---- …and the third thing an effect gets misused for: validation. A
      // throw inside an effect reaches the `ErrorHandler`, never the consumer
      // (tutkli/forty-cdk#1583; .claude/rules/conventions.md § "Assertions are dev-gated and live
      // at the point of use"). ----
      'forty-cdk/no-assertion-only-effect': 'error',

      // ---- injectHiddenInput must pass `effectiveDisabled`, not raw
      // `disabled`, when the control folds in fieldset-disabled
      // (tutkli/forty-cdk#695, #728, #741). ----
      'forty-cdk/hidden-input-effective-disabled': 'error',

      // ---- `aria-*` host bindings must be supported by the host's role
      // (`aria-allowed-attr`; tutkli/forty-cdk#1476, #1472, #1393 item 13). ----
      'forty-cdk/aria-attr-allowed-on-role': 'error',

      // ---- A host reflecting native `disabled` must not also emit
      // `aria-disabled` for that same state (tutkli/forty-cdk#1550, #1455,
      // #561 D2). ----
      'forty-cdk/no-doubled-disabled-reflection': 'error',

      // ---- A live region declares exactly one channel: a live `role` or the
      // `aria-live` + `aria-atomic` pair, never both (tutkli/forty-cdk#1626,
      // #1598 item 2). ----
      'forty-cdk/no-doubled-live-region-channel': 'error',

      'forty-cdk/namespaced-css-custom-property': 'error',

      'forty-cdk/no-runtime-dev-mode-check': 'error',

      // ---- Test isolation invariants (see @forty-cdk-test-isolation-rules
      // block above; .claude/rules/testing.md § "Test isolation — non-negotiables"). ----
      'forty-cdk/no-bare-whenstable': 'error',
      'forty-cdk/no-prototype-rect-stub': 'error',
      'forty-cdk/observer-polyfill-must-restore': 'error',
      'forty-cdk/scoped-fake-timers': 'error',
      'forty-cdk/no-directive-internal-signal-read': 'error',
      'forty-cdk/no-floating-flush': 'error',
      'forty-cdk/require-overlay-cleanup': 'error',
      'forty-cdk/no-redundant-not-tobenull': 'error',
      'forty-cdk/no-bare-detect-changes': 'error',
      'forty-cdk/no-async-tothrow': 'error',

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
      // A `computed` / `effect` that reads no signal never re-runs: it is either
      // a constant wearing a reactive type or a dependency the author thought
      // they tracked. A constant is a plain `readonly` field, or
      // `signal(…).asReadonly()` where the API types it as a `Signal`.
      '@angular-eslint/reactive-context-must-read-signal': 'error',
      // Off on purpose. The rule wants every `inject()` field above every other
      // member; the library instead declares an injection beside the state it
      // feeds, and its own `inject*` helpers (`injectAccordionContext`,
      // `injectHovered`, …) sit among the inputs they read. Taught those
      // helpers (`additionalInjectFunctions`), the rule reports 207 library
      // sites with no autofix, for a hazard that cannot ship silently: reading an
      // injected field before it is initialized throws at construction, and every
      // primitive is constructed by its spec and by the SSR sweep (#2490).
      '@angular-eslint/inject-at-top': 'off',
    },
  },

  {
    files: ['projects/forty-cdk/**/*.ts'],
    ignores: NON_SHIPPING_LIBRARY_SOURCES,
    rules: {
      '@typescript-eslint/no-restricted-imports': optionalPeerValueImportBan(null),
    },
  },

  ...Object.entries(OPTIONAL_PEER_ENTRY_POINTS).map(([peer, entryPoint]) => ({
    files: [`projects/forty-cdk/${entryPoint}/**/*.ts`],
    ignores: NON_SHIPPING_LIBRARY_SOURCES,
    rules: {
      '@typescript-eslint/no-restricted-imports': optionalPeerValueImportBan(peer),
    },
  })),

  // ---------- Spec / test-utility relaxations ----------
  // `src/lib/ssr/fixtures/**` holds the SSR smoke suite's fixture components and
  // its registry — spec support that is not itself a `.spec.ts` (#1594);
  // `src/lib/static-adoption/fixtures/**` is the same shape for the
  // static-attribute adoption sweep (#1597). Both are excluded from
  // `tsconfig.lib.json` for the same reason: nothing there ships.
  {
    files: NON_SHIPPING_LIBRARY_SOURCES,
    rules: {
      // Test harness components don't need to follow the public selector convention.
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',
      // Tests sometimes need explicit `any` for intentionally-broken inputs.
      '@typescript-eslint/no-explicit-any': 'off',
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
      // Same for the pull ledger: a spec that primes a store from an `effect()`
      // is asserting the pull's behaviour, not shipping one.
      'forty-cdk/require-sanctioned-pull-marker': 'off',
      // A spec that throws from an `effect()` is *modelling* the anti-pattern
      // (or a consumer's own code) to assert how it surfaces; it ships no
      // validation channel a consumer inherits.
      'forty-cdk/no-assertion-only-effect': 'off',
      'forty-cdk/namespaced-css-custom-property': 'off',
      'forty-cdk/no-runtime-dev-mode-check': 'off',
      // A spec that records when the scheduler first runs an `effect()` or
      // `afterRenderEffect()` reads no signal on purpose: it is probing the run,
      // not deriving state.
      '@angular-eslint/reactive-context-must-read-signal': 'off',
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
      // Dev/CI-only app: nothing here ships, so it owes no carve-out ledger.
      'forty-cdk/require-sanctioned-effect-marker': 'off',
      'forty-cdk/require-sanctioned-pull-marker': 'off',
      'forty-cdk/no-assertion-only-effect': 'off',
      'forty-cdk/namespaced-css-custom-property': 'off',
      'forty-cdk/no-runtime-dev-mode-check': 'off',
    },
  },

  {
    files: ['projects/forty-cdk-docs/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',
      'forty-cdk/require-sanctioned-effect-marker': 'off',
      'forty-cdk/require-sanctioned-pull-marker': 'off',
      'forty-cdk/no-assertion-only-effect': 'off',
      'forty-cdk/namespaced-css-custom-property': 'off',
      'forty-cdk/no-runtime-dev-mode-check': 'off',
    },
  },

  // ---------- Playwright E2E specs + root config ----------
  // These run inside @playwright/test (Node + browser), not Angular. They
  // freely poke at `document`/`window` via page.evaluate, and there is no
  // SSR concern. Typed linting stays off here by choice, not for want of a
  // project: since #1758 they are covered by
  // `projects/forty-cdk-harness/tsconfig.e2e.json`, which `pnpm typecheck`
  // runs, so the compiler already gates them. Pointing ESLint at that project
  // would switch the whole type-aware rule set on over 84 files at once —
  // its own change, with its own fallout, rather than a rider on the gate.
  {
    files: ['projects/forty-cdk-harness/e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: null,
      },
    },
    rules: {
      // Needs type information, which this block switches off.
      '@angular-eslint/reactive-context-must-read-signal': 'off',
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

  {
    files: ['projects/forty-cdk-harness/e2e/**/*.e2e.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              importNames: ['test', 'expect'],
              message:
                "Import `test` and `expect` from './_helpers': its `test` gates every test on the harness errors it raises.",
            },
          ],
        },
      ],
    },
  },

  // ---------- ESLint rule fixtures (typed-parsing override) ----------
  // The fixtures are listed in the top-level `ignores` block so `pnpm lint`
  // skips them by default (each one intentionally violates exactly one
  // `forty-cdk/*` test-isolation rule). This override exists for the
  // explicit `pnpm check:rule-fixtures` script: it disables typed linting
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
      // Needs type information, which this block switches off.
      '@angular-eslint/reactive-context-must-read-signal': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
      // Off by default here: the `no-effect-state-propagation` fixture writes
      // signals inside `effect()` on purpose, and the "exactly one rule per
      // fixture" invariant this directory documents would break if a second
      // rule fired on it. Re-enabled below for this rule's own fixture.
      'forty-cdk/require-sanctioned-effect-marker': 'off',
      // Same treatment for the pull marker: its own fixture pulls a store from
      // an unmarked `effect()` on purpose, and the sanctioned-effect fixture
      // would otherwise be a second rule's target too.
      'forty-cdk/require-sanctioned-pull-marker': 'off',
      // And the validation-channel rule: the sanctioned-effect / pull fixtures
      // both contain bare `effect()` bodies it would classify.
      'forty-cdk/no-assertion-only-effect': 'off',
      'forty-cdk/namespaced-css-custom-property': 'off',
    },
  },

  {
    files: ['projects/forty-cdk/eslint-rules-fixtures/require-sanctioned-effect-marker.fixture.ts'],
    rules: {
      'forty-cdk/require-sanctioned-effect-marker': 'error',
    },
  },

  {
    files: ['projects/forty-cdk/eslint-rules-fixtures/no-assertion-only-effect.fixture.ts'],
    rules: {
      'forty-cdk/no-assertion-only-effect': 'error',
    },
  },

  {
    files: ['projects/forty-cdk/eslint-rules-fixtures/require-sanctioned-pull-marker.fixture.ts'],
    rules: {
      'forty-cdk/require-sanctioned-pull-marker': 'error',
    },
  },

  {
    files: ['projects/forty-cdk/eslint-rules-fixtures/namespaced-css-custom-property.fixture.ts'],
    rules: {
      'forty-cdk/namespaced-css-custom-property': 'error',
    },
  },

  // ---------- Repo-root Vitest config ----------
  // Loaded by the `@angular/build:unit-test` builder via `runnerConfig: true`.
  // Lives outside any Angular tsconfig project (the library's tsconfig.spec.json
  // only includes `src/**`), so disable typed linting to avoid adding it to a
  // project just for ESLint — matching the playwright.config.ts treatment above.
  {
    files: ['vitest-base.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: null,
      },
    },
    rules: {
      // Needs type information, which this block switches off.
      '@angular-eslint/reactive-context-must-read-signal': 'off',
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
      '@angular-eslint/template/elements-content': ['error', { allowList: ['ariaLabel'] }],
      '@angular-eslint/template/prefer-style-binding': 'error',
      // A `@switch` over a union closes with `@default never;`, so the template
      // type-check fails when a member gains no `@case`. The check narrows only
      // a stable value: switch on a `@let` (`@let view = cal.view();`), never on
      // the signal call itself, which every clause re-reads unnarrowed. Over a
      // discriminated union, check the object: `@default never(block);`.
      '@angular-eslint/template/require-switch-default': 'error',
    },
  },

  {
    files: ['**/*.html'],
    ignores: ['**/*.ts/**'],
    plugins: { 'forty-cdk': fortyCdkPlugin },
    rules: {
      'forty-cdk/no-suffixed-filenames': 'error',
    },
  },

  // ---------- Inline templates extracted from spec files ----------
  // The angular-eslint processor extracts inline `template:` strings into virtual
  // files appended as a sub-path of the parent .ts file (e.g.
  // `…/switch.spec.ts/1_inline-template-switch.spec.ts-1.component.html`). We
  // mirror the spec relaxations so harness templates that render bare `<button
  // forX>` triggers (no visible text) don't trip a11y rules meant for
  // production HTML.
  // The SSR smoke suite's fixture modules (#1594) and the static-attribute
  // adoption sweep's (#1597) carry the same harness templates without being
  // `.spec.ts` themselves, so they need the same entry. Registering the folder
  // in the `.ts` relaxation above is not enough: the processor names the
  // extracted template as a sub-path of the parent `.ts`, so only a `**/*.html`
  // pattern reaches it, and a template rule set in a `.ts` block never applies.
  // The E2E harness app and the documentation site are deliberately absent:
  // their templates are what a real browser drives and what a consumer copies,
  // so they keep the full template rule set.
  {
    files: [
      '**/*.spec.ts/**/*.html',
      'projects/forty-cdk/src/lib/ssr/fixtures/**/*.ts/**/*.html',
      'projects/forty-cdk/src/lib/static-adoption/fixtures/**/*.ts/**/*.html',
    ],
    rules: {
      '@angular-eslint/template/elements-content': 'off',
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/label-has-associated-control': 'off',
      '@angular-eslint/template/role-has-required-aria': 'off',
    },
  },
);
