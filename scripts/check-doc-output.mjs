import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { JSDOM } from 'jsdom';

import { behaviorGroupOf } from './lib/doc-contract.mjs';
import { DOC_BASE_TOKEN, isAbsoluteHref, splitDocHref } from './lib/doc-links.mjs';
import { readErrorCodes } from './lib/error-codes.mjs';
import { compileDocument } from './docs/doc-model.mjs';
import {
  DOCS_DIR,
  LIBRARY_DIR,
  readGuides,
  readPrimitives,
  readSitePages,
  SITE_DIR,
} from './lib/doc-site.mjs';
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
 * Seven decisions are load-bearing:
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
 *   the parser collapsing one section into its neighbour. The Examples block is
 *   the one section whose body is demos rather than prose, so a
 *   {@link EXAMPLE_FRAME} counts for it — and it has to carry one or the other
 *   ([#1878](https://github.com/tutkli/forty-cdk/issues/1878)).
 * - **The rail is gated here rather than in a spec**
 *   ([#1810](https://github.com/tutkli/forty-cdk/issues/1810)). Grouping a
 *   page's specific sections is a rendering change over anchors that must keep
 *   resolving, and the site's own unit target cannot mount `DocToc` — its
 *   TypeScript program holds no page component, so a file carrying Angular
 *   metadata is refused. The emitted HTML is where the claim can be made, and
 *   it is the stronger place to make it.
 * - **The rail's order is read against the page's own, not against the
 *   document's** ([#1863](https://github.com/tutkli/forty-cdk/issues/1863)).
 *   Every anchor still resolving is what the check above asks; that they resolve
 *   in the sequence the reader scrolls through is the claim the rail exists to
 *   make, and it had been false on twelve of the fifty-four pages. Ranking each
 *   link by where its target `id` appears in the emitted DOM measures the page a
 *   browser renders — demos, folded content and the synthetic Examples entry
 *   included — rather than the section list the compiler handed it.
 *
 * External links are deliberately not fetched: network access in a PR gate
 * trades a real failure mode for a flaky one, and that belongs in a nightly job
 * if it is ever wanted.
 */

const BROWSER = join(repoRoot, 'dist', 'forty-cdk-docs', 'browser');

/** Selects the frame a live demo renders inside — see the second decision. */
const EXAMPLE_FRAME = '.preview';

/**
 * The section whose body the site replaces with its live demos, on a page that
 * projects one into the block. Anything a README nests under it is then
 * published on GitHub and absent from the site, which is the mechanism behind
 * two of the three anchors this gate first found.
 */
const EXAMPLES_SECTION = 'examples';

/**
 * The parts list the synthesised Examples block renders below
 * ([#1865](https://github.com/tutkli/forty-cdk/issues/1865)).
 */
const ANATOMY_SECTION = 'anatomy';

/**
 * Pages the site serves without a document behind them: the landing page and
 * the guide index. They own no `##` sections, so the content assertions skip
 * them — their existence is `check-prerender-output`'s question.
 *
 * The site's own prose pages are **not** here
 * ([#1812](https://github.com/tutkli/forty-cdk/issues/1812)): each compiles from
 * a document, so each is held to the same section and rail assertions a README
 * is.
 */
const SHELL_ROUTES = new Set(['', 'guides']);

/**
 * The `FORCDK-*` roster, whose pages are the site's other content without a
 * document behind them ([#1736](https://github.com/tutkli/forty-cdk/issues/1736)).
 *
 * They are generated from library source rather than compiled from markdown, so
 * the section and rail assertions have nothing to hold them to — what this file
 * checks instead is that the index links every code, which is the way a page
 * could go unreachable while still being emitted.
 */
const errorCodes = readErrorCodes().codes;
const errorRoutes = new Set(['errors', ...errorCodes.map(({ code }) => `errors/${code}`)]);

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
const RAIL_FLOOR = 40;
const RAIL_LINK_FLOOR = 300;
const SYNTHESISED_EXAMPLES_FLOOR = 5;

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

let groupedRails = 0;
let closedRails = 0;
let railLinks = 0;
let synthesisedExamples = 0;

/**
 * What the rail publishes against what the document declares
 * ([#1810](https://github.com/tutkli/forty-cdk/issues/1810)).
 *
 * Two claims are load-bearing, and neither is checked anywhere else. Grouping
 * moves an entry down a level, so every section the document declares must
 * still be linked from somewhere in the rail: a page that quietly stopped
 * listing its specific ones would pass every other check here — the sections
 * themselves are still emitted, and their fragments still resolve — while
 * having lost the navigation this gate exists to protect. And the rail's
 * flattened links must arrive in the order the page renders their targets,
 * which is the sentence the component's own heading makes and the one the
 * grouping had been breaking
 * ([#1863](https://github.com/tutkli/forty-cdk/issues/1863)): a reader who
 * trusts a rail that lies navigates to the wrong place, and one who stops
 * trusting it has lost the rail on every page rather than on this one.
 */
function railFailures(at, page, document) {
  const problems = [];
  const rail = page.rail;
  if (rail === null) {
    return [`${at} — the page emits no "On this page" rail`];
  }

  const group = behaviorGroupOf(document);
  if (group === null) {
    if (rail.expanded !== null) {
      problems.push(
        `${at} — the rail groups its sections, and the document is one the contract leaves flat`,
      );
    }
  } else {
    groupedRails += 1;
    if (rail.expanded === null) {
      problems.push(
        `${at} — the document's specific sections are grouped under "${group.title}" and the rail ` +
          'emits no control to expand them',
      );
    } else {
      if (rail.expanded === 'false') {
        closedRails += 1;
      }
      if (!page.ids.has(rail.controls)) {
        problems.push(
          `${at} — the rail's group control points at "#${rail.controls}", which the page does not emit`,
        );
      }
    }
  }

  for (const section of document.sections) {
    if (!rail.fragments.has(section.slug)) {
      problems.push(
        `${at} — the rail no longer links "## ${section.title}", so the grouping dropped it ` +
          'rather than nesting it',
      );
    }
  }

  let furthest = -1;
  let previous = null;
  for (const fragment of rail.links) {
    const rank = page.order.get(fragment);
    if (rank === undefined) {
      continue;
    }
    railLinks += 1;
    if (rank < furthest) {
      problems.push(
        `${at} — the rail links "#${fragment}" below "#${previous}" and the page renders it ` +
          'above, so the rail states an order the page does not use',
      );
      break;
    }
    furthest = rank;
    previous = fragment;
  }
  return problems;
}

/**
 * Where a page renders the demos of a document that declares no `## Examples`
 * ([#1865](https://github.com/tutkli/forty-cdk/issues/1865)).
 *
 * The site synthesises that heading for a page projecting a demo into the
 * block, and its position is the page template's rather than index
 * 0: `## Anatomy` is the "what directives exist" reference a demo means nothing
 * without, so the block follows it. The claim is read off the emitted DOM for
 * the same reason the rail's order is — the body and the rail take the split
 * from one place, and this is the page a reader scrolls.
 *
 * Two kinds of page are out of scope here. One whose document declares no
 * `## Anatomy` follows that document's prelude instead, which is a fact about
 * the rings rather than about an id; and one whose only demo is its hero
 * renders it above the intro, so it synthesises no block at all
 * ([#1872](https://github.com/tutkli/forty-cdk/issues/1872)) — `/menu` is that
 * page, which is why five of the seven documents declaring no `## Examples` are
 * counted here. `doc-section-layout.spec.ts` is where both rules are stated.
 */
function examplesSlotFailures(at, page, document) {
  if (document.sections.some((section) => section.slug === EXAMPLES_SECTION)) {
    return [];
  }
  const demos = page.order.get(EXAMPLES_SECTION);
  const anatomy = page.order.get(ANATOMY_SECTION);
  if (demos === undefined || anatomy === undefined) {
    return [];
  }
  synthesisedExamples += 1;
  return demos > anatomy
    ? []
    : [
        `${at} — the page synthesises "#${EXAMPLES_SECTION}" above "#${ANATOMY_SECTION}", so it ` +
          'opens with its live demos and states the pieces they compose below them',
      ];
}

if (!existsSync(BROWSER)) {
  fail(
    `prerender output not found at ${toPosix(relative(repoRoot, BROWSER))} — run \`pnpm build:docs\` first`,
  );
}

const primitives = readPrimitives();
const guides = readGuides();
const sitePages = readSitePages();

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
for (const page of sitePages) {
  documents.set(
    page.slug,
    compileDocument(readFileSync(join(SITE_DIR, page.file), 'utf8'), {
      path: `docs/site/${page.file}`,
      slug: page.slug,
      kind: 'page',
    }),
  );
}

const knownRoutes = new Set([
  '',
  'guides',
  ...sitePages.map(({ slug }) => slug),
  ...primitives.map(({ slug }) => slug),
  ...guides.map(({ slug }) => `guides/${slug}`),
  ...errorRoutes,
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

  const rail = doc.querySelector('nav.pg-toc');
  const toggle = rail?.querySelector('.pg-toc-toggle') ?? null;
  const links =
    rail === null
      ? []
      : [...rail.querySelectorAll('a[href]')]
          .map((anchor) => splitDocHref(anchor.getAttribute('href')).fragment.slice(1))
          .filter((fragment) => fragment !== '');

  const order = new Map();
  for (const element of doc.querySelectorAll('[id]')) {
    if (!order.has(element.id)) {
      order.set(element.id, order.size);
    }
  }

  const sections = new Map();
  for (const section of doc.querySelectorAll('section.pg-doc-section[id]')) {
    sections.set(section.id, {
      blocks: section.querySelectorAll('.pg-doc-prose, api-table, compact-table').length,
      frames: section.querySelectorAll(EXAMPLE_FRAME).length,
    });
  }

  pages.set(route, {
    file,
    baseHref: doc.querySelector('base')?.getAttribute('href') ?? null,
    isRedirect: doc.querySelector('meta[http-equiv="refresh" i]') !== null,
    ids: new Set(order.keys()),
    order,
    anchors,
    sections,
    rail:
      rail === null
        ? null
        : {
            links,
            fragments: new Set(links),
            expanded: toggle?.getAttribute('aria-expanded') ?? null,
            controls: toggle?.getAttribute('aria-controls') ?? null,
          },
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
let checkedRails = 0;
let checkedExamples = 0;

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

  if (SHELL_ROUTES.has(route) || errorRoutes.has(route)) {
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

  for (const [id, { blocks, frames }] of page.sections) {
    if (id === EXAMPLES_SECTION) {
      checkedExamples += 1;
      if (blocks === 0 && frames === 0) {
        failures.push(
          `${at} — the "#${id}" block renders neither a demo frame nor a content block, so the ` +
            'heading and its rail entry lead the reader to an empty section',
        );
      }
      continue;
    }
    if (blocks === 0) {
      failures.push(`${at} — section "#${id}" rendered no content block, so its body collapsed`);
    }
  }

  failures.push(...examplesSlotFailures(at, page, document));

  checkedRails += 1;
  failures.push(...railFailures(at, page, document));

  const shape = readDocumentShape(document);
  declaredTables += shape.tables;
  if (page.tables < shape.tables) {
    failures.push(
      `${at} — the document declares ${shape.tables} table(s) and the page emits ${page.tables}; ` +
        'a table the parser dropped loses its rows silently',
    );
  }
}

/**
 * Every code the library emits is reachable from the index it is listed under.
 *
 * `check-prerender-output.mjs` asserts each code emitted a page; this asserts
 * the reader can get to it without already knowing the URL, which is the half
 * that would fail silently — a page nothing links to is exactly the state
 * [#1736](https://github.com/tutkli/forty-cdk/issues/1736) was opened about.
 */
const errorIndex = pages.get('errors');
if (errorIndex === undefined) {
  fail('the error code index was not prerendered, so no code is reachable from the site');
}
const indexedCodes = new Set(
  errorIndex.anchors
    .map((href) => splitDocHref(href).path.replace(/\/$/, ''))
    .filter((path) => path.startsWith(`${siteBaseHref}errors/`))
    .map((path) => path.slice(`${siteBaseHref}errors/`.length)),
);
for (const { code } of errorCodes) {
  if (!indexedCodes.has(code)) {
    failures.push(`/errors — the index does not link ${code}, so its page is unreachable`);
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

if (checkedRails < RAIL_FLOOR) {
  fail(
    `read the rail of only ${checkedRails} page(s) (floor ${RAIL_FLOOR}) — the grouping half of ` +
      'this gate is no longer running',
  );
}

if (railLinks < RAIL_LINK_FLOOR) {
  fail(
    `ranked only ${railLinks} rail link(s) against the page's own order (floor ${RAIL_LINK_FLOOR}) ` +
      '— the order half of this gate is no longer running',
  );
}

if (synthesisedExamples < SYNTHESISED_EXAMPLES_FLOOR) {
  fail(
    `placed the synthesised Examples block on only ${synthesisedExamples} page(s) (floor ` +
      `${SYNTHESISED_EXAMPLES_FLOOR}) — the demos-placement half of this gate is no longer running`,
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
    `to an id, ${declaredTables} declared tables emitted across ${documents.size} documents, ` +
    `${checkedRails} rails read (${groupedRails} grouped, ${closedRails} of them closed) with ` +
    `${railLinks} links in page order, ${checkedExamples} Examples block(s) carrying a demo frame ` +
    'or a body, ' +
    `${synthesisedExamples} synthesised Examples block(s) below their parts list, ` +
    `${errorCodes.length} error codes linked from their index` +
    (warnings.length > 0
      ? `; ${warnings.length} page(s) past ${PAGE_WEIGHT_WARNING / 1024} kB`
      : ''),
);
