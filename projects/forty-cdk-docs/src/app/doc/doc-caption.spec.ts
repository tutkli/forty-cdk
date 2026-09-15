import { checkExamplesCaption } from '../../../../../scripts/lib/doc-contract.mjs';
import { compile } from './testing/compile';
import { PRIMITIVE_DOCS } from './testing/doc-corpus';

/**
 * The sentence a page prints above its hero, and where it is authored
 * ([#1920](https://github.com/tutkli/forty-cdk/issues/1920)).
 *
 * A hero used to render with nothing said about it, which on `/switch` is a
 * lone toggle a reader is not told to try. The caption is the paragraph
 * `## Examples` opens with — documentation prose, so the README owns it and no
 * page file writes one — and the compiler lifts it out of the section so the
 * page publishes it once rather than twice.
 *
 * Stated over the demo tree as **text**, for the reason `doc-section-layout`'s
 * own cases are stated over the compiled model: the builder's AOT plugin
 * refuses a file carrying component metadata it was not asked to compile, so a
 * spec in this target cannot mount a page. A raw glob is a different thing and
 * works — `demo-icons.spec.ts` reads every example that way.
 */
const PAGE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/*/*.page.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface DemoPage {
  readonly slug: string;
  readonly path: string;
  readonly source: string;
  /** Whether the page projects a demo above the intro. */
  readonly hero: boolean;
  /** Whether it projects one into the `## Examples` block instead. */
  readonly inBlock: boolean;
}

/** The attribute region of one `<demo-layout>`, up to the first `>` it writes. */
const PROJECTED_AS_HERO = /^[^>]*\bhero\b/;

const PAGES: readonly DemoPage[] = Object.entries(PAGE_FILES)
  .map(([key, source]) => {
    const path = key.slice(1);
    const projected = source.split('<demo-layout').slice(1);
    return {
      slug: path.split('/')[5]!,
      path,
      source,
      hero: projected.some((demo) => PROJECTED_AS_HERO.test(demo)),
      inBlock: projected.some((demo) => !PROJECTED_AS_HERO.test(demo)),
    };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

const DOCUMENTS = new Map(PRIMITIVE_DOCS.map((doc) => [doc.slug, compile(doc)]));

/** Floors rather than counts: a new page is not a test failure, an empty sweep is. */
const PAGE_FLOOR = 50;
const HERO_FLOOR = 48;

function documentOf(page: DemoPage) {
  const document = DOCUMENTS.get(page.slug);
  if (document === undefined) {
    throw new Error(`${page.path} publishes no entry point README the site could compile`);
  }
  return document;
}

describe('the caption a page prints above its hero', () => {
  it('reads every page the site publishes, not a fraction of them', () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(PAGE_FLOOR);
    expect(PAGES.filter((page) => page.hero).length).toBeGreaterThanOrEqual(HERO_FLOOR);
  });

  it('has a hero to print above, because a page that projects a demo projects one', () => {
    const heroless = PAGES.filter((page) => page.inBlock && !page.hero);

    expect(heroless.map((page) => page.slug)).toEqual([]);
  });

  it('is authored in the README of every page that projects a hero', () => {
    const uncaptioned = PAGES.filter((page) => page.hero && documentOf(page).caption === null);

    expect(uncaptioned.map((page) => page.slug)).toEqual([]);
  });

  it('is written in the README and never as a string in a page file', () => {
    const authoredInThePage = PAGES.filter((page) => page.source.includes('caption='));

    expect(authoredInThePage.map((page) => page.slug)).toEqual([]);
  });

  it('leaves the section it was lifted from, so the page never publishes it twice', () => {
    const republished = PAGES.filter((page) => {
      const document = documentOf(page);
      const caption = document.caption;
      if (caption === null) {
        return false;
      }
      const examples = document.sections.find((section) => section.slug === 'examples');
      return (examples?.blocks ?? []).some(
        (block) => block.kind === 'prose' && block.markdown.includes(caption),
      );
    });

    expect(republished.map((page) => page.slug)).toEqual([]);
  });
});

describe('the section a page renders its live demos in', () => {
  it('is declared by every document whose page projects one into the block', () => {
    const undeclared = PAGES.filter(
      (page) =>
        page.inBlock && !documentOf(page).sections.some((section) => section.slug === 'examples'),
    );

    expect(undeclared.map((page) => page.slug)).toEqual([]);
  });
});

describe('the contract the caption is held to across the corpus', () => {
  it('finds no document whose ## Examples opens with something other than a paragraph', () => {
    expect(checkExamplesCaption([...DOCUMENTS.values()])).toEqual([]);
  });

  it('reports the document that opens the section with a fence instead', () => {
    const fenced = compile({
      path: 'projects/forty-cdk/fixture/README.md',
      slug: 'fixture',
      markdown: [
        '---',
        'title: Thing',
        'group: primitives',
        'archetype: [composable-ui]',
        '---',
        '',
        '# Thing',
        '',
        'Lede.',
        '',
        '## Examples',
        '',
        '```ts',
        'const answer = 1;',
        '```',
        '',
      ].join('\n'),
    });

    expect(fenced.caption).toBeNull();
    expect(checkExamplesCaption([fenced])).toEqual([
      expect.objectContaining({
        path: 'projects/forty-cdk/fixture/README.md',
        message: expect.stringContaining('"## Examples" does not open with a paragraph'),
      }),
    ]);
  });
});
