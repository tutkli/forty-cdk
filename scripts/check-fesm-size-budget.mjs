import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { repoRoot } from './lib/repo-path.mjs';

/**
 * Compares the size of every FESM ng-packagr emits into
 * `dist/forty-cdk/fesm2022/` against the checked-in baseline in
 * `scripts/fesm-size-baseline.json`, and fails on drift past the budget
 * ([#1741](https://github.com/tutkli/forty-cdk/issues/1741)).
 *
 * Every convention in this repo that stayed true did so because a gate failed
 * loudly on drift — the generated matrices, the derived error-code roster, the
 * source-derived adopter rosters. Published size had no such gate: a PR adding
 * a `data-state` vocabulary could not merge without updating a generated table,
 * while a PR adding 40 KB to `forty-cdk-core.mjs` merged silently. This closes
 * that asymmetry with the same shape as its neighbours — derived from the
 * build, baseline checked in, regenerable by one command, failing loudly.
 *
 * Four decisions are load-bearing:
 *
 * - **It runs after `strip-fesm-comments.mjs`**, which is why it is last in
 *   `postbuild` rather than first. Comments are 38% of the emit by byte (2.83 MB
 *   → 1.75 MB), so a baseline taken before the strip would move by far more than
 *   any budget the day that step's `LOAD_BEARING` set changes — and it would
 *   measure bytes no consumer's bundler keeps.
 * - **Raw bytes, not gzip.** Gzip is the number a consumer feels, but zlib's
 *   output is not byte-stable across Node / zlib versions, so a gzip baseline
 *   would drift between a local run and CI for reasons no commit caused. The
 *   emit itself is: it is LF-only UTF-8 text written by the same compiler, so
 *   the recorded numbers are identical on every platform. A consumer re-bundles
 *   and re-compresses this file anyway; what the library controls is its size.
 * - **The allowance has a byte floor as well as a percentage**, because the
 *   published bundles span four orders of magnitude: `forty-cdk.mjs` is 42
 *   bytes (the deliberately empty root barrel) and
 *   `forty-cdk-visually-hidden.mjs` 126, so 10% of them is 4 and 12 bytes —
 *   less than one identifier in the emit, and a gate that fires on a rename is
 *   a gate that gets regenerated unread. {@link NOISE_FLOOR_BYTES} is under
 *   0.12% of the published total and under 1.3% of the largest bundle.
 * - **The total is checked too, on a tighter percentage**, because the floor's
 *   blind spot is exactly the diffuse case: 60 bundles each spending their
 *   whole 2 KB is 120 KB, or +6.7%, with every per-bundle check green. The
 *   total budget fires first at +5%, so the floor cannot be spent library-wide.
 *
 * Drift is failed in **both** directions. A bundle that shrank past its
 * allowance is not a problem, but leaving the baseline above it makes the
 * budget permanently loose — the shrink would silently pre-pay for a later
 * regression. So a shrink asks for the same one-command regeneration a growth
 * does, and the baseline can only track the emit.
 */

const FESM_DIR = join(repoRoot, 'dist', 'forty-cdk', 'fesm2022');
const BASELINE = join(repoRoot, 'scripts', 'fesm-size-baseline.json');
const WRITE = process.argv.includes('--write');

/** Per-bundle growth the budget allows before it fails, as a fraction. */
const PER_BUNDLE_GROWTH = 0.1;

/**
 * Growth the published total allows, as a fraction. Tighter than the
 * per-bundle one on purpose — see the fourth decision above.
 */
const TOTAL_GROWTH = 0.05;

/**
 * The smallest per-bundle drift worth a report, whatever the percentage says.
 * Absorbs the emit noise a rename or a re-ordered declaration produces in the
 * bundles too small for a percentage to mean anything.
 */
const NOISE_FLOOR_BYTES = 2048;

/**
 * Fewer bundles than this means the scan found the wrong tree rather than a
 * library that shrank — the same vacuum guard the other emit gates carry. It is
 * a floor, not a target.
 */
const BUNDLE_FLOOR = 50;

