import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LIB = join(REPO, 'projects', 'forty-cdk');
const OUT = join(
  REPO,
  'projects',
  'forty-cdk-playground',
  'src',
  'app',
  'doc',
  'search-index.generated.ts',
);

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
}

function uniqueSlugger() {
  const seen = new Map();
  return (base) => {
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

function isFenceLine(line) {
  return /^\s*(```|~~~)/.test(line);
}

function sectionsOf(md) {
  const lines = md.split('\n');
  const slug = uniqueSlugger();
  const sections = [];
  let inFence = false;
  for (const line of lines) {
    if (isFenceLine(line)) {
      inFence = !inFence;
    }
    if (!inFence && /^## /.test(line)) {
      const title = line.slice(3).trim();
      sections.push({ title, anchor: slug(slugify(title)) });
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
  `[gen-search-index] wrote ${relative(REPO, OUT).split(sep).join('/')} — ` +
    `${Object.keys(index).length} primitives, ${totalSections} sections`,
);
