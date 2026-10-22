import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import ts from 'typescript';

import {
  BLESSED_CORE_SYMBOLS,
  CORE_PUBLISHERS,
  CORE_SYMBOL_PUBLISHER,
  SHARED_ENTRY_POINT,
} from './lib/core-blessed-tier.mjs';
import { analyze, declaredNames } from './lib/entrypoint-public-types.mjs';
import { repoRoot } from './lib/repo-path.mjs';
import { UNNAMEABLE_PUBLIC_TYPES } from './lib/unnameable-public-types.mjs';

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');

/**
 * The internal tier ships as three entry points — `forty-cdk/core`, the
 * overlay slice [#1723](https://github.com/tutkli/forty-cdk/issues/1723) cut
 * it into, and the anchored slice
 * [#2693](https://github.com/tutkli/forty-cdk/issues/2693) cut out of that — so
 * every rule below reads all three. A blessed symbol is blessed regardless of
 * which barrel declares it;
 * what the tier fixes is the single public entry point that publishes it.
 */
const CORE_BARRELS = ['core', 'core-overlay', 'core-anchored'].map((entry) =>
  join(repoRoot, 'projects', 'forty-cdk', entry, 'src', 'public-api.ts'),
);
const CORE_SOURCE_DIRS = ['core', 'core-overlay', 'core-anchored'].map((entry) =>
  join(repoRoot, 'projects', 'forty-cdk', entry, 'src'),
);

/**
 * The sentence an internal-tier declaration carries to tell a reader it is
 * refactorable without notice. Blessing a symbol makes that sentence false, and
 * the JSDoc is what reaches the consumer's editor — so the two cannot disagree.
 */
const INTERNAL_TIER_DISCLAIMER = 'Internal core tier';
const IGNORED_FILES = new Set([
  'forty-cdk.d.ts',
  'forty-cdk-core.d.ts',
  'forty-cdk-core-overlay.d.ts',
  'forty-cdk-core-anchored.d.ts',
]);

if (!existsSync(TYPES_DIR)) {
  console.error(
    `[check-entrypoint-public-types] ${TYPES_DIR} not found — run \`pnpm build\` first.`,
  );
  process.exit(1);
}

function coreBarrelExportNames() {
  const names = new Set();
  for (const barrel of CORE_BARRELS) {
    const sf = ts.createSourceFile(
      barrel,
      readFileSync(barrel, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const stmt of sf.statements) {
      if (!ts.isExportDeclaration(stmt) || !stmt.exportClause) continue;
      if (!ts.isNamedExports(stmt.exportClause)) continue;
      for (const el of stmt.exportClause.elements) names.add(el.name.text);
    }
  }
  return names;
}

/** Every non-spec `.ts` file of the internal tier, as `[path, text]`. */
function coreSourceFiles() {
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
        files.push([path, readFileSync(path, 'utf8')]);
      }
    }
  }
  for (const dir of CORE_SOURCE_DIRS) {
    walk(dir);
  }
  return files;
}

const assigned = Object.values(CORE_PUBLISHERS).flat();
const duplicatePublishers = [
  ...new Set(assigned.filter((name, index) => assigned.indexOf(name) !== index)),
].sort();

if (duplicatePublishers.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${duplicatePublishers.length} blessed symbol(s) are assigned to more than one publisher in scripts/lib/core-blessed-tier.mjs:`,
  );
  for (const name of duplicatePublishers) console.error(`  ${name}`);
  console.error(
    `\nA blessed symbol has exactly one canonical import path. Keep it under a single entry point.`,
  );
  process.exit(1);
}

const coreExports = coreBarrelExportNames();
const staleBlessed = [...BLESSED_CORE_SYMBOLS].filter((name) => !coreExports.has(name)).sort();

if (staleBlessed.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${staleBlessed.length} blessed symbol(s) in scripts/lib/core-blessed-tier.mjs are exported from none of forty-cdk/core, forty-cdk/core-overlay and forty-cdk/core-anchored:`,
  );
  for (const name of staleBlessed) console.error(`  ${name}`);
  console.error(
    `\nA blessed symbol carries the library's semver guarantee. Restore the export, or remove it from the blessed tier deliberately (see the core tier section in .claude/rules/conventions.md).`,
  );
  process.exit(1);
}