/** Every FESM currently in `dist/`, as `{ [file]: bytes }` in name order. */
function measure() {
  const sizes = {};
  for (const file of readdirSync(FESM_DIR).sort()) {
    if (file.endsWith('.mjs')) sizes[file] = statSync(join(FESM_DIR, file)).size;
  }
  return sizes;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function signed(bytes) {
  return `${bytes >= 0 ? '+' : '-'}${Math.abs(bytes)} B`;
}

function percent(delta, base) {
  return `${delta >= 0 ? '+' : '-'}${((Math.abs(delta) / base) * 100).toFixed(1)}%`;
}

if (!existsSync(FESM_DIR)) {
  console.error(`[check-fesm-size-budget] ${FESM_DIR} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

const actual = measure();
const files = Object.keys(actual);

if (files.length < BUNDLE_FLOOR) {
  console.error(
    `[check-fesm-size-budget] FAIL — only ${files.length} FESM bundle(s) in ${FESM_DIR} (floor ${BUNDLE_FLOOR}). The measurement proves nothing about the emit; re-run \`pnpm build\` rather than lowering the floor.`,
  );
  process.exit(1);
}

const actualTotal = files.reduce((total, file) => total + actual[file], 0);

if (WRITE) {
  const previous = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).bundles : {};
  writeFileSync(BASELINE, `${JSON.stringify({ bundles: actual }, null, 2)}\n`, 'utf8');

  const moved = files.filter((file) => previous[file] !== actual[file]);
  const previousTotal = Object.values(previous).reduce((total, size) => total + size, 0);

  console.log(
    `[check-fesm-size-budget] WROTE — ${files.length} bundles, ${kb(actualTotal)} total, recorded from the emit currently in dist/:`,
  );
  for (const file of moved) {
    const before = previous[file];
    if (before === undefined) {
      console.log(`  ${file}: new, ${actual[file]} B`);
    } else {
      console.log(`  ${file}: ${before} B → ${actual[file]} B (${signed(actual[file] - before)})`);
    }
  }
  for (const file of Object.keys(previous)) {
    if (actual[file] === undefined) console.log(`  ${file}: gone, was ${previous[file]} B`);
  }
  if (previousTotal) {
    console.log(
      `  total: ${kb(previousTotal)} → ${kb(actualTotal)} (${signed(actualTotal - previousTotal)}, ${percent(actualTotal - previousTotal, previousTotal)})`,
    );
  }
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(
    `[check-fesm-size-budget] FAIL — no baseline at ${BASELINE}. Record one with \`pnpm check:fesm-size --write\` and commit it; the budget cannot pass vacuously.`,
  );
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')).bundles;
const baselineTotal = Object.values(baseline).reduce((total, size) => total + size, 0);
const failures = [];
let widest = null;

for (const file of files) {
  if (baseline[file] === undefined) {
    failures.push(
      `${file}: ${actual[file]} B, absent from the baseline — a new entry point owes an entry.`,
    );
    continue;
  }

  const delta = actual[file] - baseline[file];
  const allowed = Math.max(Math.round(baseline[file] * PER_BUNDLE_GROWTH), NOISE_FLOOR_BYTES);

  if (
    !widest ||
    Math.abs(delta) / baseline[file] > Math.abs(widest.delta) / baseline[widest.file]
  ) {
    widest = { file, delta, allowed };
  }
  if (Math.abs(delta) <= allowed) continue;

  failures.push(
    `${file}: ${baseline[file]} B → ${actual[file]} B (${signed(delta)}, ${percent(delta, baseline[file])}), past the ${allowed} B allowed${delta < 0 ? ' — a shrink, so the baseline is now loose' : ''}.`,
  );
}

for (const file of Object.keys(baseline)) {
  if (actual[file] === undefined) {
    failures.push(
      `${file}: in the baseline at ${baseline[file]} B but absent from the emit — renamed, or its entry point is gone.`,
    );
  }
}

const totalDelta = actualTotal - baselineTotal;
const totalAllowed = Math.round(baselineTotal * TOTAL_GROWTH);

if (Math.abs(totalDelta) > totalAllowed) {
  failures.push(
    `total: ${kb(baselineTotal)} → ${kb(actualTotal)} (${signed(totalDelta)}, ${percent(totalDelta, baselineTotal)}), past the ${kb(totalAllowed)} allowed across the whole emit.`,
  );
}

if (failures.length) {
  console.error(
    `[check-fesm-size-budget] FAIL — the emit drifted past the budget in ${failures.length} place(s) (${PER_BUNDLE_GROWTH * 100}% or ${NOISE_FLOOR_BYTES} B per bundle, ${TOTAL_GROWTH * 100}% on the total):`,
  );
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(
    `\nRead the numbers before regenerating: a bundle that grew by tens of KB usually means an entry point picked up a static import edge it does not need, which merges two chunks in a consumer's build, and one that shrank that far usually means code moved somewhere the move was not the point of the change. When the drift is the intended cost of the work, re-record with \`pnpm check:fesm-size --write\` and let the diff carry it into review.`,
  );
  process.exit(1);
}

console.log(
  `[check-fesm-size-budget] OK — ${files.length} bundles at ${kb(actualTotal)} total, within ${percent(totalDelta, baselineTotal)} of the baseline; widest per-bundle drift ${widest.file} ${signed(widest.delta)} of ${widest.allowed} B allowed.`,
);
