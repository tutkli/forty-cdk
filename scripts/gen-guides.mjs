import { writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { EXCLUDED_GUIDES, GUIDE_GROUPS, readGuides } from './lib/doc-site.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const DOC_DIR = join(repoRoot, 'projects', 'forty-cdk-playground', 'src', 'app', 'doc');
const META_OUT = join(DOC_DIR, 'guides.generated.ts');
const CONTENT_OUT = join(DOC_DIR, 'guide-content.generated.ts');
const CONTENT_PREFIX = '../../../../../docs/';

function identifierOf(slug) {
  return `${slug.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase())}Md`;
}

const guides = readGuides();

const metaEntries = guides
  .map((guide) => {
    const sections = guide.sections
      .map(
        (section) =>
          `      { title: ${JSON.stringify(section.title)}, anchor: ${JSON.stringify(section.anchor)} },`,
      )
      .join('\n');
    return [
      '  {',
      `    slug: ${JSON.stringify(guide.slug)},`,
      `    title: ${JSON.stringify(guide.title)},`,
      `    description: ${JSON.stringify(guide.description)},`,
      `    group: ${JSON.stringify(guide.group)},`,
      `    sourcePath: ${JSON.stringify(`docs/${guide.file}`)},`,
      sections === '' ? '    sections: [],' : `    sections: [\n${sections}\n    ],`,
      '  },',
    ].join('\n');
  })
  .join('\n');

const groupEntries = GUIDE_GROUPS.filter((group) =>
  guides.some((guide) => guide.group === group.id),
)
  .map((group) => {
    const slugs = guides
      .filter((guide) => guide.group === group.id)
      .map((guide) => `      ${JSON.stringify(guide.slug)},`)
      .join('\n');
    return [
      '  {',
      `    id: ${JSON.stringify(group.id)},`,
      `    label: ${JSON.stringify(group.label)},`,
      `    slugs: [\n${slugs}\n    ],`,
      '  },',
    ].join('\n');
  })
  .join('\n');

const metaSource =
  `import type { GuideGroup, GuideMeta } from './guides';\n\n` +
  `export const GUIDES: readonly GuideMeta[] = [\n${metaEntries}\n];\n\n` +
  `export const GUIDE_GROUPS: readonly GuideGroup[] = [\n${groupEntries}\n];\n`;

const contentImports = guides
  .map((guide) => `import ${identifierOf(guide.slug)} from '${CONTENT_PREFIX}${guide.file}';`)
  .join('\n');

const contentEntries = guides
  .map((guide) => `  ${JSON.stringify(guide.slug)}: ${identifierOf(guide.slug)},`)
  .join('\n');

const contentSource =
  `${contentImports}\n\n` +
  `export const GUIDE_CONTENT: Readonly<Record<string, string>> = {\n${contentEntries}\n};\n`;

writeFileSync(META_OUT, metaSource, 'utf8');
writeFileSync(CONTENT_OUT, contentSource, 'utf8');

const rel = (file) => relative(repoRoot, file).split(sep).join('/');

console.log(
  `[gen-guides] wrote ${rel(META_OUT)} + ${rel(CONTENT_OUT)} — ` +
    `${guides.length} guides in ${new Set(guides.map((g) => g.group)).size} groups, ` +
    `${EXCLUDED_GUIDES.length} excluded`,
);
