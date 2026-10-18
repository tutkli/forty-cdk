import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { markdownLinksOf } from './docs/doc-markdown.mjs';
import {
  buildDocRoutes,
  GITHUB_BLOB_BASE,
  isAbsoluteHref,
  resolveDocLink,
} from './lib/doc-links.mjs';
import {
  DOCS_DIR,
  EXCLUDED_GUIDES,
  readEntryPointDocs,
  readFoldedEntryPoints,
  readGuides,
  readPrimitives,
  readSitePages,
  SITE_DIR,
} from './lib/doc-site.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const primitives = readPrimitives();
const guides = readGuides();
const sitePages = readSitePages();
const folded = readFoldedEntryPoints();
const excluded = new Set(EXCLUDED_GUIDES.map((guide) => `docs/${guide.file}`));

const routes = buildDocRoutes({
  primitiveSlugs: primitives.map((primitive) => primitive.slug),
  guideSlugs: guides.map((guide) => guide.slug),
  pageSlugs: sitePages.map((page) => page.slug),
  foldedSlugs: folded,
});

const entryPointDocs = readEntryPointDocs();
const documents = new Map(entryPointDocs.map((doc) => [doc.path, readFileSync(doc.file, 'utf8')]));
for (const guide of guides) {
  documents.set(`docs/${guide.file}`, readFileSync(join(DOCS_DIR, guide.file), 'utf8'));
}
for (const page of sitePages) {
  documents.set(`docs/site/${page.file}`, readFileSync(join(SITE_DIR, page.file), 'utf8'));
}

const failures = [];
let toRoute = 0;
let toSource = 0;
let relativeLinks = 0;

for (const [sourcePath, md] of documents) {
  for (const { href, line } of markdownLinksOf(md)) {
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

const published = [
  ...[...primitives, ...folded].map(({ slug }) => `projects/forty-cdk/${slug}/README.md`),
  ...guides.map((guide) => `docs/${guide.file}`),
  ...sitePages.map((page) => `docs/site/${page.file}`),
];
const unread = published.filter((path) => !documents.has(path));
const expectedDocuments = entryPointDocs.length + guides.length + sitePages.length;
if (unread.length > 0 || documents.size !== expectedDocuments) {
  console.error(
    `[check-doc-links] read ${documents.size} documents for ${expectedDocuments} the corpus holds ` +
      `(${unread.join(', ') || 'none published left unread'}) — a page or an llms artifact ` +
      'publishes a document this scan never saw, so the run proves nothing about it',
  );
  process.exit(1);
}

const unpublished = entryPointDocs.length - primitives.length - folded.length;

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
    `(${folded.length} folded into another page, ${unpublished} published only as an llms artifact): ` +
    `${toRoute} resolve to a site route, ` +
    `${toSource} to a GitHub blob`,
);
