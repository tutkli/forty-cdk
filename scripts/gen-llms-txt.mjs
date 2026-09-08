import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { documentMarkdown, rewriteMarkdownLinks } from './docs/doc-markdown.mjs';
import { compileCorpus } from './lib/doc-corpus.mjs';
import {
  buildDocRoutes,
  GITHUB_BLOB_BASE,
  resolveDocLink,
  SITE_URL,
  splitDocHref,
} from './lib/doc-links.mjs';
import { readErrorCodes, RUNTIME_SCOPE } from './lib/error-codes.mjs';
import { repoRoot } from './lib/repo-path.mjs';

/**
 * Publishes the documentation as markdown an assistant can load
 * ([#1816](https://github.com/tutkli/forty-cdk/issues/1816)): one `.md` per
 * document, an [llms.txt](https://llmstxt.org/) index over them, and
 * `llms-full.txt` for indexers.
 *
 * Four decisions are load-bearing.
 *
 * - **It is a consumer of the document model, not a generator of its own.**
 *   Compiled through {@link compileCorpus}, the same call `gen-doc-model.mjs`
 *   emits the site's pages from — so the artifacts inherit resolved links,
 *   validated frontmatter and correctly-read tables, and cannot drift from the
 *   site, because they *are* the site's content in a different serialisation.
 *   Generated from the raw READMEs instead, they would inherit every defect the
 *   docs audit found and hand it to a model that acts on it.
 * - **Every fact the preamble states is read off the package.** The May 2026
 *   `llms.txt` this replaces was hand-authored, and three months later it
 *   claimed 29 components against 52 published, an Angular version one major
 *   behind, and an opening example importing from the bare package name — which
 *   is an empty barrel and does not compile. Nothing here is written by hand
 *   that the repository can be asked: the version, the peers and their optional
 *   flags come from `projects/forty-cdk/package.json`, the entry point
 *   specifiers from the folders themselves, and the claim that the root barrel
 *   exports nothing is asserted against `src/public-api.ts` before it is
 *   published.
 * - **The path convention is the page's own URL plus `.md`.** The page served
 *   at `<site>/select` is published at `<site>/select.md`, so a reader holding
 *   an HTML URL can reach the markdown without a lookup, and a nested route
 *   (`/guides/styling`) needs no special case. The three entry points the site
 *   publishes no page of its own for — `internationalized-date`, and the two
 *   whose README a host page folds in — get `<site>/<entry point>.md` all the
 *   same: each is an entry point a consumer imports from, and a model working
 *   on one wants its README rather than the page that republishes part of it.
 * - **The `FORCDK-*` roster is the one artifact that departs from it**
 *   ([#1848](https://github.com/tutkli/forty-cdk/issues/1848)). It is published
 *   whole at `/errors.md`, and the site's per-code pages get no markdown sibling
 *   — each code is a handful of lines, and an assistant handed one out of a
 *   console wants the roster in a single load rather than 126 near-empty
 *   artifacts beside 71 substantial ones. A departure the index states is a
 *   convention a reader can still follow and a silent one is not, so `llms.txt`
 *   says it where it states the convention.
 */

const BROWSER = join(repoRoot, 'dist', 'forty-cdk-playground', 'browser');
const LIBRARY_PACKAGE = join(repoRoot, 'projects', 'forty-cdk', 'package.json');
const ROOT_BARREL = join(repoRoot, 'projects', 'forty-cdk', 'src', 'public-api.ts');

/** Artifacts this generator owns, and nothing else in the emit may look like. */
const OWNED = /(?:\.md|^llms(?:-full)?\.txt)$/;

const INDEX_FILE = 'llms.txt';
const FULL_FILE = 'llms-full.txt';
const ERRORS_FILE = 'errors.md';

function fail(message) {
  console.error(`[gen-llms-txt] ${message}`);
  process.exit(1);
}

