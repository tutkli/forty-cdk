import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { repoRoot } from './lib/repo-path.mjs';
import { slugify, isFenceLine, Slugger } from './lib/readme-slug.mjs';

const LIB = join(repoRoot, 'projects', 'forty-cdk');
const OUT = join(
  repoRoot,
  'projects',
  'forty-cdk-playground',
  'src',
  'app',
  'doc',
  'search-index.generated.ts',
);

function sectionsOf(md) {
  const lines = md.split('\n');
  const slugger = new Slugger();
  const sections = [];
  let inFence = false;
  for (const line of lines) {
    if (isFenceLine(line)) {
      inFence = !inFence;
    }
    if (!inFence && /^## /.test(line)) {
      const title = line.slice(3).trim();
      sections.push({ title, anchor: slugger.unique(slugify(title)) });
    }
  }
  return sections;
}

const index = {};
let totalSections = 0;

for (const entry of readdirSync(LIB).sort()) {
  const dir = join(LIB, entry);
  if (!statSync(dir).isDirectory()) {
    continue;
  }
  const readme = join(dir, 'README.md');
  if (!existsSync(readme)) {
    continue;
  }
  const sections = sectionsOf(readFileSync(readme, 'utf8'));
  if (sections.length > 0) {
    index[entry] = sections;
    totalSections += sections.length;
  }
}

const body = Object.entries(index)
  .map(([slug, sections]) => {
    const items = sections
      .map((s) => `    { title: ${JSON.stringify(s.title)}, anchor: ${JSON.stringify(s.anchor)} },`)
      .join('\n');
    return `  ${JSON.stringify(slug)}: [\n${items}\n  ],`;
  })
  .join('\n');

const out =
  `import type { ReadmeSections } from './search-index';\n\n` +
  `export const README_SECTIONS: ReadmeSections = {\n${body}\n};\n`;

writeFileSync(OUT, out, 'utf8');

console.log(
  `[gen-search-index] wrote ${relative(repoRoot, OUT).split(sep).join('/')} — ` +
    `${Object.keys(index).length} primitives, ${totalSections} sections`,
);
