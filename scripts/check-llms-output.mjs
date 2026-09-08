import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { markdownLinksOf } from './docs/doc-markdown.mjs';
import { GITHUB_BLOB_BASE, isAbsoluteHref, SITE_URL, splitDocHref } from './lib/doc-links.mjs';
import { readEntryPointDocs, readGuides, readPrimitives, readSitePages } from './lib/doc-site.mjs';
import { readErrorCodes } from './lib/error-codes.mjs';
import { repoRoot } from './lib/repo-path.mjs';

/**
 * Gates the markdown artifacts the site publishes for assistants
 * ([#1816](https://github.com/tutkli/forty-cdk/issues/1816)) — that every
 * document reached one, that the index lists them all, and that no link inside
 * one points somewhere a reader cannot follow.
 *
 * The whole lesson of the hand-authored May 2026 `llms.txt` is that a stale
 * artifact fails nothing: it claimed 29 components against 52 published and
 * opened with an import that does not compile, for three months, with every
 * gate green. So this reads the **emit** against the **registry** rather than
 * against the generator — `readEntryPointDocs` walks the library folders and
 * the two other registries own the guides and the site's pages, none of which
 * the generator is asked. A generator that stopped emitting a document, or an
 * index that stopped listing one, fails here.
 *
 * The `FORCDK-*` roster is held to the same standard from the other side
 * ([#1848](https://github.com/tutkli/forty-cdk/issues/1848)): it is the one
 * artifact no document backs, so it is read against {@link readErrorCodes} —
 * the call the generator rendered it from and the one
 * `check-prerender-output.mjs` holds the HTML pages to — rather than against
 * itself.
 *
 * Two exclusions are deliberate:
 *
 * - **A GitHub blob URL to a file the site does not publish is allowed** —
 *   `forty-cdk/shared` and `forty-cdk/time-picker` link four core modules and a
 *   date adapter by file, the installation page links the CHANGELOG, and the
 *   roster links the call site each code is emitted from. That is where each of
 *   those is read, it is what the site's own pages publish for them, and the
 *   count is reported so it cannot grow unseen. A blob URL to a document the
 *   site *does* publish is refused: that is the
 *   [#1800](https://github.com/tutkli/forty-cdk/issues/1800) failure, a
 *   reference that hands an assistant the repository instead of the docs.
 * - **A bare `#fragment` is left as written.** It names a heading of the
 *   document it appears in, which a markdown renderer anchors the same way the
 *   site does.
 *
 * Every other href has to be absolute. A relative one in an artifact resolves
 * against wherever the reader happened to fetch it from, which for a file
 * pasted into a conversation is nowhere at all.
 */

const BROWSER = join(repoRoot, 'dist', 'forty-cdk-playground', 'browser');

const INDEX_FILE = 'llms.txt';
const FULL_FILE = 'llms-full.txt';
const ERRORS_FILE = 'errors.md';

/**
 * Floors that keep a green run from being a vacuous one. Each sits far below
 * today's measurement (74 artifacts, 1 435 links, 126 codes) and fails the scan
 * that stopped finding anything rather than reporting "0 links, ok".
 *
 * {@link CODE_FLOOR} is the one the roster needs: "every code the library emits
 * is published" is satisfied by an empty roster and an empty artifact, so
 * without it the strongest-sounding assertion in this file is the easiest one to
 * pass by accident.
 */
const ARTIFACT_FLOOR = 60;
const LINK_FLOOR = 500;
const CODE_FLOOR = 100;

/**
 * How many missing codes the roster failure names before it reports the rest as
 * a count. A generator that stopped emitting the roster would otherwise print
 * every code in it, which buries the one number that says what happened.
 */
const MISSING_NAMED = 8;

const failures = [];

function fail(message) {
  console.error(`[check-llms-output] ${message}`);
  process.exit(1);
}

function toPosix(path) {
  return path.split(sep).join('/');
}

function read(file) {
  const full = join(BROWSER, ...file.split('/'));
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
}

/** Whether the emit serves something at this site-relative path. */
function servesPath(path) {
  const target = path.replace(/\/$/, '');
  const full = join(BROWSER, ...target.split('/'));
  if (target === '') {
    return existsSync(join(BROWSER, 'index.html'));
  }
  if (!existsSync(full)) {
    return false;
  }
  return statSync(full).isDirectory() ? existsSync(join(full, 'index.html')) : true;
}

if (!existsSync(BROWSER)) {
  fail(
    `no prerender output at ${toPosix(relative(repoRoot, BROWSER))} — run \`pnpm build:docs\` first`,
  );
}

/**
 * The site's base href, read from the emit rather than from `angular.json`.
 *
 * It is the path every published URL has to sit under, so {@link SITE_URL} is
 * only a correct constant while its path half equals this — and the failure it
 * would otherwise cause is a whole artifact of URLs that 404.
 */