/** The route the site publishes a document under, artifacts aside. */
function routeOf(document) {
  return document.kind === 'guide' ? `/guides/${document.slug}` : `/${document.slug}`;
}

/**
 * The absolute URL a route's markdown is published at.
 *
 * The fragment rides along unchanged: a `.md` file renders its own heading
 * anchors wherever markdown is rendered, and the anchor a link asked for is the
 * heading the compiler slugged it from either way.
 */
function markdownUrl(route) {
  const { path, fragment } = splitDocHref(route);
  return `${SITE_URL}${path.slice(1)}.md${fragment}`;
}

/**
 * The description one entry publishes: the document's own lede, folded onto a
 * line and with its links resolved.
 *
 * Never shortened. A lede is the paragraph its author wrote and the whole
 * corpus's are 8 kB together, so clipping would cost information to save
 * nothing — the decision [#1808](https://github.com/tutkli/forty-cdk/issues/1808)
 * took for every other registry that reads it.
 */
function descriptionOf(document, resolveHref) {
  const lede = rewriteMarkdownLinks(document.lede ?? '', (href) =>
    resolveHref(href, document.path),
  );
  return lede.replace(/\s+/g, ' ').trim();
}

/**
 * A title safe to use as a list item's link text.
 *
 * A `[` or `]` inside it would close the link early and publish the rest as
 * prose. No document's title carries one today, and a title that started to
 * would otherwise break silently in the one file whose job is to be parsed.
 */
function linkTextOf(title, path) {
  if (/[[\]]/.test(title)) {
    fail(`${path} has a title carrying a bracket, which cannot be a link's text: ${title}`);
  }
  return title;
}

function titleOf(document) {
  return linkTextOf(document.meta?.title ?? document.title, document.path);
}

/** `- [Title](url): specifier — description`, the llms.txt entry shape. */
function entryOf(document, resolveHref) {
  const specifier = document.kind === 'primitive' ? `\`forty-cdk/${document.slug}\` — ` : '';
  return `- [${titleOf(document)}](${markdownUrl(routeOf(document))}): ${specifier}${descriptionOf(document, resolveHref)}`;
}

function section(heading, entries) {
  return `## ${heading}\n\n${entries.join('\n')}`;
}

/**
 * One `FORCDK-*` code, in the order a reader diagnosing it needs: the console
 * line they are matching, who reports it, why, and what to do.
 *
 * The headline goes in a fence because it is the string the library prints, and
 * because the prose beside it is full of `[forAccordion]`-shaped selectors that
 * a renderer would otherwise be free to read as a reference link.
 */
function codeMarkdown(entry) {
  const reported = entry.severity === 'warning' ? 'Warned' : 'Thrown';
  const gating = entry.severity === 'warning' ? ', in development builds only' : '';
  const by =
    entry.scope === RUNTIME_SCOPE
      ? `a shared \`forty-cdk/${entry.area}\` check, which reports under the primitive that ran it`
      : `\`forty-cdk/${entry.scope}\``;
  const parts = [
    `### ${entry.code}`,
    '```\n' + `[forty-cdk/${entry.scope}] ${entry.code}: ${entry.message}` + '\n```',
    `${reported} by ${by}${gating}.`,
  ];
  if (entry.cause !== null) {
    parts.push(`**Cause.** ${entry.cause}`);
  }
  if (entry.fix !== null) {
    parts.push(`**Fix.** ${entry.fix}`);
  }
  parts.push(
    `Emitted at [${entry.source}:${entry.line}](${GITHUB_BLOB_BASE}${entry.source}#L${entry.line}).`,
  );
  return parts;
}

