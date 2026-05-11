# forty-cdk ESLint rule fixtures

Each `*.fixture.ts` file in this directory intentionally violates exactly one of
the five `forty-cdk/*` test-isolation rules defined in
[`eslint.config.js`](../../../eslint.config.js) (the
`@forty-cdk-test-isolation-rules` block). They are documentation-as-code: by
linting them with the rule *enabled* you can verify it fires.

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

The default `pnpm lint` ignores this directory (configured at the top of
`eslint.config.js`) so CI doesn't pick up these intentional violations.

Each fixture begins with a block-comment header naming the rule it exercises
and links back to `CLAUDE.md` → "Test isolation — non-negotiables".