const home = read('index.html');
if (home === null) {
  fail('the home page was not prerendered, so the site base href cannot be read from the emit');
}
const baseHref = /<base\s+href="([^"]*)"/i.exec(home)?.[1] ?? null;
if (baseHref === null) {
  fail('the home page emits no <base href>, so no published URL can be checked against it');
}

let siteBase;
try {
  siteBase = new URL(SITE_URL);
} catch {
  fail(`SITE_URL is not a URL: ${SITE_URL}`);
}
if (siteBase.pathname !== baseHref) {
  fail(
    `SITE_URL publishes under "${siteBase.pathname}" and the emit serves under "${baseHref}" — ` +
      'every URL in the generated artifacts would be wrong by that difference',
  );
}

/** The `.md` every document owes, keyed by the artifact path the convention gives it. */
const expected = new Map([
  ...readEntryPointDocs().map((doc) => [`${doc.slug}.md`, doc.path]),
  ...readGuides().map((guide) => [`guides/${guide.slug}.md`, `docs/${guide.file}`]),
  ...readSitePages().map((page) => [`${page.slug}.md`, `docs/site/${page.file}`]),
]);

/**
 * The repository path behind each published document.
 *
 * A blob URL to one of these is the [#1800](https://github.com/tutkli/forty-cdk/issues/1800)
 * failure: the document has a page, and a link to its source hands an assistant
 * the repository instead. A blob URL to anything else — a core module, the
 * CHANGELOG — is where that file is actually read, so it is allowed and counted.
 */
const documentSources = new Set(expected.values());

/**
 * The convention itself: a page's markdown sits at that page's own URL plus
 * `.md`, so a reader holding one can reach the other without a lookup.
 *
 * Asserted only for the documents the site publishes a route for. The three
 * entry points it does not — `internationalized-date`, and the two whose README
 * a host page folds in ([#1809](https://github.com/tutkli/forty-cdk/issues/1809))
 * — own an artifact and no page on purpose: each is an entry point a consumer
 * imports from, and a model working on one wants its README rather than the
 * page that republishes part of it.
 */
for (const route of [
  ...readPrimitives().map((primitive) => primitive.slug),
  ...readGuides().map((guide) => `guides/${guide.slug}`),
  ...readSitePages().map((page) => page.slug),
]) {
  if (!servesPath(route)) {
    failures.push(
      `/${route}.md is published and the emit serves no /${route} beside it, so the path ` +
        'convention no longer holds',
    );
  }
}

for (const [file, source] of expected) {
  const contents = read(file);
  if (contents === null) {
    failures.push(`${source} reached no artifact — the emit publishes no /${file}`);
    continue;
  }
  if (!contents.startsWith('# ')) {
    failures.push(
      `/${file} does not open with the document's title, so it published a body with no heading`,
    );
  }
}

const { codes: errorCodes, problems: codeProblems } = readErrorCodes();
if (codeProblems.length > 0) {
  fail(
    `${codeProblems.length} emitter call(s) cannot be read, so the roster is short of the codes ` +
      `the library emits before anything is asserted against it:\n` +
      codeProblems.map(({ path, line, message }) => `  ${path}:${line} — ${message}`).join('\n'),
  );
}
if (errorCodes.length < CODE_FLOOR) {
  fail(
    `the scan reports only ${errorCodes.length} FORCDK-* code(s) (floor ${CODE_FLOOR}) — it has ` +
      'stopped finding the emitter calls, so holding the roster to it proves nothing',
  );
}

const rosterContents = read(ERRORS_FILE);
if (rosterContents === null) {
  failures.push(
    `the emit publishes no /${ERRORS_FILE}, so ${errorCodes.length} error code(s) reach no ` +
      'markdown at all and an assistant handed one has the message and nothing else',
  );
} else {
  if (!rosterContents.startsWith('# ')) {
    failures.push(
      `/${ERRORS_FILE} does not open with a title, so it published a body with no heading`,
    );
  }
  const missing = errorCodes.filter((entry) => !rosterContents.includes(entry.code));
  if (missing.length > 0) {
    const named = missing.slice(0, MISSING_NAMED).map((entry) => entry.code);
    failures.push(
      `/${ERRORS_FILE} publishes ${errorCodes.length - missing.length} of ${errorCodes.length} ` +
        `code(s) the library emits — missing ${named.join(', ')}` +
        (missing.length > named.length ? ` and ${missing.length - named.length} more` : ''),
    );
  }
}

if (!servesPath('errors')) {
  failures.push(
    `/${ERRORS_FILE} points a reader at the per-code pages under /errors, which the emit no ` +
      'longer serves',
  );
}

const indexContents = read(INDEX_FILE);
if (indexContents === null) {
  fail(`the emit publishes no /${INDEX_FILE}, which is the index every other artifact hangs off`);
}
const fullContents = read(FULL_FILE);
if (fullContents === null) {
  fail(`the emit publishes no /${FULL_FILE}`);
}

if (!/^# /m.test(indexContents) || !indexContents.includes('> ')) {
  failures.push(
    `/${INDEX_FILE} has no title and summary — llmstxt.org reads an H1 and a blockquote as the shape`,
  );
}