/**
 * The whole roster as one artifact, grouped by the entry point each code's area
 * names.
 *
 * This is the one stage allowed to render markdown of its own. Every other
 * artifact is a `DocDocument` serialised by `documentMarkdown`, and the roster
 * cannot be: it comes from {@link readErrorCodes}, an AST scan of the emitter
 * call sites, which is a second source of content and deliberately kept to a
 * single narrow path rather than generalised into "render anything as
 * markdown". A third source wanting an artifact is the point to reconsider the
 * shape.
 *
 * `areaDocumentation` links an area to the markdown of the entry point it
 * names. It is built over the artifacts rather than over the site's routes, so
 * the two entry points whose README a host page folds in are reachable here
 * too — they own a `.md` of their own, which is the thing a reader following an
 * error code wants. Only `core` resolves to nothing, being infrastructure no
 * entry point documents, so a missing link is a case to handle rather than a
 * defect.
 */
function rosterMarkdown(codes, areaDocumentation) {
  const areas = [...new Set(codes.map((entry) => entry.area))].sort((a, b) => a.localeCompare(b));
  const warnings = codes.filter((entry) => entry.severity === 'warning').length;
  const parts = [
    '# Error codes',
    `Every message forty-cdk reports carries a \`FORCDK-<AREA>-<NNN>\` code naming one concrete ` +
      `mistake. This is the whole roster — ${codes.length} codes across ${areas.length} entry ` +
      `points, ${warnings} of them warnings — read from the library's own source, so a code here ` +
      `carries the sentence the console did. A value in braces, like \`{piece}\`, is filled in ` +
      `when the message is reported.`,
    `The site publishes a page per code under [/errors](${SITE_URL}errors). This file is that ` +
      `roster in a single load, and those pages have no markdown sibling of their own.`,
  ];
  for (const area of areas) {
    parts.push(`## forty-cdk/${area}`);
    const documentation = areaDocumentation.get(area);
    if (documentation !== undefined) {
      parts.push(`Documentation: [${documentation.title}](${documentation.url}).`);
    }
    for (const entry of codes.filter((code) => code.area === area)) {
      parts.push(...codeMarkdown(entry));
    }
  }
  return `${parts.join('\n\n')}\n`;
}

/**
 * The peers a consumer has to install, and the ones that unlock one part of the
 * library, read off the library's own manifest.
 */
function peersOf(manifest) {
  const optional = manifest.peerDependenciesMeta ?? {};
  const entries = Object.entries(manifest.peerDependencies ?? {});
  const describe = (list) => list.map(([name, range]) => `\`${name}\` \`${range}\``).join(', ');
  return {
    required: describe(entries.filter(([name]) => optional[name]?.optional !== true)),
    optional: describe(entries.filter(([name]) => optional[name]?.optional === true)),
  };
}

/**
 * Refuses to publish the import instructions if the root barrel ever stops
 * being empty.
 *
 * "The package root exports nothing" is the one sentence in the preamble a
 * model is most likely to act on, and the May file's version of it was the one
 * that did not compile. It is a policy rather than an accident
 * ([#1590](https://github.com/tutkli/forty-cdk/issues/1590)), so asserting it
 * costs a file read and removes the only way this file could lie.
 */
function checkRootBarrel() {
  const source = readFileSync(ROOT_BARREL, 'utf8');
  if (source.replace(/\s/g, '') !== 'export{};') {
    fail(
      `${toPosix(relative(repoRoot, ROOT_BARREL))} no longer exports nothing, and the generated ` +
        'preamble tells every reader that it does — restate the import model before publishing it',
    );
  }
}

function toPosix(path) {
  return path.split(sep).join('/');
}

/** Every file the previous run left behind, so a dropped document leaves nothing. */
function sweep(dir) {
  let removed = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      removed += sweep(full);
    } else if (OWNED.test(entry.name)) {
      rmSync(full);
      removed += 1;
    }
  }
  return removed;
}

function write(file, contents) {
  const full = join(BROWSER, ...file.split('/'));
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, contents, 'utf8');
  return Buffer.byteLength(contents, 'utf8');
}

