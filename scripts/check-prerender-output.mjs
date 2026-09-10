import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { readGuides, readPrimitives, readSitePages } from './lib/doc-site.mjs';
import { readErrorCodes } from './lib/error-codes.mjs';
import { escapeHtml } from './lib/html.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const BROWSER = join(repoRoot, 'dist', 'forty-cdk-docs', 'browser');

function fail(message) {
  console.error(`[check-prerender-output] ${message}`);
  process.exit(1);
}

if (!existsSync(BROWSER)) {
  fail(
    `prerender output not found at ${relative(repoRoot, BROWSER).split(sep).join('/')} — run the static build first`,
  );
}

const primitives = readPrimitives();
if (primitives.length === 0) {
  fail('read 0 primitives from the entry point READMEs — no frontmatter declares a nav group');
}

const guides = readGuides();
if (guides.length === 0) {
  fail('the guide registry is empty — scripts/lib/doc-site.mjs no longer publishes any guide');
}

const sitePages = readSitePages();
if (sitePages.length === 0) {
  fail('the site page registry is empty — scripts/lib/doc-site.mjs publishes no landing content');
}

/**
 * The `FORCDK-*` roster, read from library source the same way the generator
 * read it ([#1736](https://github.com/tutkli/forty-cdk/issues/1736)).
 *
 * This is the half that makes a code with no page a build failure: the roster
 * comes from the emitter call sites, and every one of them has to have reached
 * the emit as a page carrying its own code. A code added to source and never
 * regenerated fails here rather than 404ing for the reader who searched for it.
 */
const { codes: errorCodes, problems: codeProblems } = readErrorCodes();
if (codeProblems.length > 0) {
  fail(
    `${codeProblems.length} FORCDK-* call site(s) could not be read:\n` +
      codeProblems
        .map((problem) => `  ${problem.path}:${problem.line} — ${problem.message}`)
        .join('\n'),
  );
}
if (errorCodes.length === 0) {
  fail('read 0 FORCDK-* codes from library source — the scan no longer sees the emitter calls');
}

const routes = [
  ...sitePages.map(({ slug, title }) => ({ path: slug, title })),
  ...primitives.map(({ slug, title }) => ({ path: slug, title })),
  { path: 'guides', title: 'Guides' },
  ...guides.map(({ slug, title }) => ({ path: `guides/${slug}`, title })),
  { path: 'errors', title: 'Error codes' },
  ...errorCodes.map(({ code }) => ({ path: `errors/${code}`, title: code })),
];

const missing = [];
const empty = [];
const themed = [];
const unbootstrapped = [];
const deferredStyles = [];
const attributed = [];
let demoBlocks = 0;

/**
 * The `localStorage` key the site persists the theme under, read from the source
 * the running application reads it from
 * ([#1880](https://github.com/tutkli/forty-cdk/issues/1880)) — the inline
 * bootstrap in `index.html` is only worth its blocking script if it names the
 * same key.
 */
function readThemeKey() {
  const site = join(repoRoot, 'projects', 'forty-cdk-docs', 'src', 'app', 'ui', 'site-chrome.ts');
  const found = /export const THEME_KEY = '([^']+)'/.exec(readFileSync(site, 'utf8'));
  if (found === null) {
    fail('site-chrome.ts exports no THEME_KEY — the inline theme bootstrap cannot be verified');
  }
  return found[1];
}

const themeKey = readThemeKey();

/**
 * A prerendered page must carry no `data-theme`: the server knows nothing about
 * the visitor, so a baked value is a wrong one for half of them, and it would
 * beat the `prefers-color-scheme` fallback the stylesheet ends with. What
 * decides the first painted frame instead is the blocking bootstrap, which has
 * to reach every page rather than only the ones someone remembered.
 *
 * The stylesheet has to be blocking for the same reason. Critical-CSS
 * extraction keeps the rules whose selectors match the prerendered markup, and
 * with no baked attribute neither `[data-theme='dark']` nor the fallback
 * matches any page — so a deferred stylesheet leaves the first frame with the
 * light palette alone, whatever the bootstrap stamped.
 */
