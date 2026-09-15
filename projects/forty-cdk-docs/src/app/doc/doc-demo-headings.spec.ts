import { demoHeadingProblems, demosOf } from '../../../../../scripts/lib/doc-demo-headings.mjs';
import { checkExampleHeadings } from '../../../../../scripts/lib/doc-contract.mjs';
import { documentMarkdown } from '../../../../../scripts/docs/doc-markdown.mjs';
import { renderDocument } from '../../../../../scripts/docs/doc-render.mjs';
import { searchTextOf } from '../../../../../scripts/docs/doc-search.mjs';
import { compile } from './testing/compile';
import { FRONTMATTER } from './testing/compile';
import { PRIMITIVE_DOCS } from './testing/doc-corpus';

/**
 * Where a secondary demo's title and the sentence under it are written
 * ([#1940](https://github.com/tutkli/forty-cdk/issues/1940)).
 *
 * They used to be `title` and `subtitle` attributes on `<demo-layout>` —
 * documentation prose living in a TypeScript file, authored as raw HTML, so no
 * link in it was resolved, no symbol in it checked, and none of it reached the
 * package page, `llms.txt` or the search index. The README now declares one
 * `###` per demo under `## Examples`, the compiler reads them off the section,
 * and a page names the heading each demo belongs to.
 *
 * Stated over the demo tree as **text**, for the reason `doc-caption.spec.ts`
 * states its own that way: the builder's AOT plugin refuses a file carrying
 * component metadata it was not asked to compile, so a spec in this target
 * cannot mount a page. A raw glob is a different thing and works.
 */
const PAGE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/*/*.page.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const DOCUMENTS = new Map(PRIMITIVE_DOCS.map((doc) => [doc.slug, compile(doc)]));

const PAGES = Object.entries(PAGE_FILES)
  .map(([key, source]) => {
    const path = key.slice(1);
    const slug = path.split('/')[5]!;
    const document = DOCUMENTS.get(slug);
    if (document === undefined) {
      throw new Error(`${path} publishes no entry point README the site could compile`);
    }
    return { path, slug, source: source as string, document };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

/** Floors rather than counts: a new demo is not a test failure, an empty sweep is. */
const PAGE_FLOOR = 50;
const DEMO_FLOOR = 120;

/** A compiled fixture, reduced to what the pairing reads off it. */
function documentOf(markdown: readonly string[]) {
  return compile({
    path: 'projects/forty-cdk/fixture/README.md',
    slug: 'fixture',
    markdown: [...FRONTMATTER, '', '# Thing', '', 'Lede.', '', ...markdown, ''].join('\n'),
  });
}

describe('the prose a page prints under each demo', () => {
  it('reads every page the site publishes, and every demo below a hero', () => {
    const secondary = PAGES.flatMap((page) => demosOf(page.source)).filter((demo) => !demo.hero);

    expect(PAGES.length).toBeGreaterThanOrEqual(PAGE_FLOOR);
    expect(secondary.length).toBeGreaterThanOrEqual(DEMO_FLOOR);
  });

  it('is written in the README and never as an attribute in a page file', () => {
    const authored = PAGES.filter((page) =>
      demosOf(page.source).some((demo) => demo.title !== null || demo.subtitle !== null),
    );

    expect(authored.map((page) => page.slug)).toEqual([]);
  });

  it('is markdown, so no page file writes inline markup of its own', () => {
    const markup = PAGES.filter((page) => /<(code|kbd)>/.test(page.source));

    expect(markup.map((page) => page.slug)).toEqual([]);
  });

  it('pairs every demo with the heading it names, and every heading with a demo', () => {
    expect(demoHeadingProblems(PAGES)).toEqual([]);
  });

  it('opens each heading, so every demo is introduced by a sentence', () => {
    expect(checkExampleHeadings([...DOCUMENTS.values()])).toEqual([]);
  });

  it('reaches the compiled model under the anchor the heading slugs to', () => {
    const accordion = DOCUMENTS.get('accordion')!;

    expect(accordion.examples.map((example) => example.slug)).toContain('multiple');
    expect(accordion.examples.find((example) => example.slug === 'multiple')?.prose).toContain(
      '`multiple`',
    );
  });

  it('stays in the section it was read from, so the package page publishes it too', () => {
    const accordion = DOCUMENTS.get('accordion')!;
    const examples = accordion.sections.find((section) => section.slug === 'examples');
    const prose = (examples?.blocks ?? [])
      .filter((block) => block.kind === 'prose')
      .map((block) => block.markdown)
      .join('\n');

    expect(prose).toContain('### Multiple');
    expect(prose).toContain(accordion.examples[0]!.prose);
  });
});