if (!existsSync(BROWSER)) {
  fail(
    `no prerender output at ${toPosix(relative(repoRoot, BROWSER))} — the artifacts are published ` +
      'beside the emitted HTML, so the static build has to run first (`pnpm build:docs`)',
  );
}

const manifest = JSON.parse(readFileSync(LIBRARY_PACKAGE, 'utf8'));
checkRootBarrel();

let corpus;
try {
  corpus = compileCorpus();
} catch (error) {
  fail(`the corpus does not compile, so no artifact can be published from it:\n${error.message}`);
}

const { documents, unpublished } = corpus;
const all = [...documents, ...unpublished];

const routes = buildDocRoutes({
  primitiveSlugs: all.filter((document) => document.kind === 'primitive').map((doc) => doc.slug),
  guideSlugs: documents.filter((document) => document.kind === 'guide').map((doc) => doc.slug),
  pageSlugs: documents.filter((document) => document.kind === 'page').map((doc) => doc.slug),
});

/**
 * Where a link in the markdown lands.
 *
 * A route becomes the absolute URL of that route's own markdown, so following a
 * link keeps the reader in the same serialisation; anything else the resolver
 * recognises is repository source, which stays a GitHub blob URL because that
 * is where it can be read. An absolute href and a bare `#fragment` are left
 * exactly as written.
 */
function resolveHref(href, sourcePath) {
  const link = resolveDocLink(href, {
    sourcePath,
    routes,
    blobBase: GITHUB_BLOB_BASE,
    prepareUrl: markdownUrl,
  });
  return link === null ? null : link.href;
}

const byGroup = (group) =>
  documents
    .filter((document) => document.kind === 'primitive' && document.meta.group === group)
    .sort((a, b) => a.meta.title.localeCompare(b.meta.title));

const sitePages = documents.filter((document) => document.kind === 'page');
const guides = documents.filter((document) => document.kind === 'guide');
const primitives = byGroup('primitives');
const utilities = byGroup('utilities');
const additional = [...unpublished].sort((a, b) => a.slug.localeCompare(b.slug));

/**
 * The reading order the index publishes, which `llms-full.txt` concatenates in.
 *
 * The count is checked against the corpus rather than assumed: every document
 * belongs to exactly one of these five lists, and a `group` the sections do not
 * name would otherwise drop its document out of the index *and* out of the emit
 * with nothing to say so.
 */
const ordered = [...sitePages, ...primitives, ...utilities, ...guides, ...additional];
if (ordered.length !== all.length) {
  fail(
    `the index sections hold ${ordered.length} of ${all.length} compiled document(s) — a document ` +
      'belongs to no section, so it would reach neither the index nor the emit',
  );
}

const pages = ordered.map((document) => ({
  document,
  file: `${routeOf(document).slice(1)}.md`,
  markdown: documentMarkdown(document, resolveHref),
}));

const { codes: errorCodes, problems: codeProblems } = readErrorCodes();
if (codeProblems.length > 0) {
  fail(
    `${codeProblems.length} emitter call(s) cannot be read, so the roster would be published ` +
      `short of the codes the library emits:\n` +
      codeProblems.map(({ path, line, message }) => `  ${path}:${line} — ${message}`).join('\n'),
  );
}

const areaDocumentation = new Map(
  all
    .filter((document) => document.kind === 'primitive')
    .map((document) => [
      document.slug,
      { title: titleOf(document), url: markdownUrl(routeOf(document)) },
    ]),
);
const roster = rosterMarkdown(errorCodes, areaDocumentation);

const removed = sweep(BROWSER);
const full =
  `# forty-cdk — the full documentation\n\n` +
  `Every document the documentation site publishes, concatenated, with the \`FORCDK-*\` error ` +
  `roster after them. Each is also published on its own at the URL its page is served from plus ` +
  `\`.md\`; see ${SITE_URL}${INDEX_FILE}.\n\n` +
  [...pages.map((page) => page.markdown), roster].join('\n---\n\n');