function checkTheme(label, html) {
  const openTag = /<html[^>]*>/i.exec(html);
  if (openTag !== null && /\bdata-theme\b/i.test(openTag[0])) {
    themed.push(label);
  }
  if (!html.includes(themeKey)) {
    unbootstrapped.push(label);
  }

  const head = html.slice(0, html.indexOf('</head>'));
  const sheets = [...head.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/gi)].map((match) => match[0]);
  if (!sheets.some((sheet) => !/\bmedia=/i.test(sheet))) {
    deferredStyles.push(label);
  }
}

/**
 * The inputs an example block must not publish as DOM attributes
 * ([#1879](https://github.com/tutkli/forty-cdk/issues/1879)).
 *
 * `demo-layout` takes its heading as an input named `title`, and every call
 * site passes it as a static attribute — which a template writes to the DOM as
 * well as binding to the input. `title` is a global HTML attribute, so the
 * browser paints a native tooltip over the whole example repeating the `<h2>`
 * one line above it, and the host takes an accessible name nobody gave it;
 * `subtitle` is inert but publishes the escaped subtitle markup a second time.
 * The component drops both through host attribute bindings, and the emitted
 * page is the only place a dropped binding is visible — the inputs go on
 * working either way.
 */
const DEMO_ATTRIBUTES = ['title', 'subtitle'];
const DEMO_TAG = /<demo-layout(?=[\s>])[^>]*>/gi;

function attributeNames(tag) {
  return [...tag.matchAll(/(?:^|\s)([a-z][a-z0-9_.-]*)=/gi)].map((match) => match[1].toLowerCase());
}

function checkDemoAttributes(label, html) {
  const leaked = new Set();
  for (const [tag] of html.matchAll(DEMO_TAG)) {
    demoBlocks += 1;
    for (const name of attributeNames(tag)) {
      if (DEMO_ATTRIBUTES.includes(name)) {
        leaked.add(name);
      }
    }
  }
  if (leaked.size > 0) {
    attributed.push(`${label} (${[...leaked].join(', ')})`);
  }
}

const DARK_ATTRIBUTE = "[data-theme='dark']";
const DARK_FALLBACK = ":root:not([data-theme='light'])";
const DARK_MEDIA = '@media (prefers-color-scheme: dark)';

function parseRules(css) {
  const rules = [];
  let index = 0;
  while (index < css.length) {
    const open = css.indexOf('{', index);
    if (open === -1) {
      break;
    }
    let depth = 1;
    let cursor = open + 1;
    while (cursor < css.length && depth > 0) {
      if (css[cursor] === '{') {
        depth += 1;
      } else if (css[cursor] === '}') {
        depth -= 1;
      }
      cursor += 1;
    }
    rules.push({ selector: css.slice(index, open).trim(), body: css.slice(open + 1, cursor - 1) });
    index = cursor;
  }
  return rules;
}

function collapse(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeSelector(selector) {
  return selector
    .split(',')
    .map((part) => collapse(part))
    .join(', ');
}

function declarations(body) {
  return body
    .split(';')
    .map((declaration) => collapse(declaration))
    .filter((declaration) => declaration.length > 0)
    .join('; ');
}

/**
 * The stylesheet's fallback for a visitor whose JavaScript never runs
 * ([#1880](https://github.com/tutkli/forty-cdk/issues/1880)): every rule keyed
 * on the dark attribute owes a `prefers-color-scheme` twin keyed on
 * `:root:not([data-theme='light'])`, so a stored `light` still wins while a
 * system preference no script read still lands.
 *
 * Declaration parity is checked rather than mere presence, because the failure
 * this guards against is the half-copied block — a token added to the attribute
 * rule and forgotten in the twin paints part of the page in the other theme,
 * and nothing about that is visible in a light-preferring browser.
 */
function checkThemeFallback() {
  const file = join(repoRoot, 'projects', 'forty-cdk-docs', 'src', 'styles.css');
  const rules = parseRules(readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));
  const dark = rules.filter((rule) => rule.selector.includes(DARK_ATTRIBUTE));
  const fallbacks = rules
    .filter((rule) => normalizeSelector(rule.selector) === DARK_MEDIA)
    .flatMap((rule) => parseRules(rule.body));

  if (dark.length === 0) {
    fail('styles.css keys no rule on the dark attribute — the fallback scan reads nothing');
  }

  const unguarded = fallbacks
    .filter((rule) => !rule.selector.includes(DARK_FALLBACK))
    .map((rule) => normalizeSelector(rule.selector));
  if (unguarded.length > 0) {
    fail(
      `${unguarded.length} rule(s) under ${DARK_MEDIA} are not guarded by ${DARK_FALLBACK}, so a ` +
        `stored light preference loses to the system one: ${unguarded.join(' / ')}`,
    );
  }

  const problems = [];
  for (const rule of dark) {
    const owed = normalizeSelector(rule.selector.replaceAll(DARK_ATTRIBUTE, DARK_FALLBACK));
    const twin = fallbacks.find((candidate) => normalizeSelector(candidate.selector) === owed);
    if (twin === undefined) {
      problems.push(`${normalizeSelector(rule.selector)} — no ${DARK_MEDIA} twin`);
    } else if (declarations(twin.body) !== declarations(rule.body)) {
      problems.push(`${normalizeSelector(rule.selector)} — its twin states other declarations`);
    }
  }
  if (problems.length > 0) {
    fail(
      `${problems.length} dark rule(s) have no equivalent ${DARK_MEDIA} fallback, so a visitor ` +
        `without JavaScript gets part of the light theme:\n  ${problems.join('\n  ')}`,
    );
  }

  return dark.length;
}

