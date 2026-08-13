import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { readGuides, readPrimitives } from './lib/doc-site.mjs';
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
  fail('parsed 0 primitives from primitives.ts — the slug/title parser is stale');
}

const guides = readGuides();
if (guides.length === 0) {
  fail('the guide registry is empty — scripts/lib/doc-site.mjs no longer publishes any guide');
}

const routes = [
  ...primitives.map(({ slug, title }) => ({ path: slug, title })),
  { path: 'guides', title: 'Guides' },
  ...guides.map(({ slug, title }) => ({ path: `guides/${slug}`, title })),
];

const missing = [];
const empty = [];

const homeFile = join(BROWSER, 'index.html');
if (!existsSync(homeFile)) {
  missing.push('(home)');
} else {
  const homeHtml = readFileSync(homeFile, 'utf8');
  if (!homeHtml.includes('<h1') && !/http-equiv=["']refresh["']/i.test(homeHtml)) {
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
    `${guides.length} guide routes + the guide index + home prerendered with content`,
);
