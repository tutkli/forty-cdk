import type { DocSection } from '../../../../../scripts/docs/doc-model.mjs';
import { examplesHeadingOf, preludeIndexOf, splitAtExamples } from './doc-section-layout';
import { compile, FRONTMATTER } from './testing/compile';
import { PRIMITIVE_DOCS } from './testing/doc-corpus';

/**
 * Where a page renders its live demos
 * ([#1865](https://github.com/tutkli/forty-cdk/issues/1865)).
 *
 * The placement had been an accident: the index of a declared `## Examples`
 * was also the split point, so a document that declares none — six carry a
 * written exemption, and `virtualization`'s archetype never required the
 * section — put the demos, the heading and its anchor at index 0. Seven
 * published pages opened with their demos, `/table` reaching `## Anatomy` in
 * ninth place.
 *
 * Stated over the compiled model rather than over the page, because a spec in
 * this target cannot mount the page component: its TypeScript program holds
 * none, and the builder's AOT plugin refuses any file carrying Angular
 * metadata it was not asked to compile. That is what makes the split a pure
 * function in the first place, and this is where it is held to its rule — the
 * rail reads the same split, and `check-doc-output.mjs` reads the emitted DOM.
 */
function sectionsOf(...titles: readonly string[]): readonly DocSection[] {
  const body = titles.flatMap((title) => [`## ${title}`, '', `What ${title} says.`, '']);
  const markdown = `${[...FRONTMATTER, '', '# Thing', '', 'Lede.', '', ...body].join('\n')}\n`;
  return compile({ markdown, path: 'projects/forty-cdk/fixture/README.md', slug: 'fixture' })
    .sections;
}

function slotOf(...titles: readonly string[]) {
  return splitAtExamples(sectionsOf(...titles));
}

function slugsOf(sections: readonly DocSection[]): readonly string[] {
  return sections.map((section) => section.slug);
}

describe('the slot a page renders its live demos in', () => {
  it('hands a document that declares ## Examples the section it wrote', () => {
    const { before, after, declared } = slotOf('Anatomy', 'Examples', 'API');

    expect(declared?.slug).toBe('examples');
    expect(slugsOf(before)).toEqual(['anatomy']);
    expect(slugsOf(after)).toEqual(['api']);
  });

  it('gives a synthesised block the position the page template orders it in', () => {
    const { before, after, declared } = slotOf('Anatomy', 'API', 'Keyboard');

    expect(declared).toBeNull();
    expect(slugsOf(before)).toEqual(['anatomy']);
    expect(slugsOf(after)).toEqual(['api', 'keyboard']);
  });

  it('keeps a prelude above the synthesised block', () => {
    const { before, after } = slotOf('Date adapter', 'Anatomy', 'API');

    expect(slugsOf(before)).toEqual(['date-adapter', 'anatomy']);
    expect(slugsOf(after)).toEqual(['api']);
  });

  it('follows the prelude for a document that declares no ## Anatomy', () => {
    const { before, after } = slotOf('Ergonomic layer', 'Vertical list', 'API');

    expect(slugsOf(before)).toEqual(['ergonomic-layer']);
    expect(slugsOf(after)).toEqual(['vertical-list', 'api']);
  });

  it('opens the page with the demos only when nothing precedes them', () => {
    const { before, after } = slotOf('API', 'Accessibility');

    expect(slugsOf(before)).toEqual([]);
    expect(slugsOf(after)).toEqual(['api', 'accessibility']);
  });

  it('reads the prelude off the rings, so a specific section below a core one is not one', () => {
    expect(preludeIndexOf(sectionsOf('Date adapter', 'Anatomy'))).toBe(0);
    expect(preludeIndexOf(sectionsOf('Anatomy', 'Snap points'))).toBe(-1);
  });
});

/**
 * Floors rather than counts, on the same terms as `check-doc-output.mjs`'s:
 * adding an entry point is not a test failure, and a sweep that stopped
 * finding anything is.
 */
const README_FLOOR = 50;
const SYNTHESISED_FLOOR = 6;

describe('the slot over the corpus', () => {
  const compiled = PRIMITIVE_DOCS.map((doc) => ({ slug: doc.slug, document: compile(doc) }));

  it('loses no section and reorders none, on every entry point README', () => {
    expect(compiled.length).toBeGreaterThanOrEqual(README_FLOOR);

    const moved = compiled.filter(({ document }) => {
      const { before, after, declared } = splitAtExamples(document.sections);
      const rejoined = [...before, ...(declared === null ? [] : [declared]), ...after];
      return slugsOf(rejoined).join('|') !== slugsOf(document.sections).join('|');
    });

    expect(moved.map(({ slug }) => slug)).toEqual([]);
  });

  it('renders the parts list above the demos on every page that synthesises the block', () => {
    const synthesised = compiled.filter(
      ({ document }) =>
        document.meta?.group !== 'none' &&
        !document.sections.some((section) => section.slug === 'examples'),
    );
    expect(synthesised.length).toBeGreaterThanOrEqual(SYNTHESISED_FLOOR);

    const placed = synthesised.map(({ slug, document }) => {
      const { before, after } = splitAtExamples(document.sections);
      return [slug, before.length > 0, slugsOf(after).includes('anatomy')] as const;
    });

    expect(placed).toEqual(synthesised.map(({ slug }) => [slug, true, false]));
  });
});

describe('the heading a page renders its live demos under', () => {
  it('synthesises the block for a page that projects a demo into it', () => {
    expect(examplesHeadingOf(null, [{ hero: true }, { hero: false }])).toEqual({
      title: 'Examples',
      slug: 'examples',
    });
  });

  it('synthesises nothing for a page whose only demo is its hero', () => {
    expect(examplesHeadingOf(null, [{ hero: true }])).toBeNull();
  });

  it('synthesises nothing for a page that declares no demo at all', () => {
    expect(examplesHeadingOf(null, [])).toBeNull();
  });

  it('keeps the heading a document declares, whatever the page projects', () => {
    const { declared } = slotOf('Anatomy', 'Examples', 'API');
    const heading = { title: 'Examples', slug: 'examples' };

    expect(examplesHeadingOf(declared, [{ hero: true }])).toEqual(heading);
    expect(examplesHeadingOf(declared, [])).toEqual(heading);
  });
});
