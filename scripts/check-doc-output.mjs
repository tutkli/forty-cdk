import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { JSDOM } from 'jsdom';

import { DOC_BASE_TOKEN, isAbsoluteHref, splitDocHref } from './lib/doc-links.mjs';
import { compileDocument } from './docs/doc-model.mjs';
import { DOCS_DIR, LIBRARY_DIR, readGuides, readPrimitives } from './lib/doc-site.mjs';
import { repoRoot } from './lib/repo-path.mjs';

/**
 * Gates the documentation site's emitted HTML — every link it publishes and
 * every section its documents declare
 * ([#1802](https://github.com/tutkli/forty-cdk/issues/1802)).
 *
 * `check-prerender-output.mjs` asserts each route emitted a page and that the
 * page's shell rendered; both halves come from the registry, so a parse that
 * returned zero sections would still pass it. That is why 215 broken links
 * ([#1800](https://github.com/tutkli/forty-cdk/issues/1800)) shipped with every
 * gate green. `pnpm check:doc-links` closed the source half — it resolves the
 * links a document *writes*. This closes the other one: what the site actually
 * serves.
 *
 * Five decisions are load-bearing:
 *
 * - **It reads the DOM, not the HTML text.** The two questions that matter —
 *   does this fragment have an element to land on, and is this anchor part of
 *   the documentation or part of a live example — are `getElementById` and
 *   `closest()`. Neither survives a regex over 15.8 MB of markup honestly, and
 *   this is a gate whose whole point is that the previous one measured the
 *   wrapper. jsdom already ships as a devDependency for the unit suite, and one
 *   pass over all 64 pages costs ~14s against a 97s build.
 * - **Anchors inside a live example are out of scope**, which is what
 *   {@link EXAMPLE_FRAME} selects. A demo's markup is *data*: the breadcrumbs
 *   examples navigate `/components/navigation`, the hover-card trigger points at
 *   `#ada`, and a gate that failed those is a gate someone disables. Ten anchors
 *   are excluded today and the count is reported, so the exclusion cannot grow
 *   unseen.
 * - **The base href comes from each page**, never from `angular.json`. It is
 *   what a browser resolves against, so reading it from the emit measures the
 *   thing that breaks: with `baseHref: '/forty-cdk/'`, a bare `/menu` is a 404
 *   on Pages even though it looks internal.
 * - **A fragment is checked against its target page**, not only the page that
 *   writes it. The id lives in the target's prerendered HTML either way, and
 *   cross-page anchors are where a renamed section actually breaks.
 * - **Content is asserted per section, not per page.** A page-wide block floor
 *   would have to be a number someone picked; "every `##` the document declares
 *   emitted a `<section>`, and every emitted section carries at least one
 *   block" is derived from the document itself, and it is the shape that catches
 *   the parser collapsing one section into its neighbour.
 *
 * External links are deliberately not fetched: network access in a PR gate
 * trades a real failure mode for a flaky one, and that belongs in a nightly job
 * if it is ever wanted.
 */

const BROWSER = join(repoRoot, 'dist', 'forty-cdk-playground', 'browser');

/** Selects the frame a live demo renders inside — see the second decision. */
const EXAMPLE_FRAME = '.preview';

/**
 * The section whose body the site replaces with its live demos. Anything a
 * README nests under it is published on GitHub and absent from the site, which
 * is the mechanism behind two of the three anchors this gate first found.
 */
const EXAMPLES_SECTION = 'examples';

/**
 * Pages the site serves without a document behind them: the home redirect and
 * the guide index. They own no `##` sections, so the content assertions skip
 * them — their existence is `check-prerender-output`'s question.
 */
const SHELL_ROUTES = new Set(['', 'guides']);

/** Prerendered HTML above this is worth surfacing, not failing ([#1807](https://github.com/tutkli/forty-cdk/issues/1807)). */
const PAGE_WEIGHT_WARNING = 600 * 1024;

/**
 * Floors that keep a green run from being a vacuous one. Each is far below
 * today's measurement (6 229 documentation anchors, 1 639 fragments, 301
 * declared tables) and is a floor, not a target: they fail the scan that stopped
 * finding anchors rather than reporting "0 links, ok".
 */
const ANCHOR_FLOOR = 3000;
const FRAGMENT_FLOOR = 500;
const TABLE_FLOOR = 150;

function fail(message) {
  console.error(`[check-doc-output] ${message}`);
  process.exit(1);
}

function toPosix(path) {
  return path.split(sep).join('/');
}

function indexFiles(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      indexFiles(full, found);
    } else if (entry.name === 'index.html') {
      found.push(full);
    }
  }
  return found;
}

/**
 * The tables a document declares outside {@link EXAMPLES_SECTION} and the
 * anchors of the headings it nests inside it, so a fragment that resolves only
 * on GitHub is reported with its cause rather than as a mystery.
 *
 * Read off the compiled model rather than scanned for a second time
 * ([#1806](https://github.com/tutkli/forty-cdk/issues/1806)): a gate that
 * reimplements the pipeline it gates can only tell you the two agree with each
 * other.
 */
