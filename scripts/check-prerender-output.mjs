import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { readGuides, readLibraryMeta, readPrimitives, readSitePages } from './lib/doc-site.mjs';
import { readErrorCodes } from './lib/error-codes.mjs';
import { escapeHtml, stripText } from './lib/html.mjs';
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
const nullIds = [];
const statefulToggles = [];
let demoBlocks = 0;
let themeToggles = 0;

/**
 * The `localStorage` key the site persists the theme under, read from the source
 * the running application reads it from
 * ([#1880](https://github.com/tutkli/forty-cdk/issues/1880)) — the inline
 * bootstrap in `index.html` is only worth its blocking script if it names the
 * same key.
 */
function readThemeKey() {
  const site = join(
    repoRoot,
    'projects',
    'forty-cdk-docs',
    'src',
    'app',
    'ui',
    'theme-preference.ts',
  );
  const found = /export const THEME_KEY = '([^']+)'/.exec(readFileSync(site, 'utf8'));
  if (found === null) {
    fail(
      'theme-preference.ts exports no THEME_KEY — the inline theme bootstrap cannot be verified',
    );
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
 * The state the theme control must not be prerendered in
 * ([#1896](https://github.com/tutkli/forty-cdk/issues/1896)).
 *
 * The server knows nothing about the visitor, so a prerendered switch ships its
 * off state onto a page the inline bootstrap may well have painted dark:
 * `aria-checked="false"` and a label promising the opposite of what pressing it
 * does, in a channel assistive technology reads, until the client bundle
 * hydrates. The control renders in the browser alone, so what the emitted page
 * carries in its place is an inert same-size placeholder.
 */
const TOGGLE_TAG = /<theme-toggle(?=[\s>])[^>]*>([\s\S]*?)<\/theme-toggle>/gi;
const TOGGLE_STATE = ['aria-checked', 'data-state', 'aria-label'];

function checkThemeToggle(label, html) {
  const leaked = new Set();
  for (const [, content] of html.matchAll(TOGGLE_TAG)) {
    themeToggles += 1;
    for (const name of TOGGLE_STATE) {
      if (content.includes(name)) {
        leaked.add(name);
      }
    }
  }
  if (leaked.size > 0) {
    statefulToggles.push(`${label} (${[...leaked].join(', ')})`);
  }
}

/**
 * The inputs an example block must not publish as DOM attributes
 * ([#1879](https://github.com/tutkli/forty-cdk/issues/1879),
 * [#1900](https://github.com/tutkli/forty-cdk/issues/1900)).
 *
 * `demo-layout` takes its heading as an input named `title`, and every call
 * site passes it as a static attribute — which a template writes to the DOM as
 * well as binding to the input. `title` is a global HTML attribute, so the
 * browser paints a native tooltip over the whole example repeating the `<h2>`
 * one line above it, and the host takes an accessible name nobody gave it;
 * `subtitle`, `sourcepath` and `hero` are inert, but each publishes component
 * state as DOM state nothing reads. The component drops all four through host
 * attribute bindings, and the emitted page is the only place a dropped binding
 * is visible — the inputs go on working either way.
 *
 * What a host keeps is what it renders with: its `class`, and the `id` the
 * on-page table of contents links to.
 */
const DEMO_ATTRIBUTES = ['title', 'subtitle', 'sourcepath', 'hero'];
const DEMO_TAG = /<demo-layout(?=[\s>])[^>]*>/gi;
const ATTRIBUTE = /([a-z][a-z0-9_.:-]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/gi;

/**
 * The tag's own attributes, as `[name, value]` pairs.
 *
 * The value is consumed by the same match as its name, so the scan never reads
 * a `word=` out of a subtitle's escaped markup and reports it as an attribute.
 */
function attributes(tag) {
  const body = tag.slice(tag.indexOf('demo-layout') + 'demo-layout'.length, -1);
  return [...body.matchAll(ATTRIBUTE)].map(([, name, value = '']) => [
    name.toLowerCase(),
    value.replace(/^(["'])([\s\S]*)\1$/, '$2'),
  ]);
}

/**
 * The host id, when there is one, is written as an attribute binding
 * ([#1899](https://github.com/tutkli/forty-cdk/issues/1899)) — a property
 * binding assigns to `HTMLElement.id`, which coerces the `null` the hero block
 * resolves to into the string `"null"` instead of removing the attribute. A
 * hero example then answers to `getElementById('null')` and to the `#null`
 * fragment, under an id it was never meant to carry.
 */
function checkDemoAttributes(label, html) {
  const leaked = new Set();
  let nulled = 0;
  for (const [tag] of html.matchAll(DEMO_TAG)) {
    demoBlocks += 1;
    for (const [name, value] of attributes(tag)) {
      if (DEMO_ATTRIBUTES.includes(name)) {
        leaked.add(name);
      }
      if (name === 'id' && value === 'null') {
        nulled += 1;
      }
    }
  }
  if (leaked.size > 0) {
    attributed.push(`${label} (${[...leaked].join(', ')})`);
  }
  if (nulled > 0) {
    nullIds.push(`${label} (${nulled})`);
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
 * The reach the rule above is worth
 * ([#1897](https://github.com/tutkli/forty-cdk/issues/1897)): parity is checked
 * over one stylesheet, so the attribute has to be that stylesheet's alone.
 *
 * A component style keyed on `[data-theme='dark']` owes the same
 * `prefers-color-scheme` twin and would be gated by nothing — it reaches the
 * first painted frame all the same, and a visitor whose script never ran gets
 * the light rule on a page their system preference painted dark. The site's
 * palette states every themed colour as a `--pg-*` token, which a component
 * consumes without naming the attribute at all.
 */
const SITE_APP = join(repoRoot, 'projects', 'forty-cdk-docs', 'src', 'app');
const COMPONENT_STYLES = /\bstyles:\s*`([^`]*)`/g;
const UNREAD_STYLES = /\bstyleUrls?:|\bstyles:\s*\[/;

function collectStyleBlocks(dir, found) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectStyleBlocks(path, found);
      continue;
    }
    if (
      !entry.name.endsWith('.ts') ||
      entry.name.endsWith('.spec.ts') ||
      entry.name.endsWith('.generated.ts')
    ) {
      continue;
    }
    const source = readFileSync(path, 'utf8');
    const label = relative(repoRoot, path).split(sep).join('/');
    if (UNREAD_STYLES.test(source)) {
      found.unreadable.push(label);
    }
    for (const [, css] of source.matchAll(COMPONENT_STYLES)) {
      found.blocks.push({ path: label, css });
    }
  }
  return found;
}

function checkComponentStyles() {
  const { blocks, unreadable } = collectStyleBlocks(SITE_APP, { blocks: [], unreadable: [] });
  if (blocks.length === 0) {
    fail('read 0 component style blocks from the site source — the dark-attribute scan is blind');
  }
  if (unreadable.length > 0) {
    fail(
      `${unreadable.length} component(s) declare their styles in a form this scan does not read ` +
        '(a separate file, or an array), so the rule below would pass over them unseen — state ' +
        `them as one inline template literal: ${unreadable.join(', ')}`,
    );
  }

  const keyed = [
    ...new Set(
      blocks.filter((block) => block.css.includes('[data-theme=')).map((block) => block.path),
    ),
  ];
  if (keyed.length > 0) {
    fail(
      `${keyed.length} component stylesheet(s) key a rule on the theme attribute, which only the ` +
        'inline bootstrap sets — so the rule is dead for a visitor without JavaScript and the ' +
        'parity check above never reads it. State the colour as a --pg-* palette token instead: ' +
        keyed.join(', '),
    );
  }

  return blocks.length;
}

const styleBlocks = checkComponentStyles();

/**
 * The catalogue and the maturity line the landing page derives
 * ([#1919](https://github.com/tutkli/forty-cdk/issues/1919)), read back from
 * the sources they were derived from: the registry module `pnpm gen:doc-model`
 * emitted — the same one the rail and every page header read — and the package
 * manifest. A description the page shortened, a group it dropped, an entry it
 * stopped linking or a version it hand-wrote fails here rather than on the
 * published site.
 */
const REGISTRY_MODULE = join(
  repoRoot,
  'projects',
  'forty-cdk-docs',
  'src',
  'generated',
  'primitives.generated.ts',
);
const GROUPS_MODULE = join(repoRoot, 'projects', 'forty-cdk-docs', 'src', 'app', 'primitives.ts');

function readRegistry() {
  const source = readFileSync(REGISTRY_MODULE, 'utf8');
  const arrayOf = (name) => {
    const found = new RegExp(`export const ${name}\\b[^=]*= (\\[[\\s\\S]*?\\]);\\n`).exec(source);
    if (found === null) {
      fail(`primitives.generated.ts exports no ${name} — run pnpm gen:doc-model`);
    }
    return JSON.parse(found[1]);
  };
  const labels = [...readFileSync(GROUPS_MODULE, 'utf8').matchAll(/label: '([^']+)'/g)].map(
    (match) => match[1],
  );
  if (labels.length === 0) {
    fail('primitives.ts declares no DOCS_GROUPS label — the catalogue scan reads no group');
  }
  return { entries: [...arrayOf('PRIMITIVES'), ...arrayOf('UTILITIES')], labels };
}

function collapseText(html) {
  return stripText(html)
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

function checkLanding(html) {
  const text = collapseText(html);
  const library = readLibraryMeta();
  const { entries, labels } = readRegistry();
  const problems = [];

  for (const [name, value] of [
    ['version', `v${library.version}`],
    ['@angular/core peer range', `Angular ${library.angular}`],
    ['license', library.license],
  ]) {
    if (!text.includes(value)) {
      problems.push(
        `states no "${value}" — its maturity line has fallen behind the ${name} in ` +
          'projects/forty-cdk/package.json',
      );
    }
  }

  const ungrouped = labels.filter((label) => !text.includes(label));
  if (ungrouped.length > 0) {
    problems.push(`shows no group labelled ${ungrouped.map((label) => `"${label}"`).join(', ')}`);
  }

  const unlinked = entries.filter((entry) => !html.includes(`/${entry.slug}"`));
  if (unlinked.length > 0) {
    problems.push(
      `links ${unlinked.length} published entry point(s) nowhere: ` +
        unlinked.map((entry) => entry.slug).join(', '),
    );
  }

  const undescribed = entries.filter(
    (entry) => !text.includes(entry.description.replace(/\s+/g, ' ').trim()),
  );
  if (undescribed.length > 0) {
    problems.push(
      `describes ${undescribed.length} entry point(s) with something other than the lede ` +
        `its own page header shows: ${undescribed.map((entry) => entry.slug).join(', ')}`,
    );
  }

  if (problems.length > 0) {
    fail(`the landing page\n  ${problems.join('\n  ')}`);
  }
  return entries.length;
}

/**
 * The root is a page of its own rather than a redirect
 * ([#1812](https://github.com/tutkli/forty-cdk/issues/1812)), so it is held to
 * rendered content like every other route. The refresh stub it used to emit
 * would fail here, which is the point: a reader arriving at the site root has
 * to land on something that states what forty-cdk is.
 */
const homeFile = join(BROWSER, 'index.html');
let catalogued = 0;
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
  checkThemeToggle('(home)', homeHtml);
  checkDemoAttributes('(home)', homeHtml);
  catalogued = checkLanding(homeHtml);
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
  checkThemeToggle(path, html);
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

if (themeToggles === 0) {
  fail('the prerendered output renders no <theme-toggle> element — the toggle scan reads nothing');
}
if (statefulToggles.length > 0) {
  fail(
    `${statefulToggles.length} prerendered page(s) bake the theme toggle's own state, which the ` +
      'server cannot know: the control reads as off, and its label promises the opposite of what ' +
      `pressing it does, on a page already painted dark: ${statefulToggles.join(', ')}`,
  );
}

if (demoBlocks === 0) {
  fail('the prerendered output renders no <demo-layout> element — the example scan reads nothing');
}
if (attributed.length > 0) {
  fail(
    `${attributed.length} prerendered page(s) render a demo-layout input as a DOM attribute, so ` +
      'an example publishes state nothing reads — and, for the global ones, paints a native ' +
      'tooltip repeating its own heading: ' +
      attributed.join(', '),
  );
}
if (nullIds.length > 0) {
  fail(
    `${nullIds.length} prerendered page(s) render a demo-layout with id="null", so the hero ` +
      'example answers to a fragment and a getElementById nobody aimed at it — bind the host id ' +
      `as [attr.id], which removes it instead of stringifying null: ${nullIds.join(', ')}`,
  );
}

console.log(
  `[check-prerender-output] ok — ${primitives.length} primitive routes + ` +
    `${guides.length} guide routes + ${sitePages.length} site pages + ${errorCodes.length} ` +
    'error code pages + the error index + the guide index + the landing page prerendered ' +
    'with content, none of them baking a theme and all of them bootstrapping one, over ' +
    `${fallbackRules} dark rule(s) each mirrored by a prefers-color-scheme fallback, ` +
    `${styleBlocks} component style block(s) keying none of their rules on the theme attribute, ` +
    `${themeToggles} theme toggle(s) prerendered without a state and ` +
    `${demoBlocks} example block(s) publishing none of their inputs as attributes and none of ` +
    `them an id of "null", and a landing page cataloguing all ${catalogued} published entry ` +
    'points with the descriptions their own headers show and the version the manifest states',
);
