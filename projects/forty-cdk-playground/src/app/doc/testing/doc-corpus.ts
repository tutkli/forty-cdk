/**
 * The markdown the documentation site publishes, read once and shared by every
 * characterization spec ([#1805](https://github.com/tutkli/forty-cdk/issues/1805)).
 *
 * Several globs rather than one because the corpus has parts with different
 * membership rules. Every entry point's `README.md` is published by virtue of
 * existing. `docs/` is published through a registry instead — a file there is a
 * guide only once it is named in `PUBLISHED_GUIDES`, and `EXCLUDED_GUIDES`
 * exists precisely because one of them is not — so the guide half is derived
 * from that registry's own source text rather than from the directory listing.
 * `docs/site/` is the same shape one level down: the site's own pages
 * ([#1812](https://github.com/tutkli/forty-cdk/issues/1812)) are read from
 * `SITE_PAGES`, whose order is the navigation's rather than the directory's.
 * Reading the registry as text keeps `scripts/lib/doc-site.mjs` the single
 * definition of "published" without importing it: it reaches for `node:fs` at
 * module scope, which is not something a browser-platform test bundle resolves.
 *
 * All the patterns are written **root-absolute**, matching the rule the
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

const SITE_PAGE_FILES = import.meta.glob('/docs/site/*.md', {
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
const SITE_PAGES_BLOCK = /export const SITE_PAGES = \[([\s\S]*?)\];/;
const REGISTERED_FILE_ENTRY = /file:\s*'([^']+)'/g;

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

function registeredFiles(block: RegExp, name: string): readonly string[] {
  const source = DOC_SITE_REGISTRY['/scripts/lib/doc-site.mjs'];
  if (source === undefined) {
    throw new Error('scripts/lib/doc-site.mjs was not found — the registries cannot be read');
  }
  const found = block.exec(source);
  if (found === null) {
    throw new Error(`scripts/lib/doc-site.mjs no longer declares a ${name} array`);
  }
  return [...found[1]!.matchAll(REGISTERED_FILE_ENTRY)].map((match) => match[1]!);
}

function guideCorpus(): readonly DocFile[] {
  return registeredFiles(PUBLISHED_GUIDES_BLOCK, 'PUBLISHED_GUIDES').map((file) => {
    const markdown = GUIDE_FILES[`/docs/${file}`];
    if (markdown === undefined) {
      throw new Error(`docs/${file} is registered as published but was not found on disk`);
    }
    return { path: `docs/${file}`, slug: file.replace(/\.md$/, ''), markdown };
  });
}

function sitePageCorpus(): readonly DocFile[] {
  return registeredFiles(SITE_PAGES_BLOCK, 'SITE_PAGES').map((file) => {
    const markdown = SITE_PAGE_FILES[`/docs/site/${file}`];
    if (markdown === undefined) {
      throw new Error(`docs/site/${file} is registered as a site page but was not found on disk`);
    }
    return { path: `docs/site/${file}`, slug: file.replace(/\.md$/, ''), markdown };
  });
}

/** Every entry point's README — one per `projects/forty-cdk/<entry point>/`. */
export const PRIMITIVE_DOCS: readonly DocFile[] = readmeCorpus();

/** The guides `scripts/lib/doc-site.mjs` publishes, in registry order. */
export const GUIDE_DOCS: readonly DocFile[] = guideCorpus();

/**
 * The site's own pages, in the order `SITE_PAGES` registers them
 * ([#1812](https://github.com/tutkli/forty-cdk/issues/1812)) — which is a
 * reading order rather than an alphabetical one, and the order the navigation
 * shows them in.
 */
export const PAGE_DOCS: readonly DocFile[] = sitePageCorpus();

/** All three parts, which together are every document the site renders. */
export const SITE_DOCS: readonly DocFile[] = [...PRIMITIVE_DOCS, ...GUIDE_DOCS, ...PAGE_DOCS];

const ROUTES_FILE = import.meta.glob(
  '/projects/forty-cdk-playground/src/generated/routes.generated.ts',
  { query: '?raw', import: 'default', eager: true },
);

/**
 * The route table the generator emitted, as text.
 *
 * Read rather than imported because the routes it declares are lazy: importing
 * the module would ask the spec build to resolve every page component, and the
 * unit-test builder's TypeScript program holds none of them — its AOT plugin
 * then refuses each one as component metadata it was not asked to compile. The
 * rule this is held to is a string equality, so text is all the case needs.
 *
 * The plugin decides that from a file's text on disk, which is also why nothing
 * in the suite inlines a page's source: a raw glob over the demo tree would put
 * a component decorator in this file's own contents and fail it the same way.
 */
export const GENERATED_ROUTES: string = (() => {
  const source = ROUTES_FILE['/projects/forty-cdk-playground/src/generated/routes.generated.ts'];
  if (source === undefined) {
    throw new Error('src/generated/routes.generated.ts was not found — run pnpm gen:doc-model');
  }
  return source;
})();

const APP_ROUTES_FILE = import.meta.glob('/projects/forty-cdk-playground/src/app/app.routes.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * The hand-written route table, as text, read for the same reason as the
 * generated one: importing it would ask the spec build to resolve the page
 * components its lazy routes name.
 */
export const APP_ROUTES: string = (() => {
  const source = APP_ROUTES_FILE['/projects/forty-cdk-playground/src/app/app.routes.ts'];
  if (source === undefined) {
    throw new Error('src/app/app.routes.ts was not found');
  }
  return source;
})();
