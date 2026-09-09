import { Marked, type Token, type Tokens } from 'marked';

import { cellsOf, type DocDocument } from '../../../../../scripts/docs/doc-model.mjs';
import { compile } from './testing/compile';
import { GUIDE_DOCS, PRIMITIVE_DOCS, SITE_DOCS, type DocFile } from './testing/doc-corpus';

/**
 * The differential half of the docs-pipeline characterization
 * ([#1805](https://github.com/tutkli/forty-cdk/issues/1805)): every table the
 * site publishes must equal the one `marked`'s own GFM lexer finds, cell by
 * cell, in the same order.
 *
 * The measurement this freezes is 294 tables across the 57 entry-point READMEs,
 * 309 once the published guides are counted, and zero divergences — the number
 * the hand-written line splitter reached by accident, and the number
 * [#1806](https://github.com/tutkli/forty-cdk/issues/1806) had to reproduce
 * when it replaced that splitter with a compiler over the token tree.
 *
 * **What the comparison asks has changed with the parser under it.** It used to
 * pit two independent implementations against each other, and cell equality was
 * the whole of the question. There is one implementation now, so the cells come
 * from the same `marked` tokens on both sides and could not disagree. What is
 * still worth asserting, and is not tautological, is everything the compiler
 * does *around* those tokens:
 *
 * - **No table is lost in the splitting.** The compiler walks only the top
 *   level and assigns each table to the section it falls under; the side below
 *   walks the tree recursively and knows nothing of sections. A table dropped
 *   between the two — nested, above the first heading, or off the end of a
 *   section — shows up as a count that no longer matches.
 * - **Order survives.** Tables are compared as a flat document-ordered list, so
 *   a section boundary drawn in the wrong place reorders them and fails.
 * - **Rows are rectangular.** The model guarantees what the old parser did not:
 *   every row is exactly as wide as its header, because a row that disagrees is
 *   a compile error rather than a silently dropped cell.
 */
const gfm = new Marked({ gfm: true });

/**
 * Floors, not targets. Each sits at what the audit measured, and fails a run
 * that stopped finding them — so adding an entry point or a table is not a
 * failure while a glob that silently matched nothing is.
 */
const README_FLOOR = 57;
const GUIDE_FLOOR = 10;
const README_TABLE_FLOOR = 294;

interface TableShape {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

function siteTables(document: DocDocument): readonly TableShape[] {
  return [...document.intro, ...document.sections.flatMap((section) => section.blocks)]
    .filter((block) => block.kind === 'table')
    .map((block) => cellsOf(block.table));
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

function gfmShape(table: Tokens.Table): TableShape {
  return {
    columns: table.header.map((cell) => cell.text),
    rows: table.rows.map((row) => row.map((cell) => cell.text)),
  };
}

function tableCount(docs: readonly DocFile[]): number {
  return docs.reduce((total, doc) => total + siteTables(compile(doc)).length, 0);
}

describe('README tables against the GFM lexer', () => {
  it.each(PRIMITIVE_DOCS.map((doc) => [doc.slug, doc] as const))(
    '%s compiles every table the way GFM reads it',
    (_slug, doc) => {
      expect(siteTables(compile(doc))).toEqual(gfmTables(doc.markdown).map(gfmShape));
    },
  );
});

describe('guide tables against the GFM lexer', () => {
  it.each(GUIDE_DOCS.map((doc) => [doc.slug, doc] as const))(
    '%s compiles every table the way GFM reads it',
    (_slug, doc) => {
      expect(siteTables(compile(doc))).toEqual(gfmTables(doc.markdown).map(gfmShape));
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
    expect(tableCount(PRIMITIVE_DOCS)).toBeGreaterThanOrEqual(README_TABLE_FLOOR);
  });

  it('finds the same number of tables on both sides of the corpus', () => {
    const lexed = SITE_DOCS.reduce((total, doc) => total + gfmTables(doc.markdown).length, 0);

    expect(tableCount(SITE_DOCS)).toBe(lexed);
  });
});

describe('the rectangularity the model guarantees', () => {
  it.each(SITE_DOCS.map((doc) => [doc.path, doc] as const))(
    '%s gives every table row exactly as many cells as its header',
    (_path, doc) => {
      const ragged = siteTables(compile(doc))
        .flatMap((table) =>
          table.rows.map((row, index) => ({
            index,
            columns: table.columns.length,
            cells: row.length,
          })),
        )
        .filter((row) => row.cells !== row.columns);

      expect(ragged).toEqual([]);
    },
  );
});
