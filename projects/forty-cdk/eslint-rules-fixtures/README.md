# forty-cdk ESLint rule fixtures

Each `*.fixture.ts` file in this directory intentionally violates exactly one
`forty-cdk/*` rule defined in [`eslint.config.js`](../../../eslint.config.js)
(the seven test-isolation rules in the `@forty-cdk-test-isolation-rules` block,
plus `no-effect-state-propagation`, `require-defaults-sibling`,
`no-unused-defaults-sibling`, `require-host-directive-sibling`,
`hidden-input-effective-disabled`, `aria-attr-allowed-on-role`, and
`require-sanctioned-effect-marker`). They
are documentation-as-code: by linting them with the rule _enabled_ you can
verify it fires.

The fixtures are deliberately:

- Outside `projects/forty-cdk/src/` so Vitest's spec discovery
  (`src/**/*.spec.ts`) never picks them up.
- Outside every Angular `tsconfig.*.json` `include`, so the typed-linting layer
  (`projectService: true`) does not parse them. An override in
  `eslint.config.js` disables `parserOptions.projectService` for this directory.
- Named `*.fixture.ts` (not `*.spec.ts`) so they are unmistakable.

To verify the rules:

```sh
pnpm lint:rule-fixtures
```

That script runs `eslint --no-ignore` against this directory. The fixtures
intentionally violate the rules, so the script exits non-zero — that's the
signal the rules are wired up. The expected violation breakdown is:

- `no-bare-whenstable.fixture.ts` — 1 error.
- `no-prototype-rect-stub.fixture.ts` — 2 errors (assignment + `defineProperty` forms).
- `observer-polyfill-must-restore.fixture.ts` — 1 error.
- `scoped-fake-timers.fixture.ts` — 1 warning (Rule 4 is `warn`, not `error`).
- `no-directive-internal-signal-read.fixture.ts` — 1 error.
- `no-floating-flush.fixture.ts` — 3 errors (the three floating `flush()` / `flushPositioning()` / `nextMacrotask()` statements; the three `await`ed calls that follow are the correct shape and are not flagged).
- `require-overlay-cleanup.fixture.ts` — 1 error (imports a portaling overlay content directive with no `afterEachOverlayCleanup()` call in the file; the rule is file-level, so the compliant shape can't be shown in the same fixture).
- `no-effect-state-propagation.fixture.ts` — 2 errors (the `.set` and `.update` read-and-write forms).
- `require-sanctioned-effect-marker.fixture.ts` — 3 errors (the two unmarked signal writes, plus a bare `@sanctioned-effect` reported as malformed; the well-formed marker, the DOM-only effect, and the nested-callback write are all allowed). This rule is turned **off** for the rest of this directory and re-enabled for this file alone: `no-effect-state-propagation.fixture.ts` writes signals inside `effect()` on purpose, so leaving it on would break the one-rule-per-fixture invariant above.
- `require-defaults-sibling.fixture.ts` — 1 error (no `require-defaults-sibling.fixture-defaults.ts` sibling exists next to it).
- `no-unused-defaults-sibling.fixture.ts` — 1 error (exports a defaults token no non-defaults, non-spec sibling injects; the reverse direction of `require-defaults-sibling`). A co-located support file [`public-api.ts`](public-api.ts) re-exports that token by name, modelling the entry barrel every real primitive has — the fixture must still fire despite it, proving the rule treats a barrel re-export as _not_ a consumer (re-exporting ≠ injecting).
- `require-host-directive-sibling.fixture.ts` — 3 errors (direct `FormValueControl`, the `Omit<FormValueControl<…>, …>` slider shape, and `FormCheckboxControl`; the abstract base is allowed).
- `aria-attr-allowed-on-role.fixture.ts` — 3 errors (`aria-readonly` on `role="group"`, `aria-checked` on an explicit `role="button"`, and `aria-checked` on the implicit `button[…]` role; the supported placements, the global properties, the unresolvable `input[…]` selector, a dynamic `'[attr.role]'`, and an untranscribed role are all allowed).
- `hidden-input-effective-disabled.fixture.ts` — 2 errors (an in-body `effectiveDisabled` control and a control inheriting it from `FormUiControlBase`, both passing the raw `disabled` to `injectHiddenInput`; the `this.effectiveDisabled` case and the wrapped `computed(() => this.effectiveDisabled() || …)` case are allowed).

The default `pnpm lint` ignores this directory (configured at the top of
`eslint.config.js`) so CI doesn't pick up these intentional violations.

Each fixture begins with a block-comment header naming the rule it exercises
and links back to `CLAUDE.md` → "Test isolation — non-negotiables".