const fallbackRules = checkThemeFallback();

/**
 * The root is a page of its own rather than a redirect
 * ([#1812](https://github.com/tutkli/forty-cdk/issues/1812)), so it is held to
 * rendered content like every other route. The refresh stub it used to emit
 * would fail here, which is the point: a reader arriving at the site root has
 * to land on something that states what forty-cdk is.
 */
const homeFile = join(BROWSER, 'index.html');
if (!existsSync(homeFile)) {
  missing.push('(home)');
} else {
  const homeHtml = readFileSync(homeFile, 'utf8');
  if (/http-equiv=["']refresh["']/i.test(homeHtml)) {
    fail('the home page is a redirect stub — the site root publishes a landing page of its own');
  }
  if (!homeHtml.includes('<h1')) {
    empty.push('(home)');
  }
  checkTheme('(home)', homeHtml);
  checkDemoAttributes('(home)', homeHtml);
}

for (const { path, title } of routes) {
  const file = join(BROWSER, ...path.split('/'), 'index.html');
  if (!existsSync(file)) {
    missing.push(path);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  if (!html.includes('<h1') || !html.includes(escapeHtml(title))) {
    empty.push(path);
  }
  checkTheme(path, html);
  checkDemoAttributes(path, html);
}

if (missing.length > 0) {
  fail(`missing prerendered index.html for ${missing.length} route(s): ${missing.join(', ')}`);
}
if (empty.length > 0) {
  fail(
    `prerendered HTML is missing rendered content for ${empty.length} route(s): ${empty.join(', ')}`,
  );
}
if (themed.length > 0) {
  fail(
    `${themed.length} prerendered page(s) bake data-theme onto <html>, which flashes for a ` +
      `visitor whose theme differs: ${themed.join(', ')}`,
  );
}
if (unbootstrapped.length > 0) {
  fail(
    `${unbootstrapped.length} prerendered page(s) ship no inline theme bootstrap reading ` +
      `'${themeKey}', so their first painted frame is the light palette: ${unbootstrapped.join(', ')}`,
  );
}
if (deferredStyles.length > 0) {
  fail(
    `${deferredStyles.length} prerendered page(s) carry no blocking stylesheet in <head>, so ` +
      'their first frame paints with whatever critical CSS was extracted — and the dark palette ' +
      'is not in it, because its selector matches no prerendered page: ' +
      deferredStyles.join(', '),
  );
}

if (demoBlocks === 0) {
  fail('the prerendered output renders no <demo-layout> element — the example scan reads nothing');
}
if (attributed.length > 0) {
  fail(
    `${attributed.length} prerendered page(s) render a demo-layout input as a DOM attribute, so ` +
      'every example paints a native tooltip repeating its own heading: ' +
      attributed.join(', '),
  );
}

console.log(
  `[check-prerender-output] ok — ${primitives.length} primitive routes + ` +
    `${guides.length} guide routes + ${sitePages.length} site pages + ${errorCodes.length} ` +
    'error code pages + the error index + the guide index + the landing page prerendered ' +
    'with content, none of them baking a theme and all of them bootstrapping one, over ' +
    `${fallbackRules} dark rule(s) each mirrored by a prefers-color-scheme fallback and ` +
    `${demoBlocks} example block(s) publishing none of their inputs as attributes`,
);
