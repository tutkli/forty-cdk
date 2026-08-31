import {
  demoteMarkdown,
  foldableOf,
  foldedSlug,
  withFold,
} from '../../../../../scripts/docs/doc-fold.mjs';
import type { DocDocument } from '../../../../../scripts/docs/doc-model.mjs';
import { renderDocument } from '../../../../../scripts/docs/doc-render.mjs';
import { foldTargetOf } from '../../../../../scripts/lib/doc-contract.mjs';
import { buildDocRoutes, resolveDocLink } from '../../../../../scripts/lib/doc-links.mjs';
import { compile } from './testing/compile';
import { PRIMITIVE_DOCS } from './testing/doc-corpus';

/**
 * Folding one entry point's README into another page's section
 * ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
 *
 * `forty-cdk/table-virtualization` and `forty-cdk/virtual-reorder` ship a
 * maintained README each and no page, and the audit's D4 gave them their host's
 * page rather than one of their own. The alternative to folding is a second copy
 * of the content inside the host's README, which is the drift this whole audit
 * is about — so the fold has to hold two properties the copy would not need: the
 * anchors it mints must be the ones the READMEs already link to, and they must
 * not collide with the host's own.
 */
function documentBySlug(slug: string): DocDocument {
  const doc = PRIMITIVE_DOCS.find((candidate) => candidate.slug === slug);
  if (doc === undefined) {
    throw new Error(`no README for ${slug} in the corpus`);
  }
  return compile(doc);
}

const FOLDED = PRIMITIVE_DOCS.map((doc) => compile(doc)).filter(
  (document) => document.meta !== null && document.meta.foldInto !== null,
);

describe('demoteMarkdown', () => {
  it('pushes every heading the requested number of levels deeper', () => {
    const demoted = demoteMarkdown('## API\n\ntext\n\n### ForThing\n', 2);

    expect(demoted).toBe('#### API\n\ntext\n\n##### ForThing\n');
  });

  it('leaves a hash inside a fence alone, where it is code and not a heading', () => {
    const demoted = demoteMarkdown('## Setup\n\n```bash\n# install it\nnpm i thing\n```\n', 2);

    expect(demoted).toContain('# install it');
    expect(demoted).not.toContain('### install it');
    expect(demoted).toContain('#### Setup');
  });

  it('leaves a line that only looks like a heading alone', () => {
    expect(demoteMarkdown('#nospace\n', 2)).toBe('#nospace\n');
  });
});

describe('foldableOf', () => {
  it('opens with a heading anchored on the entry point slug, which is what links target', () => {
    const folded = foldableOf(documentBySlug('virtual-reorder'));
    const [section] = folded.sections;

    expect(section!.slug).toBe('virtual-reorder');
    expect(section!.blocks[0]).toEqual({
      kind: 'prose',
      markdown: '### Virtual Reorder\n',
      headingSlugs: ['virtual-reorder'],
    });
  });

  it('carries the lede, which the compiler lifts out of the intro', () => {
    const document = documentBySlug('virtual-reorder');
    const folded = foldableOf(document);
    const markdown = folded.sections[0]!.blocks.map((block) =>
      block.kind === 'prose' ? block.markdown : '',
    ).join('\n');

    expect(document.lede).not.toBeNull();
    expect(markdown).toContain(document.lede!);
  });

  it('prefixes every anchor with the folded document slug', () => {
    const document = documentBySlug('table-virtualization');
    const folded = foldableOf(document);
    const slugs = folded.sections[0]!.headings.map((heading) => heading.slug);

    for (const section of document.sections) {
      expect(slugs).toContain(foldedSlug('table-virtualization', section.slug));
    }
    expect(slugs.filter((slug) => slug !== 'table-virtualization')).toSatisfy(
      (all: readonly string[]) => all.every((slug) => slug.startsWith('table-virtualization-')),
    );
  });

  it('keeps a table a table rather than flattening it into prose', () => {
    const document = documentBySlug('table-virtualization');
    const declared = document.sections.reduce(
      (count, section) => count + section.blocks.filter((block) => block.kind === 'table').length,
      0,
    );
    const folded = foldableOf(document).sections[0]!.blocks.filter(
      (block) => block.kind === 'table',
    ).length;

    expect(declared).toBeGreaterThan(0);
    expect(folded).toBe(declared);
  });

  it('refuses a document whose headings would be pushed past h6', () => {
    const document = documentBySlug('table-virtualization');
    const deep: DocDocument = {
      ...document,
      sections: [
        {
          ...document.sections[0]!,
          headings: [{ depth: 5, text: 'Deep', slug: 'deep' }],
        },
      ],
    };

    expect(() => foldableOf(deep)).toThrow(/no level past h6/);
  });
});

