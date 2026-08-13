import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { sectionsOf } from './lib/doc-site.mjs';
import { repoRoot } from './lib/repo-path.mjs';

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
