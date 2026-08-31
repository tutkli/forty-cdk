import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildDocRoutes,
  GITHUB_BLOB_BASE,
  isAbsoluteHref,
  resolveDocLink,
} from './lib/doc-links.mjs';
import {
  DOCS_DIR,
  EXCLUDED_GUIDES,
  readFoldedEntryPoints,
  readGuides,
  readPrimitiveReadmes,
  readPrimitives,
} from './lib/doc-site.mjs';
import { isFenceLine } from './lib/readme-slug.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const LINK_RE = /\[(?:[^[\]]|\[[^\]]*\])*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function linksOf(md) {
  const links = [];
  let inFence = false;
  let lineNumber = 0;
  for (const line of md.split('\n')) {
    lineNumber += 1;
    if (isFenceLine(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    for (const match of line.matchAll(LINK_RE)) {
      links.push({ href: match[1], line: lineNumber });
    }
  }
  return links;
}

const primitives = readPrimitives();
const guides = readGuides();
const folded = readFoldedEntryPoints();
const excluded = new Set(EXCLUDED_GUIDES.map((guide) => `docs/${guide.file}`));

const routes = buildDocRoutes({
  primitiveSlugs: primitives.map((primitive) => primitive.slug),
  guideSlugs: guides.map((guide) => guide.slug),
  foldedSlugs: folded,
});

const documents = readPrimitiveReadmes();
for (const guide of guides) {
  documents.set(`docs/${guide.file}`, readFileSync(join(DOCS_DIR, guide.file), 'utf8'));
}

const failures = [];
let toRoute = 0;
let toSource = 0;
let relativeLinks = 0;

for (const [sourcePath, md] of documents) {
  for (const { href, line } of linksOf(md)) {
    if (href.startsWith('#') || isAbsoluteHref(href)) {
      continue;
    }
    relativeLinks += 1;
    const site = `${sourcePath}:${line}`;
    const resolved = resolveDocLink(href, { sourcePath, routes, blobBase: GITHUB_BLOB_BASE });

    if (resolved === null) {
      failures.push(`${site} — "${href}" resolves to nothing the site can serve`);
      continue;
    }

    if (resolved.kind === 'route') {
      toRoute += 1;
      continue;
    }

    toSource += 1;

    if (resolved.repoPath.startsWith('.claude/')) {
      failures.push(
        `${site} — "${href}" points at ${resolved.repoPath}, agent instrumentation that never ships; ` +
          'inline the prose the reader needs instead',
      );
      continue;
    }

    if (excluded.has(resolved.repoPath)) {
      failures.push(
        `${site} — "${href}" points at ${resolved.repoPath}, a guide the site deliberately excludes ` +
          '(see EXCLUDED_GUIDES in scripts/lib/doc-site.mjs)',
      );
      continue;
    }

    if (!existsSync(join(repoRoot, resolved.repoPath))) {
      failures.push(`${site} — "${href}" resolves to ${resolved.repoPath}, which does not exist`);
    }
  }
}

if (failures.length > 0) {
  console.error(`[check-doc-links] ${failures.length} broken link(s):`);
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

const expectedDocuments = primitives.length + guides.length + folded.length;
if (documents.size !== expectedDocuments) {
  console.error(
    `[check-doc-links] read ${documents.size} documents for ${expectedDocuments} published documents — ` +
      'a page renders a document this scan never saw, so the run proves nothing about it',
  );
  process.exit(1);
}

const LINK_FLOOR = 100;
if (relativeLinks < LINK_FLOOR) {
  console.error(
    `[check-doc-links] found only ${relativeLinks} relative links (floor ${LINK_FLOOR}) — ` +
      'the link extraction has stopped matching, so a green run proves nothing',
  );
  process.exit(1);
}

console.log(
  `[check-doc-links] ok — ${relativeLinks} relative links across ${documents.size} documents ` +
    `(${folded.length} folded into another page): ${toRoute} resolve to a site route, ` +
    `${toSource} to a GitHub blob`,
);
