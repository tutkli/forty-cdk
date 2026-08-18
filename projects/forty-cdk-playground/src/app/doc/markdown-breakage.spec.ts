import { Marked } from 'marked';

import { parseDoc, stripText, type DocBlock, type DocTableData, type ParsedDoc } from './markdown';
import { headingIds } from './testing/heading-ids';

/**
 * The four markdown shapes the site's hand-written parser reads differently
 * from GFM, each pinned to what it does **today**
 * ([#1805](https://github.com/tutkli/forty-cdk/issues/1805)).
 *
 * These are characterization cases, not a wish list: every assertion below
 * records current behaviour, including the three that are plainly wrong. That
 * is the point — [#1806](https://github.com/tutkli/forty-cdk/issues/1806)
 * replaces this parser, and a replacement that fixes one of them has to say so
 * by editing a case here rather than by changing 57 pages in silence. The
 * `wanted` column of #1805's table is what each case is expected to become:
 *
 * | Fixture                      | Today                                              | Wanted                             |
 * | ---------------------------- | -------------------------------------------------- | ---------------------------------- |
 * | `unescaped-pipe-in-type.md`  | an extra cell; the row's Description disappears     | a build error naming file and line |
 * | `table-inside-list-item.md`  | parsed as a standalone table; GFM sees none         | GFM behaviour                      |
 * | `pipe-above-setext-rule.md`  | a false-positive table that eats the line above it  | GFM behaviour (setext heading)     |
 * | `colliding-heading-slugs.md` | two elements share one `id`                         | deterministic and documented       |
 *
 * The fifth fixture is the control. Four backticks around a fence, a `##`
 * inside one, an escaped pipe and raw HTML in a cell are all handled correctly
 * today, and a rewrite that breaks any of them breaks the site — so they are
 * asserted with the same weight as the divergences.
 *
 * The fixtures are files rather than template literals because three of them
 * turn on a backslash or a backtick run, and a source-embedded copy would be
 * asserting against TypeScript's escaping rather than against the markdown a
 * contributor writes. They are `.prettierignore`d for the same reason.
 */
const FIXTURES = import.meta.glob(
  '/projects/forty-cdk-playground/src/app/doc/testing/fixtures/*.md',
  { query: '?raw', import: 'default', eager: true },
);

const gfm = new Marked({ gfm: true });

function fixture(name: string): string {
  const markdown = FIXTURES[`/projects/forty-cdk-playground/src/app/doc/testing/fixtures/${name}`];
  if (markdown === undefined) {
    throw new Error(`fixture ${name} was not found`);
  }
  return markdown;
}

function blocksOf(doc: ParsedDoc, sectionSlug: string): readonly DocBlock[] {
  const section = doc.sections.find((candidate) => candidate.slug === sectionSlug);
  if (section === undefined) {
    throw new Error(`the fixture declares no section slugged "${sectionSlug}"`);
  }
  return section.blocks;
}

function tablesOf(doc: ParsedDoc, sectionSlug: string): readonly DocTableData[] {
  return blocksOf(doc, sectionSlug)
    .filter((block) => block.kind === 'table')
    .map((block) => block.table);
}

function gfmTableCount(markdown: string): number {
  return gfm.lexer(markdown).filter((token) => token.type === 'table').length;
}

describe('an unescaped pipe inside a union type', () => {
  const markdown = fixture('unescaped-pipe-in-type.md');

  it('splits the row into one more cell than the table has columns', () => {
    const [table] = tablesOf(parseDoc(markdown), 'api');

    expect(table!.columns.map(stripText)).toEqual(['Property', 'Type', 'Description']);
    expect(table!.rows[0]!.map((cell) => cell.text)).toEqual([
      'side',
      '`Side',
      'undefined`',
      'Which edge the panel docks to.',
    ]);
  });

  it('leaves the description in a fourth cell no column renders', () => {
    const [table] = tablesOf(parseDoc(markdown), 'api');
    const rendered = table!.rows[0]!.slice(0, table!.columns.length);

    expect(rendered.some((cell) => cell.text.includes('Which edge'))).toBe(false);
  });

  it('does not affect the rows around it', () => {
    const [table] = tablesOf(parseDoc(markdown), 'api');

    expect(table!.rows[1]!.map((cell) => cell.text)).toEqual([
      'align',
      'Align',
      'Where the panel sits along that edge.',
    ]);
  });
});

