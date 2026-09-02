import { renderDocument } from '../../../../../scripts/docs/doc-render.mjs';
import { buildDocRoutes } from '../../../../../scripts/lib/doc-links.mjs';
import type { DocPageBehaviorGroup } from './doc-model';
import { buildTocItems, type TocEntry, type TocSection } from './doc-toc-rail';
import { buildSearchEntries } from './search-index';
import { compile } from './testing/compile';
import { GUIDE_DOCS, PRIMITIVE_DOCS, SITE_DOCS } from './testing/doc-corpus';

/**
 * The rail's grouping ([#1810](https://github.com/tutkli/forty-cdk/issues/1810)).
 *
 * `buildTocItems` is a pure function over the ring the compiler already
 * resolved, so what it produces is asserted against the real corpus rather than
 * against a fixture — the claim the issue makes is about `/select` and
 * `/table`, and a synthetic page of three sections cannot make it. The unit
 * cases above the sweep are what say each rule can fail on its own.
 *
 * **What the rail renders is gated over the emitted HTML instead**, by
 * `check-doc-output.mjs`. This target's TypeScript program holds no page
 * component — its AOT plugin refuses any file carrying Angular metadata it was
 * not asked to compile, which is the same constraint that has `doc-corpus.ts`
 * reading the route table as text — so a spec here cannot mount `DocToc`, and a
 * claim about the markup belongs where the built site can be read.
 */
function section(ring: TocSection['ring'], title: string, slug: string): TocSection {
  return { ring, item: { title, slug } };
}

const TEMPLATE = [
  section('core', 'Anatomy', 'anatomy'),
  section('core', 'API', 'api'),
  section('canonical', 'Styling', 'styling'),
];

const SPECIFIC = [
  section('specific', 'Snap points', 'snap-points'),
  section('specific', 'Swipe-to-dismiss', 'swipe-to-dismiss'),
  section('specific', 'Nested drawers', 'nested-drawers'),
];

const NO_CONTAINER: DocPageBehaviorGroup = { title: 'Behavior notes', slug: null };

function titlesOf(items: readonly TocEntry[]): readonly string[] {
  return items.map((item) => item.title);
}

function groupOf(items: readonly TocEntry[]): TocEntry {
  const group = items.find((item) => item.disclosure !== undefined);
  if (group === undefined) {
    throw new Error('the rail carries no group');
  }
  return group;
}

describe('grouping a page’s rail', () => {
  it('leaves every entry alone for a document with no container', () => {
    const items = buildTocItems([...TEMPLATE, ...SPECIFIC], null);

    expect(titlesOf(items)).toEqual([
      'Anatomy',
      'API',
      'Styling',
      'Snap points',
      'Swipe-to-dismiss',
      'Nested drawers',
    ]);
    expect(items.every((item) => item.disclosure === undefined)).toBe(true);
  });

  it('nests the specific sections and leaves the template ones at the top level', () => {
    const items = buildTocItems([...TEMPLATE, ...SPECIFIC], NO_CONTAINER);

    expect(titlesOf(items)).toEqual(['Anatomy', 'API', 'Styling', 'Behavior notes']);
    expect(titlesOf(groupOf(items).children!)).toEqual([
      'Snap points',
      'Swipe-to-dismiss',
      'Nested drawers',
    ]);
  });

  it('keeps every anchor the flat rail resolved, on the same entry', () => {
    const flat = buildTocItems([...TEMPLATE, ...SPECIFIC], null);
    const grouped = buildTocItems([...TEMPLATE, ...SPECIFIC], NO_CONTAINER);

    const anchors = (items: readonly TocEntry[]) =>
      items.flatMap((item) => [item, ...(item.children ?? [])]).map((item) => item.slug);

    expect(anchors(grouped)).toEqual(expect.arrayContaining(anchors(flat)));
  });

  it('places the group where its own content starts, not at the end of the rail', () => {
    const items = buildTocItems(
      [TEMPLATE[0]!, ...SPECIFIC, TEMPLATE[1]!, TEMPLATE[2]!],
      NO_CONTAINER,
    );

    expect(titlesOf(items)).toEqual(['Anatomy', 'Behavior notes', 'API', 'Styling']);
  });

  it('places it where the document put the container it declares, and links its anchor', () => {
    const container = section('canonical', 'Behavior notes', 'behavior-notes');
    const items = buildTocItems([TEMPLATE[0]!, ...SPECIFIC, TEMPLATE[1]!, container], {
      title: 'Behavior notes',
      slug: 'behavior-notes',
    });

    expect(titlesOf(items)).toEqual(['Anatomy', 'API', 'Behavior notes']);
    expect(groupOf(items).slug).toBe('behavior-notes');
  });

  it('lists the declared container once, as the heading rather than as its own child', () => {
    const container = section('canonical', 'Behavior notes', 'behavior-notes');
    const items = buildTocItems([...TEMPLATE, container, ...SPECIFIC], {
      title: 'Behavior notes',
      slug: 'behavior-notes',
    });

    expect(titlesOf(groupOf(items).children!)).not.toContain('Behavior notes');
    expect(titlesOf(items).filter((title) => title === 'Behavior notes')).toHaveLength(1);
  });

  it('opens a group the rest of the rail still outweighs', () => {
    const items = buildTocItems([...TEMPLATE, ...SPECIFIC.slice(0, 2)], NO_CONTAINER);

    expect(groupOf(items).disclosure).toBe('open');
  });

  it('closes one that holds more than everything else at the top level', () => {
    const items = buildTocItems([TEMPLATE[0]!, TEMPLATE[1]!, ...SPECIFIC], NO_CONTAINER);

    expect(groupOf(items).disclosure).toBe('closed');
  });
});

