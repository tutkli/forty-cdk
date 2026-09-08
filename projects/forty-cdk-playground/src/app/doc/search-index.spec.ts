import { renderDocument } from '../../../../../scripts/docs/doc-render.mjs';
import { searchTextOf } from '../../../../../scripts/docs/doc-search.mjs';
import { DOC_INDEX } from '../../generated/doc-index.generated';
import { PLAYGROUND_GROUPS } from '../primitives';
import { GUIDE_INDEX } from './guides';
import {
  buildSearchEntries,
  loadSearchIndex,
  type SearchEntry,
  searchEntries,
  type SearchTextPart,
} from './search-index';
import { SITE_PAGE_INDEX } from './site-pages';
import { compile } from './testing/compile';

/** A fixture document links nowhere, so its renderer needs no route map. */
const ROUTES = new Map<string, string>();

/**
 * The palette as a reader meets it, over the corpus the library ships
 * ([#1813](https://github.com/tutkli/forty-cdk/issues/1813)).
 *
 * Every term the cases below search for was unreachable from the site's only
 * search while the whole corpus said it hundreds of times, so they are stated
 * against the real index rather than a fixture: what matters is that a reader
 * of *this* corpus finds these sections, which a fixture cannot claim.
 */
const ENTRIES = buildSearchEntries(PLAYGROUND_GROUPS, DOC_INDEX, GUIDE_INDEX, SITE_PAGE_INDEX);

function textOf(parts: readonly SearchTextPart[]): string {
  return parts.map((part) => part.text).join('');
}

function marked(parts: readonly SearchTextPart[]): string[] {
  return parts.filter((part) => part.match).map((part) => part.text.toLowerCase());
}

function pageOf(markdown: string) {
  return renderDocument(compile({ path: 'docs/fixture.md', slug: 'fixture', markdown }), {
    routes: ROUTES,
  });
}

describe('the text a section is indexed by', () => {
  it('keeps the prose and the inline code, and takes only the names from a sample', () => {
    const page = pageOf(
      [
        '# Fixture',
        '',
        'A lede.',
        '',
        '## Keyboard',
        '',
        'Enter toggles the `data-state` attribute.',
        '',
        '```ts',
        'const unsearchableFenceIdentifier = injectAccordionThing();',
        '```',
        '',
      ].join('\n'),
    );

    const text = searchTextOf(page.sections[0]!);

    expect(text).toBe('Enter toggles the data-state attribute. injectAccordionThing');
    expect(text).not.toContain('unsearchableFenceIdentifier');
  });

  /**
   * A sample is the only place 50 of the corpus's 269 public identifiers appear
   * — `provideForDrawerDefaults` is written in code and described in prose that
   * never names it — so the names are lifted out even though the sample is not
   * indexed.
   */
  it('lifts a selector out of a sample the prose never names', () => {
    const page = pageOf(
      [
        '# Fixture',
        '',
        'A lede.',
        '',
        '## Anatomy',
        '',
        '```html',
        '<div forAccordion><div forAccordionItem value="a"></div></div>',
        '```',
        '',
      ].join('\n'),
    );

    expect(searchTextOf(page.sections[0]!)).toBe('forAccordion forAccordionItem');
  });

  /**
   * The clip is what keeps the chunk at 97 kB rather than 195 kB gzipped, and
   * the table exemption is what keeps it honest: an API table sits *below* the
   * prose, so clipping the section as a whole would drop exactly the
   * identifiers a reference is searched by.
   */
  it('clips long prose but keeps every table row', () => {
    const page = pageOf(
      [
        '# Fixture',
        '',
        'A lede.',
        '',
        '## API',
        '',
        `${'word '.repeat(200)}`,
        '',
        '| Property | Type | Description |',
        '| --- | --- | --- |',
        '| `swipeToDismiss` | `input<boolean>` | Closes on a downward drag. |',
        '',
      ].join('\n'),
    );

    const text = searchTextOf(page.sections[0]!);

    expect(text).toContain('…');
    expect(text).toContain('swipeToDismiss');
    expect(text).toContain('Closes on a downward drag.');
    expect(text.indexOf('…')).toBeLessThan(420);
  });

  it('leaves out the header row every API table repeats', () => {
    const page = pageOf(
      [
        '# Fixture',
        '',
        'A lede.',
        '',
        '## API',
        '',
        '| Property | Type | Description |',
        '| --- | --- | --- |',
        '| `open` | `model<boolean>` | Whether it is open. |',
        '',
      ].join('\n'),
    );

    expect(searchTextOf(page.sections[0]!)).toBe('open model<boolean> Whether it is open.');
  });
});

