import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { foldTargetOf, readDocMeta } from './doc-contract.mjs';
import { guideSlugOf } from './doc-links.mjs';
import { repoRoot } from './repo-path.mjs';

export const DOCS_DIR = join(repoRoot, 'docs');
export const SITE_DIR = join(DOCS_DIR, 'site');
export const LIBRARY_DIR = join(repoRoot, 'projects', 'forty-cdk');

/** Holds no entry point and ships no page — its README documents lint fixtures. */
const NOT_AN_ENTRY_POINT = 'eslint-rules-fixtures';

export const GUIDE_GROUPS = [
  { id: 'styling', label: 'Styling' },
  { id: 'composition', label: 'Composition patterns' },
  { id: 'dates', label: 'Dates & time' },
  { id: 'table', label: 'Table & virtualization' },
];

export const PUBLISHED_GUIDES = [
  { file: 'styling.md', group: 'styling' },
  { file: 'styling-floating-content.md', group: 'styling' },
  { file: 'selected-indicator-pattern.md', group: 'styling' },
  { file: 'your-first-overlay.md', group: 'composition' },
  { file: 'wrapping-non-form-roots.md', group: 'composition' },
  { file: 'wrapping-form-primitives.md', group: 'composition' },
  { file: 'selection-value-type-contract.md', group: 'composition' },
  { file: 'date-adapters.md', group: 'dates' },
  { file: 'table-declarative-columns.md', group: 'table' },
  { file: 'table-reordering.md', group: 'table' },
  { file: 'table-virtualized-rows.md', group: 'table' },
];

/**
 * The pages the site publishes about itself rather than about an entry point
 * ([#1812](https://github.com/tutkli/forty-cdk/issues/1812)).
 *
 * They are documents like any other — compiled, rendered and gated by the same
 * pipeline — and differ from a guide in two ways only: they are served from the
 * site root rather than under `/guides`, and the order below is the order the
 * navigation shows them in, because Installation before Concepts is a reading
 * order rather than an alphabetical one.
 *
 * A slug here shadows an entry point's route if the two ever collide, which is
 * why {@link readSitePages} refuses one.
 */
export const SITE_PAGES = [
  { file: 'installation.md' },
  { file: 'getting-started.md' },
  { file: 'concepts.md' },
];

export const EXCLUDED_GUIDES = [
  {
    file: 'documentation-site-page-template.md',
    reason:
      'Governance for contributors authoring the site itself — it specifies the page template the primitive pages are held to, and addresses nobody reading the published documentation.',
  },
];

/**
 * Every entry point that ships a README, published or not, in slug order.
 *
 * The library folder is the registry: a directory holding a README is a
 * document, and there is no list to keep in step with it.
 */
export function readEntryPointDocs() {
  const docs = [];
  for (const entry of readdirSync(LIBRARY_DIR).sort()) {
    if (entry === NOT_AN_ENTRY_POINT || !statSync(join(LIBRARY_DIR, entry)).isDirectory()) {
      continue;
    }
    const file = join(LIBRARY_DIR, entry, 'README.md');
    if (existsSync(file)) {
      docs.push({ slug: entry, path: `projects/forty-cdk/${entry}/README.md`, file });
    }
  }
  return docs;
}

/**
 * The metadata one README declares, or a thrown error naming every field that
 * kept it from being read.
 */
export function readEntryPointMeta({ file, path }) {
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const { meta, problems } = readDocMeta(source, path);
  if (meta === null) {
    throw new Error(
      `${problems.length} frontmatter problem(s):\n` +
        problems
          .map((problem) => `  ${problem.path}:${problem.line} — ${problem.message}`)
          .join('\n'),
    );
  }
  return meta;
}

/**
 * The primitives the site publishes a page for, read from the frontmatter each
 * README declares ([#1808](https://github.com/tutkli/forty-cdk/issues/1808)).
 *
 * An entry point whose README declares `group: none` is documented and
 * unpublished on purpose, and is absent here for the same reason it is absent
 * from the nav ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
 */
export function readPrimitives() {
  return readEntryPointDocs()
    .map((doc) => ({ slug: doc.slug, ...readEntryPointMeta(doc) }))
    .filter((primitive) => primitive.group !== 'none');
}

/**
 * The entry points whose README the site republishes inside another page's
 * section rather than under a route of their own
 * ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
 *
 * They own no route, and their content is published all the same — so wherever
 * a scan asks "what does the site serve", they belong with the primitives, and
 * wherever it asks "which routes exist", they do not.
 */
