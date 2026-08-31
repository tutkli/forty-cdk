import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { readDocMeta } from './doc-contract.mjs';
import { guideSlugOf } from './doc-links.mjs';
import { isFenceLine } from './readme-slug.mjs';
import { repoRoot } from './repo-path.mjs';

export const DOCS_DIR = join(repoRoot, 'docs');
export const LIBRARY_DIR = join(repoRoot, 'projects', 'forty-cdk');

/** Holds no entry point and ships no page — its README documents lint fixtures. */
const NOT_AN_ENTRY_POINT = 'eslint-rules-fixtures';

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

/**
 * Every entry point that ships a README, published or not, in slug order.
 *
 * The library folder is the registry: a directory holding a README is a
 * document, and there is no list to keep in step with it.
 */
export function readEntryPointDocs() {
  const docs = [];
  for (const entry of readdirSync(LIBRARY_DIR).sort()) {
    if (entry === NOT_AN_ENTRY_POINT || !statSync(join(LIBRARY_DIR, entry)).isDirectory()) {
      continue;
    }
    const file = join(LIBRARY_DIR, entry, 'README.md');
    if (existsSync(file)) {
      docs.push({ slug: entry, path: `projects/forty-cdk/${entry}/README.md`, file });
    }
  }
  return docs;
}

/**
 * The metadata one README declares, or a thrown error naming every field that
 * kept it from being read.
 */
export function readEntryPointMeta({ file, path }) {
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const { meta, problems } = readDocMeta(source, path);
  if (meta === null) {
    throw new Error(
      `${problems.length} frontmatter problem(s):\n` +
        problems
          .map((problem) => `  ${problem.path}:${problem.line} — ${problem.message}`)
          .join('\n'),
    );
  }
  return meta;
}

/**
 * The primitives the site publishes a page for, read from the frontmatter each
 * README declares ([#1808](https://github.com/tutkli/forty-cdk/issues/1808)).
 *
 * An entry point whose README declares `group: none` is documented and
 * unpublished on purpose, and is absent here for the same reason it is absent
 * from the nav ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
 */
export function readPrimitives() {
  return readEntryPointDocs()
    .map((doc) => ({ slug: doc.slug, ...readEntryPointMeta(doc) }))
    .filter((primitive) => primitive.group !== 'none');
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
