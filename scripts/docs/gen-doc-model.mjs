import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { checkContract, foldTargetOf } from '../lib/doc-contract.mjs';
import { buildDocRoutes } from '../lib/doc-links.mjs';
import { readEntryPointDocs, readGuides } from '../lib/doc-site.mjs';
import { repoRoot } from '../lib/repo-path.mjs';
import { foldableOf, withFold } from './doc-fold.mjs';
import { compileDocument, DocCompileError } from './doc-model.mjs';
import { headingText, renderDocument } from './doc-render.mjs';
import { pageFileOf, pageProblems, routesModule } from './doc-routes.mjs';

const OUT_DIR = join(repoRoot, 'projects', 'forty-cdk-playground', 'src', 'generated');
const DOCS_DIR = join(OUT_DIR, 'docs');
const MODEL_TYPES = '../../../app/doc/doc-model';

const rel = (file) => relative(repoRoot, file).split(sep).join('/');

/**
 * Compile every document, then hold the whole corpus to the page-template
 * contract ([#1808](https://github.com/tutkli/forty-cdk/issues/1808)).
 *
 * The contract check runs over every entry point README, published or not: a
 * document with no page yet still declares an archetype, and holding it to that
 * archetype now is what keeps it publishable later.
 */
function compileAll() {
  const sources = [
    ...readEntryPointDocs().map((doc) => ({ ...doc, kind: 'primitive' })),
    ...readGuides().map((guide) => ({
      slug: guide.slug,
      path: `docs/${guide.file}`,
      file: join(repoRoot, 'docs', guide.file),
      kind: 'guide',
    })),
  ];

  const compiled = [];
  const problems = [];
  for (const source of sources) {
    try {
      compiled.push(
        compileDocument(readFileSync(source.file, 'utf8'), {
          path: source.path,
          slug: source.slug,
          kind: source.kind,
        }),
      );
    } catch (error) {
      if (!(error instanceof DocCompileError)) {
        throw error;
      }
      problems.push(...error.problems);
    }
  }

  if (problems.length > 0) {
    throw new DocCompileError(problems);
  }

  const readmes = compiled.filter((document) => document.kind === 'primitive');
  const contract = checkContract(readmes);
  if (contract.length > 0) {
    throw new DocCompileError(contract);
  }

  const unpublished = readmes.filter((document) => document.meta.group === 'none');
  return {
    documents: compiled.filter((document) => document.meta?.group !== 'none'),
    folded: unpublished.filter((document) => foldTargetOf(document.meta) !== null),
    unpublished,
  };
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

/**
 * The navigation registry, derived from the frontmatter each README declares
 * rather than hand-maintained beside it
 * ([#1808](https://github.com/tutkli/forty-cdk/issues/1808)).
 *
 * `description` is the document's own lede, resolved to text — which is why the
 * page can render its intro whole and still show a description in the header:
 * there is one copy, and the compiler decided which part of the document it is.
 */
function registryModule(documents) {
  const entryOf = (document) => ({
    slug: document.slug,
    title: document.meta.title,
    description: headingText(document.lede),
    ...(document.meta.apgUrl === null ? {} : { apgUrl: document.meta.apgUrl }),
  });
  const byTitle = (a, b) => a.title.localeCompare(b.title);
  const of = (group) =>
    documents
      .filter((document) => document.meta.group === group)
      .map(entryOf)
      .sort(byTitle);

  return (
    `import type { PlaygroundPrimitive } from '../app/primitives';\n\n` +
    `export const PRIMITIVES: readonly PlaygroundPrimitive[] = ${serialize(of('primitives'))};\n\n` +
    `export const UTILITIES: readonly PlaygroundPrimitive[] = ${serialize(of('utilities'))};\n`
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

const { documents, folded, unpublished } = compileAll();
const guides = documents.filter((document) => document.kind === 'guide');
const primitives = documents.filter((document) => document.kind === 'primitive');

/**
 * A route is only emitted for a page that exists and exports the component the
 * route names ([#1811](https://github.com/tutkli/forty-cdk/issues/1811)).
 *
 * Refused here rather than left to the site build, which reports the same two
 * mistakes as an esbuild resolution failure and a type error inside a generated
 * file — neither of which names the README that asked for the page.
 */
function checkPages() {
  const problems = pageProblems(
    primitives.map((primitive) => {
      const file = join(repoRoot, pageFileOf(primitive.slug));
      return {
        slug: primitive.slug,
        source: existsSync(file) ? readFileSync(file, 'utf8') : null,
      };
    }),
  );
  if (problems.length > 0) {
    throw new DocCompileError(problems);
  }
}

checkPages();

/**
 * Where a relative link in the markdown lands, resolved here rather than in the
 * browser ([#1807](https://github.com/tutkli/forty-cdk/issues/1807)).
 *
 * The same map `pnpm check:doc-links` gates the sources against: an entry point
 * that has a README and is neither published nor folded is absent from it on
 * purpose, so a link to one resolves to its source on GitHub rather than to a
 * route that would 404.
 */
const routes = buildDocRoutes({
  primitiveSlugs: primitives.map((primitive) => primitive.slug),
  guideSlugs: guides.map((guide) => guide.slug),
  foldedSlugs: folded.map((document) => ({
    slug: document.slug,
    host: foldTargetOf(document.meta).slug,
  })),
});

const keyOf = (document) => `${document.kind}:${document.slug}`;

/**
 * The pages, with every folded README appended to the section it names
 * ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
 *
 * The fold happens over the rendered pages rather than over the compiled
 * documents, so each half is rendered against its own source path and its
 * relative links resolve from where they were written.
 */
function foldedPages() {
  const pages = new Map(
    documents.map((document) => [keyOf(document), renderDocument(document, { routes })]),
  );
  for (const document of folded) {
    const target = foldTargetOf(document.meta);
    const host = pages.get(`primitive:${target.slug}`);
    if (host === undefined) {
      throw new DocCompileError([
        {
          path: document.path,
          line: 1,
          message:
            `foldInto names "${target.slug}", which the site publishes no page for — fold this ` +
            'document into a published page, or give it one of its own',
        },
      ]);
    }
    const [section] = renderDocument(foldableOf(document), { routes }).sections;
    pages.set(`primitive:${target.slug}`, withFold(host, target.section, section));
  }
  return pages;
}

const pages = foldedPages();

write([
  ...documents.map((document) => [
    join(
      DOCS_DIR,
      document.kind === 'guide' ? 'guides' : 'primitives',
      `${document.slug}.generated.ts`,
    ),
    pageModule(pages.get(keyOf(document))),
  ]),
  [join(OUT_DIR, 'doc-index.generated.ts'), indexModule(documents)],
  [join(OUT_DIR, 'guide-docs.generated.ts'), guideModule(guides)],
  [join(OUT_DIR, 'primitives.generated.ts'), registryModule(primitives)],
  [
    join(OUT_DIR, 'routes.generated.ts'),
    routesModule({
      primitiveSlugs: primitives.map((primitive) => primitive.slug),
      guideSlugs: guides.map((guide) => guide.slug),
    }),
  ],
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
    `${documents.length} documents (${guides.length} guides), ${sections} sections, ${tables} tables, ` +
    `${primitives.length + guides.length} routes`,
);
if (folded.length > 0) {
  console.log(
    `[gen-doc-model] folded ${folded.length} entry point README(s) into another page: ` +
      folded.map((document) => `${document.slug} → /${document.meta.foldInto}`).join(', '),
  );
}

const unfolded = unpublished.filter((document) => document.meta.foldInto === null);
if (unfolded.length > 0) {
  console.log(
    `[gen-doc-model] compiled but did not emit ${unfolded.length} entry point README(s) with no page: ` +
      `${unfolded.map((document) => document.slug).join(', ')}`,
  );
}
