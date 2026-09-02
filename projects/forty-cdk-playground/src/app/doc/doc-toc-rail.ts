import type { DocPageBehaviorGroup, DocPageSection } from './doc-model';

/** A section or heading the rail links to. */
export interface TocItem {
  readonly title: string;
  readonly slug: string;
  readonly children?: readonly TocItem[];
}

/** A top-level rail entry: a section, or the group the specific ones nest in. */
export interface TocEntry {
  readonly title: string;
  /** `null` on a group whose document declares no container section of its own. */
  readonly slug: string | null;
  readonly children?: readonly TocItem[];
  /**
   * Present only on the group: whether its children start behind a closed
   * disclosure. Absent lists them inline, which is what an ordinary section's
   * `h3` children and the Examples entry's demos do.
   */
  readonly disclosure?: 'open' | 'closed';
}

/** One rail entry before grouping: the link, and the ring its section fell in. */
export interface TocSection {
  readonly ring: DocPageSection['ring'];
  readonly item: TocItem;
}

/**
 * Nest a page's specific sections under the container its document declares
 * ([#1810](https://github.com/tutkli/forty-cdk/issues/1810)).
 *
 * A document that declares its own container keeps the place it put it, and the
 * group heading links to that section's anchor. One that declares none gets the
 * group where its content starts, at the first entry that goes into it — as
 * close to the order of the page as a single group can be. That order is not
 * always the document's: a page may write a specific section between two
 * canonical ones, and thirteen of the corpus's fifty-four do. Inside the group
 * the entries keep document order, and every anchor is the one its section
 * already had; nothing here mints or rewrites one.
 *
 * The group starts closed once it holds more entries than the rest of the rail's
 * top level, which is where the drawer has stopped being an aside and become the
 * page. A ratio rather than a section count, so a page that later grows two
 * canonical sections is a page whose specific ones no longer dominate, and it
 * opens again without a threshold being retuned.
 */
export function buildTocItems(
  sections: readonly TocSection[],
  group: DocPageBehaviorGroup | null,
): readonly TocEntry[] {
  const flat = (): readonly TocEntry[] => sections.map((section) => section.item);
  if (group === null) {
    return flat();
  }

  const isContainer = (section: TocSection): boolean =>
    group.slug !== null && section.item.slug === group.slug;
  const grouped = (section: TocSection): boolean =>
    section.ring === 'specific' || isContainer(section);

  const children = sections
    .filter((section) => section.ring === 'specific' && !isContainer(section))
    .map((section) => section.item);
  if (children.length === 0) {
    return flat();
  }

  const rest = sections.filter((section) => !grouped(section));
  const container: TocEntry = {
    title: group.title,
    slug: group.slug,
    children,
    disclosure: children.length > rest.length ? 'closed' : 'open',
  };

  const at = sections.findIndex(group.slug === null ? grouped : isContainer);
  const items: TocEntry[] = [];
  for (const [index, section] of sections.entries()) {
    if (index === at) {
      items.push(container);
    }
    if (!grouped(section)) {
      items.push(section.item);
    }
  }
  return items;
}
