import { Marked, type Token, type Tokens } from 'marked';

import { parseDoc, renderInlineMarkdown, type DocTableData } from './markdown';
import { GUIDE_DOCS, PRIMITIVE_DOCS, SITE_DOCS, type DocFile } from './testing/doc-corpus';

/**
 * The differential half of the docs-pipeline characterization
 * ([#1805](https://github.com/tutkli/forty-cdk/issues/1805)): every table the
 * site's hand-written splitter finds must equal the one `marked`'s own GFM
 * lexer finds, cell by cell.
 *
 * The measurement this freezes is that they already agree everywhere — 294
 * tables across the 57 entry-point READMEs, 312 once the published guides are
 * counted, zero divergences. That agreement is **accidental**: `splitBlocks`
 * scans lines for a delimiter row and never consults a GFM implementation, so
 * nothing but this case stands between a rewrite and a silently different site.
 *
 * Two decisions make the comparison mean what it claims:
 *
 * - **Both sides render their cells through the same inline renderer.** The
 *   site stores a cell as rendered HTML while the lexer stores it as raw
 *   markdown, so the raw side is pushed through `renderInlineMarkdown` before
 *   comparing. What is left when the shared step is shared is exactly the
 *   question worth asking — did the two implementations *split* the document
 *   the same way — rather than a diff of two markdown renderers.
 * - **The lexer is walked recursively.** A GFM table nested in a list item or a
 *   blockquote is a table the site is expected to find too, and walking only the
 *   top level would quietly excuse the very case
 *   `markdown-breakage.spec.ts` records as divergent.
 */
const gfm = new Marked({ gfm: true });

/**
 * Floors, not targets. Each sits at what the audit measured — 57 entry-point
 * READMEs, 10 published guides, 294 README tables — and fails a run that
 * stopped finding them, so adding an entry point or a table is not a test
 * failure while a glob that silently matched nothing is.
 */
const README_FLOOR = 57;
const GUIDE_FLOOR = 10;
const README_TABLE_FLOOR = 294;

function tableBlocks(doc: DocFile): readonly DocTableData[] {
  return parseDoc(doc.markdown)
    .sections.flatMap((section) => section.blocks)
    .filter((block) => block.kind === 'table')
    .map((block) => block.table);
}

function gfmTables(markdown: string): readonly Tokens.Table[] {
  const found: Tokens.Table[] = [];
  const walk = (tokens: readonly Token[] | undefined): void => {
    for (const token of tokens ?? []) {
      if (token.type === 'table') {
        found.push(token as Tokens.Table);
      }
      walk((token as { tokens?: Token[] }).tokens);
      walk((token as { items?: Token[] }).items);
    }
  };
  walk(gfm.lexer(markdown));
  return found;
}

function siteShape(table: DocTableData): { columns: string[]; rows: string[][] } {
  return {
    columns: [...table.columns],
    rows: table.rows.map((row) => row.map((cell) => cell.html)),
  };
}

function gfmShape(table: Tokens.Table): { columns: string[]; rows: string[][] } {
  return {
    columns: table.header.map((cell) => renderInlineMarkdown(cell.text)),
    rows: table.rows.map((row) => row.map((cell) => renderInlineMarkdown(cell.text))),
  };
}

describe('README tables against the GFM lexer', () => {
  it.each(PRIMITIVE_DOCS.map((doc) => [doc.slug, doc] as const))(
    '%s parses every table the way GFM does',
    (_slug, doc) => {
      const site = tableBlocks(doc).map(siteShape);
      const gfmTokens = gfmTables(doc.markdown).map(gfmShape);

      expect(site).toEqual(gfmTokens);
    },
  );
});

describe('guide tables against the GFM lexer', () => {
  it.each(GUIDE_DOCS.map((doc) => [doc.slug, doc] as const))(
    '%s parses every table the way GFM does',
    (_slug, doc) => {
      const site = tableBlocks(doc).map(siteShape);
      const gfmTokens = gfmTables(doc.markdown).map(gfmShape);

      expect(site).toEqual(gfmTokens);
    },
  );
});

describe('the corpus the differential covers', () => {
  it('reads one README per entry point and one file per published guide', () => {
    expect(PRIMITIVE_DOCS.length).toBeGreaterThanOrEqual(README_FLOOR);
    expect(GUIDE_DOCS.length).toBeGreaterThanOrEqual(GUIDE_FLOOR);
  });

  it('leaves the lint-rule fixtures out, since they hold no entry point', () => {
    const paths = PRIMITIVE_DOCS.map((doc) => doc.path);

    expect(paths).not.toContain('projects/forty-cdk/eslint-rules-fixtures/README.md');
    expect(paths).toContain('projects/forty-cdk/accordion/README.md');
  });

  it('finds at least as many README tables as the audit measured', () => {
    const tables = PRIMITIVE_DOCS.reduce((total, doc) => total + tableBlocks(doc).length, 0);

    expect(tables).toBeGreaterThanOrEqual(README_TABLE_FLOOR);
  });

  it('finds the same number of tables on both sides of the corpus', () => {
    const site = SITE_DOCS.reduce((total, doc) => total + tableBlocks(doc).length, 0);
    const lexed = SITE_DOCS.reduce((total, doc) => total + gfmTables(doc.markdown).length, 0);

    expect(site).toBe(lexed);
  });
});