function readDocumentShape(document) {
  let tables = 0;
  const exampleAnchors = new Set();

  for (const section of document.sections) {
    if (section.slug === EXAMPLES_SECTION) {
      for (const heading of section.headings) {
        exampleAnchors.add(heading.slug);
      }
      continue;
    }
    tables += section.blocks.filter((block) => block.kind === 'table').length;
  }

  return { tables, exampleAnchors };
}

if (!existsSync(BROWSER)) {
  fail(
    `prerender output not found at ${toPosix(relative(repoRoot, BROWSER))} — run \`pnpm build:docs\` first`,
  );
}

const primitives = readPrimitives();
const guides = readGuides();

const documents = new Map();
for (const { slug } of primitives) {
  const file = join(LIBRARY_DIR, slug, 'README.md');
  if (existsSync(file)) {
    documents.set(
      slug,
      compileDocument(readFileSync(file, 'utf8'), {
        path: `projects/forty-cdk/${slug}/README.md`,
        slug,
        kind: 'primitive',
      }),
    );
  }
}
for (const guide of guides) {
  documents.set(
    `guides/${guide.slug}`,
    compileDocument(readFileSync(join(DOCS_DIR, guide.file), 'utf8'), {
      path: `docs/${guide.file}`,
      slug: guide.slug,
      kind: 'guide',
    }),
  );
}

const knownRoutes = new Set([
  '',
  'guides',
  ...primitives.map(({ slug }) => slug),
  ...guides.map(({ slug }) => `guides/${slug}`),
]);

/** One entry per prerendered page: its ids, its documentation anchors, its emitted sections. */
const pages = new Map();
let excludedAnchors = 0;

for (const file of indexFiles(BROWSER)) {
  const route = toPosix(relative(BROWSER, file)).replace(/(^|\/)index\.html$/, '');
  const dom = new JSDOM(readFileSync(file, 'utf8'));
  const doc = dom.window.document;

  const anchors = [];
  for (const anchor of doc.querySelectorAll('a[href]')) {
    if (anchor.closest(EXAMPLE_FRAME) !== null) {
      excludedAnchors += 1;
      continue;
    }
    anchors.push(anchor.getAttribute('href'));
  }

  const sections = new Map();
  for (const section of doc.querySelectorAll('section.pg-doc-section[id]')) {
    sections.set(
      section.id,
      section.querySelectorAll('.pg-doc-prose, api-table, compact-table').length,
    );
  }

  pages.set(route, {
    file,
    baseHref: doc.querySelector('base')?.getAttribute('href') ?? null,
    isRedirect: doc.querySelector('meta[http-equiv="refresh" i]') !== null,
    ids: new Set([...doc.querySelectorAll('[id]')].map((element) => element.id)),
    anchors,
    sections,
    tables: doc.querySelectorAll('table').length,
    bytes: statSync(file).size,
  });

  dom.window.close();
}

const failures = [];
const warnings = [];
let scannedAnchors = 0;
let checkedFragments = 0;
let declaredTables = 0;

const EXPECTED_PAGES = knownRoutes.size;
if (pages.size !== EXPECTED_PAGES) {
  fail(
    `scanned ${pages.size} prerendered page(s) for ${EXPECTED_PAGES} known route(s) — the emit and ` +
      'the registry disagree, so this run proves nothing about the difference',
  );
}

const baseHrefs = new Set([...pages.values()].map((page) => page.baseHref).filter(Boolean));
if (baseHrefs.size !== 1) {
  fail(
    baseHrefs.size === 0
      ? 'no page emits a <base href>, so every internal link resolves against the URL it was served from'
      : `pages emit ${baseHrefs.size} different <base href> values (${[...baseHrefs].join(', ')}) — ` +
          'the site cannot be checked against a base it does not agree on',
  );
}
const siteBaseHref = [...baseHrefs][0];

/**
 * Resolves one fragment against the ids its target page emitted, naming the
 * cause when the heading does exist in the source but under
 * {@link EXAMPLES_SECTION} — an anchor that works on GitHub and cannot work
 * here, which is how two of the three this gate first found came about.
 */
function checkFragment(at, href, target, anchor) {
  const targetPage = pages.get(target);
  if (targetPage === undefined) {
    return `${at} — "${href}" carries a fragment for a page that was not prerendered`;
  }
  if (targetPage.ids.has(anchor)) {
    return null;
  }

  const document = documents.get(target);
  const cause =
    document !== undefined && readDocumentShape(document).exampleAnchors.has(anchor)
      ? '; the heading is nested under "## Examples", whose body the site replaces with its live demos'
      : '';
  const where = at === `/${target}` ? 'this page' : target === '' ? 'the home page' : `/${target}`;
  return `${at} — "${href}" has no element with that id on ${where}${cause}`;
}

