import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { proseProblems } from './lib/doc-prose.mjs';
import {
  DOCS_DIR,
  readEntryPointDocs,
  readGuides,
  readSitePages,
  SITE_DIR,
} from './lib/doc-site.mjs';

const documents = [
  ...readEntryPointDocs().map((doc) => ({ path: doc.path, file: doc.file })),
  ...readGuides().map((guide) => ({
    path: `docs/${guide.file}`,
    file: join(DOCS_DIR, guide.file),
  })),
  ...readSitePages().map((page) => ({
    path: `docs/site/${page.file}`,
    file: join(SITE_DIR, page.file),
  })),
];

const problems = [];
let lines = 0;

if (documents.length === 0) {
  problems.push('the corpus holds no documents: a gate that reads nothing cannot report anything');
}

for (const document of documents) {
  const result = proseProblems(readFileSync(document.file, 'utf8'), { path: document.path });
  lines += result.lines;
  problems.push(...result.problems);
}

if (problems.length > 0) {
  console.error(
    `[check-doc-prose] FAIL: ${problems.length} problem(s) in the prose of ` +
      `${documents.length} documents (${lines} lines):`,
  );
  for (const problem of problems) {
    console.error(`  ${problem}`);
  }
  process.exit(1);
}

console.log(
  `[check-doc-prose] ok: ${documents.length} documents (${lines} lines) carry no em dash ` +
    'and no spaced double hyphen in their prose.',
);
