import { Marked } from 'marked';

import { cellsOf, type DocDocument } from '../../../../../scripts/docs/doc-model.mjs';
import { compile, problemsOf } from './testing/compile';
import { headingIds } from './testing/heading-ids';

/**
 * The four markdown shapes the site's old hand-written parser read differently
 * from GFM, each pinned to what
 * [#1806](https://github.com/tutkli/forty-cdk/issues/1806) turned it into.
 *
 * [#1805](https://github.com/tutkli/forty-cdk/issues/1805) wrote these down as
 * characterization cases while the line splitter was still in place: three of
 * them recorded plainly wrong behaviour, and the fourth an id emitted twice.
 * Its table named what each should become, and this file is that table after
 * the fact:
 *
 * | Fixture                      | Before                                             | Now                                |
 * | ---------------------------- | -------------------------------------------------- | ---------------------------------- |
 * | `unescaped-pipe-in-type.md`  | an extra cell; the row's Description disappeared    | a compile error naming the line    |
 * | `table-inside-list-item.md`  | parsed as a standalone table; GFM saw none          | a compile error naming the line    |
 * | `pipe-above-setext-rule.md`  | a false-positive table that ate the line above it   | a compile error naming the line    |
 * | `colliding-heading-slugs.md` | two elements shared one `id`                        | deterministic, suffixed, unique    |
 *
 * The first three are errors rather than silent GFM agreement on purpose. Each
 * is a document whose author and whose renderer disagree, and every one of them
 * reads correctly on GitHub and wrongly on the site or the other way round —
 * so the honest outcome is to stop and name the line, not to pick a winner.
 *
 * The fifth fixture is the control. Four backticks around a fence, a `##`
 * inside one, an escaped pipe and raw HTML in a cell are all handled correctly,
 * and a rewrite that breaks any of them breaks the site — so they are asserted
 * with the same weight as the divergences.
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

function compileFixture(name: string): DocDocument {
  return compile({ path: `fixtures/${name}`, slug: 'fixture', markdown: fixture(name) });
}

function tablesOf(document: DocDocument, sectionSlug: string) {
  const section = document.sections.find((candidate) => candidate.slug === sectionSlug);
  if (section === undefined) {
    throw new Error(`the fixture declares no section slugged "${sectionSlug}"`);
  }
  return section.blocks.filter((block) => block.kind === 'table').map((block) => block.table);
}

function proseOf(document: DocDocument, sectionSlug: string): string {
  const section = document.sections.find((candidate) => candidate.slug === sectionSlug);
  return (section?.blocks ?? [])
    .filter((block) => block.kind === 'prose')
    .map((block) => block.markdown)
    .join('\n');
}

function gfmTableCount(markdown: string): number {
  return gfm.lexer(markdown).filter((token) => token.type === 'table').length;
}

describe('an unescaped pipe inside a union type', () => {
  const markdown = fixture('unescaped-pipe-in-type.md');

  it('fails the compile on the row, naming its line', () => {
    const problems = problemsOf(markdown, 'unescaped-pipe-in-type.md');

    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(7);
    expect(problems[0]!.path).toBe('unescaped-pipe-in-type.md');
    expect(problems[0]!.message).toContain('4 cell(s) against a header of 3 column(s)');
  });

  it('tells the author how to write the pipe they meant', () => {
    expect(problemsOf(markdown).at(0)!.message).toContain('\\|');
  });

  it('reports only the offending row, not the one below it', () => {
    expect(problemsOf(markdown).map((problem) => problem.line)).toEqual([7]);
  });
});

describe('a table indented inside a list item', () => {
  const markdown = fixture('table-inside-list-item.md');

  it('fails the compile once, on the row the table was written on', () => {
    const problems = problemsOf(markdown, 'table-inside-list-item.md');

    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(7);
    expect(problems[0]!.message).toContain('nested in a list item');
  });

  it('is no top-level table to the GFM lexer, which is why it is refused', () => {
    expect(gfmTableCount(markdown)).toBe(0);
  });
});

describe('prose carrying a pipe above a line of dashes', () => {
  const markdown = fixture('pipe-above-setext-rule.md');

  it('fails the compile on the prose line, naming it', () => {
    const problems = problemsOf(markdown, 'pipe-above-setext-rule.md');

    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(5);
    expect(problems[0]!.message).toContain('setext heading');
  });

  it('is a setext heading to the GFM lexer, which sees no table', () => {
    expect(gfmTableCount(markdown)).toBe(0);
    expect(gfm.lexer(markdown).filter((token) => token.type === 'heading')).toHaveLength(3);
  });
});

describe('headings that slugify identically', () => {
  it('suffixes the second of two sections at the same level', () => {
    const document = compileFixture('colliding-heading-slugs.md');

    expect(document.sections.map((section) => section.slug)).toEqual([
      'api',
      'keyboard',
      'keyboard-1',
    ]);
  });

  it('emits no id twice, because one slugger mints them all', () => {
    const ids = headingIds(compileFixture('colliding-heading-slugs.md'));

    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });

  it('suffixes a subsection that collides with its own section', () => {
    const document = compileFixture('colliding-heading-slugs.md');
    const api = document.sections.find((section) => section.slug === 'api');

    expect(api!.headings.map((heading) => heading.slug)).toEqual(['api-1']);
  });
});

describe('fences and escapes the compiler reads correctly', () => {
  const name = 'nested-fences-and-escapes.md';

  it('keeps a four-backtick fence in one prose block', () => {
    const blocks = compileFixture(name).sections[0]!.blocks;

    expect(blocks.map((block) => block.kind)).toEqual(['prose']);
    expect(proseOf(compileFixture(name), 'fences')).toContain('const side');
  });

  it('opens no section for a heading written inside a fence', () => {
    expect(compileFixture(name).sections.map((section) => section.title)).toEqual([
      'Fences',
      'Headings inside a fence',
      'Escaped pipes and raw HTML',
    ]);
  });

  it('finds no table inside a fence', () => {
    expect(tablesOf(compileFixture(name), 'headings-inside-a-fence')).toEqual([]);
  });

  it('keeps a pipe written as \\| inside one cell, unescaped', () => {
    const [table] = tablesOf(compileFixture(name), 'escaped-pipes-and-raw-html');

    expect(cellsOf(table!).rows[0]).toEqual([
      '`side`',
      '`Side | undefined`',
      'Press <kbd>Tab</kbd> to move on.',
    ]);
  });

  it('reads the table as an API table, addressed by column', () => {
    const [table] = tablesOf(compileFixture(name), 'escaped-pipes-and-raw-html');

    expect(table!.role).toBe('api');
    expect(table!.role === 'api' && table!.rows[0]!.description).toBe(
      'Press <kbd>Tab</kbd> to move on.',
    );
  });

  it('agrees with the GFM lexer on the one table the fixture declares', () => {
    expect(gfmTableCount(fixture(name))).toBe(1);
  });
});
