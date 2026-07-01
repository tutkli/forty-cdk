import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { repoRoot } from './lib/repo-path.mjs';
import { escapeHtml } from './lib/html.mjs';

const PRIMITIVES = join(
  repoRoot,
  'projects',
  'forty-cdk-playground',
  'src',
  'app',
  'primitives.ts',
);
const BROWSER = join(repoRoot, 'dist', 'forty-cdk-playground', 'browser');

function readPrimitives() {
  const source = readFileSync(PRIMITIVES, 'utf8');
  const entries = [];
  const re = /slug:\s*'([^']+)',\s+title:\s*'([^']+)'/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    entries.push({ slug: match[1], title: match[2] });
  }
  return entries;
}

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

for (const { slug, title } of primitives) {
  const file = join(BROWSER, slug, 'index.html');
  if (!existsSync(file)) {
    missing.push(slug);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  if (!html.includes('<h1') || !html.includes(escapeHtml(title))) {
    empty.push(slug);
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
  `[check-prerender-output] ok — ${primitives.length} primitive routes + home prerendered with content`,
);
