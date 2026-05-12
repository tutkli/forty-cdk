/**
 * Generates two AI-consumable artifacts at build time inside `dist/forty-cdk-docs/`:
 *
 *  - `llms.txt` — a flat index per the llmstxt.org spec: project header +
 *     one section per URL group, each entry "[Title](url): one-line summary".
 *  - `llms-full.txt` — every page concatenated in route order with `\n\n---\n\n`
 *     separators. Useful for "load the entire docs into a single prompt"
 *     workflows.
 *
 * Source of truth:
 *
 *  - Conceptual pages live in `src/content/docs/*.md`. The first `# Heading`
 *    becomes the title; the first non-frontmatter paragraph (truncated to
 *    160 chars) becomes the summary.
 *  - Per-primitive pages combine the entry in `primitive-registry.ts` with
 *    the README mirrored under `src/content/component-readmes/`.
 *
 * The site URL prefix is controlled by `FORTY_CDK_DOCS_SITE_URL`. In CI we
 * set this to the canonical `https://forty-cdk.dev` (or whatever the
 * deployed domain ends up being); locally we default to relative URLs so
 * the file is readable without context.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PRIMITIVE_REGISTRY } from '../src/app/tokens/primitive-registry';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(DOCS_ROOT, '..', '..');
const DIST_DIR = join(REPO_ROOT, 'dist', 'forty-cdk-docs');
const CONTENT_DOCS = join(DOCS_ROOT, 'src', 'content', 'docs');
const CONTENT_COMPONENT_READMES = join(DOCS_ROOT, 'src', 'content', 'component-readmes');

const SITE_URL = (process.env['FORTY_CDK_DOCS_SITE_URL'] ?? '').replace(/\/+$/, '');

interface DocEntry {
  url: string;
  title: string;
  summary: string;
  body: string;
}

const CONCEPTUAL_PAGES: ReadonlyArray<{ filename: string; url: string }> = [
  { filename: 'getting-started.md', url: '/docs/getting-started' },
];

function stripFrontmatter(content: string): { body: string; frontmatter: Record<string, string> } {
  if (!content.startsWith('---')) return { body: content, frontmatter: {} };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { body: content, frontmatter: {} };
  const block = content.slice(3, end).trim();
  const body = content.slice(end + 4).trimStart();
  const frontmatter: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (match) frontmatter[match[1]!] = match[2]!.trim();
  }
  return { body, frontmatter };
}

function firstHeading(body: string): string | null {
  const match = body.match(/^#\s+(.+?)\s*$/m);
  return match ? (match[1] ?? null) : null;
}

function firstParagraph(body: string): string {
  for (const block of body.split(/\r?\n\s*\r?\n/)) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('```')) continue;
    return trimmed.replace(/\s+/g, ' ');
  }
  return '';
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

function readMd(path: string): string | null {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

function buildEntry(filename: string, url: string, fallbackTitle: string, fallbackSummary: string, dir: string): DocEntry | null {
  const raw = readMd(join(dir, filename));
  if (raw === null) return null;
  const { body, frontmatter } = stripFrontmatter(raw);
  const title = frontmatter['title'] ?? firstHeading(body) ?? fallbackTitle;
  const summary = frontmatter['description'] ?? firstParagraph(body) ?? fallbackSummary;
  return { url, title, summary, body };
}

function withSitePrefix(url: string): string {
  return SITE_URL ? `${SITE_URL}${url}` : url;
}

function renderLlmsTxt(entries: DocEntry[]): string {
  const docs = entries.filter((e) => e.url.startsWith('/docs/'));
  const components = entries.filter((e) => e.url.startsWith('/components/'));
  const lines: string[] = [
    '# forty-cdk',
    '',
    '> Headless Angular UI primitives. Composable, accessible, signal-first. Modeled on Radix UI / Base UI but reinterpreted idiomatically for Angular 21+.',
    '',
  ];
  if (docs.length) {
    lines.push('## Docs', '');
    for (const entry of docs) {
      lines.push(`- [${entry.title}](${withSitePrefix(entry.url)}): ${truncate(entry.summary, 160)}`);
    }
    lines.push('');
  }
  if (components.length) {
    lines.push('## Components', '');
    for (const entry of components) {
      lines.push(`- [${entry.title}](${withSitePrefix(entry.url)}): ${truncate(entry.summary, 160)}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderLlmsFullTxt(entries: DocEntry[]): string {
  const sections = entries.map((entry) => {
    const header = [`# ${entry.title}`, `URL: ${withSitePrefix(entry.url)}`, ''];
    return [...header, entry.body.trim()].join('\n');
  });
  return sections.join('\n\n---\n\n') + '\n';
}

function main(): void {
  console.log('[forty-cdk-docs/generate-llms-txt] starting…');
  const entries: DocEntry[] = [];

  for (const page of CONCEPTUAL_PAGES) {
    const entry = buildEntry(
      page.filename,
      page.url,
      page.filename.replace(/\.md$/, ''),
      '',
      CONTENT_DOCS,
    );
    if (entry) entries.push(entry);
  }

  for (const primitive of PRIMITIVE_REGISTRY) {
    const entry = buildEntry(
      `${primitive.slug}.md`,
      `/components/${primitive.slug}`,
      primitive.title,
      primitive.description,
      CONTENT_COMPONENT_READMES,
    );
    if (entry) {
      // Prefer the registry description over whatever the README's first
      // paragraph happened to be — the registry is the curated short
      // version meant for sidenav and AI-index consumption.
      entry.summary = primitive.description;
      entry.title = primitive.title;
      entries.push(entry);
    }
  }

  mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(join(DIST_DIR, 'llms.txt'), renderLlmsTxt(entries), 'utf8');
  writeFileSync(join(DIST_DIR, 'llms-full.txt'), renderLlmsFullTxt(entries), 'utf8');
  console.log(
    `[forty-cdk-docs/generate-llms-txt] wrote llms.txt + llms-full.txt (${entries.length} pages)`,
  );
}

main();
