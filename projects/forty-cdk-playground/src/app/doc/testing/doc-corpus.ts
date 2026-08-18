/**
 * The markdown the documentation site publishes, read once and shared by every
 * characterization spec ([#1805](https://github.com/tutkli/forty-cdk/issues/1805)).
 *
 * Three globs rather than one because the corpus has two halves with different
 * membership rules. Every entry point's `README.md` is published by virtue of
 * existing. `docs/` is published through a registry instead — a file there is a
 * guide only once it is named in `PUBLISHED_GUIDES`, and `EXCLUDED_GUIDES`
 * exists precisely because one of them is not — so the guide half is derived
 * from that registry's own source text rather than from the directory listing.
 * Reading the registry as text keeps `scripts/lib/doc-site.mjs` the single
 * definition of "published" without importing it: it reaches for `node:fs` at
 * module scope, which is not something a browser-platform test bundle resolves.
 *
 * All three patterns are written **root-absolute**, matching the rule the
 * library suite gates on itself in `src/lib/source-glob-shape.spec.ts`: a
 * pattern starting with `/` resolves against Vite's `root`, which the builder
 * pins to the workspace root, so it means the same thing wherever it is written
 * and whether or not the run collects coverage.
 */
const README_FILES = import.meta.glob('/projects/forty-cdk/*/README.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const GUIDE_FILES = import.meta.glob('/docs/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const DOC_SITE_REGISTRY = import.meta.glob('/scripts/lib/doc-site.mjs', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * Holds no entry point and ships no page — its README documents the ESLint rule
 * fixtures. The site never parses it, so neither does this corpus.
 */
const NOT_AN_ENTRY_POINT = 'eslint-rules-fixtures';

const PUBLISHED_GUIDES_BLOCK = /export const PUBLISHED_GUIDES = \[([\s\S]*?)\];/;
const GUIDE_FILE_ENTRY = /file:\s*'([^']+)'/g;

/** A document as the site reads it: repository path plus raw markdown. */
export interface DocFile {
  /** Repository-relative path, the same string the link resolver is handed. */
  readonly path: string;
  /** The slug the site routes the document under. */
  readonly slug: string;
  readonly markdown: string;
}

function readmeCorpus(): readonly DocFile[] {
  const docs: DocFile[] = [];
  for (const [key, markdown] of Object.entries(README_FILES)) {
    const slug = key.slice('/projects/forty-cdk/'.length, -'/README.md'.length);
    if (slug === NOT_AN_ENTRY_POINT) {
      continue;
    }
    docs.push({ path: key.slice(1), slug, markdown });
  }
  return docs.sort((a, b) => a.path.localeCompare(b.path));
}

function publishedGuideFiles(): readonly string[] {
  const source = DOC_SITE_REGISTRY['/scripts/lib/doc-site.mjs'];
  if (source === undefined) {
    throw new Error('scripts/lib/doc-site.mjs was not found — the guide registry cannot be read');
  }
  const block = PUBLISHED_GUIDES_BLOCK.exec(source);
  if (block === null) {
    throw new Error('scripts/lib/doc-site.mjs no longer declares a PUBLISHED_GUIDES array');
  }
  return [...block[1]!.matchAll(GUIDE_FILE_ENTRY)].map((match) => match[1]!);
}

function guideCorpus(): readonly DocFile[] {
  return publishedGuideFiles().map((file) => {
    const markdown = GUIDE_FILES[`/docs/${file}`];
    if (markdown === undefined) {
      throw new Error(`docs/${file} is registered as published but was not found on disk`);
    }
    return { path: `docs/${file}`, slug: file.replace(/\.md$/, ''), markdown };
  });
}

/** Every entry point's README — one per `projects/forty-cdk/<entry point>/`. */
export const PRIMITIVE_DOCS: readonly DocFile[] = readmeCorpus();

/** The guides `scripts/lib/doc-site.mjs` publishes, in registry order. */
export const GUIDE_DOCS: readonly DocFile[] = guideCorpus();

/** Both halves, which together are every document the site renders. */
export const SITE_DOCS: readonly DocFile[] = [...PRIMITIVE_DOCS, ...GUIDE_DOCS];