describe('a table indented inside a list item', () => {
  const markdown = fixture('table-inside-list-item.md');

  it('is lifted out of the list and parsed as a standalone table', () => {
    const tables = tablesOf(parseDoc(markdown), 'steps');

    expect(tables).toHaveLength(1);
    expect(tables[0]!.columns.map(stripText)).toEqual(['Key', 'Action']);
  });

  it('is no table at all to the GFM lexer', () => {
    expect(gfmTableCount(markdown)).toBe(0);
  });
});

describe('prose carrying a pipe above a line of dashes', () => {
  const markdown = fixture('pipe-above-setext-rule.md');

  it('becomes a table with a header and no rows', () => {
    const tables = tablesOf(parseDoc(markdown), 'notes');

    expect(tables).toHaveLength(1);
    expect(tables[0]!.columns.map(stripText)).toEqual([
      'Write open',
      'closed to describe the state',
    ]);
    expect(tables[0]!.rows).toEqual([]);
  });

  it('swallows the sentence it was made from', () => {
    const prose = blocksOf(parseDoc(markdown), 'notes')
      .filter((block) => block.kind === 'html')
      .map((block) => block.html)
      .join('');

    expect(prose).not.toContain('to describe the state');
    expect(prose).toContain('The paragraph below the rule belongs to this section.');
  });

  it('is a setext heading to the GFM lexer, which sees no table', () => {
    expect(gfmTableCount(markdown)).toBe(0);
    expect(gfm.lexer(markdown).filter((token) => token.type === 'heading')).toHaveLength(3);
  });
});

describe('headings that slugify identically', () => {
  const markdown = fixture('colliding-heading-slugs.md');

  it('suffixes the second of two sections at the same level', () => {
    const doc = parseDoc(markdown);

    expect(doc.sections.map((section) => section.slug)).toEqual(['api', 'keyboard', 'keyboard-1']);
  });

  it('emits one id twice, because sections and subsections are slugged separately', () => {
    const ids = headingIds(parseDoc(markdown));
    const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicated).toEqual(['api']);
  });

  it('reports the colliding subsection under the same slug as its section', () => {
    const doc = parseDoc(markdown);
    const api = doc.sections.find((section) => section.slug === 'api');

    expect(api!.subsections.map((subsection) => subsection.slug)).toEqual(['api']);
  });
});

describe('fences and escapes the splitter reads correctly', () => {
  const markdown = fixture('nested-fences-and-escapes.md');

  it('keeps a four-backtick fence in one prose block', () => {
    const blocks = blocksOf(parseDoc(markdown), 'fences');

    expect(blocks.map((block) => block.kind)).toEqual(['html']);
    expect(blocks[0]!.kind === 'html' && blocks[0]!.html).toContain('const side');
  });

  it('opens no section for a heading written inside a fence', () => {
    const doc = parseDoc(markdown);

    expect(doc.sections.map((section) => section.title)).toEqual([
      'Fences',
      'Headings inside a fence',
      'Escaped pipes and raw HTML',
    ]);
  });

  it('finds no table inside a fence', () => {
    expect(tablesOf(parseDoc(markdown), 'headings-inside-a-fence')).toEqual([]);
  });

  it('unescapes a pipe written as \\| and keeps the cell whole', () => {
    const [table] = tablesOf(parseDoc(markdown), 'escaped-pipes-and-raw-html');

    expect(table!.rows[0]!.map((cell) => cell.text)).toEqual([
      'side',
      'Side | undefined',
      'Press Tab to move on.',
    ]);
  });

  it('passes raw HTML in a cell through to the rendered markup', () => {
    const [table] = tablesOf(parseDoc(markdown), 'escaped-pipes-and-raw-html');

    expect(table!.rows[0]![2]!.html).toContain('<kbd>Tab</kbd>');
  });

  it('agrees with the GFM lexer on the one table the fixture declares', () => {
    expect(gfmTableCount(markdown)).toBe(1);
  });
});
