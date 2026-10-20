# forty-cdk ESLint rule fixtures

Each `*.fixture.ts` file in this directory intentionally violates exactly one lint rule from
[`eslint.config.js`](../../../eslint.config.js): a `forty-cdk/*` rule, or one of the config-level
`no-restricted-*` bans. They are documentation-as-code: linting them with the rule _enabled_ is how
you verify it still fires.

Check them with:

```bash
pnpm check:rule-fixtures
```

That script ([`scripts/check-rule-fixtures.mjs`](../../../scripts/check-rule-fixtures.mjs)) lints
this directory through the ESLint Node API with ignores off, and **exits 0 when every fixture
reports exactly what it promises. Exit 0 is the passing signal.** It runs in the CI Lint job, and in
the lefthook pre-commit hook whenever `eslint.config.js`, the script or a fixture is staged. The
default `pnpm lint` ignores this directory (configured at the top of `eslint.config.js`), so the
intentional violations never reach it.

The rule a fixture exercises is its file name: `<rule>.fixture.ts` exercises `forty-cdk/<rule>`, or
the core rule `<rule>` when the plugin has no rule by that name. For each fixture the check asserts:

- **Every `// Expected: N× <rule>` marker gets exactly N reports.** A report belongs to the nearest
  marker above it, or to the first `Expected:` marker when it sits above all of them (a rule that
  reports on the whole file). A rule that stops firing turns into a short count.
- **An `// Allowed:` block reports nothing.** It runs from its marker to the next marker, and holds
  the shapes the rule must leave alone.
- **No other rule reports on the file**, so each fixture stays a test of one rule.
- **Every configured `message` of a core rule fires**, so a `no-restricted-syntax` selector or a
  `no-restricted-imports` path that stops matching shows up even where the count would not.

It also asserts that every `forty-cdk/*` rule has a fixture, that support files such as
`public-api.ts` lint clean, and it carries a liveness probe of its own: synthetic fixtures with a
wrong count, a report inside an `Allowed:` block and a report from another rule, each of which the
check must reject before it reports success.

A rule that keys on a path the fixtures directory cannot have (a primitive barrel, a library file
name), or that the fixtures override below switches off, is checked by linting the fixture's text
under the real config at a virtual path. Its header names that path as
`` Linted as `projects/forty-cdk/…` ``. A rule that reads the file name can list several, one
`Linted as` line per path, and the fixture must report what its markers say at every one of them.

Each fixture opens with a block-comment header naming the rule it exercises, why the rule exists,
and which shapes it deliberately leaves compliant. Read that header rather than a summary here — it
sits next to the code it describes, so the two cannot drift.

The fixtures are deliberately:

- **Outside `projects/forty-cdk/src/`**, so Vitest's spec discovery (`src/**/*.spec.ts`) never picks
  them up.
- **Outside every Angular `tsconfig.*.json` `include`**, so the typed-linting layer
  (`projectService: true`) does not parse them. An override in `eslint.config.js` disables
  `parserOptions.projectService` for this directory, and the check disables it for the virtual paths
  too.
- **Named `*.fixture.ts`** (not `*.spec.ts`) so they are unmistakable.

Four rules are enabled for their own fixture alone. `require-sanctioned-effect-marker`,
`require-sanctioned-pull-marker` and `no-assertion-only-effect` all classify `effect()` bodies, and
the other `effect()` fixtures contain those bodies on purpose. `namespaced-css-custom-property`
reports raw `--for-*` strings, which other fixtures write and assert on as ordinary data. Leaving
any of the four on globally would break the one-rule-per-fixture invariant above.