for (const [route, page] of pages) {
  const at = route === '' ? '(home)' : `/${route}`;

  if (page.baseHref === null && !page.isRedirect) {
    failures.push(`${at} — emits no <base href>, so every internal link resolves against the URL`);
    continue;
  }

  if (page.bytes > PAGE_WEIGHT_WARNING) {
    warnings.push(`${at} — ${(page.bytes / 1024).toFixed(0)} kB of prerendered HTML`);
  }

  const baseHref = page.baseHref ?? siteBaseHref;

  for (const href of page.anchors) {
    scannedAnchors += 1;

    if (href.includes('.claude/')) {
      failures.push(
        `${at} — "${href}" publishes agent instrumentation under .claude/, which never ships; ` +
          'inline the prose the reader needs instead',
      );
      continue;
    }

    if (href.includes(DOC_BASE_TOKEN)) {
      failures.push(
        `${at} — "${href}" still carries the ${DOC_BASE_TOKEN} stand-in the renderer writes where ` +
          "the site's base href belongs, so the page bound the markup without substituting it",
      );
      continue;
    }

    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) {
      continue;
    }

    const { path, fragment } = splitDocHref(href);

    if (path === '') {
      checkedFragments += 1;
      const fragmentFailure = checkFragment(at, href, route, fragment.slice(1));
      if (fragmentFailure !== null) {
        failures.push(fragmentFailure);
      }
      continue;
    }

    if (!path.startsWith('/')) {
      failures.push(
        `${at} — "${href}" is a relative href, so it resolves against whichever URL the reader ` +
          'happens to be on rather than against a route',
      );
      continue;
    }

    if (!path.startsWith(baseHref)) {
      failures.push(
        `${at} — "${href}" is not under the site's base href "${baseHref}", so it is a 404 ` +
          'wherever the site is not served from the domain root',
      );
      continue;
    }

    const target = path.slice(baseHref.length).replace(/\/$/, '');

    if (/\.md$/.test(target) || target.includes('/src/')) {
      failures.push(
        `${at} — "${href}" points at repository source the site does not serve; it is a relative ` +
          'link the renderer failed to resolve to a route or a GitHub blob',
      );
      continue;
    }

    if (!knownRoutes.has(target) && !existsSync(join(BROWSER, ...target.split('/')))) {
      failures.push(`${at} — "${href}" resolves to "${target || '/'}", which is not a known route`);
      continue;
    }

    if (fragment === '') {
      continue;
    }

    checkedFragments += 1;
    const fragmentFailure = checkFragment(at, href, target, fragment.slice(1));
    if (fragmentFailure !== null) {
      failures.push(fragmentFailure);
    }
  }

  if (SHELL_ROUTES.has(route)) {
    continue;
  }

  const document = documents.get(route);
  if (document === undefined) {
    failures.push(`${at} — no document behind this page, so nothing gates what it renders`);
    continue;
  }

  for (const section of document.sections) {
    if (!page.sections.has(section.slug)) {
      failures.push(
        `${at} — the document declares "## ${section.title}" and the page emits no section for it`,
      );
    }
  }

  for (const [id, blocks] of page.sections) {
    if (blocks === 0 && id !== EXAMPLES_SECTION) {
      failures.push(`${at} — section "#${id}" rendered no content block, so its body collapsed`);
    }
  }

  const shape = readDocumentShape(document);
  declaredTables += shape.tables;
  if (page.tables < shape.tables) {
    failures.push(
      `${at} — the document declares ${shape.tables} table(s) and the page emits ${page.tables}; ` +
        'a table the parser dropped loses its rows silently',
    );
  }
}

if (failures.length > 0) {
  console.error(`[check-doc-output] FAIL — ${failures.length} problem(s) in the emitted site:`);
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

if (scannedAnchors < ANCHOR_FLOOR) {
  fail(
    `scanned only ${scannedAnchors} documentation anchor(s) (floor ${ANCHOR_FLOOR}) — the scan has ` +
      "stopped seeing the site's links, so a green run proves nothing",
  );
}

if (checkedFragments < FRAGMENT_FLOOR) {
  fail(
    `checked only ${checkedFragments} fragment(s) against an id (floor ${FRAGMENT_FLOOR}) — the ` +
      'fragment half of this gate is no longer running',
  );
}

if (declaredTables < TABLE_FLOOR) {
  fail(
    `read only ${declaredTables} declared table(s) from ${documents.size} documents (floor ` +
      `${TABLE_FLOOR}) — the table extraction has stopped matching`,
  );
}

for (const warning of warnings) {
  console.warn(`[check-doc-output] warn — ${warning}`);
}

console.log(
  `[check-doc-output] ok — ${pages.size} pages, ${scannedAnchors} documentation anchors ` +
    `(${excludedAnchors} inside live examples, not scanned), ${checkedFragments} fragments resolved ` +
    `to an id, ${declaredTables} declared tables emitted across ${documents.size} documents` +
    (warnings.length > 0
      ? `; ${warnings.length} page(s) past ${PAGE_WEIGHT_WARNING / 1024} kB`
      : ''),
);
