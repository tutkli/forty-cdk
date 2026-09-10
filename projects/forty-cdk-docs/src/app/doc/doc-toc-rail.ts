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
 * The one specific section a document may write above its first core one, which
 * the rail keeps at the top level where the document put it.
 *
 * Read off the rings rather than off the index, so the demos entry a page
 * inserts for a README that declares no `## Examples` cannot hide the prelude
 * behind it. The contract states the same rule over the document itself, in
 * `preludeIndexOf` in `scripts/lib/doc-contract.mjs`.
 */
function preludeIndexOf(sections: readonly TocSection[]): number {
  const first = sections.findIndex((section) => section.ring === 'specific');
  const core = sections.findIndex((section) => section.ring === 'core');
  return first !== -1 && (core === -1 || first < core) ? first : -1;
}

/**
 * Nest a page's specific sections under the container its document declares
 * ([#1810](https://github.com/tutkli/forty-cdk/issues/1810)).
 *
 * A document that declares its own container keeps the place it put it, and the
 * group heading links to that section's anchor. One that declares none gets the
 * group where its content starts, at the first entry that goes into it. Either
 * way the group lands in the order the page renders, because the contract gives
 * the ring one contiguous run to be found in
 * ([#1863](https://github.com/tutkli/forty-cdk/issues/1863)) — the rail had
 * been stating an order twelve pages did not use, and the repair was those
 * documents' rather than this function's.
 *
 * The prelude is the section it leaves alone. `## Date adapter` opens all four
 * date primitives with the provider a consumer installs before anything else on
 * the page works, and pulling it into the group put an anchorless heading at the
 * top of five rails, above `Anatomy`, in front of it. Inside the group the
 * entries keep document order, and every anchor is the one its section already
 * had; nothing here mints or rewrites one.
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

  const prelude = preludeIndexOf(sections);
  const isContainer = (section: TocSection): boolean =>
    group.slug !== null && section.item.slug === group.slug;
  const grouped = (section: TocSection, index: number): boolean =>
    index !== prelude && (section.ring === 'specific' || isContainer(section));

  const children = sections
    .filter((section, index) => grouped(section, index) && !isContainer(section))
    .map((section) => section.item);
  if (children.length === 0) {
    return flat();
  }

  const rest = sections.filter((section, index) => !grouped(section, index));
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
    if (!grouped(section, index)) {
      items.push(section.item);
    }
  }
  return items;
}
