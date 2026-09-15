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
 * ninth place. #1865 gave those pages a placement rule; every one of them now
 * declares the section itself, because `## Examples` is where a hero's caption
 * is authored ([#1920](https://github.com/tutkli/forty-cdk/issues/1920)), so
 * the rule retired with the last page that reached it.
 *
 * Stated over the compiled model rather than over the page, because a spec in
 * this target cannot mount the page component: its TypeScript program holds
 * none, and the builder's AOT plugin refuses any file carrying Angular
 * metadata it was not asked to compile. That is what makes the split a pure
 * function in the first place, and this is where it is held to its rule — the
 * rail reads the same split, `check-doc-output.mjs` reads the emitted DOM, and
 * `doc-caption.spec.ts` is what keeps a page with demos and no section for them
 * out of the corpus.
 */
function sectionsOf(...titles: readonly string[]): readonly DocSection[] {
  const body = titles.flatMap((title) => [`## ${title}`, '', `What ${title} says.`, '']);
  const markdown = `${[...FRONTMATTER, '', '# Thing', '', 'Lede.', '', ...body].join('\n')}\n`;
  return compile({ markdown, path: 'projects/forty-cdk/fixture/README.md', slug: 'fixture' })
    .sections;
}

const IN_BLOCK = [{ hero: true }, { hero: false }];
const HERO_ONLY = [{ hero: true }];

function slotOf(...titles: readonly string[]) {
  return splitAtExamples(sectionsOf(...titles), IN_BLOCK);
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

  it('returns a declared ## Examples to the normal flow when the page projects no demo', () => {
    const { before, after, declared } = splitAtExamples(
      sectionsOf('Anatomy', 'Examples', 'API'),
      HERO_ONLY,
    );

    expect(declared).toBeNull();
    expect(slugsOf(before)).toEqual(['anatomy', 'examples', 'api']);
    expect(slugsOf(after)).toEqual([]);
  });

  it('gives a document that declares no ## Examples no slot to place the demos in', () => {
    const { before, after, declared } = slotOf('Anatomy', 'API', 'Keyboard');

    expect(declared).toBeNull();
    expect(slugsOf(before)).toEqual(['anatomy', 'api', 'keyboard']);
    expect(slugsOf(after)).toEqual([]);
  });

  it('opens the page with the demos when the document declares the section first', () => {
    const { before, after } = slotOf('Examples', 'API', 'Accessibility');

    expect(slugsOf(before)).toEqual([]);
    expect(slugsOf(after)).toEqual(['api', 'accessibility']);
  });

  it('keeps a prelude above a section declared below it', () => {
    const { before, after } = slotOf('Date adapter', 'Anatomy', 'Examples', 'API');

    expect(slugsOf(before)).toEqual(['date-adapter', 'anatomy']);
    expect(slugsOf(after)).toEqual(['api']);
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
const DECLARED_FLOOR = 40;

describe('the slot over the corpus', () => {
  const compiled = PRIMITIVE_DOCS.map((doc) => ({ slug: doc.slug, document: compile(doc) }));

  it('loses no section and reorders none, on every entry point README', () => {
    expect(compiled.length).toBeGreaterThanOrEqual(README_FLOOR);

    const moved = compiled.filter(({ document }) =>
      [IN_BLOCK, HERO_ONLY, []].some((demos) => {
        const { before, after, declared } = splitAtExamples(document.sections, demos);
        const rejoined = [...before, ...(declared === null ? [] : [declared]), ...after];
        return slugsOf(rejoined).join('|') !== slugsOf(document.sections).join('|');
      }),
    );

    expect(moved.map(({ slug }) => slug)).toEqual([]);
  });

  it('renders every section a hero-only page declares, the ## Examples one included', () => {
    const declaring = compiled.filter(({ document }) =>
      document.sections.some((section) => section.slug === 'examples'),
    );
    expect(declaring.length).toBeGreaterThanOrEqual(DECLARED_FLOOR);

    const dropped = declaring.filter(({ document }) => {
      const { before, declared } = splitAtExamples(document.sections, HERO_ONLY);
      return declared !== null || !slugsOf(before).includes('examples');
    });

    expect(dropped.map(({ slug }) => slug)).toEqual([]);
  });
});

describe('the heading a page renders its live demos under', () => {
  it('renders no block for a document that declares no ## Examples', () => {
    expect(examplesHeadingOf(null, IN_BLOCK)).toBeNull();
  });

  it('renders no block for a page whose only demo is its hero', () => {
    expect(examplesHeadingOf(null, HERO_ONLY)).toBeNull();
  });

  it('renders no block for a page that declares no demo at all', () => {
    expect(examplesHeadingOf(null, [])).toBeNull();
  });

  it('keeps the heading a document declares when the page projects a demo into it', () => {
    const { declared } = slotOf('Anatomy', 'Examples', 'API');

    expect(examplesHeadingOf(declared, IN_BLOCK)).toEqual({ title: 'Examples', slug: 'examples' });
  });

  it('renders no block for a hero-only page, whatever the document declares', () => {
    const { declared } = slotOf('Anatomy', 'Examples', 'API');

    expect(examplesHeadingOf(declared, HERO_ONLY)).toBeNull();
    expect(examplesHeadingOf(declared, [])).toBeNull();
  });
});