describe('the pairing, stated over documents and pages written here', () => {
  const page = (demos: string) => `template: \`<primitive-page>${demos}</primitive-page>\``;
  const hero = '<demo-layout hero sourcePath="fixture/examples/default.example.ts"></demo-layout>';

  it('reports a demo naming a heading the README does not declare', () => {
    const problems = demoHeadingProblems([
      {
        path: 'fixture.page.ts',
        source: page(
          `${hero}<demo-layout heading="states" sourcePath="fixture/examples/states.example.ts"></demo-layout>`,
        ),
        document: documentOf(['## Examples', '', 'Caption.']),
      },
    ]);

    expect(problems).toEqual([
      expect.objectContaining({
        path: 'fixture.page.ts',
        message: expect.stringContaining('names heading "states"'),
      }),
    ]);
  });

  it('reports a heading the page projects no demo for', () => {
    const problems = demoHeadingProblems([
      {
        path: 'fixture.page.ts',
        source: page(hero),
        document: documentOf([
          '## Examples',
          '',
          'Caption.',
          '',
          '### States',
          '',
          'Three of them.',
        ]),
      },
    ]);

    expect(problems).toEqual([
      expect.objectContaining({
        path: 'projects/forty-cdk/fixture/README.md',
        message: expect.stringContaining('introduces no demo'),
      }),
    ]);
  });

  it('reports a demo that still authors its own title and subtitle', () => {
    const problems = demoHeadingProblems([
      {
        path: 'fixture.page.ts',
        source: page(
          `${hero}<demo-layout title="States" subtitle="Three of them." sourcePath="fixture/examples/states.example.ts"></demo-layout>`,
        ),
        document: documentOf(['## Examples', '', 'Caption.']),
      },
    ]);

    expect(problems).toEqual([
      expect.objectContaining({ message: expect.stringContaining('authors a title or subtitle') }),
    ]);
  });

  it('reports a demo below the hero that names no heading at all', () => {
    const problems = demoHeadingProblems([
      {
        path: 'fixture.page.ts',
        source: page(
          `${hero}<demo-layout sourcePath="fixture/examples/states.example.ts"></demo-layout>`,
        ),
        document: documentOf(['## Examples', '', 'Caption.']),
      },
    ]);

    expect(problems).toEqual([
      expect.objectContaining({ message: expect.stringContaining('names no heading') }),
    ]);
  });

  it('reports two demos claiming one heading', () => {
    const demo = (source: string) =>
      `<demo-layout heading="states" sourcePath="${source}"></demo-layout>`;
    const problems = demoHeadingProblems([
      {
        path: 'fixture.page.ts',
        source: page(
          `${hero}${demo('fixture/examples/a.example.ts')}${demo('fixture/examples/b.example.ts')}`,
        ),
        document: documentOf(['## Examples', '', 'Caption.', '', '### States', '', 'Three.']),
      },
    ]);

    expect(problems).toEqual([
      expect.objectContaining({ message: expect.stringContaining('two demos name heading') }),
    ]);
  });

  it('reports demos projected in an order the README does not declare them in', () => {
    const demo = (heading: string) =>
      `<demo-layout heading="${heading}" sourcePath="fixture/examples/${heading}.example.ts"></demo-layout>`;
    const problems = demoHeadingProblems([
      {
        path: 'fixture.page.ts',
        source: page(`${hero}${demo('second')}${demo('first')}`),
        document: documentOf([
          '## Examples',
          '',
          'Caption.',
          '',
          '### First',
          '',
          'One.',
          '',
          '### Second',
          '',
          'Two.',
        ]),
      },
    ]);

    expect(problems).toEqual([
      expect.objectContaining({ message: expect.stringContaining('a different order') }),
    ]);
  });

  it('reports a page that writes inline markup where the README writes markdown', () => {
    const problems = demoHeadingProblems([
      {
        path: 'fixture.page.ts',
        source: `${page(hero)} // <code>ForThing</code>`,
        document: documentOf(['## Examples', '', 'Caption.']),
      },
    ]);

    expect(problems).toEqual([
      expect.objectContaining({ message: expect.stringContaining('inline markup') }),
    ]);
  });

  it('accepts a page and a README that declare the same demos in the same order', () => {
    const demo = (heading: string) =>
      `<demo-layout heading="${heading}" sourcePath="fixture/examples/${heading}.example.ts"></demo-layout>`;
    const problems = demoHeadingProblems([
      {
        path: 'fixture.page.ts',
        source: page(`${hero}${demo('first')}${demo('second')}`),
        document: documentOf([
          '## Examples',
          '',
          'Caption.',
          '',
          '### First',
          '',
          'One.',
          '',
          '### Second',
          '',
          'Two.',
        ]),
      },
    ]);

    expect(problems).toEqual([]);
  });
});

describe('the contract a demo heading is held to across the corpus', () => {
  it('reports a heading that opens with a fence instead of a sentence', () => {
    const fenced = documentOf([
      '## Examples',
      '',
      'Caption.',
      '',
      '### States',
      '',
      '```ts',
      'const answer = 1;',
      '```',
    ]);

    expect(fenced.examples[0]!.prose).toBeNull();
    expect(checkExampleHeadings([fenced])).toEqual([
      expect.objectContaining({
        path: 'projects/forty-cdk/fixture/README.md',
        message: expect.stringContaining('does not open with a paragraph'),
      }),
    ]);
  });
});

describe('the artifacts the prose has to reach', () => {
  /** A fixture document links nowhere, so its renderer needs no route map. */
  const ROUTES = new Map<string, string>();

  it('is indexed by the ⌘K palette, under the section the demos render in', () => {
    const page = renderDocument(DOCUMENTS.get('accordion')!, { routes: ROUTES });
    const examples = page.sections.find((section) => section.slug === 'examples')!;

    expect(searchTextOf(examples)).toContain('lets several sections stay open at once');
  });

  it('is serialised back into the markdown a page publishes for assistants', () => {
    const markdown = documentMarkdown(DOCUMENTS.get('accordion')!, () => null);

    expect(markdown).toContain('### Multiple');
    expect(markdown).toContain(DOCUMENTS.get('accordion')!.examples[0]!.prose);
  });
});
