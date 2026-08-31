import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { compileDocument } from './docs/doc-model.mjs';
import { LIBRARY_DIR, readEntryPointDocs, readGuides } from './lib/doc-site.mjs';
import { coverageProblems, COVERAGE_EXEMPTIONS } from './lib/docs-coverage.mjs';
import { repoRoot } from './lib/repo-path.mjs';

/**
 * Runs the documentation-coverage rules of `scripts/lib/docs-coverage.mjs` over
 * the library as it stands ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
 *
 * The rules live next door, taking the corpus as an argument, so the suite can
 * state them over documents it writes itself — a gate whose only expression is
 * a script reading the repository can only ever be checked by breaking the
 * repository.
 */

const PAGES_DIR = join(repoRoot, 'projects', 'forty-cdk-playground', 'src', 'app', 'demos');

function toPosix(path) {
  return relative(repoRoot, path).split(sep).join('/');
}

/**
 * The slugs the site holds an authored page for — read from the content tree
 * rather than from the router's table, which is generated from the same
 * frontmatter this check reads
 * ([#1811](https://github.com/tutkli/forty-cdk/issues/1811)).
 *
 * A directory counts only once it holds the page module its route would load: a
 * folder of examples with no page is the omission, not the coverage.
 */
function pageSlugs() {
  return new Set(
    readdirSync(PAGES_DIR, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() && existsSync(join(PAGES_DIR, entry.name, `${entry.name}.page.ts`)),
      )
      .map((entry) => entry.name),
  );
}

const entryPoints = readdirSync(LIBRARY_DIR, { withFileTypes: true })
  .filter(
    (entry) => entry.isDirectory() && existsSync(join(LIBRARY_DIR, entry.name, 'ng-package.json')),
  )
  .map((entry) => entry.name)
  .sort();

const documents = new Map(
  readEntryPointDocs().map((doc) => [
    doc.slug,
    compileDocument(readFileSync(doc.file, 'utf8'), {
      path: doc.path,
      slug: doc.slug,
      kind: 'primitive',
    }),
  ]),
);

const { problems, counts } = coverageProblems({
  entryPoints,
  documents,
  guides: new Set(readGuides().map((guide) => guide.slug)),
  pages: pageSlugs(),
  pagesDir: toPosix(PAGES_DIR),
});

if (problems.length > 0) {
  console.error(`[check-docs-coverage] FAIL — ${problems.length} problem(s):`);
  for (const problem of problems) {
    console.error(`  ${problem}`);
  }
  process.exit(1);
}

console.log(
  `[check-docs-coverage] ok — ${entryPoints.length} entry points: ${counts.published} publish a ` +
    `page, ${counts.folded} fold into one, ${COVERAGE_EXEMPTIONS.length} are exempt with a stated ` +
    'reason',
);
