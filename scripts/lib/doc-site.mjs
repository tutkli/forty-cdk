import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { guideSlugOf } from './doc-links.mjs';
import { isFenceLine, slugify, Slugger } from './readme-slug.mjs';
import { repoRoot } from './repo-path.mjs';

export const DOCS_DIR = join(repoRoot, 'docs');
export const LIBRARY_DIR = join(repoRoot, 'projects', 'forty-cdk');
export const PRIMITIVES_FILE = join(
  repoRoot,
  'projects',
  'forty-cdk-playground',
  'src',
  'app',
  'primitives.ts',
);

export const GUIDE_GROUPS = [
  { id: 'styling', label: 'Styling' },
  { id: 'composition', label: 'Composition patterns' },
  { id: 'table', label: 'Table & virtualization' },
];

export const PUBLISHED_GUIDES = [
  { file: 'styling.md', group: 'styling' },
  { file: 'styling-floating-content.md', group: 'styling' },
  { file: 'selected-indicator-pattern.md', group: 'styling' },
  { file: 'your-first-overlay.md', group: 'composition' },
  { file: 'wrapping-non-form-roots.md', group: 'composition' },
  { file: 'wrapping-form-primitives.md', group: 'composition' },
  { file: 'selection-value-type-contract.md', group: 'composition' },
  { file: 'table-declarative-columns.md', group: 'table' },
  { file: 'table-reordering.md', group: 'table' },
  { file: 'table-virtualized-rows.md', group: 'table' },
  { file: 'drag-in-virtualized-list-spike.md', group: 'table' },
];

export const EXCLUDED_GUIDES = [
  {
    file: 'documentation-site-page-template.md',
    reason:
      'Governance for contributors authoring the site itself — it specifies the page template the primitive pages are held to, and addresses nobody reading the published documentation.',
  },
];

const SENTENCE_BREAK = /(?<=[.!?])\s+(?=[A-Z`[(])/;
const MAX_DESCRIPTION = 260;

export function readPrimitives() {
  const source = readFileSync(PRIMITIVES_FILE, 'utf8');
  const entries = [];
  const re = /slug:\s*'([^']+)',\s+title:\s*'([^']+)'/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    entries.push({ slug: match[1], title: match[2] });
  }
  return entries;
}

export function sectionsOf(md) {
  const slugger = new Slugger();
  const sections = [];
  let inFence = false;
  for (const line of md.split('\n')) {
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

function headingOf(md) {
  const match = /^#\s+(.+)$/m.exec(md);
  return match ? match[1].trim() : null;
}

function stripInlineMarkdown(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\s)\*([^*]+)\*/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function ledeOf(md) {
  const lines = md.split('\n');
  const paragraph = [];
  let inFence = false;
  let seenHeading = false;

  for (const line of lines) {
    if (isFenceLine(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      seenHeading = true;
      if (paragraph.length > 0) {
        break;
      }
      continue;
    }
    if (!seenHeading) {
      continue;
    }
    const trimmed = line.trim();
    if (trimmed === '') {
      if (paragraph.length > 0) {
        break;
      }
      continue;
    }
    if (/^(?:[>|]|-{3,}|\*{3,}|[-*+]\s|\d+\.\s)/.test(trimmed)) {
      if (paragraph.length > 0) {
        break;
      }
      continue;
    }
    paragraph.push(trimmed);
  }

  const text = stripInlineMarkdown(paragraph.join(' '));
  if (text === '') {
    return '';
  }
  const [first] = text.split(SENTENCE_BREAK);
  const candidate = first !== undefined && first.length >= 40 ? first : text;
  if (candidate.length <= MAX_DESCRIPTION) {
    return candidate;
  }
  const clipped = candidate.slice(0, MAX_DESCRIPTION);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

export function readGuides() {
  const groups = new Set(GUIDE_GROUPS.map((group) => group.id));
  const published = new Set(PUBLISHED_GUIDES.map((guide) => guide.file));
  const excluded = new Set(EXCLUDED_GUIDES.map((guide) => guide.file));
  const present = readdirSync(DOCS_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort();

  const unregistered = present.filter((file) => !published.has(file) && !excluded.has(file));
  if (unregistered.length > 0) {
    throw new Error(
      `docs/ holds ${unregistered.length} file(s) that are neither published nor excluded: ${unregistered.join(', ')} — ` +
        'add each to PUBLISHED_GUIDES with a group, or to EXCLUDED_GUIDES with a stated reason (scripts/lib/doc-site.mjs)',
    );
  }

  const missing = [...published, ...excluded].filter((file) => !present.includes(file));
  if (missing.length > 0) {
    throw new Error(
      `the guide registry names ${missing.length} file(s) that no longer exist in docs/: ${missing.join(', ')}`,
    );
  }

  return PUBLISHED_GUIDES.map(({ file, group }) => {
    if (!groups.has(group)) {
      throw new Error(`docs/${file} is registered under unknown group "${group}"`);
    }
    const md = readFileSync(join(DOCS_DIR, file), 'utf8');
    const title = headingOf(md);
    if (title === null) {
      throw new Error(`docs/${file} has no "# " heading — the guide title is read from it`);
    }
    return {
      file,
      slug: guideSlugOf(file),
      group,
      title,
      description: ledeOf(md),
      sections: sectionsOf(md),
    };
  });
}

export function readPrimitiveReadmes() {
  const readmes = new Map();
  for (const { slug } of readPrimitives()) {
    const file = join(LIBRARY_DIR, slug, 'README.md');
    if (existsSync(file)) {
      readmes.set(`projects/forty-cdk/${slug}/README.md`, readFileSync(file, 'utf8'));
    }
  }
  return readmes;
}