const pageBytes = pages.map((page) => write(page.file, page.markdown));
const rosterBytes = write(ERRORS_FILE, roster);
const fullBytes = write(FULL_FILE, full);

const peers = peersOf(manifest);
const index = [
  `# forty-cdk`,
  '',
  `> ${manifest.description} Every primitive exposes state, behavior, focus management and keyboard interaction, and applies no styles of its own.`,
  '',
  `Version ${manifest.version}, documented in ${pages.length} pages listed below: ${primitives.length} primitives, ${utilities.length} utilities, ${guides.length} guides, ${sitePages.length} orientation pages and ${additional.length} further entry points. Required peers: ${peers.required}. Optional peers, each unlocking one part of the library: ${peers.optional}.`,
  '',
  '```bash',
  `npm install ${manifest.name}`,
  '```',
  '',
  `**The package root exports nothing.** \`import { ForDialog } from '${manifest.name}'\` resolves to an empty barrel and does not compile. Every primitive ships as its own secondary entry point, named after its folder, and the entry point specifier is published before each description below.`,
  '',
  `Each page of the documentation site is published as markdown at that page's own URL plus \`.md\` — the page at ${SITE_URL}select is ${SITE_URL}select.md. The error roster is the one departure: ${SITE_URL}${ERRORS_FILE} carries every \`FORCDK-*\` code in a single file, and the per-code pages under ${SITE_URL}errors have no markdown sibling of their own. Load the one page you need; \`${FULL_FILE}\` is every document at once and is listed under Optional for indexers.`,
  '',
  section(
    'Getting started',
    sitePages.map((document) => entryOf(document, resolveHref)),
  ),
  '',
  section(
    'Primitives',
    primitives.map((document) => entryOf(document, resolveHref)),
  ),
  '',
  section(
    'Utilities',
    utilities.map((document) => entryOf(document, resolveHref)),
  ),
  '',
  section(
    'Guides',
    guides.map((document) => entryOf(document, resolveHref)),
  ),
  '',
  section(
    'Additional entry points',
    additional.map((document) => entryOf(document, resolveHref)),
  ),
  '',
  section('Reference', [
    `- [Error codes](${SITE_URL}${ERRORS_FILE}): Every \`FORCDK-*\` message the library can ` +
      `report — ${errorCodes.length} codes across ` +
      `${new Set(errorCodes.map((entry) => entry.area)).size} entry points, each with the console ` +
      `line it prints, its cause, its fix and the source it is emitted from.`,
  ]),
  '',
  section('Optional', [
    `- [${FULL_FILE}](${SITE_URL}${FULL_FILE}): Every document above concatenated, error roster included, ${Math.round(fullBytes / 1024)} kB. Published for indexers — load the individual pages instead.`,
  ]),
  '',
].join('\n');

const indexBytes = write(INDEX_FILE, index);

console.log(
  `[gen-llms-txt] wrote ${toPosix(relative(repoRoot, BROWSER))} — ${pages.length} page(s) ` +
    `(${Math.round(pageBytes.reduce((total, bytes) => total + bytes, 0) / 1024)} kB), ` +
    `${INDEX_FILE} (${(indexBytes / 1024).toFixed(1)} kB, ${primitives.length} primitives + ` +
    `${utilities.length} utilities + ${guides.length} guides + ${sitePages.length} site pages + ` +
    `${additional.length} entry points with no page), ${ERRORS_FILE} ` +
    `(${(rosterBytes / 1024).toFixed(1)} kB, ${errorCodes.length} FORCDK-* code(s) across ` +
    `${new Set(errorCodes.map((entry) => entry.area)).size} area(s)), ${FULL_FILE} ` +
    `(${Math.round(fullBytes / 1024)} kB)` +
    (removed > 0 ? `; swept ${removed} artifact(s) from a previous run` : ''),
);