/**
 * Blessed symbols whose own declaration still calls itself internal tier.
 *
 * Promoting a symbol is two edits — the roster and the JSDoc — and only the
 * first one is load-bearing for the build, so the second is the half that gets
 * forgotten ([#1745](https://github.com/tutkli/forty-cdk/issues/1745) found two
 * helpers documented for an audience that could not reach them, and the reverse
 * mistake ships a semver promise the doc denies). The disclaimer travels into
 * the emitted `.d.ts` and from there into the consumer's editor, so it is part
 * of the contract rather than an implementation note.
 */
const misdocumented = [];
for (const [path, text] of coreSourceFiles()) {
  if (!text.includes(INTERNAL_TIER_DISCLAIMER)) continue;
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  for (const stmt of sf.statements) {
    const name = declaredNames(stmt).find(({ name }) => BLESSED_CORE_SYMBOLS.has(name))?.name;
    if (name === undefined) continue;
    const leading = (ts.getLeadingCommentRanges(text, stmt.pos) ?? [])
      .map((range) => text.slice(range.pos, range.end))
      .join('\n');
    if (leading.includes(INTERNAL_TIER_DISCLAIMER)) {
      misdocumented.push(`${name} (${relative(repoRoot, path).split(sep).join('/')})`);
    }
  }
}

if (misdocumented.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${misdocumented.length} blessed symbol(s) still document themselves as internal tier:`,
  );
  for (const entry of misdocumented.sort()) console.error(`  ${entry}`);
  console.error(
    `\nA blessed symbol carries the library's semver guarantee, and its JSDoc is what the consumer reads in their editor. Drop the "${INTERNAL_TIER_DISCLAIMER}" paragraph and confirm the rest reads as consumer-facing documentation — or remove the symbol from scripts/lib/core-blessed-tier.mjs.`,
  );
  process.exit(1);
}

const failures = [];
const published = new Map();
const starReexports = [];
const unnameable = [];
const settledAllowances = [];
const checkedEntries = new Set();
let allowed = 0;

for (const file of readdirSync(TYPES_DIR)) {
  if (!file.endsWith('.d.ts') || IGNORED_FILES.has(file)) continue;
  const entry = file.replace(/^forty-cdk-/, '').replace(/\.d\.ts$/, '');
  checkedEntries.add(entry);
  const { unblessed, reexported, reexportsAll, leaked } = analyze(
    file,
    readFileSync(join(TYPES_DIR, file), 'utf8'),
  );
  const owned = CORE_PUBLISHERS[entry] ?? [];
  published.set(entry, reexportsAll ? new Set(owned) : reexported);
  if (reexportsAll) starReexports.push(entry);
  const foreign = [...reexported]
    .filter((name) => BLESSED_CORE_SYMBOLS.has(name) && !owned.includes(name))
    .sort();
  if (unblessed.length || foreign.length) failures.push({ entry, unblessed, foreign });

  const deferred = UNNAMEABLE_PUBLIC_TYPES[entry] ?? [];
  allowed += deferred.length;
  const unlisted = leaked.filter((name) => !deferred.includes(name));
  const settled = deferred.filter((name) => !leaked.includes(name)).sort();
  if (unlisted.length) unnameable.push({ entry, unlisted });
  if (settled.length) settledAllowances.push({ entry, settled });
}

for (const entry of Object.keys(UNNAMEABLE_PUBLIC_TYPES)) {
  if (checkedEntries.has(entry)) continue;
  settledAllowances.push({ entry, settled: [...UNNAMEABLE_PUBLIC_TYPES[entry]].sort() });
}

const missingPublishers = Object.entries(CORE_PUBLISHERS)
  .map(([entry, symbols]) => ({
    entry,
    missing: symbols.filter((name) => !published.get(entry)?.has(name)).sort(),
  }))
  .filter(({ missing }) => missing.length);

const unblessedFailures = failures.filter((f) => f.unblessed.length);
const foreignFailures = failures.filter((f) => f.foreign.length);

