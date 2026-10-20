import {
  cellsOf,
  type DocApiTable,
  type DocTable,
} from '../../../../../scripts/docs/doc-model.mjs';
import { compile, problemsOf } from './testing/compile';
import { PRIMITIVE_DOCS, SITE_DOCS } from './testing/doc-corpus';

/**
 * The content compiler's own contract
 * ([#1806](https://github.com/tutkli/forty-cdk/issues/1806)): what it refuses,
 * what it guarantees to the page components, and what it exposes to the work
 * that will derive from it.
 *
 * `markdown-breakage.spec.ts` covers the four shapes #1805 measured against the
 * old parser. The cases here cover the rest of the ambiguity surface — the ones
 * the corpus has never held, which is exactly why they need a case: nothing else
 * would notice if the guard stopped guarding.
 */
function md(...lines: readonly string[]): string {
  return `${lines.join('\n')}\n`;
}

/**
 * A fixture's title and the lede every published document owes, so that the
 * only thing the compiler can refuse it for is the shape under test.
 */
function titled(title: string, ...lines: readonly string[]): string {
  return md(`# ${title}`, '', 'What it is.', '', ...lines);
}

describe('documents the compiler refuses', () => {
  it('names the line of a row with fewer cells than its header', () => {
    const problems = problemsOf(
      titled('Short row', '## API', '', '| A | B |', '| - | - |', '| one |'),
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(9);
    expect(problems[0]!.message).toContain('1 cell(s) against a header of 2 column(s)');
    expect(problems[0]!.message).toContain('pads the row');
  });

  it('refuses a document that does not open with a level-1 heading', () => {
    const problems = problemsOf(md('## Straight into a section', '', 'Body.'));

    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toContain('level-1 heading');
  });

  it('refuses a heading that slugifies to nothing', () => {
    const problems = problemsOf(titled('Title', '## ***', '', 'Body.'));

    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(5);
    expect(problems[0]!.message).toContain('empty string');
  });

  it('refuses a table above the first section, which no page renders', () => {
    const problems = problemsOf(
      titled('Title', '| A | B |', '| - | - |', '| one | two |', '', '## Section'),
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(5);
    expect(problems[0]!.message).toContain('above the first section');
  });

  it('refuses a heading above the first section, which no rail lists', () => {
    const problems = problemsOf(titled('Title', '### Aside', '', '## Section'));

    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(5);
    expect(problems[0]!.message).toContain('above the first section');
  });

  it('refuses a table nested in a blockquote, which the page would not show', () => {
    const problems = problemsOf(
      titled('Title', '## Section', '', '> | A | B |', '> | - | - |', '> | one | two |'),
    );

    expect(problems.map((problem) => problem.message)).toContain(
      'a table nested in a list item or blockquote is not rendered — lift it out',
    );
  });

  it('reports a table nested two blockquotes deep exactly once', () => {
    const problems = problemsOf(
      titled('Title', '## Section', '', '> > | A | B |', '> > | - | - |', '> > | one | two |'),
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(7);
    expect(problems[0]!.message).toContain('nested in a list item or blockquote');
  });

  it('refuses a heading nested in a blockquote, which carries no anchor', () => {
    const problems = problemsOf(titled('Title', '## Section', '', '> ### Quoted heading'));

    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toContain('carries no anchor');
  });

  it('refuses a fence in a language the site has no grammar for, naming its line', () => {
    const problems = problemsOf(titled('Title', '## S', '', '```json', '{}', '```'));

    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(7);
    expect(problems[0]!.message).toContain('marked "json"');
    expect(problems[0]!.message).toContain('publish unhighlighted');
  });

  it('names the languages a fence may be written as, so the fix is in the message', () => {
    const problems = problemsOf(titled('Title', '## S', '', '```jsx', 'x', '```'));

    expect(problems[0]!.message).toContain('ts, typescript');
    expect(problems[0]!.message).toContain('html');
  });

  it('accepts a bare fence, which is plain text rather than an unknown language', () => {
    const document = compile({
      path: 'docs/sample.md',
      slug: 'sample',
      markdown: titled('Title', '## S', '', '```', 'just words', '```'),
    });

    expect(document.sections[0]!.blocks[0]!.kind).toBe('prose');
  });

  it('sees a fence nested in a list item, which renders and would need a grammar', () => {
    const problems = problemsOf(
      titled('Title', '## S', '', '1. Step:', '', '   ```json', '   {}', '   ```'),
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toContain('marked "json"');
  });

  it('reports every problem in one pass rather than stopping at the first', () => {
    const problems = problemsOf(
      titled('Title', '## API', '', '| A | B |', '| - | - |', '| one |', '| two | three | four |'),
    );

    expect(problems.map((problem) => problem.line)).toEqual([9, 10]);
  });

  it('names the path it was given, so a run over the corpus is addressable', () => {
    const problems = problemsOf(md('## No title'), 'projects/forty-cdk/thing/README.md');

    expect(problems[0]!.path).toBe('projects/forty-cdk/thing/README.md');
  });
});

describe('what a compiled document guarantees its renderer', () => {
  const doc = { path: 'docs/sample.md', slug: 'sample' };

  it('drops the title from the body and reports it once', () => {
    const document = compile({
      ...doc,
      markdown: md('# The title', '', 'Lede.', '', 'More prose.', '', '## Section', '', 'Body.'),
    });

    expect(document.title).toBe('The title');
    expect(document.lede).toBe('Lede.');
    expect(document.intro.map((block) => block.markdown)).toEqual(['More prose.']);
    expect(document.sections[0]!.blocks[0]!.kind === 'prose').toBe(true);
  });

  it('keeps prose as the markdown it was written as, fences included', () => {
    const document = compile({
      ...doc,
      markdown: titled('T', '## S', '', 'Before.', '', '```ts', "const a = '|';", '```'),
    });
    const [block] = document.sections[0]!.blocks;

    expect(block!.kind).toBe('prose');
    expect(block!.kind === 'prose' && block!.markdown).toBe(
      "Before.\n\n```ts\nconst a = '|';\n```",
    );
  });

  it('splits prose at a table and rejoins after it', () => {
    const document = compile({
      ...doc,
      markdown: titled(
        'T',
        '## S',
        '',
        'Above.',
        '',
        '| A | B |',
        '| - | - |',
        '| one | two |',
        '',
        'Below.',
      ),
    });

    expect(document.sections[0]!.blocks.map((block) => block.kind)).toEqual([
      'prose',
      'table',
      'prose',
    ]);
  });

  it('lists a prose block’s heading anchors in the order it renders them', () => {
    const document = compile({
      ...doc,
      markdown: titled('T', '## S', '', '### First', '', 'a', '', '### Second', '', 'b'),
    });
    const [block] = document.sections[0]!.blocks;

    expect(block!.kind === 'prose' && block!.headingSlugs).toEqual(['first', 'second']);
  });

  it('resolves an API table by column, whatever the first column is called', () => {
    const document = compile({
      ...doc,
      markdown: titled(
        'T',
        '## S',
        '',
        '| Member | Type | Default | Description |',
        '| - | - | - | - |',
        '| `open` | `boolean` | `false` | Whether it is open. |',
      ),
    });
    const [block] = document.sections[0]!.blocks;
    const table = block!.kind === 'table' ? block!.table : null;

    expect(table!.role).toBe('api');
    expect((table as DocApiTable).columns.property).toBe('Member');
    expect((table as DocApiTable).rows[0]!.default).toBe('`false`');
    expect((table as DocApiTable).rows[0]!.description).toBe('Whether it is open.');
  });

  it('leaves a table with no Type column as a plain one', () => {
    const document = compile({
      ...doc,
      markdown: titled(
        'T',
        '## S',
        '',
        '| Data attribute | Values |',
        '| - | - |',
        '| `data-state` | `open` |',
      ),
    });
    const [block] = document.sections[0]!.blocks;

    expect(block!.kind === 'table' && block!.table.role).toBe('plain');
  });

  it.each(SITE_DOCS.map((doc) => [doc.path, doc] as const))(
    '%s reaches its renderer with one anchor per heading it renders',
    (_path, doc) => {
      const document = compile(doc);
      const mismatched = [...document.intro, ...document.sections.flatMap((s) => s.blocks)]
        .filter((block) => block.kind === 'prose')
        .map((block) => ({
          slugs: block.headingSlugs.length,
          headings: (block.markdown.match(/^#{1,6} /gm) ?? []).length,
        }))
        .filter((block) => block.slugs !== block.headings);

      expect(mismatched).toEqual([]);
    },
  );
});

/**
 * The model has to carry enough for the generated README the audit settled on
 * (D2), so that work starts from the model instead of parsing the markdown a
 * second time — #1806's last acceptance criterion.
 *
 * The case rebuilds one for `accordion` out of nothing but the model: the title,
 * the lede, the intro, the Examples caption, and every section's blocks — prose
 * as authored, tables re-emitted from records. Every line the source holds
 * outside a table has to reach that text, so a section whose prose the model
 * stopped carrying is named rather than passed over. It asserts the *inputs are
 * reachable*, not that this is the README's final shape — the shape is the
 * generated-README issue's to decide.
 *
 * **One ingredient the criterion names is not in the corpus at all.** It asks
 * for "intro, install, anatomy, API"; no entry-point README has an installation
 * section, and none mentions `pnpm add`. So the model cannot expose one, and the
 * generated README will have to supply it from the workspace rather than from
 * the content — which is a finding about the criterion, not a gap in the model.
 */
describe('deriving a README from the model alone', () => {
  it('reaches the title, the lede, the intro, every section’s prose and every API table', () => {
    const accordion = PRIMITIVE_DOCS.find((doc) => doc.slug === 'accordion')!;
    const document = compile(accordion);
    const tableMarkdown = (table: DocTable) => {
      const { columns, rows } = cellsOf(table);
      return [
        `| ${columns.join(' | ')} |`,
        `| ${columns.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.join(' | ')} |`),
      ].join('\n');
    };
    const apiTables = document.sections
      .find((section) => section.slug === 'api')!
      .blocks.filter((block) => block.kind === 'table');

    const readme = [
      `# ${document.title}`,
      document.lede ?? '',
      ...document.intro.map((block) => block.markdown),
      ...document.sections.flatMap((section) => [
        `## ${section.title}`,
        ...(section.slug === 'examples' && document.caption !== null ? [document.caption] : []),
        ...section.blocks.map((block) =>
          block.kind === 'prose' ? block.markdown : tableMarkdown(block.table),
        ),
      ]),
    ].join('\n\n');

    const sourceRuns: { heading: string; prose: string[] }[] = [];
    let inFence = false;
    for (const line of accordion.markdown.split(/\r?\n/)) {
      if (!inFence && /^##? /.test(line)) {
        sourceRuns.push({ heading: line, prose: [] });
      } else if (sourceRuns.length > 0 && (inFence || !/^\s*(\||$)/.test(line))) {
        sourceRuns.at(-1)!.prose.push(line.trimEnd());
      }
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
      }
    }
    const [intro, ...sourceSections] = sourceRuns;
    const unreached = sourceRuns.flatMap(({ heading, prose }) =>
      prose.filter((line) => !readme.includes(line)).map((line) => `${heading}: ${line}`),
    );

    expect(intro!.heading).toBe('# Accordion');
    expect(intro!.prose).toContain(document.lede);
    expect(sourceSections.map(({ heading }) => heading.slice('## '.length))).toEqual(
      document.sections.map((section) => section.title),
    );
    expect(sourceSections.filter(({ prose }) => prose.length > 0).length).toBeGreaterThan(6);
    expect(unreached).toEqual([]);
    expect(readme).toContain('# Accordion');
    expect(apiTables.length).toBeGreaterThan(0);
    expect(readme).toContain('| Property | Type | Description |');
  });

  it('finds no installation section anywhere in the corpus to derive one from', () => {
    const withInstall = PRIMITIVE_DOCS.filter((doc) =>
      compile(doc).sections.some((section) => section.slug.startsWith('install')),
    );

    expect(withInstall).toEqual([]);
  });

  it('exposes the heading anchors a table of contents needs, with their depth', () => {
    const accordion = PRIMITIVE_DOCS.find((doc) => doc.slug === 'accordion')!;
    const api = compile(accordion).sections.find((section) => section.slug === 'api')!;

    expect(api.headings.length).toBeGreaterThan(0);
    expect(api.headings.every((heading) => heading.depth >= 3)).toBe(true);
    expect(api.headings.every((heading) => heading.slug !== '')).toBe(true);
  });
});