describe('withFold', () => {
  const page = {
    intro: [],
    sections: [
      { title: 'One', slug: 'one', ring: 'core' as const, headings: [], blocks: [] },
      { title: 'Two', slug: 'two', ring: 'core' as const, headings: [], blocks: [] },
    ],
  };
  const folded = {
    headings: [{ depth: 3, text: 'Folded', slug: 'folded' }],
    blocks: [{ kind: 'prose' as const, html: '<h3 id="folded">Folded</h3>' }],
  };

  it('appends to the named section and leaves its neighbours untouched', () => {
    const merged = withFold(page, 'two', folded);

    expect(merged.sections[0]).toEqual(page.sections[0]);
    expect(merged.sections[1]!.blocks).toEqual(folded.blocks);
    expect(merged.sections[1]!.headings).toEqual(folded.headings);
  });

  it('refuses a section the host page does not declare, naming the ones it has', () => {
    expect(() => withFold(page, 'three', folded)).toThrow(/#one, #two/);
  });
});

describe('the folds the library declares', () => {
  it('folds every README that declares a target, and no other', () => {
    expect(FOLDED.map((document) => document.slug)).toEqual([
      'table-virtualization',
      'virtual-reorder',
    ]);
  });

  it.each([
    ['table-virtualization', 'table', 'virtualized-rows'],
    ['virtual-reorder', 'drag-drop', 'virtualized-lists'],
  ])('folds %s into a section /%s#%s declares', (slug, host, section) => {
    const target = foldTargetOf(documentBySlug(slug).meta!);

    expect(target).toEqual({ slug: host, section });
    expect(documentBySlug(host).sections.map((one) => one.slug)).toContain(section);
  });

  it.each(['table-virtualization', 'virtual-reorder'])(
    'mints no anchor for %s that its host page already emits',
    (slug) => {
      const document = documentBySlug(slug);
      const host = documentBySlug(foldTargetOf(document.meta!)!.slug);
      const hostAnchors = new Set([
        ...host.sections.map((section) => section.slug),
        ...host.sections.flatMap((section) => section.headings.map((heading) => heading.slug)),
      ]);
      const minted = foldableOf(document).sections[0]!.headings.map((heading) => heading.slug);

      expect(minted.filter((anchor) => hostAnchors.has(anchor))).toEqual([]);
    },
  );

  it('renders the folded content as markup the host page can bind', () => {
    const routes = buildDocRoutes({ primitiveSlugs: ['drag-drop'], guideSlugs: [] });
    const [section] = renderDocument(foldableOf(documentBySlug('virtual-reorder')), {
      routes,
    }).sections;
    const html = section!.blocks
      .map((block) => (block.kind === 'prose' ? block.html : ''))
      .join('');

    expect(html).toContain('id="virtual-reorder"');
    expect(html).toContain('id="virtual-reorder-anatomy"');
    expect(html).not.toContain('id="anatomy"');
  });
});

describe('links into a folded document', () => {
  const routes = buildDocRoutes({
    primitiveSlugs: ['drag-drop'],
    guideSlugs: [],
    foldedSlugs: [{ slug: 'virtual-reorder', host: 'drag-drop' }],
  });
  const resolve = (href: string) =>
    resolveDocLink(href, {
      sourcePath: 'projects/forty-cdk/virtualization/README.md',
      routes,
      blobBase: 'https://blob/',
    });

  it('lands on the anchor the fold opens at', () => {
    expect(resolve('../virtual-reorder/README.md')?.route).toBe('/drag-drop#virtual-reorder');
  });

  it('rewrites a fragment of its own to the anchor the fold minted for it', () => {
    expect(resolve('../virtual-reorder/README.md#anatomy')?.route).toBe(
      '/drag-drop#virtual-reorder-anatomy',
    );
  });

  it('still resolves an unfolded entry point to its source, not to a route', () => {
    const link = resolve('../internationalized-date/README.md');

    expect(link?.kind).toBe('source');
    expect(link?.route).toBeNull();
  });
});
