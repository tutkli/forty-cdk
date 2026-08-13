import { Marked, type Tokens } from 'marked';

import { escapeHtml } from '../../../../../scripts/lib/html.mjs';
import { isFenceLine, slugify, Slugger } from '../../../../../scripts/lib/readme-slug.mjs';
import { highlightCodeBlock } from './highlighter';

export { slugify };

export interface DocTableData {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly DocTableCell[])[];
}

export interface DocTableCell {
  readonly html: string;
  readonly text: string;
}

export type DocBlock =
  | { readonly kind: 'html'; readonly html: string }
  | { readonly kind: 'table'; readonly table: DocTableData };

export interface DocSubsection {
  readonly title: string;
  readonly slug: string;
}

export interface DocSectionData {
  readonly title: string;
  readonly slug: string;
  readonly subsections: readonly DocSubsection[];
  readonly blocks: readonly DocBlock[];
}

export interface ParsedDoc {
  readonly intro: string;
  readonly sections: readonly DocSectionData[];
}

export interface DocLinkTarget {
  readonly href: string;
  readonly route: string | null;
}

export type DocLinkResolver = (href: string, sourcePath: string) => DocLinkTarget | null;

export interface DocRenderContext {
  readonly sourcePath: string;
  readonly resolveLink: DocLinkResolver;
}

const headingSlugger = new Slugger();

let activeContext: DocRenderContext | null = null;

function renderLink(href: string, title: string | null, inner: string): string {
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
  const target = activeContext?.resolveLink(href, activeContext.sourcePath) ?? null;
  if (target === null) {
    return `<a href="${escapeHtml(href)}"${titleAttr}>${inner}</a>`;
  }
  if (target.route === null) {
    return `<a href="${escapeHtml(target.href)}"${titleAttr} target="_blank" rel="noreferrer noopener">${inner}</a>`;
  }
  return `<a href="${escapeHtml(target.href)}"${titleAttr} data-doc-route="${escapeHtml(target.route)}">${inner}</a>`;
}

const marked = new Marked({ gfm: true });
marked.use({
  renderer: {
    heading(token: Tokens.Heading) {
      const id = headingSlugger.unique(slugify(token.text));
      return `<h${token.depth} id="${id}">${renderInline(token.text)}</h${token.depth}>\n`;
    },
    code(token: Tokens.Code) {
      const highlighted = highlightCodeBlock(token.text, token.lang);
      return highlighted
        ? `${highlighted}\n`
        : `<pre><code>${escapeHtml(token.text)}</code></pre>\n`;
    },
    link(token: Tokens.Link) {
      return renderLink(token.href, token.title ?? null, renderInline(token.text));
    },
  },
});

function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false });
}

function renderInline(md: string): string {
  return marked.parseInline(md, { async: false });
}

export function renderInlineMarkdown(md: string): string {
  return renderInline(md);
}

export function stripText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function isTableDelimiter(line: string | undefined): boolean {
  if (line === undefined) {
    return false;
  }
  return /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-');
}

function splitCells(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function parseTable(lines: readonly string[]): DocTableData {
  const columns = splitCells(lines[0]!).map((cell) => renderInline(cell));
  const rows = lines.slice(2).map((line) =>
    splitCells(line).map((cell) => {
      const html = renderInline(cell);
      return { html, text: stripText(html) };
    }),
  );
  return { columns, rows };
}

function splitBlocks(body: string): DocBlock[] {
  const lines = body.split('\n');
  const blocks: DocBlock[] = [];
  let prose: string[] = [];
  let inFence = false;

  const flushProse = (): void => {
    if (prose.some((line) => line.trim() !== '')) {
      blocks.push({ kind: 'html', html: renderMarkdown(prose.join('\n')) });
    }
    prose = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    if (isFenceLine(line)) {
      inFence = !inFence;
      prose.push(line);
      i += 1;
      continue;
    }

    if (!inFence && line.includes('|') && line.trim() !== '' && isTableDelimiter(lines[i + 1])) {
      flushProse();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim() !== '') {
        tableLines.push(lines[i]!);
        i += 1;
      }
      blocks.push({ kind: 'table', table: parseTable(tableLines) });
      continue;
    }

    prose.push(line);
    i += 1;
  }

  flushProse();
  return blocks;
}

const SUBSECTION_RE = /<h3 id="([^"]+)">([\s\S]*?)<\/h3>/g;

function collectSubsections(blocks: readonly DocBlock[]): DocSubsection[] {
  const subsections: DocSubsection[] = [];
  for (const block of blocks) {
    if (block.kind !== 'html') {
      continue;
    }
    for (const match of block.html.matchAll(SUBSECTION_RE)) {
      subsections.push({ title: stripText(match[2]!), slug: match[1]! });
    }
  }
  return subsections;
}

function stripLeadingHeading(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[0]!.trim() === '') {
    result.shift();
  }
  if (result.length > 0 && /^#\s/.test(result[0]!)) {
    result.shift();
  }
  while (result.length > 0 && result[0]!.trim() === '') {
    result.shift();
  }
  return result;
}

export function parseDoc(md: string, context?: DocRenderContext): ParsedDoc {
  activeContext = context ?? null;
  try {
    return parseDocSections(md);
  } finally {
    activeContext = null;
  }
}

function parseDocSections(md: string): ParsedDoc {
  const lines = md.split('\n');
  const slugger = new Slugger();
  const introLines: string[] = [];
  const rawSections: { title: string; slug: string; bodyLines: string[] }[] = [];
  let current: { title: string; slug: string; bodyLines: string[] } | null = null;
  let inFence = false;

  for (const line of lines) {
    if (isFenceLine(line)) {
      inFence = !inFence;
    }

    if (!inFence && /^## /.test(line)) {
      const title = line.slice(3).trim();
      current = { title, slug: slugger.unique(slugify(title)), bodyLines: [] };
      rawSections.push(current);
      continue;
    }

    if (current) {
      current.bodyLines.push(line);
    } else {
      introLines.push(line);
    }
  }

  headingSlugger.reset();
  const intro = renderMarkdown(stripLeadingHeading(introLines).join('\n'));
  const sections = rawSections.map((section) => {
    const blocks = splitBlocks(section.bodyLines.join('\n'));
    return {
      title: section.title,
      slug: section.slug,
      subsections: collectSubsections(blocks),
      blocks,
    };
  });

  return { intro, sections };
}