describe('the index the site ships', () => {
  it('carries body text for the sections that have any', () => {
    const sections = DOC_INDEX.flatMap((entry) => entry.sections);
    const withText = sections.filter((section) => section.text !== '');

    expect(sections.length).toBeGreaterThan(500);
    expect(withText.length).toBeGreaterThan(sections.length * 0.75);
  });

  /**
   * A folded README is republished inside its host's page
   * ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)), and the index
   * is now read off that rendered page — so its content is searchable under the
   * anchor the reader can actually reach.
   */
  it('reaches a folded README through the page that republishes it', () => {
    const table = DOC_INDEX.find((entry) => entry.slug === 'table');
    const section = table?.sections.find((entry) => entry.slug === 'virtualized-rows');

    expect(section?.text).toContain('forTableVirtualized');
  });

  /**
   * The page renders a title's markup as of
   * [#1826](https://github.com/tutkli/forty-cdk/issues/1826) and the palette
   * does not: nobody searching for `` `disabled` `` types the backticks, and a
   * `<code>` span inside a result label is noise. Stated over the shipped index
   * because that is where a title reaching it as markup would show up.
   */
  it('names a section by its text, markup and all resolved away', () => {
    const titles = DOC_INDEX.flatMap((entry) => entry.sections.map((section) => section.title));

    expect(titles).toContain('Shared disabled');
    expect(titles).toContain('Native <table> mode');
    expect(titles.filter((title) => title.includes('<code>'))).toEqual([]);
  });
});

describe('searching the documentation', () => {
  it.each(['focus trap', 'aria-activedescendant', 'data-state', 'scroll lock'])(
    'answers %s with sections a reader can open',
    (query) => {
      const sections = searchEntries(ENTRIES, query).filter(
        (result) => result.entry.kind === 'section',
      );

      expect(sections.length).toBeGreaterThan(0);
      for (const result of sections) {
        expect(result.entry.path).toContain('#');
      }
    },
  );

  /**
   * The old filter required every word of a query to appear in one haystack of
   * title and group, so a query spanning a title and a body — the normal case —
   * returned nothing.
   */
  it('matches a query whose words are split across a title and a body', () => {
    const results = searchEntries(ENTRIES, 'dialog focus trap');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.entry.path.startsWith('/dialog')).toBe(true);
  });

  it('ranks a document above the sections that merely mention it', () => {
    const results = searchEntries(ENTRIES, 'accordion');

    expect(results[0]?.entry.kind).toBe('primitive');
    expect(results[0]?.entry.path).toBe('/accordion');
  });

  it('ranks a section title above a body mention of the same words', () => {
    const results = searchEntries(ENTRIES, 'keyboard interaction');
    const first = results.findIndex((result) => result.entry.title.includes('Keyboard'));
    const body = results.findIndex((result) => !result.entry.title.includes('Keyboard'));

    expect(first).toBe(0);
    expect(body).toBeGreaterThan(first);
  });

  it('shows a snippet of the body with the matched words marked', () => {
    const result = searchEntries(ENTRIES, 'aria-activedescendant').find(
      (candidate) => candidate.entry.kind === 'section',
    );

    expect(result).toBeDefined();
    expect(textOf(result!.snippet)).toContain('aria-activedescendant');
    expect(marked(result!.snippet)).toContain('aria-activedescendant');
  });

  it('marks the query inside the title it matched', () => {
    const [result] = searchEntries(ENTRIES, 'tooltip');

    expect(textOf(result!.title)).toBe(result!.entry.title);
    expect(marked(result!.title)).toContain('tooltip');
  });

  it('reaches guides and the site pages, not only primitives', () => {
    const guide = searchEntries(ENTRIES, 'styling').find(
      (result) => result.entry.path.startsWith('/guides/') && result.entry.kind === 'guide',
    );
    const page = searchEntries(ENTRIES, 'getting started').find(
      (result) => result.entry.kind === 'page',
    );

    expect(guide).toBeDefined();
    expect(page?.entry.path).toBe('/getting-started');
  });

  it('offers the documents and none of their sections for an empty query', () => {
    const results = searchEntries(ENTRIES, '   ');

    expect(results).toHaveLength(ENTRIES.filter((entry) => entry.kind !== 'section').length);
    expect(results.some((result) => result.entry.kind === 'section')).toBe(false);
  });

  it('answers a query no document says with nothing at all', () => {
    expect(searchEntries(ENTRIES, 'unsearchablefenceidentifier')).toEqual([]);
  });
});

describe('the index chunk', () => {
  const SOURCE = import.meta.glob('/projects/forty-cdk-playground/src/app/doc/search-index.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  });

  /**
   * The whole of the "not in the initial bundle" contract, stated where it can
   * regress: the palette reaches the index through this module, and a static
   * `import { DOC_INDEX }` here would put 97 kB in front of every reader who
   * never opens the palette.
   */
  it('is reached through a dynamic import and no static one', () => {
    const source = SOURCE['/projects/forty-cdk-playground/src/app/doc/search-index.ts'];

    expect(source).toBeDefined();
    expect(source).toContain("await import('../../generated/doc-index.generated')");
    expect(source).not.toMatch(/^import .*doc-index\.generated/m);
  });

  it('resolves to the index the palette searches', async () => {
    await expect(loadSearchIndex()).resolves.toBe(DOC_INDEX);
  });
});

describe('an entry the palette shows', () => {
  it('names the document, its section and the group it is filed under', () => {
    const section: SearchEntry | undefined = ENTRIES.find(
      (entry) => entry.kind === 'section' && entry.path.startsWith('/accordion#'),
    );

    expect(section?.title.startsWith('Accordion › ')).toBe(true);
    expect(section?.group).toBe('Primitives');
  });
});