if (unblessedFailures.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${unblessedFailures.length} entry point(s) publish an internal-tier core symbol (in a public signature, or as a barrel re-export):`,
  );
  for (const { entry, unblessed } of unblessedFailures.sort((a, b) =>
    a.entry.localeCompare(b.entry),
  )) {
    console.error(`  forty-cdk/${entry}: ${unblessed.join(', ')}`);
  }
  console.error(
    `\nEither narrow the leak (drop the re-export or the member, make it private, or retype it to a local shape), or bless the symbol deliberately by adding it to scripts/lib/core-blessed-tier.mjs — which commits the library to its semver stability. See the core tier section in .claude/rules/conventions.md.`,
  );
}

if (foreignFailures.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${foreignFailures.length} entry point(s) re-export a blessed core symbol they do not publish:`,
  );
  for (const { entry, foreign } of foreignFailures.sort((a, b) => a.entry.localeCompare(b.entry))) {
    console.error(
      `  forty-cdk/${entry}: ${foreign.map((name) => `${name} (published by forty-cdk/${CORE_SYMBOL_PUBLISHER.get(name)})`).join(', ')}`,
    );
  }
  console.error(
    `\nA blessed symbol has exactly one canonical import path. Drop the re-export — consumers import it from forty-cdk/${SHARED_ENTRY_POINT} (or the entry point that owns it). See the core tier section in .claude/rules/conventions.md.`,
  );
}

if (starReexports.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${starReexports.length} entry point(s) star-re-export an internal-tier entry point:`,
  );
  for (const entry of starReexports.sort()) console.error(`  forty-cdk/${entry}`);
  console.error(
    `\n\`export * from 'forty-cdk/core'\` — or from 'forty-cdk/core-overlay' — publishes the whole internal tier and cannot be audited per symbol. Re-export the blessed symbols this entry point publishes by name.`,
  );
}

if (missingPublishers.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${missingPublishers.length} entry point(s) do not re-export every blessed core symbol they publish:`,
  );
  for (const { entry, missing } of missingPublishers) {
    console.error(`  forty-cdk/${entry}: ${missing.join(', ')}`);
  }
  console.error(
    `\nEach blessed symbol must stay reachable from its canonical entry point. Restore the re-export, or move the symbol to another publisher in scripts/lib/core-blessed-tier.mjs.`,
  );
}

if (unnameable.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${unnameable.length} entry point(s) surface a locally-declared type their barrel does not export:`,
  );
  for (const { entry, unlisted } of unnameable.sort((a, b) => a.entry.localeCompare(b.entry))) {
    console.error(`  forty-cdk/${entry}: ${unlisted.join(', ')}`);
  }
  console.error(
    `\nA public signature must hand the consumer only types they can name from a supported import path. Either narrow the leak (drop the member, make it private, or retype it to a shape they can name — a blessed core type rather than a second local spelling of it), or re-export the type from that entry point's public-api.ts with consumer-facing JSDoc. Listing it in scripts/lib/unnameable-public-types.mjs defers the fix and is not a resolution.`,
  );
}

if (settledAllowances.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${settledAllowances.length} entry point(s) list a deferred unnameable type that no longer leaks:`,
  );
  for (const { entry, settled } of settledAllowances.sort((a, b) =>
    a.entry.localeCompare(b.entry),
  )) {
    console.error(`  forty-cdk/${entry}: ${settled.join(', ')}`);
  }
  console.error(
    `\nThe deferral list cannot outlive the leak it tracks. Drop the name (or the whole entry) from scripts/lib/unnameable-public-types.mjs.`,
  );
}

if (
  failures.length ||
  missingPublishers.length ||
  starReexports.length ||
  unnameable.length ||
  settledAllowances.length
)
  process.exit(1);

console.log(
  `[check-entrypoint-public-types] OK — ${checkedEntries.size} entry points; ${BLESSED_CORE_SYMBOLS.size} blessed core symbols, every one exported from an internal-tier barrel and published by exactly one entry point (${Object.entries(
    CORE_PUBLISHERS,
  )
    .map(([entry, symbols]) => `${entry}: ${symbols.length}`)
    .join(
      ', ',
    )}), none of them still documented as internal tier; no internal-tier symbol in a public signature or barrel re-export, and no duplicate re-export path; every locally-declared type in a public signature is re-exported by its barrel, bar the ${allowed} deferred in scripts/lib/unnameable-public-types.mjs.`,
);
