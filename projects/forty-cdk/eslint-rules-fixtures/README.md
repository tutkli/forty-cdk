# forty-cdk ESLint rule fixtures

Each `*.fixture.ts` file in this directory intentionally violates exactly one `forty-cdk/*` rule
from [`eslint.config.js`](../../../eslint.config.js). They are documentation-as-code: linting them
with the rule _enabled_ is how you verify it still fires.

Run them with:

```bash
pnpm lint:rule-fixtures
```

That script runs `eslint --no-ignore` against this directory. The fixtures violate the rules on
purpose, so **the script exits non-zero — that is the passing signal.** The default `pnpm lint`
ignores this directory (configured at the top of `eslint.config.js`), so CI never sees the
intentional violations.

Each fixture opens with a block-comment header naming the rule it exercises, why the rule exists,
and which shapes it deliberately leaves compliant. Read that header rather than a summary here — it
sits next to the code it describes, so the two cannot drift.

The fixtures are deliberately:

- **Outside `projects/forty-cdk/src/`**, so Vitest's spec discovery (`src/**/*.spec.ts`) never picks
  them up.
- **Outside every Angular `tsconfig.*.json` `include`**, so the typed-linting layer
  (`projectService: true`) does not parse them. An override in `eslint.config.js` disables
  `parserOptions.projectService` for this directory.
- **Named `*.fixture.ts`** (not `*.spec.ts`) so they are unmistakable.

Three rules are enabled for their own fixture alone — `require-sanctioned-effect-marker`,
`require-sanctioned-pull-marker` and `no-assertion-only-effect`. All three classify `effect()`
bodies, and the other `effect()` fixtures contain those bodies on purpose, so leaving them on
globally would break the one-rule-per-fixture invariant above.