describe('the rail the published corpus renders', () => {
  const routes = buildDocRoutes({
    primitiveSlugs: PRIMITIVE_DOCS.map((doc) => doc.slug),
    guideSlugs: GUIDE_DOCS.map((doc) => doc.slug),
  });

  function railOf(slug: string): readonly TocEntry[] {
    const doc = SITE_DOCS.find((entry) => entry.slug === slug);
    if (doc === undefined) {
      throw new Error(`the corpus holds no document at ${slug}`);
    }
    const page = renderDocument(compile(doc), { routes });
    return buildTocItems(
      page.sections.map((entry) => ({
        ring: entry.ring,
        item: { title: entry.title, slug: entry.slug },
      })),
      page.behaviorGroup,
    );
  }

  it('shows /select’s canonical sections at the top level with the specific ones grouped', () => {
    const items = railOf('select');

    expect(titlesOf(items)).toEqual([
      'Anatomy',
      'Examples',
      'API',
      'Behavior notes',
      'Keyboard',
      'Accessibility',
      'Styling',
      'Wrapping in a design system',
    ]);
    expect(groupOf(items).children).toHaveLength(13);
    expect(groupOf(items).disclosure).toBe('closed');
  });

  it('renders /separator unchanged, having too few specific sections to group', () => {
    const items = railOf('separator');

    expect(titlesOf(items)).toEqual(['Anatomy', 'Examples', 'API', 'Accessibility', 'Styling']);
    expect(items.every((item) => item.disclosure === undefined)).toBe(true);
  });

  it('renders /shared unchanged, having no template sections to separate from', () => {
    const items = railOf('shared');

    expect(items).toHaveLength(7);
    expect(items.every((item) => item.disclosure === undefined)).toBe(true);
  });

  it('takes /dialog’s group title and anchor from the section it declares', () => {
    const group = groupOf(railOf('dialog'));

    expect(group.title).toBe('Behavior notes');
    expect(group.slug).toBe('behavior-notes');
  });

  it('resolves every anchor the flat rail resolved, across every document', () => {
    const lost: string[] = [];
    let grouped = 0;
    for (const doc of SITE_DOCS) {
      const page = renderDocument(compile(doc), { routes });
      const sections = page.sections.map((entry) => ({
        ring: entry.ring,
        item: { title: entry.title, slug: entry.slug },
      }));
      const anchors = new Set(
        buildTocItems(sections, page.behaviorGroup)
          .flatMap((item) => [item, ...(item.children ?? [])])
          .map((item) => item.slug),
      );
      if (page.behaviorGroup !== null && anchors.size !== sections.length) {
        grouped += 1;
      }
      lost.push(
        ...sections
          .filter((entry) => !anchors.has(entry.item.slug))
          .map((entry) => `${doc.slug}#${entry.item.slug}`),
      );
    }

    expect(lost).toEqual([]);
    expect(grouped).toBeGreaterThanOrEqual(1);
  });

  it('leaves the ⌘K index reaching every section, grouped or not', () => {
    const doc = SITE_DOCS.find((entry) => entry.slug === 'select')!;
    const page = renderDocument(compile(doc), { routes });
    const nested = groupOf(railOf('select')).children!.map((child) => child.slug);
    const entries = buildSearchEntries(
      [
        {
          label: 'Primitives',
          primitives: [{ slug: 'select', title: 'Select', description: 'Picks one.' }],
        },
      ],
      [
        {
          kind: 'primitive',
          slug: 'select',
          sections: page.sections.map((entry) => ({ title: entry.title, slug: entry.slug })),
        },
      ],
      [],
    );
    const paths = entries.map((entry) => entry.path);

    expect(nested).toHaveLength(13);
    for (const slug of nested) {
      expect(paths).toContain(`/select#${slug}`);
    }
  });
});
