import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { readGuides, readPrimitives, readSitePages } from './lib/doc-site.mjs';
import { escapeHtml } from './lib/html.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const BROWSER = join(repoRoot, 'dist', 'forty-cdk-playground', 'browser');

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

const routes = [
  ...sitePages.map(({ slug, title }) => ({ path: slug, title })),
  ...primitives.map(({ slug, title }) => ({ path: slug, title })),
  { path: 'guides', title: 'Guides' },
  ...guides.map(({ slug, title }) => ({ path: `guides/${slug}`, title })),
];

const missing = [];
const empty = [];

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
}

if (missing.length > 0) {
  fail(`missing prerendered index.html for ${missing.length} route(s): ${missing.join(', ')}`);
}
if (empty.length > 0) {
  fail(
    `prerendered HTML is missing rendered content for ${empty.length} route(s): ${empty.join(', ')}`,
  );
}

console.log(
  `[check-prerender-output] ok — ${primitives.length} primitive routes + ` +
    `${guides.length} guide routes + ${sitePages.length} site pages + the guide index + ` +
    'the landing page prerendered with content',
);
