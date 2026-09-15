import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { format, resolveConfig } from 'prettier';

import {
  heroFencePlacement,
  heroFenceProblems,
  heroSourceOf,
  projectHero,
  withHeroFence,
} from './lib/doc-hero-fence.mjs';
import { readEntryPointDocs } from './lib/doc-site.mjs';
import { repoRoot } from './lib/repo-path.mjs';

/**
 * Publishes the opening fence of every `## Examples` from the demo its page
 * projects above the intro, and fails when a committed one has stopped being
 * that demo ([#1934](https://github.com/tutkli/forty-cdk/issues/1934)).
 *
 * The site replaces the body of `## Examples` with the live demos, so a fence
 * written there reaches the package page and nobody working on the site ever
 * sees it. That is how a README came to import `Field` from `@angular/forms`
 * months after its demos had moved to `FormField` from `@angular/forms/signals`
 * — drift a compiler catches only once the two disagree about a symbol, and
 * never when they merely show different compositions.
 *
 * The rules live in `scripts/lib/doc-hero-fence.mjs`, taking sources as
 * arguments, so the suite can state them over documents it writes itself.
 *
 * What is added here is the filesystem — pairing a README with the page that
 * names its hero — and a Prettier pass over the projection. Prettier formats
 * the code inside a markdown fence, so a fence it would rewrite is a fence
 * `pnpm format:check` fails on; running it here means the generator writes
 * what the formatter already agrees with rather than something a later
 * `pnpm format` would silently move out from under this gate.
 */

const DEMOS = join(repoRoot, 'projects', 'forty-cdk-docs', 'src', 'app', 'demos');
const WRITE = process.argv.includes('--write');

/**
 * Below this many published fences the pairing has stopped matching the
 * corpus, and a green run would prove nothing about it.
 */
const FLOOR = 50;

const posix = (file) => relative(repoRoot, file).split(sep).join('/');

async function heroOf(slug) {
  const page = join(DEMOS, slug, `${slug}.page.ts`);
  if (!existsSync(page)) {
    return null;
  }
  const sourcePath = heroSourceOf(readFileSync(page, 'utf8'));
  if (sourcePath === null) {
    return null;
  }
  const file = join(DEMOS, ...sourcePath.split('/'));
  if (!existsSync(file)) {
    return null;
  }
  const projected = projectHero(readFileSync(file, 'utf8'));
  const options = await resolveConfig(file);
  return { path: posix(file), code: await format(projected, { ...options, parser: 'typescript' }) };
}

const documents = [];
for (const doc of readEntryPointDocs()) {
  const source = readFileSync(doc.file, 'utf8');
  if (heroFencePlacement(source) === null) {
    continue;
  }
  documents.push({ path: doc.path, file: doc.file, source, hero: await heroOf(doc.slug) });
}

if (documents.length < FLOOR) {
  console.error(
    `[check-hero-fences] found only ${documents.length} README(s) declaring "## Examples" ` +
      `(floor ${FLOOR}) — the corpus scan has stopped matching, so a green run proves nothing`,
  );
  process.exit(1);
}

const problems = heroFenceProblems(documents);

if (problems.length === 0) {
  console.log(
    `[check-hero-fences] ok — ${documents.length} README(s) open "## Examples" with the hero ` +
      'their page projects',
  );
  process.exit(0);
}

if (WRITE) {
  const written = [];
  for (const document of documents) {
    if (document.hero === null) {
      continue;
    }
    const rewritten = withHeroFence(document.source, document.hero.code);
    if (rewritten !== document.source.replace(/\r\n/g, '\n')) {
      writeFileSync(document.file, rewritten, 'utf8');
      written.push(document.path);
    }
  }
  const unrepaired = problems.filter((problem) => !written.includes(problem.path));
  console.log(`[check-hero-fences] wrote ${written.length} README fence(s) from their page hero`);
  for (const path of written) {
    console.log(`  ${path}`);
  }
  if (unrepaired.length === 0) {
    process.exit(0);
  }
  console.error(`[check-hero-fences] ${unrepaired.length} problem(s) --write cannot repair:`);
  for (const problem of unrepaired) {
    console.error(`  ${problem.path}:${problem.line} — ${problem.message}`);
  }
  process.exit(1);
}

console.error(`[check-hero-fences] ${problems.length} problem(s):`);
for (const problem of problems) {
  console.error(`  ${problem.path}:${problem.line} — ${problem.message}`);
}
process.exit(1);