export function readFoldedEntryPoints() {
  const folded = [];
  for (const doc of readEntryPointDocs()) {
    const meta = readEntryPointMeta(doc);
    const target = foldTargetOf(meta);
    if (target === null) {
      continue;
    }
    folded.push({ slug: doc.slug, title: meta.title, host: target.slug, section: target.section });
  }
  return folded;
}

function headingOf(md) {
  const match = /^#\s+(.+)$/m.exec(md);
  return match ? match[1].trim() : null;
}

/**
 * The guides the site publishes, in registry order.
 *
 * The description is deliberately absent: it is the guide's own lede, which
 * only the content compiler can identify, and it reaches the navigation from
 * the compiled document rather than from a second scan of the markdown here
 * ([#1808](https://github.com/tutkli/forty-cdk/issues/1808)).
 */
export function readGuides() {
  const groups = new Set(GUIDE_GROUPS.map((group) => group.id));
  const published = new Set(PUBLISHED_GUIDES.map((guide) => guide.file));
  const excluded = new Set(EXCLUDED_GUIDES.map((guide) => guide.file));
  const present = readdirSync(DOCS_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort();

  const unregistered = present.filter((file) => !published.has(file) && !excluded.has(file));
  if (unregistered.length > 0) {
    throw new Error(
      `docs/ holds ${unregistered.length} file(s) that are neither published nor excluded: ${unregistered.join(', ')} — ` +
        'add each to PUBLISHED_GUIDES with a group, or to EXCLUDED_GUIDES with a stated reason (scripts/lib/doc-site.mjs)',
    );
  }

  const missing = [...published, ...excluded].filter((file) => !present.includes(file));
  if (missing.length > 0) {
    throw new Error(
      `the guide registry names ${missing.length} file(s) that no longer exist in docs/: ${missing.join(', ')}`,
    );
  }

  return PUBLISHED_GUIDES.map(({ file, group }) => {
    if (!groups.has(group)) {
      throw new Error(`docs/${file} is registered under unknown group "${group}"`);
    }
    const md = readFileSync(join(DOCS_DIR, file), 'utf8');
    const title = headingOf(md);
    if (title === null) {
      throw new Error(`docs/${file} has no "# " heading — the guide title is read from it`);
    }
    return { file, slug: guideSlugOf(file), group, title };
  });
}

/**
 * The site's own pages, in navigation order.
 *
 * Held to the same registry rule as the guides: a markdown file in `docs/site/`
 * that no entry names is refused rather than silently unpublished, which is the
 * failure [#1809](https://github.com/tutkli/forty-cdk/issues/1809) closed for
 * entry points and this closes for the site's own content.
 */
export function readSitePages() {
  const registered = SITE_PAGES.map((page) => page.file);
  const present = existsSync(SITE_DIR)
    ? readdirSync(SITE_DIR)
        .filter((file) => file.endsWith('.md'))
        .sort()
    : [];

  const unregistered = present.filter((file) => !registered.includes(file));
  if (unregistered.length > 0) {
    throw new Error(
      `docs/site/ holds ${unregistered.length} file(s) no page registry names: ${unregistered.join(', ')} — ` +
        'add each to SITE_PAGES in scripts/lib/doc-site.mjs, in the order the navigation should show it',
    );
  }

  const missing = registered.filter((file) => !present.includes(file));
  if (missing.length > 0) {
    throw new Error(
      `SITE_PAGES names ${missing.length} file(s) that no longer exist in docs/site/: ${missing.join(', ')}`,
    );
  }

  const reserved = new Map(
    readPrimitives().map((primitive) => [primitive.slug, `the ${primitive.slug} entry point`]),
  );
  reserved.set('guides', 'the guide index');

  return SITE_PAGES.map(({ file }) => {
    const slug = guideSlugOf(file);
    const owner = reserved.get(slug);
    if (owner !== undefined) {
      throw new Error(
        `docs/site/${file} would publish /${slug}, the route ${owner} already owns — a site page ` +
          'is served from the root, so its slug cannot be one the site already routes',
      );
    }
    const md = readFileSync(join(SITE_DIR, file), 'utf8');
    const title = headingOf(md);
    if (title === null) {
      throw new Error(`docs/site/${file} has no "# " heading — the page title is read from it`);
    }
    return { file, slug, title };
  });
}

/**
 * Every README the site publishes the content of, keyed by repository path —
 * the primitives with a page, and the folded entry points whose content their
 * host's page carries.
 */
export function readPrimitiveReadmes() {
  const readmes = new Map();
  for (const { slug } of [...readPrimitives(), ...readFoldedEntryPoints()]) {
    const file = join(LIBRARY_DIR, slug, 'README.md');
    if (existsSync(file)) {
      readmes.set(`projects/forty-cdk/${slug}/README.md`, readFileSync(file, 'utf8'));
    }
  }
  return readmes;
}
