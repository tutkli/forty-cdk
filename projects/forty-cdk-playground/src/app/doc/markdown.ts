import { Marked, type Tokens } from 'marked';

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

export interface ParsedReadme {
  readonly intro: string;
  readonly sections: readonly DocSectionData[];
}

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
}

class Slugger {
  readonly #seen = new Map<string, number>();

  reset(): void {
    this.#seen.clear();
  }

  unique(base: string): string {
    const count = this.#seen.get(base) ?? 0;
    this.#seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  }
}

const headingSlugger = new Slugger();

const marked = new Marked({ gfm: true });
marked.use({
  renderer: {
    heading(token: Tokens.Heading) {
      const id = headingSlugger.unique(slugify(token.text));
      return `<h${token.depth} id="${id}">${renderInline(token.text)}</h${token.depth}>\n`;
    },
  },
});

function renderMarkdown(md: string): string {
  headingSlugger.reset();
  return marked.parse(md, { async: false });
}

function renderInline(md: string): string {
  return marked.parseInline(md, { async: false });
}

function stripText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function isFenceLine(line: string): boolean {
  return /^\s*(```|~~~)/.test(line);
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
  const columns = splitCells(lines[0]).map((cell) => renderInline(cell));
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
    const line = lines[i];

    if (isFenceLine(line)) {
      inFence = !inFence;
      prose.push(line);
      i += 1;
      continue;
    }

    if (!inFence && line.includes('|') && line.trim() !== '' && isTableDelimiter(lines[i + 1])) {
      flushProse();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        tableLines.push(lines[i]);
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

function collectSubsections(bodyLines: readonly string[]): DocSubsection[] {
  const subsections: DocSubsection[] = [];
  let inFence = false;
  for (const line of bodyLines) {
    if (isFenceLine(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && /^### /.test(line)) {
      const raw = line.slice(4).trim();
      subsections.push({ title: raw.replace(/`/g, ''), slug: slugify(raw) });
    }
  }
  return subsections;
}

function stripLeadingHeading(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[0].trim() === '') {
    result.shift();
  }
  if (result.length > 0 && /^#\s/.test(result[0])) {
    result.shift();
  }
  while (result.length > 0 && result[0].trim() === '') {
    result.shift();
  }
  return result;
}

export function parseReadme(md: string): ParsedReadme {
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

  const intro = renderMarkdown(stripLeadingHeading(introLines).join('\n'));
  const sections = rawSections.map((section) => ({
    title: section.title,
    slug: section.slug,
    subsections: collectSubsections(section.bodyLines),
    blocks: splitBlocks(section.bodyLines.join('\n')),
  }));

  return { intro, sections };
}