/** Every artifact this pipeline published, so the link scan covers all of them. */
function artifacts(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      artifacts(full, found);
    } else if (entry.name.endsWith('.md') || /^llms(?:-full)?\.txt$/.test(entry.name)) {
      found.push(toPosix(relative(BROWSER, full)));
    }
  }
  return found;
}

const published = artifacts(BROWSER);
const unexpected = published.filter(
  (file) =>
    !expected.has(file) && file !== INDEX_FILE && file !== FULL_FILE && file !== ERRORS_FILE,
);
if (unexpected.length > 0) {
  failures.push(
    `${unexpected.length} artifact(s) the registry names no document for: ${unexpected.join(', ')} — ` +
      'a document that stopped being published left its markdown behind',
  );
}

let scannedLinks = 0;
let sourceLinks = 0;

for (const file of published) {
  const at = `/${file}`;
  for (const { href, line } of markdownLinksOf(read(file))) {
    scannedLinks += 1;

    if (href.includes('.claude/')) {
      failures.push(
        `${at}:${line} — "${href}" publishes agent instrumentation under .claude/, which never ships`,
      );
      continue;
    }

    if (href.startsWith('#')) {
      continue;
    }

    if (!isAbsoluteHref(href)) {
      failures.push(
        `${at}:${line} — "${href}" is a relative href, and an artifact read on its own has no ` +
          'base to resolve one against',
      );
      continue;
    }

    if (href.startsWith(GITHUB_BLOB_BASE)) {
      sourceLinks += 1;
      const repoPath = splitDocHref(href.slice(GITHUB_BLOB_BASE.length)).path;
      if (documentSources.has(repoPath)) {
        failures.push(
          `${at}:${line} — "${href}" links the markdown source of a document the site publishes a ` +
            'page for, so an assistant reads the repository instead of the documentation',
        );
      }
      continue;
    }

    if (!href.startsWith(SITE_URL)) {
      continue;
    }

    const { path } = splitDocHref(href.slice(SITE_URL.length));
    if (!servesPath(path)) {
      failures.push(
        `${at}:${line} — "${href}" resolves to "/${path}", which the emit does not serve`,
      );
    }
  }
}

/**
 * Every document the index lists, and every one it owes.
 *
 * This is the half the May file failed: it published a list, the list fell 23
 * components behind the library, and nothing asked. The registry is the
 * authority here, so a primitive added without regenerating the index fails.
 */
const listed = new Set(
  markdownLinksOf(indexContents)
    .filter(({ href }) => href.startsWith(SITE_URL))
    .map(({ href }) => splitDocHref(href.slice(SITE_URL.length)).path),
);
for (const [file, source] of expected) {
  if (!listed.has(file)) {
    failures.push(
      `/${INDEX_FILE} does not list /${file} (${source}), so nothing points a reader at it`,
    );
  }
}
if (!listed.has(FULL_FILE)) {
  failures.push(`/${INDEX_FILE} does not list /${FULL_FILE}`);
}
if (!listed.has(ERRORS_FILE)) {
  failures.push(
    `/${INDEX_FILE} does not list /${ERRORS_FILE}, so the error surface is reachable from no ` +
      'index an assistant is handed',
  );
}
if (rosterContents !== null && !fullContents.includes(rosterContents.split('\n')[0])) {
  failures.push(`/${FULL_FILE} is missing the roster published at /${ERRORS_FILE}`);
}

/**
 * `llms-full.txt` holds every document rather than a subset of them, asserted
 * through each one's own title line — the one string a concatenation cannot
 * drop without losing the document with it.
 */
for (const [file] of expected) {
  const title = read(file)?.split('\n')[0];
  if (title !== undefined && !fullContents.includes(title)) {
    failures.push(`/${FULL_FILE} is missing the document published at /${file}`);
  }
}

if (failures.length > 0) {
  console.error(`[check-llms-output] FAIL — ${failures.length} problem(s):`);
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

if (published.length < ARTIFACT_FLOOR) {
  fail(
    `found only ${published.length} artifact(s) (floor ${ARTIFACT_FLOOR}) — the emit has stopped ` +
      'publishing the corpus, so a green run proves nothing',
  );
}

if (scannedLinks < LINK_FLOOR) {
  fail(
    `scanned only ${scannedLinks} link(s) across ${published.length} artifact(s) (floor ` +
      `${LINK_FLOOR}) — the link extraction has stopped matching`,
  );
}

console.log(
  `[check-llms-output] ok — ${expected.size} documents published as markdown, all listed in ` +
    `/${INDEX_FILE} and concatenated into /${FULL_FILE} ` +
    `(${Math.round(Buffer.byteLength(fullContents, 'utf8') / 1024)} kB); /${ERRORS_FILE} carries ` +
    `all ${errorCodes.length} FORCDK-* code(s) the library emits; ${scannedLinks} links ` +
    `resolved (${sourceLinks} to repository source on GitHub, which is where those files are read)`,
);
