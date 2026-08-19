import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, sep } from 'node:path';

import { buildDocRoutes } from '../lib/doc-links.mjs';
import { LIBRARY_DIR, readGuides, readPrimitives } from '../lib/doc-site.mjs';
import { repoRoot } from '../lib/repo-path.mjs';
import { compileDocument, DocCompileError } from './doc-model.mjs';
import { headingText, renderDocument } from './doc-render.mjs';

const OUT_DIR = join(repoRoot, 'projects', 'forty-cdk-playground', 'src', 'generated');
const DOCS_DIR = join(OUT_DIR, 'docs');
const MODEL_TYPES = '../../../app/doc/doc-model';

/** Holds no entry point and ships no page — its README documents lint fixtures. */
const NOT_AN_ENTRY_POINT = 'eslint-rules-fixtures';

const rel = (file) => relative(repoRoot, file).split(sep).join('/');

function entryPointReadmes() {
  const readmes = [];
  for (const entry of readdirSync(LIBRARY_DIR).sort()) {
    if (entry === NOT_AN_ENTRY_POINT || !statSync(join(LIBRARY_DIR, entry)).isDirectory()) {
      continue;
    }
    const file = join(LIBRARY_DIR, entry, 'README.md');
    if (existsSync(file)) {
      readmes.push({ slug: entry, path: `projects/forty-cdk/${entry}/README.md`, file });
    }
  }
  return readmes;
}

function compileAll() {
  const published = new Set(readPrimitives().map((primitive) => primitive.slug));
  const sources = [
    ...entryPointReadmes().map((readme) => ({ ...readme, kind: 'primitive' })),
    ...readGuides().map((guide) => ({
      slug: guide.slug,
      path: `docs/${guide.file}`,
      file: join(repoRoot, 'docs', guide.file),
      kind: 'guide',
    })),
  ];

  const documents = [];
  const unpublished = [];
  const problems = [];
  for (const source of sources) {
    let document;
    try {
      document = compileDocument(readFileSync(source.file, 'utf8'), {
        path: source.path,
        slug: source.slug,
        kind: source.kind,
      });
    } catch (error) {
      if (!(error instanceof DocCompileError)) {
        throw error;
      }
      problems.push(...error.problems);
      continue;
    }
    if (source.kind === 'primitive' && !published.has(source.slug)) {
      unpublished.push(document);
      continue;
    }
    documents.push(document);
  }

  if (problems.length > 0) {
    throw new DocCompileError(problems);
  }
  return { documents, unpublished };
}

function serialize(value) {
  return JSON.stringify(value, null, 2);
}

function pageModule(page) {
  return (
    `import type { DocPage } from '${MODEL_TYPES}';\n\n` +
    `export const DOC: DocPage = ${serialize(page)};\n`
  );
}

/**
 * Section titles reach the palette resolved, the same way the page renders them:
 * `## Shared \`disabled\`` is one heading, and a reader searching for it should
 * not have to type the backticks the page does not show.
 */
function indexModule(documents) {
  const entries = documents.map((document) => ({
    kind: document.kind,
    slug: document.slug,
    sections: document.sections.map((section) => ({
      title: headingText(section.title),
      slug: section.slug,
    })),
  }));
  return (
    `import type { DocIndexEntry } from '../app/doc/doc-model';\n\n` +
    `export const DOC_INDEX: readonly DocIndexEntry[] = ${serialize(entries)};\n`
  );
}

function identifierOf(slug) {
  return `${slug.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase())}Doc`;
}

function guideModule(guides) {
  const imports = guides
    .map(
      (guide) =>
        `import { DOC as ${identifierOf(guide.slug)} } from './docs/guides/${guide.slug}.generated';`,
    )
    .join('\n');
  const entries = guides
    .map((guide) => `  ${JSON.stringify(guide.slug)}: ${identifierOf(guide.slug)},`)
    .join('\n');
  return (
    `import type { DocPage } from '../app/doc/doc-model';\n${imports}\n\n` +
    `export const GUIDE_DOCS: Readonly<Record<string, DocPage>> = {\n${entries}\n};\n`
  );
}

/**
 * The generated tree is rewritten from scratch on every run, so a document that
 * stops being published leaves nothing behind — the failure mode
 * [#1804](https://github.com/tutkli/forty-cdk/issues/1804) recorded, where a
 * gitignored artefact outlives the content it was generated from.
 */
function write(files) {
  rmSync(OUT_DIR, { recursive: true, force: true });
  for (const [file, contents] of files) {
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, contents, 'utf8');
  }
}

const { documents, unpublished } = compileAll();
const guides = documents.filter((document) => document.kind === 'guide');

/**
 * Where a relative link in the markdown lands, resolved here rather than in the
 * browser ([#1807](https://github.com/tutkli/forty-cdk/issues/1807)).
 *
 * The same map `pnpm check:doc-links` gates the sources against: an entry point
 * that has a README but ships no page is absent from it on purpose, so a link to
 * one resolves to its source on GitHub rather than to a route that would 404.
 */
const routes = buildDocRoutes({
  primitiveSlugs: readPrimitives().map((primitive) => primitive.slug),
  guideSlugs: guides.map((guide) => guide.slug),
});

write([
  ...documents.map((document) => [
    join(
      DOCS_DIR,
      document.kind === 'guide' ? 'guides' : 'primitives',
      `${document.slug}.generated.ts`,
    ),
    pageModule(renderDocument(document, { routes })),
  ]),
  [join(OUT_DIR, 'doc-index.generated.ts'), indexModule(documents)],
  [join(OUT_DIR, 'guide-docs.generated.ts'), guideModule(guides)],
]);

const tables = documents.reduce(
  (total, document) =>
    total +
    document.sections.reduce(
      (count, section) => count + section.blocks.filter((block) => block.kind === 'table').length,
      0,
    ),
  0,
);
const sections = documents.reduce((total, document) => total + document.sections.length, 0);

console.log(
  `[gen-doc-model] wrote ${rel(OUT_DIR)} — ` +
    `${documents.length} documents (${guides.length} guides), ${sections} sections, ${tables} tables`,
);
if (unpublished.length > 0) {
  console.log(
    `[gen-doc-model] compiled but did not emit ${unpublished.length} entry point README(s) with no page: ` +
      `${unpublished.map((document) => document.slug).join(', ')}`,
  );
}
