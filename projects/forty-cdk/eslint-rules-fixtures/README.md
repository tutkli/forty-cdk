# forty-cdk ESLint rule fixtures

Each `*.fixture.ts` file in this directory intentionally violates exactly one
`forty-cdk/*` rule defined in [`eslint.config.js`](../../../eslint.config.js)
(the seven test-isolation rules in the `@forty-cdk-test-isolation-rules` block,
plus `no-effect-state-propagation`, `require-defaults-sibling`,
`no-unused-defaults-sibling`, `require-host-directive-sibling`,
`hidden-input-effective-disabled`, `aria-attr-allowed-on-role`,
`no-doubled-disabled-reflection`,
`require-sanctioned-effect-marker`, and
`require-sanctioned-pull-marker`). They
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
- `no-floating-flush.fixture.ts` — 4 errors (the four floating `flush()` / `flushPositioning()` / `nextMacrotask()` / `settleHydration()` statements — the last being the `ApplicationRef` drain a real SSR → hydration round trip needs, added in #1582; the four `await`ed calls that follow are the correct shape and are not flagged).
- `require-overlay-cleanup.fixture.ts` — 1 error (imports a portaling overlay content directive with no `afterEachOverlayCleanup()` call in the file; the rule is file-level, so the compliant shape can't be shown in the same fixture).
- `no-effect-state-propagation.fixture.ts` — 4 errors (the `.set` and `.update` read-and-write forms, plus the two one-level helper-call shapes added in #1575: a module-level function and a `this.#sync()` method, each assembling the cycle entirely inside the helper. The `untracked()` helper, the write-only helper — the `core/element-size` carve-out shape — a method on an injected collaborator, and the two-argument `.set(k, v)` on a deliberately contrived callable receiver (#1606 — the only shape this rule's same-receiver pairing could have misread) are all allowed, the collaborator one being the documented cross-file residual gap).
- `require-sanctioned-effect-marker.fixture.ts` — 6 errors (the two unmarked signal writes, a bare `@sanctioned-effect` reported as malformed, the two one-level helper-call shapes added in #1575 — a module-level function and a `this.#sync()` method — plus the #1606 anchoring case: a JSDoc block quoting the marker does not license the unmarked write below it, since only a line comment starting with the phrase is a marker. Allowed: the well-formed marker, the DOM-only effect, the nested-callback write, the same helper call carrying a marker, and the two-argument `Map.set(k, v)` the arity check skips). This rule is turned **off** for the rest of this directory and re-enabled for this file alone: `no-effect-state-propagation.fixture.ts` writes signals inside `effect()` on purpose, so leaving it on would break the one-rule-per-fixture invariant above.
- `require-sanctioned-pull-marker.fixture.ts` — 13 errors (an unmarked bare pull, an unmarked pull behind a named cross-file runner, a bare `@sanctioned-pull` reported as malformed, a pull sharing its effect with a signal write — the #1600 shape, which no marker licenses — its unlicensed twin, which names **both** faults because the write branch reports without returning (2 errors on one effect; the advice is sequential, not contradictory), the two one-level helper-call shapes, a module-level function and a `this.#pull()` method, plus four #1606 cases: a misread write silenced by an `eslint-disable-next-line` on its own line still leaves the unmarked pull beside it reported (the write branch reports without returning), a JSDoc block quoting the marker licenses nothing, and the helper-call flavour of the same hatch as a pair — a helper carrying both the pull and the misread write reports twice on **different** lines (the write inside the helper body, the marker miss at the call site), and the twin whose write is silenced there still reports the unmarked pull. That pair is what fails if a helper's writes are ever folded onto their call site: the two reports land on one line, the disable covers both, and the directive turns up unused. Allowed: the two well-formed markers, the write-only effect, the DOM-only effect, the nested-callback pull, the marked helper call, the two-argument `Map.set(k, v)` the arity check skips, and the marked pull whose one-argument non-signal `.update(…)` is silenced on the write line). Enabled for this file alone, for the same one-rule-per-fixture reason as its sanctioned-effect sibling.
- `require-defaults-sibling.fixture.ts` — 1 error (no `require-defaults-sibling.fixture-defaults.ts` sibling exists next to it).
- `no-unused-defaults-sibling.fixture.ts` — 1 error (exports a defaults token no non-defaults, non-spec sibling injects; the reverse direction of `require-defaults-sibling`). A co-located support file [`public-api.ts`](public-api.ts) re-exports that token by name, modelling the entry barrel every real primitive has — the fixture must still fire despite it, proving the rule treats a barrel re-export as _not_ a consumer (re-exporting ≠ injecting).
- `require-host-directive-sibling.fixture.ts` — 3 errors (direct `FormValueControl`, the `Omit<FormValueControl<…>, …>` slider shape, and `FormCheckboxControl`; the abstract base is allowed).
- `aria-attr-allowed-on-role.fixture.ts` — 3 errors (`aria-readonly` on `role="group"`, `aria-checked` on an explicit `role="button"`, and `aria-checked` on the implicit `button[…]` role; the supported placements, the global properties, the unresolvable `input[…]` selector, a dynamic `'[attr.role]'`, and an untranscribed role are all allowed).
- `no-doubled-disabled-reflection.fixture.ts` — 2 errors (an own-member `effectiveDisabled` and a context-read `ctx.effectiveDisabled`, each emitting `aria-disabled` for the very signal the class reflects natively; the `[forAccordionTrigger]` shape — a distinct `ariaDisabled` condition — the `[forFieldset]` shape — an ARIA branch gated on a non-native host — and the custom-role control with no `reflectDisabled` call at all are allowed).
- `hidden-input-effective-disabled.fixture.ts` — 2 errors (an in-body `effectiveDisabled` control and a control inheriting it from `FormUiControlBase`, both passing the raw `disabled` to `injectHiddenInput`; the `this.effectiveDisabled` case and the wrapped `computed(() => this.effectiveDisabled() || …)` case are allowed).

The default `pnpm lint` ignores this directory (configured at the top of
`eslint.config.js`) so CI doesn't pick up these intentional violations.

Each fixture begins with a block-comment header naming the rule it exercises
and links back to `CLAUDE.md` → "Test isolation — non-negotiables".
