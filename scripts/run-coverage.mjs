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
 * thing it derives: **`--coverage` empties `import.meta.glob(…, { query:
 * '?raw' })`** under `@angular/build:unit-test`, so every source-derived roster
 * and meta-guard spec sees zero library sources and fails. Those specs report it
 * themselves — their liveness probes are exactly the "a mis-typed glob returns
 * an empty record" case, so the failure reads `expected 0 to be greater than
 * 100` rather than as a coverage problem — but a failing run makes Vitest skip
 * the reporters, so there is no number at all until they are excluded.
 *
 * Hand-listing them in a script would rot on the next roster spec, and it would
 * rot _silently_ in the direction that matters: the list would keep excluding
 * specs whose glob had been fixed. So the set is derived the same way the roster
 * specs derive their own families — every spec whose source contains
 * `import.meta.glob` — and printed on every run, which makes the day the builder
 * interaction is fixed visible as an empty list rather than as nothing.
 *
 * What that costs is stated rather than hidden: those specs do not run, so the
 * number is a **floor**. Most of them assert over source text and cover no
 * library code at runtime, but a few mount real fixtures (the swept
 * anchored-positioning contract, the per-scope defaults suite), and their share
 * of the covered lines is missing from the report.
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

/** Every spec that reads library source through Vite's raw glob import. */
function globSpecs() {
  const found = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== 'node_modules') walk(path);
      } else if (
        path.endsWith('.spec.ts') &&
        readFileSync(path, 'utf8').includes('import.meta.glob')
      ) {
        found.push(relative(SPEC_BASE, path).split('\\').join('/'));
      }
    }
  })(LIB_DIR);
  return found.sort();
}

const excluded = globSpecs();

if (excluded.length) {
  console.log(
    `[run-coverage] excluding ${excluded.length} spec(s) that read source through import.meta.glob — \`--coverage\` empties the glob, so they cannot pass under it and a failing run reports no coverage at all. The number below is a floor:`,
  );
  for (const spec of excluded) console.log(`  ${spec}`);
} else {
  console.log(
    `[run-coverage] no spec reads source through import.meta.glob — the whole suite runs, so the number below is the number.`,
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
