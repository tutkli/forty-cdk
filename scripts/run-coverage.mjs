import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { repoRoot } from './lib/repo-path.mjs';

/**
 * Runs the unit suite under v8 coverage and prints the summary
 * ([#1741](https://github.com/tutkli/forty-cdk/issues/1741)). Nothing gates the
 * number — see the coverage section of `.claude/rules/testing.md` for why a
 * threshold is deliberately absent.
 *
 * The reason this is a script rather than a line in `package.json` is the one
 * thing it derives, and the derivation is expected to come back **empty**
 * ([#1788](https://github.com/tutkli/forty-cdk/issues/1788)). `--coverage`
 * changes what a `import.meta.glob` pattern resolves against: the builder's
 * `angular:test-in-memory-provider` plugin replaces the spec's virtual module
 * with `import "./<entry-point>.js"` when coverage is on, so the code lives in
 * an intermediate chunk that resolves against the workspace root instead of the
 * spec's own directory. A `../../` pattern then climbs out of the root and
 * matches nothing, and the roster specs fail on their own liveness probes
 * (`expected 0 to be greater than 100`) — a failing run makes Vitest skip the
 * reporters, so there is no number at all until they are excluded. Every glob in
 * the suite is written root-absolute for exactly that reason, which is what
 * `src/lib/source-glob-shape.spec.ts` gates inside `pnpm test`.
 *
 * So the set derived here is "every spec whose glob is relative" — the shape
 * that cannot resolve under coverage — and it is printed on every run. A
 * hand-written list would rot _silently_ in the direction that matters (it would
 * keep excluding specs whose pattern had been fixed), and a list keyed on
 * `import.meta.glob` alone would keep excluding all fifteen roster specs now
 * that their patterns resolve. A non-empty list means a spec slipped past the
 * shape gate, and the number below is then a **floor** rather than the number.
 *
 * Extra arguments are forwarded, so `node scripts/run-coverage.mjs --coverage-reporters html`
 * works for a browsable report.
 */

const LIB_DIR = join(repoRoot, 'projects', 'forty-cdk');

/** The base every `--include` / `--exclude` pattern is resolved against. */
const SPEC_BASE = join(LIB_DIR, 'src');

/** Coverage reports the library's own source, not the suite that exercises it. */
const COVERAGE_SCOPE = [
  '--coverage-include',
  'projects/forty-cdk/**/*.ts',
  '--coverage-exclude',
  '**/*.spec.ts',
  '--coverage-exclude',
  'projects/forty-cdk/src/**',
  '--coverage-exclude',
  'projects/forty-cdk/eslint-rules-fixtures/**',
  '--coverage-exclude',
  '**/public-api.ts',
];

/**
 * Matches an `import.meta.glob` call and captures the pattern it is given, in
 * any of the three quote forms — Vite requires a static literal, so there is no
 * fourth shape a call could take.
 */
const GLOB_CALL = /import\.meta\.glob\(\s*(['"`])([^'"`]+)\1/g;

/** Every spec reading library source through a glob that coverage cannot resolve. */
function relativeGlobSpecs() {
  const found = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== 'node_modules') walk(path);
      } else if (path.endsWith('.spec.ts')) {
        const patterns = [...readFileSync(path, 'utf8').matchAll(GLOB_CALL)].map((m) => m[2]);
        if (patterns.some((pattern) => !pattern.startsWith('/'))) {
          found.push(relative(SPEC_BASE, path).split('\\').join('/'));
        }
      }
    }
  })(LIB_DIR);
  return found.sort();
}

const excluded = relativeGlobSpecs();

if (excluded.length) {
  console.log(
    `[run-coverage] excluding ${excluded.length} spec(s) whose import.meta.glob pattern is relative — \`--coverage\` resolves a spec's glob against the workspace root, so a relative pattern matches nothing and the spec fails on its own liveness probe. The number below is a floor; write the pattern root-absolute instead:`,
  );
  for (const spec of excluded) console.log(`  ${spec}`);
} else {
  console.log(
    `[run-coverage] no spec reads source through a relative import.meta.glob — the whole suite runs, so the number below is the number.`,
  );
}

const result = spawnSync(
  process.execPath,
  [
    join(repoRoot, 'node_modules', '@angular', 'cli', 'bin', 'ng.js'),
    'test',
    'forty-cdk',
    '--coverage',
    '--coverage-reporters',
    'text-summary',
    '--coverage-reporters',
    'json-summary',
    ...COVERAGE_SCOPE,
    ...excluded.flatMap((spec) => ['--exclude', spec]),
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit', cwd: repoRoot },
);

process.exit(result.status ?? 1);
